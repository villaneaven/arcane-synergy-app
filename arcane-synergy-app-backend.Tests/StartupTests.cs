using System.Net;
using arcane_synergy_app_backend.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// Hosts the real Program.cs pipeline in memory. The committed configuration
/// points at the shared Azure SQL database, so <see cref="AppFactory"/> swaps
/// the database out before the app is built and overrides the connection
/// string as a second line of defence.
/// </summary>
public class StartupTests : IClassFixture<StartupTests.AppFactory>
{
    private readonly AppFactory _factory;

    public StartupTests(AppFactory factory) => _factory = factory;

    [Theory]
    [InlineData("/api/Patients")]
    [InlineData("/api/Patients/1")]
    [InlineData("/api/Patients/search?query=a")]
    [InlineData("/api/Admissions")]
    [InlineData("/api/Admissions/count")]
    [InlineData("/api/Transfers")]
    [InlineData("/api/Gaps")]
    [InlineData("/api/EditHistory/Patient/1")]
    public async Task ReadEndpoints_RejectRequestsWithoutAToken(string url)
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("POST", "/api/Patients")]
    [InlineData("PUT", "/api/Patients/1")]
    [InlineData("DELETE", "/api/Patients/1")]
    [InlineData("POST", "/api/Admissions")]
    [InlineData("DELETE", "/api/Admissions/1")]
    [InlineData("POST", "/api/Transfers")]
    [InlineData("POST", "/api/Transfers/1/move-to-admission")]
    [InlineData("DELETE", "/api/Transfers/1")]
    [InlineData("PUT", "/api/Gaps/status")]
    public async Task WriteEndpoints_RejectRequestsWithoutAToken(string method, string url)
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), url)
        {
            Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json"),
        };

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RejectsAMalformedBearerToken()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "not-a-jwt");

        var response = await client.GetAsync("/api/Patients");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Startup_DoesNotSeedDemoDataByDefault()
    {
        using var factory = new AppFactory();
        using var client = factory.CreateClient();

        Assert.Equal(0, await PatientCountAsync(factory));
    }

    [Fact]
    public async Task Startup_SeedsDemoDataWhenExplicitlyEnabled()
    {
        using var factory = new SeedingAppFactory();
        using var client = factory.CreateClient();

        Assert.Equal(2, await PatientCountAsync(factory));
    }

    [Fact]
    public void Startup_UsesTheInMemoryDatabaseNotTheConfiguredServer()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ArcaneSynergyContext>();

        Assert.Equal("Microsoft.EntityFrameworkCore.InMemory", context.Database.ProviderName);
    }

    private static async Task<int> PatientCountAsync(AppFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ArcaneSynergyContext>();
        return await context.Patients.CountAsync();
    }

    /// <summary>The app as deployed: seeding left at its default.</summary>
    public class AppFactory : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"startup-{Guid.NewGuid()}";

        /// <summary>Null leaves the setting unset, as in every deployed config.</summary>
        protected virtual string? SeedDemoData => null;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.UseContentRoot(EmptyContentRoot);

            builder.UseSetting("AzureAd:Instance", "https://login.microsoftonline.com/");
            builder.UseSetting("AzureAd:TenantId", TestTenantId);
            builder.UseSetting("AzureAd:ClientId", TestClientId);
            builder.UseSetting("AzureAd:Audience", TestClientId);

            builder.UseSetting(
                "ConnectionStrings:DefaultConnection",
                "Server=invalid.localhost;Database=none;Connect Timeout=1");
            if (SeedDemoData != null)
                builder.UseSetting(DataSeeder.EnabledSetting, SeedDemoData);

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<ArcaneSynergyContext>>();
                services.RemoveAll<DbContextOptions>();
                services.AddDbContext<ArcaneSynergyContext>(options =>
                    options.UseInMemoryDatabase(_databaseName));

                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.Configuration = new OpenIdConnectConfiguration();
                });
            });
        }
    }

    private const string TestTenantId = "00000000-0000-0000-0000-00000000aaaa";
    private const string TestClientId = "00000000-0000-0000-0000-00000000bbbb";

    private static readonly string EmptyContentRoot =
        Directory.CreateDirectory(Path.Combine(Path.GetTempPath(), "arcane-startup-tests-content-root")).FullName;

    /// <summary>A developer who has opted into demo data.</summary>
    public sealed class SeedingAppFactory : AppFactory
    {
        protected override string? SeedDemoData => "true";
    }
}
