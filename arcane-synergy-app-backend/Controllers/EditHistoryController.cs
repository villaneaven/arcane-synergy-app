using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EditHistoryController : ControllerBase
{
    /// <summary>
    /// Entity names the history can be queried by, mapped from the route value
    /// so a caller cannot probe for other tables' rows.
    /// </summary>
    private static readonly Dictionary<string, string> QueryableEntityTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [nameof(Patient)] = nameof(Patient),
            [nameof(Admission)] = nameof(Admission),
            [nameof(Transfer)] = nameof(Transfer),
        };

    private readonly ArcaneSynergyContext _context;

    public EditHistoryController(ArcaneSynergyContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Changes made to one record, newest first.
    /// </summary>
    [HttpGet("{entityType}/{entityId}")]
    public async Task<IActionResult> GetHistory(
        string entityType,
        string entityId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (!QueryableEntityTypes.TryGetValue(entityType, out var canonicalType))
        {
            return BadRequest(
                $"Unknown entity type '{entityType}'. Expected one of: {string.Join(", ", QueryableEntityTypes.Values)}.");
        }

        if (string.IsNullOrWhiteSpace(entityId))
            return BadRequest("entityId is required.");

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _context.EditHistory
            .AsNoTracking()
            .Where(h => h.EntityType == canonicalType && h.EntityId == entityId);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(h => h.ChangedAt)
            .ThenByDescending(h => h.EditHistoryId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new
            {
                h.EditHistoryId,
                h.EntityType,
                h.EntityId,
                h.ChangeType,
                h.FieldName,
                h.OldValue,
                h.NewValue,
                h.ChangedBy,
                h.ChangedAt,
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize
        });
    }
}
