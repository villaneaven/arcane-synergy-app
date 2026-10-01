using System.ComponentModel.DataAnnotations.Schema;

namespace arcane_synergy_app_backend.Models
{
    // Read-only row of the dbo.GapWorklist view.
    public class GapWorklistItem
    {
        public string Insurance { get; set; } = null!;
        [Column("Member_ID")]
        public string MemberId { get; set; } = null!;
        [Column("Metric_Type")]
        public string MetricType { get; set; } = null!;
        public string? Name { get; set; }
        public DateOnly? DOB { get; set; }
        [Column("Provider_Name")]
        public string? ProviderName { get; set; }
        [Column("Provider_NPI")]
        public string? ProviderNpi { get; set; }
        public string? Phone { get; set; }
        [Column("Roster_Date")]
        public DateOnly? RosterDate { get; set; }
        [Column("Work_Item_Type")]
        public string? WorkItemType { get; set; }
        [Column("Source_Review_Status")]
        public string? SourceReviewStatus { get; set; }
        [Column("First_Seen_Date")]
        public DateOnly FirstSeenDate { get; set; }
        [Column("Last_Seen_Date")]
        public DateOnly LastSeenDate { get; set; }
        [Column("Team_Status")]
        public string? TeamStatus { get; set; }
        [Column("Status_Date")]
        public DateOnly? StatusDate { get; set; }
        [Column("Updated_At")]
        public DateTime? UpdatedAt { get; set; }
        [Column("Updated_By")]
        public string? UpdatedBy { get; set; }
    }
}
