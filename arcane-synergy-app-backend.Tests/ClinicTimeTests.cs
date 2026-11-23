using arcane_synergy_app_backend.Services;

namespace arcane_synergy_app_backend.Tests;

public class ClinicTimeTests
{
    [Fact]
    public void UsesCentralTime()
    {
        Assert.Equal("America/Chicago", ClinicTime.TimeZoneId);
    }

    [Fact]
    public void EveningAtTheClinicIsStillTheSameDayEvenAfterUtcMidnight()
    {
        // 02:00 UTC on Mar 21 is 9 PM CDT on Mar 20.
        Assert.Equal(new DateOnly(2025, 3, 20), ClinicTime.DateFor(new DateTime(2025, 3, 21, 2, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void RollsOverAtClinicMidnight()
    {
        // CDT is UTC-5: clinic midnight on Mar 21 is 05:00 UTC.
        Assert.Equal(new DateOnly(2025, 3, 20), ClinicTime.DateFor(new DateTime(2025, 3, 21, 4, 59, 0, DateTimeKind.Utc)));
        Assert.Equal(new DateOnly(2025, 3, 21), ClinicTime.DateFor(new DateTime(2025, 3, 21, 5, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void HandlesStandardTime()
    {
        // CST is UTC-6 in January: 05:30 UTC Jan 15 is 11:30 PM Jan 14.
        Assert.Equal(new DateOnly(2025, 1, 14), ClinicTime.DateFor(new DateTime(2025, 1, 15, 5, 30, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void TreatsUnspecifiedKindAsUtc()
    {
        Assert.Equal(new DateOnly(2025, 3, 20), ClinicTime.DateFor(new DateTime(2025, 3, 21, 2, 0, 0)));
    }
}
