import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Home } from "lucide-react";
import { CompactActionBar } from "../components/common/CompactActionBar";

describe("CompactActionBar", () => {
  it("renders a compact title, total, search control, and action", () => {
    const onSearch = vi.fn();
    const onCreate = vi.fn();
    render(
      <CompactActionBar
        icon={Home}
        title="Sinh viên"
        total="Tổng cộng: 425 sinh viên"
        search={{
          value: "",
          onChange: onSearch,
          placeholder: "Tìm sinh viên",
          ariaLabel: "Tìm sinh viên",
        }}
        actions={[{ label: "Thêm mới", onClick: onCreate, variant: "primary" }]}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Tìm sinh viên" }), {
      target: { value: "Nguyen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm mới" }));

    expect(screen.getByRole("heading", { name: "Sinh viên" })).toBeInTheDocument();
    expect(screen.getByText("Tổng cộng: 425 sinh viên")).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledWith("Nguyen");
    expect(onCreate).toHaveBeenCalledOnce();
  });
});
