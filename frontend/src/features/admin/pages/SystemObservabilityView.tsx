import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  Mail,
  Play,
  RefreshCw,
  Save,
  Server,
  ToggleLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { PlatformTabBar } from "../components/PlatformTabBar";
import { BackupsView } from "./BackupsView";
import {
  systemApiGatewayService,
  type SystemHealthProbe,
  type SystemJobResponse,
} from "../../../services/systemApiGateway.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };

const PROBE_ICONS: Record<string, LucideIcon> = {
  sql: Database,
  redis: Server,
  s3: Activity,
  smtp: Mail,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function healthLabel(status: string): string {
  if (status === "Healthy") return "Đang hoạt động";
  if (status === "Unhealthy") return "Lỗi kết nối";
  if (status === "Degraded") return "Suy giảm";
  return "Chưa cấu hình";
}

function healthStyle(status: string): string {
  if (status === "Healthy") return "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]";
  if (status === "Unhealthy") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "Degraded") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function jobStyle(status: string): string {
  if (status === "Succeeded") return "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]";
  if (status === "Failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "Running") return "border-[#026aa7]/30 bg-[#026aa7]/10 text-[#026aa7]";
  if (status === "Disabled") return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === "Ready" || status === "Cancelled") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function jobStatusLabel(status: string): string {
  switch (status) {
    case "Ready": return "Sẵn sàng";
    case "Running": return "Đang chạy";
    case "Succeeded": return "Thành công";
    case "Failed": return "Thất bại";
    case "Cancelled": return "Đã hủy";
    case "Disabled": return "Đã tắt";
    default: return status;
  }
}

type BackupScheduleDraft = {
  cadence: "daily" | "weekly" | "monthly";
  hour: string;
  minute: string;
  dayOfWeek: string;
  dayOfMonth: string;
};

const DEFAULT_BACKUP_SCHEDULE: BackupScheduleDraft = {
  cadence: "daily",
  hour: "2",
  minute: "0",
  dayOfWeek: "1",
  dayOfMonth: "1",
};

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

function parseBackupSchedule(cronExpression: string): BackupScheduleDraft | null {
  let fields = cronExpression.trim().split(/\s+/);
  if (fields.length === 6 && fields[0] === "0") fields = fields.slice(1);
  if (
    fields.length !== 5 ||
    !/^\d+$/.test(fields[0]) ||
    !/^\d+$/.test(fields[1]) ||
    Number(fields[0]) > 59 ||
    Number(fields[1]) > 23 ||
    fields[3] !== "*"
  ) {
    return null;
  }

  const [minute, hour, dayOfMonth, , dayOfWeek] = fields;
  const base = { minute: String(Number(minute)), hour: String(Number(hour)) };
  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return { ...DEFAULT_BACKUP_SCHEDULE, ...base, cadence: "daily" };
  }
  if (dayOfMonth === "*" && /^\d+$/.test(dayOfWeek) && Number(dayOfWeek) <= 7) {
    return {
      ...DEFAULT_BACKUP_SCHEDULE,
      ...base,
      cadence: "weekly",
      dayOfWeek: String(Number(dayOfWeek) % 7),
    };
  }
  if (
    dayOfWeek === "*" &&
    /^\d+$/.test(dayOfMonth) &&
    Number(dayOfMonth) >= 1 &&
    Number(dayOfMonth) <= 28
  ) {
    return {
      ...DEFAULT_BACKUP_SCHEDULE,
      ...base,
      cadence: "monthly",
      dayOfMonth,
    };
  }
  return null;
}

function backupScheduleCron(schedule: BackupScheduleDraft): string {
  const minute = Number(schedule.minute);
  const hour = Number(schedule.hour);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return "";
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "";
  const time = `${minute} ${hour}`;

  if (schedule.cadence === "weekly") {
    const day = Number(schedule.dayOfWeek);
    return Number.isInteger(day) && day >= 0 && day <= 6 ? `${time} * * ${day}` : "";
  }
  if (schedule.cadence === "monthly") {
    const day = Number(schedule.dayOfMonth);
    return Number.isInteger(day) && day >= 1 && day <= 28 ? `${time} ${day} * *` : "";
  }
  return `${time} * * *`;
}

function backupScheduleLabel(cronExpression: string): string {
  const schedule = parseBackupSchedule(cronExpression);
  if (!schedule) return cronExpression;
  const time = `${schedule.hour.padStart(2, "0")}:${schedule.minute.padStart(2, "0")}`;
  if (schedule.cadence === "weekly") return `Hằng tuần, ${WEEKDAYS[Number(schedule.dayOfWeek)]} lúc ${time}`;
  if (schedule.cadence === "monthly") return `Ngày ${schedule.dayOfMonth} hằng tháng lúc ${time}`;
  return `Hằng ngày lúc ${time}`;
}

function ProbeCard({ probe }: { probe: SystemHealthProbe }) {
  const Icon = PROBE_ICONS[probe.name] ?? Activity;
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#026aa7]/10 text-[#026aa7]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-bold text-slate-800">{probe.label}</h2>
            <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">
              {probe.durationMs.toFixed(0)} ms
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${healthStyle(probe.status)}`}>
          {healthLabel(probe.status)}
        </span>
      </header>
      <p className="mt-3 min-h-8 text-[11px] leading-4 text-slate-600">{probe.detail}</p>
      {Object.keys(probe.metrics).length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2">
          {Object.entries(probe.metrics).map(([name, value]) => (
            <div key={name} className="flex gap-1 text-[10px]">
              <dt className="text-slate-400">{name}:</dt>
              <dd className="font-semibold tabular-nums text-slate-700">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

function JobRow({
  job,
  busy,
  onRun,
  onToggle,
}: {
  job: SystemJobResponse;
  busy: boolean;
  onRun: () => void;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
      <td className="min-w-56 px-2.5 py-2 align-top">
        <div className="text-xs font-semibold text-slate-800">{job.jobName}</div>
        <div className="mt-0.5 font-mono text-[10px] text-[#026aa7]">{job.jobCode}</div>
        {job.description && <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">{job.description}</p>}
      </td>
      <td className="px-2.5 py-2 align-top text-[11px] text-slate-600">
        <div>{job.jobCode === "DB_BACKUP" ? backupScheduleLabel(job.cronExpression) : job.cronExpression}</div>
        {job.jobCode === "DB_BACKUP" && <div className="mt-0.5 font-mono text-[10px] text-slate-400">{job.cronExpression}</div>}
      </td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{formatDate(job.lastRunAt)}</td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] tabular-nums text-slate-700">{job.lastDurationMs == null ? "—" : `${job.lastDurationMs.toLocaleString("vi-VN")} ms`}</td>
      <td className="px-2.5 py-2 align-top">
        <span className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${jobStyle(job.status)}`}>{jobStatusLabel(job.status)}</span>
        {job.lastErrorMessage && <p className="mt-1 max-w-48 text-[10px] text-rose-700">{job.lastErrorMessage}</p>}
      </td>
      <td className="px-2.5 py-2 align-top">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={job.isEnabled} onChange={onToggle} disabled={busy} className="accent-[#026aa7]" aria-label={`${job.isEnabled ? "Tắt" : "Bật"} ${job.jobName}`} />
          {job.isEnabled ? "Bật" : "Tắt"}
        </label>
      </td>
      <td className="px-2.5 py-2 text-right align-top">
        <button type="button" onClick={onRun} disabled={busy || !job.isEnabled} className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[#026aa7] bg-[#026aa7] px-2 text-[11px] font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
          Chạy ngay
        </button>
      </td>
    </tr>
  );
}

export function SystemObservabilityView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleDraft, setScheduleDraft] = useState<BackupScheduleDraft>(DEFAULT_BACKUP_SCHEDULE);
  const [scheduleLoadWarning, setScheduleLoadWarning] = useState(false);
  const activeTab = searchParams.get("tab") === "backups" ? "backups" : "overview";
  const healthQuery = useQuery({
    queryKey: ["erp3-health"],
    queryFn: ({ signal }) => systemApiGatewayService.getHealth(signal),
    enabled: activeTab === "overview",
    refetchInterval: 30_000,
  });
  const jobsQuery = useQuery({
    queryKey: ["erp3-jobs"],
    queryFn: ({ signal }) => systemApiGatewayService.getJobs(signal),
    enabled: activeTab === "overview",
  });
  const triggerMutation = useMutation({
    mutationFn: (job: SystemJobResponse) => systemApiGatewayService.triggerJob(job.jobCode),
    onSuccess: async (execution) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-jobs"] });
      onShowToast(
        execution.status === "Succeeded"
          ? `Tác vụ ${execution.jobCode} đã hoàn tất.`
          : `Tác vụ ${execution.jobCode} thất bại; xem lịch sử chạy.`,
        execution.status === "Succeeded" ? "success" : "warning",
      );
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ jobCode, enabled }: { jobCode: string; enabled: boolean }) =>
      systemApiGatewayService.setJobEnabled(jobCode, enabled),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-jobs"] });
      onShowToast(`${job.jobName} đã ${job.isEnabled ? "được bật" : "được tắt"}.`, "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const scheduleMutation = useMutation({
    mutationFn: (cronExpression: string) =>
      systemApiGatewayService.setJobSchedule("DB_BACKUP", cronExpression),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: ["erp3-jobs"] });
      setScheduleLoadWarning(false);
      onShowToast(`Đã lưu lịch sao lưu: ${backupScheduleLabel(job.cronExpression)}.`, "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const refresh = () => {
    void Promise.all([healthQuery.refetch(), jobsQuery.refetch()]);
  };
  const healthError = healthQuery.error;
  const jobsError = jobsQuery.error;
  const health = healthQuery.data;
  const jobs = jobsQuery.data;
  const backupJob = jobs?.jobs.find((job) => job.jobCode === "DB_BACKUP");
  const backupCronExpression = backupJob?.cronExpression;
  useEffect(() => {
    if (backupCronExpression === undefined) return;
    const parsed = parseBackupSchedule(backupCronExpression);
    if (parsed) {
      setScheduleDraft(parsed);
      setScheduleLoadWarning(false);
    } else {
      setScheduleLoadWarning(true);
    }
  }, [backupCronExpression]);
  const busyJobCode = triggerMutation.isPending
    ? triggerMutation.variables?.jobCode
    : toggleMutation.isPending
      ? toggleMutation.variables?.jobCode
      : undefined;
  const selectTab = (tab: "overview" | "backups") => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  function runJob(job: SystemJobResponse) {
    const message = job.jobCode === "ACCOUNT_EXPIRY_SCAN"
      ? "Tác vụ này sẽ đánh dấu đơn vị có bản quyền hết hạn là đã hết hạn. Tiếp tục?"
      : `Kích hoạt chạy ngay job “${job.jobName}”?`;
    if (window.confirm(message)) triggerMutation.mutate(job);
  }

  function saveBackupSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cronExpression = backupScheduleCron(scheduleDraft);
    if (cronExpression) scheduleMutation.mutate(cronExpression);
  }

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Giám sát Hạ tầng & Tác vụ nền (Observability)"
        description="Theo dõi tình trạng hạ tầng, lịch chạy và tác vụ nền."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Hạ tầng và tác vụ nền" },
          { label: "Giám sát hạ tầng và tác vụ nền" },
        ]}
        statistic={jobs ? `${jobs.jobs.length} tác vụ` : undefined}
      />
      <CompactActionBar
        icon={Activity}
        title="Giám sát hạ tầng"
        subtitle="Theo dõi kết nối và tác vụ nền"
        hideTitle
        total={activeTab === "overview" && health ? `Kiểm tra ${formatDate(health.checkedAt)}` : undefined}
        actions={activeTab === "overview" ? [{
          label: "Làm mới",
          icon: RefreshCw,
          onClick: refresh,
          loading: healthQuery.isFetching || jobsQuery.isFetching,
        }] : []}
      />
      <PlatformTabBar
        ariaLabel="Nội dung giám sát"
        selectedId={activeTab}
        tabs={[
          {
            id: "overview",
            label: "Giám sát hệ thống",
            onSelect: () => selectTab("overview"),
            tabId: "observability-tab",
            ariaControls: "observability-panel",
          },
          {
            id: "backups",
            label: "Sao lưu dữ liệu",
            onSelect: () => selectTab("backups"),
            tabId: "backups-tab",
            ariaControls: "backups-panel",
          },
        ]}
      />
      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {activeTab === "backups" ? (
          <section id="backups-panel" role="tabpanel" aria-labelledby="backups-tab">
            <BackupsView onShowToast={onShowToast} />
          </section>
        ) : (
          <section id="observability-panel" role="tabpanel" aria-labelledby="observability-tab" className="space-y-3">
        {healthError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{getApiErrorMessage(healthError)}</span>
            <button type="button" onClick={() => void healthQuery.refetch()} className="rounded-[4px] border border-rose-200 px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
          </div>
        )}
        {jobsError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{getApiErrorMessage(jobsError)}</span>
            <button type="button" onClick={() => void jobsQuery.refetch()} className="rounded-[4px] border border-rose-200 px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
          </div>
        )}

        <section aria-label="Kiểm tra tình trạng hạ tầng" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {healthQuery.isLoading ? (
            <div className="col-span-full rounded-md border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              <RefreshCw className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />Đang kiểm tra hạ tầng...
            </div>
          ) : health?.probes.length ? health.probes.map((probe) => <ProbeCard key={probe.name} probe={probe} />) : !healthError ? (
            <div className="col-span-full rounded-md border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Chưa có dữ liệu probe.</div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarClock className="h-4 w-4 text-[#026aa7]" aria-hidden="true" /> Tác vụ nền</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Quản lý trạng thái, kích hoạt chạy và theo dõi kết quả gần nhất.</p>
            </div>
            <span className="rounded-[3px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{jobs?.jobs.length ?? 0} tác vụ</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left">
              <thead className="bg-slate-50"><tr className="border-b border-slate-200">
                {["Tác vụ", "Lịch chạy", "Chạy lần cuối", "Thời lượng", "Trạng thái", "Kích hoạt", ""].map((heading) => <th key={heading || "actions"} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
              </tr></thead>
              <tbody>
                {jobsQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500"><RefreshCw className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />Đang tải tác vụ...</td></tr>
                ) : !jobs?.jobs.length ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-xs text-slate-500">Chưa có tác vụ nào được đăng ký. Hãy khởi tạo dữ liệu tác vụ hệ thống.</td></tr>
                ) : jobs.jobs.map((job) => (
                  <JobRow
                    key={job.jobCode}
                    job={job}
                    busy={busyJobCode === job.jobCode}
                    onRun={() => runJob(job)}
                    onToggle={() => toggleMutation.mutate({ jobCode: job.jobCode, enabled: !job.isEnabled })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {backupJob && (
          <section aria-labelledby="backup-schedule-title" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
              <div>
                <h2 id="backup-schedule-title" className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <CalendarClock className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
                  Cấu hình chu kỳ sao lưu
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tự động chạy theo giờ Việt Nam; giữ 14 bản tự động gần nhất. Bản sao lưu thủ công không bị xóa theo chính sách này.
                </p>
              </div>
              <span className={`rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${backupJob.isEnabled ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                {backupJob.isEnabled ? "Lịch đang bật" : "Lịch đang tắt"}
              </span>
            </header>
            <form onSubmit={saveBackupSchedule} className="space-y-3 p-3">
              {scheduleLoadWarning && (
                <div role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Lịch hiện tại không thuộc các chu kỳ hỗ trợ. Hãy chọn chu kỳ mới rồi lưu để áp dụng.
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-[11px] font-semibold text-slate-700">
                  <span>Chu kỳ</span>
                  <select
                    value={scheduleDraft.cadence}
                    onChange={(event) => setScheduleDraft((current) => ({ ...current, cadence: event.target.value as BackupScheduleDraft["cadence"] }))}
                    className="h-9 w-full rounded-[4px] border border-slate-300 bg-white px-2 text-xs font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  >
                    <option value="daily">Hằng ngày</option>
                    <option value="weekly">Hằng tuần</option>
                    <option value="monthly">Hằng tháng</option>
                  </select>
                </label>
                {scheduleDraft.cadence === "weekly" && (
                  <label className="space-y-1 text-[11px] font-semibold text-slate-700">
                    <span>Ngày trong tuần</span>
                    <select
                      value={scheduleDraft.dayOfWeek}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, dayOfWeek: event.target.value }))}
                      className="h-9 w-full rounded-[4px] border border-slate-300 bg-white px-2 text-xs font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    >
                      {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                    </select>
                  </label>
                )}
                {scheduleDraft.cadence === "monthly" && (
                  <label className="space-y-1 text-[11px] font-semibold text-slate-700">
                    <span>Ngày trong tháng</span>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      required
                      value={scheduleDraft.dayOfMonth}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, dayOfMonth: event.target.value }))}
                      className="h-9 w-full rounded-[4px] border border-slate-300 bg-white px-2 text-xs font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                    />
                    <span className="block font-normal text-slate-500">Chọn từ ngày 1 đến 28 để lịch chạy được mọi tháng.</span>
                  </label>
                )}
                <label className="space-y-1 text-[11px] font-semibold text-slate-700">
                  <span>Giờ thực hiện (giờ Việt Nam)</span>
                  <input
                    type="time"
                    required
                    value={`${scheduleDraft.hour.padStart(2, "0")}:${scheduleDraft.minute.padStart(2, "0")}`}
                    onChange={(event) => {
                      const [hour, minute] = event.target.value.split(":");
                      if (hour !== undefined && minute !== undefined)
                        setScheduleDraft((current) => ({ ...current, hour: String(Number(hour)), minute: String(Number(minute)) }));
                    }}
                    className="h-9 w-full rounded-[4px] border border-slate-300 bg-white px-2 text-xs font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-500">Lịch hiện tại: {backupScheduleLabel(backupJob.cronExpression)}.</p>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending || !backupScheduleCron(scheduleDraft)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scheduleMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                  Lưu lịch sao lưu
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800"><Clock3 className="h-4 w-4 text-[#026aa7]" aria-hidden="true" /> Lịch sử thực thi gần đây</h2>
            <span className="text-[11px] text-slate-500">{jobs?.recentExecutions.length ?? 0} lần chạy</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead className="bg-slate-50"><tr className="border-b border-slate-200">
                {["Tác vụ", "Bắt đầu", "Thời lượng", "Người kích hoạt", "Kết quả", "Trạng thái"].map((heading) => <th key={heading} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
              </tr></thead>
              <tbody>
                {jobs?.recentExecutions.length ? jobs.recentExecutions.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2.5 py-2 font-mono text-[11px] text-[#026aa7]">{run.jobCode}</td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-slate-600">{formatDate(run.startedAt)}</td>
                    <td className="px-2.5 py-2 text-[11px] tabular-nums text-slate-700">{run.durationMs == null ? "—" : `${run.durationMs.toLocaleString("vi-VN")} ms`}</td>
                    <td className="px-2.5 py-2 text-[11px] text-slate-600">{run.triggeredBy}</td>
                    <td className="max-w-80 px-2.5 py-2 text-[11px] text-slate-600">{run.errorMessage ?? run.resultSummary ?? "—"}</td>
                    <td className="px-2.5 py-2"><span className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${jobStyle(run.status)}`}>{jobStatusLabel(run.status)}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-3 py-9 text-center text-xs text-slate-500"><CheckCircle2 className="mr-1 inline h-4 w-4 text-[#7bc043]" aria-hidden="true" />Chưa có lịch sử chạy.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2.5 text-[10px] leading-4 text-slate-500">
          <ToggleLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#026aa7]" aria-hidden="true" />
          <p>Lịch sao lưu tự động dùng múi giờ Việt Nam. Hệ thống giữ 14 bản sao lưu tự động gần nhất; các bản tạo thủ công không thuộc chính sách tự xóa này.</p>
        </div>
          </section>
        )}
      </main>
    </div>
  );
}
