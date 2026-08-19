using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAdmissionSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Admissions",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Admissions_AdmissionDate",
                table: "Admissions",
                column: "AdmissionDate");

            migrationBuilder.CreateIndex(
                name: "IX_Admissions_Type",
                table: "Admissions",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Admissions_AdmissionDate",
                table: "Admissions");

            migrationBuilder.DropIndex(
                name: "IX_Admissions_Type",
                table: "Admissions");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Admissions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
