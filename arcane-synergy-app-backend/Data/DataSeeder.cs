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
                PatientID = "01",
                FirstName = "John",
                LastName = "Doe",
                DOB = new DateTime(1985, 4, 12),
                MRN = "MRN10001",
                Group = "DMC",
                Insurance = "United Health",
                PCP = "Dr. Smith",
                Clinic = "Sunrise Medical Clinic",
                FullName = "John Doe",
                Version = DateTime.UtcNow
            },
            new Patient
            {
                PatientID = "02",
                FirstName = "Emily",
                LastName = "Johnson",
                DOB = new DateTime(1993, 11, 2),
                MRN = "MRN10002",
                Group = "RGVAIMS",
                Insurance = "Blue Cross Blue Shield",
                PCP = "Dr. Martinez",
                Clinic = "Valley Health Center",
                FullName = "Emily Johnson",
                Version = DateTime.UtcNow
            }
        };

        foreach (var p in patients)
        {
            bool exists = context.Patients.Any(x => x.PatientID == p.PatientID);
            if (!exists)
                context.Patients.Add(p);
        }

        context.SaveChanges();

        var dbPatients = context.Patients.OrderBy(x => x.PatientID).ToList();
        foreach (var p in dbPatients)
            Console.WriteLine($"Seeded/Present: {p.PatientID} - {p.FullName}");
    }
}
