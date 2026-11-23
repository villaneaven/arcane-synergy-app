using System.Security.Claims;
using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;
using arcane_synergy_app_backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace arcane_synergy_app_backend.Tests;

/// <summary>
/// Builds a throwaway EF Core in-memory context per test, so tests never share
/// state and never need a real SQL Server.
/// </summary>
internal static class TestDb
{
    public const string DefaultUserName = "test.user@example.com";

    /// <param name="userName">
    /// User the context attributes edit history to. Null stands in for a save
    /// made outside a request, which is recorded as "system".
    /// </param>
    public static ArcaneSynergyContext CreateContext(string? userName = null)
    {
        var options = new DbContextOptionsBuilder<ArcaneSynergyContext>()
            .UseInMemoryDatabase($"test-{Guid.NewGuid()}")
            .Options;

        return new ArcaneSynergyContext(options, new StubCurrentUserAccessor(userName));
    }

    private sealed class StubCurrentUserAccessor : ICurrentUserAccessor
    {
        public StubCurrentUserAccessor(string? userName) => UserName = userName;

        public string? UserName { get; }
    }

    /// <summary>
    /// GapWorklist is a keyless view in production, and EF refuses to track a
    /// keyless type, so tests cannot seed it through the ordinary context. This
    /// context gives those rows the triple that already identifies a gap
    /// everywhere else in the code, which is enough for the in-memory provider
    /// to store and query them. Nothing else about the model changes.
    /// </summary>
    public static ArcaneSynergyContext CreateGapsContext(string? userName = null)
    {
        var options = new DbContextOptionsBuilder<ArcaneSynergyContext>()
            .UseInMemoryDatabase($"test-gaps-{Guid.NewGuid()}")
            .Options;

        return new KeyedGapWorklistContext(options, new StubCurrentUserAccessor(userName));
    }

    private sealed class KeyedGapWorklistContext : ArcaneSynergyContext
    {
        public KeyedGapWorklistContext(
            DbContextOptions<ArcaneSynergyContext> options,
            ICurrentUserAccessor? currentUser)
            : base(options, currentUser)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<GapWorklistItem>()
                .HasKey(g => new { g.Insurance, g.MemberId, g.MetricType });
        }
    }

    public static GapWorklistItem Gap(
        string memberId,
        string insurance = "Aetna",
        string metricType = "A1C",
        string? name = null,
        string? providerName = null,
        string? groupName = null,
        string? workItemType = null,
        string? teamStatus = null,
        DateOnly? statusDate = null,
        DateOnly? dob = null,
        DateOnly? lastSeenDate = null)
    {
        return new GapWorklistItem
        {
            Insurance = insurance,
            MemberId = memberId,
            MetricType = metricType,
            Name = name,
            ProviderName = providerName,
            GroupName = groupName,
            WorkItemType = workItemType,
            TeamStatus = teamStatus,
            StatusDate = statusDate,
            DOB = dob ?? new DateOnly(1980, 1, 1),
            FirstSeenDate = new DateOnly(2025, 1, 1),
            LastSeenDate = lastSeenDate ?? new DateOnly(2025, 1, 1),
        };
    }

    public static GapWorkStatus GapStatus(
        string memberId,
        string insurance = "Aetna",
        string metricType = "A1C",
        string teamStatus = "Pending",
        DateOnly? statusDate = null,
        DateTime? updatedAt = null,
        string? updatedBy = null)
    {
        return new GapWorkStatus
        {
            Insurance = insurance,
            MemberId = memberId,
            MetricType = metricType,
            TeamStatus = teamStatus,
            StatusDate = statusDate ?? new DateOnly(2025, 1, 1),
            UpdatedAt = updatedAt ?? new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc),
            UpdatedBy = updatedBy ?? "previous.user@example.com",
        };
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
        DateTime? dateSeen = null,
        int countOfTransfers = 0)
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
            CountOfTransfers = countOfTransfers,
        };

        admission.UpdateCalculatedFields();
        return admission;
    }

    public static Transfer Transfer(
        int id,
        int admissionId,
        DateTime admissionDate,
        string type = "ADM",
        DateTime? dateNotified = null,
        DateTime? dischargeDate = null,
        bool isFinalDischarge = false,
        string? facility = null)
    {
        return new Transfer
        {
            TransferId = id,
            AdmissionId = admissionId,
            Type = type,
            AdmissionDate = admissionDate,
            DateNotified = dateNotified ?? admissionDate,
            DischargeDate = dischargeDate,
            IsFinalDischarge = isFinalDischarge,
            Facility = facility,
        };
    }

    /// <summary>
    /// Gives the controller the authenticated principal that the real request
    /// pipeline would supply. Actions that stamp audit fields read
    /// <c>User.GetUserName()</c>, and <c>ControllerBase.User</c> is null until a
    /// <see cref="ControllerContext"/> exists. Pass <c>null</c> to simulate a
    /// token that carries none of the recognised username claims.
    /// </summary>
    public static T WithUser<T>(this T controller, string? userName = DefaultUserName)
        where T : ControllerBase
    {
        var claims = userName is null
            ? Array.Empty<Claim>()
            : new[] { new Claim("preferred_username", userName) };

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")),
            },
        };

        return controller;
    }

    /// <summary>First day of the month, <paramref name="monthsAgo"/> months back.</summary>
    public static DateTime MonthsAgo(int monthsAgo)
    {
        var currentMonthStart = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        return currentMonthStart.AddMonths(-monthsAgo);
    }
}
