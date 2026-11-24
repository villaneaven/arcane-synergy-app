using System.Text.Json.Nodes;
using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

public class PatientsControllerTests
{
    [Fact]
    public async Task GetPatients_ClampsPagingAndDefaultsToNameOrder()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Ada", lastName: "Turing"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper"),
            TestDb.Patient(3, firstName: "Alan", lastName: "Hopper"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var payload = (await controller.GetPatients(page: 0, pageSize: 999)).OkJson();

        Assert.Equal(1, payload.Int("page"));
        Assert.Equal(100, payload.Int("pageSize"));
        Assert.Equal(3, payload.Int("totalCount"));

        // Default sort is last name, then first name.
        Assert.Equal(
            new[] { 3, 2, 1 },
            payload.Array("items").Select(p => p!.Int("PatientID")).ToArray());
    }

    [Fact]
    public async Task GetPatients_SearchMatchesFirstLastFullNameOrMrnPrefix()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace", mrn: "MRN-1"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper", mrn: "MRN-2"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Equal(1, (await controller.GetPatients(search: "Ada")).OkJson().Int("totalCount"));
        Assert.Equal(1, (await controller.GetPatients(search: "Hopper")).OkJson().Int("totalCount"));
        Assert.Equal(1, (await controller.GetPatients(search: "Lovelace, Ada")).OkJson().Int("totalCount"));
        Assert.Equal(2, (await controller.GetPatients(search: "MRN-")).OkJson().Int("totalCount"));
        Assert.Equal(0, (await controller.GetPatients(search: "nobody")).OkJson().Int("totalCount"));
    }

    [Fact]
    public async Task GetPatients_FiltersByGroupInsuranceAndClinic()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, group: "DMC", insurance: "AETNA", clinic: "EMC"),
            TestDb.Patient(2, group: "DMC", insurance: "HUMANA", clinic: "VFC"),
            TestDb.Patient(3, group: "PJP", insurance: "AETNA", clinic: "EMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        int[] Ids(JsonNode payload) =>
            payload.Array("items").Select(p => p!.Int("PatientID")).OrderBy(id => id).ToArray();

        Assert.Equal(new[] { 1, 2 }, Ids((await controller.GetPatients(group: "DMC")).OkJson()));
        Assert.Equal(new[] { 1, 3 }, Ids((await controller.GetPatients(insurance: "AETNA")).OkJson()));
        Assert.Equal(new[] { 2 }, Ids((await controller.GetPatients(clinic: "VFC")).OkJson()));

        // Filters combine.
        Assert.Equal(new[] { 1 }, Ids((await controller.GetPatients(group: "DMC", insurance: "AETNA")).OkJson()));
        Assert.Equal(0, (await controller.GetPatients(group: "PJP", clinic: "VFC")).OkJson().Int("totalCount"));

        // Blank values are ignored.
        Assert.Equal(3, (await controller.GetPatients(group: " ", insurance: "", clinic: null)).OkJson().Int("totalCount"));
    }

    [Fact]
    public async Task GetPatients_RejectsPageOffsetBeyondIntRange()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);

        var result = await controller.GetPatients(page: int.MaxValue, pageSize: 100);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SearchPatients_ReturnsEmptyForBlankQueryAndCapsAtTen()
    {
        using var context = TestDb.CreateContext();
        for (var i = 1; i <= 15; i++)
        {
            context.Patients.Add(TestDb.Patient(i, firstName: $"Pat{i:D2}", lastName: "Shared"));
        }
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Empty((await controller.SearchPatients("   ")).OkJson().AsArray());
        Assert.Equal(10, (await controller.SearchPatients("Shared")).OkJson().AsArray().Count);
    }

    [Fact]
    public async Task AddPatient_SetsFullNameAndReturnsCreated()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);
        var patient = new Patient
        {
            FirstName = "Ada",
            LastName = "Lovelace",
            DOB = new DateTime(1815, 12, 10),
            Group = "DMC",
            Insurance = "Aetna",
            MRN = "MRN-1",
        };

        var result = await controller.AddPatient(patient);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var saved = Assert.IsType<Patient>(created.Value);
        Assert.Equal("Lovelace, Ada", saved.FullName);
        Assert.Equal(1, await context.Patients.CountAsync());
    }

    [Fact]
    public async Task AddPatient_RejectsDuplicateMrnWithinSameGroup()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, mrn: "MRN-1", group: "DMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);
        var duplicate = new Patient
        {
            FirstName = "Grace",
            LastName = "Hopper",
            DOB = new DateTime(1906, 12, 9),
            Group = "DMC",
            Insurance = "Cigna",
            MRN = "MRN-1",
        };

        Assert.IsType<ConflictObjectResult>(await controller.AddPatient(duplicate));

        // The same MRN in another group is allowed.
        duplicate.Group = "PJP";
        Assert.IsType<CreatedAtActionResult>(await controller.AddPatient(duplicate));
    }

    [Fact]
    public async Task UpdatePatient_RejectsMismatchedIdAndMissingPatient()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);
        var patient = TestDb.Patient(5);

        Assert.IsType<BadRequestObjectResult>(await controller.UpdatePatient(6, patient));
        Assert.IsType<NotFoundResult>(await controller.UpdatePatient(5, patient));
    }

    [Fact]
    public async Task UpdatePatient_RejectsMrnTakenByAnotherPatientInTheSameGroup()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, mrn: "MRN-1", group: "DMC"),
            TestDb.Patient(2, mrn: "MRN-2", group: "DMC", lastName: "Hopper"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);
        var update = TestDb.Patient(2, mrn: "MRN-1", group: "DMC", lastName: "Hopper");

        Assert.IsType<ConflictObjectResult>(await controller.UpdatePatient(2, update));
    }

    [Fact]
    public async Task UpdatePatient_KeepingItsOwnMrnIsNotTreatedAsConflict()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace", mrn: "MRN-1"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);
        var update = TestDb.Patient(1, firstName: "Ada", lastName: "Byron", mrn: "MRN-1");

        Assert.IsType<NoContentResult>(await controller.UpdatePatient(1, update));

        var saved = await context.Patients.AsNoTracking().FirstAsync(p => p.PatientID == 1);
        Assert.Equal("Byron, Ada", saved.FullName);
    }

    [Fact]
    public async Task DeletePatient_RemovesExistingAndReportsMissing()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.IsType<NoContentResult>(await controller.DeletePatient(1));
        Assert.Equal(0, await context.Patients.CountAsync());
        Assert.IsType<NotFoundResult>(await controller.DeletePatient(1));
    }

    // ---------- get by id ----------

    [Fact]
    public async Task GetPatient_ReturnsThePatientOrNotFound()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(7, firstName: "Grace", lastName: "Hopper", mrn: "MRN-7"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var patient = (await controller.GetPatient(7)).OkValue<Patient>();
        Assert.Equal("Hopper, Grace", patient.FullName);
        Assert.Equal("MRN-7", patient.MRN);

        Assert.IsType<NotFoundResult>(await controller.GetPatient(404));
    }

    // ---------- list sorting ----------

    [Theory]
    [InlineData("firstName")]
    [InlineData("fullName")]
    [InlineData("dob")]
    [InlineData("mrn")]
    [InlineData("group")]
    [InlineData("insurance")]
    [InlineData("pcp")]
    [InlineData("clinic")]
    public async Task GetPatients_SortsByRequestedColumnAndDirection(string sortBy)
    {
        using var context = TestDb.CreateContext();

        context.Patients.AddRange(
            SortablePatient(1, "C"),
            SortablePatient(2, "A"),
            SortablePatient(3, "B"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Equal(new[] { 2, 3, 1 }, PatientIds((await controller.GetPatients(sortBy: sortBy)).OkJson()));
        Assert.Equal(
            new[] { 1, 3, 2 },
            PatientIds((await controller.GetPatients(sortBy: sortBy, sortDir: "desc")).OkJson()));
    }

    [Fact]
    public async Task GetPatients_MatchesSortKeysAndDirectionCaseInsensitively()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(SortablePatient(1, "C"), SortablePatient(2, "A"), SortablePatient(3, "B"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var payload = (await controller.GetPatients(sortBy: "MRN", sortDir: "DESC")).OkJson();

        Assert.Equal(new[] { 1, 3, 2 }, PatientIds(payload));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("sideways")]
    public async Task GetPatients_TreatsAnythingOtherThanDescAsAscending(string? sortDir)
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(SortablePatient(1, "C"), SortablePatient(2, "A"), SortablePatient(3, "B"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var payload = (await controller.GetPatients(sortBy: "mrn", sortDir: sortDir)).OkJson();

        Assert.Equal(new[] { 2, 3, 1 }, PatientIds(payload));
    }

    [Fact]
    public async Task GetPatients_UnknownSortColumnFallsBackToNameOrderInTheRequestedDirection()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Ada", lastName: "Turing"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper"),
            TestDb.Patient(3, firstName: "Alan", lastName: "Hopper"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var payload = (await controller.GetPatients(sortBy: "shoeSize", sortDir: "desc")).OkJson();

        Assert.Equal(new[] { 1, 2, 3 }, PatientIds(payload));
    }

    [Fact]
    public async Task GetPatients_BreaksTiesByPatientId()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(3, group: "DMC"),
            TestDb.Patient(1, group: "DMC"),
            TestDb.Patient(2, group: "DMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Equal(
            new[] { 1, 2, 3 },
            PatientIds((await controller.GetPatients(sortBy: "group", sortDir: "desc")).OkJson()));
    }

    [Fact]
    public async Task GetPatients_PagesThroughResultsAndReportsTotalCount()
    {
        using var context = TestDb.CreateContext();
        for (var i = 1; i <= 5; i++)
        {
            context.Patients.Add(TestDb.Patient(i, lastName: $"Patient{i}"));
        }
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var payload = (await controller.GetPatients(page: 2, pageSize: 2)).OkJson();

        Assert.Equal(5, payload.Int("totalCount"));
        Assert.Equal(2, payload.Int("page"));
        Assert.Equal(new[] { 3, 4 }, PatientIds(payload));
    }

    // ---------- list search ----------

    [Fact]
    public async Task GetPatients_SearchMatchesByPrefixOnlyAndIgnoresSurroundingWhitespace()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace", mrn: "MRN-100"),
            TestDb.Patient(2, firstName: "Grace", lastName: "Hopper", mrn: "XMRN-200"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Equal(new[] { 1 }, PatientIds((await controller.GetPatients(search: "  Love  ")).OkJson()));
        Assert.Empty(PatientIds((await controller.GetPatients(search: "lace")).OkJson()));
        Assert.Equal(new[] { 1 }, PatientIds((await controller.GetPatients(search: "MRN-")).OkJson()));
    }

    [Fact]
    public async Task GetPatients_BlankSearchReturnsEveryPatient()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(TestDb.Patient(1), TestDb.Patient(2));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.Equal(2, (await controller.GetPatients(search: "   ")).OkJson().Int("totalCount"));
    }

    // ---------- quick search ----------

    [Fact]
    public async Task SearchPatients_ReturnsOnlyTheLookupFieldsInNameOrder()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, firstName: "Grace", lastName: "Hopper", mrn: "MRN-1", clinic: "Main"),
            TestDb.Patient(2, firstName: "Alan", lastName: "Hopper", mrn: "MRN-2", clinic: "Main"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        var results = (await controller.SearchPatients("  Hop ")).OkJson().AsArray();

        Assert.Equal(new[] { 2, 1 }, results.Select(r => r!.Int("PatientID")).ToArray());

        var first = results[0]!.AsObject();
        Assert.Equal(
            new[] { "DOB", "FullName", "MRN", "PatientID" },
            first.Select(p => p.Key).OrderBy(k => k, StringComparer.Ordinal).ToArray());
        Assert.Equal("Hopper, Alan", first["FullName"]!.GetValue<string>());
    }

    // ---------- add ----------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AddPatient_StoresABlankMrnAsNull(string? mrn)
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);

        var patient = TestDb.Patient(0, mrn: mrn);

        Assert.IsType<CreatedAtActionResult>(await controller.AddPatient(patient));

        var saved = await context.Patients.AsNoTracking().SingleAsync();
        Assert.Null(saved.MRN);
    }

    [Fact]
    public async Task AddPatient_AllowsSeveralPatientsWithoutAnMrnInTheSameGroup()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);

        Assert.IsType<CreatedAtActionResult>(await controller.AddPatient(TestDb.Patient(0, mrn: "")));
        Assert.IsType<CreatedAtActionResult>(await controller.AddPatient(TestDb.Patient(0, mrn: "")));

        Assert.Equal(2, await context.Patients.CountAsync());
    }

    [Fact]
    public async Task AddPatient_StoresTheMrnAndGroupTrimmed()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);

        Assert.IsType<CreatedAtActionResult>(
            await controller.AddPatient(TestDb.Patient(0, mrn: "  MRN-1 ", group: " DMC  ")));

        var saved = await context.Patients.AsNoTracking().SingleAsync();
        Assert.Equal("MRN-1", saved.MRN);
        Assert.Equal("DMC", saved.Group);
    }

    [Fact]
    public async Task AddPatient_TreatsMrnsThatDifferOnlyByWhitespaceAsDuplicates()
    {
        using var context = TestDb.CreateContext();
        var controller = new PatientsController(context);

        Assert.IsType<CreatedAtActionResult>(
            await controller.AddPatient(TestDb.Patient(0, mrn: " MRN-1 ", group: "DMC")));
        Assert.IsType<ConflictObjectResult>(
            await controller.AddPatient(TestDb.Patient(0, mrn: "MRN-1", group: " DMC")));

        Assert.Equal(1, await context.Patients.CountAsync());
    }

    // ---------- update ----------

    [Fact]
    public async Task UpdatePatient_WritesEveryEditableFieldAndRecalculates()
    {
        using var context = TestDb.CreateContext();
        var original = TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace", mrn: "MRN-1", clinic: "Main");
        original.Version = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        context.Patients.Add(original);
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);
        var update = new Patient
        {
            PatientID = 1,
            FirstName = "Grace",
            LastName = "Hopper",
            DOB = new DateTime(1906, 12, 9),
            MRN = "MRN-9",
            Group = "PJP",
            Insurance = "Cigna",
            PCP = "Dr. Who",
            Clinic = "North",
        };

        Assert.IsType<NoContentResult>(await controller.UpdatePatient(1, update));

        var saved = await context.Patients.AsNoTracking().SingleAsync();
        Assert.Equal("Grace", saved.FirstName);
        Assert.Equal("Hopper", saved.LastName);
        Assert.Equal(new DateTime(1906, 12, 9), saved.DOB);
        Assert.Equal("MRN-9", saved.MRN);
        Assert.Equal("PJP", saved.Group);
        Assert.Equal("Cigna", saved.Insurance);
        Assert.Equal("Dr. Who", saved.PCP);
        Assert.Equal("North", saved.Clinic);
        Assert.Equal("Hopper, Grace", saved.FullName);
        Assert.True(saved.Version > new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task UpdatePatient_IgnoresAClientSuppliedFullName()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, firstName: "Ada", lastName: "Lovelace"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);
        var update = TestDb.Patient(1, firstName: "Ada", lastName: "Byron");
        update.FullName = "Somebody Else";

        Assert.IsType<NoContentResult>(await controller.UpdatePatient(1, update));

        Assert.Equal("Byron, Ada", (await context.Patients.AsNoTracking().SingleAsync()).FullName);
    }

    [Fact]
    public async Task UpdatePatient_MovingToAGroupWhereTheMrnIsTakenConflicts()
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, mrn: "MRN-1", group: "PJP"),
            TestDb.Patient(2, mrn: "MRN-1", group: "DMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.IsType<ConflictObjectResult>(
            await controller.UpdatePatient(2, TestDb.Patient(2, mrn: "MRN-1", group: "PJP")));
        Assert.Equal("DMC", (await context.Patients.AsNoTracking().SingleAsync(p => p.PatientID == 2)).Group);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdatePatient_ClearingTheMrnStoresNull(string mrn)
    {
        using var context = TestDb.CreateContext();
        context.Patients.AddRange(
            TestDb.Patient(1, mrn: null, group: "DMC"),
            TestDb.Patient(2, mrn: "MRN-2", group: "DMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.IsType<NoContentResult>(await controller.UpdatePatient(2, TestDb.Patient(2, mrn: mrn, group: "DMC")));

        Assert.Null((await context.Patients.AsNoTracking().SingleAsync(p => p.PatientID == 2)).MRN);
    }

    [Fact]
    public async Task UpdatePatient_StoresTheMrnAndGroupTrimmed()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, mrn: "MRN-1", group: "DMC"));
        await context.SaveChangesAsync();

        var controller = new PatientsController(context);

        Assert.IsType<NoContentResult>(
            await controller.UpdatePatient(1, TestDb.Patient(1, mrn: " MRN-5  ", group: "  PJP ")));

        var saved = await context.Patients.AsNoTracking().SingleAsync();
        Assert.Equal("MRN-5", saved.MRN);
        Assert.Equal("PJP", saved.Group);
    }

    // ---------- helpers ----------

    /// <summary>
    /// A patient whose every sortable column carries <paramref name="key"/>, so
    /// patients built from "A", "B", "C" order the same way on any column.
    /// </summary>
    private static Patient SortablePatient(int id, string key)
    {
        var patient = TestDb.Patient(
            id,
            firstName: $"{key}first",
            lastName: $"{key}last",
            group: $"{key}group",
            insurance: $"{key}insurance",
            mrn: $"{key}mrn",
            clinic: $"{key}clinic",
            dob: new DateTime(1980, 1, 1).AddYears(key[0] - 'A'));
        patient.PCP = $"{key}pcp";
        return patient;
    }

    private static int[] PatientIds(JsonNode payload) =>
        payload.Array("items").Select(p => p!.Int("PatientID")).ToArray();
}
