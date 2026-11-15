import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { systemService } from "../services/system.service";

export function useSystemMenu() {
  const { isLoggedIn, user } = useAuth();

  return useQuery({
    queryKey: ["system-menu", user?.id],
    queryFn: systemService.getMyMenu,
    enabled: isLoggedIn && Boolean(user?.id),
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGridConfig(
  featureCode: string,
  enabled = true,
  roleId: number | null = null,
  currentUser = false,
) {
  const { isLoggedIn } = useAuth();

  return useQuery({
    queryKey: ["system-grid-config", featureCode, roleId, currentUser],
    queryFn: () => systemService.getGridConfig(featureCode, roleId ?? undefined, currentUser),
    enabled: enabled && isLoggedIn && Boolean(featureCode),
    staleTime: 5 * 60 * 1000,
  });
}
