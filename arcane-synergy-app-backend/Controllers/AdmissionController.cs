using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdmissionsController : ControllerBase
{
    private readonly ArcaneSynergyContext _context;

    private const int MaxMonthlyRangeDays = 365;

    public AdmissionsController(ArcaneSynergyContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAdmissions()
    {
        var admissions = await _context.Admissions
            .Include(a => a.Patient)
            .OrderByDescending(a => a.AdmissionDate)
            .ToListAsync();

        return Ok(admissions);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAdmission(int id)
    {
        var admission = await _context.Admissions
            .Include(a => a.Patient)
            .Include(a => a.Transfers)
            .FirstOrDefaultAsync(a => a.AdmissionId == id);

        return admission == null ? NotFound() : Ok(admission);
    }

    [HttpGet("count")]
    public async Task<IActionResult> GetAdmissionCount(
        [FromQuery] string? group = "",
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastDays = null)
    {
        var query = ApplyAdmissionFilters(group, insurance, clinic, admissionType, lastDays);

        var count = await query.CountAsync();
        return Ok(new { count });
    }

    [HttpGet("pending/count")]
    public async Task<IActionResult> GetPendingPatientsCount(
        [FromQuery] string? group = "",
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastDays = null)
    {
        var query = ApplyAdmissionFilters(group, insurance, clinic, admissionType, lastDays);

        // Pending patients: admissions with a FinalDischargeDate but no DateSeen.
        var pendingCount = await query
            .Where(a => a.FinalDischargeDate.HasValue && a.DateSeen == null)
            .Select(a => a.PatientID)
            .Distinct()
            .CountAsync();

        return Ok(new { count = pendingCount });
    }

    [HttpGet("count/monthly")]
    public async Task<IActionResult> GetAdmissionCountByMonth(
        [FromQuery] string? group = "",
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastDays = 365)
    {
        if (lastDays.HasValue && lastDays.Value <= 0)
            return BadRequest("lastDays must be between 1 and 365.");

        if (lastDays.HasValue && lastDays.Value > MaxMonthlyRangeDays)
            return BadRequest($"lastDays cannot exceed {MaxMonthlyRangeDays}.");

        var query = ApplyAdmissionFilters(group, insurance, clinic, admissionType, lastDays);

        var monthlyCounts = await query
            .GroupBy(a => new { a.AdmissionDate.Year, a.AdmissionDate.Month })
            .OrderBy(g => g.Key.Year)
            .ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Count = g.Count()
            })
            .ToListAsync();

        var response = monthlyCounts.Select(item => new
        {
            month = $"{item.Year:D4}-{item.Month:D2}",
            monthName = new DateTime(item.Year, item.Month, 1).ToString("MMMM"),
            year = item.Year,
            count = item.Count
        });

        return Ok(response);
    }

    

    [HttpPost]
    public async Task<IActionResult> AddAdmission([FromBody] Admission admission)
    {
        admission.UpdateCalculatedFields();

        _context.Admissions.Add(admission);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAdmission),
            new { id = admission.AdmissionId },
            admission);
    }


    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAdmission(int id, [FromBody] Admission admission)
    {
        if (id != admission.AdmissionId)
            return BadRequest("AdmissionId mismatch");

        var existing = await _context.Admissions
            .Include(a => a.Transfers)
            .FirstOrDefaultAsync(a => a.AdmissionId == id);

        if (existing == null) return NotFound();

        existing.FacilityType = admission.FacilityType;
        existing.Facility = admission.Facility;
        existing.Type = admission.Type;
        existing.TimeOfAdmission = admission.TimeOfAdmission;
        existing.DX = admission.DX;
        existing.NotificationSource = admission.NotificationSource;
        existing.DateNotified = admission.DateNotified;
        existing.AdmissionDate = admission.AdmissionDate;
        existing.DischargeDate = admission.DischargeDate;
        existing.DischargeTo = admission.DischargeTo;
        existing.DateSeen = admission.DateSeen;
        existing.SeenBy = admission.SeenBy;
        existing.Status = admission.Status;

        existing.TotalERVisits = admission.TotalERVisits;
        existing.TotalADMVisits = admission.TotalADMVisits;
        existing.DayOfWeekAdmitted = admission.DayOfWeekAdmitted;
        existing.MonthAdmitted = admission.MonthAdmitted;
        existing.TCMDueDate = admission.TCMDueDate;
        existing.PatientEngagement = admission.PatientEngagement;
        existing.ReadmissionFlag = admission.ReadmissionFlag;
        existing.NextAdmissionDate = admission.NextAdmissionDate;
        existing.FinalDischargeDate = admission.FinalDischargeDate;
        existing.CountOfTransfers = admission.CountOfTransfers;

        existing.UpdateCalculatedFields();
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAdmission(int id)
    {
        var admission = await _context.Admissions
            .Include(a => a.Transfers)
            .FirstOrDefaultAsync(a => a.AdmissionId == id);

        if (admission == null) return NotFound();

        if (admission.Transfers?.Any() == true)
        {
            _context.Transfers.RemoveRange(admission.Transfers);
        }

        _context.Admissions.Remove(admission);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private IQueryable<Admission> ApplyAdmissionFilters(
        string? group,
        string? insurance,
        string? clinic,
        string? admissionType,
        int? lastDays)
    {
        var query = _context.Admissions
            .Include(a => a.Patient)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(group))
            query = query.Where(a => a.Patient != null && a.Patient.Group == group);

        if (!string.IsNullOrWhiteSpace(insurance))
            query = query.Where(a => a.Patient != null && a.Patient.Insurance == insurance);

        if (!string.IsNullOrWhiteSpace(clinic))
            query = query.Where(a => a.Patient != null && a.Patient.Clinic == clinic);

        if (!string.IsNullOrWhiteSpace(admissionType))
            query = query.Where(a => a.Type == admissionType);

        if (lastDays.HasValue && lastDays.Value > 0)
        {
            var endDate = DateTime.Today;
            var startDate = endDate.AddDays(-lastDays.Value);
            query = query.Where(a => a.AdmissionDate >= startDate && a.AdmissionDate <= endDate);
        }

        return query;
    }
}
