import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Save } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { useSemester } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { EmployerRatingLevel, EmployerRubricConfig, GradingRuleSet } from "../../../types/systemAdmin";

type ToastHandler = (message: string, type?: "primary" | "success" | "warning" | "danger" | "info") => void;

const WEEKDAYS = [
  { value: 1, label: "Thứ Hai" },
  { value: 2, label: "Thứ Ba" },
  { value: 3, label: "Thứ Tư" },
  { value: 4, label: "Thứ Năm" },
  { value: 5, label: "Thứ Sáu" },
  { value: 6, label: "Thứ Bảy" },
  { value: 7, label: "Chủ nhật" },
];

const DEFAULT_RULES: Omit<GradingRuleSet, "semesterId" | "departmentId"> = {
  id: null,
  ruleSetName: "Quy chế thực tập chuẩn 40-60",
  processScoreWeight: 0.4,
  examScoreWeight: 0.6,
  employerScoreWeight: 0,
  requiredWeeklyReportsCount: 6,
  stepPenaltyPerLateReport: 0.5,
  stepPenaltyPerMissingReport: 2,
  requireFinalReportForExamEligibility: true,
  weeklyDeadlineDay: 5,
  latePenaltyPointsPerDay: 0,
  minimumPassingScore: 5,
};

const DEFAULT_RATING_LEVELS: EmployerRatingLevel[] = [
  { value: 0, label: "Chưa đáp ứng", description: "Chưa thể hiện được năng lực hoặc yêu cầu của tiêu chí." },
  { value: 1, label: "Cần cải thiện", description: "Thể hiện chưa ổn định, cần hướng dẫn thường xuyên." },
  { value: 2, label: "Đạt một phần", description: "Đáp ứng một phần yêu cầu, cần cải thiện thêm." },
  { value: 3, label: "Đạt yêu cầu", description: "Đáp ứng đầy đủ yêu cầu trong công việc." },
  { value: 4, label: "Vượt yêu cầu", description: "Thể hiện tốt, chủ động và vượt kỳ vọng." },
];

function createDefaultRules(semesterId: string, departmentId: string | null): GradingRuleSet {
  return { ...DEFAULT_RULES, semesterId, departmentId };
}

function createDefaultEmployerRubric(semesterId: string): EmployerRubricConfig {
  return {
    id: null,
    semesterId,
    departmentId: null,
    name: "Rubric đánh giá doanh nghiệp",
    version: 0,
    isInherited: false,
    ratingLevels: DEFAULT_RATING_LEVELS.map((level) => ({ ...level })),
    criteria: Array.from({ length: 8 }, (_, index) => ({
      id: `new-${index}`,
      name: "",
      description: "",
      weight: 12.5,
      orderIndex: index + 1,
    })),
  };
}

export function GradingRulesConfigView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const { semesters, departments, selectedSemesterId } = useSemester();
  const { isDepartmentAdmin } = useAdminCapabilities();
  const [semesterId, setSemesterId] = useState(selectedSemesterId);
  const [departmentId, setDepartmentId] = useState("");
  const [rules, setRules] = useState<GradingRuleSet>(() =>
    createDefaultRules(selectedSemesterId, null),
  );
  const [employerRubric, setEmployerRubric] = useState<EmployerRubricConfig>(() =>
    createDefaultEmployerRubric(selectedSemesterId),
  );
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({
    queryKey: ["system-admin", "grading-rules", semesterId, departmentId],
    queryFn: () => systemAdminService.getGradingRuleSet(semesterId, departmentId || null),
    enabled: !!semesterId,
  });
  const rubricQuery = useQuery({
    queryKey: ["system-admin", "employer-rubric", semesterId, departmentId],
    queryFn: () => systemAdminService.getEmployerRubric(semesterId, departmentId || null),
    enabled: !!semesterId && (!isDepartmentAdmin || !!departmentId),
  });

  useEffect(() => {
    if (selectedSemesterId && !semesterId) setSemesterId(selectedSemesterId);
  }, [selectedSemesterId, semesterId]);
  useEffect(() => {
    if (isDepartmentAdmin && rulesQuery.data?.departmentId) {
      setDepartmentId(rulesQuery.data.departmentId);
    }
  }, [isDepartmentAdmin, rulesQuery.data]);
  useEffect(() => {
    if (rulesQuery.data) setRules(rulesQuery.data);
  }, [rulesQuery.data]);
  useEffect(() => {
    setRules(createDefaultRules(semesterId, departmentId || null));
  }, [semesterId, departmentId]);
  useEffect(() => {
    if (!rubricQuery.isLoading && !rubricQuery.error) {
      setEmployerRubric(rubricQuery.data ?? createDefaultEmployerRubric(semesterId));
    }
  }, [rubricQuery.data, rubricQuery.error, rubricQuery.isLoading, semesterId]);

  const weightTotal = useMemo(
    () => rules.processScoreWeight + rules.examScoreWeight + rules.employerScoreWeight,
    [rules.examScoreWeight, rules.employerScoreWeight, rules.processScoreWeight],
  );
  const weightsAreValid = Math.abs(weightTotal - 1) < 0.00001;
  const saveMutation = useMutation({
    mutationFn: () => systemAdminService.saveGradingRuleSet(rules),
    onSuccess: (saved) => {
      setRules(saved);
      queryClient.setQueryData(
        ["system-admin", "grading-rules", semesterId, departmentId],
        saved,
      );
      onShowToast("Đã lưu quy chế điểm và lịch deadline tuần.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });
  const saveRubricMutation = useMutation({
    mutationFn: () => systemAdminService.saveEmployerRubric(semesterId, departmentId || null, {
      name: employerRubric.name,
      ratingLevels: employerRubric.ratingLevels,
      criteria: employerRubric.criteria.map(({ name, description, weight }) => ({
        name,
        description,
        weight,
      })),
    }),
    onSuccess: (saved) => {
      setEmployerRubric(saved);
      queryClient.setQueryData(
        ["system-admin", "employer-rubric", semesterId, departmentId],
        saved,
      );
      onShowToast("Đã lưu rubric đánh giá doanh nghiệp.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });

  const setWeight = (
    field: "processScoreWeight" | "examScoreWeight" | "employerScoreWeight",
    rawValue: string,
  ) => {
    const percent = Number(rawValue);
    setRules((current) => ({ ...current, [field]: Number.isFinite(percent) ? percent / 100 : 0 }));
  };
  const update = <K extends keyof GradingRuleSet>(field: K, value: GradingRuleSet[K]) =>
    setRules((current) => ({ ...current, [field]: value }));

  const selectedSemester = semesters.find((semester) => semester.id === semesterId);
  const isBusy = saveMutation.isPending || rulesQuery.isLoading;
  const isValid = weightsAreValid
    && rules.requiredWeeklyReportsCount >= 0
    && rules.requiredWeeklyReportsCount <= (selectedSemester?.totalWeeks || 52)
    && rules.latePenaltyPointsPerDay >= 0
    && rules.minimumPassingScore >= 0
    && rules.minimumPassingScore <= 10;
  const rubricWeightTotal = employerRubric.criteria.reduce((total, criterion) => total + criterion.weight, 0);
  const employerRubricIsValid = employerRubric.name.trim().length > 0
    && employerRubric.criteria.length >= 8
    && employerRubric.criteria.length <= 10
    && employerRubric.criteria.every((criterion) => criterion.name.trim().length > 0
      && criterion.weight > 0
      && criterion.weight <= 100)
    && Math.abs(rubricWeightTotal - 100) < 0.01
    && employerRubric.ratingLevels.length === 5
    && employerRubric.ratingLevels.every((level) => level.label.trim() && level.description.trim());

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-200 font-sans pb-12">
      <CompactActionBar
        icon={BadgeCheck}
        title="Quy chế Điểm & Deadline (F1004)"
        subtitle="Thiết lập trọng số, lịch báo cáo và ngưỡng đạt theo kỳ, khoa."
      />

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="grading-semester" className="mb-1 block text-xs font-medium text-slate-700">Học kỳ</label>
            <select
              id="grading-semester"
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              <option value="">Chọn học kỳ</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name} · {semester.academicYear}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grading-department" className="mb-1 block text-xs font-medium text-slate-700">Khoa áp dụng</label>
            <select
              id="grading-department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              disabled={isDepartmentAdmin}
              className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDepartmentAdmin ? (
                <option value={departmentId}>
                  {departments.find((department) => department.id === departmentId)?.name
                    ?? (departmentId ? "Khoa của bạn" : "Đang xác định khoa…")}
                </option>
              ) : (
                <option value="">Toàn trường (mặc định)</option>
              )}
              {!isDepartmentAdmin && departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
        </div>

        {rulesQuery.error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {getApiErrorMessage(rulesQuery.error)}
          </div>
        )}
        {rulesQuery.isLoading && (
          <p role="status" className="text-sm text-slate-600">Đang tải quy chế…</p>
        )}
        {!semesters.length && (
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Chưa có học kỳ để cấu hình quy chế.</p>
        )}

        <fieldset disabled={rulesQuery.isLoading} className="space-y-3 rounded-md border border-slate-200 p-3 disabled:opacity-70">
          <legend className="px-2 text-xs font-semibold text-slate-900">Trọng số điểm</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ["processScoreWeight", "Điểm quá trình"],
              ["examScoreWeight", "Cuối kỳ / thi"],
              ["employerScoreWeight", "Đánh giá doanh nghiệp"],
            ] as const).map(([field, label]) => (
              <div key={field}>
                <label htmlFor={`weight-${field}`} className="mb-1 block text-xs font-medium text-slate-700">{label} (%)</label>
                <div className="relative">
                  <input
                    id={`weight-${field}`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(rules[field] * 10000) / 100}
                    onChange={(event) => setWeight(field, event.target.value)}
                    className="h-8 w-20 rounded-[4px] border border-slate-200 px-2.5 pr-7 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
                </div>
              </div>
            ))}
          </div>
          <p aria-live="polite" className={`text-xs font-bold ${weightsAreValid ? "text-[#7bc043]" : "text-rose-700"}`}>
            Tổng trọng số: {Math.round(weightTotal * 10000) / 100}% — {weightsAreValid ? "Hợp lệ" : "Cần bằng 100%"}
          </p>
        </fieldset>

        <fieldset disabled={rulesQuery.isLoading} className="space-y-3 rounded-md border border-slate-200 p-3 disabled:opacity-70">
          <legend className="px-2 text-xs font-semibold text-slate-900">Báo cáo tuần & tiêu chuẩn đạt</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="required-weeks" className="mb-1 block text-xs font-medium text-slate-700">Số tuần bắt buộc</label>
              <input
                id="required-weeks"
                type="number"
                min="0"
                max={selectedSemester?.totalWeeks || 52}
                value={rules.requiredWeeklyReportsCount}
                onChange={(event) => update("requiredWeeklyReportsCount", Number(event.target.value))}
                className="h-8 w-20 rounded-[4px] border border-slate-200 px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              />
            </div>
            <div>
              <label htmlFor="deadline-day" className="mb-1 block text-xs font-medium text-slate-700">Deadline mỗi tuần</label>
              <select
                id="deadline-day"
                value={rules.weeklyDeadlineDay}
                onChange={(event) => update("weeklyDeadlineDay", Number(event.target.value))}
                className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                {WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="late-penalty" className="mb-1 block text-xs font-medium text-slate-700">Trừ điểm mỗi ngày trễ</label>
              <input
                id="late-penalty"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rules.latePenaltyPointsPerDay}
                onChange={(event) => update("latePenaltyPointsPerDay", Number(event.target.value))}
                className="h-8 w-20 rounded-[4px] border border-slate-200 px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                aria-describedby="late-penalty-help"
              />
              <p id="late-penalty-help" className="mt-1 text-xs text-slate-500">Điểm phần trăm bị trừ, cộng dồn theo ngày.</p>
            </div>
            <div>
              <label htmlFor="minimum-score" className="mb-1 block text-xs font-medium text-slate-700">Điểm đạt tối thiểu</label>
              <input
                id="minimum-score"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rules.minimumPassingScore}
                onChange={(event) => update("minimumPassingScore", Number(event.target.value))}
                className="h-8 w-20 rounded-[4px] border border-slate-200 px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              />
            </div>
          </div>
          <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-800">
            <input
              type="checkbox"
              checked={rules.requireFinalReportForExamEligibility}
              onChange={(event) => update("requireFinalReportForExamEligibility", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            />
            Bắt buộc nộp báo cáo cuối kỳ mới đủ điều kiện dự thi / bảo vệ
          </label>
        </fieldset>

        {!isValid && (
          <p role="alert" className="text-sm text-rose-700">
            Kiểm tra tổng trọng số phải bằng 100%, số tuần không vượt quá thời lượng kỳ và điểm đạt nằm trong khoảng 0–10.
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {isDepartmentAdmin
              ? "Quy chế chỉ áp dụng cho khoa của bạn."
              : departmentId
                ? "Quy chế áp dụng cho khoa đã chọn."
                : "Quy chế này sẽ là mặc định toàn trường."}
          </p>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!semesterId || !isValid || isBusy || !!rulesQuery.error}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white transition hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {saveMutation.isPending
              ? "Đang áp dụng…"
              : departmentId || isDepartmentAdmin
                ? "Lưu quy chế"
                : "Áp dụng mặc định toàn trường"}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rubric đánh giá doanh nghiệp</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Cấu hình 8–10 tiêu chí, trọng số tổng 100% và mô tả 5 mức lựa chọn. Mức N/A được xử lý riêng và không tính vào mẫu số điểm.
          </p>
        </div>

        {rubricQuery.error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {getApiErrorMessage(rubricQuery.error)}
          </div>
        )}
        {rubricQuery.isLoading && (
          <p role="status" className="text-sm text-slate-600">Đang tải rubric…</p>
        )}
        {employerRubric.isInherited && (
          <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
            Đang kế thừa rubric toàn trường. Khi lưu, cấu hình này sẽ trở thành rubric riêng của khoa.
          </p>
        )}

        <fieldset disabled={rubricQuery.isLoading || saveRubricMutation.isPending} className="space-y-4 disabled:opacity-70">
          <div>
            <label htmlFor="employer-rubric-name" className="mb-1.5 block text-sm font-medium text-slate-700">Tên rubric</label>
            <input
              id="employer-rubric-name"
              value={employerRubric.name}
              onChange={(event) => setEmployerRubric((current) => ({ ...current, name: event.target.value }))}
              maxLength={250}
              className="h-8 w-full rounded-[4px] border border-slate-200 px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-slate-900">Tiêu chí và trọng số</h3>
              <div className="flex items-center gap-3">
                <span aria-live="polite" className={`text-xs font-semibold ${Math.abs(rubricWeightTotal - 100) < 0.01 ? "text-emerald-700" : "text-rose-700"}`}>
                  Tổng: {rubricWeightTotal.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
                </span>
                <button
                  type="button"
                  disabled={employerRubric.criteria.length >= 10}
                  onClick={() => setEmployerRubric((current) => ({
                    ...current,
                    criteria: [...current.criteria, {
                      id: `new-${Date.now()}`,
                      name: "",
                      description: "",
                      weight: 0,
                      orderIndex: current.criteria.length + 1,
                    }],
                  }))}
                  className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Thêm tiêu chí
                </button>
              </div>
            </div>
            {employerRubric.criteria.map((criterion, index) => (
              <div key={criterion.id} className="grid gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Tiêu chí {index + 1}
                    <input
                      value={criterion.name}
                      onChange={(event) => setEmployerRubric((current) => ({
                        ...current,
                        criteria: current.criteria.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item),
                      }))}
                      maxLength={200}
                      className="mt-1 h-8 w-full rounded-[4px] border border-slate-200 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Mô tả (không bắt buộc)
                    <textarea
                      value={criterion.description ?? ""}
                      onChange={(event) => setEmployerRubric((current) => ({
                        ...current,
                        criteria: current.criteria.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: event.target.value } : item),
                      }))}
                      maxLength={500}
                      rows={2}
                      className="mt-1 min-h-16 w-full rounded-[4px] border border-slate-200 p-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-slate-700">
                  Trọng số (%)
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={criterion.weight}
                    onChange={(event) => setEmployerRubric((current) => ({
                      ...current,
                      criteria: current.criteria.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, weight: Number(event.target.value) || 0 } : item),
                    }))}
                    className="mt-1 h-8 w-20 rounded-[4px] border border-slate-200 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Xóa tiêu chí ${index + 1}`}
                  disabled={employerRubric.criteria.length <= 8}
                  onClick={() => setEmployerRubric((current) => ({
                    ...current,
                    criteria: current.criteria.filter((_, itemIndex) => itemIndex !== index)
                      .map((item, itemIndex) => ({ ...item, orderIndex: itemIndex + 1 })),
                  }))}
                  className="h-8 self-end rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Mô tả các mức đánh giá</h3>
            {employerRubric.ratingLevels.map((level, index) => (
              <div key={level.value} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[70px_minmax(0,1fr)]">
                <span className="flex h-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold tabular-nums text-slate-800">
                  {level.value}
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Nhãn
                    <input
                      value={level.label}
                      onChange={(event) => setEmployerRubric((current) => ({
                        ...current,
                        ratingLevels: current.ratingLevels.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, label: event.target.value } : item),
                      }))}
                      maxLength={100}
                      className="mt-1 h-8 w-full rounded-[4px] border border-slate-200 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Mô tả hành vi
                    <input
                      value={level.description}
                      onChange={(event) => setEmployerRubric((current) => ({
                        ...current,
                        ratingLevels: current.ratingLevels.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: event.target.value } : item),
                      }))}
                      maxLength={500}
                      className="mt-1 h-8 w-full rounded-[4px] border border-slate-200 px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {!employerRubricIsValid && !rubricQuery.isLoading && !rubricQuery.error && (
          <p role="alert" className="text-sm text-rose-700">
            Cần 8–10 tiêu chí có tên, trọng số tổng đúng 100% và đủ mô tả cho 5 mức đánh giá.
          </p>
        )}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => saveRubricMutation.mutate()}
            disabled={!semesterId || !employerRubricIsValid || rubricQuery.isLoading || saveRubricMutation.isPending || !!rubricQuery.error}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white transition hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {saveRubricMutation.isPending ? "Đang lưu rubric…" : "Lưu rubric doanh nghiệp"}
          </button>
        </div>
      </section>
    </div>
  );
}
