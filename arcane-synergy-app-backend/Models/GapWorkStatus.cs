using System.ComponentModel.DataAnnotations.Schema;

namespace arcane_synergy_app_backend.Models
{
    public class GapWorkStatus
    {
        public string Insurance { get; set; } = null!;
        [Column("Member_ID")]
        public string MemberId { get; set; } = null!;
        [Column("Metric_Type")]
        public string MetricType { get; set; } = null!;
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
