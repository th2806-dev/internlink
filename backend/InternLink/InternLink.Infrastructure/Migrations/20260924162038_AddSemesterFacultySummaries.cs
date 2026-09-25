using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSemesterFacultySummaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SemesterFacultySummaries_SemesterId_DepartmentId",
                table: "SemesterFacultySummaries");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterFacultySummaries_SemesterId",
                table: "SemesterFacultySummaries",
                column: "SemesterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SemesterFacultySummaries_SemesterId",
                table: "SemesterFacultySummaries");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterFacultySummaries_SemesterId_DepartmentId",
                table: "SemesterFacultySummaries",
                columns: new[] { "SemesterId", "DepartmentId" },
                unique: true,
                filter: "[DepartmentId] IS NULL OR [DepartmentId] IS NOT NULL");
        }
    }
}
