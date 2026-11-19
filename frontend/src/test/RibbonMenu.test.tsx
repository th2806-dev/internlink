import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RibbonMenu } from "../features/admin/components/RibbonMenu";
import type { SystemMenuItem } from "../types/system";

const mocks = vi.hoisted(() => ({ useSystemMenu: vi.fn() }));

vi.mock("../hooks/useSystemMenu", () => ({
  useSystemMenu: mocks.useSystemMenu,
}));

const menu: SystemMenuItem[] = [
  {
    code: "DASHBOARD",
    name: "Tổng quan",
    moduleCode: "DASHBOARD",
    sortOrder: 0,
    funcUrl: "/admin/dashboard",
    iconName: "LayoutDashboard",
    badgeText: null,
    children: [],
  },
  {
    code: "STUDENTS",
    name: "Sinh viên",
    moduleCode: "STUDENTS",
    sortOrder: 1,
    funcUrl: null,
    iconName: "Users",
    badgeText: null,
    groupName: "1. Chuẩn bị kỳ",
    children: [
      {
        code: "STUDENTS.LIST",
        name: "Sinh viên",
        moduleCode: "STUDENTS",
        sortOrder: 1,
        funcUrl: "/admin/students",
        iconName: "Users",
        badgeText: null,
        children: [],
      },
      {
        code: "COMPANIES.LIST",
        name: "Doanh nghiệp",
        moduleCode: "COMPANIES",
        sortOrder: 2,
        funcUrl: "/admin/companies",
        iconName: "Building2",
        badgeText: null,
        children: [],
      },
    ],
  },
];

describe("RibbonMenu", () => {
  it("renders API-derived groups and navigates to a selected route", () => {
    mocks.useSystemMenu.mockReturnValue({ data: menu, isPending: false, isError: false });
    const onNavigate = vi.fn();
    render(<RibbonMenu onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /1\. Chuẩn bị kỳ/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Doanh nghiệp" }));

    expect(onNavigate).toHaveBeenCalledWith("admin-companies");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("supports keyboard activation and menu item navigation", async () => {
    mocks.useSystemMenu.mockReturnValue({ data: menu, isPending: false, isError: false });
    const onNavigate = vi.fn();
    render(<RibbonMenu onNavigate={onNavigate} />);

    await userEvent.click(screen.getByRole("button", { name: /1\. Chuẩn bị kỳ/ }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Sinh viên" })).toHaveFocus(),
    );
    await userEvent.keyboard("{End}{Enter}");

    expect(onNavigate).toHaveBeenCalledWith("admin-companies");
  });
});
