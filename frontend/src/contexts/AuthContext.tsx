import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { getStoredToken, setStoredToken, clearAuthTokens } from "../lib/apiClient";
import { mapBackendRole } from "../lib/roleMap";
import { authService } from "../services/auth.service";
import type { CurrentUserDto } from "../types/api";

export type UserRole = "admin" | "lecturer" | "student";

export interface AuthUser {
  id?: string;
  username: string;
  name: string;
  role: UserRole;
  backendRole?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  departmentId?: string | null;
}

export interface AuthSession {
  token?: string;
  user: AuthUser;
  mustChangePassword?: boolean;
}

export interface AuthContextType {
  isLoggedIn: boolean;
  isBootstrapping: boolean;
  user: AuthUser | null;
  role: UserRole | null;
  mustChangePassword: boolean;
  login: (session: AuthSession) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  clearMustChangePassword: () => void;
  /** Portal switch */
  switchRole: (role: UserRole) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapMeToAuthUser(me: CurrentUserDto): AuthUser {
  const role = mapBackendRole(me.role);
  if (!role) {
    throw new Error(`Unsupported role: ${me.role}`);
  }
  return {
    id: me.id,
    username: me.username,
    name: me.fullName?.trim() || me.username,
    role,
    backendRole: me.role,
    email: me.email,
    departmentId: me.departmentId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => Boolean(getStoredToken()));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const login = useCallback((session: AuthSession) => {
    if (session.token) setStoredToken(session.token);
    setIsLoggedIn(true);
    setUser(session.user);
    setMustChangePassword(Boolean(session.mustChangePassword));
    if (session.user.username) {
      localStorage.setItem(
        "internlink_remembered_username",
        session.user.username,
      );
    }
  }, []);

  const logout = useCallback(async () => {
    if (getStoredToken()) {
      try {
        await authService.logout();
      } catch {
        /* ignore network/server errors during logout */
      } finally {
        clearAuthTokens();
      }
    } else {
      clearAuthTokens();
    }
    setIsLoggedIn(false);
    setUser(null);
    setMustChangePassword(false);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await authService.getMe();
    setUser(mapMeToAuthUser(me));
    setMustChangePassword(me.mustChangePassword);
    setIsLoggedIn(true);
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return prev;
      const roleLabels: Record<UserRole, string> = {
        admin: "Quản trị hệ thống",
        lecturer: "Giảng viên",
        student: "Sinh viên",
      };
      return { ...prev, role: newRole, name: roleLabels[newRole] };
    });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthTokens();
      setIsLoggedIn(false);
      setUser(null);
      setMustChangePassword(false);
    };

    window.addEventListener("internlink:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("internlink:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }
      try {
        const me = await authService.getMe();
        if (cancelled) return;
        login({
          token,
          user: mapMeToAuthUser(me),
          mustChangePassword: me.mustChangePassword,
        });
      } catch {
        clearAuthTokens();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [login]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isBootstrapping,
        user,
        role: user?.role ?? null,
        mustChangePassword,
        login,
        logout,
        refreshMe,
        clearMustChangePassword,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
