using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingPriceCatalogAndInvoiceSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BaseAmountVnd",
                table: "Sys_TenantBillingInvoices",
                type: "decimal(18,0)",
                precision: 18,
                scale: 0,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmountVnd",
                table: "Sys_TenantBillingInvoices",
                type: "decimal(18,0)",
                precision: 18,
                scale: 0,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxRatePercent",
                table: "Sys_TenantBillingInvoices",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql("""
                UPDATE [Sys_TenantBillingInvoices]
                SET [BaseAmountVnd] = [AmountVnd],
                    [TaxAmountVnd] = 0,
                    [TaxRatePercent] = 0
                """);

            migrationBuilder.CreateTable(
                name: "Sys_BillingPriceCatalog",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    BillingCycleMonths = table.Column<int>(type: "int", nullable: false),
                    BaseAmountVnd = table.Column<decimal>(type: "decimal(18,0)", precision: 18, scale: 0, nullable: false),
                    TaxRatePercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("PK_Sys_BillingPriceCatalog", x => x.Auto_ID);
                    table.UniqueConstraint("AK_Sys_BillingPriceCatalog_Public_ID", x => x.Public_ID);
                });

            migrationBuilder.InsertData(
                table: "Sys_BillingPriceCatalog",
                columns: new[]
                {
                    "Public_ID", "PlanCode", "BillingCycleMonths", "BaseAmountVnd", "TaxRatePercent",
                    "EffectiveFrom", "EffectiveTo", "IsActive", "CreatedAt", "IsDeleted"
                },
                values: new object[,]
                {
                    {
                        new Guid("36ac8b4e-2352-4601-a4c9-54c3758872e5"),
                        "PRO",
                        12,
                        25_000_000m,
                        null!,
                        new DateTime(2026, 11, 23, 0, 0, 0, DateTimeKind.Utc),
                        null!,
                        true,
                        new DateTime(2026, 11, 23, 0, 0, 0, DateTimeKind.Utc),
                        false
                    },
                    {
                        new Guid("d42b383b-f8da-4a2d-b064-445173f8f032"),
                        "ENTERPRISE",
                        12,
                        50_000_000m,
                        null!,
                        new DateTime(2026, 11, 23, 0, 0, 0, DateTimeKind.Utc),
                        null!,
                        true,
                        new DateTime(2026, 11, 23, 0, 0, 0, DateTimeKind.Utc),
                        false
                    }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_TenantBillingInvoices_BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices",
                column: "BillingPriceCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_BillingPriceCatalog_PlanCode_BillingCycleMonths_IsActive_EffectiveFrom",
                table: "Sys_BillingPriceCatalog",
                columns: new[] { "PlanCode", "BillingCycleMonths", "IsActive", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_BillingPriceCatalog_Public_ID",
                table: "Sys_BillingPriceCatalog",
                column: "Public_ID",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_TenantBillingInvoices_Sys_BillingPriceCatalog_BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices",
                column: "BillingPriceCatalogId",
                principalTable: "Sys_BillingPriceCatalog",
                principalColumn: "Public_ID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sys_TenantBillingInvoices_Sys_BillingPriceCatalog_BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices");

            migrationBuilder.DropTable(
                name: "Sys_BillingPriceCatalog");

            migrationBuilder.DropIndex(
                name: "IX_Sys_TenantBillingInvoices_BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices");

            migrationBuilder.DropColumn(
                name: "BaseAmountVnd",
                table: "Sys_TenantBillingInvoices");

            migrationBuilder.DropColumn(
                name: "BillingPriceCatalogId",
                table: "Sys_TenantBillingInvoices");

            migrationBuilder.DropColumn(
                name: "TaxAmountVnd",
                table: "Sys_TenantBillingInvoices");

            migrationBuilder.DropColumn(
                name: "TaxRatePercent",
                table: "Sys_TenantBillingInvoices");
        }
    }
}
