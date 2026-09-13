using FluentValidation;
using InternLink.Application.DTOs;
using InternLink.Domain.Enums;

namespace InternLink.Application.Validators;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required")
            .MaximumLength(100);

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required")
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Email must be a valid email address")
            .MaximumLength(255)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => r is "Student" or "Lecturer" or "DepartmentAdmin")
            .WithMessage("Role must be Student, Lecturer, or DepartmentAdmin");

        RuleFor(x => x.DepartmentId)
            .NotEmpty()
            .WithMessage("DepartmentId is required when role is DepartmentAdmin")
            .When(x => x.Role == "DepartmentAdmin");

        RuleFor(x => x.StudentCode)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.StudentCode));

        RuleFor(x => x.StaffCode)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.StaffCode));

        RuleFor(x => x)
            .Must(x => !(x.Role == Role.Student.ToString() && !string.IsNullOrWhiteSpace(x.StaffCode)))
            .WithMessage("StaffCode cannot be used when role is Student");

        RuleFor(x => x)
            .Must(x => !(x.Role == Role.Lecturer.ToString() && !string.IsNullOrWhiteSpace(x.StudentCode)))
            .WithMessage("StudentCode cannot be used when role is Lecturer");
    }
}

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required")
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Email must be a valid email address")
            .MaximumLength(255)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}
