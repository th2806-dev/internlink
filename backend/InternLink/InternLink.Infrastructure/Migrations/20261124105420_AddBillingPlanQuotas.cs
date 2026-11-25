using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingPlanQuotas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_BillingPlans",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LicenseTier = table.Column<int>(type: "int", nullable: false),
                    MaxStudentsQuota = table.Column<int>(type: "int", nullable: false),
                    MaxLecturersQuota = table.Column<int>(type: "int", nullable: false),
                    StorageQuotaBytes = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
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
                    table.PrimaryKey("PK_Sys_BillingPlans", x => x.Auto_ID);
                });

            migrationBuilder.InsertData(
                table: "Sys_BillingPlans",
                columns: new[] { "Auto_ID", "CreatedAt", "CreatedBy", "Created_By_Function", "Deleted_At", "Deleted_By", "IsActive", "IsDeleted", "LicenseTier", "MaxLecturersQuota", "MaxStudentsQuota", "Ghi_Chu", "PlanCode", "Public_ID", "StorageQuotaBytes", "UpdatedAt", "UpdatedBy", "Updated_By_Function" },
                values: new object[,]
                {
                    { 1L, new DateTime(2026, 11, 24, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, null, true, false, 1, 25, 500, null, "STANDARD", new Guid("06232e7d-86cc-4afb-b6c1-5a8e7dba1401"), 21474836480L, null, null, null },
                    { 2L, new DateTime(2026, 11, 24, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, null, true, false, 2, 100, 2000, null, "PRO", new Guid("06232e7d-86cc-4afb-b6c1-5a8e7dba1402"), 107374182400L, null, null, null },
                    { 3L, new DateTime(2026, 11, 24, 0, 0, 0, 0, DateTimeKind.Utc), null, null, null, null, true, false, 3, 500, 10000, null, "ENTERPRISE", new Guid("06232e7d-86cc-4afb-b6c1-5a8e7dba1403"), 536870912000L, null, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_BillingPlans_PlanCode",
                table: "Sys_BillingPlans",
                column: "PlanCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_BillingPlans_Public_ID",
                table: "Sys_BillingPlans",
                column: "Public_ID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_BillingPlans");
        }
    }
}
