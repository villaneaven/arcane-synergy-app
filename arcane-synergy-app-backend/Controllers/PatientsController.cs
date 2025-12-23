using arcane_synergy_app_backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
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
}
