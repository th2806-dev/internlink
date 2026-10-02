using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISchoolAcademicTermService
{
    Task<IEnumerable<SchoolAcademicTermDto>> GetAllAsync();
    Task<SchoolAcademicTermDto> CreateAsync(SaveSchoolAcademicTermRequest request);
    Task<SchoolAcademicTermDto?> UpdateAsync(Guid id, SaveSchoolAcademicTermRequest request);
    /// <summary>Tạo nhanh cả năm học gồm Học kỳ I, Học kỳ II và Học kỳ Hè (atomic — tất cả hoặc không có gì).</summary>
    Task<AcademicYearBatchResultDto> CreateAcademicYearAsync(CreateAcademicYearRequest request);
}