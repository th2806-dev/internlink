import React from "react";
import { AlertTriangle, RotateCcw, ArrowLeft, Loader2 } from "lucide-react";

export interface RequestErrorStateProps {
  /** Tiêu đề lỗi (mặc định theo chuẩn tiếng Việt của dự án). */
  title?: string;
  /** Thông điệp chi tiết lấy từ ApiClientError / ProblemDetails. */
  message?: string;
  /** HTTP status nếu có (hiển thị để người dùng kỹ thuật dễ tra cứu). */
  status?: number;
  /** Bật nút "Thử lại" — gọi refetch() của TanStack Query. */
  onRetry?: () => void;
  /** Đang retry: vô hiệu hoá nút, hiện spinner (chống bấm đúp). */
  retrying?: boolean;
  /** Tùy chọn "Quay lại trang trước". */
  onBack?: () => void;
  className?: string;
}

/**
 * Trạng thái LỖI chuẩn hoá dùng chung (Giai đoạn 0).
 * Bắt buộc phân biệt với EmptyState: LỖI ≠ "không có dữ liệu".
 */
export const RequestErrorState: React.FC<RequestErrorStateProps> = ({
  title = "Không tải được dữ liệu",
  message,
  status,
  onRetry,
  retrying = false,
  onBack,
  className = "",
}) => {
  return (
    <div
      role="alert"
      data-testid="request-error-state"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-rose-200 bg-rose-50/70 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-rose-200 shadow-xs flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-rose-600" />
      </div>

      <h3 className="text-base font-bold text-rose-900 mb-1 tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-rose-700 max-w-md mb-1">
        {message || "Máy chủ gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại."}
      </p>
      {status !== undefined && status > 0 && (
        <p className="text-[11px] font-semibold text-rose-500 mb-4">Mã lỗi: HTTP {status}</p>
      )}

      {(onRetry || onBack) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="il-btn il-btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Thử lại
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="il-btn il-btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại trang trước
            </button>
          )}
        </div>
      )}
    </div>
  );
};
