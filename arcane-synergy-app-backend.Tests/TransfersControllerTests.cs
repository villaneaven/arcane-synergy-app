using System.Text.Json.Nodes;
using arcane_synergy_app_backend.Controllers;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// TransfersController is the only controller that writes to a second entity:
/// every mutation also keeps <c>Admission.CountOfTransfers</c> and
/// <c>Admission.FinalDischargeDate</c> in step. These tests pin that bookkeeping,
/// including the awkward paths where a transfer moves between admissions, loses
/// its final-discharge flag, or is promoted into an admission of its own.
/// </summary>
public class TransfersControllerTests
{
    // ---------- export ----------

    [Fact]
    public async Task GetTransfersForExport_ReturnsEveryTransferOrderedByAdmissionThenTransferId()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        SeedAdmission(context, 2);
        context.Transfers.AddRange(
            TestDb.Transfer(3, 2, new DateTime(2025, 1, 3)),
            TestDb.Transfer(1, 2, new DateTime(2025, 1, 1)),
            TestDb.Transfer(2, 1, new DateTime(2025, 1, 2)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        var noFilter = (await controller.GetTransfersForExport(null)).OkValue<List<Transfer>>();
        Assert.Equal(new[] { 2, 1, 3 }, noFilter.Select(t => t.TransferId).ToArray());

        // An empty list is treated the same as no filter at all.
        var emptyFilter = (await controller.GetTransfersForExport(new List<int>())).OkValue<List<Transfer>>();
        Assert.Equal(3, emptyFilter.Count);
    }

    [Fact]
    public async Task GetTransfersForExport_FiltersToRequestedAdmissionIds()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        SeedAdmission(context, 2);
        context.Transfers.AddRange(
            TestDb.Transfer(1, 1, new DateTime(2025, 1, 1)),
            TestDb.Transfer(2, 2, new DateTime(2025, 1, 2)),
            TestDb.Transfer(3, 2, new DateTime(2025, 1, 3)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        var result = (await controller.GetTransfersForExport(new List<int> { 2 })).OkValue<List<Transfer>>();

        Assert.Equal(new[] { 2, 3 }, result.Select(t => t.TransferId).ToArray());
    }

    // ---------- list and read ----------

    [Fact]
    public async Task GetTransfers_ClampsPageAndPageSizeToSafeRange()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 1)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        var payload = (await controller.GetTransfers(page: 0, pageSize: 5000)).OkJson();

        Assert.Equal(1, payload.Int("page"));
        Assert.Equal(100, payload.Int("pageSize"));
    }

    [Fact]
    public async Task GetTransfers_PagesThroughResultsAndReportsTotalCount()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        for (var i = 1; i <= 5; i++)
        {
            context.Transfers.Add(TestDb.Transfer(i, 1, new DateTime(2025, 1, i)));
        }
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        var payload = (await controller.GetTransfers(page: 2, pageSize: 2)).OkJson();

        Assert.Equal(5, payload.Int("totalCount"));
        Assert.Equal(2, payload.Array("items").Count);
    }

    [Fact]
    public async Task GetTransfers_SortsByRequestedColumnAndDirection()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        context.Transfers.AddRange(
            TestDb.Transfer(1, 1, new DateTime(2025, 1, 10), type: "ER", dischargeDate: new DateTime(2025, 1, 15)),
            TestDb.Transfer(2, 1, new DateTime(2025, 3, 10), type: "ADM", dischargeDate: new DateTime(2025, 3, 15)),
            TestDb.Transfer(3, 1, new DateTime(2025, 2, 10), type: "SNF", dischargeDate: new DateTime(2025, 2, 15)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        // Admission date is the default column.
        var ascending = (await controller.GetTransfers(sortDir: "asc")).OkJson();
        Assert.Equal(new[] { 1, 3, 2 }, TransferIds(ascending));

        // Anything other than "asc" is treated as descending, including the default.
        var descending = (await controller.GetTransfers()).OkJson();
        Assert.Equal(new[] { 2, 3, 1 }, TransferIds(descending));

        var byType = (await controller.GetTransfers(sortBy: "type", sortDir: "asc")).OkJson();
        Assert.Equal(new[] { 2, 1, 3 }, TransferIds(byType));

        var byDischarge = (await controller.GetTransfers(sortBy: "dischargedate", sortDir: "asc")).OkJson();
        Assert.Equal(new[] { 1, 3, 2 }, TransferIds(byDischarge));
    }

    [Fact]
    public async Task GetTransfers_BreaksTiesByTransferId()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        var sameDay = new DateTime(2025, 1, 10);
        context.Transfers.AddRange(
            TestDb.Transfer(3, 1, sameDay),
            TestDb.Transfer(1, 1, sameDay),
            TestDb.Transfer(2, 1, sameDay));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        // The tiebreaker is always ascending, even when the primary sort is descending.
        var payload = (await controller.GetTransfers(sortDir: "desc")).OkJson();

        Assert.Equal(new[] { 1, 2, 3 }, TransferIds(payload));
    }

    [Fact]
    public async Task GetTransfer_ReturnsTheTransferOrNotFound()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10), facility: "Mercy"));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        Assert.Equal("Mercy", (await controller.GetTransfer(1)).OkValue<Transfer>().Facility);
        Assert.IsType<NotFoundResult>(await controller.GetTransfer(404));
    }

    [Fact]
    public async Task GetTransfersByAdmissionId_ReturnsOnlyThatAdmissionOldestFirst()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        SeedAdmission(context, 2);
        context.Transfers.AddRange(
            TestDb.Transfer(1, 1, new DateTime(2025, 3, 10)),
            TestDb.Transfer(2, 1, new DateTime(2025, 1, 10)),
            TestDb.Transfer(3, 2, new DateTime(2025, 2, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context);

        var result = (await controller.GetTransfersByAdmissionId(1)).OkValue<List<Transfer>>();

        Assert.Equal(new[] { 2, 1 }, result.Select(t => t.TransferId).ToArray());
    }

    // ---------- create ----------

    [Fact]
    public async Task AddTransfer_IncrementsTransferCountWithoutTouchingFinalDischargeDate()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        var result = await controller.AddTransfer(
            TestDb.Transfer(0, 1, new DateTime(2025, 1, 10), dischargeDate: new DateTime(2025, 1, 12)));

        Assert.IsType<CreatedAtActionResult>(result);
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(1, admission.CountOfTransfers);
        Assert.Null(admission.FinalDischargeDate);
        Assert.Equal(1, await context.Transfers.CountAsync());
    }

    [Fact]
    public async Task AddTransfer_FinalTransferStampsFinalDischargeDateOnAdmission()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        var result = await controller.AddTransfer(TestDb.Transfer(
            0, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));

        Assert.IsType<CreatedAtActionResult>(result);
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(1, admission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), admission.FinalDischargeDate);
    }

    [Fact]
    public async Task AddTransfer_FinalTransferRecalculatesTheReadmissionFlag()
    {
        using var context = TestDb.CreateContext();
        var seeded = TestDb.Admission(1, 1, new DateTime(2025, 1, 1));
        seeded.NextAdmissionDate = new DateTime(2025, 2, 5);
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(seeded);
        await context.SaveChangesAsync();
        Assert.False(seeded.ReadmissionFlag);

        var controller = new TransfersController(context).WithUser();

        // Setting the final discharge date 16 days before the next admission
        // must flip the readmission flag through UpdateCalculatedFields.
        await controller.AddTransfer(TestDb.Transfer(
            0, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));

        Assert.True((await ReloadAdmission(context, 1)).ReadmissionFlag);
    }

    [Fact]
    public async Task AddTransfer_StampsAuditFieldsAndTrimsNotes()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser("nurse@example.com");
        var transfer = TestDb.Transfer(0, 1, new DateTime(2025, 1, 10));
        transfer.Notes = "  Watch blood pressure  ";
        // A client-supplied editor must never win over the signed-in principal.
        transfer.LastEditedBy = "someone.else@example.com";

        await controller.AddTransfer(transfer);

        var saved = await context.Transfers.AsNoTracking().FirstAsync();
        Assert.Equal("Watch blood pressure", saved.Notes);
        Assert.Equal("nurse@example.com", saved.LastEditedBy);
        Assert.NotNull(saved.LastEditedAt);
    }

    [Fact]
    public async Task AddTransfer_TurnsBlankNotesIntoNull()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var transfer = TestDb.Transfer(0, 1, new DateTime(2025, 1, 10));
        transfer.Notes = "   ";

        await controller.AddTransfer(transfer);

        Assert.Null((await context.Transfers.AsNoTracking().FirstAsync()).Notes);
    }

    [Fact]
    public async Task AddTransfer_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser(null);

        var result = await controller.AddTransfer(TestDb.Transfer(0, 1, new DateTime(2025, 1, 10)));

        Assert.IsType<ForbidResult>(result);
        Assert.Equal(0, await context.Transfers.CountAsync());
        Assert.Equal(0, (await ReloadAdmission(context, 1)).CountOfTransfers);
    }

    [Fact]
    public async Task AddTransfer_ConflictsWhenTheAdmissionAlreadyHasAFinalTransfer()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        var result = await controller.AddTransfer(TestDb.Transfer(
            0, 1, new DateTime(2025, 2, 1),
            dischargeDate: new DateTime(2025, 2, 5),
            isFinalDischarge: true));

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(1, await context.Transfers.CountAsync());
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(1, admission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), admission.FinalDischargeDate);
    }

    [Fact]
    public async Task AddTransfer_AllowsANonFinalTransferAlongsideAnExistingFinalOne()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        var result = await controller.AddTransfer(TestDb.Transfer(0, 1, new DateTime(2025, 1, 5)));

        Assert.IsType<CreatedAtActionResult>(result);
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(2, admission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), admission.FinalDischargeDate);
    }

    [Fact]
    public async Task AddTransfer_ForAnUnknownAdmissionSavesTheTransferWithNothingToAdjust()
    {
        using var context = TestDb.CreateContext();
        var controller = new TransfersController(context).WithUser();

        // AdjustAdmissionAsync silently no-ops when the admission is missing, so
        // the orphan is accepted here. Against real SQL Server the foreign key
        // rejects it and the unhandled DbUpdateException surfaces as a 500, so
        // this test documents current behaviour rather than desired behaviour.
        var result = await controller.AddTransfer(TestDb.Transfer(0, 999, new DateTime(2025, 1, 10)));

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(1, await context.Transfers.CountAsync());
    }

    // ---------- update ----------

    [Fact]
    public async Task UpdateTransfer_RejectsMismatchedIdAndMissingTransfer()
    {
        using var context = TestDb.CreateContext();
        var controller = new TransfersController(context).WithUser();
        var transfer = TestDb.Transfer(7, 1, new DateTime(2025, 1, 10));

        Assert.IsType<BadRequestObjectResult>(await controller.UpdateTransfer(8, transfer));
        Assert.IsType<NotFoundResult>(await controller.UpdateTransfer(7, transfer));
    }

    [Fact]
    public async Task UpdateTransfer_WritesEditableFields()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10), type: "ER", facility: "Mercy"));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 11),
            type: "SNF",
            dischargeDate: new DateTime(2025, 1, 18),
            facility: "Sunrise");
        update.DX = "CHF";
        update.DischargeTo = "Home";
        update.NotificationSource = "Fax";

        var result = await controller.UpdateTransfer(1, update);

        Assert.IsType<OkObjectResult>(result);
        var saved = await context.Transfers.AsNoTracking().FirstAsync(t => t.TransferId == 1);
        Assert.Equal("SNF", saved.Type);
        Assert.Equal("Sunrise", saved.Facility);
        Assert.Equal("CHF", saved.DX);
        Assert.Equal("Home", saved.DischargeTo);
        Assert.Equal("Fax", saved.NotificationSource);
        Assert.Equal(new DateTime(2025, 1, 11), saved.AdmissionDate);
        Assert.Equal(new DateTime(2025, 1, 18), saved.DischargeDate);
    }

    [Fact]
    public async Task UpdateTransfer_StampsAuditFieldsAndTrimsNotes()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser("doctor@example.com");
        var update = TestDb.Transfer(1, 1, new DateTime(2025, 1, 10));
        update.Notes = "  Discharged home  ";
        // A client-supplied editor must never win over the signed-in principal.
        update.LastEditedBy = "someone.else@example.com";

        await controller.UpdateTransfer(1, update);

        var saved = await context.Transfers.AsNoTracking().FirstAsync(t => t.TransferId == 1);
        Assert.Equal("Discharged home", saved.Notes);
        Assert.Equal("doctor@example.com", saved.LastEditedBy);
        Assert.NotNull(saved.LastEditedAt);
    }

    [Fact]
    public async Task UpdateTransfer_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10), type: "ER"));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser(null);
        var update = TestDb.Transfer(1, 1, new DateTime(2025, 1, 10), type: "SNF");

        Assert.IsType<ForbidResult>(await controller.UpdateTransfer(1, update));

        var saved = await context.Transfers.AsNoTracking().FirstAsync(t => t.TransferId == 1);
        Assert.Equal("ER", saved.Type);
    }

    [Fact]
    public async Task UpdateTransfer_MovingAFinalTransferShiftsCountsAndFinalDischargeDate()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        SeedAdmission(context, 2);
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            1, 2, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true);

        var result = await controller.UpdateTransfer(1, update);

        Assert.IsType<OkObjectResult>(result);

        var oldAdmission = await ReloadAdmission(context, 1);
        Assert.Equal(0, oldAdmission.CountOfTransfers);
        Assert.Null(oldAdmission.FinalDischargeDate);

        var newAdmission = await ReloadAdmission(context, 2);
        Assert.Equal(1, newAdmission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), newAdmission.FinalDischargeDate);
    }

    [Fact]
    public async Task UpdateTransfer_MovingANonFinalTransferLeavesBothFinalDischargeDatesAlone()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 2, finalDischargeDate: new DateTime(2025, 1, 31));
        SeedAdmission(context, 2, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 2, 28));
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(1, 2, new DateTime(2025, 1, 10));

        await controller.UpdateTransfer(1, update);

        var oldAdmission = await ReloadAdmission(context, 1);
        Assert.Equal(1, oldAdmission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 31), oldAdmission.FinalDischargeDate);

        var newAdmission = await ReloadAdmission(context, 2);
        Assert.Equal(2, newAdmission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 2, 28), newAdmission.FinalDischargeDate);
    }

    [Fact]
    public async Task UpdateTransfer_ClearingTheFinalFlagClearsAdmissionFinalDischargeDate()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: false);

        await controller.UpdateTransfer(1, update);

        var admission = await ReloadAdmission(context, 1);
        Assert.Null(admission.FinalDischargeDate);
        Assert.Equal(1, admission.CountOfTransfers);
    }

    [Fact]
    public async Task UpdateTransfer_PromotingATransferToFinalStampsAdmissionFinalDischargeDate()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 25),
            isFinalDischarge: true);

        await controller.UpdateTransfer(1, update);

        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(new DateTime(2025, 1, 25), admission.FinalDischargeDate);
        Assert.Equal(1, admission.CountOfTransfers);
    }

    [Fact]
    public async Task UpdateTransfer_ConflictsWhenAnotherTransferIsAlreadyFinal()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 2, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.AddRange(
            TestDb.Transfer(
                1, 1, new DateTime(2025, 1, 10),
                dischargeDate: new DateTime(2025, 1, 20),
                isFinalDischarge: true),
            TestDb.Transfer(2, 1, new DateTime(2025, 1, 5)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            2, 1, new DateTime(2025, 1, 5),
            dischargeDate: new DateTime(2025, 1, 8),
            isFinalDischarge: true);

        var result = await controller.UpdateTransfer(2, update);

        Assert.IsType<ConflictObjectResult>(result);
        var saved = await context.Transfers.AsNoTracking().FirstAsync(t => t.TransferId == 2);
        Assert.False(saved.IsFinalDischarge);
        Assert.Equal(new DateTime(2025, 1, 20), (await ReloadAdmission(context, 1)).FinalDischargeDate);
    }

    [Fact]
    public async Task UpdateTransfer_KeepingItsOwnFinalFlagIsNotTreatedAsConflict()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();
        var update = TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 22),
            isFinalDischarge: true);

        var result = await controller.UpdateTransfer(1, update);

        Assert.IsType<OkObjectResult>(result);
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(new DateTime(2025, 1, 22), admission.FinalDischargeDate);
        Assert.Equal(1, admission.CountOfTransfers);
    }

    // ---------- promote a transfer into its own admission ----------

    [Fact]
    public async Task MoveTransferToAdmission_CopiesTheTransferOntoANewAdmissionAndRemovesIt()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        var transfer = TestDb.Transfer(
            1, 1, new DateTime(2025, 3, 10), // a Monday
            type: "SNF",
            dischargeDate: new DateTime(2025, 3, 15),
            facility: "Valley");
        transfer.DX = "CHF";
        transfer.DischargeTo = "Home";
        transfer.Notes = "Moved out of the parent admission";
        context.Transfers.Add(transfer);
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser("nurse@example.com");

        var created = (await controller.MoveTransferToAdmission(1)).OkValue<Admission>();

        // The new admission inherits the patient from the admission it was under.
        Assert.Equal(1, created.PatientID);
        Assert.Equal("SNF", created.Type);
        Assert.Equal("Valley", created.Facility);
        Assert.Equal(new DateTime(2025, 3, 10), created.AdmissionDate);
        Assert.Equal(new DateTime(2025, 3, 15), created.DischargeDate);
        Assert.Equal("CHF", created.DX);
        Assert.Equal("Home", created.DischargeTo);
        Assert.Equal("Moved out of the parent admission", created.Notes);
        Assert.Equal("nurse@example.com", created.LastEditedBy);
        Assert.NotNull(created.LastEditedAt);
        Assert.Equal("Monday", created.DayOfWeekAdmitted);
        Assert.Equal("March", created.MonthAdmitted);

        Assert.Equal(0, await context.Transfers.CountAsync());
        Assert.Equal(2, await context.Admissions.CountAsync());
        Assert.Equal(0, (await ReloadAdmission(context, 1)).CountOfTransfers);
    }

    [Fact]
    public async Task MoveTransferToAdmission_ClearsTheOldFinalDischargeDateWhenTheTransferWasFinal()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        await controller.MoveTransferToAdmission(1);

        var oldAdmission = await ReloadAdmission(context, 1);
        Assert.Equal(0, oldAdmission.CountOfTransfers);
        Assert.Null(oldAdmission.FinalDischargeDate);
    }

    [Fact]
    public async Task MoveTransferToAdmission_ReturnsNotFoundForUnknownTransferOrOrphanedTransfer()
    {
        using var context = TestDb.CreateContext();
        // A transfer whose admission is gone.
        context.Transfers.Add(TestDb.Transfer(1, 999, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        Assert.IsType<NotFoundResult>(await controller.MoveTransferToAdmission(404));
        
        Assert.IsType<NotFoundResult>(await controller.MoveTransferToAdmission(1));
        Assert.Equal(1, await context.Transfers.CountAsync());
    }

    [Fact]
    public async Task MoveTransferToAdmission_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.MoveTransferToAdmission(1));
        Assert.Equal(1, await context.Transfers.CountAsync());
        Assert.Equal(1, await context.Admissions.CountAsync());
    }

    // ---------- delete ----------

    [Fact]
    public async Task Delete_RemovesTransferAndDecrementsTheCount()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 2);
        context.Transfers.AddRange(
            TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)),
            TestDb.Transfer(2, 1, new DateTime(2025, 1, 12)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        Assert.IsType<NoContentResult>(await controller.Delete(1));
        Assert.Equal(1, await context.Transfers.CountAsync());
        Assert.Equal(1, (await ReloadAdmission(context, 1)).CountOfTransfers);
    }

    [Fact]
    public async Task Delete_FinalTransferClearsAdmissionFinalDischargeDate()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.Add(TestDb.Transfer(
            1, 1, new DateTime(2025, 1, 10),
            dischargeDate: new DateTime(2025, 1, 20),
            isFinalDischarge: true));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        Assert.IsType<NoContentResult>(await controller.Delete(1));
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(0, admission.CountOfTransfers);
        Assert.Null(admission.FinalDischargeDate);
    }

    [Fact]
    public async Task Delete_NonFinalTransferLeavesFinalDischargeDateAlone()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 2, finalDischargeDate: new DateTime(2025, 1, 20));
        context.Transfers.AddRange(
            TestDb.Transfer(
                1, 1, new DateTime(2025, 1, 10),
                dischargeDate: new DateTime(2025, 1, 20),
                isFinalDischarge: true),
            TestDb.Transfer(2, 1, new DateTime(2025, 1, 5)));
        await context.SaveChangesAsync();

        var controller = new TransfersController(context).WithUser();

        Assert.IsType<NoContentResult>(await controller.Delete(2));
        var admission = await ReloadAdmission(context, 1);
        Assert.Equal(1, admission.CountOfTransfers);
        Assert.Equal(new DateTime(2025, 1, 20), admission.FinalDischargeDate);
    }

    [Fact]
    public async Task Delete_ReturnsNotFoundForUnknownId()
    {
        using var context = TestDb.CreateContext();
        var controller = new TransfersController(context).WithUser();

        Assert.IsType<NotFoundResult>(await controller.Delete(404));
    }

    [Fact]
    public async Task Delete_ForbidsWhenPrincipalHasNoUserName()
    {
        using var context = TestDb.CreateContext();
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();
        await ClearHistoryAsync(context);

        var controller = new TransfersController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.Delete(1));

        Assert.Equal(1, await context.Transfers.CountAsync());
        Assert.Equal(1, (await ReloadAdmission(context, 1)).CountOfTransfers);
        Assert.Empty(await context.EditHistory.ToListAsync());
    }

    [Fact]
    public async Task Delete_ChecksTheUserBeforeLookingTheTransferUp()
    {
        using var context = TestDb.CreateContext();
        var controller = new TransfersController(context).WithUser(null);

        Assert.IsType<ForbidResult>(await controller.Delete(404));
    }

    [Fact]
    public async Task Delete_AttributesTheRemovalToTheSignedInUser()
    {
        using var context = TestDb.CreateContext("nurse@example.com");
        SeedAdmission(context, 1, countOfTransfers: 1);
        context.Transfers.Add(TestDb.Transfer(1, 1, new DateTime(2025, 1, 10)));
        await context.SaveChangesAsync();
        await ClearHistoryAsync(context);

        var controller = new TransfersController(context).WithUser("nurse@example.com");

        Assert.IsType<NoContentResult>(await controller.Delete(1));

        var entry = Assert.Single(await context.EditHistory
            .Where(h => h.EntityType == nameof(Transfer))
            .ToListAsync());
        Assert.Equal(EditHistory.ChangeTypes.Delete, entry.ChangeType);
        Assert.Equal("1", entry.EntityId);
        Assert.Equal("nurse@example.com", entry.ChangedBy);
    }

    // ---------- helpers ----------

    private static async Task ClearHistoryAsync(ArcaneSynergyContext context)
    {
        context.EditHistory.RemoveRange(context.EditHistory);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Adds an admission (and the patient it hangs off) using the admission id
    /// as the patient id too, which keeps the fixtures short.
    /// </summary>
    private static void SeedAdmission(
        ArcaneSynergyContext context,
        int admissionId,
        int countOfTransfers = 0,
        DateTime? finalDischargeDate = null)
    {
        context.Patients.Add(TestDb.Patient(admissionId));
        context.Admissions.Add(TestDb.Admission(
            admissionId,
            admissionId,
            new DateTime(2025, 1, 1),
            finalDischargeDate: finalDischargeDate,
            countOfTransfers: countOfTransfers));
    }

    private static async Task<Admission> ReloadAdmission(ArcaneSynergyContext context, int admissionId) =>
        await context.Admissions.AsNoTracking().FirstAsync(a => a.AdmissionId == admissionId);

    private static int[] TransferIds(JsonNode payload) =>
        payload.Array("items").Select(i => i!.Int("TransferId")).ToArray();
}
