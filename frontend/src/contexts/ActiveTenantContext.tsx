import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { systemTenantsService, type TenantDirectoryItem } from "../services/systemTenants.service";

const STORAGE_KEY = "internlink.activeTenantId";
const EMPTY_TENANTS: TenantDirectoryItem[] = [];

interface ActiveTenantContextValue {
  tenants: TenantDirectoryItem[];
  selectedTenant: TenantDirectoryItem | null;
  selectedTenantId: string;
  selectTenant: (tenantId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_CONTEXT: ActiveTenantContextValue = {
  tenants: [],
  selectedTenant: null,
  selectedTenantId: "",
  selectTenant: () => undefined,
  isLoading: false,
  error: null,
};

const ActiveTenantContext = createContext<ActiveTenantContextValue>(EMPTY_CONTEXT);

function readStoredTenantId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ActiveTenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.backendRole === "SuperAdmin";
  const [selectedTenantId, setSelectedTenantId] = useState(readStoredTenantId);
  const tenantsQuery = useQuery({
    queryKey: ["system-admin", "tenants", "directory"],
    queryFn: ({ signal }) => systemTenantsService.getAllTenants(signal),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });
  const tenants = tenantsQuery.data ?? EMPTY_TENANTS;
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

  const selectTenant = useCallback((tenantId: string) => {
    const nextId = tenants.some((tenant) => tenant.id === tenantId) ? tenantId : "";
    setSelectedTenantId(nextId);
    try {
      if (nextId) window.sessionStorage.setItem(STORAGE_KEY, nextId);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // In-memory selection remains usable when session storage is unavailable.
    }
  }, [tenants]);

  useEffect(() => {
    if (!isSuperAdmin) {
      if (selectedTenantId) selectTenant("");
      return;
    }
    if (!tenantsQuery.isSuccess) return;
    if (selectedTenantId && selectedTenant) return;
    if (selectedTenantId) selectTenant("");
  }, [isSuperAdmin, selectedTenant, selectedTenantId, selectTenant, tenantsQuery.isSuccess]);

  const value = useMemo<ActiveTenantContextValue>(() => ({
    tenants,
    selectedTenant,
    selectedTenantId: selectedTenant?.id ?? "",
    selectTenant,
    isLoading: isSuperAdmin && tenantsQuery.isLoading,
    error: tenantsQuery.error instanceof Error ? tenantsQuery.error : null,
  }), [isSuperAdmin, selectTenant, selectedTenant, tenants, tenantsQuery.error, tenantsQuery.isLoading]);

  return (
    <ActiveTenantContext.Provider value={value}>
      {children}
    </ActiveTenantContext.Provider>
  );
}

export function useActiveTenant(): ActiveTenantContextValue {
  return useContext(ActiveTenantContext);
}
