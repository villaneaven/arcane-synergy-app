using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace arcane_synergy_app_backend.Models
{
    /// <summary>
    /// One row per field changed by a user (or one row for an insert/delete).
    /// Written automatically by <c>ArcaneSynergyContext.SaveChanges</c>; nothing
    /// in the app should add rows to this table by hand.
    /// </summary>
    public class EditHistory
    {
        /// <summary>Change kinds stored in <see cref="ChangeType"/>.</summary>
        public static class ChangeTypes
        {
            public const string Insert = "Insert";
            public const string Update = "Update";
            public const string Delete = "Delete";
        }

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long EditHistoryId { get; set; }

        /// <summary>CLR name of the audited entity, e.g. "Admission".</summary>
        [MaxLength(100)]
        public required string EntityType { get; set; }

        /// <summary>
        /// Primary key of the audited row as text. Composite keys are joined
        /// with "|" so a single column can address any audited entity.
        /// </summary>
        [MaxLength(100)]
        public required string EntityId { get; set; }

        /// <summary>Insert, Update or Delete. See <see cref="ChangeTypes"/>.</summary>
        [MaxLength(20)]
        public required string ChangeType { get; set; }

        /// <summary>
        /// Property that changed. Null for inserts and deletes, which are
        /// recorded as a single row for the whole entity.
        /// </summary>
        [MaxLength(128)]
        public string? FieldName { get; set; }

        [MaxLength(EditHistoryLimits.ValueLength)]
        public string? OldValue { get; set; }

        [MaxLength(EditHistoryLimits.ValueLength)]
        public string? NewValue { get; set; }

        /// <summary>
        /// Signed-in user who made the change, or "system" for changes made
        /// outside a request (seeding, background work).
        /// </summary>
        [MaxLength(255)]
        public required string ChangedBy { get; set; }

        /// <summary>UTC timestamp of the change.</summary>
        public DateTime ChangedAt { get; set; }
    }

    public static class EditHistoryLimits
    {
        /// <summary>Longest old/new value kept; longer values are truncated.</summary>
        public const int ValueLength = 4000;
    }
}
