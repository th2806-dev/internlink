using FluentValidation;
using InternLink.Application.DTOs;

namespace InternLink.Application.Validators;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu hiện tại.")
            .MinimumLength(6).WithMessage("Mật khẩu phải có ít nhất 6 ký tự.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Vui lòng nhập mật khẩu mới.")
            .MinimumLength(6).WithMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
    }
}
