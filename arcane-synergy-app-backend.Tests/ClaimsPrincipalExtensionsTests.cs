using System.Security.Claims;
using arcane_synergy_app_backend.Extensions;
using arcane_synergy_app_backend.Services;
using Microsoft.AspNetCore.Http;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// GetUserName decides who every audit stamp and edit history row is
/// attributed to, and whether a write is forbidden outright. Entra ID, ADFS
/// and plain JWT issuers name the user under different claims, so the order
/// in which they are tried is part of the contract.
/// </summary>
public class ClaimsPrincipalExtensionsTests
{
    /// <summary>The claim types GetUserName recognises, most preferred first.</summary>
    private static readonly string[] PreferenceOrder =
    {
        "preferred_username",
        "upn",
        ClaimTypes.Upn,
        "unique_name",
        ClaimTypes.Name,
        "email",
        ClaimTypes.Email,
        "name",
    };

    public static TheoryData<string> RecognisedClaimTypes => new(PreferenceOrder);

    [Theory]
    [MemberData(nameof(RecognisedClaimTypes))]
    public void GetUserName_ReadsEachRecognisedClaimOnItsOwn(string claimType)
    {
        var user = Principal((claimType, "nurse@example.com"));

        Assert.Equal("nurse@example.com", user.GetUserName());
    }

    [Fact]
    public void GetUserName_PrefersEarlierClaimTypesRegardlessOfTokenOrder()
    {
        var claims = PreferenceOrder.Reverse().Select(t => (t, $"from:{t}")).ToArray();

        var user = Principal(claims);

        Assert.Equal("from:preferred_username", user.GetUserName());
    }

    [Fact]
    public void GetUserName_FallsThroughToTheNextClaimInPreferenceOrder()
    {
        var user = Principal(
            ("name", "Ada Lovelace"),
            ("email", "ada@example.com"),
            ("unique_name", "ada@contoso.com"));

        Assert.Equal("ada@contoso.com", user.GetUserName());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void GetUserName_SkipsBlankClaimsAndUsesTheNextOne(string blank)
    {
        var user = Principal(
            ("preferred_username", blank),
            ("upn", "ada@contoso.com"));

        Assert.Equal("ada@contoso.com", user.GetUserName());
    }

    [Fact]
    public void GetUserName_IgnoresClaimTypesItDoesNotRecognise()
    {
        var user = Principal(
            ("sub", "0f3c9a"),
            ("oid", "7d2e41"),
            (ClaimTypes.NameIdentifier, "ada"));

        Assert.Null(user.GetUserName());
    }

    [Fact]
    public void GetUserName_ReturnsNullForAPrincipalWithNoClaims()
    {
        Assert.Null(new ClaimsPrincipal(new ClaimsIdentity()).GetUserName());
    }

    [Fact]
    public void GetUserName_ReturnsNullForANullPrincipal()
    {
        ClaimsPrincipal user = null!;

        Assert.Null(user.GetUserName());
    }

    [Fact]
    public void GetUserName_ReadsClaimsFromAnyIdentityOnThePrincipal()
    {
        var user = new ClaimsPrincipal(new[]
        {
            new ClaimsIdentity(new[] { new Claim("sub", "0f3c9a") }, "First"),
            new ClaimsIdentity(new[] { new Claim("upn", "ada@contoso.com") }, "Second"),
        });

        Assert.Equal("ada@contoso.com", user.GetUserName());
    }

    [Fact]
    public void GetUserName_KeepsANameOfExactlyTheColumnLimit()
    {
        var name = new string('a', 255);

        Assert.Equal(name, Principal(("preferred_username", name)).GetUserName());
    }

    [Fact]
    public void GetUserName_TruncatesNamesLongerThanTheColumnLimit()
    {
        var name = new string('a', 250) + "bcdefXYZ";

        var result = Principal(("preferred_username", name)).GetUserName();

        Assert.Equal(new string('a', 250) + "bcdef", result);
    }

    // ---------- HttpContextCurrentUserAccessor ----------

    [Fact]
    public void CurrentUserAccessor_ReadsTheSignedInUserFromTheRequest()
    {
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = Principal(("upn", "ada@contoso.com")) },
        });

        Assert.Equal("ada@contoso.com", accessor.UserName);
    }

    [Fact]
    public void CurrentUserAccessor_ReturnsNullOutsideARequest()
    {
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor());

        Assert.Null(accessor.UserName);
    }

    [Fact]
    public void CurrentUserAccessor_ReturnsNullForAnAnonymousRequest()
    {
        var accessor = new HttpContextCurrentUserAccessor(new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext(),
        });

        Assert.Null(accessor.UserName);
    }

    private static ClaimsPrincipal Principal(params (string Type, string Value)[] claims) =>
        new(new ClaimsIdentity(claims.Select(c => new Claim(c.Type, c.Value)), "TestAuth"));
}
