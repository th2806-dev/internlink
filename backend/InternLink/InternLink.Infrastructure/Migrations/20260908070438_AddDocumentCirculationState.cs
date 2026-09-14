using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentCirculationState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ArchiveReason/ArchivedAt/ArchivedBy are already added by AddDocumentDownloadCount.
            // Kept empty of column adds to avoid duplicate-column failure on fresh databases.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nothing to revert — columns belong to AddDocumentDownloadCount.
        }
    }
}
