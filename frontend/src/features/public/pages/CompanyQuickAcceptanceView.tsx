import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequestRaw } from "../../../lib/apiClient";

type AcceptancePreview = {
  referenceCode: string;
  studentName: string;
  studentCode: string;
  className: string | null;
  major: string | null;
  departmentName: string | null;
  companyName: string | null;
  position: string | null;
  semesterName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  expiresAt: string;
};

type AcceptanceConfirmation = {
  studentName: string;
  studentCode: string;
  companyName: string;
  mentorName: string;
  status: string;
  confirmedAt: string;
};

function toDateField(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus-visible:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20";

export default function CompanyQuickAcceptanceView() {
  const { token = "" } = useParams();
  const [preview, setPreview] = useState<AcceptancePreview | null>(null);
  const [confirmation, setConfirmation] = useState<AcceptanceConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentorName, setMentorName] = useState("");
  const [mentorPhone, setMentorPhone] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [mentorDepartment, setMentorDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPreview(null);
    void apiRequestRaw<AcceptancePreview>(
      `/api/v1/public/internship-acceptance/verify?token=${encodeURIComponent(token)}`,
      { auth: false, skipCache: true },
    )
      .then((result) => {
        if (!active) return;
        setPreview(result);
        setStartDate(toDateField(result.startDate));
        setEndDate(toDateField(result.endDate));
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error
            ? cause.message
            : "Liên kết tiếp nhận đã hết hạn hoặc không hợp lệ.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview || !startDate || !endDate || endDate < startDate) {
      setError("Vui lòng kiểm tra ngày bắt đầu và ngày kết thúc dự kiến.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await apiRequestRaw<AcceptanceConfirmation>(
        "/api/v1/public/internship-acceptance/confirm",
        {
          method: "POST",
          auth: false,
          body: {
            token,
            mentorName,
            mentorPhone,
            mentorEmail,
            mentorDepartment,
            startDate: toUtcDate(startDate),
            endDate: toUtcDate(endDate),
          },
        },
      );
      setConfirmation(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xác nhận tiếp nhận. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-slate-700" role="status">
        <LoaderCircle aria-hidden="true" className="mr-3 h-5 w-5 animate-spin text-[#026aa7]" />
        Đang xác minh liên kết tiếp nhận...
      </main>
    );
  }

  if (confirmation) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:py-14">
        <section className="mx-auto max-w-xl rounded-2xl border border-slate-200/90 bg-white p-5 text-center shadow-sm sm:p-8">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-[#7bc043]" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Đã xác nhận tiếp nhận</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {confirmation.studentName} ({confirmation.studentCode}) đã được cập nhật trạng thái thực tập.
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            Người hướng dẫn: <strong>{confirmation.mentorName}</strong>
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Cảm ơn {confirmation.companyName}. Nếu cần điều chỉnh thông tin, vui lòng liên hệ đơn vị phụ trách thực tập của trường.
          </p>
        </section>
      </main>
    );
  }

  if (!preview || error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8">
        <section className="max-w-xl rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-sm">
          <ShieldCheck aria-hidden="true" className="mx-auto h-10 w-10 text-slate-500" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Không thể mở liên kết tiếp nhận</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-rose-800">
            {error ?? "Liên kết đã hết hạn hoặc không hợp lệ."}
          </p>
          <p className="mt-3 text-sm text-slate-600">Vui lòng yêu cầu sinh viên tạo liên kết mới.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rounded-2xl bg-[#026aa7] p-5 text-white shadow-sm sm:p-7">
          <p className="text-sm font-semibold tracking-wide text-white/85">InternLink · Cổng doanh nghiệp</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Xác nhận tiếp nhận thực tập</h1>
          <p className="mt-2 text-sm leading-6 text-white/90">Liên kết được bảo vệ và có thời hạn; chỉ xác nhận khi thông tin sinh viên chính xác.</p>
        </header>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="student-preview-heading">
          <div className="flex items-start justify-between gap-3">
            <h2 id="student-preview-heading" className="text-lg font-bold text-slate-900">Thông tin sinh viên</h2>
            <span className="shrink-0 rounded-full bg-[#026aa7]/10 px-3 py-1 text-xs font-semibold text-[#026aa7]">
              {preview.referenceCode}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Họ và tên</dt><dd className="mt-0.5 font-semibold text-slate-900">{preview.studentName}</dd></div>
            <div><dt className="text-xs text-slate-500">Mã sinh viên</dt><dd className="mt-0.5 font-semibold text-slate-900">{preview.studentCode}</dd></div>
            <div><dt className="text-xs text-slate-500">Lớp · Ngành</dt><dd className="mt-0.5 text-slate-800">{preview.className || "—"} · {preview.major || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Khoa · Học kỳ</dt><dd className="mt-0.5 text-slate-800">{preview.departmentName || "—"} · {preview.semesterName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Đơn vị tiếp nhận</dt><dd className="mt-0.5 font-semibold text-slate-900">{preview.companyName || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Vị trí dự kiến</dt><dd className="mt-0.5 text-slate-800">{preview.position || "—"}</dd></div>
          </dl>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Thông tin người hướng dẫn</h2>
          <label className="block text-sm font-medium text-slate-800">
            Họ tên mentor
            <input required maxLength={200} autoComplete="name" value={mentorName} onChange={(event) => setMentorName(event.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Số điện thoại
              <input required type="tel" maxLength={50} autoComplete="tel" value={mentorPhone} onChange={(event) => setMentorPhone(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Email
              <input required type="email" maxLength={200} autoComplete="email" value={mentorEmail} onChange={(event) => setMentorEmail(event.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            Bộ phận / phòng ban
            <input maxLength={200} autoComplete="organization-title" value={mentorDepartment} onChange={(event) => setMentorDepartment(event.target.value)} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Ngày bắt đầu thực tế
              <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Ngày kết thúc dự kiến
              <input required type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
            </label>
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 text-base font-semibold text-white transition-colors hover:bg-[#025a8f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            {submitting && <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />}
            {submitting ? "Đang xác nhận..." : "Xác nhận tiếp nhận sinh viên thực tập"}
          </button>
          <p className="text-center text-xs leading-5 text-slate-500">
            Liên kết hết hạn {new Date(preview.expiresAt).toLocaleString("vi-VN")}.
          </p>
        </form>
      </div>
    </main>
  );
}
