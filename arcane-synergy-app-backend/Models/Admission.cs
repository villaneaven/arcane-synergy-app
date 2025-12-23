namespace arcane_synergy_app_backend.Models
{
    public class Admission
    {
        public Patient Patient { get; set; } = null!;
        public int AdmissionId { get; set; }
        public string? FacilityType { get; set; }
        public string? Facility { get; set; }
        public required string Type { get; set; }
        public DateTime? TimeOfAdmission { get; set; }
        public string? DX { get; set; }
        public string? NotificationSource { get; set; }
        public required DateTime DateNotified { get; set; }
        public required DateTime AdmissionDate { get; set; }
        public DateTime? DischargeDate { get; set; }
        public string? DischargeTo { get; set; }
        public DateTime? DateSeen { get; set; }
        public string? SeenBy { get; set; } 
        
        //these will be calculated
        public string? PatientID { get; set; } 
        public int TotalERVisits { get; set; } 
        public int TotalADMVisits { get; set; } 
        public string? DayOfWeekAdmitted { get; set; } 
        public string? MonthAdmitted { get; set; } 
        public DateTime? TCMDueDate { get; set; } 
        public int PatientEngagement { get; set; }
        public bool ReadmissionFlag { get; set; }
        // This will get the next initial admission date
        public DateTime? NextAdmissionDate { get; set; }
        // This will get the Final Discharge Date from Transfer class where the final discharge flag is 1
        public DateTime? FinalDischargeDate { get; set; } 
        public int CountOfTransfers { get; set; }



        // Status will mark Done if the patient's transfers have been finalized and discharged and patient has been seen. 
        // In Transfer if Patient is not discharged from a transfer. 
        // Hospice if patient has been admitted to a hospice. 
        // Expired if passed away. 
        // To Be Seen if patient is pending being seen after discharge when transfers are finalized and done.
        // SNF if patient is in an SNF
        public string? Status { get; set; } 
        
        //references
        public ICollection<Transfer>? Transfers { get; set; } 
    }
}
