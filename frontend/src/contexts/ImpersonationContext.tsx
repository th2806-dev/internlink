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
  getImpersonatedRoleCode,
  setImpersonatedRoleCode,
} from "../lib/apiClient";
import { systemAdminService } from "../services/systemAdmin.service";
import type { SystemImpersonationContext } from "../types/systemAdmin";

interface ImpersonationContextValue {
  impersonation: SystemImpersonationContext | null;
  startImpersonation: (roleCode: string) => Promise<void>;
  stopImpersonation: () => void;
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

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.backendRole === "SuperAdmin";
  const [impersonation, setImpersonation] = useState(() =>
    isSuperAdmin ? readStoredImpersonation() : null,
  );

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

  useEffect(() => {
    if (!isSuperAdmin) stopImpersonation();
  }, [isSuperAdmin, stopImpersonation]);

  const value = useMemo(
    () => ({ impersonation, startImpersonation, stopImpersonation }),
    [impersonation, startImpersonation, stopImpersonation],
  );

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation(): ImpersonationContextValue {
  const context = useContext(ImpersonationContext);
  if (!context) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return context;
}
