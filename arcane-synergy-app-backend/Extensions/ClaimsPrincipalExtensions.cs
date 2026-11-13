using System.Security.Claims;

namespace arcane_synergy_app_backend.Extensions;

public static class ClaimsPrincipalExtensions
{
    private static readonly string[] UserNameClaimTypes =
    {
        "preferred_username", "upn", ClaimTypes.Upn, "unique_name", ClaimTypes.Name, "email", ClaimTypes.Email, "name"
    };

    public static string? GetUserName(this ClaimsPrincipal user)
    {
        if (user is null) return null;

        var value = UserNameClaimTypes
            .Select(t => user.FindFirst(t)?.Value)
            .FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        return value?.Length > 255 ? value[..255] : value;
    }
}
