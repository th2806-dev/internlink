using FluentValidation;
using InternLink.Application.DTOs;

namespace InternLink.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Vui lòng nhập tên đăng nhập.")
            .MaximumLength(100).WithMessage("Tên đăng nhập không được vượt quá 100 ký tự.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu.")
            .MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự.")
            .MaximumLength(100).WithMessage("Mật khẩu không được vượt quá 100 ký tự.");
    }
}
