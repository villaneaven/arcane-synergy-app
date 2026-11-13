using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

public class EditHistoryTests
{
    private const string User = TestDb.DefaultUserName;

    /// <summary>
    /// A patient and admission already in the database, with the history their
    /// own inserts produced cleared out, so each test asserts only on the
    /// change it makes.
    /// </summary>
    private static async Task<ArcaneSynergyContext> SeededAdmissionAsync(string? userName = User)
    {
        var context = TestDb.CreateContext(userName);
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();

        return context;
    }

    [Fact]
    public async Task Update_RecordsOneRowPerChangedFieldWithOldAndNewValues()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.Facility = "DMC Main Campus";
        admission.DX = "Pneumonia";
        await context.SaveChangesAsync();

        var history = await context.EditHistory.ToListAsync();

        Assert.Equal(2, history.Count);
        Assert.All(history, h =>
        {
            Assert.Equal(nameof(Admission), h.EntityType);
            Assert.Equal("1", h.EntityId);
            Assert.Equal(EditHistory.ChangeTypes.Update, h.ChangeType);
            Assert.Equal(User, h.ChangedBy);
        });

        var dx = history.Single(h => h.FieldName == nameof(Admission.DX));
        Assert.Null(dx.OldValue);
        Assert.Equal("Pneumonia", dx.NewValue);

        var facility = history.Single(h => h.FieldName == nameof(Admission.Facility));
        Assert.Null(facility.OldValue);
        Assert.Equal("DMC Main Campus", facility.NewValue);
    }

    [Fact]
    public async Task Update_IgnoresFieldsReassignedToTheSameValue()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);

        admission.Type = admission.Type;
        admission.Facility = admission.Facility;
        admission.AdmissionDate = admission.AdmissionDate;
        admission.SeenBy = "Dr. Smith";
        await context.SaveChangesAsync();

        var changed = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Admission.SeenBy), changed.FieldName);
    }

    [Fact]
    public async Task Update_DoesNotLogAuditStampsOrDerivedFields()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.AdmissionDate = new DateTime(2025, 2, 20);
        admission.LastEditedBy = "someone.else@example.com";
        admission.LastEditedAt = DateTime.UtcNow;
        admission.UpdateCalculatedFields();
        await context.SaveChangesAsync();

        var fields = await context.EditHistory.Select(h => h.FieldName).ToListAsync();

        Assert.Equal(new[] { nameof(Admission.AdmissionDate) }, fields);
    }

    [Fact]
    public async Task Update_StampsChangedAtInUtc()
    {
        using var context = await SeededAdmissionAsync();

        var before = DateTime.UtcNow.AddSeconds(-1);

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.DischargeTo = "Home";
        await context.SaveChangesAsync();

        var entry = await context.EditHistory.SingleAsync();
        Assert.InRange(entry.ChangedAt, before, DateTime.UtcNow.AddSeconds(1));
    }

    [Fact]
    public async Task Insert_RecordsASingleRowCarryingTheGeneratedKey()
    {
        using var context = TestDb.CreateContext(User);
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Patient), entry.EntityType);
        Assert.Equal(EditHistory.ChangeTypes.Insert, entry.ChangeType);
        Assert.Equal("1", entry.EntityId);
        Assert.Null(entry.FieldName);
        Assert.Equal(User, entry.ChangedBy);
    }

    [Fact]
    public async Task Delete_RecordsASingleRowForTheEntity()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        context.Admissions.Remove(admission);
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(EditHistory.ChangeTypes.Delete, entry.ChangeType);
        Assert.Equal(nameof(Admission), entry.EntityType);
        Assert.Equal("1", entry.EntityId);
        Assert.Null(entry.FieldName);
    }

    [Fact]
    public async Task SaveOutsideARequest_IsAttributedToSystem()
    {
        using var context = TestDb.CreateContext(userName: null);
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal("system", entry.ChangedBy);
    }

    [Fact]
    public async Task HistoryRowsAreNotThemselvesAudited()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.DX = "Sepsis";
        await context.SaveChangesAsync();

        Assert.Empty(await context.EditHistory
            .Where(h => h.EntityType == nameof(EditHistory))
            .ToListAsync());
    }

    [Fact]
    public async Task UpdateThroughTheController_AttributesTheChangeToTheSignedInUser()
    {
        using var context = await SeededAdmissionAsync("nurse@example.com");

        var admission = await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == 1);
        admission.DX = "CHF";

        var controller = new AdmissionsController(context).WithUser("nurse@example.com");
        var result = await controller.UpdateAdmission(1, admission);

        Assert.IsType<NoContentResult>(result);

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Admission.DX), entry.FieldName);
        Assert.Equal("CHF", entry.NewValue);
        Assert.Equal("nurse@example.com", entry.ChangedBy);
    }

    [Fact]
    public async Task GetHistory_ReturnsNewestFirstForTheRequestedRecord()
    {
        using var context = await SeededAdmissionAsync();

        context.EditHistory.AddRange(
            Entry(nameof(Admission), "1", nameof(Admission.DX), "A", "B", new DateTime(2025, 1, 1)),
            Entry(nameof(Admission), "1", nameof(Admission.DX), "B", "C", new DateTime(2025, 3, 1)),
            Entry(nameof(Admission), "2", nameof(Admission.DX), "X", "Y", new DateTime(2025, 2, 1)));
        await context.SaveChangesAsync();

        var controller = new EditHistoryController(context);

        var payload = (await controller.GetHistory(nameof(Admission), "1")).OkJson();

        Assert.Equal(2, payload.Int("totalCount"));
        var items = payload.Array("items");
        Assert.Equal(2, items.Count);

        Assert.Equal("C", items[0]!["NewValue"]!.GetValue<string>());
        Assert.Equal("B", items[1]!["NewValue"]!.GetValue<string>());
    }

    [Fact]
    public async Task GetHistory_IsCaseInsensitiveOnEntityType()
    {
        using var context = await SeededAdmissionAsync();

        context.EditHistory.Add(
            Entry(nameof(Transfer), "7", nameof(Transfer.Facility), null, "Valley", new DateTime(2025, 1, 1)));
        await context.SaveChangesAsync();

        var controller = new EditHistoryController(context);

        var payload = (await controller.GetHistory("transfer", "7")).OkJson();

        Assert.Equal(1, payload.Int("totalCount"));
    }

    [Fact]
    public async Task GetHistory_RejectsEntityTypesThatAreNotAudited()
    {
        using var context = await SeededAdmissionAsync();
        var controller = new EditHistoryController(context);

        var result = await controller.GetHistory("GapWorkStatus", "1");

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetHistory_ClampsPageAndPageSizeToSafeRange()
    {
        using var context = await SeededAdmissionAsync();
        var controller = new EditHistoryController(context);

        var payload = (await controller.GetHistory(nameof(Admission), "1", page: 0, pageSize: 5000)).OkJson();

        Assert.Equal(1, payload.Int("page"));
        Assert.Equal(200, payload.Int("pageSize"));
    }

    private static EditHistory Entry(
        string entityType,
        string entityId,
        string field,
        string? oldValue,
        string? newValue,
        DateTime changedAt) => new()
        {
            EntityType = entityType,
            EntityId = entityId,
            ChangeType = EditHistory.ChangeTypes.Update,
            FieldName = field,
            OldValue = oldValue,
            NewValue = newValue,
            ChangedBy = User,
            ChangedAt = changedAt,
        };
}
