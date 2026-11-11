using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// Builds a throwaway EF Core in-memory context per test, so tests never share
/// state and never need a real SQL Server.
/// </summary>
internal static class TestDb
{
    public static ArcaneSynergyContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ArcaneSynergyContext>()
            .UseInMemoryDatabase($"test-{Guid.NewGuid()}")
            .Options;

        return new ArcaneSynergyContext(options);
    }

    public static Patient Patient(
        int id,
        string firstName = "Ada",
        string lastName = "Lovelace",
        string group = "DMC",
        string insurance = "Aetna",
        string? mrn = null,
        string? clinic = null,
        DateTime? dob = null)
    {
        var patient = new Patient
        {
            PatientID = id,
            FirstName = firstName,
            LastName = lastName,
            DOB = dob ?? new DateTime(1980, 1, 1),
            Group = group,
            Insurance = insurance,
            MRN = mrn,
            Clinic = clinic,
        };

        patient.UpdateCalculatedFields();
        return patient;
    }

    public static Admission Admission(
        int id,
        int patientId,
        DateTime admissionDate,
        string type = "ADM",
        DateTime? dateNotified = null,
        DateTime? dischargeDate = null,
        DateTime? finalDischargeDate = null,
        DateTime? dateSeen = null)
    {
        var admission = new Admission
        {
            AdmissionId = id,
            PatientID = patientId,
            Type = type,
            AdmissionDate = admissionDate,
            DateNotified = dateNotified ?? admissionDate,
            DischargeDate = dischargeDate,
            FinalDischargeDate = finalDischargeDate,
            DateSeen = dateSeen,
        };

        admission.UpdateCalculatedFields();
        return admission;
    }

    /// <summary>First day of the month, <paramref name="monthsAgo"/> months back.</summary>
    public static DateTime MonthsAgo(int monthsAgo)
    {
        var currentMonthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        return currentMonthStart.AddMonths(-monthsAgo);
    }
}
