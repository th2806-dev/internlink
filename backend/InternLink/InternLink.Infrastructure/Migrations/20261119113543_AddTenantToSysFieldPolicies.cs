using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantToSysFieldPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sys_FieldPolicies_FormCode_FieldKey_RoleId",
                table: "Sys_FieldPolicies");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "Sys_FieldPolicies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_FieldPolicies_FormCode_FieldKey_RoleId_TenantId",
                table: "Sys_FieldPolicies",
                columns: new[] { "FormCode", "FieldKey", "RoleId", "TenantId" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sys_FieldPolicies_FormCode_FieldKey_RoleId_TenantId",
                table: "Sys_FieldPolicies");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Sys_FieldPolicies");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_FieldPolicies_FormCode_FieldKey_RoleId",
                table: "Sys_FieldPolicies",
                columns: new[] { "FormCode", "FieldKey", "RoleId" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
