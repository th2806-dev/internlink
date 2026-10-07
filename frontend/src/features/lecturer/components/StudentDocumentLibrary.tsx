import { useState, useMemo } from "react";
import { Toast } from "../../../components/common/Toast";
import { LecturerSubPageHeader } from "./LecturerSubPageHeader";
import {
  BookOpen,
  Search,
  Download,
  Eye,
  FileText,
  Clock,
  FileSpreadsheet,
  File,
  FileArchive,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import type { DocumentItem } from "../../../types/document";

export const StudentDocumentLibrary = ({
  documents,
  onSelectDoc,
  onDownloadDoc,
  onSwitchToLecturerView,
}: {
  documents: DocumentItem[];
  onSelectDoc: (doc: DocumentItem) => void;
  onDownloadDoc: (doc: DocumentItem) => Promise<boolean>;
  onSwitchToLecturerView?: () => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState("T\u1EA5t c\u1EA3");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentDownloads, setRecentDownloads] = useState<DocumentItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const categories = useMemo(
    () => [
      "T\u1EA5t c\u1EA3",
      ...new Set(documents.map((doc) => doc.category)),
    ],
    [documents],
  );
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description &&
          doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        selectedCategory === "T\u1EA5t c\u1EA3" ||
        doc.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);
  const handleDownload = async (doc: DocumentItem) => {
    const downloaded = await onDownloadDoc(doc);
    if (!downloaded) return;

    if (!recentDownloads.some((d) => d.id === doc.id)) {
      setRecentDownloads([doc, ...recentDownloads.slice(0, 3)]);
    }
    triggerToast(
      `\u0110\xE3 t\u1EA3i xu\u1ED1ng th\xE0nh c\xF4ng: ${doc.title}`,
    );
  };
  // Luôn trả về badge hợp lệ — ZIP/RAR/fileType lạ rơi vào nhánh mặc định thay vì undefined (crash).
  const getFileTypeBadge = (type: string) => {
    switch ((type || "").toUpperCase()) {
      case "DOCX":
      case "DOC":
        return {
          bg: "bg-[#026aa7]/5 text-[#026aa7] border-[#026aa7]/20",
          icon: <FileText className="w-5 h-5 text-[#026aa7]" />,
        };
      case "PDF":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <File className="w-5 h-5 text-rose-600" />,
        };
      case "XLSX":
      case "XLS":
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: <FileSpreadsheet className="w-5 h-5 text-slate-600" />,
        };
      case "PPTX":
      case "PPT":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <BarChart3 className="w-5 h-5 text-amber-600" />,
        };
      case "ZIP":
      case "RAR":
      case "7Z":
        return {
          bg: "bg-violet-50 text-violet-700 border-violet-200",
          icon: <FileArchive className="w-5 h-5 text-violet-600" />,
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <File className="w-5 h-5 text-slate-500" />,
        };
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 font-sans">
      {/* Toast Alert */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <LecturerSubPageHeader
        icon={BookOpen}
        title="Biểu mẫu thực tập"
        subtitle="Tải các biểu mẫu và tài liệu do giảng viên cung cấp."
      >
        <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold text-white">
          Giao diện Sinh viên
        </span>
        {onSwitchToLecturerView && (
          <button
            type="button"
            onClick={onSwitchToLecturerView}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Chuyển sang Chế độ Giảng viên</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </LecturerSubPageHeader>

      {/* SEARCH & CATEGORY TABS */}
      <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên biểu mẫu hoặc tài liệu..."
            className="min-h-11 w-full rounded-full border border-slate-300 bg-white pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-colors focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-10 rounded-full px-4 text-xs font-semibold transition-colors whitespace-nowrap ${selectedCategory === cat ? "bg-[#026aa7] text-white shadow-2xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
                {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT: CARDS & RECENT DOWNLOADS SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* DOCUMENT CARDS GRID (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Tài liệu dành cho sinh viên</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredDocs.length} tệp)
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const badgeInfo = getFileTypeBadge(doc.fileType);
              return (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-9 h-9 rounded-md border flex items-center justify-center ${badgeInfo.bg}`}
                      >
                        {badgeInfo.icon}
                      </div>
                      <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-0.5 text-[10px] font-bold text-[#025a8e]">
                        {doc.version} {doc.isLatest && "\u2022 Latest"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectDoc(doc)}
                      className="min-h-11 text-left text-sm font-bold leading-snug text-slate-900 line-clamp-2 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
                    >
                      {doc.title}
                    </button>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2">
                      {doc.description ||
                        "Chưa có mô tả."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        Cập nhật:{" "}
                        <strong className="text-slate-700">
                          {doc.updatedAt}
                        </strong>
                      </span>
                      <span>
                        Dung lượng:{" "}
                        <strong className="text-slate-700">
                          {doc.fileSize}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectDoc(doc)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-[#026aa7] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải xuống</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredDocs.length === 0 && (
              <div className="col-span-full rounded-xl border border-slate-200/90 bg-white py-10 text-center shadow-2xs">
                <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">
                  Không có tài liệu phù hợp.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Thử đổi từ khóa hoặc danh mục.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT DOWNLOADS SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#7bc043]" />
              <span>Đã tải gần đây (Recent Downloads)</span>
            </h3>

            {recentDownloads.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Bạn chưa tải xuống tài liệu nào trong phiên làm việc này.
              </p>
            ) : (
              <div className="space-y-2">
                {recentDownloads.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectDoc(item)}
                    className="cursor-pointer space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-[#026aa7]/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-[#7bc043]/30 bg-[#7bc043]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#446d20]">
                        Đã tải
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.fileType} • {item.fileSize}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-xs line-clamp-1">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
