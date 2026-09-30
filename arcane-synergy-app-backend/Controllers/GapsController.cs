using System.Security.Claims;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GapsController : ControllerBase
{
    private static readonly string[] AllowedTeamStatuses = { "Submitted", "Pending" };
    private static readonly TimeZoneInfo StaffTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");

    private readonly ArcaneSynergyContext _context;

    public GapsController(ArcaneSynergyContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetGaps(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDir = "asc")
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.GapWorklist.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(g =>
                (g.Name != null && g.Name.Contains(term)) ||
                g.MemberId.StartsWith(term) ||
                g.MetricType.Contains(term) ||
                (g.ProviderName != null && g.ProviderName.Contains(term)));
        }

        bool descending = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<GapWorklistItem> orderedQuery = sortBy?.ToLowerInvariant() switch
        {
            "dob" => descending ? query.OrderByDescending(g => g.DOB) : query.OrderBy(g => g.DOB),
            "insurance" => descending ? query.OrderByDescending(g => g.Insurance) : query.OrderBy(g => g.Insurance),
            "memberid" => descending ? query.OrderByDescending(g => g.MemberId) : query.OrderBy(g => g.MemberId),
            "metrictype" => descending ? query.OrderByDescending(g => g.MetricType) : query.OrderBy(g => g.MetricType),
            "providername" => descending ? query.OrderByDescending(g => g.ProviderName) : query.OrderBy(g => g.ProviderName),
            "workitemtype" => descending ? query.OrderByDescending(g => g.WorkItemType) : query.OrderBy(g => g.WorkItemType),
            "lastseendate" => descending ? query.OrderByDescending(g => g.LastSeenDate) : query.OrderBy(g => g.LastSeenDate),
            "teamstatus" => descending ? query.OrderByDescending(g => g.TeamStatus) : query.OrderBy(g => g.TeamStatus),
            "statusdate" => descending ? query.OrderByDescending(g => g.StatusDate) : query.OrderBy(g => g.StatusDate),
            _ => descending ? query.OrderByDescending(g => g.Name) : query.OrderBy(g => g.Name)
        };

        query = orderedQuery
            .ThenBy(g => g.Insurance)
            .ThenBy(g => g.MemberId)
            .ThenBy(g => g.MetricType);

        var totalCount = await query.CountAsync();

        var skipLong = ((long)page - 1) * pageSize;
        if (skipLong > int.MaxValue) return BadRequest("Requested page is too large.");

        var gaps = await query
            .Skip((int)skipLong)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = gaps,
            totalCount,
            page,
            pageSize
        });
    }

    public record UpdateGapStatusRequest(string Insurance, string MemberId, string MetricType, string TeamStatus);

    [HttpPut("status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateGapStatusRequest request)
    {
        var teamStatus = AllowedTeamStatuses.FirstOrDefault(s =>
            string.Equals(s, request.TeamStatus?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (teamStatus == null)
            return BadRequest($"TeamStatus must be one of: {string.Join(", ", AllowedTeamStatuses)}.");

        bool gapExists = await _context.GapWorklist.AnyAsync(g =>
            g.Insurance == request.Insurance &&
            g.MemberId == request.MemberId &&
            g.MetricType == request.MetricType);
        if (!gapExists) return NotFound();

        var updatedBy = GetCurrentUserName();
        if (updatedBy == null) return Forbid();

        var now = DateTime.UtcNow;
        var status = await _context.GapWorkStatuses.FindAsync(request.Insurance, request.MemberId, request.MetricType);
        if (status == null)
        {
            status = new GapWorkStatus
            {
                Insurance = request.Insurance,
                MemberId = request.MemberId,
                MetricType = request.MetricType
            };
            _context.GapWorkStatuses.Add(status);
        }

        status.TeamStatus = teamStatus;
        status.StatusDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, StaffTimeZone));
        status.UpdatedAt = now;
        status.UpdatedBy = updatedBy;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict("Someone else just updated this gap. Refresh and try again.");
        }

        return Ok(new
        {
            status.TeamStatus,
            status.StatusDate,
            status.UpdatedAt,
            status.UpdatedBy
        });
    }

    private string? GetCurrentUserName()
    {
        string[] claimTypes =
        {
            "preferred_username", "upn", ClaimTypes.Upn, "unique_name", ClaimTypes.Name, "email", ClaimTypes.Email, "name"
        };
        var value = claimTypes
            .Select(t => User.FindFirst(t)?.Value)
            .FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        return value?.Length > 255 ? value[..255] : value;
    }
}
