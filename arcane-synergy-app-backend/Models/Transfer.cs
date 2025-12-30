namespace arcane_synergy_app_backend.Models
{
    public class Transfer
    {
        public int TransferId { get; set; }
        public int AdmissionId { get; set; }
        public Admission Admission { get; set; } = null!;
        public DateTime AdmissionDate { get; set; }
        public DateTime? DischargeDate { get; set; }
        public bool IsFinalDischarge { get; set; }
        public string? FacilityType { get; set; }
        public string? Facility { get; set; }
        public required string Type { get; set; }
        public DateTime? TimeOfAdmission { get; set; }
        public string? DX { get; set; }
        public string? NotificationSource { get; set; }
        public required DateTime DateNotified { get; set; }
        public string? DischargeTo { get; set; }
    }
}