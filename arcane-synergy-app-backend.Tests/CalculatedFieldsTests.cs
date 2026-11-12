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
