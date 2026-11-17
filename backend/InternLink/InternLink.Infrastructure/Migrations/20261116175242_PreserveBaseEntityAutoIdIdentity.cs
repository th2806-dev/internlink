using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations;

public partial class PreserveBaseEntityAutoIdIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing Auto_ID columns are already IDENTITY; this records EF's corrected model metadata.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Keep the existing IDENTITY columns intact when rolling back this metadata-only migration.
    }
}
