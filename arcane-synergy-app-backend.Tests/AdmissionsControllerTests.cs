using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

public class AdmissionsControllerTests
{
    [Fact]
    public async Task GetAdmissions_ClampsPageAndPageSizeToSafeRange()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissions(page: 0, pageSize: 5000);

        var payload = result.OkJson();
        Assert.Equal(1, payload.Int("page"));
        Assert.Equal(100, payload.Int("pageSize"));
    }

    [Fact]
    public async Task GetAdmissions_PagesThroughResultsAndReportsTotalCount()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        for (var i = 1; i <= 5; i++)
        {
            context.Admissions.Add(TestDb.Admission(i, 1, new DateTime(2025, 1, i)));
        }
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissions(page: 2, pageSize: 2);

        var payload = result.OkJson();
        Assert.Equal(5, payload.Int("totalCount"));
        Assert.Equal(2, payload.Array("items").Count);
    }

    [Fact]
    public async Task GetAdmissions_SearchMatchesPatientNameAndMrnPrefix()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace", mrn: "A100"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper", mrn: "B200"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, new DateTime(2025, 1, 10)),
            TestDb.Admission(2, 2, new DateTime(2025, 1, 11)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        // FullName is "Last, First", so the prefix search matches on last name.
        var byName = (await controller.GetAdmissions(search: "Hopper")).OkJson();
        Assert.Equal(1, byName.Int("totalCount"));

        var byMrn = (await controller.GetAdmissions(search: "A100")).OkJson();
        Assert.Equal(1, byMrn.Int("totalCount"));

        var noMatch = (await controller.GetAdmissions(search: "Turing")).OkJson();
        Assert.Equal(0, noMatch.Int("totalCount"));
    }

    [Fact]
    public async Task GetAdmissions_FiltersByTypeAndDateRangeInclusiveOfEndDay()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, new DateTime(2025, 1, 10), type: "ADM"),
            TestDb.Admission(2, 1, new DateTime(2025, 1, 20, 23, 30, 0), type: "ER"),
            TestDb.Admission(3, 1, new DateTime(2025, 2, 5), type: "ER"));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var byType = (await controller.GetAdmissions(admissionType: "ER")).OkJson();
        Assert.Equal(2, byType.Int("totalCount"));

        // endDate is a plain date, but a same-day admission with a time must still match.
        var byRange = (await controller.GetAdmissions(
            startDate: new DateTime(2025, 1, 1),
            endDate: new DateTime(2025, 1, 20))).OkJson();
        Assert.Equal(2, byRange.Int("totalCount"));
    }

    [Fact]
    public async Task GetAdmissions_SortsByRequestedColumnAndDirection()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, new DateTime(2025, 1, 10)),
            TestDb.Admission(2, 1, new DateTime(2025, 3, 10)),
            TestDb.Admission(3, 1, new DateTime(2025, 2, 10)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var ascending = (await controller.GetAdmissions(sortBy: "admissiondate", sortDir: "asc")).OkJson();
        Assert.Equal(
            new[] { 1, 3, 2 },
            ascending.Array("items").Select(i => i!.Int("AdmissionId")).ToArray());

        // Anything other than "asc" is treated as descending, including the default.
        var descending = (await controller.GetAdmissions(sortBy: "admissiondate")).OkJson();
        Assert.Equal(
            new[] { 2, 3, 1 },
            descending.Array("items").Select(i => i!.Int("AdmissionId")).ToArray());
    }

    [Fact]
    public async Task GetAdmissionsForExport_IgnoresPagingAndReturnsEveryMatch()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        for (var i = 1; i <= 150; i++)
        {
            context.Admissions.Add(TestDb.Admission(i, 1, new DateTime(2025, 1, 1).AddDays(i)));
        }
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissionsForExport();

        Assert.Equal(150, result.OkValue<List<Admission>>().Count);
    }

    [Fact]
    public async Task GetAdmission_ReturnsNotFoundForUnknownId()
    {
        using var context = TestDb.CreateContext();
        var controller = new AdmissionsController(context);

        Assert.IsType<NotFoundResult>(await controller.GetAdmission(404));
    }

    [Fact]
    public async Task GetAdmissionsByPatient_ReturnsOnlyThatPatientNewestFirst()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(TestDb.Patient(1), TestDb.Patient(2, lastName: "Hopper"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, new DateTime(2025, 1, 10)),
            TestDb.Admission(2, 1, new DateTime(2025, 5, 10)),
            TestDb.Admission(3, 2, new DateTime(2025, 6, 10)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissionsByPatient(1);

        Assert.Equal(
            new[] { 2, 1 },
            result.OkValue<List<Admission>>().Select(a => a.AdmissionId).ToArray());
    }

    [Fact]
    public async Task GetAdmissionCount_GroupsByPatientGroupAndTotalsThem()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, group: "DMC"),
            TestDb.Patient(2, group: "PJP", lastName: "Hopper"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, TestDb.MonthsAgo(0)),
            TestDb.Admission(2, 1, TestDb.MonthsAgo(0)),
            TestDb.Admission(3, 2, TestDb.MonthsAgo(0)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var payload = (await controller.GetAdmissionCount()).OkJson();

        Assert.Equal(3, payload.Int("total"));
        var byGroup = payload.GroupCounts();
        Assert.Equal(2, byGroup["DMC"]);
        Assert.Equal(1, byGroup["PJP"]);
    }

    [Fact]
    public async Task GetAdmissionCount_AppliesInsuranceClinicAndTypeFilters()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, insurance: "Aetna", clinic: "North"),
            TestDb.Patient(2, insurance: "Cigna", clinic: "South", lastName: "Hopper"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, TestDb.MonthsAgo(0), type: "ADM"),
            TestDb.Admission(2, 1, TestDb.MonthsAgo(0), type: "ER"),
            TestDb.Admission(3, 2, TestDb.MonthsAgo(0), type: "ADM"));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        Assert.Equal(2, (await controller.GetAdmissionCount(insurance: "Aetna")).OkJson().Int("total"));
        Assert.Equal(1, (await controller.GetAdmissionCount(clinic: "South")).OkJson().Int("total"));
        Assert.Equal(2, (await controller.GetAdmissionCount(admissionType: "ADM")).OkJson().Int("total"));
        Assert.Equal(
            1,
            (await controller.GetAdmissionCount(insurance: "Aetna", admissionType: "ER")).OkJson().Int("total"));
    }

    [Fact]
    public async Task GetAdmissionCount_LastMonthsExcludesOlderAdmissions()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, TestDb.MonthsAgo(0)),
            TestDb.Admission(2, 1, TestDb.MonthsAgo(1)),
            TestDb.Admission(3, 1, TestDb.MonthsAgo(6)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        // lastMonths = 3 covers the current month plus the two before it.
        var payload = (await controller.GetAdmissionCount(lastMonths: 3)).OkJson();

        Assert.Equal(2, payload.Int("total"));
    }

    [Fact]
    public async Task GetPendingPatientsCount_CountsDischargedButUnseenPatientsOnce()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, group: "DMC"),
            TestDb.Patient(2, group: "RGVAIMS", lastName: "Hopper"),
            TestDb.Patient(3, group: "DMC", lastName: "Turing"));
        var discharged = TestDb.MonthsAgo(0);
        context.Admissions.AddRange(
            // Pending: discharged, never seen - twice for the same patient, counted once.
            TestDb.Admission(1, 1, discharged, finalDischargeDate: discharged),
            TestDb.Admission(2, 1, discharged, finalDischargeDate: discharged),
            // Pending: a different group.
            TestDb.Admission(3, 2, discharged, finalDischargeDate: discharged),
            // Not pending: already seen.
            TestDb.Admission(4, 3, discharged, finalDischargeDate: discharged, dateSeen: discharged),
            // Not pending: no final discharge yet.
            TestDb.Admission(5, 3, discharged));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var payload = (await controller.GetPendingPatientsCount()).OkJson();

        Assert.Equal(2, payload.Int("total"));
        var byGroup = payload.GroupCounts();
        Assert.Equal(1, byGroup["DMC"]);
        Assert.Equal(1, byGroup["RGVAIMS"]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(13)]
    public async Task GetAdmissionCountByMonth_RejectsOutOfRangeLastMonths(int lastMonths)
    {
        using var context = TestDb.CreateContext();
        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissionCountByMonth(lastMonths: lastMonths);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetAdmissionCountByMonth_ReturnsOneEntryPerMonthIncludingEmptyOnes()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, group: "DMC"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, TestDb.MonthsAgo(0)),
            TestDb.Admission(2, 1, TestDb.MonthsAgo(2)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissionCountByMonth(lastMonths: 3);

        var months = result.OkJson().AsArray();
        Assert.Equal(3, months.Count);

        // Oldest first, with a zero-total month in the middle rather than a gap.
        Assert.Equal(1, months[0]!.Int("total"));
        Assert.Equal(0, months[1]!.Int("total"));
        Assert.Equal(1, months[2]!.Int("total"));

        Assert.Equal(
            $"{DateTime.Today.Year:D4}-{DateTime.Today.Month:D2}",
            months[2]!["month"]!.GetValue<string>());
    }

    [Fact]
    public async Task GetAdmissionCountByMonth_DefaultsToTwelveMonths()
    {
        using var context = TestDb.CreateContext();
        var controller = new AdmissionsController(context);

        var result = await controller.GetAdmissionCountByMonth(lastMonths: null);

        Assert.Equal(12, result.OkJson().AsArray().Count);
    }

    [Fact]
    public async Task AddAdmission_PersistsAdmissionAndFillsCalculatedFields()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var admission = new Admission
        {
            PatientID = 1,
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 10), // a Monday
            DateNotified = new DateTime(2025, 3, 10),
        };

        var result = await controller.AddAdmission(admission);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var saved = Assert.IsType<Admission>(created.Value);
        Assert.Equal("Monday", saved.DayOfWeekAdmitted);
        Assert.Equal("March", saved.MonthAdmitted);
        Assert.Equal("nurse@example.com", saved.LastEditedBy);
        Assert.NotNull(saved.LastEditedAt);
        Assert.Equal(1, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task AddAdmission_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser(null);

        var result = await controller.AddAdmission(TestDb.Admission(1, 1, new DateTime(2025, 3, 10)));

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(0, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task UpdateAdmission_RejectsMismatchedIdAndMissingAdmission()
    {
        using var context = TestDb.CreateContext();
        var controller = new AdmissionsController(context);
        var admission = TestDb.Admission(7, 1, new DateTime(2025, 1, 10));

        Assert.IsType<BadRequestObjectResult>(await controller.UpdateAdmission(8, admission));
        Assert.IsType<NotFoundResult>(await controller.UpdateAdmission(7, admission));
    }

    [Fact]
    public async Task UpdateAdmission_WritesEditableFieldsAndRecalculates()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10), type: "ADM"));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("doctor@example.com");
        var update = TestDb.Admission(1, 1, new DateTime(2025, 3, 10), type: "ER");
        update.SeenBy = "Dr. Ride";

        var result = await controller.UpdateAdmission(1, update);

        Assert.IsType<NoContentResult>(result);
        var saved = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        Assert.Equal("ER", saved.Type);
        Assert.Equal("Dr. Ride", saved.SeenBy);
        Assert.Equal("March", saved.MonthAdmitted);
        Assert.Equal("doctor@example.com", saved.LastEditedBy);
        Assert.NotNull(saved.LastEditedAt);
    }

    [Fact]
    public async Task UpdateAdmission_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10), type: "ADM"));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser(null);
        var update = TestDb.Admission(1, 1, new DateTime(2025, 3, 10), type: "ER");

        Assert.IsType<ForbidResult>(await controller.UpdateAdmission(1, update));

        var saved = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        Assert.Equal("ADM", saved.Type);
    }

    [Fact]
    public async Task DeleteAdmission_RemovesExistingAndReportsMissing()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        Assert.IsType<NoContentResult>(await controller.DeleteAdmission(1));
        Assert.Equal(0, await context.Admissions.CountAsync());
        Assert.IsType<NotFoundResult>(await controller.DeleteAdmission(1));
    }
}
