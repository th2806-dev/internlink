import { useState, useMemo } from "react";
import { Toast } from "../../../components/common/Toast";
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
export const StudentDocumentLibrary = ({
  documents,
  onSelectDoc,
  onDownloadDoc,
  onSwitchToLecturerView,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("T\u1EA5t c\u1EA3");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const categories = [
    "T\u1EA5t c\u1EA3",
    "Bi\u1EC3u m\u1EABu",
    "K\u1EBF ho\u1EA1ch",
    "Nh\u1EADt k\xFD",
    "B\xE1o c\xE1o",
    "H\u01B0\u1EDBng d\u1EABn",
  ];
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
  const handleDownload = (doc) => {
    onDownloadDoc(doc);
    if (!recentDownloads.some((d) => d.id === doc.id)) {
      setRecentDownloads([doc, ...recentDownloads.slice(0, 3)]);
    }
    triggerToast(
      `\u0110\xE3 t\u1EA3i xu\u1ED1ng th\xE0nh c\xF4ng: ${doc.title}`,
    );
  };
  // Luôn trả về badge hợp lệ — ZIP/RAR/fileType lạ rơi vào nhánh mặc định thay vì undefined (crash).
  const getFileTypeBadge = (type) => {
    switch ((type || "").toUpperCase()) {
      case "DOCX":
      case "DOC":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <FileText className="w-5 h-5 text-blue-600" />,
        };
      case "PDF":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <File className="w-5 h-5 text-rose-600" />,
        };
      case "XLSX":
      case "XLS":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
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

      {/* HEADER WITH ROLE SWITCHER */}
      <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Biểu mẫu thực tập
            </h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200">
              Giao diện Sinh viên
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Tải các biểu mẫu và tài liệu do giảng viên cung cấp.
          </p>
        </div>

        {onSwitchToLecturerView && (
          <button
            onClick={onSwitchToLecturerView}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors border border-slate-200 flex items-center gap-1.5"
          >
            <span>Chuyển sang Chế độ Giảng viên</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* SEARCH & CATEGORY TABS */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên biểu mẫu hoặc tài liệu..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === cat ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
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
                  className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-9 h-9 rounded-md border flex items-center justify-center ${badgeInfo.bg}`}
                      >
                        {badgeInfo.icon}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                        {doc.version} {doc.isLatest && "\u2022 Latest"}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectDoc(doc)}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer line-clamp-2 leading-snug"
                    >
                      {doc.title}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2">
                      {doc.description ||
                        "T\xE0i li\u1EC7u h\u01B0\u1EDBng d\u1EABn ch\xEDnh th\u1EE9c t\u1EEB Gi\u1EA3ng vi\xEAn."}
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
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>

                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải xuống</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECENT DOWNLOADS SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
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
                    className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-md border border-slate-100 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
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
