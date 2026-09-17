using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyDepartmentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "Companies",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_DepartmentId",
                table: "Companies",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            // Backfill: adopt previously imported companies into the khoa of the students
            // they have hosted (the only department signal available before this column).
            // Companies with no internship history stay null = shared/global master data.
            migrationBuilder.Sql(@"
UPDATE c
SET c.DepartmentId = dept.DepartmentId
FROM Companies c
CROSS APPLY (
    SELECT TOP 1 s.DepartmentId AS DepartmentId
    FROM Internships i
    JOIN Students s ON s.StudentId = i.StudentId
    WHERE i.CompanyId = c.CompanyId
      AND i.IsDeleted = 0
      AND s.DepartmentId IS NOT NULL
    ORDER BY i.CreatedAt DESC
) dept;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies");

            migrationBuilder.DropIndex(
                name: "IX_Companies_DepartmentId",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Companies");
        }
    }
}
