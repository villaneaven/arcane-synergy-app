namespace arcane_synergy_app_backend.Models
{
    public class Patient
    {
        public required string PatientID {  get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required DateTime DOB {  get; set; }
        public string? MRN { get; set; }   
        public required string Group { get; set; }
        public required string Insurance { get; set; }
        public string? PCP { get; set; }
        public string? Clinic { get; set; }

        // Calculated
        public required string FullName { get; set; }
        public required DateTime Version { get; set; } = DateTime.UtcNow;

        public ICollection<Admission>? Admissions { get; set; }

    }
}
