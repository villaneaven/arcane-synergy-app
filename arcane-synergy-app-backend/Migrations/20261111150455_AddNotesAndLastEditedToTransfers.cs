using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNotesAndLastEditedToTransfers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastEditedAt",
                table: "Transfers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastEditedBy",
                table: "Transfers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.Transfers', 'Notes') IS NULL
    EXEC('ALTER TABLE [dbo].[Transfers] ADD [Notes] nvarchar(2000) NULL');
ELSE
    EXEC('ALTER TABLE [dbo].[Transfers] ALTER COLUMN [Notes] nvarchar(2000) NULL');
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastEditedAt",
                table: "Transfers");

            migrationBuilder.DropColumn(
                name: "LastEditedBy",
                table: "Transfers");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Transfers");
        }
    }
}
