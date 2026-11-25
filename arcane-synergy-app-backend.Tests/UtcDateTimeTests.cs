using System.Text.Json;
using arcane_synergy_app_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// SQL Server's datetime2 drops DateTimeKind, so dates come back Unspecified and
/// serialize without a "Z", which the browser then reads as local time. These
/// save Unspecified values (as SQL Server would return them) and check they are
/// read back, and serialized, as UTC.
/// </summary>
public class UtcDateTimeTests
{
    private static readonly DateTime SevenThirtyCentral = new(2025, 3, 10, 12, 30, 0, DateTimeKind.Unspecified);

    [Fact]
    public async Task AdmissionDates_AreReadBackAsUtc()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(
            1, 1, SevenThirtyCentral,
            dischargeDate: SevenThirtyCentral,
            dateSeen: SevenThirtyCentral,
            finalDischargeDate: SevenThirtyCentral));
        await context.SaveChangesAsync();

        var saved = await context.Admissions.AsNoTracking().SingleAsync();

        Assert.Equal(DateTimeKind.Utc, saved.AdmissionDate.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.DateNotified.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.DischargeDate!.Value.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.DateSeen!.Value.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.FinalDischargeDate!.Value.Kind);
        Assert.Equal(SevenThirtyCentral.Ticks, saved.AdmissionDate.Ticks);
        Assert.Contains("\"2025-03-10T12:30:00Z\"", JsonSerializer.Serialize(saved));
    }

    [Fact]
    public async Task TransferDates_AreReadBackAsUtc()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1));
        context.Admissions.Add(TestDb.Admission(1, 1, new DateTime(2025, 3, 1, 0, 0, 0, DateTimeKind.Utc)));
        var transfer = TestDb.Transfer(1, 1, SevenThirtyCentral, dischargeDate: SevenThirtyCentral);
        transfer.TimeOfAdmission = SevenThirtyCentral;
        context.Transfers.Add(transfer);
        await context.SaveChangesAsync();

        var saved = await context.Transfers.AsNoTracking().SingleAsync();

        Assert.Equal(DateTimeKind.Utc, saved.AdmissionDate.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.DateNotified.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.DischargeDate!.Value.Kind);
        Assert.Equal(DateTimeKind.Utc, saved.TimeOfAdmission!.Value.Kind);
    }

    [Fact]
    public async Task PatientDob_IsLeftUnspecified()
    {
        using var context = TestDb.CreateContext();
        context.Patients.Add(TestDb.Patient(1, dob: new DateTime(1980, 1, 1)));
        await context.SaveChangesAsync();

        var saved = await context.Patients.AsNoTracking().SingleAsync();

        Assert.Equal(DateTimeKind.Unspecified, saved.DOB.Kind);
    }
}
