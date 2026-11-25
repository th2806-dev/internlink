import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  clearTenantImpersonationToken,
  clearApiCache,
  getImpersonatedRoleCode,
  isTenantImpersonating,
  setTenantImpersonationToken,
  setImpersonatedRoleCode,
} from "../lib/apiClient";
import { systemAdminService } from "../services/systemAdmin.service";
import { queryClient } from "../lib/queryClient";
import type {
  SystemImpersonationContext,
  TenantSupportSession,
  TenantSupportSessionContext,
} from "../types/systemAdmin";

interface ImpersonationContextValue {
  impersonation: SystemImpersonationContext | null;
  tenantSupportSession: TenantSupportSessionContext | null;
  startImpersonation: (roleCode: string) => Promise<void>;
  stopImpersonation: () => void;
  startTenantSupport: (tenantId: string, reason: string) => Promise<void>;
  stopTenantSupport: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

function readStoredImpersonation(): SystemImpersonationContext | null {
  const roleCode = getImpersonatedRoleCode();
  const stored = sessionStorage.getItem("internlink:impersonation-context");
  if (!roleCode || !stored) {
    setImpersonatedRoleCode(null);
    sessionStorage.removeItem("internlink:impersonation-context");
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as SystemImpersonationContext;
    if (parsed.roleCode === roleCode && parsed.isVisualOnly) return parsed;
    setImpersonatedRoleCode(null);
    sessionStorage.removeItem("internlink:impersonation-context");
    return null;
  } catch {
    setImpersonatedRoleCode(null);
    sessionStorage.removeItem("internlink:impersonation-context");
    return null;
  }
}

function readStoredTenantSupport(): TenantSupportSessionContext | null {
  if (!isTenantImpersonating()) return null;
  const stored = sessionStorage.getItem("internlink:tenant-support-context");
  if (!stored) {
    clearTenantImpersonationToken();
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as TenantSupportSessionContext;
    if (new Date(parsed.expiresAt).getTime() > Date.now()) return parsed;
  } catch {
    // Discard malformed session metadata; the backend still validates every token.
  }
  clearTenantImpersonationToken();
  sessionStorage.removeItem("internlink:tenant-support-context");
  return null;
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user, refreshMe } = useAuth();
  const isSuperAdmin = user?.backendRole === "SuperAdmin";
  const [impersonation, setImpersonation] = useState(() =>
    isSuperAdmin ? readStoredImpersonation() : null,
  );
  const [tenantSupportSession, setTenantSupportSession] = useState(readStoredTenantSupport);

  const startImpersonation = useCallback(async (roleCode: string) => {
    if (!isSuperAdmin) throw new Error("Chỉ SuperAdmin được phép bật chế độ mô phỏng.");
    const context = await systemAdminService.startImpersonation(roleCode);
    setImpersonatedRoleCode(context.roleCode);
    sessionStorage.setItem("internlink:impersonation-context", JSON.stringify(context));
    setImpersonation(context);
  }, [isSuperAdmin]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedRoleCode(null);
    sessionStorage.removeItem("internlink:impersonation-context");
    setImpersonation(null);
  }, []);

  const startTenantSupport = useCallback(async (tenantId: string, reason: string) => {
    if (!isSuperAdmin) throw new Error("Chỉ SuperAdmin được phép mở phiên hỗ trợ.");
    if (!reason.trim()) throw new Error("Vui lòng nhập lý do hỗ trợ.");
    const response: TenantSupportSession = await systemAdminService.startTenantSupport(
      tenantId,
      reason.trim(),
    );
    const { token, ...context } = response;
    setTenantImpersonationToken(token);
    sessionStorage.setItem("internlink:tenant-support-context", JSON.stringify(context));
    setTenantSupportSession(context);
    setImpersonatedRoleCode(null);
    sessionStorage.removeItem("internlink:impersonation-context");
    setImpersonation(null);
    queryClient.clear();
    clearApiCache();
    await refreshMe();
  }, [isSuperAdmin, refreshMe]);

  const stopTenantSupport = useCallback(async () => {
    if (!tenantSupportSession) return;
    await systemAdminService.endTenantSupport();
    clearTenantImpersonationToken();
    sessionStorage.removeItem("internlink:tenant-support-context");
    setTenantSupportSession(null);
    queryClient.clear();
    clearApiCache();
    await refreshMe();
  }, [refreshMe, tenantSupportSession]);

  useEffect(() => {
    if (!isSuperAdmin && !tenantSupportSession) stopImpersonation();
  }, [isSuperAdmin, stopImpersonation, tenantSupportSession]);

  useEffect(() => {
    const handleTenantSupportExpired = () => {
      clearTenantImpersonationToken();
      sessionStorage.removeItem("internlink:tenant-support-context");
      setTenantSupportSession(null);
      queryClient.clear();
      clearApiCache();
      void refreshMe().catch(() => {
        window.dispatchEvent(new CustomEvent("internlink:unauthorized"));
      });
    };

    window.addEventListener("internlink:tenant-support-expired", handleTenantSupportExpired);
    return () => {
      window.removeEventListener("internlink:tenant-support-expired", handleTenantSupportExpired);
    };
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      impersonation,
      tenantSupportSession,
      startImpersonation,
      stopImpersonation,
      startTenantSupport,
      stopTenantSupport,
    }),
    [impersonation, startImpersonation, startTenantSupport, stopImpersonation, stopTenantSupport, tenantSupportSession],
  );

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation(): ImpersonationContextValue {
  const context = useContext(ImpersonationContext);
  if (!context) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return context;
}
