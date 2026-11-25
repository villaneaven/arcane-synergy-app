using arcane_synergy_app_backend.Models;

namespace arcane_synergy_app_backend.Tests;

public class CalculatedFieldsTests
{
    [Fact]
    public void Admission_DerivesDayOfWeekAndMonthFromAdmissionDate()
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 10), // a Monday
            DateNotified = new DateTime(2025, 3, 10),
        };

        admission.UpdateCalculatedFields();

        Assert.Equal("Monday", admission.DayOfWeekAdmitted);
        Assert.Equal("March", admission.MonthAdmitted);
    }

    [Theory]
    [InlineData(false, false, "Current")]  // still admitted
    [InlineData(false, true, "Current")]   // seen, but no discharge date yet
    [InlineData(true, false, "Pending")]   // discharged, not seen
    [InlineData(true, true, "Completed")]  // discharged and seen
    public void Admission_DerivesStatusFromDischargeDateAndDateSeen(
        bool hasDischargeDate, bool hasDateSeen, string expected)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 1),
            DateNotified = new DateTime(2025, 1, 1),
            DischargeDate = hasDischargeDate ? new DateTime(2025, 1, 5) : null,
            DateSeen = hasDateSeen ? new DateTime(2025, 1, 7) : null,
        };

        admission.UpdateCalculatedFields();

        Assert.Equal(expected, admission.Status);
    }

    [Theory]
    // dischargeDay / seenDay are days in Jan 2025; null means the field is empty.
    [InlineData(null, null, null)]                                                     // neither set
    [InlineData(5, null, null)]                                                        // discharged, not seen yet
    [InlineData(null, 7, "Date Seen requires a Discharge Date.")]                      // seen without discharge
    [InlineData(5, 4, "Date Seen must be on or after the Discharge Date.")]            // seen before discharge
    [InlineData(5, 5, null)]                                                           // same day
    [InlineData(5, 7, null)]                                                           // after discharge
    public void Admission_ValidatesDateSeenAgainstDischargeDate(
        int? dischargeDay, int? seenDay, string? expectedError)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 1),
            DateNotified = new DateTime(2025, 1, 1),
            DischargeDate = dischargeDay.HasValue ? new DateTime(2025, 1, dischargeDay.Value) : null,
            DateSeen = seenDay.HasValue ? new DateTime(2025, 1, seenDay.Value) : null,
        };

        Assert.Equal(expectedError, admission.ValidateDateSeen(new DateOnly(2025, 1, 20)));
    }

    [Theory]
    // seenDay is a day in Mar 2025; discharged Mar 10, "today" is Mar 20.
    [InlineData(19, null)]                                       // yesterday
    [InlineData(20, null)]                                       // today
    [InlineData(21, "Date Seen must be today or earlier.")]      // tomorrow
    public void Admission_ValidatesDateSeenNotInFuture(int seenDay, string? expectedError)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1),
            DateNotified = new DateTime(2025, 3, 1),
            DischargeDate = new DateTime(2025, 3, 10),
            DateSeen = new DateTime(2025, 3, seenDay),
        };

        Assert.Equal(expectedError, admission.ValidateDateSeen(new DateOnly(2025, 3, 20)));
    }

    [Theory]
    // dischargeDay is a day in Mar 2025; "today" is Mar 20. null means the field is empty.
    [InlineData(null, null)]                                          // no discharge
    [InlineData(19, null)]                                            // yesterday
    [InlineData(20, null)]                                            // today
    [InlineData(21, "Discharge Date must be today or earlier.")]      // tomorrow
    public void Admission_ValidatesDischargeDateNotInFuture(int? dischargeDay, string? expectedError)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1),
            DateNotified = new DateTime(2025, 3, 1),
            DischargeDate = dischargeDay.HasValue ? new DateTime(2025, 3, dischargeDay.Value) : null,
        };

        Assert.Equal(expectedError, admission.ValidateDischargeDate(new DateOnly(2025, 3, 20)));
    }

    [Fact]
    public void Admission_DischargeLaterTodayIsValid()
    {
        // Compared by day, so a time later today is still "today".
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1),
            DateNotified = new DateTime(2025, 3, 1),
            DischargeDate = new DateTime(2025, 3, 20, 23, 30, 0),
        };

        Assert.Null(admission.ValidateDischargeDate(new DateOnly(2025, 3, 20)));
    }

    [Theory]
    // Admitted Jan 5 2025; dischargeDay is a day in Jan 2025. Both at 12:00 UTC
    // (06:00 at the clinic), so the UTC and clinic days match.
    [InlineData(4, "Discharge Date must be on or after the Admission Date.")] // day before
    [InlineData(5, null)]                                                     // same day
    [InlineData(6, null)]                                                     // day after
    public void Admission_ValidatesDischargeDateNotBeforeAdmissionDate(
        int dischargeDay, string? expectedError)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
            DateNotified = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
            DischargeDate = new DateTime(2025, 1, dischargeDay, 12, 0, 0, DateTimeKind.Utc),
        };

        Assert.Equal(expectedError, admission.ValidateDischargeDate(new DateOnly(2025, 1, 20)));
    }

    [Fact]
    public void Admission_SameDayDischargeAfterEveningAdmissionIsValid()
    {
        // Admitted Jan 5 at 8 PM clinic time, which is already Jan 6 in UTC.
        // Discharged Jan 5 (date only: midnight clinic time). Same clinic day, so valid.
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 6, 2, 0, 0, DateTimeKind.Utc),
            DateNotified = new DateTime(2025, 1, 6, 2, 0, 0, DateTimeKind.Utc),
            DischargeDate = new DateTime(2025, 1, 5, 6, 0, 0, DateTimeKind.Utc),
        };

        Assert.Null(admission.ValidateDischargeDate(new DateOnly(2025, 1, 20)));
    }

    [Theory]
    // Same cases for a transfer: admitted Jan 5 2025 at 12:00 UTC.
    [InlineData(4, "Discharge Date must be on or after the Admission Date.")] // day before
    [InlineData(5, null)]                                                     // same day
    [InlineData(6, null)]                                                     // day after
    public void Transfer_ValidatesDischargeDateNotBeforeAdmissionDate(
        int dischargeDay, string? expectedError)
    {
        var transfer = new Transfer
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
            DateNotified = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
            DischargeDate = new DateTime(2025, 1, dischargeDay, 12, 0, 0, DateTimeKind.Utc),
        };

        Assert.Equal(expectedError, transfer.ValidateDischargeDate(new DateOnly(2025, 1, 20)));
    }

    [Fact]
    public void Transfer_WithoutDischargeDateIsValid()
    {
        var transfer = new Transfer
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
            DateNotified = new DateTime(2025, 1, 5, 12, 0, 0, DateTimeKind.Utc),
        };

        Assert.Null(transfer.ValidateDischargeDate(new DateOnly(2025, 1, 20)));
    }

    [Theory]
    // Admitted Mar 1 2025; dischargeDay is a day in Mar 2025; "today" is Mar 20.
    [InlineData(19, null)]                                        // yesterday
    [InlineData(20, null)]                                        // today
    [InlineData(21, "Discharge Date must be today or earlier.")]  // tomorrow
    public void Transfer_ValidatesDischargeDateNotInFuture(int dischargeDay, string? expectedError)
    {
        var transfer = new Transfer
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1, 12, 0, 0, DateTimeKind.Utc),
            DateNotified = new DateTime(2025, 3, 1, 12, 0, 0, DateTimeKind.Utc),
            DischargeDate = new DateTime(2025, 3, dischargeDay, 12, 0, 0, DateTimeKind.Utc),
        };

        Assert.Equal(expectedError, transfer.ValidateDischargeDate(new DateOnly(2025, 3, 20)));
    }

    [Theory]
    // notifiedDay is a day in Mar 2025; "today" is Mar 20.
    [InlineData(19, null)]                                       // yesterday
    [InlineData(20, null)]                                       // today
    [InlineData(21, "Date Notified must be today or earlier.")]  // tomorrow
    public void Admission_ValidatesDateNotifiedNotInFuture(int notifiedDay, string? expectedError)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1),
            DateNotified = new DateTime(2025, 3, notifiedDay),
        };

        Assert.Equal(expectedError, admission.ValidateDateNotified(new DateOnly(2025, 3, 20)));
    }

    [Theory]
    // notifiedDay is a day in Mar 2025; "today" is Mar 20.
    [InlineData(19, null)]                                       // yesterday
    [InlineData(20, null)]                                       // today
    [InlineData(21, "Date Notified must be today or earlier.")]  // tomorrow
    public void Transfer_ValidatesDateNotifiedNotInFuture(int notifiedDay, string? expectedError)
    {
        var transfer = new Transfer
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 3, 1),
            DateNotified = new DateTime(2025, 3, notifiedDay),
        };

        Assert.Equal(expectedError, transfer.ValidateDateNotified(new DateOnly(2025, 3, 20)));
    }

    [Fact]
    public void Admission_DateSeenOnDischargeDayIsValidRegardlessOfTime()
    {
        // Discharged in the evening, seen earlier the same day: compared by day, so valid.
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 1),
            DateNotified = new DateTime(2025, 1, 1),
            DischargeDate = new DateTime(2025, 1, 5, 18, 0, 0),
            DateSeen = new DateTime(2025, 1, 5, 9, 0, 0),
        };

        Assert.Null(admission.ValidateDateSeen(new DateOnly(2025, 1, 20)));
    }

    [Theory]
    // Days in Mar 2025; "today" is Mar 20. null means the field is empty.
    [InlineData(null, null, null)]  // no discharge -> blank
    [InlineData(10, 14, 4)]         // seen: Date Seen - Discharge Date
    [InlineData(10, 10, 0)]         // seen on discharge day
    [InlineData(10, null, 10)]      // not seen: today - Discharge Date
    [InlineData(20, null, 0)]       // discharged today
    public void Admission_CalculatesPatientEngagement(int? dischargeDay, int? seenDay, int? expected)
    {
        var today = new DateTime(2025, 3, 20);

        var result = Admission.CalculatePatientEngagement(
            dischargeDay.HasValue ? new DateTime(2025, 3, dischargeDay.Value) : null,
            seenDay.HasValue ? new DateTime(2025, 3, seenDay.Value) : null,
            today);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void Admission_PatientEngagementIgnoresTimeOfDay()
    {
        // Discharged in the evening, seen the next morning: one calendar day.
        Assert.Equal(1, Admission.CalculatePatientEngagement(
            new DateTime(2025, 3, 10, 22, 0, 0),
            new DateTime(2025, 3, 11, 8, 0, 0),
            new DateTime(2025, 3, 20)));

        // Not seen; "today" carries a time but only the date counts.
        Assert.Equal(10, Admission.CalculatePatientEngagement(
            new DateTime(2025, 3, 10, 22, 0, 0),
            null,
            new DateTime(2025, 3, 20, 1, 0, 0)));
    }

    [Theory]
    // A readmission within 30 days of the final discharge.
    [InlineData(1, true)]
    [InlineData(30, true)]
    // Exactly outside the window.
    [InlineData(31, false)]
    [InlineData(90, false)]
    public void Admission_FlagsReadmissionWithinThirtyDaysOfFinalDischarge(int daysAfter, bool expected)
    {
        var finalDischarge = new DateTime(2025, 1, 1);
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2024, 12, 20),
            DateNotified = new DateTime(2024, 12, 20),
            FinalDischargeDate = finalDischarge,
            NextAdmissionDate = finalDischarge.AddDays(daysAfter),
        };

        admission.UpdateCalculatedFields();

        Assert.Equal(expected, admission.ReadmissionFlag);
    }

    [Theory]
    [InlineData(false, false)] // neither date known
    [InlineData(true, false)]  // next admission known, no final discharge
    [InlineData(false, true)]  // final discharge known, no next admission
    public void Admission_DoesNotFlagReadmissionWhenEitherDateIsMissing(
        bool hasNextAdmission,
        bool hasFinalDischarge)
    {
        var admission = new Admission
        {
            Type = "ADM",
            AdmissionDate = new DateTime(2025, 1, 1),
            DateNotified = new DateTime(2025, 1, 1),
            NextAdmissionDate = hasNextAdmission ? new DateTime(2025, 1, 5) : null,
            FinalDischargeDate = hasFinalDischarge ? new DateTime(2025, 1, 2) : null,
            // Start from a stale true to prove the flag gets reset.
            ReadmissionFlag = true,
        };

        admission.UpdateCalculatedFields();

        Assert.False(admission.ReadmissionFlag);
    }

    [Fact]
    public void Patient_BuildsFullNameAsLastCommaFirstAndStampsVersion()
    {
        var before = DateTime.UtcNow;
        var patient = new Patient
        {
            FirstName = "Ada",
            LastName = "Lovelace",
            DOB = new DateTime(1815, 12, 10),
            Group = "DMC",
            Insurance = "Aetna",
        };

        patient.UpdateCalculatedFields();

        Assert.Equal("Lovelace, Ada", patient.FullName);
        Assert.InRange(patient.Version, before, DateTime.UtcNow);
    }
}
