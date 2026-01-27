using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsFinalDischargeFromAdmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFinalDischarge",
                table: "Admissions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFinalDischarge",
                table: "Admissions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
