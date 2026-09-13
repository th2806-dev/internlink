using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IAssignmentService
{
    Task<BulkAssignResultDto> BulkAssignAsync(BulkAssignRequest request);
    Task<IReadOnlyList<LecturerAssignmentItemDto>> GetByLecturerAsync(Guid lecturerId, Guid? semesterId = null);
    Task<IReadOnlyList<LecturerAssignmentItemDto>> GetAllAssignmentsAsync(Guid? semesterId = null, Guid? departmentId = null);
    Task<bool> UnassignAsync(UnassignRequest request);
    Task<IReadOnlyList<AssignmentHistoryItemDto>> GetHistoryAsync(int limit = 50, Guid? semesterId = null);
    Task<byte[]> ExportExcelAsync(Guid? semesterId = null);
    Task<AutoAssignResultDto> AutoAssignAsync(AutoAssignRequest request);

    // Company Allocation
    Task<CompanyAllocationImportResultDto> ImportCompanyAllocationsFromExcelAsync(Stream excelStream, Guid? semesterId = null);
    byte[] GetCompanyAllocationImportTemplate();
    Task<byte[]> ExportCompanyAllocationsExcelAsync(Guid? semesterId = null);
    Task<IReadOnlyList<CompanyAllocationItemDto>> GetCompanyAllocationsAsync(Guid? semesterId = null);

    // Lecturer Assignment Import & Template
    Task<LecturerAssignmentImportResultDto> ImportLecturerAssignmentsFromExcelAsync(Stream excelStream, Guid? semesterId = null);
    byte[] GetLecturerAssignmentImportTemplate();
}
