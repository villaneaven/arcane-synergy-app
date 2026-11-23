using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using arcane_synergy_app_backend.Services;
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
    public async Task GetAdmissions_FiltersByPatientGroup()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, group: "DMC"),
            TestDb.Patient(2, group: "PJP"));
        context.Admissions.AddRange(
            TestDb.Admission(1, 1, new DateTime(2025, 1, 10)),
            TestDb.Admission(2, 1, new DateTime(2025, 1, 11)),
            TestDb.Admission(3, 2, new DateTime(2025, 1, 12)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var dmc = (await controller.GetAdmissions(group: "DMC")).OkJson();
        Assert.Equal(2, dmc.Int("totalCount"));

        var pjp = (await controller.GetAdmissions(group: "PJP")).OkJson();
        Assert.Equal(1, pjp.Int("totalCount"));

        var all = (await controller.GetAdmissions()).OkJson();
        Assert.Equal(3, all.Int("totalCount"));
    }

    [Fact]
    public async Task GetAdmissions_FiltersByStatus()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        var current = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        var pending = TestDb.Admission(2, 1, new DateTime(2025, 1, 11));
        pending.DischargeDate = new DateTime(2025, 1, 15);
        var completed = TestDb.Admission(3, 1, new DateTime(2025, 1, 12));
        completed.DischargeDate = new DateTime(2025, 1, 16);
        completed.DateSeen = new DateTime(2025, 1, 18);
        foreach (var a in new[] { current, pending, completed })
            a.UpdateCalculatedFields();
        context.Admissions.AddRange(current, pending, completed);
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        Assert.Equal(1, (await controller.GetAdmissions(status: "Current")).OkJson().Int("totalCount"));
        Assert.Equal(1, (await controller.GetAdmissions(status: "Pending")).OkJson().Int("totalCount"));
        Assert.Equal(1, (await controller.GetAdmissions(status: "Completed")).OkJson().Int("totalCount"));
        Assert.Equal(3, (await controller.GetAdmissions()).OkJson().Int("totalCount"));
    }

    [Fact]
    public async Task GetAdmissions_FiltersByFacilityType()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        var hospital1 = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        hospital1.FacilityType = "HOSPITAL";
        var hospital2 = TestDb.Admission(2, 1, new DateTime(2025, 1, 11));
        hospital2.FacilityType = "HOSPITAL";
        var snf = TestDb.Admission(3, 1, new DateTime(2025, 1, 12));
        snf.FacilityType = "SNF";
        context.Admissions.AddRange(hospital1, hospital2, snf);
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        Assert.Equal(2, (await controller.GetAdmissions(facilityType: "HOSPITAL")).OkJson().Int("totalCount"));
        Assert.Equal(1, (await controller.GetAdmissions(facilityType: "SNF")).OkJson().Int("totalCount"));
        Assert.Equal(3, (await controller.GetAdmissions()).OkJson().Int("totalCount"));
    }

    [Fact]
    public async Task ReadEndpoints_ReturnPatientEngagementCalculatedForRequestedDay()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.AddRange(
            // Not discharged -> null.
            TestDb.Admission(1, 1, new DateTime(2025, 3, 1)),
            // Discharged Mar 10, not seen -> today - discharge.
            TestDb.Admission(2, 1, new DateTime(2025, 3, 2), dischargeDate: new DateTime(2025, 3, 10)),
            // Discharged Mar 10, seen Mar 13 -> 3, regardless of today.
            TestDb.Admission(3, 1, new DateTime(2025, 3, 3),
                dischargeDate: new DateTime(2025, 3, 10), dateSeen: new DateTime(2025, 3, 13)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);
        var today = new DateOnly(2025, 3, 20);

        int? EngagementFor(IEnumerable<Admission> admissions, int id) =>
            admissions.Single(a => a.AdmissionId == id).PatientEngagement;

        // List endpoint (anonymous payload -> check via JSON).
        var list = (await controller.GetAdmissions(today: today)).OkJson().Array("items");
        int? ListValue(int id) => list
            .Single(item => item!["AdmissionId"]!.GetValue<int>() == id)!["PatientEngagement"]?
            .GetValue<int>();
        Assert.Null(ListValue(1));
        Assert.Equal(10, ListValue(2));
        Assert.Equal(3, ListValue(3));

        // Export endpoint.
        var exported = (await controller.GetAdmissionsForExport(today: today)).OkValue<List<Admission>>();
        Assert.Null(EngagementFor(exported, 1));
        Assert.Equal(10, EngagementFor(exported, 2));
        Assert.Equal(3, EngagementFor(exported, 3));

        // Single admission and by-patient endpoints.
        var single = (await controller.GetAdmission(2, today)).OkValue<Admission>();
        Assert.Equal(10, single.PatientEngagement);

        var byPatient = (await controller.GetAdmissionsByPatient(1, today)).OkValue<List<Admission>>();
        Assert.Equal(10, EngagementFor(byPatient, 2));

        // A later day moves the unseen admission forward but not the seen one.
        var nextDay = (await controller.GetAdmissionsForExport(today: today.AddDays(1))).OkValue<List<Admission>>();
        Assert.Equal(11, EngagementFor(nextDay, 2));
        Assert.Equal(3, EngagementFor(nextDay, 3));
    }

    [Fact]
    public async Task ReadEndpoints_DefaultPatientEngagementToClinicToday()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        var discharge = ClinicTime.Today.AddDays(-5).ToDateTime(TimeOnly.MinValue);
        context.Admissions.Add(TestDb.Admission(1, 1, discharge.AddDays(-2), dischargeDate: discharge));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var single = (await controller.GetAdmission(1)).OkValue<Admission>();
        Assert.Equal(5, single.PatientEngagement);
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
    public async Task AddAdmission_RejectsDateSeenWithoutDischargeDate()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var admission = TestDb.Admission(0, 1, new DateTime(2025, 3, 10),
            dateSeen: new DateTime(2025, 3, 12));

        var result = await controller.AddAdmission(admission);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Date Seen requires a Discharge Date.", badRequest.Value);
        Assert.Equal(0, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task AddAdmission_RejectsDateSeenBeforeDischargeDate()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var admission = TestDb.Admission(0, 1, new DateTime(2025, 3, 10),
            dischargeDate: new DateTime(2025, 3, 15),
            dateSeen: new DateTime(2025, 3, 14));

        var result = await controller.AddAdmission(admission);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Date Seen must be on or after the Discharge Date.", badRequest.Value);
        Assert.Equal(0, await context.Admissions.CountAsync());
    }

    [Theory]
    [InlineData(15)] // same day as discharge
    [InlineData(20)] // after discharge
    public async Task AddAdmission_AcceptsDateSeenOnOrAfterDischargeDate(int seenDay)
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var admission = TestDb.Admission(0, 1, new DateTime(2025, 3, 10),
            dischargeDate: new DateTime(2025, 3, 15),
            dateSeen: new DateTime(2025, 3, seenDay));

        var result = await controller.AddAdmission(admission);

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(1, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task AddAdmission_RejectsDischargeDateAfterClinicToday()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var tomorrow = ClinicTime.Today.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var admission = TestDb.Admission(0, 1, tomorrow.AddDays(-3), dischargeDate: tomorrow);

        var result = await controller.AddAdmission(admission);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Discharge Date must be today or earlier.", badRequest.Value);
        Assert.Equal(0, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task AddAdmission_AcceptsDischargeDateOfClinicToday()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var today = ClinicTime.Today.ToDateTime(TimeOnly.MinValue);
        var admission = TestDb.Admission(0, 1, today.AddDays(-3), dischargeDate: today);

        Assert.IsType<CreatedAtActionResult>(await controller.AddAdmission(admission));
    }

    [Fact]
    public async Task UpdateAdmission_RejectsFutureDischargeDateAndLeavesRecordUnchanged()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("doctor@example.com");
        var tomorrow = ClinicTime.Today.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var future = TestDb.Admission(1, 1, new DateTime(2025, 1, 10), dischargeDate: tomorrow);

        var badRequest = Assert.IsType<BadRequestObjectResult>(await controller.UpdateAdmission(1, future));
        Assert.Equal("Discharge Date must be today or earlier.", badRequest.Value);

        var saved = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        Assert.Equal(new DateTime(2025, 1, 15), saved.DischargeDate);
    }

    [Fact]
    public async Task UpdateAdmission_RejectsInvalidDateSeenAndLeavesRecordUnchanged()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("doctor@example.com");

        // Seen before discharge.
        var seenEarly = TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15),
            dateSeen: new DateTime(2025, 1, 14));
        Assert.IsType<BadRequestObjectResult>(await controller.UpdateAdmission(1, seenEarly));

        // Discharge Date cleared while Date Seen is set.
        var noDischarge = TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dateSeen: new DateTime(2025, 1, 16));
        Assert.IsType<BadRequestObjectResult>(await controller.UpdateAdmission(1, noDischarge));

        var saved = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        Assert.Null(saved.DateSeen);
        Assert.Equal(new DateTime(2025, 1, 15), saved.DischargeDate);
    }

    [Fact]
    public async Task UpdateAdmission_AcceptsDateSeenOnOrAfterDischargeDate()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("doctor@example.com");
        var update = TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15),
            dateSeen: new DateTime(2025, 1, 15));

        Assert.IsType<NoContentResult>(await controller.UpdateAdmission(1, update));

        var saved = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        Assert.Equal(new DateTime(2025, 1, 15), saved.DateSeen);
        Assert.Equal("Completed", saved.Status);
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

        var controller = new AdmissionsController(context).WithUser();

        Assert.IsType<NoContentResult>(await controller.DeleteAdmission(1));
        Assert.Equal(0, await context.Admissions.CountAsync());
        Assert.IsType<NotFoundResult>(await controller.DeleteAdmission(1));
    }

    [Theory]
    [InlineData(false, false, "Current")]
    [InlineData(true, false, "Pending")]
    [InlineData(true, true, "Completed")]
    public async Task AddAdmission_StoresDerivedStatus(bool discharged, bool seen, string expected)
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var admission = TestDb.Admission(0, 1, new DateTime(2025, 3, 10),
            dischargeDate: discharged ? new DateTime(2025, 3, 15) : null,
            dateSeen: seen ? new DateTime(2025, 3, 16) : null);
        admission.Status = null; // Whatever the client sends is ignored.

        Assert.IsType<CreatedAtActionResult>(await controller.AddAdmission(admission));

        var saved = await context.Admissions.AsNoTracking().SingleAsync();
        Assert.Equal(expected, saved.Status);
    }

    [Fact]
    public async Task AddAdmission_ReturnsPatientEngagementCalculatedForClinicToday()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var discharge = ClinicTime.Today.AddDays(-4).ToDateTime(TimeOnly.MinValue);
        var admission = TestDb.Admission(0, 1, discharge.AddDays(-2), dischargeDate: discharge);
        admission.PatientEngagement = 999; // Client-supplied value is ignored.

        var created = Assert.IsType<CreatedAtActionResult>(await controller.AddAdmission(admission));

        Assert.Equal(4, Assert.IsType<Admission>(created.Value).PatientEngagement);
    }

    [Fact]
    public async Task UpdateAdmission_RecalculatesStatusWhenDatesAreCleared()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15),
            dateSeen: new DateTime(2025, 1, 16)));
        await context.SaveChangesAsync();
        Assert.Equal("Completed", (await context.Admissions.AsNoTracking().SingleAsync()).Status);

        var controller = new AdmissionsController(context).WithUser("doctor@example.com");

        // Clearing Date Seen: Completed -> Pending.
        var unseen = TestDb.Admission(1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 15));
        Assert.IsType<NoContentResult>(await controller.UpdateAdmission(1, unseen));
        Assert.Equal("Pending", (await context.Admissions.AsNoTracking().SingleAsync()).Status);

        // Clearing Discharge Date too: Pending -> Current.
        var readmitted = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        Assert.IsType<NoContentResult>(await controller.UpdateAdmission(1, readmitted));
        Assert.Equal("Current", (await context.Admissions.AsNoTracking().SingleAsync()).Status);
    }

    [Fact]
    public async Task UpdateAdmission_ValidatesDateSeenBeforeLookingUpTheAdmission()
    {
        using var context = TestDb.CreateContext();
        var controller = new AdmissionsController(context).WithUser("doctor@example.com");

        // Invalid payload for an id that doesn't exist: the validation error wins.
        var invalid = TestDb.Admission(42, 1, new DateTime(2025, 1, 10),
            dateSeen: new DateTime(2025, 1, 16));
        Assert.IsType<BadRequestObjectResult>(await controller.UpdateAdmission(42, invalid));

        // A valid payload for the same id is a plain 404.
        var valid = TestDb.Admission(42, 1, new DateTime(2025, 1, 10));
        Assert.IsType<NotFoundResult>(await controller.UpdateAdmission(42, valid));
    }

    [Fact]
    public async Task ListAndExport_ApplyGroupStatusAndFacilityTypeFiltersTogether()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, group: "DMC"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper", group: "Other"));

        Admission Make(int id, int patientId, string facilityType, bool discharged)
        {
            var a = TestDb.Admission(id, patientId, new DateTime(2025, 1, id),
                dischargeDate: discharged ? new DateTime(2025, 2, 1) : null);
            a.FacilityType = facilityType;
            return a;
        }

        context.Admissions.AddRange(
            Make(1, 1, "HOSPITAL", discharged: true),   // match
            Make(2, 1, "HOSPITAL", discharged: true),   // match
            Make(3, 1, "HOSPITAL", discharged: true),   // match
            Make(4, 1, "HOSPITAL", discharged: false),  // wrong status
            Make(5, 1, "SNF", discharged: true),        // wrong facility type
            Make(6, 2, "HOSPITAL", discharged: true));  // wrong group
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        var page = (await controller.GetAdmissions(
            page: 2, pageSize: 2, group: "DMC", status: "Pending", facilityType: "HOSPITAL",
            sortBy: "admissionDate", sortDir: "asc")).OkJson();
        Assert.Equal(3, page.Int("totalCount"));
        var pageIds = page.Array("items").Select(i => i!["AdmissionId"]!.GetValue<int>());
        Assert.Equal(new[] { 3 }, pageIds);

        var exported = (await controller.GetAdmissionsForExport(
            group: "DMC", status: "Pending", facilityType: "HOSPITAL",
            sortBy: "admissionDate", sortDir: "asc")).OkValue<List<Admission>>();
        Assert.Equal(new[] { 1, 2, 3 }, exported.Select(a => a.AdmissionId));
    }

    [Fact]
    public async Task Export_FiltersByStatusAndFacilityType()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        var current = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        current.FacilityType = "HOSPITAL";
        var pending = TestDb.Admission(2, 1, new DateTime(2025, 1, 11), dischargeDate: new DateTime(2025, 1, 15));
        pending.FacilityType = "SNF";
        var completed = TestDb.Admission(3, 1, new DateTime(2025, 1, 12),
            dischargeDate: new DateTime(2025, 1, 16), dateSeen: new DateTime(2025, 1, 18));
        completed.FacilityType = "SNF";
        context.Admissions.AddRange(current, pending, completed);
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        async Task<int[]> Ids(string? status = null, string? facilityType = null) =>
            (await controller.GetAdmissionsForExport(status: status, facilityType: facilityType))
                .OkValue<List<Admission>>().Select(a => a.AdmissionId).OrderBy(id => id).ToArray();

        Assert.Equal(new[] { 2 }, await Ids(status: "Pending"));
        Assert.Equal(new[] { 3 }, await Ids(status: "Completed"));
        Assert.Equal(new[] { 2, 3 }, await Ids(facilityType: "SNF"));
        Assert.Equal(new[] { 1 }, await Ids(facilityType: "HOSPITAL"));
        Assert.Equal(new[] { 1, 2, 3 }, await Ids());
    }

    [Fact]
    public async Task GetAdmissions_StatusFilterExcludesRowsWithoutStatus()
    {
        // Rows saved before Status was derived have NULL until BackfillAdmissionStatus runs.
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        var legacy = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        legacy.Status = null;
        context.Admissions.AddRange(legacy, TestDb.Admission(2, 1, new DateTime(2025, 1, 11)));
        await context.SaveChangesAsync();

        var controller = new AdmissionsController(context);

        Assert.Equal(1, (await controller.GetAdmissions(status: "Current")).OkJson().Int("totalCount"));
        Assert.Equal(2, (await controller.GetAdmissions()).OkJson().Int("totalCount"));
    }
    
    [Fact]
    public async Task AddAdmission_TrimsNotesWithoutReformattingTheirContents()
    {
        using var context = await SeededPatientAsync();
        var controller = new AdmissionsController(context).WithUser();

        var admission = NewAdmission();
        admission.Notes = "  Needs follow-up.\n  Call the daughter.  ";

        Assert.IsType<CreatedAtActionResult>(await controller.AddAdmission(admission));

        Assert.Equal(
            "Needs follow-up.\n  Call the daughter.",
            (await SingleAdmissionAsync(context)).Notes);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t\r\n ")]
    public async Task AddAdmission_StoresBlankNotesAsNull(string? notes)
    {
        using var context = await SeededPatientAsync();
        var controller = new AdmissionsController(context).WithUser();

        var admission = NewAdmission();
        admission.Notes = notes;

        await controller.AddAdmission(admission);

        Assert.Null((await SingleAdmissionAsync(context)).Notes);
    }

    [Fact]
    public async Task UpdateAdmission_TrimsNotesWithoutReformattingTheirContents()
    {
        using var context = await SeededAdmissionAsync();
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate();
        update.Notes = "  Discharged home.\n  Home health arranged.  ";

        Assert.IsType<NoContentResult>(await controller.UpdateAdmission(1, update));

        Assert.Equal(
            "Discharged home.\n  Home health arranged.",
            (await ReloadAsync(context)).Notes);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdateAdmission_ClearsStoredNotesWhenGivenBlank(string? notes)
    {
        using var context = await SeededAdmissionAsync(
            configure: admission => admission.Notes = "Family prefers morning calls.");
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate();
        update.Notes = notes;

        await controller.UpdateAdmission(1, update);

        Assert.Null((await ReloadAsync(context)).Notes);
    }

    // ------------------------------------------------------------------
    // Audit stamps
    // ------------------------------------------------------------------

    [Fact]
    public async Task AddAdmission_StampsAuditFieldsOverClientSuppliedValues()
    {
        using var context = await SeededPatientAsync();
        var controller = new AdmissionsController(context).WithUser("nurse@example.com");

        var stale = new DateTime(2001, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var admission = NewAdmission();
        admission.LastEditedBy = "someone.else@example.com";
        admission.LastEditedAt = stale;

        await controller.AddAdmission(admission);

        var saved = await SingleAdmissionAsync(context);
        Assert.Equal("nurse@example.com", saved.LastEditedBy);
        Assert.NotEqual(stale, saved.LastEditedAt);
    }

    [Fact]
    public async Task UpdateAdmission_StampsAuditFieldsOverClientValuesAndMovesTheTimestampForward()
    {
        var stale = new DateTime(2025, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        using var context = await SeededAdmissionAsync(configure: admission =>
        {
            admission.LastEditedBy = "first.editor@example.com";
            admission.LastEditedAt = stale;
        });
        var controller = new AdmissionsController(context).WithUser("doctor@example.com");

        var update = NewUpdate();
        update.LastEditedBy = "someone.else@example.com";
        update.LastEditedAt = stale;

        await controller.UpdateAdmission(1, update);

        var saved = await ReloadAsync(context);
        Assert.Equal("doctor@example.com", saved.LastEditedBy);
        Assert.True(
            saved.LastEditedAt > stale,
            "every accepted write should move the edit timestamp forward");
    }

    [Fact]
    public async Task AddAdmission_StampsTheAuditTimestampInUtcRatherThanHostLocalTime()
    {
        using var context = await SeededPatientAsync();
        var controller = new AdmissionsController(context).WithUser();

        var before = DateTime.UtcNow;
        await controller.AddAdmission(NewAdmission());
        var after = DateTime.UtcNow;

        var saved = await SingleAdmissionAsync(context);
        Assert.NotNull(saved.LastEditedAt);
        Assert.InRange(saved.LastEditedAt!.Value, before, after);
        Assert.Equal(DateTimeKind.Utc, saved.LastEditedAt!.Value.Kind);
    }

    [Fact]
    public async Task DeleteAdmission_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = await SeededAdmissionAsync(contextUser: null);
        await ClearHistoryAsync(context);

        var controller = new AdmissionsController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.DeleteAdmission(1));

        Assert.Equal(1, await context.Admissions.CountAsync());
        Assert.Empty(await context.EditHistory.ToListAsync());
    }

    [Fact]
    public async Task DeleteAdmission_ChecksTheUserBeforeLookingTheAdmissionUp()
    {
        using var context = await SeededAdmissionAsync(contextUser: null);
        var controller = new AdmissionsController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.DeleteAdmission(404));
    }

    [Fact]
    public async Task DeleteAdmission_AttributesTheRemovalToTheSignedInUser()
    {
        using var context = await SeededAdmissionAsync(contextUser: "nurse@example.com");
        await ClearHistoryAsync(context);

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");

        Assert.IsType<NoContentResult>(await controller.DeleteAdmission(1));

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Admission), entry.EntityType);
        Assert.Equal(EditHistory.ChangeTypes.Delete, entry.ChangeType);
        Assert.Equal("1", entry.EntityId);
        Assert.Equal("nurse@example.com", entry.ChangedBy);
    }

    // ------------------------------------------------------------------
    // Fields the PUT deliberately does not copy from the request body
    // ------------------------------------------------------------------

    [Fact]
    public async Task UpdateAdmission_IgnoresThePatientIdInTheRequestBody()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(TestDb.Patient(1), TestDb.Patient(2, lastName: "Hopper"));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var controller = new AdmissionsController(context).WithUser();
        var update = NewUpdate();
        update.PatientID = 2;

        Assert.IsType<NoContentResult>(await controller.UpdateAdmission(1, update));

        Assert.Equal(1, (await ReloadAsync(context)).PatientID);
    }

    [Fact]
    public async Task UpdateAdmission_LeavesTransferBookkeepingFieldsAlone()
    {
        var finalDischarge = new DateTime(2025, 1, 15);
        using var context = await SeededAdmissionAsync(configure: admission =>
        {
            admission.CountOfTransfers = 3;
            admission.FinalDischargeDate = finalDischarge;
        });
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate();
        update.CountOfTransfers = 99;
        update.FinalDischargeDate = new DateTime(2030, 1, 1);

        await controller.UpdateAdmission(1, update);

        var saved = await ReloadAsync(context);
        Assert.Equal(3, saved.CountOfTransfers);
        Assert.Equal(finalDischarge, saved.FinalDischargeDate);
    }

    [Fact]
    public async Task UpdateAdmission_LeavesFieldsItDoesNotOwnAlone()
    {
        using var context = await SeededAdmissionAsync(configure: admission =>
        {
            admission.TotalERVisits = 2;
            admission.TotalADMVisits = 4;
            admission.TCMDueDate = new DateTime(2025, 1, 24);
            admission.NextAdmissionDate = new DateTime(2025, 2, 1);
        });
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate();
        update.Status = "Done";
        update.TotalERVisits = 100;
        update.TotalADMVisits = 100;
        update.TCMDueDate = new DateTime(2030, 1, 1);
        update.NextAdmissionDate = new DateTime(2030, 1, 1);

        await controller.UpdateAdmission(1, update);

        var saved = await ReloadAsync(context);
        Assert.Equal(Admission.StatusCurrent, saved.Status);
        Assert.Equal(2, saved.TotalERVisits);
        Assert.Equal(4, saved.TotalADMVisits);
        Assert.Equal(new DateTime(2025, 1, 24), saved.TCMDueDate);
        Assert.Equal(new DateTime(2025, 2, 1), saved.NextAdmissionDate);
    }

    [Fact]
    public async Task UpdateAdmission_RecomputesDayAndMonthFromTheNewAdmissionDate()
    {
        using var context = await SeededAdmissionAsync();
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate(admissionDate: new DateTime(2025, 7, 4)); // a Friday
        update.DayOfWeekAdmitted = "Caturday";
        update.MonthAdmitted = "Smarch";

        await controller.UpdateAdmission(1, update);

        var saved = await ReloadAsync(context);
        Assert.Equal("Friday", saved.DayOfWeekAdmitted);
        Assert.Equal("July", saved.MonthAdmitted);
    }

    [Fact]
    public async Task UpdateAdmission_RecomputesReadmissionFlagFromTheStoredDates()
    {
        using var context = await SeededAdmissionAsync(configure: admission =>
        {
            admission.FinalDischargeDate = new DateTime(2025, 1, 15);
            admission.NextAdmissionDate = new DateTime(2025, 2, 1); // 17 days later
            admission.UpdateCalculatedFields();
        });
        var controller = new AdmissionsController(context).WithUser();

        var update = NewUpdate();
        update.ReadmissionFlag = false;
        update.FinalDischargeDate = null;
        update.NextAdmissionDate = null;

        await controller.UpdateAdmission(1, update);

        Assert.True((await ReloadAsync(context)).ReadmissionFlag);
    }

    [Fact]
    public async Task AddAdmission_TrustsBookkeepingFieldsFromTheRequestBody()
    {
        using var context = await SeededPatientAsync();
        var controller = new AdmissionsController(context).WithUser();

        var admission = NewAdmission();
        admission.CountOfTransfers = 5;
        admission.FinalDischargeDate = new DateTime(2025, 1, 20);
        admission.Status = "Done";

        await controller.AddAdmission(admission);

        var saved = await SingleAdmissionAsync(context);
        Assert.Equal(5, saved.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), saved.FinalDischargeDate);
        Assert.Equal(Admission.StatusCurrent, saved.Status);
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private static async Task<ArcaneSynergyContext> SeededPatientAsync(
        string? contextUser = TestDb.DefaultUserName)
    {
        var context = TestDb.CreateContext(contextUser);
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        return context;
    }

    /// <summary>
    /// Patient 1 with admission 1 already stored, and the change tracker
    /// cleared so the controller reloads the row the way a real request would
    /// rather than finding the seeded instance.
    /// </summary>
    private static async Task<ArcaneSynergyContext> SeededAdmissionAsync(
        string? contextUser = TestDb.DefaultUserName,
        Action<Admission>? configure = null)
    {
        var context = await SeededPatientAsync(contextUser);

        var admission = TestDb.Admission(1, 1, new DateTime(2025, 1, 10));
        configure?.Invoke(admission);

        context.Admissions.Add(admission);
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        return context;
    }

    /// <summary>A POST body carrying only the fields a caller gets to set.</summary>
    private static Admission NewAdmission(DateTime? admissionDate = null)
    {
        var date = admissionDate ?? new DateTime(2025, 3, 10);
        return new Admission
        {
            PatientID = 1,
            Type = "ADM",
            AdmissionDate = date,
            DateNotified = date,
        };
    }

    /// <summary>The same body addressed at admission 1, for the PUT.</summary>
    private static Admission NewUpdate(DateTime? admissionDate = null)
    {
        var update = NewAdmission(admissionDate);
        update.AdmissionId = 1;
        return update;
    }

    /// <summary>
    /// Drops the history the seeding itself produced, so a test asserts only on
    /// the entries its own call created.
    /// </summary>
    private static async Task ClearHistoryAsync(ArcaneSynergyContext context)
    {
        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();
    }

    private static async Task<Admission> ReloadAsync(ArcaneSynergyContext context, int id = 1) =>
        await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == id);

    private static async Task<Admission> SingleAdmissionAsync(ArcaneSynergyContext context) =>
        await context.Admissions.AsNoTracking().SingleAsync();
}
