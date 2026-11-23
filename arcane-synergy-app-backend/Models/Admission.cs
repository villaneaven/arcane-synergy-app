using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using arcane_synergy_app_backend.Services;

namespace arcane_synergy_app_backend.Models
{
    public class Admission
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AdmissionId { get; set; }
        public int PatientID { get; set; }
        public Patient? Patient { get; set; }
        public string? FacilityType { get; set; }
        public string? Facility { get; set; }
        [MaxLength(450)]
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
        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(255)]
        public string? LastEditedBy { get; set; }
        public DateTime? LastEditedAt { get; set; }

        //these will be calculated
        public int TotalERVisits { get; set; }
        public int TotalADMVisits { get; set; }
        public string? DayOfWeekAdmitted { get; set; }
        public string? MonthAdmitted { get; set; }
        public DateTime? TCMDueDate { get; set; }
        // Days from Discharge Date to Date Seen (or to today if not seen yet); null without
        // a Discharge Date. Changes daily, so it is never stored: call
        // ApplyPatientEngagement(today) after loading an admission.
        [NotMapped]
        public int? PatientEngagement { get; set; }
        public bool ReadmissionFlag { get; set; }
        // This will get the next initial admission date
        public DateTime? NextAdmissionDate { get; set; }
        // This will get the Final Discharge Date from Transfer class where the final discharge flag is 1
        public DateTime? FinalDischargeDate { get; set; }
        public int CountOfTransfers { get; set; }

        // Derived in UpdateCalculatedFields:
        // Current   - no Discharge Date yet.
        // Pending   - has a Discharge Date but Date Seen is empty.
        // Completed - has a Discharge Date and Date Seen.
        public string? Status { get; set; }

        public const string StatusCurrent = "Current";
        public const string StatusPending = "Pending";
        public const string StatusCompleted = "Completed";

        //references
        public ICollection<Transfer>? Transfers { get; set; }

        public string? ValidateDischargeDate(DateOnly today)
        {
            if (!DischargeDate.HasValue) return null;
            if (DateOnly.FromDateTime(DischargeDate.Value) > today)
                return "Discharge Date must be today or earlier.";
            if (ClinicTime.DateFor(DischargeDate.Value) < ClinicTime.DateFor(AdmissionDate))
                return "Discharge Date must be on or after the Admission Date.";
            return null;
        }

        public string? ValidateDateSeen()
        {
            if (!DateSeen.HasValue) return null;
            if (!DischargeDate.HasValue)
                return "Date Seen requires a Discharge Date.";
            if (DateSeen.Value.Date < DischargeDate.Value.Date)
                return "Date Seen must be on or after the Discharge Date.";
            return null;
        }

        // Whole calendar days, ignoring time of day.
        public static int? CalculatePatientEngagement(DateTime? dischargeDate, DateTime? dateSeen, DateTime today)
        {
            if (!dischargeDate.HasValue) return null;
            var end = dateSeen ?? today;
            return (end.Date - dischargeDate.Value.Date).Days;
        }

        public void ApplyPatientEngagement(DateTime today)
        {
            PatientEngagement = CalculatePatientEngagement(DischargeDate, DateSeen, today);
        }

        // temp calculations
        public void UpdateCalculatedFields()
        {
            DayOfWeekAdmitted = AdmissionDate.DayOfWeek.ToString();
            MonthAdmitted = AdmissionDate.ToString("MMMM");
            if (NextAdmissionDate.HasValue && FinalDischargeDate.HasValue)
            {
                ReadmissionFlag = (NextAdmissionDate.Value - FinalDischargeDate.Value).TotalDays <= 30;
            }
            else
            {
                ReadmissionFlag = false;
            }

            Status = !DischargeDate.HasValue
                ? StatusCurrent
                : DateSeen.HasValue ? StatusCompleted : StatusPending;
        }
    }
}
