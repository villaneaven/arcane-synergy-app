using arcane_synergy_app_backend.Models;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// When enabled, DataSeeder runs on every startup against whatever database is
/// configured, so it must be safe to run repeatedly and must never duplicate or
/// overwrite rows that are already there.
/// </summary>
public class DataSeederTests
{
    [Fact]
    public async Task Seed_OnAnEmptyDatabase_AddsTheDemoPatientsAndTheirAdmissions()
    {
        using var context = TestDb.CreateContext();

        Assert.Equal(new SeedResult(PatientsAdded: 2, AdmissionsAdded: 3), DataSeeder.Seed(context));

        var patients = await context.Patients.AsNoTracking().OrderBy(p => p.MRN).ToListAsync();
        Assert.Equal(new[] { "MRN10001", "MRN10002" }, patients.Select(p => p.MRN).ToArray());

        var john = patients[0];
        var emily = patients[1];

        var admissions = await context.Admissions.AsNoTracking().ToListAsync();
        Assert.Equal(3, admissions.Count);
        Assert.Equal(2, admissions.Count(a => a.PatientID == john.PatientID));
        Assert.Equal(1, admissions.Count(a => a.PatientID == emily.PatientID));
    }

    [Fact]
    public async Task Seed_FillsCalculatedFields()
    {
        using var context = TestDb.CreateContext();

        DataSeeder.Seed(context);

        var john = await context.Patients.AsNoTracking().SingleAsync(p => p.MRN == "MRN10001");
        Assert.Equal("Doe, John", john.FullName);
        Assert.NotEqual(default, john.Version);

        var admission = await context.Admissions.AsNoTracking()
            .SingleAsync(a => a.AdmissionDate == new DateTime(2025, 12, 5, 9, 30, 0, DateTimeKind.Utc));
        Assert.Equal("Friday", admission.DayOfWeekAdmitted);
        Assert.Equal("December", admission.MonthAdmitted);
    }

    [Fact]
    public async Task Seed_RunTwice_DoesNotDuplicateAnything()
    {
        using var context = TestDb.CreateContext();

        DataSeeder.Seed(context);

        Assert.Equal(new SeedResult(PatientsAdded: 0, AdmissionsAdded: 0), DataSeeder.Seed(context));
        Assert.Equal(2, await context.Patients.CountAsync());
        Assert.Equal(3, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task Seed_RunTwice_WritesNoFurtherHistory()
    {
        using var context = TestDb.CreateContext();

        DataSeeder.Seed(context);
        var afterFirstRun = await context.EditHistory.CountAsync();

        DataSeeder.Seed(context);

        Assert.Equal(afterFirstRun, await context.EditHistory.CountAsync());
    }

    [Fact]
    public async Task Seed_AttributesItsInsertsToSystem()
    {
        using var context = TestDb.CreateContext(userName: null);

        DataSeeder.Seed(context);

        var history = await context.EditHistory.ToListAsync();
        Assert.Equal(5, history.Count);
        Assert.All(history, h =>
        {
            Assert.Equal(EditHistory.ChangeTypes.Insert, h.ChangeType);
            Assert.Equal("system", h.ChangedBy);
        });
    }

    [Fact]
    public async Task Seed_LeavesAnExistingPatientWithTheSameMrnUntouched()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(500, firstName: "Real", lastName: "Person", mrn: "MRN10001", group: "DMC"));
        await context.SaveChangesAsync();

        DataSeeder.Seed(context);

        var withMrn = await context.Patients.AsNoTracking().Where(p => p.MRN == "MRN10001").ToListAsync();
        var existing = Assert.Single(withMrn);
        Assert.Equal("Person, Real", existing.FullName);

        Assert.Equal(2, await context.Admissions.CountAsync(a => a.PatientID == 500));
    }

    [Fact]
    public async Task Seed_SkipsAdmissionsWhenTheMrnBelongsToAPatientInAnotherGroup()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(500, mrn: "MRN10001", group: "PJP"));
        await context.SaveChangesAsync();

        DataSeeder.Seed(context);

        Assert.Equal(0, await context.Patients.CountAsync(p => p.FirstName == "John"));
        Assert.Equal(0, await context.Admissions.CountAsync(a => a.PatientID == 500));
        Assert.Equal(1, await context.Admissions.CountAsync());
    }

    [Fact]
    public async Task Seed_DoesNotReAddAnAdmissionThatIsAlreadyThere()
    {
        using var context = TestDb.CreateContext();
        DataSeeder.Seed(context);

        var seeded = await context.Admissions.FirstAsync();
        seeded.DX = "Edited by staff";
        await context.SaveChangesAsync();

        DataSeeder.Seed(context);

        Assert.Equal(3, await context.Admissions.CountAsync());
        Assert.Equal("Edited by staff", (await context.Admissions.AsNoTracking().SingleAsync(a => a.AdmissionId == seeded.AdmissionId)).DX);
    }

    [Fact]
    public async Task Seed_CountsOnlyTheRowsThisRunAdded()
    {
        using var context = TestDb.CreateContext();
        DataSeeder.Seed(context);

        var emily = await context.Patients.SingleAsync(p => p.MRN == "MRN10002");
        context.Admissions.RemoveRange(context.Admissions.Where(a => a.PatientID == emily.PatientID));
        context.Patients.Remove(emily);
        await context.SaveChangesAsync();

        Assert.Equal(new SeedResult(PatientsAdded: 1, AdmissionsAdded: 1), DataSeeder.Seed(context));
    }
}
