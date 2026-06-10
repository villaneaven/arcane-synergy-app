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
    public async Task<IActionResult> GetPatients()
    {
        var patients = await _context.Patients
            .OrderBy(p => p.LastName)
            .ToListAsync();

        return Ok(patients);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetPatient(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
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
