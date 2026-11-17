using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Dynamic_RBAC_Core : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_Functions",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ModuleCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ParentId = table.Column<long>(type: "bigint", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsAction = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_Sys_Functions", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_Functions_Sys_Functions_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Sys_Functions",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sys_Roles",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    DefaultPermissionsApplied = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
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
                    table.PrimaryKey("PK_Sys_Roles", x => x.Auto_ID);
                });

            migrationBuilder.CreateTable(
                name: "Sys_Users",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_Sys_Users", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_Users_Users_Public_ID",
                        column: x => x.Public_ID,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sys_RolePermissions",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SysRoleId = table.Column<long>(type: "bigint", nullable: false),
                    SysFunctionId = table.Column<long>(type: "bigint", nullable: false),
                    IsGranted = table.Column<bool>(type: "bit", nullable: false),
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
                    table.PrimaryKey("PK_Sys_RolePermissions", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_RolePermissions_Sys_Functions_SysFunctionId",
                        column: x => x.SysFunctionId,
                        principalTable: "Sys_Functions",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sys_RolePermissions_Sys_Roles_SysRoleId",
                        column: x => x.SysRoleId,
                        principalTable: "Sys_Roles",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Sys_UserRoles",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SysUserId = table.Column<long>(type: "bigint", nullable: false),
                    SysRoleId = table.Column<long>(type: "bigint", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_Sys_UserRoles", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_UserRoles_Sys_Roles_SysRoleId",
                        column: x => x.SysRoleId,
                        principalTable: "Sys_Roles",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sys_UserRoles_Sys_Users_SysUserId",
                        column: x => x.SysUserId,
                        principalTable: "Sys_Users",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Functions_Code",
                table: "Sys_Functions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Functions_ParentId",
                table: "Sys_Functions",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Functions_Public_ID",
                table: "Sys_Functions",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_RolePermissions_Public_ID",
                table: "Sys_RolePermissions",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_RolePermissions_SysFunctionId",
                table: "Sys_RolePermissions",
                column: "SysFunctionId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_RolePermissions_SysRoleId_SysFunctionId",
                table: "Sys_RolePermissions",
                columns: new[] { "SysRoleId", "SysFunctionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Roles_Code",
                table: "Sys_Roles",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Roles_Public_ID",
                table: "Sys_Roles",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_UserRoles_Public_ID",
                table: "Sys_UserRoles",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_UserRoles_SysRoleId",
                table: "Sys_UserRoles",
                column: "SysRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_UserRoles_SysUserId_SysRoleId",
                table: "Sys_UserRoles",
                columns: new[] { "SysUserId", "SysRoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Users_Public_ID",
                table: "Sys_Users",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Users_UserName",
                table: "Sys_Users",
                column: "UserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_RolePermissions");

            migrationBuilder.DropTable(
                name: "Sys_UserRoles");

            migrationBuilder.DropTable(
                name: "Sys_Functions");

            migrationBuilder.DropTable(
                name: "Sys_Roles");

            migrationBuilder.DropTable(
                name: "Sys_Users");
        }
    }
}
