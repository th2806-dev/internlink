using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ILecturerProfileService
{
    Task<IEnumerable<LecturerDto>> GetAllAsync(int skip = 0, int take = 100, Guid? semesterId = null, Guid? departmentId = null);
    Task<LecturerDto?> GetByIdAsync(Guid id);
    Task<LecturerDto?> GetByUserIdAsync(Guid userId);
    Task<LecturerDto> CreateAsync(CreateLecturerRequest request, Guid? departmentId = null);
    Task<LecturerDto?> UpdateAsync(Guid id, UpdateLecturerRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<LecturerImportResultDto> ImportFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null, bool grantAccount = false);
    byte[] GetImportTemplate();
    Task<byte[]> ExportLecturersExcelAsync(Guid? departmentId = null);
    Task<LecturerOverviewDto?> GetOverviewAsync(Guid lecturerId);
}
