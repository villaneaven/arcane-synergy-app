using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace arcane_synergy_app_backend.Models
{
    public class Patient
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int PatientID {  get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required DateTime DOB {  get; set; }
        public string? MRN { get; set; }   
        public required string Group { get; set; }
        public required string Insurance { get; set; }
        public string? PCP { get; set; }
        public string? Clinic { get; set; }

        // Calculated
        public string? FullName { get; set; }
        public DateTime Version { get; set; }

        [JsonIgnore]
        public ICollection<Admission>? Admissions { get; set; }


        // Calculations
        public void UpdateCalculatedFields()
        {
            FullName = $"{LastName}, {FirstName}";
            Version = DateTime.UtcNow;
        }

    }
}
