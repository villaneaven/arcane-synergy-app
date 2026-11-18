namespace arcane_synergy_app_backend.Services;

/// <summary>
/// The clinic's local time zone. Day-based values (patient engagement, gap status
/// dates) use the clinic's calendar day, not the server's clock, which may be UTC.
/// </summary>
public static class ClinicTime
{
    public const string TimeZoneId = "America/Chicago";

    public static readonly TimeZoneInfo TimeZone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    /// <summary>The clinic's calendar date for the given UTC instant.</summary>
    public static DateOnly DateFor(DateTime utcNow) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), TimeZone));

    /// <summary>Today's date at the clinic.</summary>
    public static DateOnly Today => DateFor(DateTime.UtcNow);
}
