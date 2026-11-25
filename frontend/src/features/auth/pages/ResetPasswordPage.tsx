import { useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";
import { resolveAppAssetUrl, useAppBranding } from "../../../contexts/AppBrandingContext";

export function ResetPasswordPage() {
  const { branding } = useAppBranding();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const hasToken = Boolean(token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasToken) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ.");
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
      await authService.resetPassword({
        token: token!,
        newPassword: password,
      });
      setSubmitted(true);
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
            Đặt lại mật khẩu
          </h1>
          <p className="mt-1.5 text-xs text-[var(--il-text-secondary)] font-medium">
            Tạo mật khẩu mới cho tài khoản {branding.appName} của bạn.
          </p>
        </div>

        {!hasToken && (
          <div className="mb-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Không có mã xác thực (token). Bạn vẫn có thể thử demo đặt lại mật
              khẩu.
            </span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-center">
              <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold font-display">
                Đặt lại mật khẩu thành công
              </p>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">
                Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
            </div>
            <Link
              to="/login"
              className="il-btn il-btn-primary w-full justify-center py-2.5"
            >
              Đăng nhập ngay
            </Link>
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
                htmlFor="reset-password"
                className="text-xs font-bold text-slate-700"
              >
                Mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reset-password"
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
                  title={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
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
                htmlFor="reset-confirm"
                className="text-xs font-bold text-slate-700"
              >
                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reset-confirm"
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
                  title={showConfirm ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
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
                "Đặt lại mật khẩu"
              )}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--il-brand-blue)] hover:text-[#1e40af] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại đăng nhập
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
