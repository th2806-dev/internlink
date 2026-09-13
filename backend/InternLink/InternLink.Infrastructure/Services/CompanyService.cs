using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AutoMapper;
using ClosedXML.Excel;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class CompanyService : ICompanyService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IExcelService _excelService;

    // Fuzzy matching definitions for company columns.
    // Mirrors the SV/GV importers: CompanyCode (MaDN) is the business key, just like MSSV/MaGV.
    private static readonly Dictionary<string, ColumnDefinition> CompanyColumns = new()
    {
        [nameof(CompanyColumn.CompanyCode)] = new("ma doanh nghiep", "ma dn", "ma doanh nghiep lien ket", "companycode", "company code", "code", "code doanh nghiep", "ma so doanh nghiep", "msdn"),
        [nameof(CompanyColumn.CompanyName)] = new("ten cong ty", "ten doanh nghiep", "ten dn", "tendn", "companyname", "company name", "ten don vi", "don vi", "cong ty", "doanh nghiep", "name", "organization"),
        [nameof(CompanyColumn.Industry)] = new("nganh", "industry", "linh vuc", "linh vuc hoat dong", "nganh nghe", "sector", "linh vuc kinh doanh"),
        [nameof(CompanyColumn.ContactPerson)] = new("nguoi lien he", "nguoilienhe", "contactperson", "contact person", "contactname", "nguoi dai dien", "lien he", "ho ten nguoi lien he", "representative"),
        [nameof(CompanyColumn.ContactEmail)] = new("email", "e-mail", "contactemail", "contact email", "email lien he", "email address", "thu dien tu"),
        [nameof(CompanyColumn.ContactPhone)] = new("sdt", "phone", "dien thoai", "contactphone", "contact phone", "so dien thoai", "phone number", "sdt lien he"),
        [nameof(CompanyColumn.Address)] = new("dia chi", "diachi", "address", "dia chi tru so", "dia chi chi nhanh", "dia diem", "dia chi cong ty"),
        [nameof(CompanyColumn.Website)] = new("website", "web", "trang web", "trang chu", "url", "homepage", "website cong ty"),
        [nameof(CompanyColumn.Capacity)] = new("so luong tiep nhan", "so luong tiep nhan sv", "suc chua", "succhua", "capacity", "so luong", "so luong sv", "chi tieu", "so luong tuyen", "slsv", "so luong tiep nhan thuc tap"),
    };

    public CompanyService(AppDbContext db, IMapper mapper, IExcelService excelService)
    {
        _db = db;
        _mapper = mapper;
        _excelService = excelService;
    }

    public async Task<IEnumerable<CompanyDto>> GetAllCompaniesAsync(int skip = 0, int take = 100, Guid? semesterId = null)
    {
        var query = _db.Companies
            .Where(c => !c.IsDeleted);

        var companies = await query
            .OrderBy(c => c.CompanyName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var dtos = _mapper.Map<List<CompanyDto>>(companies);
        if (dtos.Count == 0)
            return dtos;

        var companyIds = companies.Select(c => c.Id).ToList();

        // Student counts: scoped to the selected semester when one is provided.
        var internshipQuery = _db.Internships
            .Where(i => !i.IsDeleted && i.CompanyId != null && companyIds.Contains(i.CompanyId.Value));
        if (semesterId.HasValue && semesterId != Guid.Empty)
            internshipQuery = internshipQuery.Where(i => i.SemesterId == semesterId.Value);
        var studentCounts = await internshipQuery
            .GroupBy(i => i.CompanyId)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(k => k.CompanyId, v => v.Count);
        var positionQuery = _db.CompanyPositions
            .Where(p => !p.IsDeleted && p.IsOpen && companyIds.Contains(p.CompanyId));
        if (semesterId.HasValue && semesterId != Guid.Empty)
            positionQuery = positionQuery.Where(p => p.SemesterId == null || p.SemesterId == semesterId.Value);
        var positionCounts = await positionQuery
            .GroupBy(p => p.CompanyId)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(k => k.CompanyId, v => v.Count);

        foreach (var dto in dtos)
        {
            dto.StudentCount = studentCounts.GetValueOrDefault(dto.Id);
            dto.OpenPositionCount = positionCounts.GetValueOrDefault(dto.Id);
        }

        // Per-semester link status: companies are linked by default; a row with
        // IsActive = false means the admin marked the company as "ngưng liên kết".
        if (semesterId.HasValue && semesterId != Guid.Empty)
        {
            var unlinked = await _db.SemesterCompanies
                .Where(sc => sc.SemesterId == semesterId.Value && !sc.IsActive && companyIds.Contains(sc.CompanyId))
                .Select(sc => sc.CompanyId)
                .ToListAsync();
            var unlinkedSet = unlinked.ToHashSet();
            foreach (var dto in dtos)
                dto.IsSemesterLinked = !unlinkedSet.Contains(dto.Id);
        }

        return dtos;
    }

    public async Task<PaginatedResponse<CompanyDto>> GetCompaniesWithFilterAsync(CompanyFilterRequest filter)
    {
        var query = _db.Companies.Where(c => !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Industry))
            query = query.Where(c => c.Industry == filter.Industry);

        if (filter.IsActive.HasValue)
            query = query.Where(c => c.IsActive == filter.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchLower = filter.SearchTerm.ToLower();
            query = query.Where(c =>
                c.CompanyName.ToLower().Contains(searchLower) ||
                (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(searchLower))
            );
        }

        var total = await query.CountAsync();

        var companies = await query
            .OrderBy(c => c.CompanyName)
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        var dtos = _mapper.Map<List<CompanyDto>>(companies);
        if (dtos.Count > 0)
        {
            var companyIds = companies.Select(c => c.Id).ToList();
            var positionCounts = await _db.CompanyPositions
                .Where(p => !p.IsDeleted && p.IsOpen && companyIds.Contains(p.CompanyId))
                .GroupBy(p => p.CompanyId)
                .Select(g => new { CompanyId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(k => k.CompanyId, v => v.Count);
            foreach (var dto in dtos)
                dto.OpenPositionCount = positionCounts.GetValueOrDefault(dto.Id);
        }

        return new PaginatedResponse<CompanyDto>
        {
            Items = dtos,
            Total = total,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<CompanyDto?> GetCompanyByIdAsync(Guid id)
    {
        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        return company == null ? null : _mapper.Map<CompanyDto>(company);
    }

    public async Task<AdminCompanyDetailDto?> GetAdminCompanyDetailAsync(Guid id)
    {
        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        if (company == null)
            return null;

        var internships = await _db.Internships
            .Where(i => i.CompanyId == id && !i.IsDeleted)
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var items = internships.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName ?? string.Empty,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = i.Status.ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count(s => !s.IsDeleted) ?? 0,
            CreatedAt = i.CreatedAt
        }).ToList();

        var positions = (await GetPositionsAsync(id)).ToList();

        return new AdminCompanyDetailDto
        {
            Company = _mapper.Map<CompanyDto>(company),
            Internships = items,
            Positions = positions
        };
    }

    public async Task<IEnumerable<CompanyDto>> GetActiveCompaniesAsync(int skip = 0, int take = 100, Guid? semesterId = null)
    {
        var query = _db.Companies
            .Where(c => c.IsActive && !c.IsDeleted);

        if (semesterId.HasValue && semesterId != Guid.Empty)
        {
            // Exclude companies the admin marked "ngưng liên kết" for this semester,
            // so new assignments only pick from the term's partner roster.
            query = query.Where(c => !_db.SemesterCompanies
                .Any(sc => sc.SemesterId == semesterId.Value && sc.CompanyId == c.Id && !sc.IsActive));
        }

        var companies = await query
            .OrderBy(c => c.CompanyName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var dtos = _mapper.Map<List<CompanyDto>>(companies);
        if (dtos.Count == 0)
            return dtos;

        var companyIds = companies.Select(c => c.Id).ToList();
        var internshipQuery = _db.Internships
            .Where(i => !i.IsDeleted && i.CompanyId != null && companyIds.Contains(i.CompanyId.Value));

        if (semesterId.HasValue && semesterId != Guid.Empty)
            internshipQuery = internshipQuery.Where(i => i.SemesterId == semesterId.Value);

        var studentCounts = await internshipQuery
            .GroupBy(i => i.CompanyId)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(item => item.CompanyId, item => item.Count);

        foreach (var dto in dtos)
        {
            dto.StudentCount = studentCounts.GetValueOrDefault(dto.Id);
            if (semesterId.HasValue && semesterId != Guid.Empty)
                dto.IsSemesterLinked = true;
        }

        return dtos;
    }

    public async Task SetCompanySemesterStatusAsync(Guid companyId, Guid semesterId, bool isLinked)
    {
        var companyExists = await _db.Companies.AnyAsync(c => c.Id == companyId && !c.IsDeleted);
        if (!companyExists)
            throw new InvalidOperationException("Company not found");

        var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == semesterId && !s.IsDeleted);
        if (!semesterExists)
            throw new InvalidOperationException("Semester not found");

        var link = await _db.SemesterCompanies
            .FirstOrDefaultAsync(sc => sc.SemesterId == semesterId && sc.CompanyId == companyId);

        if (link == null)
        {
            // Absence of a row means "linked by default": only create a row when unlinking.
            if (!isLinked)
            {
                _db.SemesterCompanies.Add(new SemesterCompany
                {
                    Id = Guid.NewGuid(),
                    SemesterId = semesterId,
                    CompanyId = companyId,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();
            }
            return;
        }

        link.IsActive = isLinked;
        link.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<CompanyDto> CreateCompanyAsync(CreateCompanyRequest request)
    {
        var companyCode = NullIfWhiteSpace(request.CompanyCode);
        var existingCompany = await _db.Companies
            .FirstOrDefaultAsync(c => c.CompanyName == request.CompanyName && !c.IsDeleted);

        if (existingCompany != null)
            throw new InvalidOperationException($"Company name '{request.CompanyName}' already exists");

        if (companyCode != null && await CompanyCodeExistsAsync(companyCode))
            throw new InvalidOperationException($"Company code '{request.CompanyCode}' already exists");

        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyCode = companyCode,
            CompanyName = request.CompanyName.Trim(),
            Address = NullIfWhiteSpace(request.Address),
            Website = NullIfWhiteSpace(request.Website),
            Industry = NullIfWhiteSpace(request.Industry),
            ContactPerson = NullIfWhiteSpace(request.ContactPerson),
            ContactEmail = NullIfWhiteSpace(request.ContactEmail),
            ContactPhone = NullIfWhiteSpace(request.ContactPhone),
            Capacity = request.Capacity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _db.Companies.AddAsync(company);
        await _db.SaveChangesAsync();

        return _mapper.Map<CompanyDto>(company);
    }

    public async Task<CompanyDto?> UpdateCompanyAsync(Guid id, UpdateCompanyRequest request)
    {
        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        if (company == null)
            return null;

        if (!string.Equals(company.CompanyName, request.CompanyName, StringComparison.Ordinal))
        {
            var existingCompany = await _db.Companies
                .FirstOrDefaultAsync(c => c.CompanyName == request.CompanyName && c.Id != id && !c.IsDeleted);

            if (existingCompany != null)
                throw new InvalidOperationException($"Company name '{request.CompanyName}' already exists");
        }

        var companyCode = NullIfWhiteSpace(request.CompanyCode);
        if (companyCode != null &&
            !string.Equals(company.CompanyCode, companyCode, StringComparison.OrdinalIgnoreCase) &&
            await CompanyCodeExistsAsync(companyCode, excludeId: id))
        {
            throw new InvalidOperationException($"Company code '{request.CompanyCode}' already exists");
        }

        company.CompanyCode = companyCode;
        company.CompanyName = request.CompanyName.Trim();
        company.Address = NullIfWhiteSpace(request.Address);
        company.Website = NullIfWhiteSpace(request.Website);
        company.Industry = NullIfWhiteSpace(request.Industry);
        company.ContactPerson = NullIfWhiteSpace(request.ContactPerson);
        company.ContactEmail = NullIfWhiteSpace(request.ContactEmail);
        company.ContactPhone = NullIfWhiteSpace(request.ContactPhone);
        company.Capacity = request.Capacity;
        if (request.IsActive.HasValue)
            company.IsActive = request.IsActive.Value;
        company.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return _mapper.Map<CompanyDto>(company);
    }

    public async Task<bool> DeleteCompanyAsync(Guid id)
    {
        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

        if (company == null)
            return false;

        var hasInternships = await _db.Internships
            .AnyAsync(i => i.CompanyId == id && !i.IsDeleted);

        if (hasInternships)
            throw new InvalidOperationException("Cannot delete company with existing internships");

        company.IsDeleted = true;
        company.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CompanyNameExistsAsync(string name, Guid? excludeId = null)
    {
        var query = _db.Companies.Where(c => c.CompanyName == name && !c.IsDeleted);

        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<bool> CompanyCodeExistsAsync(string code, Guid? excludeId = null)
    {
        var query = _db.Companies.Where(c => c.CompanyCode == code && !c.IsDeleted);

        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<IEnumerable<CompanyDto>> GetCompaniesByIndustryAsync(string industry, int skip = 0, int take = 100)
    {
        var companies = await _db.Companies
            .Where(c => c.Industry == industry && !c.IsDeleted)
            .OrderBy(c => c.CompanyName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return _mapper.Map<List<CompanyDto>>(companies);
    }

    public async Task<CompanyImportResultDto> ImportCompaniesFromExcelAsync(Stream excelStream)
    {
        if (excelStream == null || !excelStream.CanRead)
            throw new ArgumentException("Excel file stream is required");

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("Excel file has no worksheet");

        var usedRange = worksheet.RangeUsed();
        if (usedRange == null)
            throw new InvalidOperationException("Excel file is empty");

        // Header detection mirrors the SV/GV importers: the header row must expose both the
        // business key (MaDN/CompanyCode) and the name (TenDN/CompanyName). Title rows such as
        // "DANH SÁCH DOANH NGHIỆP LIÊN KẾT" and plain STT columns are therefore skipped safely.
        var headerRow = TemplateHelper.FindHeaderRow(worksheet, row =>
        {
            var map = BuildColumnMap(row);
            return map.ContainsKey(CompanyColumn.CompanyCode) && map.ContainsKey(CompanyColumn.CompanyName);
        }) ?? usedRange.FirstRow();

        var columnMap = BuildColumnMap(headerRow);
        if (!columnMap.ContainsKey(CompanyColumn.CompanyCode) || !columnMap.ContainsKey(CompanyColumn.CompanyName))
            throw new InvalidOperationException("Excel must include MaDN (CompanyCode) and TenDN (CompanyName) columns");

        var errors = new List<CompanyImportErrorDto>();
        var created = new List<Company>();
        var updated = new List<Company>();
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var totalRows = 0;

        // Cache existing (non-deleted) companies so repeated imports update the same row instead of
        // failing: matched by CompanyCode first (like MSSV/MaGV), falling back to normalized name so
        // records created before the MaDN column existed can be adopted on the first import.
        var existingCompanies = await _db.Companies
            .Where(c => !c.IsDeleted)
            .ToListAsync();
        var existingByCode = new Dictionary<string, Company>(StringComparer.OrdinalIgnoreCase);
        var existingByName = new Dictionary<string, Company>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in existingCompanies)
        {
            if (!string.IsNullOrWhiteSpace(c.CompanyCode) && !existingByCode.ContainsKey(c.CompanyCode!))
                existingByCode[c.CompanyCode!] = c;

            var nameKey = NormalizeName(c.CompanyName);
            if (!string.IsNullOrEmpty(nameKey) && !existingByName.ContainsKey(nameKey))
                existingByName[nameKey] = c;
        }

        foreach (var row in usedRange.RowsUsed())
        {
            if (row.RowNumber() <= headerRow.RowNumber())
                continue;

            var rowNumber = row.RowNumber();
            var companyCode = GetCell(row, columnMap, CompanyColumn.CompanyCode);
            var companyName = GetCell(row, columnMap, CompanyColumn.CompanyName);
            var industry = GetCell(row, columnMap, CompanyColumn.Industry);
            var contactPerson = GetCell(row, columnMap, CompanyColumn.ContactPerson);
            var contactEmail = GetCell(row, columnMap, CompanyColumn.ContactEmail);
            var contactPhone = GetCell(row, columnMap, CompanyColumn.ContactPhone);
            var address = GetCell(row, columnMap, CompanyColumn.Address);
            var website = GetCell(row, columnMap, CompanyColumn.Website);
            var capacityText = GetCell(row, columnMap, CompanyColumn.Capacity);

            (contactEmail, contactPhone) = TemplateHelper.SanitizeEmailAndPhone(contactEmail, contactPhone);

            if (IsBlankRow(companyCode, companyName, industry, contactPerson, contactEmail, contactPhone, address, website, capacityText))
                continue;

            totalRows++;

            if (string.IsNullOrWhiteSpace(companyCode))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, Message = "Company code (MaDN) is required" });
                continue;
            }

            if (string.IsNullOrWhiteSpace(companyName))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, Message = "Company name (TenDN) is required" });
                continue;
            }

            companyCode = companyCode.Trim();
            companyName = companyName.Trim();

            if (companyCode.Length > 50)
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, Message = "Company code must not exceed 50 characters" });
                continue;
            }

            if (companyName.Length > 250)
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, Message = "Company name must not exceed 250 characters" });
                continue;
            }

            if (!string.IsNullOrWhiteSpace(contactEmail) && !IsValidEmail(contactEmail))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, CompanyName = companyName, Message = "Invalid contact email format" });
                continue;
            }

            if (!string.IsNullOrWhiteSpace(website) && !IsValidUrl(website))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, CompanyName = companyName, Message = "Invalid website URL" });
                continue;
            }

            int? capacity = null;
            if (!string.IsNullOrWhiteSpace(capacityText))
            {
                if (!int.TryParse(capacityText, out var parsed) || parsed <= 0)
                {
                    errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, CompanyName = companyName, Message = "Capacity must be a positive integer" });
                    continue;
                }

                capacity = parsed;
            }

            if (!seenCodes.Add(companyCode))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, CompanyName = companyName, Message = "Duplicate company code in file" });
                continue;
            }

            var normalizedName = NormalizeName(companyName);
            if (!seenNames.Add(normalizedName))
            {
                errors.Add(new CompanyImportErrorDto { RowNumber = rowNumber, CompanyCode = companyCode, CompanyName = companyName, Message = "Duplicate company name in file" });
                continue;
            }

            existingByCode.TryGetValue(companyCode, out var existingCompany);
            existingByName.TryGetValue(normalizedName, out var nameMatch);

            if (existingCompany == null && nameMatch != null)
            {
                if (!string.IsNullOrWhiteSpace(nameMatch.CompanyCode)
                    && !string.Equals(nameMatch.CompanyCode, companyCode, StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add(new CompanyImportErrorDto
                    {
                        RowNumber = rowNumber,
                        CompanyCode = companyCode,
                        CompanyName = companyName,
                        Message = $"Company name already exists with company code '{nameMatch.CompanyCode}'"
                    });
                    continue;
                }

                // Legacy record created before the MaDN column: adopt it under the incoming code.
                existingCompany = nameMatch;
            }

            if (existingCompany != null)
            {
                // Renaming onto a name that another (different) company already uses?
                if (nameMatch != null && nameMatch != existingCompany)
                {
                    errors.Add(new CompanyImportErrorDto
                    {
                        RowNumber = rowNumber,
                        CompanyCode = companyCode,
                        CompanyName = companyName,
                        Message = $"Company name already exists with company code '{nameMatch.CompanyCode ?? "?"}'"
                    });
                    continue;
                }

                // Upsert: refresh contact info (mirrors student/lecturer imports).
                existingCompany.CompanyCode = companyCode;
                existingCompany.CompanyName = companyName;
                if (!string.IsNullOrWhiteSpace(industry))
                    existingCompany.Industry = industry.Trim();
                if (!string.IsNullOrWhiteSpace(contactPerson))
                    existingCompany.ContactPerson = contactPerson.Trim();
                if (!string.IsNullOrWhiteSpace(contactEmail))
                    existingCompany.ContactEmail = contactEmail.Trim();
                if (!string.IsNullOrWhiteSpace(contactPhone))
                    existingCompany.ContactPhone = contactPhone.Trim();
                if (!string.IsNullOrWhiteSpace(address))
                    existingCompany.Address = address.Trim();
                if (!string.IsNullOrWhiteSpace(website))
                    existingCompany.Website = website.Trim();
                if (capacity.HasValue)
                    existingCompany.Capacity = capacity;
                existingCompany.IsActive = true;
                existingCompany.UpdatedAt = DateTime.UtcNow;
                updated.Add(existingCompany);
                continue;
            }

            var company = new Company
            {
                Id = Guid.NewGuid(),
                CompanyCode = companyCode,
                CompanyName = companyName,
                Industry = NullIfWhiteSpace(industry),
                ContactPerson = NullIfWhiteSpace(contactPerson),
                ContactEmail = NullIfWhiteSpace(contactEmail),
                ContactPhone = NullIfWhiteSpace(contactPhone),
                Address = NullIfWhiteSpace(address),
                Website = NullIfWhiteSpace(website),
                Capacity = capacity,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            created.Add(company);
            existingByCode[companyCode] = company;
            existingByName[normalizedName] = company;
        }

        if (created.Count > 0)
        {
            await _db.Companies.AddRangeAsync(created);
        }
        if (updated.Count > 0)
        {
            _db.Companies.UpdateRange(updated);
        }
        if (created.Count > 0 || updated.Count > 0)
        {
            await _db.SaveChangesAsync();
        }

        return new CompanyImportResultDto
        {
            TotalRows = totalRows,
            SuccessCount = created.Count + updated.Count,
            CreatedCount = created.Count,
            UpdatedCount = updated.Count,
            FailedCount = errors.Count,
            SkippedDuplicateCount = 0,
            CreatedCompanies = _mapper.Map<List<CompanyDto>>(created),
            UpdatedCompanies = _mapper.Map<List<CompanyDto>>(updated),
            Errors = errors
        };
    }

    public byte[] GetCompanyImportTemplate()
    {
        return TemplateHelper.GetTemplateBytes("Mau-danh-sach-doanh-nghiep.xlsx", () =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Companies");

            sheet.Cell(1, 1).Value = "DANH SÁCH DOANH NGHIỆP LIÊN KẾT";
            sheet.Range(1, 1, 1, 10).Merge();

            // Row 2 = headers, row 3 = example (mirrors the physical Mau-danh-sach-doanh-nghiep.xlsx).
            sheet.Cell(2, 1).Value = "STT";
            sheet.Cell(2, 2).Value = "Mã doanh nghiệp";
            sheet.Cell(2, 3).Value = "Tên công ty";
            sheet.Cell(2, 4).Value = "Ngành";
            sheet.Cell(2, 5).Value = "Người liên hệ";
            sheet.Cell(2, 6).Value = "Email";
            sheet.Cell(2, 7).Value = "SĐT";
            sheet.Cell(2, 8).Value = "Địa chỉ";
            sheet.Cell(2, 9).Value = "Website";
            sheet.Cell(2, 10).Value = "Số lượng tiếp nhận";

            sheet.Cell(3, 1).Value = 1;
            sheet.Cell(3, 2).Value = 12;
            sheet.Cell(3, 3).Value = "FPT Software";
            sheet.Cell(3, 4).Value = "Cong nghe thong tin";
            sheet.Cell(3, 5).Value = "Ms. Linh Tran";
            sheet.Cell(3, 6).Value = "linh.tran@fptsoftware.com";
            sheet.Cell(3, 7).Value = "0909123456";
            sheet.Cell(3, 8).Value = "Phu My Hung, Q7, TP.HCM";
            sheet.Cell(3, 9).Value = "https://fptsoftware.com";
            sheet.Cell(3, 10).Value = 10;

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Row(2).Style.Font.Bold = true;
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<byte[]> ExportCompaniesExcelAsync()
    {
        var companies = await _db.Companies
            .Include(c => c.Internships)
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.CompanyName)
            .ToListAsync();

        var mappings = new Dictionary<string, Func<Company, object?>>
        {
            ["STT"] = c => companies.IndexOf(c) + 1,
            ["Mã doanh nghiệp"] = c => c.CompanyCode,
            ["Tên công ty"] = c => c.CompanyName,
            ["Ngành"] = c => c.Industry ?? "-",
            ["Người liên hệ"] = c => c.ContactPerson ?? "-",
            ["Email"] = c => c.ContactEmail ?? "-",
            ["SĐT"] = c => c.ContactPhone ?? "-",
            ["Địa chỉ"] = c => c.Address ?? "-",
            ["Website"] = c => c.Website ?? "-",
            ["Số lượng tiếp nhận"] = c => c.Capacity,
            ["Số SV Đang Tiếp Nhận"] = c => c.Internships.Count(i => !i.IsDeleted),
            ["Trạng Thái Hợp Tác"] = c => c.IsActive ? "Đang hoạt động" : "Tạm ngưng",
        };

        return _excelService.ExportToExcel(
            "DanhSachDoanhNghiep",
            "DANH SÁCH DOANH NGHIỆP LIÊN KẾT",
            companies,
            mappings);
    }

    private enum CompanyColumn
    {
        CompanyCode,
        CompanyName,
        Industry,
        ContactPerson,
        ContactEmail,
        ContactPhone,
        Address,
        Website,
        Capacity
    }

    private static Dictionary<CompanyColumn, int> BuildColumnMap(IXLRangeRow headerRow)
    {
        // Use fuzzy column matcher with expanded aliases
        var fuzzyResult = FuzzyColumnMatcher.Match(headerRow, CompanyColumns, minScore: 50);

        // Map string keys back to enum
        var map = new Dictionary<CompanyColumn, int>();
        foreach (var kvp in fuzzyResult)
        {
            if (Enum.TryParse<CompanyColumn>(kvp.Key, out var col))
                map[col] = kvp.Value;
        }

        return map;
    }

    private static string NormalizeName(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var formD = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var ch in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        var res = sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
        return Regex.Replace(res, @"\s+", " ");
    }

    private static string? GetCell(IXLRangeRow row, Dictionary<CompanyColumn, int> map, CompanyColumn column)
    {
        if (!map.TryGetValue(column, out var colIndex))
            return null;

        var cell = row.Cell(colIndex);
        if (cell.DataType == XLDataType.Number)
            return cell.GetDouble().ToString("0");

        var text = cell.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    private static bool IsBlankRow(params string?[] values) =>
        values.All(string.IsNullOrWhiteSpace);

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool IsValidEmail(string email) =>
        Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$");

    private static bool IsValidUrl(string url) =>
        Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uriResult) &&
        (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);

    public async Task<IEnumerable<CompanyPositionDto>> GetPositionsAsync(Guid companyId, Guid? semesterId = null)
    {
        var query = _db.CompanyPositions
            .Include(p => p.Company)
            .Where(p => p.CompanyId == companyId && !p.IsDeleted);

        if (semesterId.HasValue && semesterId != Guid.Empty)
        {
            query = query.Where(p => p.SemesterId == null || p.SemesterId == semesterId.Value);
        }

        var positions = await query
            .OrderByDescending(p => p.IsOpen)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();

        if (positions.Count == 0)
            return Enumerable.Empty<CompanyPositionDto>();

        var internshipQuery = _db.Internships
            .Where(i => !i.IsDeleted && i.CompanyId == companyId && i.Position != null);

        if (semesterId.HasValue && semesterId != Guid.Empty)
        {
            internshipQuery = internshipQuery.Where(i => i.SemesterId == semesterId.Value);
        }

        var filledInternships = await internshipQuery
            .Select(i => new { i.Position, i.SemesterId })
            .ToListAsync();

        return positions.Select(p =>
        {
            var filled = filledInternships.Count(i =>
                string.Equals(i.Position?.Trim(), p.Title.Trim(), StringComparison.OrdinalIgnoreCase) &&
                (!p.SemesterId.HasValue || p.SemesterId == i.SemesterId));

            return new CompanyPositionDto
            {
                Id = p.Id,
                CompanyId = p.CompanyId,
                CompanyName = p.Company?.CompanyName,
                SemesterId = p.SemesterId,
                Title = p.Title,
                Description = p.Description,
                RequiredMajor = p.RequiredMajor,
                RequiredSkills = p.RequiredSkills,
                Location = p.Location,
                Slots = p.Slots,
                FilledSlots = filled,
                Stipend = p.Stipend,
                IsOpen = p.IsOpen,
                CreatedAt = p.CreatedAt
            };
        }).ToList();
    }

    public async Task<CompanyPositionDto?> GetPositionByIdAsync(Guid positionId)
    {
        var p = await _db.CompanyPositions
            .Include(x => x.Company)
            .FirstOrDefaultAsync(x => x.Id == positionId && !x.IsDeleted);

        if (p == null) return null;

        var filled = await _db.Internships
            .CountAsync(i => !i.IsDeleted && i.CompanyId == p.CompanyId && i.Position != null &&
                             i.Position.ToLower() == p.Title.ToLower() &&
                             (!p.SemesterId.HasValue || i.SemesterId == p.SemesterId.Value));

        return new CompanyPositionDto
        {
            Id = p.Id,
            CompanyId = p.CompanyId,
            CompanyName = p.Company?.CompanyName,
            SemesterId = p.SemesterId,
            Title = p.Title,
            Description = p.Description,
            RequiredMajor = p.RequiredMajor,
            RequiredSkills = p.RequiredSkills,
            Location = p.Location,
            Slots = p.Slots,
            FilledSlots = filled,
            Stipend = p.Stipend,
            IsOpen = p.IsOpen,
            CreatedAt = p.CreatedAt
        };
    }

    public async Task<CompanyPositionDto> CreatePositionAsync(Guid companyId, CreateCompanyPositionRequest request)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId && !c.IsDeleted)
            ?? throw new KeyNotFoundException($"Doanh nghiệp với ID {companyId} không tồn tại.");

        var position = new CompanyPosition
        {
            CompanyId = companyId,
            SemesterId = request.SemesterId,
            Title = request.Title.Trim(),
            Description = NullIfWhiteSpace(request.Description),
            RequiredMajor = NullIfWhiteSpace(request.RequiredMajor),
            RequiredSkills = NullIfWhiteSpace(request.RequiredSkills),
            Location = NullIfWhiteSpace(request.Location),
            Slots = request.Slots > 0 ? request.Slots : 1,
            Stipend = request.Stipend,
            IsOpen = request.IsOpen
        };

        _db.CompanyPositions.Add(position);
        await _db.SaveChangesAsync();

        return new CompanyPositionDto
        {
            Id = position.Id,
            CompanyId = position.CompanyId,
            CompanyName = company.CompanyName,
            SemesterId = position.SemesterId,
            Title = position.Title,
            Description = position.Description,
            RequiredMajor = position.RequiredMajor,
            RequiredSkills = position.RequiredSkills,
            Location = position.Location,
            Slots = position.Slots,
            FilledSlots = 0,
            Stipend = position.Stipend,
            IsOpen = position.IsOpen,
            CreatedAt = position.CreatedAt
        };
    }

    public async Task<CompanyPositionDto?> UpdatePositionAsync(Guid positionId, UpdateCompanyPositionRequest request)
    {
        var position = await _db.CompanyPositions
            .Include(p => p.Company)
            .FirstOrDefaultAsync(p => p.Id == positionId && !p.IsDeleted);

        if (position == null) return null;

        position.Title = request.Title.Trim();
        position.SemesterId = request.SemesterId;
        position.Description = NullIfWhiteSpace(request.Description);
        position.RequiredMajor = NullIfWhiteSpace(request.RequiredMajor);
        position.RequiredSkills = NullIfWhiteSpace(request.RequiredSkills);
        position.Location = NullIfWhiteSpace(request.Location);
        position.Slots = request.Slots > 0 ? request.Slots : 1;
        position.Stipend = request.Stipend;
        position.IsOpen = request.IsOpen;
        position.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var filled = await _db.Internships
            .CountAsync(i => !i.IsDeleted && i.CompanyId == position.CompanyId && i.Position != null &&
                             i.Position.ToLower() == position.Title.ToLower() &&
                             (!position.SemesterId.HasValue || i.SemesterId == position.SemesterId.Value));

        return new CompanyPositionDto
        {
            Id = position.Id,
            CompanyId = position.CompanyId,
            CompanyName = position.Company?.CompanyName,
            SemesterId = position.SemesterId,
            Title = position.Title,
            Description = position.Description,
            RequiredMajor = position.RequiredMajor,
            RequiredSkills = position.RequiredSkills,
            Location = position.Location,
            Slots = position.Slots,
            FilledSlots = filled,
            Stipend = position.Stipend,
            IsOpen = position.IsOpen,
            CreatedAt = position.CreatedAt
        };
    }

    public async Task<bool> DeletePositionAsync(Guid positionId)
    {
        var position = await _db.CompanyPositions
            .FirstOrDefaultAsync(p => p.Id == positionId && !p.IsDeleted);

        if (position == null) return false;

        position.IsDeleted = true;
        position.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<CompanySuggestionDto>> SuggestCompaniesAsync(CompanySuggestionRequest request)
    {
        Student? student = null;
        if (request.StudentId.HasValue && request.StudentId != Guid.Empty)
        {
            student = await _db.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId.Value && !s.IsDeleted);
        }

        var targetMajor = student?.Major?.Trim() ?? string.Empty;
        var preferredIndustry = (!string.IsNullOrWhiteSpace(request.PreferredIndustry)
            ? request.PreferredIndustry
            : student?.PreferredIndustry)?.Trim() ?? string.Empty;
        var preferredLocation = (!string.IsNullOrWhiteSpace(request.PreferredLocation)
            ? request.PreferredLocation
            : student?.DesiredLocation)?.Trim() ?? string.Empty;
        var desiredPos = student?.DesiredPosition?.Trim() ?? string.Empty;
        var altPos = student?.AlternativePosition?.Trim() ?? string.Empty;
        var studentSkills = (student?.Skills ?? string.Empty)
            .Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().ToLower())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();

        var unlinkedCompanyIds = await _db.SemesterCompanies
            .Where(sc => sc.SemesterId == request.SemesterId && !sc.IsActive)
            .Select(sc => sc.CompanyId)
            .ToListAsync();

        var companies = await _db.Companies
            .Where(c => c.IsActive && !c.IsDeleted && !unlinkedCompanyIds.Contains(c.Id))
            .ToListAsync();

        if (companies.Count == 0)
            return Enumerable.Empty<CompanySuggestionDto>();

        var companyIds = companies.Select(c => c.Id).ToList();

        var currentCounts = await _db.Internships
            .Where(i => !i.IsDeleted && i.SemesterId == request.SemesterId && i.CompanyId != null && companyIds.Contains(i.CompanyId.Value))
            .GroupBy(i => i.CompanyId!.Value)
            .Select(g => new { CompanyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(k => k.CompanyId, v => v.Count);

        var openPositions = await _db.CompanyPositions
            .Where(p => !p.IsDeleted && p.IsOpen && companyIds.Contains(p.CompanyId) &&
                        (p.SemesterId == null || p.SemesterId == request.SemesterId))
            .ToListAsync();

        var positionsByCompany = openPositions
            .GroupBy(p => p.CompanyId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var results = new List<CompanySuggestionDto>();

        foreach (var c in companies)
        {
            var capacity = c.Capacity ?? 5;
            var currentCount = currentCounts.GetValueOrDefault(c.Id, 0);
            var availableSlots = Math.Max(0, capacity - currentCount);

            if (availableSlots <= 0)
                continue;

            var cPositions = positionsByCompany.GetValueOrDefault(c.Id, new List<CompanyPosition>());

            double score = 10; // Base score
            var reasons = new List<string>();

            // Criteria 1: Industry match with Student Major or PreferredIndustry
            if (!string.IsNullOrEmpty(preferredIndustry) &&
                !string.IsNullOrEmpty(c.Industry) &&
                c.Industry.Contains(preferredIndustry, StringComparison.OrdinalIgnoreCase))
            {
                score += 30;
                reasons.Add($"Ngành nghề '{c.Industry}' khớp nguyện vọng");
            }
            else if (!string.IsNullOrEmpty(targetMajor) &&
                     !string.IsNullOrEmpty(c.Industry) &&
                     (c.Industry.Contains(targetMajor, StringComparison.OrdinalIgnoreCase) ||
                      targetMajor.Contains(c.Industry, StringComparison.OrdinalIgnoreCase) ||
                      (targetMajor.Contains("CNTT", StringComparison.OrdinalIgnoreCase) &&
                       (c.Industry.Contains("Công nghệ", StringComparison.OrdinalIgnoreCase) ||
                        c.Industry.Contains("Phần mềm", StringComparison.OrdinalIgnoreCase) ||
                        c.Industry.Contains("IT", StringComparison.OrdinalIgnoreCase)))))
            {
                score += 25;
                reasons.Add($"Ngành '{c.Industry}' phù hợp chuyên ngành {targetMajor}");
            }

            // Criteria 2: Desired Position match
            CompanyPosition? matchedDesiredPos = null;
            if (!string.IsNullOrEmpty(desiredPos) || !string.IsNullOrEmpty(altPos))
            {
                matchedDesiredPos = cPositions.FirstOrDefault(p =>
                    (!string.IsNullOrEmpty(desiredPos) && (p.Title.Contains(desiredPos, StringComparison.OrdinalIgnoreCase) || desiredPos.Contains(p.Title, StringComparison.OrdinalIgnoreCase))) ||
                    (!string.IsNullOrEmpty(altPos) && (p.Title.Contains(altPos, StringComparison.OrdinalIgnoreCase) || altPos.Contains(p.Title, StringComparison.OrdinalIgnoreCase)))
                );

                if (matchedDesiredPos != null)
                {
                    score += 25;
                    reasons.Add($"Có vị trí '{matchedDesiredPos.Title}' khớp nguyện vọng");
                }
            }

            // Criteria 3: Skills match
            if (studentSkills.Count > 0 && cPositions.Count > 0)
            {
                var matchedSkills = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var pos in cPositions)
                {
                    var posSkillsText = $"{pos.RequiredSkills} {pos.Description}".ToLower();
                    foreach (var sk in studentSkills)
                    {
                        if (posSkillsText.Contains(sk))
                            matchedSkills.Add(sk);
                    }
                }

                if (matchedSkills.Count > 0)
                {
                    score += 15;
                    reasons.Add($"Khớp kỹ năng: {string.Join(", ", matchedSkills.Take(3))}");
                }
            }

            // Criteria 4: Major match on positions
            var matchingMajorPositions = cPositions.Where(p =>
                (!string.IsNullOrEmpty(targetMajor) && !string.IsNullOrEmpty(p.RequiredMajor) &&
                 p.RequiredMajor.Contains(targetMajor, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(targetMajor) && p.Title.Contains(targetMajor, StringComparison.OrdinalIgnoreCase))
            ).ToList();

            if (matchingMajorPositions.Count > 0 && matchedDesiredPos == null)
            {
                score += 20;
                reasons.Add($"Có {matchingMajorPositions.Count} vị trí đúng chuyên ngành");
            }
            else if (cPositions.Count > 0 && matchedDesiredPos == null)
            {
                score += 10;
                reasons.Add($"Có {cPositions.Count} vị trí đang mở");
            }

            // Criteria 5: Available capacity ratio
            var capacityRatio = (double)availableSlots / Math.Max(1, capacity);
            score += Math.Min(15, capacityRatio * 15);
            reasons.Add($"Còn {availableSlots}/{capacity} chỗ trống");

            // Criteria 6: Location match
            if (!string.IsNullOrEmpty(preferredLocation) &&
                (!string.IsNullOrEmpty(c.Address) && c.Address.Contains(preferredLocation, StringComparison.OrdinalIgnoreCase) ||
                 cPositions.Any(p => !string.IsNullOrEmpty(p.Location) && p.Location.Contains(preferredLocation, StringComparison.OrdinalIgnoreCase))))
            {
                score += 10;
                reasons.Add("Địa điểm phù hợp");
            }

            score = Math.Min(100, Math.Round(score, 0));

            results.Add(new CompanySuggestionDto
            {
                CompanyId = c.Id,
                CompanyName = c.CompanyName,
                Industry = c.Industry,
                Address = c.Address,
                Capacity = capacity,
                CurrentStudentCount = currentCount,
                AvailableSlots = availableSlots,
                MatchScore = score,
                MatchReason = string.Join(" • ", reasons),
                OpenPositions = cPositions.Select(p => new CompanyPositionDto
                {
                    Id = p.Id,
                    CompanyId = p.CompanyId,
                    CompanyName = c.CompanyName,
                    SemesterId = p.SemesterId,
                    Title = p.Title,
                    Description = p.Description,
                    RequiredMajor = p.RequiredMajor,
                    RequiredSkills = p.RequiredSkills,
                    Location = p.Location,
                    Slots = p.Slots,
                    Stipend = p.Stipend,
                    IsOpen = p.IsOpen,
                    CreatedAt = p.CreatedAt
                }).ToList()
            });
        }

        return results
            .OrderByDescending(r => r.MatchScore)
            .ThenByDescending(r => r.AvailableSlots)
            .Take(request.MaxResults > 0 ? request.MaxResults : 10)
            .ToList();
    }
}
