import { useState, useRef, FormEvent } from "react";
import { FileUp, X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { adminLecturersService } from "../../../../services/adminLecturers.service";
import { getApiErrorMessage } from "../../../../lib/apiClient";
import type { LecturerImportResultDto } from "../../../../types/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSuccess: () => void;
  currentSemesterId?: string | null;
}

export const ImportLecturersModal = ({
  isOpen,
  onClose,
  onShowToast,
  onSuccess,
  currentSemesterId,
}: Props) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<LecturerImportResultDto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminLecturersService.downloadImportTemplate();
      onShowToast("Đã tải xuống file mẫu danh sách giảng viên (.xlsx)");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onShowToast("Vui lòng chọn file Excel để import!");
      return;
    }

    setIsUploading(true);
    setResult(null);
    try {
      const res = await adminLecturersService.importExcel(
        selectedFile,
        currentSemesterId ?? undefined,
        false,
      );
      setResult(res);
      if (res.successCount > 0) {
        onShowToast(
          `Import thành công ${res.successCount}/${res.totalRows} giảng viên · Có thể cấp tài khoản sau trong danh sách`,
        );
        onSuccess();
      } else {
        onShowToast(`Import hoàn tất với ${res.failedCount} lỗi. Vui lòng kiểm tra lại.`);
      }
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Import Danh Sách Giảng Viên
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Đồng bộ hồ sơ giảng viên hướng dẫn từ Excel: STT, Mã GV, Họ và tên, Email, SĐT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Download Template Banner */}
          <div className="p-3 bg-blue-50/70 rounded-md border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700">
                File mẫu chuẩn danh sách giảng viên (Mau-danh-sach-GV.xlsx)
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded border border-blue-200 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file mẫu</span>
            </button>
          </div>

          {/* Upload Drop Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 p-6 rounded-lg text-center space-y-2 cursor-pointer transition-colors"
          >
            <Upload className="w-8 h-8 text-blue-600 mx-auto" />
            <div>
              <p className="font-bold text-slate-800 text-xs">
                {selectedFile
                  ? selectedFile.name
                  : "Bấm để chọn file Excel hoặc kéo thả file vào đây"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Định dạng hỗ trợ: .xlsx, .xls • Tạo hồ sơ giảng viên từ file Excel
              </p>
            </div>
          </div>

          {/* Result Summary */}
          {result && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <p className="text-[10px] text-slate-500 font-semibold">Tổng số dòng</p>
                  <p className="text-base font-bold text-slate-800">{result.totalRows}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md">
                  <p className="text-[10px] text-emerald-700 font-semibold">Thành công</p>
                  <p className="text-base font-bold text-emerald-800 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {result.successCount}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md">
                  <p className="text-[10px] text-rose-700 font-semibold">Lỗi / Trùng</p>
                  <p className="text-base font-bold text-rose-800 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {result.failedCount + (result.skippedDuplicateCount || 0)}
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-rose-200 rounded-md p-3 bg-rose-50/50">
                  <p className="font-bold text-rose-900 text-xs">Chi tiết lỗi ({result.errors.length} dòng):</p>
                  <div className="space-y-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="text-[11px] text-rose-800 bg-white p-2 rounded border border-rose-200/60 flex items-start gap-2">
                        <span className="font-mono font-bold bg-rose-100 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                          Dòng {err.rowNumber}
                        </span>
                        <span className="flex-1">
                          {err.staffCode ? <strong>{err.staffCode}: </strong> : null}
                          {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {selectedFile ? (
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-500 hover:text-slate-700 text-xs underline cursor-pointer"
              >
                Chọn file khác
              </button>
            ) : <span />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isUploading ? "Đang xử lý import..." : "Bắt đầu Import"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
