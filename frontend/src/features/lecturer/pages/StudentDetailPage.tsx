import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit2,
  GraduationCap,
  Mail,
  Phone,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { Panel } from "../../../components/common/Panel";
import { useSemester } from "../../../contexts/SemesterContext";
import { lecturerInternshipsService } from "../../../services/lecturerInternships.service";
import { lecturerCompaniesService } from "../../../services/lecturerCompanies.service";
import type { CompanyDto } from "../../../types/api";
import type { InternshipDetailDto, LecturerStudentListItemDto } from "../../../types/api";

export const StudentDetailPage = ({ onRefresh }: { onRefresh?: () => Promise<void> | void }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { selectedSemesterId } = useSemester();
  const [detail, setDetail] = useState<InternshipDetailDto | null>(null);
  const [assignment, setAssignment] = useState<LecturerStudentListItemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [position, setPosition] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [internship, assignedStudents] = await Promise.all([
          lecturerInternshipsService.getById(studentId),
          lecturerInternshipsService.getStudents(selectedSemesterId || undefined),
        ]);
        setDetail(internship);
        setAssignment(assignedStudents.find((item) => item.internshipId === studentId) ?? null);
      } catch {
        setDetail(null);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [selectedSemesterId, studentId]);

  const openAssignmentModal = async () => {
    if (!assignment) return;
    setAssignmentError("");
    setSelectedCompanyId(assignment.companyId ?? "");
    setPosition(assignment.position ?? detail?.position ?? "");
    setSupervisorName(detail?.supervisorName ?? "");
    setShowAssignmentModal(true);
    try {
      const activeCompanies = await lecturerCompaniesService.getAvailableForAssignment(selectedSemesterId || undefined);
      setCompanies(activeCompanies);
    } catch {
      setAssignmentError("Không thể tải danh sách doanh nghiệp theo học kỳ hiện tại.");
    }
  };

  const saveAssignment = async () => {
    if (!studentId || !selectedCompanyId) {
      setAssignmentError("Vui lòng chọn doanh nghiệp.");
      return;
    }

    setSavingAssignment(true);
    setAssignmentError("");
    try {
      await lecturerInternshipsService.assignCompany(studentId, {
        companyId: selectedCompanyId,
        position: position.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,
      });
      const [updatedDetail, assignedStudents] = await Promise.all([
        lecturerInternshipsService.getById(studentId),
        lecturerInternshipsService.getStudents(selectedSemesterId || undefined),
      ]);
      setDetail(updatedDetail);
      setAssignment(assignedStudents.find((item) => item.internshipId === studentId) ?? null);
      await onRefresh?.();
      setShowAssignmentModal(false);
    } catch {
      setAssignmentError("Không thể cập nhật doanh nghiệp. Vui lòng kiểm tra quyền và trạng thái doanh nghiệp.");
    } finally {
      setSavingAssignment(false);
    }
  };

  if (loading) {
    return <Panel className="p-6 text-sm text-slate-500">Đang tải hồ sơ sinh viên...</Panel>;
  }

  const student = detail?.student;
  if (!detail || !student || !assignment) {
    return (
      <div className="space-y-5 max-w-[1500px] mx-auto">
        <PageHeader icon={GraduationCap} title="Hồ sơ sinh viên" subtitle="Không tìm thấy dữ liệu phân công." />
        <Panel className="p-6 text-sm text-slate-600">
          Sinh viên không thuộc nhóm hướng dẫn hoặc dữ liệu thực tập không còn tồn tại trong học kỳ hiện tại.
          <button type="button" onClick={() => navigate("/lecturer/students")} className="ml-2 font-bold text-blue-600 hover:text-blue-800">Quay lại danh sách</button>
        </Panel>
      </div>
    );
  }

  const statusClass = assignment.internshipStatus === "Completed" || assignment.internshipStatus === "Graded"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : assignment.internshipStatus === "BehindSchedule" || assignment.internshipStatus === "RequiresRevision"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Hồ sơ sinh viên"
        subtitle={`${student.fullName} · ${student.studentCode} · ${student.class ?? "Chưa rõ lớp"}`}
        actions={[{
          label: "Quay lại danh sách",
          icon: ArrowLeft,
          onClick: () => navigate("/lecturer/students"),
          variant: "secondary",
        }]}
      />

      <Panel className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <InitialsAvatar
              name={student.fullName}
              seed={student.studentCode}
              size={56}
              className="text-lg"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{student.fullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-mono font-bold text-blue-600">{student.studentCode}</span>
                <span>•</span>
                <span>{student.class ?? "—"}</span>
                <span>•</span>
                <span>{student.major ?? "—"}</span>
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md inline-flex items-center gap-1 border ${statusClass}`}>
            <CheckCircle2 className="w-3 h-3" />
            {assignment.internshipStatus}
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="border border-slate-200 rounded-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">Thông tin liên hệ</div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex justify-between gap-4 px-4 py-3"><span className="inline-flex items-center gap-1.5 text-slate-500"><Mail className="w-3.5 h-3.5" />Email</span><span className="font-bold text-blue-600">{student.email ?? "—"}</span></div>
              <div className="flex justify-between gap-4 px-4 py-3"><span className="inline-flex items-center gap-1.5 text-slate-500"><Phone className="w-3.5 h-3.5" />Số điện thoại</span><span className="font-bold text-slate-800">{student.phone ?? "—"}</span></div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-md overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">Thông tin thực tập</div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between gap-4 px-4 py-3"><span className="inline-flex items-center gap-1.5 text-slate-500"><Building2 className="w-3.5 h-3.5" />Doanh nghiệp</span><div className="flex items-center gap-2"><span className="font-bold text-slate-800">{assignment.companyName ?? detail.company?.companyName ?? "Chưa có"}</span><button type="button" onClick={() => void openAssignmentModal()} className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50" title="Gán hoặc đổi doanh nghiệp"><Edit2 className="w-3.5 h-3.5" /></button></div></div>
              <div className="flex justify-between gap-4 px-4 py-3"><span className="text-slate-500">Vị trí</span><span className="font-bold text-slate-800">{assignment.position ?? detail.position ?? "—"}</span></div>
              <div className="flex justify-between gap-4 px-4 py-3"><span className="inline-flex items-center gap-1.5 text-slate-500"><CalendarDays className="w-3.5 h-3.5" />Thời gian</span><span className="font-bold text-slate-800">{assignment.startDate?.slice(0, 10) ?? "—"} → {assignment.endDate?.slice(0, 10) ?? "—"}</span></div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Theo dõi thực tập</h2>
            <p className="text-xs text-slate-500 font-medium">Số liệu theo internship đang được phân công.</p>
          </div>
          <span className="text-xs font-bold text-blue-700">{assignment.progressPercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, assignment.progressPercent))}%` }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4 text-xs">
          <div className="border border-slate-200 rounded-md p-4"><span className="text-slate-500">Báo cáo tuần</span><strong className="mt-1 block text-xl text-slate-900">{assignment.weeklyReportCount}</strong></div>
          <div className="border border-slate-200 rounded-md p-4"><span className="text-slate-500">Chờ duyệt</span><strong className="mt-1 block text-xl text-slate-900">{assignment.pendingReportCount}</strong></div>
          <div className="border border-slate-200 rounded-md p-4"><span className="text-slate-500">Bài nộp</span><strong className="mt-1 block text-xl text-slate-900">{assignment.submissionCount ?? detail.submissions?.length ?? 0}</strong></div>
          <div className="border border-slate-200 rounded-md p-4"><span className="text-slate-500">Điểm cuối kỳ</span><strong className="mt-1 block text-xl text-slate-900">{assignment.finalGrade ?? "—"}</strong></div>
        </div>
      </Panel>

      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Gán doanh nghiệp thực tập</h2>
                <p className="mt-1 text-xs text-slate-500">{student.fullName} · {selectedSemesterId || "Học kỳ hiện tại"}</p>
              </div>
              <button type="button" onClick={() => setShowAssignmentModal(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Đóng</button>
            </div>

            <label className="block text-xs font-bold text-slate-700">
              Doanh nghiệp tiếp nhận
              <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-blue-500">
                <option value="">Chọn doanh nghiệp</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}{company.capacity ? ` · sức chứa ${company.capacity}` : ""}</option>)}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">Vị trí<input value={position} onChange={(event) => setPosition(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-blue-500" placeholder="Ví dụ: Backend Intern" /></label>
              <label className="block text-xs font-bold text-slate-700">Mentor doanh nghiệp<input value={supervisorName} onChange={(event) => setSupervisorName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-blue-500" placeholder="Tên người hướng dẫn" /></label>
            </div>

            {assignmentError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{assignmentError}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setShowAssignmentModal(false)} className="rounded-md bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Hủy</button>
              <button type="button" onClick={() => void saveAssignment()} disabled={savingAssignment || !selectedCompanyId} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savingAssignment ? "Đang lưu..." : "Xác nhận gán"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};