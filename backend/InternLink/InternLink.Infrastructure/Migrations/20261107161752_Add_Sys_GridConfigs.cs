using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Sys_GridConfigs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_GridConfigs",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FeatureCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FieldCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    HeaderTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ColumnWidth = table.Column<int>(type: "int", nullable: false, defaultValue: 120),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsFrozen = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    HeaderBgColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    HeaderTextColor = table.Column<string>(type: "nvarchar(9)", maxLength: 9, nullable: true),
                    CellFormatType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "text"),
                    CellColorRuleJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_GridConfigs", x => x.Auto_ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GridConfigs_FeatureCode_FieldCode",
                table: "Sys_GridConfigs",
                columns: new[] { "FeatureCode", "FieldCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GridConfigs_Public_ID",
                table: "Sys_GridConfigs",
                column: "Public_ID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_GridConfigs");
        }
    }
}
