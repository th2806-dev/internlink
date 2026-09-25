using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service interface for Company management operations
/// </summary>
public interface ICompanyService
{
    /// <summary>
    /// Get all companies with optional pagination
    /// </summary>
    Task<IEnumerable<CompanyDto>> GetAllCompaniesAsync(int skip = 0, int take = 100, Guid? semesterId = null, Guid? departmentId = null);

    /// <summary>
    /// Get companies with filtering and pagination
    /// </summary>
    /// <param name="departmentId">Khoa của người gọi — lọc DN cùng khoa, DN dùng chung (DepartmentId = null) và DN đang nhận SV của khoa. Null = tất cả (SuperAdmin).</param>
    Task<PaginatedResponse<CompanyDto>> GetCompaniesWithFilterAsync(CompanyFilterRequest filter, Guid? departmentId = null);

    /// <summary>
    /// Get a company by ID
    /// </summary>
    Task<CompanyDto?> GetCompanyByIdAsync(Guid id);

    /// <summary>
    /// Get company detail for admin: master data + internships hosted.
    /// </summary>
    Task<AdminCompanyDetailDto?> GetAdminCompanyDetailAsync(Guid id);

    /// <summary>
    /// Check truy cập by-id cho admin khoa — cùng chính sách với list (DN cùng khoa,
    /// DN dùng chung DepartmentId = null, hoặc DN đang nhận SV thực tập của khoa).
    /// Null departmentId = SuperAdmin (luôn cho phép).
    /// </summary>
    Task<bool> HasCompanyAccessAsync(Guid companyId, Guid? departmentId);

    /// <summary>Check truy cập vị trí tuyển dụng qua DN cha (cùng chính sách).</summary>
    Task<bool> HasPositionAccessAsync(Guid positionId, Guid? departmentId);

    /// <summary>
    /// Get all active companies (optionally scoped to a semester: companies marked
    /// "ngưng liên kết" for that term are excluded).
    /// </summary>
    /// <param name="departmentId">Khoa của người gọi — lọc DN cùng khoa, DN dùng chung (DepartmentId = null) và DN đang nhận SV của khoa. Null = tất cả (SuperAdmin).</param>
    Task<IEnumerable<CompanyDto>> GetActiveCompaniesAsync(int skip = 0, int take = 100, Guid? semesterId = null, Guid? departmentId = null);

    /// <summary>
    /// Link or unlink a company for a semester ("ngưng liên kết" = isLinked false).
    /// Absence of a link row means the company is linked by default.
    /// </summary>
    Task SetCompanySemesterStatusAsync(Guid companyId, Guid semesterId, bool isLinked);

    /// <summary>
    /// Create a new company. departmentId scopes the company to the creating admin's khoa.
    /// </summary>
    Task<CompanyDto> CreateCompanyAsync(CreateCompanyRequest request, Guid? departmentId = null);

    /// <summary>
    /// Update an existing company
    /// </summary>
    Task<CompanyDto?> UpdateCompanyAsync(Guid id, UpdateCompanyRequest request);

    /// <summary>
    /// Delete a company by ID
    /// </summary>
    Task<bool> DeleteCompanyAsync(Guid id);

    /// <summary>
    /// Check if company name already exists
    /// </summary>
    Task<bool> CompanyNameExistsAsync(string name, Guid? excludeId = null);

    /// <summary>
    /// Get companies by industry
    /// </summary>
    Task<IEnumerable<CompanyDto>> GetCompaniesByIndustryAsync(string industry, int skip = 0, int take = 100);

    /// <summary>
    /// Import companies from an Excel (.xlsx) stream. Row 1 = headers.
    /// departmentId scopes imported companies to the importing admin's khoa.
    /// </summary>
    Task<CompanyImportResultDto> ImportCompaniesFromExcelAsync(Stream excelStream, Guid? departmentId = null);

    /// <summary>
    /// Build a blank Excel template for company import.
    /// </summary>
    byte[] GetCompanyImportTemplate();

    /// <summary>
    /// Export companies list to styled Excel.
    /// </summary>
    /// <param name="departmentId">Null = SuperAdmin (toàn bộ); ngược lại chỉ DN trong phạm vi khoa.</param>
    Task<byte[]> ExportCompaniesExcelAsync(Guid? departmentId = null);

    /// <summary>
    /// Get recruitment positions for a company, optionally scoped to a semester.
    /// </summary>
    Task<IEnumerable<CompanyPositionDto>> GetPositionsAsync(Guid companyId, Guid? semesterId = null);

    /// <summary>
    /// Get a recruitment position by ID.
    /// </summary>
    Task<CompanyPositionDto?> GetPositionByIdAsync(Guid positionId);

    /// <summary>
    /// Create a new recruitment position for a company.
    /// </summary>
    Task<CompanyPositionDto> CreatePositionAsync(Guid companyId, CreateCompanyPositionRequest request);

    /// <summary>
    /// Update a recruitment position.
    /// </summary>
    Task<CompanyPositionDto?> UpdatePositionAsync(Guid positionId, UpdateCompanyPositionRequest request);

    /// <summary>
    /// Delete a recruitment position.
    /// </summary>
    Task<bool> DeletePositionAsync(Guid positionId);

    /// <summary>
    /// Suggest companies for student assignment based on major, industry, capacity, and open positions.
    /// </summary>
    Task<IEnumerable<CompanySuggestionDto>> SuggestCompaniesAsync(CompanySuggestionRequest request);
}

