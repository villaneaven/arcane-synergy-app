using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using arcane_synergy_app_backend.Data;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <summary>
    /// PatientEngagement changes daily, so it is now calculated on read
    /// (Admission.ApplyPatientEngagement) instead of stored. The column was never written.
    /// </summary>
    [DbContext(typeof(ArcaneSynergyContext))]
    [Migration("20261118150000_DropAdmissionPatientEngagement")]
    public partial class DropAdmissionPatientEngagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PatientEngagement",
                table: "Admissions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PatientEngagement",
                table: "Admissions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
