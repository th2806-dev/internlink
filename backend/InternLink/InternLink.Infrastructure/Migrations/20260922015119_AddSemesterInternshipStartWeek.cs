using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSemesterInternshipStartWeek : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // defaultValue phải khớp mặc định của entity (1 = không lệch tuần).
            // Nếu để 0, các kỳ cũ sẽ bị lệch -1 tuần khi quy đổi ra tuần học kỳ.
            migrationBuilder.AddColumn<int>(
                name: "InternshipStartWeek",
                table: "Semesters",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InternshipStartWeek",
                table: "Semesters");
        }
    }
}
