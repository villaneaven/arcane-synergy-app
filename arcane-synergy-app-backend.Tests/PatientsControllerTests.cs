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
}
