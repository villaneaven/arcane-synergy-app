using System.Globalization;
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

    [Fact]
    public async Task GetHistory_PagesNewestFirstAndBreaksTimestampTiesByNewestRow()
    {
        using var context = await SeededAdmissionAsync();

        var sameMoment = new DateTime(2025, 1, 1);
        context.EditHistory.AddRange(
            Entry(nameof(Admission), "1", nameof(Admission.DX), null, "first", sameMoment),
            Entry(nameof(Admission), "1", nameof(Admission.DX), "first", "second", sameMoment),
            Entry(nameof(Admission), "1", nameof(Admission.DX), "second", "third", sameMoment));
        await context.SaveChangesAsync();

        var controller = new EditHistoryController(context);

        var page1 = (await controller.GetHistory(nameof(Admission), "1", page: 1, pageSize: 2)).OkJson();
        var page2 = (await controller.GetHistory(nameof(Admission), "1", page: 2, pageSize: 2)).OkJson();

        Assert.Equal(3, page1.Int("totalCount"));
        Assert.Equal(
            new[] { "third", "second" },
            page1.Array("items").Select(i => i!["NewValue"]!.GetValue<string>()).ToArray());
        Assert.Equal(
            new[] { "first" },
            page2.Array("items").Select(i => i!["NewValue"]!.GetValue<string>()).ToArray());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetHistory_RejectsABlankEntityId(string entityId)
    {
        using var context = await SeededAdmissionAsync();
        var controller = new EditHistoryController(context);

        Assert.IsType<BadRequestObjectResult>(await controller.GetHistory(nameof(Admission), entityId));
    }

    // ---------- patients ----------

    [Fact]
    public async Task PatientUpdate_RecordsEditedFieldsButNotTheDerivedNameOrVersion()
    {
        using var context = await SeededAdmissionAsync();

        var patient = await context.Patients.FirstAsync(p => p.PatientID == 1);
        patient.LastName = "Byron";
        patient.UpdateCalculatedFields();
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Patient), entry.EntityType);
        Assert.Equal("1", entry.EntityId);
        Assert.Equal(nameof(Patient.LastName), entry.FieldName);
        Assert.Equal("Lovelace", entry.OldValue);
        Assert.Equal("Byron", entry.NewValue);
    }

    [Fact]
    public async Task PatientDelete_RecordsASingleRowForThePatient()
    {
        using var context = TestDb.CreateContext(User);
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();
        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();

        context.Patients.Remove(await context.Patients.SingleAsync());
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Patient), entry.EntityType);
        Assert.Equal(EditHistory.ChangeTypes.Delete, entry.ChangeType);
        Assert.Equal("1", entry.EntityId);
    }

    // ---------- transfers ----------

    [Fact]
    public async Task TransferInsert_RecordsTheGeneratedKey()
    {
        using var context = await SeededAdmissionAsync();

        var transfer = TestDb.Transfer(0, 1, new DateTime(2025, 1, 12));
        context.Transfers.Add(transfer);
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Transfer), entry.EntityType);
        Assert.Equal(EditHistory.ChangeTypes.Insert, entry.ChangeType);
        Assert.NotEqual(0, transfer.TransferId);
        Assert.Equal(transfer.TransferId.ToString(CultureInfo.InvariantCulture), entry.EntityId);
    }

    [Fact]
    public async Task TransferUpdate_DoesNotLogItsOwnAuditStamps()
    {
        using var context = await SeededTransferAsync();

        var transfer = await context.Transfers.SingleAsync();
        transfer.Facility = "Valley";
        transfer.LastEditedBy = "someone.else@example.com";
        transfer.LastEditedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(nameof(Transfer), entry.EntityType);
        Assert.Equal(nameof(Transfer.Facility), entry.FieldName);
    }

    [Fact]
    public async Task TransferUpdate_RecordsFlagsAndDatesAsInvariantText()
    {
        using var context = await SeededTransferAsync();

        var transfer = await context.Transfers.SingleAsync();
        transfer.IsFinalDischarge = true;
        transfer.DischargeDate = new DateTime(2025, 1, 20, 14, 30, 0);
        await context.SaveChangesAsync();

        var history = await context.EditHistory.ToListAsync();

        var flag = history.Single(h => h.FieldName == nameof(Transfer.IsFinalDischarge));
        Assert.Equal("false", flag.OldValue);
        Assert.Equal("true", flag.NewValue);

        var discharge = history.Single(h => h.FieldName == nameof(Transfer.DischargeDate));
        Assert.Null(discharge.OldValue);
        Assert.Equal("2025-01-20T14:30:00.0000000", discharge.NewValue);
    }

    // ---------- value formatting ----------

    [Fact]
    public async Task Update_FormatsValuesTheSameWhateverTheServerCulture()
    {
        using var context = await SeededAdmissionAsync();

        var originalCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("de-DE");

            var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
            admission.DateSeen = new DateTime(2025, 3, 4, 5, 6, 7);
            admission.TotalERVisits = 1234;
            await context.SaveChangesAsync();
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }

        var history = await context.EditHistory.ToListAsync();
        Assert.Equal(
            "2025-03-04T05:06:07.0000000",
            history.Single(h => h.FieldName == nameof(Admission.DateSeen)).NewValue);
        Assert.Equal(
            "1234",
            history.Single(h => h.FieldName == nameof(Admission.TotalERVisits)).NewValue);
    }

    [Fact]
    public async Task Update_KeepsTheUtcMarkerOnUtcTimestamps()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.TimeOfAdmission = new DateTime(2025, 1, 10, 8, 0, 0, DateTimeKind.Utc);
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal("2025-01-10T08:00:00.0000000Z", entry.NewValue);
    }

    [Fact]
    public async Task Update_ClearingAFieldRecordsANullNewValue()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.DX = "Sepsis";
        await context.SaveChangesAsync();
        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();

        admission.DX = null;
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal("Sepsis", entry.OldValue);
        Assert.Null(entry.NewValue);
    }

    [Fact]
    public async Task Update_TruncatesValuesLongerThanTheColumnLimit()
    {
        using var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.DX = new string('x', EditHistoryLimits.ValueLength) + "overflow";
        await context.SaveChangesAsync();

        var entry = Assert.Single(await context.EditHistory.ToListAsync());
        Assert.Equal(new string('x', EditHistoryLimits.ValueLength), entry.NewValue);
    }

    // ---------- attribution ----------

    [Fact]
    public async Task ChangedBy_IsTrimmed()
    {
        using var context = TestDb.CreateContext("  nurse@example.com ");
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        Assert.Equal("nurse@example.com", (await context.EditHistory.SingleAsync()).ChangedBy);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ChangedBy_FallsBackToSystemForABlankUser(string userName)
    {
        using var context = TestDb.CreateContext(userName);
        context.Patients.Add(TestDb.Patient(1));
        await context.SaveChangesAsync();

        Assert.Equal("system", (await context.EditHistory.SingleAsync()).ChangedBy);
    }

    // ---------- several entities in one save ----------

    [Fact]
    public async Task InsertingSeveralRowsAtOnce_GivesEachEntryItsOwnKey()
    {
        using var context = TestDb.CreateContext(User);
        var first = TestDb.Patient(0, lastName: "Lovelace");
        var second = TestDb.Patient(0, lastName: "Hopper");
        context.Patients.AddRange(first, second);
        await context.SaveChangesAsync();

        var ids = (await context.EditHistory.Select(h => h.EntityId).ToListAsync()).OrderBy(i => i).ToArray();

        Assert.Equal(
            new[] { first.PatientID, second.PatientID }.Select(i => i.ToString(CultureInfo.InvariantCulture)).OrderBy(i => i),
            ids);
        Assert.NotEqual(first.PatientID, second.PatientID);
    }

    [Fact]
    public async Task AddingATransfer_RecordsTheTransferAndTheAdmissionBookkeepingTogether()
    {
        using var context = await SeededAdmissionAsync("nurse@example.com");

        var controller = new TransfersController(context).WithUser("nurse@example.com");
        Assert.IsType<CreatedAtActionResult>(
            await controller.AddTransfer(TestDb.Transfer(0, 1, new DateTime(2025, 1, 12))));

        var history = await context.EditHistory.ToListAsync();

        var insert = Assert.Single(history, h => h.EntityType == nameof(Transfer));
        Assert.Equal(EditHistory.ChangeTypes.Insert, insert.ChangeType);

        var count = Assert.Single(history, h => h.EntityType == nameof(Admission));
        Assert.Equal(nameof(Admission.CountOfTransfers), count.FieldName);
        Assert.Equal("0", count.OldValue);
        Assert.Equal("1", count.NewValue);

        Assert.All(history, h => Assert.Equal("nurse@example.com", h.ChangedBy));
        Assert.Single(history.Select(h => h.ChangedAt).Distinct());
    }

    [Fact]
    public async Task MovingATransferToAnAdmission_RecordsTheDeleteTheNewAdmissionAndTheCountChange()
    {
        using var context = await SeededTransferAsync(countOfTransfers: 1);

        var controller = new TransfersController(context).WithUser();
        var moved = (await controller.MoveTransferToAdmission(1)).OkValue<Admission>();

        var history = await context.EditHistory
            .Select(h => new { h.EntityType, h.EntityId, h.ChangeType, h.FieldName })
            .ToListAsync();

        Assert.Contains(new { EntityType = nameof(Transfer), EntityId = "1", ChangeType = EditHistory.ChangeTypes.Delete, FieldName = (string?)null }, history);
        Assert.Contains(new { EntityType = nameof(Admission), EntityId = moved.AdmissionId.ToString(CultureInfo.InvariantCulture), ChangeType = EditHistory.ChangeTypes.Insert, FieldName = (string?)null }, history);
        Assert.Contains(new { EntityType = nameof(Admission), EntityId = "1", ChangeType = EditHistory.ChangeTypes.Update, FieldName = (string?)nameof(Admission.CountOfTransfers) }, history);
        Assert.Equal(3, history.Count);
    }

    /// <summary>
    /// <see cref="SeededAdmissionAsync"/> plus one transfer on admission 1, with
    /// the history from seeding cleared.
    /// </summary>
    private static async Task<ArcaneSynergyContext> SeededTransferAsync(int countOfTransfers = 0)
    {
        var context = await SeededAdmissionAsync();

        var admission = await context.Admissions.FirstAsync(a => a.AdmissionId == 1);
        admission.CountOfTransfers = countOfTransfers;
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 12)));
        await context.SaveChangesAsync();

        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();

        return context;
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
