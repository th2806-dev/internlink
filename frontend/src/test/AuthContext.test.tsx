import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";
import { TOKEN_STORAGE_KEY } from "../config/env";
import {
  clearTenantImpersonationToken,
  getStoredToken,
  setStoredToken,
  setTenantImpersonationToken,
} from "../lib/apiClient";
import React from "react";

vi.mock("../services/auth.service", () => ({
  authService: {
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoredToken(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("provides initial unauthenticated state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.mustChangePassword).toBe(false);
  });

  it("restores the original token when a persisted support token has expired", async () => {
    setStoredToken("superadmin-token");
    setTenantImpersonationToken("expired-support-token");
    vi.mocked(authService.getMe)
      .mockImplementationOnce(async () => {
        clearTenantImpersonationToken();
        throw new Error("Support session expired");
      })
      .mockResolvedValueOnce({
        id: "superadmin-1",
        username: "platform-owner",
        fullName: "Platform Owner",
        email: null,
        role: "SuperAdmin",
        isActive: true,
        departmentId: null,
        mustChangePassword: false,
        isArchiveReadOnly: false,
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await vi.waitFor(() => expect(result.current.user?.backendRole).toBe("SuperAdmin"));

    expect(result.current.isLoggedIn).toBe(true);
    expect(getStoredToken()).toBe("superadmin-token");
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("superadmin-token");
    expect(authService.getMe).toHaveBeenCalledTimes(2);
  });

  it("login() stores token in localStorage and sets user session", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login({
        token: "jwt-token-abc",
        user: {
          id: "u-1",
          username: "student.nguyen",
          name: "Nguyen Van A",
          role: "student",
          email: "a@student.edu.vn",
        },
        mustChangePassword: true,
      });
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.name).toBe("Nguyen Van A");
    expect(result.current.role).toBe("student");
    expect(result.current.mustChangePassword).toBe(true);
    expect(getStoredToken()).toBe("jwt-token-abc");
    expect(localStorage.getItem("internlink_remembered_username")).toBe(
      "student.nguyen",
    );
  });

  it("logout() clears stored token and resets state", async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined as unknown as void);

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login({
        token: "jwt-token-abc",
        user: {
          id: "u-1",
          username: "student.nguyen",
          name: "Nguyen Van A",
          role: "student",
        },
      });
    });

    expect(getStoredToken()).toBe("jwt-token-abc");
    expect(result.current.isLoggedIn).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(getStoredToken()).toBeNull();
  });

  it("logout() clears token even if backend logout API fails", async () => {
    vi.mocked(authService.logout).mockRejectedValue(
      new Error("Network disconnect"),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login({
        token: "jwt-token-abc",
        user: {
          id: "u-2",
          username: "lecturer.tran",
          name: "Tran Van B",
          role: "lecturer",
        },
      });
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
    expect(getStoredToken()).toBeNull();
  });
});
