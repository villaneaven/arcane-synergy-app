using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    PatientID = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DOB = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MRN = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Group = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Insurance = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PCP = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Clinic = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.PatientID);
                });

            migrationBuilder.CreateTable(
                name: "Admissions",
                columns: table => new
                {
                    AdmissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FacilityType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Facility = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TimeOfAdmission = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DX = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotificationSource = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateNotified = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AdmissionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DischargeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DischargeTo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateSeen = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SeenBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PatientID = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    TotalERVisits = table.Column<int>(type: "int", nullable: false),
                    TotalADMVisits = table.Column<int>(type: "int", nullable: false),
                    DayOfWeekAdmitted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MonthAdmitted = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TCMDueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PatientEngagement = table.Column<int>(type: "int", nullable: false),
                    ReadmissionFlag = table.Column<bool>(type: "bit", nullable: false),
                    NextAdmissionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FinalDischargeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CountOfTransfers = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Admissions", x => x.AdmissionId);
                    table.ForeignKey(
                        name: "FK_Admissions_Patients_PatientID",
                        column: x => x.PatientID,
                        principalTable: "Patients",
                        principalColumn: "PatientID");
                });

            migrationBuilder.CreateTable(
                name: "Transfers",
                columns: table => new
                {
                    TransferId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AdmissionId = table.Column<int>(type: "int", nullable: false),
                    AdmissionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DischargeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsFinalDischarge = table.Column<bool>(type: "bit", nullable: false),
                    FacilityType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Facility = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TimeOfAdmission = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DX = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NotificationSource = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateNotified = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DischargeTo = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transfers", x => x.TransferId);
                    table.ForeignKey(
                        name: "FK_Transfers_Admissions_AdmissionId",
                        column: x => x.AdmissionId,
                        principalTable: "Admissions",
                        principalColumn: "AdmissionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Admissions_PatientID",
                table: "Admissions",
                column: "PatientID");

            migrationBuilder.CreateIndex(
                name: "IX_Transfers_AdmissionId",
                table: "Transfers",
                column: "AdmissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Transfers");

            migrationBuilder.DropTable(
                name: "Admissions");

            migrationBuilder.DropTable(
                name: "Patients");
        }
    }
}
