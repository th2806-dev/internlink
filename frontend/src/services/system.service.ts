import { apiRequest } from "../lib/apiClient";
import type {
  SaveSysFieldPolicy,
  SaveSysFunction,
  SysFieldPolicy,
  SysFunction,
  SysGridConfig,
  SystemMenuItem,
} from "../types/system";

export const systemService = {
  getMyMenu: () =>
    apiRequest<SystemMenuItem[]>("/api/v1/system/functions/my-menu", {
      skipCache: true,
    }),

  getFunctionTree: (includeHidden = true) =>
    apiRequest<SysFunction[]>(
      `/api/v1/system/functions/tree?includeHidden=${includeHidden}`,
      { skipCache: true },
    ),

  getFunction: (id: string) =>
    apiRequest<SysFunction>(`/api/v1/system/functions/${encodeURIComponent(id)}`, {
      skipCache: true,
    }),

  createFunction: (functionData: SaveSysFunction) => {
    const { isActive: _isActive, ...request } = functionData;
    return apiRequest<SysFunction>("/api/v1/system/functions", {
      method: "POST",
      body: request,
    });
  },

  updateFunction: (id: string, functionData: SaveSysFunction) =>
    apiRequest<SysFunction>(
      `/api/v1/system/functions/${encodeURIComponent(id)}`,
      { method: "PUT", body: functionData },
    ),

  deleteFunction: (id: string) =>
    apiRequest<void>(`/api/v1/system/functions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  reorderFunctions: (
    items: { id: string; newParentId: string | null; newSortPriority: number }[],
  ) =>
    apiRequest<void>("/api/v1/system/functions/reorder", {
      method: "PUT",
      body: { items },
    }),

  getFieldPolicies: (
    formCode: string,
    roleId: number | null,
    currentUserRole = false,
  ) => {
    const params = new URLSearchParams();
    if (roleId !== null) params.set("roleId", String(roleId));
    if (currentUserRole) params.set("currentUserRole", "true");
    const queryString = params.toString();
    const query = queryString ? `?${queryString}` : "";
    return apiRequest<SysFieldPolicy[]>(
      `/api/v1/system/field-policies/${encodeURIComponent(formCode)}${query}`,
      { skipCache: true },
    );
  },

  saveFieldPolicies: (
    formCode: string,
    roleId: number | null,
    policies: SaveSysFieldPolicy[],
  ) => {
    const query = roleId === null ? "" : `?roleId=${roleId}`;
    return apiRequest<SysFieldPolicy[]>(
      `/api/v1/system/field-policies/${encodeURIComponent(formCode)}${query}`,
      { method: "PUT", body: { policies } },
    );
  },

  getGridConfig: (featureCode: string, roleId?: number, currentUser = false) => {
    const params = new URLSearchParams();
    if (roleId) params.set("roleId", String(roleId));
    if (currentUser) params.set("currentUser", "true");
    const queryString = params.toString();
    const query = queryString ? `?${queryString}` : "";
    return apiRequest<SysGridConfig[]>(
      `/api/v1/system/grid-configs/${encodeURIComponent(featureCode)}${query}`,
      { skipCache: true },
    );
  },

  saveGridConfig: (featureCode: string, configs: SysGridConfig[], roleId?: number) => {
    const query = roleId ? `?roleId=${roleId}` : "";
    return apiRequest<SysGridConfig[]>(
      `/api/v1/system/grid-configs/${encodeURIComponent(featureCode)}${query}`,
      { method: "PUT", body: configs },
    );
  },
};
