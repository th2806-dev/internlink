using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSmartExcelMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_Excel_Mappings",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Mapping_Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Mapping_Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Target_Entity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Start_Row_Index = table.Column<int>(type: "int", nullable: false, defaultValue: 2),
                    Tenant_ID = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Department_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_Excel_Mappings", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_Excel_Mappings_Departments_Department_ID",
                        column: x => x.Department_ID,
                        principalTable: "Departments",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Sys_Excel_Mapping_Details",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Mapping_ID = table.Column<long>(type: "bigint", nullable: false),
                    System_Field_Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Excel_Column_Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Excel_Column_Index = table.Column<int>(type: "int", nullable: false),
                    Is_Required = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Default_Value = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Transform_Rule = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_Excel_Mapping_Details", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_Excel_Mapping_Details_Sys_Excel_Mappings_Mapping_ID",
                        column: x => x.Mapping_ID,
                        principalTable: "Sys_Excel_Mappings",
                        principalColumn: "Auto_ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mapping_Details_Mapping_ID_Excel_Column_Index",
                table: "Sys_Excel_Mapping_Details",
                columns: new[] { "Mapping_ID", "Excel_Column_Index" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mapping_Details_Mapping_ID_System_Field_Code",
                table: "Sys_Excel_Mapping_Details",
                columns: new[] { "Mapping_ID", "System_Field_Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mapping_Details_Public_ID",
                table: "Sys_Excel_Mapping_Details",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mappings_Department_ID",
                table: "Sys_Excel_Mappings",
                column: "Department_ID");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mappings_Mapping_Code_Tenant_ID_Department_ID",
                table: "Sys_Excel_Mappings",
                columns: new[] { "Mapping_Code", "Tenant_ID", "Department_ID" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mappings_Public_ID",
                table: "Sys_Excel_Mappings",
                column: "Public_ID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_Excel_Mapping_Details");

            migrationBuilder.DropTable(
                name: "Sys_Excel_Mappings");
        }
    }
}
