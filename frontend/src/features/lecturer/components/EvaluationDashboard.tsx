import { useState, useMemo, useEffect, useCallback } from "react";
import { Toast } from "../../../components/common/Toast";
import { PageHeader } from "../../../components/common/PageHeader";
import { Toolbar } from "../../../components/common/Toolbar";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { DynamicRubricEvaluation } from "./DynamicRubricEvaluation";
import { EvaluationDetail } from "./EvaluationDetail";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { rubricService } from "../../../services/rubric.service";
import { evaluationService } from "../../../services/evaluation.service";
import { useSemester } from "../../../contexts/SemesterContext";
import {
  Award,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Edit3,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  PieChart,
  Star,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
import type {
  LecturerEvaluationStudentDto,
  EvaluationRubricDto,
} from "../../../types/evaluation";

function mapStudentToGrading(s: LecturerEvaluationStudentDto) {
  return {
    id: s.studentId,
    name: s.fullName,
    mssv: s.studentCode,
    class: s.class ?? "—",
    major: s.major ?? "—",
    company: s.companyName ?? "Chưa có DN",
    supervisor: (s as any).supervisor ?? "—",
    internshipId: s.internshipId,
    evaluationId: s.evaluationId,
    semesterId: s.semesterId ?? undefined,
    weeklyReportCount: String(s.weeklyReportCount ?? 0),
    progress: s.progressPercent,
    hasEvaluation: s.hasEvaluation,
    isFinalized: s.isEvaluationFinalized,
    finalGrade: s.finalGrade ?? undefined,
    avatar: undefined,
  };
}

export const EvaluationDashboard = () => {
  const [students, setStudents] = useState<LecturerEvaluationStudentDto[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { activeSemesterId } = useSemester();
  useEffect(() => {
    if (semesterFilter === null) {
      setSemesterFilter(activeSemesterId ?? "");
    }
  }, [activeSemesterId, semesterFilter]);

  const [rubricStudent, setRubricStudent] = useState<LecturerEvaluationStudentDto | null>(null);
  const [detailStudent, setDetailStudent] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refreshStudents = useCallback(async () => {
    setIsLoadingApi(true);
    try {
      const semesterId = semesterFilter && semesterFilter !== "all" ? semesterFilter : undefined;
      const rows = await rubricService.getLecturerStudents(semesterId);
      setStudents(rows);
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setIsLoadingApi(false);
    }
  }, [semesterFilter]);

  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
      let matchStatus = true;
      if (statusFilter === "Đã chấm") {
        matchStatus = s.isEvaluationFinalized;
      } else if (statusFilter === "Chưa chấm") {
        matchStatus = !s.hasEvaluation;
      } else if (statusFilter === "Đang chấm") {
        matchStatus = s.hasEvaluation && !s.isEvaluationFinalized;
      }
      return matchSearch && matchStatus;
    });
  }, [students, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalStudents = students.length;
  const gradedCount = students.filter((s) => s.isEvaluationFinalized).length;
  const ungradedCount = students.filter((s) => !s.hasEvaluation).length;
  const gradingCount = students.filter((s) => s.hasEvaluation && !s.isEvaluationFinalized).length;
  const avgScore = useMemo(() => {
    const scored = students.filter((s) => s.finalGrade != null);
    if (scored.length === 0) return "0.0";
    return (
      scored.reduce((a, s) => a + (s.finalGrade ?? 0), 0) / scored.length
    ).toFixed(1);
  }, [students]);

  const getStatusBadge = (s: LecturerEvaluationStudentDto) => {
    if (s.isEvaluationFinalized) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Đã chốt
        </span>
      );
    }
    if (s.hasEvaluation) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-full border border-blue-200">
          <Edit3 className="w-3 h-3" />
          Đang chấm
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full border border-amber-200">
        <Clock className="w-3 h-3" />
        Chưa chấm
      </span>
    );
  };

  const getClassification = (score: number | null) => {
    if (score == null) return null;
    if (score >= 9) return { label: "Xuất sắc", color: "text-emerald-700" };
    if (score >= 8) return { label: "Giỏi", color: "text-blue-700" };
    if (score >= 6.5) return { label: "Khá", color: "text-sky-700" };
    if (score >= 5) return { label: "Trung bình", color: "text-amber-700" };
    return { label: "Không đạt", color: "text-rose-700" };
  };

  if (rubricStudent) {
    const gradingStudent = mapStudentToGrading(rubricStudent);
    const semesterId =
      gradingStudent.semesterId ||
      (semesterFilter && semesterFilter !== "all" ? semesterFilter : undefined);

    return (
      <DynamicRubricEvaluation
        student={gradingStudent}
        semesterId={semesterId}
        onBack={() => setRubricStudent(null)}
        onSave={async (data) => {
          try {
              await rubricService.saveScores(
              data.evaluationId,
              data.criteriaScores,
              data.comments,
              gradingStudent.internshipId,
              data.finalize,
            );

            await refreshStudents();
            showToast(
              data.finalize
                ? "Đã lưu và chốt đánh giá thành công!"
                : "Đã lưu bản nháp đánh giá thành công!",
            );
          } catch (err) {
            showToast(getApiErrorMessage(err));
              throw err;
          }
          setRubricStudent(null);
        }}
      />
    );
  }

  if (detailStudent) {
    return (
      <EvaluationDetail
        student={detailStudent}
        onBack={() => setDetailStudent(null)}
        onEdit={(s: any) => {
          setDetailStudent(null);
          const found = students.find(
            (st) => st.studentId === s.id || st.internshipId === s.internshipId,
          );
          if (found) setRubricStudent(found);
        }}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-200 pb-16 font-sans">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <PageHeader
        icon={Award}
        title="Đánh giá & Chấm điểm Thực tập"
        subtitle="Quản lý kết quả chấm điểm theo tiêu chí rubric cho sinh viên thực tập."
        badge={semesterFilter ?? "Tất cả kỳ"}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[]}
      />

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{totalStudents}</span> SV ·{" "}
            <span className="font-bold text-emerald-700">{gradedCount}</span> đã chấm ·{" "}
            <span className="font-bold text-amber-700">{ungradedCount}</span> chờ ·{" "}
            <span className="font-bold text-sky-700">{avgScore}</span>/10
          </p>
        }
      />

      {isLoadingApi ? (
        <Panel className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs text-slate-500">Đang tải danh sách sinh viên...</p>
        </Panel>
      ) : (
        <Panel className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  Danh sách sinh viên & Chấm điểm
                </h2>
              </div>
              {(searchQuery || statusFilter !== "Tất cả") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("Tất cả");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm tên sinh viên, MSSV..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                />
              </div>
              <div>
                <select
                  value={semesterFilter ?? ""}
                  onChange={(e) => {
                    setSemesterFilter(e.target.value || null);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
                >
                  <option value="">Tất cả kỳ</option>
                  <option value="all">Tất cả kỳ (rời rạc)</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Đã chấm">✅ Đã chốt điểm</option>
                  <option value="Đang chấm">✏️ Đang chấm</option>
                  <option value="Chưa chấm">⏳ Chưa chấm</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border border-slate-200/80 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Sinh viên</th>
                    <th className="py-3 px-4">Doanh nghiệp</th>
                    <th className="py-3 px-3 text-center">Hoạt động</th>
                    <th className="py-3 px-3 text-center">Tiến độ</th>
                    <th className="py-3 px-3 text-center">Điểm</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-400 text-xs"
                      >
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                        Không tìm thấy sinh viên nào
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((s) => (
                      <tr key={s.studentId} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <InitialsAvatar name={s.fullName} seed={s.studentCode} size={36} />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">
                                {s.fullName}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {s.studentCode} • {s.class ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 line-clamp-1">
                            {s.companyName ?? "Chưa có DN"}
                          </p>
                          <p className="text-[10px] text-slate-500">{s.major ?? "—"}</p>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-bold text-slate-800 text-[11px]">
                            {s.weeklyReportCount} báo cáo tuần · {s.finalReportSubmitted ? "Đã có báo cáo tốt nghiệp" : "Thiếu báo cáo tốt nghiệp"}
                            {s.practicalProductSubmitted ? " · Có sản phẩm thực tế" : ""}
                          </div>
                          {(s.pendingReportCount ?? 0) > 0 && (
                            <span className="text-[10px] text-amber-700">
                              {s.pendingReportCount} chờ duyệt
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-[11px] text-slate-700">
                              {s.progressPercent}%
                            </span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  s.progressPercent === 100
                                    ? "bg-emerald-500"
                                    : s.progressPercent >= 50
                                      ? "bg-blue-600"
                                      : "bg-amber-500"
                                }`}
                                style={{ width: `${s.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {s.finalGrade != null ? (
                            <div>
                              <span
                                className={`font-bold text-sm font-mono ${
                                  getClassification(s.finalGrade)?.color ?? "text-slate-700"
                                }`}
                              >
                                {s.finalGrade}
                              </span>
                              {getClassification(s.finalGrade) && (
                                <span
                                  className={`block text-[9px] font-bold ${
                                    getClassification(s.finalGrade)?.color
                                  }`}
                                >
                                  {getClassification(s.finalGrade)?.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">{getStatusBadge(s)}</td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setDetailStudent({
                                  id: s.studentId,
                                  name: s.fullName,
                                  mssv: s.studentCode,
                                  class: s.class ?? "—",
                                  major: s.major ?? "—",
                                  company: s.companyName ?? "—",
                                  supervisor: "—",
                                  progress: s.progressPercent,
                                  enterpriseScore: s.finalGrade,
                                  lecturerScore: s.finalGrade,
                                  presentationScore: s.finalGrade,
                                  totalScore: s.finalGrade,
                                  status: s.isEvaluationFinalized
                                    ? "Hoàn thành"
                                    : s.hasEvaluation
                                      ? "Đang chấm"
                                      : "Chưa chấm",
                                  weeklyReportCount: `${s.weeklyReportCount}/${s.weeklyReportCount}`,
                                  lecturerComments:
                                    s.finalGrade != null ? `Điểm: ${s.finalGrade}` : "",
                                  gradeClassification:
                                    getClassification(s.finalGrade)?.label ?? "",
                                  internshipId: s.internshipId,
                                  evaluatedAt: s.evaluatedAt,
                                  hasEvaluation: s.hasEvaluation,
                                  isEvaluationFinalized: s.isEvaluationFinalized,
                                });
                              }}
                              className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                              title="Chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setRubricStudent(s)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors border border-blue-200"
                              title="Chấm điểm theo rubric"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-600">
                <span>Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-400">
                  (
                    {Math.min(
                      (currentPage - 1) * pageSize + 1,
                      filteredStudents.length,
                    )} - {Math.min(currentPage * pageSize, filteredStudents.length)} /{" "}
                    {filteredStudents.length}
                  )
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pg
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  Thống kê chung
                </span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tổng số SV:</span>
                  <span className="font-bold text-slate-900">{totalStudents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Đã chốt điểm:</span>
                  <span className="font-bold text-emerald-700">{gradedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Đang chấm:</span>
                  <span className="font-bold text-blue-700">{gradingCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Chưa chấm:</span>
                  <span className="font-bold text-amber-700">{ungradedCount}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-slate-600">Điểm trung bình:</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {avgScore}/10
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Top sinh viên</span>
              </h3>
              <div className="space-y-2">
                {students
                  .filter((s) => s.finalGrade != null)
                  .sort((a, b) => (b.finalGrade ?? 0) - (a.finalGrade ?? 0))
                  .slice(0, 5)
                  .map((s, idx) => (
                    <div
                      key={s.studentId}
                      className="p-2 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate max-w-[120px]">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {s.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {s.companyName ?? "—"}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-xs px-2 py-0.5 bg-blue-100 text-blue-900 font-mono rounded-md border border-blue-200">
                        {s.finalGrade}
                      </span>
                    </div>
                  ))}
                {students.filter((s) => s.finalGrade != null).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Chưa có điểm
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Cần chấm ({ungradedCount})</span>
              </h3>
              {ungradedCount === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Đã chấm hết!
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {students
                    .filter((s) => !s.hasEvaluation)
                    .slice(0, 10)
                    .map((s) => (
                      <div
                        key={s.studentId}
                        className="p-2 bg-amber-50/50 rounded-md border border-amber-200/60 flex items-center justify-between"
                      >
                        <div className="truncate max-w-[120px]">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {s.fullName}
                          </p>
                          <p className="text-[10px] text-amber-700 truncate">
                            {s.studentCode}
                          </p>
                        </div>
                        <button
                          onClick={() => setRubricStudent(s)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-colors shrink-0"
                        >
                          Chấm ngay
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* PDF Modal removed */}
    </div>
  );
};
