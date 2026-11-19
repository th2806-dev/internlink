import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Home } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

describe("PageHeader", () => {
  it("omits a badge that duplicates the page title", () => {
    const { container } = render(
      <PageHeader icon={Home} title="Tổng quan" badge="Tổng quan" />,
    );

    expect(screen.getByRole("heading", { name: "Tổng quan" })).toBeInTheDocument();
    expect(container.querySelector("span.rounded-md.border")).not.toBeInTheDocument();
  });

  it("keeps a distinct status badge", () => {
    render(<PageHeader icon={Home} title="Tổng quan" badge="Đang hoạt động" />);

    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
  });
});
