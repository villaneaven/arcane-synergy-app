using System.Text.Json.Nodes;
using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// GapsController reads a view and writes to a separate status table keyed by
/// insurance + member + metric. The interesting parts are the filter and search
/// rules over that view, and the status write: it validates against a fixed
/// list, upserts, and records the date in the staff timezone rather than UTC.
/// </summary>
public class GapsControllerTests
{
    // ---------- list ----------

    [Fact]
    public async Task GetGaps_ClampsPageAndPageSizeToSafeRange()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));

        var controller = new GapsController(context);

        var payload = (await controller.GetGaps(page: 0, pageSize: 5000)).OkJson();

        Assert.Equal(1, payload.Int("page"));
        Assert.Equal(100, payload.Int("pageSize"));
    }

    [Fact]
    public async Task GetGaps_PagesThroughResultsAndReportsTotalCount()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", name: "A"),
            TestDb.Gap("M2", name: "B"),
            TestDb.Gap("M3", name: "C"),
            TestDb.Gap("M4", name: "D"),
            TestDb.Gap("M5", name: "E"));

        var controller = new GapsController(context);

        var payload = (await controller.GetGaps(page: 2, pageSize: 2)).OkJson();

        Assert.Equal(5, payload.Int("totalCount"));
        Assert.Equal(new[] { "M3", "M4" }, MemberIds(payload));
    }

    [Fact]
    public async Task GetGaps_RejectsPageOffsetBeyondIntRange()
    {
        using var context = TestDb.CreateGapsContext();
        var controller = new GapsController(context);

        var result = await controller.GetGaps(page: int.MaxValue, pageSize: 100);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetGaps_SearchMatchesNameMetricAndProviderAnywhere()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M100", name: "Alice Smith", providerName: "Dr. House", metricType: "A1C"),
            TestDb.Gap("M200", name: "Bob Jones", providerName: "Dr. Who", metricType: "BP"));

        var controller = new GapsController(context);

        Assert.Equal(new[] { "M100" }, MemberIds((await controller.GetGaps(search: "Smith")).OkJson()));
        Assert.Equal(new[] { "M200" }, MemberIds((await controller.GetGaps(search: "Dr. Who")).OkJson()));
        Assert.Equal(new[] { "M200" }, MemberIds((await controller.GetGaps(search: "BP")).OkJson()));

        Assert.Equal(new[] { "M100" }, MemberIds((await controller.GetGaps(search: "  Smith  ")).OkJson()));
    }

    [Fact]
    public async Task GetGaps_SearchMatchesMemberIdByPrefixOnly()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M100", name: "Alice Smith"));

        var controller = new GapsController(context);

        Assert.Single(MemberIds((await controller.GetGaps(search: "M10")).OkJson()));

        Assert.Empty(MemberIds((await controller.GetGaps(search: "100")).OkJson()));
    }

    [Fact]
    public async Task GetGaps_FiltersByInsuranceGroupProviderAndMetricType()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", insurance: "Aetna", groupName: "DMC", providerName: "Dr. House", metricType: "A1C"),
            TestDb.Gap("M2", insurance: "BCBS", groupName: "DMC", providerName: "Dr. Who", metricType: "A1C"),
            TestDb.Gap("M3", insurance: "Aetna", groupName: "RGVAIMS", providerName: "Dr. House", metricType: "BP"));

        var controller = new GapsController(context);

        Assert.Equal(new[] { "M1", "M3" }, MemberIds((await controller.GetGaps(insurance: "Aetna")).OkJson()));
        Assert.Equal(new[] { "M1", "M2" }, MemberIds((await controller.GetGaps(groupName: "DMC")).OkJson()));
        Assert.Equal(new[] { "M1", "M3" }, MemberIds((await controller.GetGaps(providerName: "Dr. House")).OkJson()));
        Assert.Equal(new[] { "M1", "M2" }, MemberIds((await controller.GetGaps(metricType: "A1C")).OkJson()));

        Assert.Equal(
            new[] { "M1" },
            MemberIds((await controller.GetGaps(insurance: "Aetna", metricType: "A1C")).OkJson()));
    }

    [Fact]
    public async Task GetGaps_TeamStatusNoneMatchesOnlyRowsWithoutAStatus()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", teamStatus: null),
            TestDb.Gap("M2", teamStatus: "Submitted"),
            TestDb.Gap("M3", teamStatus: "Pending"));

        var controller = new GapsController(context);

        Assert.Equal(new[] { "M1" }, MemberIds((await controller.GetGaps(teamStatus: "none")).OkJson()));

        Assert.Equal(new[] { "M1" }, MemberIds((await controller.GetGaps(teamStatus: "None")).OkJson()));

        Assert.Equal(new[] { "M2" }, MemberIds((await controller.GetGaps(teamStatus: "Submitted")).OkJson()));
        Assert.Equal(3, (await controller.GetGaps()).OkJson().Int("totalCount"));
    }

    [Fact]
    public async Task GetGaps_SortsByRequestedColumnAndDirection()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M2", name: "Bravo", lastSeenDate: new DateOnly(2025, 3, 1)),
            TestDb.Gap("M1", name: "Charlie", lastSeenDate: new DateOnly(2025, 1, 1)),
            TestDb.Gap("M3", name: "Alpha", lastSeenDate: new DateOnly(2025, 2, 1)));

        var controller = new GapsController(context);

        var byDefault = (await controller.GetGaps()).OkJson();
        Assert.Equal(new[] { "M3", "M2", "M1" }, MemberIds(byDefault));

        var byNameDesc = (await controller.GetGaps(sortDir: "desc")).OkJson();
        Assert.Equal(new[] { "M1", "M2", "M3" }, MemberIds(byNameDesc));

        var byMemberId = (await controller.GetGaps(sortBy: "memberid")).OkJson();
        Assert.Equal(new[] { "M1", "M2", "M3" }, MemberIds(byMemberId));

        var byLastSeen = (await controller.GetGaps(sortBy: "lastseendate")).OkJson();
        Assert.Equal(new[] { "M1", "M3", "M2" }, MemberIds(byLastSeen));
    }

    [Fact]
    public async Task GetGaps_TreatsAnythingOtherThanDescAsAscending()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M2", name: "Bravo"),
            TestDb.Gap("M1", name: "Alpha"));

        var controller = new GapsController(context);

        foreach (var sortDir in new[] { "asc", null, "", "DOWN" })
        {
            var payload = (await controller.GetGaps(sortDir: sortDir)).OkJson();
            Assert.Equal(new[] { "M1", "M2" }, MemberIds(payload));
        }

        var descending = (await controller.GetGaps(sortDir: "DESC")).OkJson();
        Assert.Equal(new[] { "M2", "M1" }, MemberIds(descending));
    }

    [Fact]
    public async Task GetGaps_BreaksTiesByInsuranceThenMemberIdThenMetricType()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", insurance: "Aetna", metricType: "BP", name: "Same"),
            TestDb.Gap("M1", insurance: "Aetna", metricType: "A1C", name: "Same"),
            TestDb.Gap("M0", insurance: "BCBS", metricType: "ZZ", name: "Same"));

        var controller = new GapsController(context);

        var payload = (await controller.GetGaps()).OkJson();

        Assert.Equal(
            new[] { "A1C", "BP", "ZZ" },
            payload.Array("items").Select(i => i!["MetricType"]!.GetValue<string>()).ToArray());
    }

    // ---------- filter options ----------

    [Fact]
    public async Task GetFilterOptions_ReturnsDistinctSortedValuesAndSkipsBlankGroupsAndProviders()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", insurance: "Aetna", groupName: "DMC", providerName: "Dr. House", metricType: "A1C"),
            TestDb.Gap("M2", insurance: "BCBS", groupName: "DMC", providerName: "Dr. Who", metricType: "BP"),
            TestDb.Gap("M3", insurance: "Aetna", groupName: "", providerName: null, metricType: "A1C"));

        var controller = new GapsController(context);

        var payload = (await controller.GetFilterOptions()).OkJson();

        Assert.Equal(new[] { "Aetna", "BCBS" }, Strings(payload, "insurances"));
        Assert.Equal(new[] { "DMC" }, Strings(payload, "groups"));
        Assert.Equal(new[] { "Dr. House", "Dr. Who" }, Strings(payload, "providers"));
        Assert.Equal(new[] { "A1C", "BP" }, Strings(payload, "metricTypes"));
    }

    [Fact]
    public async Task GetFilterOptions_MapsEachGroupToItsOwnProviders()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(
            context,
            TestDb.Gap("M1", groupName: "DMC", providerName: "Dr. Who"),
            TestDb.Gap("M2", groupName: "DMC", providerName: "Dr. House"),
            TestDb.Gap("M3", groupName: "DMC", providerName: "Dr. House"),
            TestDb.Gap("M4", groupName: "RGVAIMS", providerName: "Dr. Crusher"));

        var controller = new GapsController(context);

        var byGroup = (await controller.GetFilterOptions()).OkJson()["providersByGroup"]!;

        Assert.Equal(
            new[] { "Dr. House", "Dr. Who" },
            byGroup["DMC"]!.AsArray().Select(v => v!.GetValue<string>()).ToArray());
        Assert.Equal(
            new[] { "Dr. Crusher" },
            byGroup["RGVAIMS"]!.AsArray().Select(v => v!.GetValue<string>()).ToArray());
    }

    [Fact]
    public async Task GetFilterOptions_AlwaysOffersTheAllowedTeamStatuses()
    {
        using var context = TestDb.CreateGapsContext();
        var controller = new GapsController(context);

        var payload = (await controller.GetFilterOptions()).OkJson();

        Assert.Equal(new[] { "Submitted", "Pending" }, Strings(payload, "teamStatuses"));
        Assert.Empty(Strings(payload, "insurances"));
    }

    // ---------- status write ----------

    [Theory]
    [InlineData("Done")]
    [InlineData("submited")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task UpdateStatus_RejectsAStatusOutsideTheAllowedList(string? teamStatus)
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));

        var controller = new GapsController(context).WithUser();

        var result = await controller.UpdateStatus(Request(teamStatus!));

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(0, await context.GapWorkStatuses.CountAsync());
    }

    [Theory]
    [InlineData("submitted", "Submitted")]
    [InlineData("  PENDING  ", "Pending")]
    public async Task UpdateStatus_AcceptsAnAllowedStatusInAnyCaseAndStoresTheCanonicalForm(
        string supplied,
        string expected)
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));

        var controller = new GapsController(context).WithUser();

        var payload = (await controller.UpdateStatus(Request(supplied))).OkJson();

        Assert.Equal(expected, payload["TeamStatus"]!.GetValue<string>());
        Assert.Equal(expected, (await context.GapWorkStatuses.AsNoTracking().FirstAsync()).TeamStatus);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsNotFoundWhenNoGapMatchesTheTriple()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1", insurance: "Aetna", metricType: "A1C"));

        var controller = new GapsController(context).WithUser();

        var result = await controller.UpdateStatus(Request("Submitted", metricType: "BP"));

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(0, await context.GapWorkStatuses.CountAsync());
    }

    [Fact]
    public async Task UpdateStatus_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));

        var controller = new GapsController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.UpdateStatus(Request("Submitted")));
        Assert.Equal(0, await context.GapWorkStatuses.CountAsync());
    }

    [Fact]
    public async Task UpdateStatus_CreatesTheStatusRowWhenTheGapHasNeverBeenWorked()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1", insurance: "Aetna", metricType: "A1C"));

        var controller = new GapsController(context).WithUser("nurse@example.com");

        var payload = (await controller.UpdateStatus(Request("Submitted"))).OkJson();

        Assert.Equal("Submitted", payload["TeamStatus"]!.GetValue<string>());
        Assert.Equal("nurse@example.com", payload["UpdatedBy"]!.GetValue<string>());

        var saved = await context.GapWorkStatuses.AsNoTracking().FirstAsync();
        Assert.Equal("Aetna", saved.Insurance);
        Assert.Equal("M1", saved.MemberId);
        Assert.Equal("A1C", saved.MetricType);
        Assert.Equal("Submitted", saved.TeamStatus);
        Assert.Equal("nurse@example.com", saved.UpdatedBy);
        Assert.NotNull(saved.UpdatedAt);
    }

    [Fact]
    public async Task UpdateStatus_OverwritesTheExistingRowRatherThanAddingASecond()
    {
        using var context = TestDb.CreateGapsContext();
        context.GapWorklist.Add(TestDb.Gap("M1"));
        context.GapWorkStatuses.Add(TestDb.GapStatus(
            "M1",
            teamStatus: "Pending",
            updatedBy: "previous.user@example.com"));
        await context.SaveChangesAsync();

        var controller = new GapsController(context).WithUser("nurse@example.com");

        await controller.UpdateStatus(Request("Submitted"));

        Assert.Equal(1, await context.GapWorkStatuses.CountAsync());
        var saved = await context.GapWorkStatuses.AsNoTracking().FirstAsync();
        Assert.Equal("Submitted", saved.TeamStatus);
        Assert.Equal("nurse@example.com", saved.UpdatedBy);
        Assert.NotEqual(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc), saved.UpdatedAt);
    }

    [Fact]
    public async Task UpdateStatus_KeepsStatusRowsForOtherGapsUntouched()
    {
        using var context = TestDb.CreateGapsContext();
        context.GapWorklist.AddRange(
            TestDb.Gap("M1", metricType: "A1C"),
            TestDb.Gap("M1", metricType: "BP"));
        context.GapWorkStatuses.Add(TestDb.GapStatus("M1", metricType: "BP", teamStatus: "Pending"));
        await context.SaveChangesAsync();

        var controller = new GapsController(context).WithUser();

        await controller.UpdateStatus(Request("Submitted", metricType: "A1C"));

        Assert.Equal(2, await context.GapWorkStatuses.CountAsync());
        var untouched = await context.GapWorkStatuses
            .AsNoTracking()
            .FirstAsync(s => s.MetricType == "BP");
        Assert.Equal("Pending", untouched.TeamStatus);
        Assert.Equal("previous.user@example.com", untouched.UpdatedBy);
    }

    [Fact]
    public async Task UpdateStatus_StampsUpdatedAtInUtc()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));
        var before = DateTime.UtcNow;

        var controller = new GapsController(context).WithUser();

        await controller.UpdateStatus(Request("Submitted"));

        var saved = await context.GapWorkStatuses.AsNoTracking().FirstAsync();
        Assert.Equal(DateTimeKind.Utc, saved.UpdatedAt!.Value.Kind);
        Assert.InRange(saved.UpdatedAt.Value, before, DateTime.UtcNow);
    }

    [Fact]
    public async Task UpdateStatus_RecordsStatusDateInStaffLocalTimeRatherThanUtc()
    {
        using var context = TestDb.CreateGapsContext();
        await SeedAsync(context, TestDb.Gap("M1"));

        var controller = new GapsController(context).WithUser();

        await controller.UpdateStatus(Request("Submitted"));

        var saved = await context.GapWorkStatuses.AsNoTracking().FirstAsync();
        var staffLocal = TimeZoneInfo.ConvertTimeFromUtc(saved.UpdatedAt!.Value, StaffTimeZone);
        Assert.Equal(DateOnly.FromDateTime(staffLocal), saved.StatusDate);
    }

    [Fact]
    public void StaffTimeZone_ResolvesOnThisHostAndRollsEarlyMorningUtcBackADay()
    {
        using var context = TestDb.CreateGapsContext();

        _ = new GapsController(context);

        var earlyMorningUtc = new DateTime(2025, 1, 15, 2, 0, 0, DateTimeKind.Utc);
        var staffLocal = TimeZoneInfo.ConvertTimeFromUtc(earlyMorningUtc, StaffTimeZone);

        Assert.Equal(new DateTime(2025, 1, 14, 20, 0, 0), staffLocal);
        Assert.Equal(new DateOnly(2025, 1, 14), DateOnly.FromDateTime(staffLocal));
    }

    // ---------- helpers ----------

    private static readonly TimeZoneInfo StaffTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");

    private static async Task SeedAsync(ArcaneSynergyContext context, params GapWorklistItem[] gaps)
    {
        context.GapWorklist.AddRange(gaps);
        await context.SaveChangesAsync();
    }

    private static GapsController.UpdateGapStatusRequest Request(
        string teamStatus,
        string insurance = "Aetna",
        string memberId = "M1",
        string metricType = "A1C") =>
        new(insurance, memberId, metricType, teamStatus);

    private static string[] MemberIds(JsonNode payload) =>
        payload.Array("items").Select(i => i!["MemberId"]!.GetValue<string>()).ToArray();

    private static string[] Strings(JsonNode payload, string property) =>
        payload.Array(property).Select(v => v!.GetValue<string>()).ToArray();
}
