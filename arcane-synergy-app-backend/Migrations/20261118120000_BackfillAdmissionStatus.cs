using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using arcane_synergy_app_backend.Data;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <summary>
    /// Data-only migration: fills Admissions.Status for existing rows using the
    /// same rule as Admission.UpdateCalculatedFields (no schema change).
    /// </summary>
    [DbContext(typeof(ArcaneSynergyContext))]
    [Migration("20261118120000_BackfillAdmissionStatus")]
    public partial class BackfillAdmissionStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE Admissions
SET Status = CASE
    WHEN DischargeDate IS NULL THEN 'Current'
    WHEN DateSeen IS NULL THEN 'Pending'
    ELSE 'Completed'
END;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Admissions SET Status = NULL;");
        }
    }
}
