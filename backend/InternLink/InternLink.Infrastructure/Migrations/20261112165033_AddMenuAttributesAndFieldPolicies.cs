using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuAttributesAndFieldPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions");

            migrationBuilder.AddColumn<string>(
                name: "BadgeText",
                table: "Sys_Functions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FuncUrl",
                table: "Sys_Functions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconName",
                table: "Sys_Functions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                defaultValue: "Folder");

            migrationBuilder.AddColumn<bool>(
                name: "IsDelete",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEdit",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsExport",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsNew",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsView",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVisibleInMenu",
                table: "Sys_Functions",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "Sys_FieldPolicies",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FieldKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RoleId = table.Column<long>(type: "bigint", nullable: true),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    IsReadOnly = table.Column<bool>(type: "bit", nullable: false),
                    CustomLabel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DefaultValue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ValidationRegex = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("PK_Sys_FieldPolicies", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_FieldPolicies_Sys_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Sys_Roles",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_FieldPolicies_FormCode_FieldKey_RoleId",
                table: "Sys_FieldPolicies",
                columns: new[] { "FormCode", "FieldKey", "RoleId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_FieldPolicies_Public_ID",
                table: "Sys_FieldPolicies",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_FieldPolicies_RoleId",
                table: "Sys_FieldPolicies",
                column: "RoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions",
                column: "ParentId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions");

            migrationBuilder.DropTable(
                name: "Sys_FieldPolicies");

            migrationBuilder.DropColumn(
                name: "BadgeText",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "FuncUrl",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IconName",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsDelete",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsEdit",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsExport",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsNew",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsView",
                table: "Sys_Functions");

            migrationBuilder.DropColumn(
                name: "IsVisibleInMenu",
                table: "Sys_Functions");

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions",
                column: "ParentId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID");
        }
    }
}
