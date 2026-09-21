using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransfersController : ControllerBase
{
    private readonly ArcaneSynergyContext _context;

    public TransfersController(ArcaneSynergyContext context)
    {
        _context = context;
    }

	[HttpGet("export")]
	public async Task<IActionResult> GetTransfersForExport([FromQuery] List<int>? admissionIds)
	{
		var query = _context.Transfers.AsQueryable();

		if (admissionIds != null && admissionIds.Count > 0)
		{
			query = query.Where(transfer => admissionIds.Contains(transfer.AdmissionId));
		}

		var transfers = await query
			.AsNoTracking()
			.OrderBy(transfer => transfer.AdmissionId)
			.ThenBy(transfer => transfer.TransferId)
			.ToListAsync();

		return Ok(transfers);
	}


	[HttpGet]
	public async Task<IActionResult> GetTransfers(
		[FromQuery] int page = 1,
		[FromQuery] int pageSize = 10,
		[FromQuery] string? sortBy = null,
		[FromQuery] string? sortDir = "desc")
	{
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);

		var query = ApplyTransfersSort(_context.Transfers.AsNoTracking(), sortBy, sortDir);

		var totalCount = await query.CountAsync();

		var transfers = await query
			.Skip((page - 1) * pageSize)
			.Take(pageSize)
			.ToListAsync();

		return Ok(new
		{
			items = transfers,
			totalCount,
			page,
			pageSize
		});
	}

	[HttpGet("{id}")]
	public async Task<IActionResult> GetTransfer(int id)
	{
		var transfer = await _context.Transfers
			.AsNoTracking()
			.FirstOrDefaultAsync(t => t.TransferId == id);
		if (transfer == null)
		{
			return NotFound();
		}
		return Ok(transfer);
	}

	[HttpGet("admission/{admissionId}")]
	public async Task<IActionResult> GetTransfersByAdmissionId(int admissionId)
	{
		var transfers = await _context.Transfers
			.AsNoTracking()
			.Where(t => t.AdmissionId == admissionId)
			.OrderBy(t => t.AdmissionDate)
			.ThenBy(t => t.TransferId)
			.ToListAsync();
		return Ok(transfers);
	}

	[HttpPost]
	public async Task<IActionResult> AddTransfer([FromBody] Transfer transfer)
	{
		if (transfer.IsFinalDischarge)
		{
			var hasFinalTransfer = await _context.Transfers
				.AnyAsync(t => t.AdmissionId == transfer.AdmissionId && t.IsFinalDischarge);

			if (hasFinalTransfer)
			{
				return Conflict("This admission already has a final transfer.");
			}
		}

		_context.Transfers.Add(transfer);
		try
		{
			await _context.SaveChangesAsync();
		}
		catch (DbUpdateException)
		{
			return Conflict("This admission already has a final transfer.");
		}

		await SyncAdmissionFinalDischargeDateAsync(transfer.AdmissionId);
		await _context.SaveChangesAsync();

		return CreatedAtAction(nameof(GetTransfer),
			new { id = transfer.TransferId },
			transfer);
	}

	[HttpPut("{id}")]
	public async Task<IActionResult> UpdateTransfer(int id, [FromBody] Transfer transfer)
	{
        if (id != transfer.TransferId)
            return BadRequest("TransferId mismatch");

		if (transfer.IsFinalDischarge)
		{
			var hasFinalTransfer = await _context.Transfers
				.AnyAsync(t => t.AdmissionId == transfer.AdmissionId && t.IsFinalDischarge && t.TransferId != id);

			if (hasFinalTransfer)
			{
				return Conflict("This admission already has a final transfer.");
			}
		}

		var existingTransfer = await _context.Transfers.FindAsync(id);
		if (existingTransfer == null)
		{
			return NotFound();
		}

		var originalAdmissionId = existingTransfer.AdmissionId;

        existingTransfer.AdmissionId = transfer.AdmissionId;
        existingTransfer.AdmissionDate = transfer.AdmissionDate;
        existingTransfer.DischargeDate = transfer.DischargeDate;
        existingTransfer.IsFinalDischarge = transfer.IsFinalDischarge;
        existingTransfer.FacilityType = transfer.FacilityType;
        existingTransfer.Facility = transfer.Facility;
        existingTransfer.Type = transfer.Type;
        existingTransfer.TimeOfAdmission = transfer.TimeOfAdmission;
        existingTransfer.DX = transfer.DX;
        existingTransfer.NotificationSource = transfer.NotificationSource;
        existingTransfer.DateNotified = transfer.DateNotified;
        existingTransfer.DischargeTo = transfer.DischargeTo;

		try
		{
			await _context.SaveChangesAsync();
			await SyncAdmissionFinalDischargeDateAsync(originalAdmissionId);
			if (transfer.AdmissionId != originalAdmissionId)
			{
				await SyncAdmissionFinalDischargeDateAsync(transfer.AdmissionId);
			}
			await _context.SaveChangesAsync();
		}
		catch (DbUpdateException)
		{
			return Conflict("This admission already has a final transfer.");
		}
		return Ok(existingTransfer);
	}

	[HttpDelete("{id}")]
	public async Task<IActionResult> Delete(int id)
	{
		var transfer = await _context.Transfers.FindAsync(id);
		if (transfer == null)
		{
			return NotFound();
		}

		_context.Transfers.Remove(transfer);
		await _context.SaveChangesAsync();

		await SyncAdmissionFinalDischargeDateAsync(transfer.AdmissionId);
		await _context.SaveChangesAsync();
		return NoContent();
	}

	private static IQueryable<Transfer> ApplyTransfersSort(
		IQueryable<Transfer> query,
		string? sortBy,
		string? sortDir)
	{
		bool descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

		IOrderedQueryable<Transfer> ordered = sortBy?.ToLowerInvariant() switch
		{
			"dischargedate" => descending
				? query.OrderByDescending(t => t.DischargeDate)
				: query.OrderBy(t => t.DischargeDate),
			"type" => descending
				? query.OrderByDescending(t => t.Type)
				: query.OrderBy(t => t.Type),
			_ => descending
				? query.OrderByDescending(t => t.AdmissionDate)
				: query.OrderBy(t => t.AdmissionDate)
		};

		return ordered.ThenBy(t => t.TransferId);
	}

	private async Task SyncAdmissionFinalDischargeDateAsync(int admissionId)
	{
		var admission = await _context.Admissions.FirstOrDefaultAsync(a => a.AdmissionId == admissionId);
		if (admission == null)
		{
			return;
		}

		admission.FinalDischargeDate = await _context.Transfers
			.Where(t => t.AdmissionId == admissionId && t.IsFinalDischarge && t.DischargeDate.HasValue)
			.OrderByDescending(t => t.DischargeDate)
			.Select(t => t.DischargeDate)
			.FirstOrDefaultAsync();

		admission.UpdateCalculatedFields();
	}
}
