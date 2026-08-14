using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly ArcaneSynergyContext _context;

    public PatientsController(ArcaneSynergyContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetPatients(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = "asc")
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Patients.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p =>
                p.FirstName.Contains(term) ||
                p.LastName.Contains(term) ||
                (p.FullName != null && p.FullName.Contains(term)) ||
                (p.MRN != null && p.MRN.Contains(term)));
        }

        bool descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy?.ToLowerInvariant() switch
        {
            "firstname" => descending ? query.OrderByDescending(p => p.FirstName) : query.OrderBy(p => p.FirstName),
            "fullname" => descending ? query.OrderByDescending(p => p.FullName) : query.OrderBy(p => p.FullName),
            "dob" => descending ? query.OrderByDescending(p => p.DOB) : query.OrderBy(p => p.DOB),
            "mrn" => descending ? query.OrderByDescending(p => p.MRN) : query.OrderBy(p => p.MRN),
            "group" => descending ? query.OrderByDescending(p => p.Group) : query.OrderBy(p => p.Group),
            "insurance" => descending ? query.OrderByDescending(p => p.Insurance) : query.OrderBy(p => p.Insurance),
            "pcp" => descending ? query.OrderByDescending(p => p.PCP) : query.OrderBy(p => p.PCP),
            "clinic" => descending ? query.OrderByDescending(p => p.Clinic) : query.OrderBy(p => p.Clinic),
            _ => descending
                ? query.OrderByDescending(p => p.LastName).ThenByDescending(p => p.FirstName)
                : query.OrderBy(p => p.LastName).ThenBy(p => p.FirstName)
        };

        var totalCount = await query.CountAsync();

        var skipLong = ((long)page - 1) * pageSize;
        if (skipLong > int.MaxValue) return BadRequest("Requested page is too large.");

        var patients = await query
            .Skip((int)skipLong)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = patients,
            totalCount,
            page,
            pageSize
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetPatient(int id)
    {
        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PatientID == id);
        return patient == null ? NotFound() : Ok(patient);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchPatients([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(Array.Empty<object>());

        query = query.Trim();

        var patients = await _context.Patients
            .AsNoTracking()
            .Where(p =>
                p.FirstName.Contains(query) ||
                p.LastName.Contains(query) ||
                (p.FullName != null && p.FullName.Contains(query)) ||
                (p.MRN != null && p.MRN.Contains(query))
            )
            .OrderBy(p => p.LastName)
            .ThenBy(p => p.FirstName)
            .Take(10)
            .Select(p => new
            {
                p.PatientID,
                p.FullName,
                p.DOB,
                p.MRN
            })
            .ToListAsync();

        return Ok(patients);
    }


    [HttpPost]
    public async Task<IActionResult> AddPatient([FromBody] Patient patient)
    {
        patient.UpdateCalculatedFields();

        if (!string.IsNullOrWhiteSpace(patient.MRN))
        {
            var mrn = patient.MRN.Trim();
            var group = (patient.Group ?? string.Empty).Trim();
            bool duplicate = await _context.Patients
                .AnyAsync(p => p.MRN == mrn && (p.Group ?? string.Empty) == group);
            if (duplicate)
                return Conflict("A patient with the same MRN already exists in this group.");
        }

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPatient), new { id = patient.PatientID }, patient);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePatient(int id, [FromBody] Patient patient)
    {

        if (id != patient.PatientID)
            return BadRequest("PatientID mismatch");

        var existing = await _context.Patients.FindAsync(id);
        if (existing == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(patient.MRN))
        {
            var mrn = patient.MRN.Trim();
            var group = (patient.Group ?? string.Empty).Trim();
            bool duplicate = await _context.Patients
                .AnyAsync(p => p.PatientID != id && p.MRN == mrn && (p.Group ?? string.Empty) == group);
            if (duplicate)
                return Conflict("Another patient in the same group has the same MRN.");
        }

        existing.FirstName = patient.FirstName;
        existing.LastName = patient.LastName;
        existing.DOB = patient.DOB;
        existing.MRN = patient.MRN;
        existing.Group = patient.Group;
        existing.Insurance = patient.Insurance;
        existing.PCP = patient.PCP;
        existing.Clinic = patient.Clinic;

        existing.UpdateCalculatedFields();
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePatient(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient == null) return NotFound();

        _context.Patients.Remove(patient);
        await _context.SaveChangesAsync();

        return NoContent();
    }


}
