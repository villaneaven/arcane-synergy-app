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
	public async Task<IActionResult> GetTransfers()
	{
		var transfers = await _context.Transfers.ToListAsync();
		return Ok(transfers);
	}

	[HttpGet("{id}")]
	public async Task<IActionResult> GetTransfer(int id)
	{
		var transfer = await _context.Transfers.FindAsync(id);
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
			.Where(t => t.AdmissionId == admissionId)
			.ToListAsync();
		return Ok(transfers);
	}

	[HttpPost]
	public async Task<IActionResult> AddTransfer([FromBody] Transfer transfer)
	{
		_context.Transfers.Add(transfer);
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

		var existingTransfer = await _context.Transfers.FindAsync(id);
		if (existingTransfer == null)
		{
			return NotFound();
		}

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

		await _context.SaveChangesAsync();
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
		return NoContent();
	}
}
