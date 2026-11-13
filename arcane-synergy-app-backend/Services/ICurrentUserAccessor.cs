using arcane_synergy_app_backend.Extensions;
using Microsoft.AspNetCore.Http;

namespace arcane_synergy_app_backend.Services;

/// <summary>
/// Supplies the user that edit history is attributed to. The DbContext cannot
/// reach the HTTP request on its own, so this is injected into it.
/// </summary>
public interface ICurrentUserAccessor
{
    /// <summary>The signed-in user, or null outside of a request.</summary>
    string? UserName { get; }
}

/// <summary>Reads the same username claims the controllers stamp edits with.</summary>
public class HttpContextCurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserName => _httpContextAccessor.HttpContext?.User.GetUserName();
}
