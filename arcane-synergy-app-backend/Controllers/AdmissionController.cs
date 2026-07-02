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

        var count = await query.CountAsync();
        return Ok(new { count });
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
}
