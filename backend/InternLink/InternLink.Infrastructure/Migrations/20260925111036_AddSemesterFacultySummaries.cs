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
            // Lưu ý: file generate tự động bị rỗng vì snapshot đã chứa entity từ lần
            // generate trước (khi migration cũ bị xóa nhưng snapshot giữ lại schema).
            // Operations dưới đây được viết tay mirror đúng snapshot.
            migrationBuilder.CreateTable(
                name: "SemesterFacultySummaries",
                columns: table => new
                {
                    SemesterFacultySummaryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SemesterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Results = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Difficulties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Recommendations = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Conclusion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "GETUTCDATE()"),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SemesterFacultySummaries", x => x.SemesterFacultySummaryId);
                    table.ForeignKey(
                        name: "FK_SemesterFacultySummaries_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SemesterFacultySummaries_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "SemesterId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SemesterFacultySummaries_DepartmentId",
                table: "SemesterFacultySummaries",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterFacultySummaries_SemesterId",
                table: "SemesterFacultySummaries",
                column: "SemesterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SemesterFacultySummaries");
        }
    }
}
