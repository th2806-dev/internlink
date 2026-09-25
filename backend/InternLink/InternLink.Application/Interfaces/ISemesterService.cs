using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISemesterService
{
    Task<IEnumerable<SemesterDto>> GetAllSemestersAsync(Guid? departmentId = null);
    /// <summary>
    /// Kỳ đang Active (thuần đọc). Ưu tiên kỳ riêng của khoa, fallback kỳ dùng chung.
    /// </summary>
    Task<SemesterDto?> GetActiveSemesterAsync(Guid? departmentId = null);
    Task<SemesterDto?> GetSemesterByIdAsync(Guid id);
    Task<SemesterDto> CreateSemesterAsync(CreateSemesterDto dto);
    Task<SemesterDto?> UpdateSemesterAsync(Guid id, UpdateSemesterDto dto);
    Task<SemesterDto?> StartSemesterAsync(Guid id);
    Task<bool> CloseSemesterAsync(Guid id);
    Task<bool> DeleteSemesterAsync(Guid id);
    Task<IEnumerable<SemesterReportScheduleDto>> GetReportSchedulesAsync(Guid semesterId);
    Task<IEnumerable<SemesterReportScheduleDto>> GenerateDefaultSchedulesAsync(Guid semesterId);
    Task<SemesterReportScheduleDto> UpdateReportScheduleAsync(Guid semesterId, int weekNumber, UpdateReportScheduleRequest request);
}
