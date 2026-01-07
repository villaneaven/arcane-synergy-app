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

        foreach (var p in dbPatients)
            Console.WriteLine($"Seeded/Present: {p.PatientID} - {p.FullName}");
    }
}
