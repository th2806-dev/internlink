import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Megaphone, RefreshCw, X } from "lucide-react";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { platformOperationsService } from "../../../services/platformOperations.service";

export function PlatformAnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const announcementsQuery = useQuery({
    queryKey: ["platform-announcements", "active-banner"],
    queryFn: ({ signal }) => platformOperationsService.getActiveBanners(signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
  const announcement = announcementsQuery.data?.find(
    (item) => !dismissedIds.includes(item.id),
  );

  if (announcementsQuery.isError) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
        <span>{getApiErrorMessage(announcementsQuery.error)}</span>
        <button
          type="button"
          onClick={() => void announcementsQuery.refetch()}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] border border-amber-300 px-2 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          <RefreshCw aria-hidden="true" className="h-3 w-3" />
          Thử lại
        </button>
      </div>
    );
  }

  if (!announcement) return null;

  const isSecurityAlert = announcement.type === "SecurityAlert";
  const Icon = isSecurityAlert ? AlertTriangle : Megaphone;

  return (
    <aside
      role={isSecurityAlert ? "alert" : "status"}
      aria-live={isSecurityAlert ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 px-3 py-2 text-xs text-white sm:px-4 ${
        isSecurityAlert ? "bg-amber-700" : "bg-[#0f172a]"
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{announcement.title}</p>
        <p className="mt-0.5 whitespace-pre-line leading-4 text-white/90">{announcement.content}</p>
      </div>
      <button
        type="button"
        aria-label={`Đóng tạm thông báo: ${announcement.title}`}
        title="Đóng tạm thời"
        onClick={() => setDismissedIds((ids) => [...ids, announcement.id])}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </aside>
  );
}
