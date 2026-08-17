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

    private const int MaxMonthlyRangeMonths = 12;

    public AdmissionsController(ArcaneSynergyContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAdmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? admissionType = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = "desc")
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = BuildAdmissionsListQuery(search, admissionType, startDate, endDate);
        query = ApplyAdmissionsSort(query, sortBy, sortDir);

        var totalCount = await query.CountAsync();

        var admissions = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = admissions,
            totalCount,
            page,
            pageSize
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> GetAdmissionsForExport(
        [FromQuery] string? search = null,
        [FromQuery] string? admissionType = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = "desc")
    {
        var query = BuildAdmissionsListQuery(search, admissionType, startDate, endDate);
        query = ApplyAdmissionsSort(query, sortBy, sortDir);

        var admissions = await query.ToListAsync();

        return Ok(admissions);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAdmission(int id)
    {
        var admission = await _context.Admissions
            .AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.Transfers)
            .FirstOrDefaultAsync(a => a.AdmissionId == id);

        return admission == null ? NotFound() : Ok(admission);
    }

    [HttpGet("patient/{patientId:int}")]
    public async Task<IActionResult> GetAdmissionsByPatient(int patientId)
    {
        var admissions = await _context.Admissions
            .AsNoTracking()
            .Include(a => a.Patient)
            .Where(a => a.PatientID == patientId)
            .OrderByDescending(a => a.AdmissionDate)
            .ToListAsync();

        return Ok(admissions);
    }

    [HttpGet("count")]
    public async Task<IActionResult> GetAdmissionCount(
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastMonths = null)
    {
        var query = ApplyAdmissionFilters(insurance, clinic, admissionType, lastMonths);

        var byGroup = await query
            .GroupBy(a => a.Patient != null ? a.Patient.Group : null)
            .Select(g => new { group = g.Key, count = g.Count() })
            .ToListAsync();

        var total = byGroup.Sum(g => g.count);

        return Ok(new { total, byGroup });
    }

    [HttpGet("pending/count")]
    public async Task<IActionResult> GetPendingPatientsCount(
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastMonths = null)
    {
        var query = ApplyAdmissionFilters(insurance, clinic, admissionType, lastMonths);

        // Pending patients: admissions with a FinalDischargeDate but no DateSeen.
        var pendingPatients = await query
            .Where(a => a.FinalDischargeDate.HasValue && a.DateSeen == null)
            .Select(a => new
            {
                a.PatientID,
                Group = a.Patient != null ? a.Patient.Group : null
            })
            .Distinct()
            .ToListAsync();

        var byGroup = pendingPatients
            .GroupBy(p => p.Group)
            .Select(g => new { group = g.Key, count = g.Count() })
            .ToList();

        var total = pendingPatients.Count;

        return Ok(new { total, byGroup });
    }

    [HttpGet("count/monthly")]
    public async Task<IActionResult> GetAdmissionCountByMonth(
        [FromQuery] string? insurance = "",
        [FromQuery] string? clinic = "",
        [FromQuery] string? admissionType = "",
        [FromQuery] int? lastMonths = 12)
    {
        if (lastMonths.HasValue && lastMonths.Value <= 0)
            return BadRequest($"lastMonths must be between 1 and {MaxMonthlyRangeMonths}.");

        if (lastMonths.HasValue && lastMonths.Value > MaxMonthlyRangeMonths)
            return BadRequest($"lastMonths cannot exceed {MaxMonthlyRangeMonths}.");

        var rangeMonths = lastMonths ?? MaxMonthlyRangeMonths;
        var endMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        var startMonth = GetStartMonth(rangeMonths);

        var query = ApplyAdmissionFilters(insurance, clinic, admissionType, rangeMonths);

        var monthlyGroupCounts = await query
            .GroupBy(a => new
            {
                a.AdmissionDate.Year,
                a.AdmissionDate.Month,
                Group = a.Patient != null ? a.Patient.Group : null
            })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                g.Key.Group,
                Count = g.Count()
            })
            .ToListAsync();

        var monthLookup = monthlyGroupCounts
            .GroupBy(item => (item.Year, item.Month))
            .ToDictionary(
                g => g.Key,
                g => g.Select(item => new { group = item.Group, count = item.Count }).ToList());

        var response = new List<object>();
        for (var month = startMonth; month <= endMonth; month = month.AddMonths(1))
        {
            monthLookup.TryGetValue((month.Year, month.Month), out var byGroup);
            byGroup ??= [];

            response.Add(new
            {
                month = $"{month.Year:D4}-{month.Month:D2}",
                monthName = month.ToString("MMMM"),
                year = month.Year,
                total = byGroup.Sum(g => g.count),
                byGroup
            });
        }

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
        var admission = await _context.Admissions.FindAsync(id);
        if (admission == null) return NotFound();

        // Transfers cascade-delete at the DB level (see ArcaneSynergyContext),
        // so there's no need to load them into memory first.
        _context.Admissions.Remove(admission);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private IQueryable<Admission> ApplyAdmissionFilters(
        string? insurance,
        string? clinic,
        string? admissionType,
        int? lastMonths)
    {
        var query = _context.Admissions
            .Include(a => a.Patient)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(insurance))
            query = query.Where(a => a.Patient != null && a.Patient.Insurance == insurance);

        if (!string.IsNullOrWhiteSpace(clinic))
            query = query.Where(a => a.Patient != null && a.Patient.Clinic == clinic);

        if (!string.IsNullOrWhiteSpace(admissionType))
            query = query.Where(a => a.Type == admissionType);

        if (lastMonths.HasValue && lastMonths.Value > 0)
        {
            var endDate = DateTime.Today.AddDays(1).AddTicks(-1);
            var startDate = GetStartMonth(lastMonths.Value);
            query = query.Where(a => a.AdmissionDate >= startDate && a.AdmissionDate <= endDate);
        }

        return query;
    }

    private static DateTime GetStartMonth(int lastMonths)
    {
        var currentMonthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        return currentMonthStart.AddMonths(-(lastMonths - 1));
    }

    private IQueryable<Admission> BuildAdmissionsListQuery(
        string? search,
        string? admissionType,
        DateTime? startDate,
        DateTime? endDate)
    {
        var query = _context.Admissions
            .AsNoTracking()
            .Include(a => a.Patient)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a =>
                a.Patient != null &&
                ((a.Patient.FullName != null && a.Patient.FullName.Contains(term)) ||
                 (a.Patient.MRN != null && a.Patient.MRN.Contains(term))));
        }

        if (!string.IsNullOrWhiteSpace(admissionType))
            query = query.Where(a => a.Type == admissionType);

        if (startDate.HasValue)
        {
            var start = startDate.Value.Date;
            query = query.Where(a => a.AdmissionDate >= start);
        }

        if (endDate.HasValue)
        {
            var end = endDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(a => a.AdmissionDate <= end);
        }

        return query;
    }

    private static IQueryable<Admission> ApplyAdmissionsSort(
        IQueryable<Admission> query,
        string? sortBy,
        string? sortDir)
    {
        bool descending = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return sortBy?.ToLowerInvariant() switch
        {
            "patientfullname" => descending
                ? query.OrderByDescending(a => a.Patient != null ? a.Patient.FullName : null)
                : query.OrderBy(a => a.Patient != null ? a.Patient.FullName : null),
            "admissiondate" => descending
                ? query.OrderByDescending(a => a.AdmissionDate)
                : query.OrderBy(a => a.AdmissionDate),
            "datenotified" => descending
                ? query.OrderByDescending(a => a.DateNotified)
                : query.OrderBy(a => a.DateNotified),
            "dischargedate" => descending
                ? query.OrderByDescending(a => a.DischargeDate)
                : query.OrderBy(a => a.DischargeDate),
            "type" => descending
                ? query.OrderByDescending(a => a.Type)
                : query.OrderBy(a => a.Type),
            _ => query.OrderByDescending(a => a.AdmissionDate)
        };
    }
}
