import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { authService } from "../../../services/auth.service";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Vui lòng nhập email đã đăng ký.");
      return;
    }
    setIsLoading(true);
    try {
      await authService.forgotPassword({ email: email.trim() });
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
            src="/logo/logo_internlink-02.png"
            alt="InternLink"
            className="h-12 w-auto object-contain mb-4"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-xl font-bold tracking-tight text-[var(--il-brand-navy)] font-display">
            Quên mật khẩu
          </h1>
          <p className="mt-1.5 text-xs text-[var(--il-text-secondary)] font-medium">
            Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-center">
              <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold font-display">
                Đã gửi email khôi phục mật khẩu thành công!
              </p>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600">
                Liên kết đặt lại mật khẩu đã được gửi tới địa chỉ <strong>{email.trim()}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam) để tạo mật khẩu mới.
              </p>
            </div>
            <Link
              to="/login"
              className="il-btn il-btn-primary w-full justify-center py-2.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
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
                htmlFor="forgot-email"
                className="text-xs font-bold text-slate-700"
              >
                Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@student.hcmct.edu.vn"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-medium rounded-md border border-[var(--il-surface-border)] bg-[var(--il-surface-muted)] focus:bg-white focus:border-[var(--il-brand-blue)] outline-none transition-colors"
                />
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
                  Đang gửi...
                </>
              ) : (
                "Gửi yêu cầu khôi phục"
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
