import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldPoliciesStudioView } from "../features/admin/pages/FieldPoliciesStudioView";
import { systemService } from "../services/system.service";
import { systemAdminService } from "../services/systemAdmin.service";

describe("FieldPoliciesStudioView", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads role-specific policies and saves edited field rules", async () => {
    vi.spyOn(systemAdminService, "getRoles").mockResolvedValue([
      { id: 8, code: "Lecturer", name: "Giảng viên", description: null },
    ]);
    vi.spyOn(systemService, "getFieldPolicies").mockImplementation(async (_formCode, roleId) => [{
      id: "field-policy-1",
      formCode: "FORM_STUDENT_PROFILE",
      fieldKey: "StudentCode",
      roleId,
      isVisible: true,
      isRequired: false,
      isReadOnly: false,
      customLabel: "Mã sinh viên",
      defaultValue: null,
      validationRegex: null,
      errorMessage: null,
      sortOrder: 0,
    }]);
    const savePolicies = vi.spyOn(systemService, "saveFieldPolicies").mockResolvedValue([]);

    renderView(<FieldPoliciesStudioView onShowToast={vi.fn()} />);
    await screen.findByRole("option", { name: "Giảng viên" });
    fireEvent.change(screen.getByLabelText("Vai trò áp dụng"), {
      target: { value: "8" },
    });
    await waitFor(() => {
      expect(systemService.getFieldPolicies).toHaveBeenLastCalledWith("FORM_STUDENT_PROFILE", 8);
    });

    const studentCodeLabel = await screen.findByLabelText("Tên ghi đè StudentCode");
    fireEvent.change(studentCodeLabel, { target: { value: "MSSV" } });
    fireEvent.click(screen.getByLabelText("Bắt buộc StudentCode"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu chính sách" }));

    await waitFor(() => {
      expect(savePolicies).toHaveBeenCalledWith(
        "FORM_STUDENT_PROFILE",
        8,
        expect.arrayContaining([
          expect.objectContaining({
            fieldKey: "StudentCode",
            isRequired: true,
            customLabel: "MSSV",
          }),
        ]),
      );
    });
  });
});

function renderView(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
