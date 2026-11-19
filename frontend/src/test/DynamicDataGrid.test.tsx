import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DynamicDataGrid } from "../features/admin/components/DynamicDataGrid";

vi.mock("../hooks/useSystemMenu", () => ({
  useGridConfig: () => ({
    data: [
      {
        fieldCode: "name",
        headerTitle: "Họ tên",
        columnWidth: 140,
        isVisible: true,
        isFrozen: false,
        sortOrder: 0,
        cellFormatType: "text",
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

describe("DynamicDataGrid", () => {
  it("uses the compact table typography, cell spacing, and frame radius", () => {
    render(<DynamicDataGrid featureCode="STUDENTS" rows={[{ name: "Nguyễn Văn An" }]} />);

    expect(screen.getByRole("table")).toHaveClass("text-xs");
    expect(screen.getByRole("columnheader", { name: "Họ tên" })).toHaveClass(
      "px-2.5",
      "py-1.5",
      "text-[11px]",
      "uppercase",
      "bg-slate-100/90",
    );
    expect(screen.getByRole("cell", { name: "Nguyễn Văn An" })).toHaveClass(
      "px-2.5",
      "py-1.5",
      "text-xs",
    );
    expect(screen.getByRole("table").parentElement).toHaveClass("rounded-md");
  });
});
