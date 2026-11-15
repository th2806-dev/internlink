import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, Printer, Star } from "lucide-react";
import { apiRequestRaw } from "../../../lib/apiClient";

type EvaluationContext = {
  studentName: string;
  studentCode: string;
  department: string | null;
  semester: string | null;
  company: string | null;
  position: string | null;
  mentorName: string;
  gradingRules: {
    ruleSetName: string;
    employerScoreWeight: number;
    minimumPassingScore: number;
    requiredWeeklyReportsCount: number;
  } | null;
  rubric: {
    name: string;
    description: string | null;
    maxScore: number;
    weight: number;
  }[];
};

type EvaluationReceipt = {
  evaluationId: string;
  finalScore: number;
  confirmedMentorName: string;
  confirmedAt: string;
};

const SCORE_FIELDS = [
  { key: "attendanceScore", label: "Chuyên cần", description: "Tuân thủ giờ giấc, nội quy và trách nhiệm trong công việc." },
  { key: "skillsScore", label: "Kỹ năng", description: "Vận dụng kiến thức, kỹ năng chuyên môn và khả năng giải quyết công việc." },
  { key: "attitudeScore", label: "Thái độ", description: "Tinh thần hợp tác, chủ động, cầu thị và giao tiếp tại nơi làm việc." },
] as const;

type ScoreField = (typeof SCORE_FIELDS)[number]["key"];
type ScoreValues = Record<ScoreField, number>;

const INITIAL_SCORES: ScoreValues = {
  attendanceScore: 0,
  skillsScore: 0,
  attitudeScore: 0,
};

function ScorePicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <legend className="px-1 text-base font-semibold text-slate-900">{label}</legend>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Chọn điểm ${label.toLowerCase()}`}>
        {Array.from({ length: 5 }, (_, index) => {
          const starScore = (index + 1) * 2;
          return (
            <button
              key={starScore}
              type="button"
              onClick={() => onChange(starScore)}
              aria-label={`${starScore} trên 10 điểm`}
              aria-pressed={value >= starScore}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-amber-500 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              <Star aria-hidden="true" className={`h-6 w-6 ${value >= starScore ? "fill-current" : ""}`} />
            </button>
          );
        })}
        <span className="ml-2 min-w-20 text-sm font-semibold tabular-nums text-slate-800">
          {value === 0 ? "Chưa chấm" : `${value}/10`}
        </span>
      </div>
    </fieldset>
  );
}

export default function EmployerQuickEvaluationView() {
  const { token = "" } = useParams();
  const [context, setContext] = useState<EvaluationContext | null>(null);
  const [receipt, setReceipt] = useState<EvaluationReceipt | null>(null);
  const [scores, setScores] = useState<ScoreValues>(INITIAL_SCORES);
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [comments, setComments] = useState("");
  const [confirmedMentorName, setConfirmedMentorName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequestRaw<EvaluationContext>(
      `/api/v1/public/employer-evaluations/verify?token=${encodeURIComponent(token)}`,
      { auth: false, skipCache: true },
    )
      .then((data) => {
        if (active) {
          setContext(data);
          setConfirmedMentorName(data.mentorName);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể xác minh liên kết.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const updateScore = (field: ScoreField, value: number) =>
    setScores((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!SCORE_FIELDS.every(({ key }) => scores[key] > 0) || !confirmed || !confirmedMentorName.trim()) {
      setError("Vui lòng chấm đủ 3 tiêu chí, nhập tên xác nhận và đồng ý gửi đánh giá.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await apiRequestRaw<EvaluationReceipt>("/api/v1/public/employer-evaluations/submit", {
        method: "POST",
        auth: false,
        body: {
          token,
          ...scores,
          strengths,
          areasForImprovement,
          comments,
          confirmedMentorName,
          confirmed,
        },
      });
      setReceipt(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gửi đánh giá không thành công. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-slate-700">
        <LoaderCircle aria-hidden="true" className="mr-3 h-5 w-5 animate-spin text-[#026aa7]" />
        Đang xác minh liên kết...
      </main>
    );
  }

  if (receipt) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-10 sm:py-16">
        <section className="mx-auto max-w-xl rounded-xl border border-slate-200/90 bg-white p-6 text-center shadow-2xs sm:p-10">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-[#7bc043]" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Đã gửi đánh giá</h1>
          <p className="mt-2 text-slate-600">Cảm ơn anh/chị đã dành thời gian đánh giá sinh viên thực tập.</p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p>Mã biên nhận: <span className="font-mono">{receipt.evaluationId}</span></p>
            <p className="mt-2">Điểm tổng kết: <strong>{receipt.finalScore.toFixed(2)}/10</strong></p>
            <p className="mt-2">Người xác nhận: {receipt.confirmedMentorName}</p>
            <p className="mt-2">Thời gian: {new Date(receipt.confirmedAt).toLocaleString("vi-VN")}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-5 font-semibold text-white hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
            In / lưu biên nhận PDF
          </button>
          <p className="mt-3 text-xs text-slate-500">Chọn “Lưu thành PDF” trong cửa sổ in của trình duyệt.</p>
        </section>
      </main>
    );
  }

  if (!context || error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
        <section className="max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center shadow-2xs">
          <h1 className="text-xl font-bold text-slate-900">Không thể mở biểu mẫu</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-rose-800">
            {error ?? "Liên kết đánh giá không tồn tại hoặc đã hết hạn."}
          </p>
          <p className="mt-3 text-sm text-slate-600">Vui lòng liên hệ giảng viên phụ trách để được cấp liên kết mới.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-xl bg-[#026aa7] px-5 py-4 text-white shadow-2xs sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">InternLink · Đánh giá doanh nghiệp</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Đánh giá sinh viên thực tập</h1>
          <p className="mt-2 text-sm leading-6 text-white/90">Biểu mẫu bảo mật một lần, liên kết có hiệu lực trong 15 ngày.</p>
        </header>

        <section className="grid gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:grid-cols-2 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sinh viên</p>
            <p className="mt-1 font-semibold text-slate-900">{context.studentName}</p>
            <p className="text-sm text-slate-600">{context.studentCode}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khoa · Đợt thực tập</p>
            <p className="mt-1 text-slate-900">{context.department || "Chưa cập nhật"}</p>
            <p className="text-sm text-slate-600">{context.semester || "Chưa cập nhật"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doanh nghiệp · Vị trí</p>
            <p className="mt-1 text-slate-900">{context.company || "Chưa cập nhật"}</p>
            <p className="text-sm text-slate-600">{context.position || "Chưa cập nhật"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Người hướng dẫn</p>
            <p className="mt-1 text-slate-900">{context.mentorName}</p>
          </div>
          {context.gradingRules && (
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold">{context.gradingRules.ruleSetName}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Trọng số điểm doanh nghiệp: {(context.gradingRules.employerScoreWeight * 100).toLocaleString("vi-VN")}% ·
                Điểm đạt tối thiểu: {context.gradingRules.minimumPassingScore}/10 ·
                Báo cáo tuần yêu cầu: {context.gradingRules.requiredWeeklyReportsCount}
              </p>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section aria-labelledby="score-heading" className="space-y-3">
            <div>
              <h2 id="score-heading" className="text-lg font-bold text-slate-900">Tiêu chí đánh giá</h2>
              <p className="mt-1 text-sm text-slate-600">Mỗi sao tương ứng 2 điểm trên thang 10.</p>
            </div>
            {context.rubric.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Rubric học kỳ</h3>
                <ul className="mt-2 space-y-2">
                  {context.rubric.map((criterion, index) => (
                    <li key={`${criterion.name}-${index}`} className="text-sm text-slate-700">
                      <span className="font-medium">{criterion.name}</span>
                      <span className="text-slate-500">
                        {" "}· Tối đa {criterion.maxScore} điểm · Trọng số {criterion.weight}%
                      </span>
                      {criterion.description && (
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">{criterion.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {SCORE_FIELDS.map(({ key, label, description }) => (
              <ScorePicker key={key} label={label} description={description} value={scores[key]} onChange={(value) => updateScore(key, value)} />
            ))}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">Nhận xét</h2>
            <label className="block text-sm font-medium text-slate-800">
              Điểm mạnh
              <textarea value={strengths} onChange={(event) => setStrengths(event.target.value)} maxLength={2000} rows={3} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Điểm cần cải thiện
              <textarea value={areasForImprovement} onChange={(event) => setAreasForImprovement(event.target.value)} maxLength={2000} rows={3} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Nhận xét thêm
              <textarea value={comments} onChange={(event) => setComments(event.target.value)} maxLength={3000} rows={3} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
            <label className="block text-sm font-medium text-slate-800">
              Họ tên người xác nhận
              <input value={confirmedMentorName} onChange={(event) => setConfirmedMentorName(event.target.value)} required maxLength={200} autoComplete="name" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]" />
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 accent-[#026aa7] focus-visible:ring-[#026aa7]" />
              Tôi xác nhận thông tin đánh giá là chính xác và đồng ý gửi đánh giá này. Họ tên cùng thời điểm gửi được lưu làm xác nhận điện tử.
            </label>
            <p className="text-xs leading-5 text-slate-500">Đây là xác nhận điện tử có ghi nhận thời gian, không thay thế chữ ký số được cấp bởi tổ chức chứng thực.</p>
          </section>

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-5 text-base font-semibold text-white transition-colors hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            {submitting && <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />}
            {submitting ? "Đang gửi đánh giá..." : "Ký xác nhận & gửi đánh giá"}
          </button>
        </form>
      </div>
    </main>
  );
}
