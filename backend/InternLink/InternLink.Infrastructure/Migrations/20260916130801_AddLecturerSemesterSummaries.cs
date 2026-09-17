using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLecturerSemesterSummaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LecturerSemesterSummaries",
                columns: table => new
                {
                    LecturerSemesterSummaryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SemesterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LecturerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Results = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false),
                    Difficulties = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false),
                    Recommendations = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false),
                    Conclusion = table.Column<string>(type: "nvarchar(max)", maxLength: 10000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "GETUTCDATE()"),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LecturerSemesterSummaries", x => x.LecturerSemesterSummaryId);
                    table.ForeignKey(
                        name: "FK_LecturerSemesterSummaries_Lecturers_LecturerId",
                        column: x => x.LecturerId,
                        principalTable: "Lecturers",
                        principalColumn: "LecturerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LecturerSemesterSummaries_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "SemesterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LecturerSemesterSummaries_LecturerId",
                table: "LecturerSemesterSummaries",
                column: "LecturerId");

            migrationBuilder.CreateIndex(
                name: "IX_LecturerSemesterSummaries_SemesterId_LecturerId",
                table: "LecturerSemesterSummaries",
                columns: new[] { "SemesterId", "LecturerId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LecturerSemesterSummaries");
        }
    }
}
