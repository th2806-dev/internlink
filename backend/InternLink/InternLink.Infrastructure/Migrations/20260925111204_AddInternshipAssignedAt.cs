using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInternshipAssignedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Lưu ý: file generate tự động bị rỗng vì snapshot đã chứa AssignedAt từ lần
            // generate trước (khi migration cũ bị xóa nhưng snapshot giữ lại schema).
            migrationBuilder.AddColumn<DateTime>(
                name: "AssignedAt",
                table: "Internships",
                type: "datetime2",
                nullable: true);

            // Backfill dữ liệu cũ: internship đã có GV nhưng không biết ngày phân công thật
            // → dùng UpdatedAt (fallback CreatedAt) để cột "Ngày phân công"/lịch sử không trống.
            migrationBuilder.Sql(@"
                UPDATE Internships
                SET AssignedAt = COALESCE(UpdatedAt, CreatedAt)
                WHERE LecturerId IS NOT NULL AND AssignedAt IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedAt",
                table: "Internships");
        }
    }
}
