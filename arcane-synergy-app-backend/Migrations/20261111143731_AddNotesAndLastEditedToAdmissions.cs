using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNotesAndLastEditedToAdmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastEditedAt",
                table: "Admissions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastEditedBy",
                table: "Admissions",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Admissions', 'Notes') IS NULL
    EXEC('ALTER TABLE [dbo].[Admissions] ADD [Notes] nvarchar(2000) NULL');
ELSE
    EXEC('ALTER TABLE [dbo].[Admissions] ALTER COLUMN [Notes] nvarchar(2000) NULL');
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastEditedAt",
                table: "Admissions");

            migrationBuilder.DropColumn(
                name: "LastEditedBy",
                table: "Admissions");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Admissions");
        }
    }
}
