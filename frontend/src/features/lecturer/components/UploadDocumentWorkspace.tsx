import { useState, useRef } from "react";
import { Toast } from "../../../components/common/Toast";
import { ArrowLeft, CloudUpload, Save, X } from "lucide-react";
import { LecturerSubPageHeader } from "./LecturerSubPageHeader";
import type { DocumentItem } from "../../../types/document";

interface UploadDocumentWorkspaceProps {
  initialData?: DocumentItem | null;
  onBack: () => void;
  onSave: (
    payload: {
      title?: string;
      description?: string;
      category?: string;
      rawFiles?: File[];
    },
    isDraft?: boolean,
  ) => void | Promise<void>;
}

export const UploadDocumentWorkspace = ({
  initialData,
  onBack,
  onSave,
}: UploadDocumentWorkspaceProps) => {
  const isEditing = !!initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    setRawFiles((prev) => {
      const combined = [...prev, ...files];
      if (combined.length > 20) {
        triggerToast("Chỉ chấp nhận tối đa 20 tệp");
        return prev;
      }
      return combined;
    });
    triggerToast(`Đã chọn ${files.length} tệp`);
  };

  const removeFile = (idx: number) => {
    setRawFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = (isDraft = false) => {
    if (!isDraft && rawFiles.length === 0) {
      triggerToast("Vui lòng chọn file trước khi tải lên");
      return;
    }

    const payload = {
      rawFiles,
    };

    onSave(payload, isDraft);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 font-sans">
      {/* Toast alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <LecturerSubPageHeader
        icon={CloudUpload}
        title={isEditing ? `Chỉnh sửa tài liệu: ${initialData.title}` : "Tải tài liệu lên"}
        subtitle="Chọn file trên máy và tải lên kho tài liệu thực tập."
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại danh sách tài liệu"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-9 items-center rounded-full border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-5 text-xs font-semibold text-[#025a8e] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#026aa7]"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>Tải lên</span>
        </button>
      </LecturerSubPageHeader>

      {/* UPLOAD AREA */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-[#026aa7] bg-[#026aa7]/5 scale-[1.01]"
              : "border-slate-300 bg-slate-50/50 hover:border-[#026aa7] hover:bg-slate-50"
          }`}
          onClick={handleSelectFile}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
            multiple
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          {rawFiles.length > 0 ? (
            <div className="max-w-lg mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  {rawFiles.length} tệp đã chọn
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRawFiles([]);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {rawFiles.map((f, idx) => {
                  const ext = f.name.split(".").pop()?.toUpperCase() || "DOCX";
                  const size = (f.size / (1024 * 1024)).toFixed(1);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-slate-800 w-7">{ext}</span>
                        <span className="text-slate-600 truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-16 text-right">
                          {size} MB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#026aa7]/10 text-[#026aa7]">
                <CloudUpload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  Kéo &amp; Thả nhiều tệp vào đây, hoặc{" "}
                  <span className="text-[#026aa7] underline">duyệt tệp từ máy tính</span>
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Định dạng hỗ trợ: PDF, Word, Excel, PowerPoint, TXT và ảnh.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                {["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "TXT", "JPG", "PNG", "GIF"].map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 font-bold text-[10px] rounded-md shadow-2xs"
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
