using arcane_synergy_app_backend.Data;
using arcane_synergy_app_backend.Models;

public static class DataSeeder
{
    public static void Seed(ArcaneSynergyContext context)
    {
        var patients = new List<Patient>
        {
            new Patient
            {
                FirstName = "John",
                LastName = "Doe",
                DOB = new DateTime(1985, 4, 12),
                MRN = "MRN10001",
                Group = "DMC",
                Insurance = "United Health",
                PCP = "Dr. Smith",
                Clinic = "Sunrise Medical Clinic",
            },
            new Patient
            {
                FirstName = "Emily",
                LastName = "Johnson",
                DOB = new DateTime(1993, 11, 2),
                MRN = "MRN10002",
                Group = "RGVAIMS",
                Insurance = "Blue Cross Blue Shield",
                PCP = "Dr. Martinez",
                Clinic = "Valley Health Center",
            }
        };

        foreach (var patient in patients)
        {
            bool exists = context.Patients.Any(p => p.MRN == patient.MRN);
            if (!exists)
            {
                patient.UpdateCalculatedFields(); 
                context.Patients.Add(patient);
            }
        }

        context.SaveChanges();

        var dbPatients = context.Patients
            .OrderBy(p => p.PatientID)
            .ToList();

        var patientLookup = dbPatients
            .Where(p => !string.IsNullOrWhiteSpace(p.MRN))
            .ToLookup(p => (Group: p.Group ?? string.Empty, MRN: p.MRN!));

        var admissions = new List<Admission>
        {
            new Admission
            {
                PatientID = patientLookup[("DMC", "MRN10001")].Select(p => p.PatientID).FirstOrDefault(),
                FacilityType = "Hospital",
                Facility = "DMC Main Campus",
                Type = "Emergency",
                TimeOfAdmission = new DateTime(2025, 12, 5, 9, 30, 0, DateTimeKind.Utc),
                DX = "Chest pain",
                NotificationSource = "ER Nurse",
                DateNotified = new DateTime(2025, 12, 5, 10, 0, 0, DateTimeKind.Utc),
                AdmissionDate = new DateTime(2025, 12, 5, 9, 30, 0, DateTimeKind.Utc),
                DischargeDate = new DateTime(2025, 12, 8, 15, 0, 0, DateTimeKind.Utc),
                DischargeTo = "Home",
                DateSeen = new DateTime(2025, 12, 6, 14, 0, 0, DateTimeKind.Utc),
                SeenBy = "TCM Team",
                NextAdmissionDate = new DateTime(2026, 1, 10, 8, 0, 0, DateTimeKind.Utc),
                FinalDischargeDate = new DateTime(2025, 12, 8, 15, 0, 0, DateTimeKind.Utc),
                CountOfTransfers = 1,
                Status = "Done"
            },
            new Admission
            {
                PatientID = patientLookup[("RGVAIMS", "MRN10002")].Select(p => p.PatientID).FirstOrDefault(),
                FacilityType = "SNF",
                Facility = "Valley Recovery Center",
                Type = "Post-Acute",
                TimeOfAdmission = new DateTime(2025, 11, 20, 16, 0, 0, DateTimeKind.Utc),
                DX = "Knee replacement rehab",
                NotificationSource = "Facility Fax",
                DateNotified = new DateTime(2025, 11, 20, 16, 30, 0, DateTimeKind.Utc),
                AdmissionDate = new DateTime(2025, 11, 20, 16, 0, 0, DateTimeKind.Utc),
                DischargeDate = new DateTime(2025, 12, 3, 10, 0, 0, DateTimeKind.Utc),
                DischargeTo = "Home with HH",
                DateSeen = new DateTime(2025, 11, 22, 11, 0, 0, DateTimeKind.Utc),
                SeenBy = "Care Coordinator",
                FinalDischargeDate = new DateTime(2025, 12, 3, 10, 0, 0, DateTimeKind.Utc),
                CountOfTransfers = 0,
                Status = "To Be Seen"
            },
            new Admission
            {
                PatientID = patientLookup[("DMC", "MRN10001")].Select(p => p.PatientID).FirstOrDefault(),
                FacilityType = "Hospital",
                Facility = "DMC Main Campus",
                Type = "Readmission",
                TimeOfAdmission = new DateTime(2026, 1, 10, 8, 0, 0, DateTimeKind.Utc),
                DX = "Shortness of breath",
                NotificationSource = "CareLink",
                DateNotified = new DateTime(2026, 1, 10, 8, 30, 0, DateTimeKind.Utc),
                AdmissionDate = new DateTime(2026, 1, 10, 8, 0, 0, DateTimeKind.Utc),
                DischargeTo = "SNF",
                DateSeen = new DateTime(2026, 1, 11, 9, 0, 0, DateTimeKind.Utc),
                SeenBy = "Hospitalist",
                FinalDischargeDate = null,
                CountOfTransfers = 0,
                Status = "In Progress"
            }
        };

        foreach (var admission in admissions)
        {
            if (admission.PatientID == 0)
                continue;

            bool exists = context.Admissions.Any(a =>
                a.PatientID == admission.PatientID &&
                a.AdmissionDate == admission.AdmissionDate &&
                a.Type == admission.Type);

            if (!exists)
            {
                admission.UpdateCalculatedFields();
                context.Admissions.Add(admission);
            }
        }

        context.SaveChanges();

        foreach (var p in dbPatients)
            Console.WriteLine($"Seeded/Present: {p.PatientID} - {p.FullName}");

        var dbAdmissions = context.Admissions
            .OrderBy(a => a.AdmissionId)
            .ToList();

        foreach (var a in dbAdmissions)
            Console.WriteLine($"Seeded/Present Admission: {a.AdmissionId} - Patient {a.PatientID} - {a.Type} on {a.AdmissionDate:yyyy-MM-dd}");
    }
}
