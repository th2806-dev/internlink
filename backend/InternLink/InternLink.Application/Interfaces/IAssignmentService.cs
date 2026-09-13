using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface IAssignmentService
{
    Task<BulkAssignResultDto> BulkAssignAsync(BulkAssignRequest request, Guid? departmentId = null);
    Task<IReadOnlyList<LecturerAssignmentItemDto>> GetByLecturerAsync(Guid lecturerId, Guid? semesterId = null, Guid? departmentId = null);
    Task<IReadOnlyList<LecturerAssignmentItemDto>> GetAllAssignmentsAsync(Guid? semesterId = null, Guid? departmentId = null);
    Task<bool> UnassignAsync(UnassignRequest request, Guid? departmentId = null);
    Task<IReadOnlyList<AssignmentHistoryItemDto>> GetHistoryAsync(int limit = 50, Guid? semesterId = null, Guid? departmentId = null);
    Task<byte[]> ExportExcelAsync(Guid? semesterId = null, Guid? departmentId = null);
    Task<AutoAssignResultDto> AutoAssignAsync(AutoAssignRequest request, Guid? departmentId = null);

    // Company Allocation
    Task<CompanyAllocationImportResultDto> ImportCompanyAllocationsFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null);
    byte[] GetCompanyAllocationImportTemplate();
    Task<byte[]> ExportCompanyAllocationsExcelAsync(Guid? semesterId = null, Guid? departmentId = null);
    Task<IReadOnlyList<CompanyAllocationItemDto>> GetCompanyAllocationsAsync(Guid? semesterId = null, Guid? departmentId = null);

    // Lecturer Assignment Import & Template
    Task<LecturerAssignmentImportResultDto> ImportLecturerAssignmentsFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null);
    byte[] GetLecturerAssignmentImportTemplate();
}
