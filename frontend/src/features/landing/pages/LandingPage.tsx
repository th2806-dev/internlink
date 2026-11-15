import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  CalendarCheck,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Cpu,
  Database,
  Cloud,
  FileCheck,
  ExternalLink,
  Award,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

export function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn, role, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"school" | "enterprise" | "student">("school");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. TOP STICKY HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/85 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & School Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  Intern<span className="text-blue-500">Link</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v2.0 Production
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Trường Cao đẳng Giao thông Vận tải TP.HCM (HCMCT)
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#ecosystem" className="hover:text-white transition-colors">
              Hệ sinh thái
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Tính năng nghiệp vụ
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Kiến trúc kỹ thuật
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              Về dự án
            </a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => navigate(`/${role}/dashboard`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02]"
              >
                <span>Vào Dashboard ({user?.name || "Tài khoản"})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02]"
              >
                <span>Đăng nhập Cổng Thực tập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* Subtle Ambient Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Verification Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 text-xs font-medium mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang vận hành chính thức tại Khoa CNTT — CĐ GTVT TP.HCM</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
              Nền tảng số hóa quản trị <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
                Thực tập Doanh nghiệp
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Chuẩn hóa quy trình khép kín giữa <strong>Nhà trường</strong>, <strong>Doanh nghiệp</strong> và <strong>Sinh viên</strong>. Xóa bỏ 100% hồ sơ giấy, tự động hóa tính điểm quá trình theo Rubric và báo cáo thống kê kiểm định.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02]"
              >
                <span>Truy cập Cổng Quản trị</span>
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="#ecosystem"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-base border border-slate-700 transition-all"
              >
                <span>Khám phá Hệ sinh thái</span>
              </a>
            </div>
          </div>

          {/* Hero Dashboard Preview Card */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-slate-800/60 border border-slate-700/80 p-2 sm:p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              {/* Fake Browser Window Header */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-4 py-1 rounded-md bg-slate-800 text-[11px] font-mono text-slate-400">
                  internlink.duckdns.org/lecturer/dashboard
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Hệ thống Live
                </div>
              </div>

              {/* Preview Content Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tiến độ kỳ thực tập
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">Tuần 07 / 07</div>
                  <div className="mt-2 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-full rounded-full" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex justify-between">
                    <span>Giai đoạn: Hoàn tất</span>
                    <span className="text-blue-400 font-bold">100%</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tỷ lệ nộp báo cáo
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-400">98.4%</div>
                  <div className="mt-1 text-xs text-slate-400">Đã chấm điểm & phản hồi: 45/46 sinh viên</div>
                  <div className="mt-2 text-xs text-emerald-400/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Không có sinh viên trễ hạn
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Doanh nghiệp tiếp nhận
                  </div>
                  <div className="mt-2 text-2xl font-black text-indigo-400">18 Đối tác</div>
                  <div className="mt-1 text-xs text-slate-400">Lĩnh vực: Software, Logistics, IT Services</div>
                  <div className="mt-2 text-xs text-indigo-400/80 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Đánh giá trực tuyến 100%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF & METRICS */}
      <section className="py-12 bg-slate-950 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-white">5 Vai trò</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
                Khoa · Giảng viên · Doanh nghiệp · SV · Admin
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-blue-400">100%</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">Không giấy tờ (Paperless)</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-indigo-400">7 Tuần</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
                Giám sát báo cáo & minh chứng
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-teal-400">AWS EC2</div>
              <div className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">Hạ tầng Cloud ổn định 24/7</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE TRIPARTITE ECOSYSTEM (3-SIDED VALUE) */}
      <section id="ecosystem" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-400 mb-2">
            Hệ sinh thái liên kết
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Giải quyết triệt để bài toán của cả 3 bên
          </p>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            Không còn tình trạng lạc mất hồ sơ, chậm trễ liên lạc hay khó khăn trong việc thu hoạch kết quả thực tập.
          </p>

          {/* Role Switcher Tabs */}
          <div className="mt-8 inline-flex p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <button
              onClick={() => setActiveTab("school")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "school"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Dành cho Nhà trường</span>
            </button>
            <button
              onClick={() => setActiveTab("enterprise")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "enterprise"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Dành cho Doanh nghiệp</span>
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "student"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Dành cho Sinh viên</span>
            </button>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeTab === "school" && (
            <>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Chấm điểm Rubric tự động</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Công thức tính điểm quá trình tự động theo thang Rubric chuẩn: cộng dồn điểm chuyên cần, chất lượng báo cáo tuần và điểm đánh giá từ DN.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Ghi đè Deadline linh hoạt</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Cơ chế phân quyền độc quyền cho phép từng Giảng viên hướng dẫn chủ động gia hạn lịch nộp báo cáo cho nhóm sinh viên của mình mà không ảnh hưởng toàn khoa.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Xuất báo cáo chuẩn Kiểm định</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Xuất danh sách điểm, tổng kết đánh giá và minh chứng thực tập ra định dạng Excel theo đúng biểu mẫu hành chính của Bộ Giáo dục và Nhà trường.
                </p>
              </div>
            </>
          )}

          {activeTab === "enterprise" && (
            <>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Tiếp cận nhân lực sàng lọc</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Nhận danh sách sinh viên đúng chuyên ngành kèm bảng kỹ năng, đồ án mẫu và học lực để phân bổ vào đúng dự án doanh nghiệp đang triển khai.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Chấm điểm 1-Click trực tuyến</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Không cần in phiếu nhận xét giấy hay đóng dấu tay phức tạp. Người hướng dẫn doanh nghiệp (Mentor) đánh giá năng lực và thái độ trực tiếp qua portal.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Tuyển dụng chuyển đổi cao</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Theo dõi sự tiến bộ thực tế của sinh viên trong suốt 7 tuần làm việc, giúp doanh nghiệp dễ dàng chuyển đổi các bạn xuất sắc thành nhân viên chính thức.
                </p>
              </div>
            </>
          )}

          {activeTab === "student" && (
            <>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Nộp báo cáo tuần tức thời</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Đính kèm file báo cáo, ghi chép nhật ký công việc hằng tuần và nhận thông báo ngay khi Giảng viên hướng dẫn nhận xét hoặc chấm điểm.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Minh bạch điểm số quá trình</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Xem chi tiết điểm quá trình tích lũy, điểm chuyên cần điểm danh và điều kiện dự thi vấn đáp tốt nghiệp ngay trên màn hình cá nhân.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Lưu trữ hồ sơ thực tập trọn đời</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Toàn bộ minh chứng, nhận xét khen ngợi từ Doanh nghiệp được lưu trữ an toàn, sinh viên có thể dùng làm tài liệu chứng chỉ năng lực khi apply việc làm.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 5. ARCHITECTURE & TECH STACK */}
      <section id="architecture" className="py-20 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs uppercase font-bold tracking-widest text-teal-400 mb-2">
              Hạ tầng & Công nghệ
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Được thiết kế cho độ tin cậy và mở rộng
            </p>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Xây dựng trên nền tảng công nghệ doanh nghiệp hàng đầu, tuân thủ nguyên tắc Clean Architecture và bảo mật nghiêm ngặt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <Cpu className="w-8 h-8 text-blue-400 mb-3" />
              <h4 className="text-base font-bold text-white">Backend .NET 8 / 10</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Mô hình Clean Architecture 4 tầng (Domain, Application, Infrastructure, API). Xử lý nghiệp vụ tách biệt, Dependency Injection và tối ưu LINQ queries.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <Layers className="w-8 h-8 text-indigo-400 mb-3" />
              <h4 className="text-base font-bold text-white">React 19 & TypeScript</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Quản lý server-state bằng <strong>TanStack Query</strong> với tính năng cache thông minh, giao diện phản hồi tức thì và không bị giật lag.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <Database className="w-8 h-8 text-emerald-400 mb-3" />
              <h4 className="text-base font-bold text-white">Microsoft SQL Server</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Cơ sở dữ liệu quan hệ mạnh mẽ, lưu trữ toàn bộ lịch sử điểm danh, báo cáo và phân quyền dữ liệu toàn vẹn qua Foreign Keys và Indexes.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <Cloud className="w-8 h-8 text-amber-400 mb-3" />
              <h4 className="text-base font-bold text-white">AWS EC2 Cloud</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Triển khai trên máy chủ Windows Server với IIS Hosting trực tiếp, tự động hóa sao lưu cơ sở dữ liệu định kỳ bằng PowerShell Script.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-slate-950 to-blue-950/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Sẵn sàng chuyển đổi số kỳ thực tập cùng InternLink?
          </h2>
          <p className="mt-4 text-base text-slate-300 max-w-xl mx-auto">
            Hệ thống luôn mở sẵn sàng chào đón sinh viên, giảng viên và các doanh nghiệp đối tác tham gia hợp tác đào tạo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 hover:scale-[1.02]"
            >
              Đăng nhập Cổng Thực tập ngay
            </button>
            <a
              href="mailto:internlink.cntt@gmail.com"
              className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition-all"
            >
              Liên hệ hợp tác Doanh nghiệp
            </a>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer id="about" className="py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              IL
            </div>
            <div>
              <div className="font-bold text-slate-300 text-sm">InternLink Platform</div>
              <div>Khoa Công nghệ Thông tin — Trường CĐ Giao thông Vận tải TP.HCM</div>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div>
              Phát triển bởi <strong>Thạch Hiền</strong> (Project Lead) & Đội ngũ Kỹ thuật
            </div>
            <div className="mt-1 text-slate-600">© 2026 InternLink. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

