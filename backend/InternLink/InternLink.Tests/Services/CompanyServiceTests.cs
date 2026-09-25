using AutoMapper;
using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Application.Mappings;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Services;

public class CompanyServiceTests
{
    private readonly IMapper _mapper;

    public CompanyServiceTests()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<CompanyProfile>();
        });
        _mapper = config.CreateMapper();
    }

    private AppDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private CompanyService CreateService(AppDbContext db) =>
        new CompanyService(db, _mapper, Mock.Of<IExcelService>());

    [Fact]
    public async Task CreateCompanyAsync_WithValidData_ShouldCreateCompany()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            Industry = "Software",
            Address = "123 Main St",
            Website = "https://techcorp.com",
            ContactPerson = "John Doe",
            ContactEmail = "john@techcorp.com",
            Capacity = 10
        };

        // Act
        var result = await service.CreateCompanyAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.CompanyName.Should().Be("Tech Corp");
        result.Industry.Should().Be("Software");
        result.IsActive.Should().BeTrue();
        result.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreateCompanyAsync_WithDuplicateName_ShouldThrowException()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);

        var request1 = new CreateCompanyRequest { CompanyName = "Tech Corp" };
        var request2 = new CreateCompanyRequest { CompanyName = "Tech Corp" };

        // Act
        await service.CreateCompanyAsync(request1);
        var act = async () => await service.CreateCompanyAsync(request2);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task GetCompanyByIdAsync_WithValidId_ShouldReturnCompany()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Tech Corp",
            Industry = "Software",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        // Act
        var result = await service.GetCompanyByIdAsync(company.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(company.Id);
        result.CompanyName.Should().Be("Tech Corp");
    }

    [Fact]
    public async Task GetCompanyByIdAsync_WithInvalidId_ShouldReturnNull()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        // Act
        var result = await service.GetCompanyByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCompanyAsync_WithValidData_ShouldUpdateCompany()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Tech Corp",
            Industry = "Software",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var updateRequest = new UpdateCompanyRequest
        {
            CompanyName = "Tech Corp Updated",
            Industry = "IT Services",
            IsActive = false
        };

        // Act
        var result = await service.UpdateCompanyAsync(company.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.CompanyName.Should().Be("Tech Corp Updated");
        result.Industry.Should().Be("IT Services");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteCompanyAsync_WithValidId_ShouldDeleteCompany()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Tech Corp",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        // Act
        var result = await service.DeleteCompanyAsync(company.Id);

        // Assert
        result.Should().BeTrue();
        var deletedCompany = await db.Companies.FindAsync(company.Id);
        deletedCompany.Should().NotBeNull();
        deletedCompany!.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task CompanyNameExistsAsync_WithExistingName_ShouldReturnTrue()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = "Tech Corp",
            CreatedAt = DateTime.UtcNow
        };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        // Act
        var result = await service.CompanyNameExistsAsync("Tech Corp");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task GetActiveCompaniesAsync_ShouldReturnOnlyActiveCompanies()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        db.Companies.AddRange(new[]
        {
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 1", IsActive = true, CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 2", IsActive = false, CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 3", IsActive = true, CreatedAt = DateTime.UtcNow }
        });
        await db.SaveChangesAsync();

        // Act
        var result = await service.GetActiveCompaniesAsync(skip: 0, take: 100);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(c => c.IsActive.Should().BeTrue());
    }

    [Fact]
    public async Task GetAllCompaniesAsync_ShouldReturnPaginatedResults()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        for (int i = 1; i <= 5; i++)
        {
            db.Companies.Add(new Company
            {
                Id = Guid.NewGuid(),
                CompanyName = $"Company {i}",
                CreatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        // Act
        var result = await service.GetAllCompaniesAsync(skip: 0, take: 3);

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetCompaniesWithFilterAsync_ShouldFilterByIndustry()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        db.Companies.AddRange(new[]
        {
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 1", Industry = "Software", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 2", Industry = "Hardware", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 3", Industry = "Software", CreatedAt = DateTime.UtcNow }
        });
        await db.SaveChangesAsync();

        var filter = new CompanyFilterRequest
        {
            Industry = "Software"
        };

        // Act
        var result = await service.GetCompaniesWithFilterAsync(filter);

        // Assert
        result.Items.Should().HaveCount(2);
        result.Total.Should().Be(2);
        result.Items.Should().AllSatisfy(c => c.Industry.Should().Be("Software"));
    }

    [Fact]
    public async Task GetCompaniesWithFilterAsync_ShouldFilterBySearchTerm()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        db.Companies.AddRange(new[]
        {
            new Company { Id = Guid.NewGuid(), CompanyName = "Tech Corp", ContactPerson = "John", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Finance Inc", ContactPerson = "Jane", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Tech Solutions", ContactPerson = "Bob", CreatedAt = DateTime.UtcNow }
        });
        await db.SaveChangesAsync();

        var filter = new CompanyFilterRequest
        {
            SearchTerm = "Tech"
        };

        // Act
        var result = await service.GetCompaniesWithFilterAsync(filter);

        // Assert
        result.Items.Should().HaveCount(2);
        result.Items.Should().AllSatisfy(c => c.CompanyName.Should().Contain("Tech"));
    }

    [Fact]
    public async Task GetCompaniesByIndustryAsync_ShouldFilterByIndustry()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        db.Companies.AddRange(new[]
        {
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 1", Industry = "Software", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 2", Industry = "Hardware", CreatedAt = DateTime.UtcNow },
            new Company { Id = Guid.NewGuid(), CompanyName = "Company 3", Industry = "Software", CreatedAt = DateTime.UtcNow }
        });
        await db.SaveChangesAsync();

        // Act
        var result = await service.GetCompaniesByIndustryAsync("Software", skip: 0, take: 100);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(c => c.Industry.Should().Be("Software"));
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithValidRows_ShouldCreateCompanies()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var stream = CreateCompanyExcel(
            ("12", "FPT Software", "CNTT", "Ms. Linh", "linh@fpt.com", "0901111111", "Q7 HCMC", "https://fpt.com", "10"),
            ("13", "Viettel Digital", "Vien thong", "Mr. Hoang", "hoang@viettel.vn", "0902222222", "Tan Binh", null, "8"));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(2);
        result.FailedCount.Should().Be(0);
        result.CreatedCompanies.Should().Contain(c => c.CompanyName == "FPT Software" && c.CompanyCode == "12");
        (await db.Companies.CountAsync(c => !c.IsDeleted)).Should().Be(2);
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithOfficialTemplateRow_ShouldPersistAllColumns()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        // Mirrors the exact sample row of Mau-danh-sach-doanh-nghiep.xlsx
        // (title row + STT + Mã doanh nghiệp + Số lượng tiếp nhận).
        using var stream = CreateCompanyExcel(
            ("12", "FPT Software", "Cong nghe thong tin", "Ms. Linh Tran", "linh.tran@fptsoftware.com", "0909123456", "Phu My Hung, Q7, TP.HCM", "https://fptsoftware.com", "10"));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.FailedCount.Should().Be(0);
        result.Errors.Should().BeEmpty();

        var company = await db.Companies.FirstOrDefaultAsync(c => c.CompanyCode == "12");
        company.Should().NotBeNull();
        company!.CompanyName.Should().Be("FPT Software");
        company.Industry.Should().Be("Cong nghe thong tin");
        company.ContactPerson.Should().Be("Ms. Linh Tran");
        company.ContactEmail.Should().Be("linh.tran@fptsoftware.com");
        company.ContactPhone.Should().Be("0909123456");
        company.Address.Should().Be("Phu My Hung, Q7, TP.HCM");
        company.Website.Should().Be("https://fptsoftware.com");
        company.Capacity.Should().Be(10);
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithSwappedEmailAndPhone_ShouldAutoDetectAndSucceed()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var stream = CreateCompanyExcel(
            ("14", "TMA Solutions", "CNTT", "Mr. Nam", "901234567", "contact@tma.com.vn", "Q12 HCMC", null, "20"));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.Errors.Should().BeEmpty();

        var company = await db.Companies.FirstOrDefaultAsync(c => c.CompanyName == "TMA Solutions");
        company.Should().NotBeNull();
        company!.ContactEmail.Should().Be("contact@tma.com.vn");
        company.ContactPhone.Should().Be("0901234567");
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithExistingCode_ShouldUpdateInsteadOfError()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company
        {
            Id = companyId,
            CompanyCode = "12",
            CompanyName = "FPT Software",
            ContactPerson = "Old Contact",
            ContactEmail = "old@fpt.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        using var stream = CreateCompanyExcel(
            ("12", "FPT Software", "CNTT", "Ms. Linh", "linh@fpt.com", "0909123456", "Q7 HCMC", "https://fpt.com", "10"));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.UpdatedCount.Should().Be(1);
        result.CreatedCount.Should().Be(0);
        result.FailedCount.Should().Be(0);
        result.Errors.Should().BeEmpty();

        var company = await db.Companies.FindAsync(companyId);
        company.Should().NotBeNull();
        company!.IsDeleted.Should().BeFalse();
        company.ContactPerson.Should().Be("Ms. Linh");
        company.ContactEmail.Should().Be("linh@fpt.com");
        company.Capacity.Should().Be(10);
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithExistingNameWithoutCode_ShouldAdoptIncomingCode()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company
        {
            Id = companyId,
            CompanyName = "FPT Software",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        // Same company, different case, without an existing code (legacy record).
        using var stream = CreateCompanyExcel(
            ("12", "fpt software", "CNTT", null, null, null, null, null, null));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.UpdatedCount.Should().Be(1);
        result.Errors.Should().BeEmpty();

        var company = await db.Companies.FindAsync(companyId);
        company.Should().NotBeNull();
        company!.CompanyCode.Should().Be("12");
        company.CompanyName.Should().Be("fpt software");
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithDuplicateCodeInFile_ShouldReportError()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var stream = CreateCompanyExcel(
            ("12", "FPT Software", "CNTT", null, null, null, null, null, null),
            ("12", "Viettel Digital", "Vien thong", null, null, null, null, null, null));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.FailedCount.Should().Be(1);
        result.Errors.Should().Contain(e => e.CompanyCode == "12" && e.Message.Contains("Duplicate company code"));
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithDuplicateNameInFile_ShouldReportError()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var stream = CreateCompanyExcel(
            ("12", "FPT Software", "CNTT", null, null, null, null, null, null),
            ("13", "FPT Software", "Vien thong", null, null, null, null, null, null));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.FailedCount.Should().Be(1);
        result.Errors.Should().Contain(e => e.CompanyName == "FPT Software" && e.Message.Contains("Duplicate company name"));
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithMissingCodeValue_ShouldReportError()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var stream = CreateCompanyExcel(
            (null, "FPT Software", "CNTT", null, null, null, null, null, null));

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(0);
        result.FailedCount.Should().Be(1);
        result.Errors.Should().Contain(e => e.Message.Contains("Company code (MaDN) is required"));
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithoutCompanyCodeColumn_ShouldThrow()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Companies");
        sheet.Cell(1, 1).Value = "TenDN";
        sheet.Cell(1, 2).Value = "Nganh";
        sheet.Cell(2, 1).Value = "FPT Software";
        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var act = async () => await service.ImportCompaniesFromExcelAsync(stream);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*MaDN (CompanyCode)*");
    }

    [Fact]
    public async Task GetAllCompaniesAsync_WithSemesterId_ShouldReturnAllCompaniesWithScopedCountsAndLinkStatus()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        var semesterId = Guid.NewGuid();
        var otherSemesterId = Guid.NewGuid();
        var companyInSem = new Company { Id = Guid.NewGuid(), CompanyName = "Sem Company", CreatedAt = DateTime.UtcNow };
        var companyOther = new Company { Id = Guid.NewGuid(), CompanyName = "Other Company", CreatedAt = DateTime.UtcNow };
        var student = new Student { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "A", CreatedAt = DateTime.UtcNow };
        db.Companies.AddRange(companyInSem, companyOther);
        db.Students.Add(student);
        db.Internships.AddRange(
            new Internship { Id = Guid.NewGuid(), StudentId = student.Id, SemesterId = semesterId, CompanyId = companyInSem.Id, CreatedAt = DateTime.UtcNow },
            new Internship { Id = Guid.NewGuid(), StudentId = student.Id, SemesterId = otherSemesterId, CompanyId = companyOther.Id, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = (await service.GetAllCompaniesAsync(skip: 0, take: 100, semesterId: semesterId)).ToList();

        // Companies are master data: all companies appear, linked by default.
        result.Should().HaveCount(2);
        result.Should().Contain(c => c.Id == companyOther.Id);
        result.Should().OnlyContain(c => c.IsSemesterLinked == true);
        // StudentCount is scoped to the selected semester.
        result.Single(c => c.Id == companyInSem.Id).StudentCount.Should().Be(1);
        result.Single(c => c.Id == companyOther.Id).StudentCount.Should().Be(0);
    }

    [Fact]
    public async Task SetCompanySemesterStatusAsync_UnlinkedCompany_IsHiddenFromActiveListButKeptInMasterList()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        var semesterId = Guid.NewGuid();
        var company = new Company { Id = Guid.NewGuid(), CompanyName = "FPT Software", IsActive = true, CreatedAt = DateTime.UtcNow };
        db.Companies.Add(company);
        db.Semesters.Add(new Semester { Id = semesterId, Name = "HK I 2026-2027", Term = "Học kỳ I", AcademicYear = "2026 - 2027", CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        // Unlink for the semester
        await service.SetCompanySemesterStatusAsync(company.Id, semesterId, isLinked: false);

        var master = (await service.GetAllCompaniesAsync(skip: 0, take: 100, semesterId: semesterId)).Single();
        master.IsSemesterLinked.Should().BeFalse();

        // Still visible globally (no semester context)
        var global = (await service.GetAllCompaniesAsync(skip: 0, take: 100)).Single();
        global.IsSemesterLinked.Should().BeNull();

        // Hidden from the active roster used for new assignments in that semester
        var active = (await service.GetActiveCompaniesAsync(skip: 0, take: 100, semesterId: semesterId)).ToList();
        active.Should().BeEmpty();

        // Relink brings it back
        await service.SetCompanySemesterStatusAsync(company.Id, semesterId, isLinked: true);
        var activeAfter = (await service.GetActiveCompaniesAsync(skip: 0, take: 100, semesterId: semesterId)).ToList();
        activeAfter.Should().ContainSingle(c => c.Id == company.Id);
        var masterAfter = (await service.GetAllCompaniesAsync(skip: 0, take: 100, semesterId: semesterId)).Single();
        masterAfter.IsSemesterLinked.Should().BeTrue();
    }

    [Fact]
    public async Task SetCompanySemesterStatusAsync_UnknownCompanyOrSemester_ShouldThrow()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        var company = new Company { Id = Guid.NewGuid(), CompanyName = "FPT Software", CreatedAt = DateTime.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var act = async () => await service.SetCompanySemesterStatusAsync(Guid.NewGuid(), Guid.NewGuid(), isLinked: false);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Company not found*");

        var act2 = async () => await service.SetCompanySemesterStatusAsync(company.Id, Guid.NewGuid(), isLinked: false);
        await act2.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Semester not found*");
    }

    [Fact]
    public void GetCompanyImportTemplate_ShouldReturnXlsxBytes()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        var bytes = service.GetCompanyImportTemplate();

        bytes.Should().NotBeEmpty();
        bytes[0].Should().Be(0x50);
        bytes[1].Should().Be(0x4B);
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_WithPhysicalTemplate_ShouldWork()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        var bytes = service.GetCompanyImportTemplate();
        using var stream = new MemoryStream(bytes);

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.SuccessCount.Should().Be(1);
        result.CreatedCount.Should().Be(1);
        result.FailedCount.Should().Be(0);
        result.Errors.Should().BeEmpty();

        // Dữ liệu mẫu hiện tại của template: 1 công ty (DN_FPT) × 3 vị trí
        // (VT_FPT_01=4 + VT_FPT_02=3 + VT_FPT_03=3 → Capacity = 10, row-per-position layout).
        var company = await db.Companies.FirstOrDefaultAsync(c => c.CompanyCode == "DN_FPT");
        company.Should().NotBeNull();
        company!.CompanyName.Should().Be("Công ty TNHH FPT Software");
        company.Industry.Should().Be("Công nghệ thông tin");
        company.Capacity.Should().Be(10);
        result.PositionsCreatedCount.Should().Be(3);

        var positions = await db.CompanyPositions.Where(p => p.CompanyId == company.Id).ToListAsync();
        positions.Should().HaveCount(3);
        positions.Should().Contain(p => p.PositionCode == "VT_FPT_01" && p.Slots == 4);
        positions.Should().Contain(p => p.PositionCode == "VT_FPT_02" && p.Slots == 3);
        positions.Should().Contain(p => p.PositionCode == "VT_FPT_03" && p.Slots == 3);
    }

    [Fact]
    public async Task ImportCompaniesFromExcelAsync_RowPerPosition_ShouldCreateCompanyOnceAndUpsertPositions()
    {
        var db = GetInMemoryDbContext();
        var service = new CompanyService(db, _mapper, Mock.Of<IExcelService>());

        // Row-per-position layout: the same company (code DN_FPT) repeats on 2 rows,
        // each row introducing a distinct recruitment position.
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Companies");
        sheet.Cell(1, 1).Value = "DANH SÁCH DOANH NGHIỆP LIÊN KẾT";
        sheet.Cell(2, 1).Value = "STT";
        sheet.Cell(2, 2).Value = "Mã DN";
        sheet.Cell(2, 3).Value = "Tên công ty";
        sheet.Cell(2, 4).Value = "Ngành";
        sheet.Cell(2, 10).Value = "Mã Vị Trí";
        sheet.Cell(2, 11).Value = "Tên vị trí tuyển dụng";
        sheet.Cell(2, 12).Value = "Chuyên ngành yêu cầu";
        sheet.Cell(2, 13).Value = "Số lượng tiếp nhận";

        sheet.Cell(3, 2).Value = "DN_FPT";
        sheet.Cell(3, 3).Value = "Công ty TNHH FPT Software";
        sheet.Cell(3, 4).Value = "CNTT";
        sheet.Cell(3, 10).Value = "VT_FPT_01";
        sheet.Cell(3, 11).Value = "Backend Developer";
        sheet.Cell(3, 12).Value = "Cong nghe phan mem";
        sheet.Cell(3, 13).Value = 4;

        sheet.Cell(4, 2).Value = "DN_FPT";
        sheet.Cell(4, 3).Value = "Công ty TNHH FPT Software";
        sheet.Cell(4, 4).Value = "CNTT";
        sheet.Cell(4, 10).Value = "VT_FPT_02";
        sheet.Cell(4, 11).Value = "Frontend Developer";
        sheet.Cell(4, 12).Value = "Cong nghe phan mem";
        sheet.Cell(4, 13).Value = 3;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var result = await service.ImportCompaniesFromExcelAsync(stream);

        result.FailedCount.Should().Be(0);
        result.Errors.Should().BeEmpty();
        result.CreatedCount.Should().Be(1);
        result.PositionsCreatedCount.Should().Be(2);

        (await db.Companies.CountAsync(c => !c.IsDeleted)).Should().Be(1);
        var positions = await db.CompanyPositions.OrderBy(p => p.PositionCode).ToListAsync();
        positions.Should().HaveCount(2);
        positions[0].PositionCode.Should().Be("VT_FPT_01");
        positions[0].Title.Should().Be("Backend Developer");
        positions[0].Slots.Should().Be(4);
        positions[1].PositionCode.Should().Be("VT_FPT_02");
        positions[1].Slots.Should().Be(3);
    }

    private static MemoryStream CreateCompanyExcel(
        params (string? Code, string Name, string? Industry, string? Contact, string? Email, string? Phone, string? Address, string? Website, string? Capacity)[] rows)
    {
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Companies");

        // Official layout of Mau-danh-sach-doanh-nghiep.xlsx: title on row 1, headers on row 2,
        // data (with STT + Mã doanh nghiệp) from row 3.
        sheet.Cell(1, 1).Value = "DANH SÁCH DOANH NGHIỆP LIÊN KẾT";
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

        for (var i = 0; i < rows.Length; i++)
        {
            var row = rows[i];
            var excelRow = i + 3;
            sheet.Cell(excelRow, 1).Value = i + 1;
            if (row.Code != null) sheet.Cell(excelRow, 2).Value = row.Code;
            sheet.Cell(excelRow, 3).Value = row.Name;
            if (row.Industry != null) sheet.Cell(excelRow, 4).Value = row.Industry;
            if (row.Contact != null) sheet.Cell(excelRow, 5).Value = row.Contact;
            if (row.Email != null) sheet.Cell(excelRow, 6).Value = row.Email;
            if (row.Phone != null) sheet.Cell(excelRow, 7).Value = row.Phone;
            if (row.Address != null) sheet.Cell(excelRow, 8).Value = row.Address;
            if (row.Website != null) sheet.Cell(excelRow, 9).Value = row.Website;
            if (row.Capacity != null) sheet.Cell(excelRow, 10).Value = row.Capacity;
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public async Task CreatePositionAsync_WithValidData_ShouldCreatePosition()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var company = new Company { CompanyName = "FPT Software", IsActive = true };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var request = new CreateCompanyPositionRequest
        {
            Title = "Backend .NET Intern",
            Slots = 3,
            RequiredMajor = "CNTT",
            RequiredSkills = "C#, .NET, SQL",
            Stipend = 5000000,
            Location = "Hà Nội"
        };

        // Act
        var result = await service.CreatePositionAsync(company.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Backend .NET Intern");
        result.Slots.Should().Be(3);
        result.FilledSlots.Should().Be(0);
        result.Stipend.Should().Be(5000000);
        result.RequiredMajor.Should().Be("CNTT");

        var posInDb = await db.CompanyPositions.FirstOrDefaultAsync(p => p.Id == result.Id);
        posInDb.Should().NotBeNull();
        posInDb!.CompanyId.Should().Be(company.Id);
    }

    [Fact]
    public async Task GetPositionsAsync_ShouldReturnPositionsAndFilledSlots()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var company = new Company { CompanyName = "VNG", IsActive = true };
        db.Companies.Add(company);
        var student = new Student { StudentCode = "SV001", FullName = "Nguyen Van A" };
        db.Students.Add(student);
        await db.SaveChangesAsync();

        var position = new CompanyPosition
        {
            CompanyId = company.Id,
            Title = "Frontend React Intern",
            Slots = 2,
            IsOpen = true
        };
        db.CompanyPositions.Add(position);

        var internship = new Internship
        {
            CompanyId = company.Id,
            StudentId = student.Id,
            Position = "Frontend React Intern"
        };
        db.Internships.Add(internship);
        await db.SaveChangesAsync();

        // Act
        var positions = (await service.GetPositionsAsync(company.Id)).ToList();

        // Assert
        positions.Should().HaveCount(1);
        positions[0].Title.Should().Be("Frontend React Intern");
        positions[0].Slots.Should().Be(2);
        positions[0].FilledSlots.Should().Be(1);
    }

    [Fact]
    public async Task UpdatePositionAsync_ShouldUpdateFields()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var company = new Company { CompanyName = "Viettel", IsActive = true };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var position = new CompanyPosition
        {
            CompanyId = company.Id,
            Title = "Tester",
            Slots = 1,
            IsOpen = true
        };
        db.CompanyPositions.Add(position);
        await db.SaveChangesAsync();

        var updateReq = new UpdateCompanyPositionRequest
        {
            Title = "QA/QC Intern",
            Slots = 4,
            IsOpen = false
        };

        // Act
        var updated = await service.UpdatePositionAsync(position.Id, updateReq);

        // Assert
        updated.Should().NotBeNull();
        updated!.Title.Should().Be("QA/QC Intern");
        updated.Slots.Should().Be(4);
        updated.IsOpen.Should().BeFalse();
    }

    [Fact]
    public async Task DeletePositionAsync_ShouldSoftDelete()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var company = new Company { CompanyName = "KMS", IsActive = true };
        db.Companies.Add(company);
        var position = new CompanyPosition { CompanyId = company.Id, Title = "DevOps" };
        db.CompanyPositions.Add(position);
        await db.SaveChangesAsync();

        // Act
        var result = await service.DeletePositionAsync(position.Id);

        // Assert
        result.Should().BeTrue();
        var pos = await db.CompanyPositions.FirstOrDefaultAsync(p => p.Id == position.Id);
        pos!.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task SuggestCompaniesAsync_ShouldPrioritizeMatchingMajorAndCapacity()
    {
        // Arrange
        var db = GetInMemoryDbContext();
        var service = CreateService(db);
        var semester = new Semester { Name = "HK1 2026-2027", AcademicYear = "2026-2027", Term = "Học kỳ I" };
        db.Semesters.Add(semester);

        var compA = new Company { CompanyName = "FPT Software", Industry = "Công nghệ thông tin", Capacity = 10, IsActive = true };
        var compB = new Company { CompanyName = "Techcombank", Industry = "Ngân hàng", Capacity = 5, IsActive = true };
        db.Companies.AddRange(compA, compB);

        var student = new Student { StudentCode = "SV01", FullName = "Le Van C", Major = "CNTT" };
        db.Students.Add(student);

        var pos = new CompanyPosition
        {
            CompanyId = compA.Id,
            SemesterId = semester.Id,
            Title = "CNTT Intern",
            RequiredMajor = "CNTT",
            Slots = 5,
            IsOpen = true
        };
        db.CompanyPositions.Add(pos);
        await db.SaveChangesAsync();

        var request = new CompanySuggestionRequest
        {
            SemesterId = semester.Id,
            StudentId = student.Id
        };

        // Act
        var suggestions = (await service.SuggestCompaniesAsync(request)).ToList();

        // Assert
        suggestions.Should().NotBeEmpty();
        suggestions[0].CompanyName.Should().Be("FPT Software");
        suggestions[0].MatchScore.Should().BeGreaterThan(suggestions.Count > 1 ? suggestions[1].MatchScore : 0);
        suggestions[0].OpenPositions.Should().HaveCount(1);
    }

    // ── IDOR guards (rà lỗ hổng ngoài báo cáo) ─────────────────────────────

    private static async Task<(Company Own, Company Other, Company Shared, Company HostsDeptStudent, Guid DeptA)> SeedAccessCompaniesAsync(AppDbContext db)
    {
        var deptA = Guid.NewGuid();
        var deptB = Guid.NewGuid();

        var own = new Company { Id = Guid.NewGuid(), CompanyName = "Own DN", DepartmentId = deptA, CreatedAt = DateTime.UtcNow };
        var other = new Company { Id = Guid.NewGuid(), CompanyName = "Other DN", DepartmentId = deptB, CreatedAt = DateTime.UtcNow };
        var shared = new Company { Id = Guid.NewGuid(), CompanyName = "Shared DN", DepartmentId = null, CreatedAt = DateTime.UtcNow };
        var host = new Company { Id = Guid.NewGuid(), CompanyName = "Host DN", DepartmentId = deptB, CreatedAt = DateTime.UtcNow };

        await db.Companies.AddRangeAsync(own, other, shared, host);

        // Host DN (của khoa B) đang tiếp nhận 1 SV khoa A → khoa A phải thấy được DN này.
        var studentA = new Student { Id = Guid.NewGuid(), StudentCode = "SA01", FullName = "SV khoa A", DepartmentId = deptA, CreatedAt = DateTime.UtcNow };
        await db.Students.AddAsync(studentA);
        await db.Internships.AddAsync(new Internship { Id = Guid.NewGuid(), StudentId = studentA.Id, CompanyId = host.Id, Status = InternshipStatus.InProgress, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();
        return (own, other, shared, host, deptA);
    }

    [Fact]
    public async Task HasCompanyAccessAsync_ShouldFollowDepartmentPolicy()
    {
        var db = GetInMemoryDbContext();
        var (own, other, shared, host, deptA) = await SeedAccessCompaniesAsync(db);
        var service = CreateService(db);

        // DN khoa khác, không nhận SV khoa A → từ chối.
        (await service.HasCompanyAccessAsync(other.Id, deptA)).Should().BeFalse();

        // DN cùng khoa / dùng chung / đang nhận SV khoa A → cho phép.
        (await service.HasCompanyAccessAsync(own.Id, deptA)).Should().BeTrue();
        (await service.HasCompanyAccessAsync(shared.Id, deptA)).Should().BeTrue();
        (await service.HasCompanyAccessAsync(host.Id, deptA)).Should().BeTrue();

        // SuperAdmin (null) → toàn quyền.
        (await service.HasCompanyAccessAsync(other.Id, null)).Should().BeTrue();
    }

    [Fact]
    public async Task HasCompanyAccessAsync_ShouldNotLeakOtherDepartmentData()
    {
        var db = GetInMemoryDbContext();
        var (_, other, _, _, _) = await SeedAccessCompaniesAsync(db);
        var service = CreateService(db);

        // Khoa khác không thấy DN này qua by-id → IDOR bị chặn.
        (await service.HasCompanyAccessAsync(other.Id, Guid.NewGuid())).Should().BeFalse();
    }
}
