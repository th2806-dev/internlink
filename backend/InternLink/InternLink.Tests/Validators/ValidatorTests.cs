using FluentAssertions;
using FluentValidation;
using InternLink.Application.DTOs;
using InternLink.Application.Validators;
using Xunit;

namespace InternLink.Tests.Validators;

public class UserValidatorTests
{
    private readonly CreateUserRequestValidator _createValidator = new();

    [Fact]
    public void CreateUserRequestValidator_WithDepartmentAdminRole_ShouldSucceed()
    {
        var request = new CreateUserRequest
        {
            Username = "admin-cntt",
            FullName = "Admin Khoa CNTT",
            Email = "admin.cntt@example.com",
            Role = "DepartmentAdmin",
            DepartmentId = Guid.NewGuid()
        };

        var result = _createValidator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateUserRequestValidator_WithDepartmentAdminRoleAndMissingDepartment_ShouldFail()
    {
        var request = new CreateUserRequest
        {
            Username = "admin-cntt",
            FullName = "Admin Khoa CNTT",
            Email = "admin.cntt@example.com",
            Role = "DepartmentAdmin"
        };

        var result = _createValidator.Validate(request);

        result.IsValid.Should().BeFalse();
    }
}

public class StudentValidatorTests
{
    private readonly CreateStudentRequestValidator _createValidator;
    private readonly UpdateStudentRequestValidator _updateValidator;

    public StudentValidatorTests()
    {
        _createValidator = new CreateStudentRequestValidator();
        _updateValidator = new UpdateStudentRequestValidator();
    }

    [Fact]
    public void CreateStudentRequestValidator_WithValidData_ShouldSucceed()
    {
        // Arrange
        var request = new CreateStudentRequest
        {
            StudentCode = "SV001",
            FullName = "Nguyen Van A",
            Class = "K65",
            Major = "Computer Science",
            Email = "nguyenvana@example.com",
            Phone = "0123456789"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateStudentRequestValidator_WithoutStudentCode_ShouldFail()
    {
        // Arrange
        var request = new CreateStudentRequest
        {
            StudentCode = "",
            FullName = "Nguyen Van A"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "StudentCode");
    }

    [Fact]
    public void CreateStudentRequestValidator_WithoutFullName_ShouldFail()
    {
        // Arrange
        var request = new CreateStudentRequest
        {
            StudentCode = "SV001",
            FullName = ""
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "FullName");
    }

    [Fact]
    public void CreateStudentRequestValidator_WithInvalidEmail_ShouldFail()
    {
        // Arrange
        var request = new CreateStudentRequest
        {
            StudentCode = "SV001",
            FullName = "Nguyen Van A",
            Email = "invalid-email"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Email");
    }

    [Fact]
    public void CreateStudentRequestValidator_WithInvalidPhone_ShouldFail()
    {
        // Arrange
        var request = new CreateStudentRequest
        {
            StudentCode = "SV001",
            FullName = "Nguyen Van A",
            Phone = "invalid-phone!@#"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Phone");
    }

    [Fact]
    public void UpdateStudentRequestValidator_WithValidData_ShouldSucceed()
    {
        // Arrange
        var request = new UpdateStudentRequest
        {
            FullName = "Updated Name",
            Email = "newemail@example.com"
        };

        // Act
        var result = _updateValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }
}

public class CompanyValidatorTests
{
    private readonly CreateCompanyRequestValidator _createValidator;
    private readonly UpdateCompanyRequestValidator _updateValidator;

    public CompanyValidatorTests()
    {
        _createValidator = new CreateCompanyRequestValidator();
        _updateValidator = new UpdateCompanyRequestValidator();
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithValidData_ShouldSucceed()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            Industry = "Software",
            Website = "https://techcorp.com",
            ContactEmail = "contact@techcorp.com",
            Capacity = 10
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithoutName_ShouldFail()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = ""
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "CompanyName");
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithInvalidWebsite_ShouldFail()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            Website = "not-a-url"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Website");
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithInvalidEmail_ShouldFail()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            ContactEmail = "invalid-email"
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "ContactEmail");
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithNegativeCapacity_ShouldFail()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            Capacity = -5
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Capacity");
    }

    [Fact]
    public void CreateCompanyRequestValidator_WithZeroCapacity_ShouldFail()
    {
        // Arrange
        var request = new CreateCompanyRequest
        {
            CompanyName = "Tech Corp",
            Capacity = 0
        };

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Capacity");
    }
}
