import { useState, FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";
import { useAuth } from "../../../hooks/useAuth";
import { resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";

export function ChangePasswordPage() {
  const { isLoggedIn, role, clearMustChangePassword } = useAuth();
  const { branding } = useAppBranding();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn || !role) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword: password,
      });
      clearMustChangePassword();
      setSubmitted(true);
      setTimeout(() => {
        navigate(`/${role}/dashboard`, { replace: true });
      }, 900);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--il-surface-bg)] text-[var(--il-text-primary)] font-sans antialiased">
      <div className="w-full max-w-md il-panel p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={resolveAppAssetUrl(branding.appLogoUrl)}
            alt={branding.appName}
            className="h-12 w-auto object-contain mb-4"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-xl font-bold tracking-tight text-[var(--il-brand-navy)] font-display">
            Đổi mật khẩu bắt buộc
          </h1>
          <p className="mt-1.5 text-xs text-[var(--il-text-secondary)] font-medium">
            Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-center">
            <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-600 mb-2" />
            <p className="text-sm font-bold font-display">
              Đổi mật khẩu thành công
            </p>
            <p className="mt-1.5 text-xs font-medium text-slate-600">
              Đang chuyển tới bảng điều khiển...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="change-current"
                className="text-xs font-bold text-slate-700"
              >
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="change-current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mật khẩu đang dùng"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-md border border-[var(--il-surface-border)] bg-[var(--il-surface-muted)] focus:bg-white focus:border-[var(--il-brand-blue)] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="change-new"
                className="text-xs font-bold text-slate-700"
              >
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="change-new"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-md border border-[var(--il-surface-border)] bg-[var(--il-surface-muted)] focus:bg-white focus:border-[var(--il-brand-blue)] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="change-confirm"
                className="text-xs font-bold text-slate-700"
              >
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="change-confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-md border border-[var(--il-surface-border)] bg-[var(--il-surface-muted)] focus:bg-white focus:border-[var(--il-brand-blue)] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="il-btn il-btn-primary w-full justify-center py-2.5 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Đổi mật khẩu và tiếp tục"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
