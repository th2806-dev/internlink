using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Allow_Reused_UserName_For_Deleted_SysUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sys_Users_UserName",
                table: "Sys_Users");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Users_UserName",
                table: "Sys_Users",
                column: "UserName",
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sys_Users_UserName",
                table: "Sys_Users");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Users_UserName",
                table: "Sys_Users",
                column: "UserName",
                unique: true);
        }
    }
}
