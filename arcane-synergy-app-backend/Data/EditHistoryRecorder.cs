using System.Globalization;
using arcane_synergy_app_backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace arcane_synergy_app_backend.Data;

/// <summary>
/// Turns the change tracker's pending changes into <see cref="EditHistory"/>
/// rows: who changed an audited entity, when, and which fields moved.
/// </summary>
internal static class EditHistoryRecorder
{
    /// <summary>Attribution used for changes made outside an HTTP request.</summary>
    public const string SystemUser = "system";

    /// <summary>Entities whose edits are tracked.</summary>
    private static readonly HashSet<Type> AuditedTypes = new()
    {
        typeof(Patient),
        typeof(Admission),
        typeof(Transfer),
    };

    /// <summary>
    /// Audit stamps and fields recomputed from other fields. They change on
    /// nearly every save, so logging them would bury the fields a user
    /// actually edited.
    /// </summary>
    private static readonly HashSet<string> IgnoredProperties = new(StringComparer.Ordinal)
    {
        nameof(Admission.LastEditedBy),
        nameof(Admission.LastEditedAt),
        nameof(Patient.FullName),
        nameof(Patient.Version),
        nameof(Admission.DayOfWeekAdmitted),
        nameof(Admission.MonthAdmitted),
    };

    /// <summary>
    /// Snapshots the pending changes. Call before saving: original values are
    /// only available while the entries are still tracked as changed.
    /// </summary>
    public static List<PendingEditHistory> Capture(ChangeTracker changeTracker, string? userName)
    {
        changeTracker.DetectChanges();

        var changedBy = Truncate(
            string.IsNullOrWhiteSpace(userName) ? SystemUser : userName.Trim(),
            255)!;
        var changedAt = DateTime.UtcNow;
        var pending = new List<PendingEditHistory>();

        foreach (var entry in changeTracker.Entries())
        {
            if (!AuditedTypes.Contains(entry.Metadata.ClrType))
                continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    pending.Add(new PendingEditHistory(
                        entry,
                        NewRecord(entry, EditHistory.ChangeTypes.Insert, changedBy, changedAt),
                        keyKnown: false));
                    break;

                case EntityState.Deleted:
                    pending.Add(new PendingEditHistory(
                        entry,
                        NewRecord(entry, EditHistory.ChangeTypes.Delete, changedBy, changedAt),
                        keyKnown: true));
                    break;

                case EntityState.Modified:
                    pending.AddRange(CaptureModified(entry, changedBy, changedAt));
                    break;
            }
        }

        return pending;
    }

    private static IEnumerable<PendingEditHistory> CaptureModified(
        EntityEntry entry,
        string changedBy,
        DateTime changedAt)
    {
        foreach (var property in entry.Properties)
        {
            if (!property.IsModified)
                continue;

            if (IgnoredProperties.Contains(property.Metadata.Name))
                continue;

            var oldValue = Format(property.OriginalValue);
            var newValue = Format(property.CurrentValue);

            if (string.Equals(oldValue, newValue, StringComparison.Ordinal))
                continue;

            var record = NewRecord(entry, EditHistory.ChangeTypes.Update, changedBy, changedAt);
            record.FieldName = Truncate(property.Metadata.Name, 128);
            record.OldValue = oldValue;
            record.NewValue = newValue;

            yield return new PendingEditHistory(entry, record, keyKnown: true);
        }
    }

    private static EditHistory NewRecord(
        EntityEntry entry,
        string changeType,
        string changedBy,
        DateTime changedAt) => new()
        {
            EntityType = entry.Metadata.ClrType.Name,
            EntityId = KeyOf(entry),
            ChangeType = changeType,
            ChangedBy = changedBy,
            ChangedAt = changedAt,
        };

    /// <summary>
    /// The entity's primary key as text; composite keys are joined with "|".
    /// </summary>
    internal static string KeyOf(EntityEntry entry)
    {
        var key = entry.Metadata.FindPrimaryKey();
        if (key == null)
            return string.Empty;

        var parts = key.Properties.Select(p => Format(entry.Property(p.Name).CurrentValue) ?? string.Empty);
        return Truncate(string.Join("|", parts), 100)!;
    }

    /// <summary>Culture-independent text so stored values compare predictably.</summary>
    private static string? Format(object? value)
    {
        var text = value switch
        {
            null => null,
            string s => s,
            DateTime dateTime => dateTime.ToString("O", CultureInfo.InvariantCulture),
            DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            TimeOnly time => time.ToString("HH:mm:ss", CultureInfo.InvariantCulture),
            bool flag => flag ? "true" : "false",
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString(),
        };

        return Truncate(text, EditHistoryLimits.ValueLength);
    }

    private static string? Truncate(string? value, int maxLength) =>
        value != null && value.Length > maxLength ? value[..maxLength] : value;
}

/// <summary>
/// An edit history row captured before the save, held until the entity's
/// database-generated key is available.
/// </summary>
internal sealed class PendingEditHistory
{
    private readonly EntityEntry _entry;
    private readonly bool _keyKnown;

    public PendingEditHistory(EntityEntry entry, EditHistory record, bool keyKnown)
    {
        _entry = entry;
        _keyKnown = keyKnown;
        Record = record;
    }

    public EditHistory Record { get; }

    /// <summary>Fills in the key of a newly inserted row. Call after saving.</summary>
    public EditHistory Complete()
    {
        if (!_keyKnown)
            Record.EntityId = EditHistoryRecorder.KeyOf(_entry);

        return Record;
    }
}
