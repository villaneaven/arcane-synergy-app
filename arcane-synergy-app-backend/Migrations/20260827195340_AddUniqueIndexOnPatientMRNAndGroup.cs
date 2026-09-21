using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexOnPatientMRNAndGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1
    FROM [Patients]
    WHERE LEN([Group]) > 450
)
    THROW 50000, 'Cannot shrink Patients.Group to nvarchar(450) because existing data exceeds 450 characters.', 1;
");

            migrationBuilder.AlterColumn<string>(
                name: "Group",
                table: "Patients",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_MRN_Group",
                table: "Patients",
                columns: new[] { "MRN", "Group" },
                unique: true,
                filter: "[MRN] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_MRN_Group",
                table: "Patients");

            migrationBuilder.AlterColumn<string>(
                name: "Group",
                table: "Patients",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
