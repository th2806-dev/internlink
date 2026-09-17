import { useCallback, useEffect, useState } from "react";
import type { AdminUser, AdminUserStatus } from "../types/user";
import { adminUsersService } from "../services/adminUsers.service";
import { mapUserDtoToAdminUser } from "../lib/adminMappers";
import { getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

export interface UseAdminUsersState {
  users: AdminUser[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createUser: (payload: {
    username: string;
    fullName: string;
    email?: string;
    role: string;
    studentCode?: string;
    staffCode?: string;
  }) => Promise<AdminUser>;
  updateUser: (
    id: string,
    payload: { fullName: string; email?: string; isActive: boolean },
  ) => Promise<AdminUser>;
  toggleLock: (user: AdminUser) => Promise<string>;
  resetPassword: (
    id: string,
  ) => Promise<{ userId: string; username: string; emailSent: boolean }>;
  deleteUser: (id: string) => Promise<void>;
}

export const useAdminUsers = (): UseAdminUsersState => {
  const { user } = useAuth();
  const backendRole = user?.backendRole;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminUsersService.getAll({ take: 500 }, backendRole);
      setUsers(res.items.map(mapUserDtoToAdminUser));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(getApiErrorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [backendRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (payload: {
    username: string;
    fullName: string;
    email?: string;
    role: string;
    studentCode?: string;
    staffCode?: string;
  }): Promise<AdminUser> => {
    const createdDto = await adminUsersService.create(payload, backendRole);
    const mapped = mapUserDtoToAdminUser(createdDto);
    setUsers((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateUser = async (
    id: string,
    payload: { fullName: string; email?: string; isActive: boolean },
  ): Promise<AdminUser> => {
    const updatedDto = await adminUsersService.update(id, payload, backendRole);
    const mapped = mapUserDtoToAdminUser(updatedDto);
    setUsers((prev) => prev.map((u) => (u.id === id ? mapped : u)));
    return mapped;
  };

  const toggleLock = async (user: AdminUser): Promise<string> => {
    const next: AdminUserStatus = user.status === "locked" ? "active" : "locked";
    await adminUsersService.update(user.id, {
      fullName: user.fullName,
      email: user.email !== "—" ? user.email : undefined,
      isActive: next === "active",
    }, backendRole);
    setUsers((prev) =>
      prev.map((x) => (x.id === user.id ? { ...x, status: next } : x)),
    );
    return next === "locked"
      ? `Đã khóa tài khoản ${user.code}`
      : `Đã mở khóa ${user.code}`;
  };

  const resetPassword = async (
    id: string,
  ): Promise<{ userId: string; username: string; emailSent: boolean }> => {
    const res = await adminUsersService.resetPassword(id, backendRole);
    setUsers((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, mustChangePassword: true, status: "active" } : x,
      ),
    );
    return res;
  };

  const deleteUser = async (id: string): Promise<void> => {
    await adminUsersService.delete(id, backendRole);
    setUsers((prev) => prev.filter((x) => x.id !== id));
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    toggleLock,
    resetPassword,
    deleteUser,
  };
};
