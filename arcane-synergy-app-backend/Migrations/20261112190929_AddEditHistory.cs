using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace arcane_synergy_app_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEditHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EditHistory",
                columns: table => new
                {
                    EditHistoryId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChangeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    OldValue = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ChangedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EditHistory", x => x.EditHistoryId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EditHistory_ChangedAt",
                table: "EditHistory",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_EditHistory_EntityType_EntityId_ChangedAt",
                table: "EditHistory",
                columns: new[] { "EntityType", "EntityId", "ChangedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EditHistory");
        }
    }
}
