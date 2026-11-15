import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DynamicFormField } from "../components/common/DynamicFormField";
import { systemService } from "../services/system.service";

describe("DynamicFormField", () => {
  afterEach(() => vi.restoreAllMocks());

  it("supports policy-aware select and multiline controls", async () => {
    vi.spyOn(systemService, "getFieldPolicies").mockResolvedValue([]);
    const onScoreChange = vi.fn();
    const onCommentChange = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })}>
        <DynamicFormField
          formCode="FORM_WEEKLY_REPORT"
          roleId={null}
          fieldKey="QualityScore"
          label="Điểm chất lượng"
          name="qualityScore"
          type="select"
          required
          value=""
          onChange={onScoreChange}
          options={[{ value: "4", label: "4 điểm — Tốt" }]}
        />
        <DynamicFormField
          formCode="FORM_WEEKLY_REPORT"
          roleId={null}
          fieldKey="LecturerComment"
          label="Nhận xét"
          name="lecturerComment"
          type="textarea"
          value=""
          onChange={onCommentChange}
        />
      </QueryClientProvider>,
    );

    const score = await screen.findByLabelText(/Điểm chất lượng/);
    expect(score).toBeRequired();
    fireEvent.change(score, { target: { value: "4" } });
    expect(onScoreChange).toHaveBeenCalledWith("4");

    const comment = screen.getByLabelText("Nhận xét");
    expect(comment.tagName).toBe("TEXTAREA");
    fireEvent.change(comment, { target: { value: "Bài làm tốt." } });
    expect(onCommentChange).toHaveBeenCalledWith("Bài làm tốt.");
  });

  it("applies visibility and validates required values with the configured message", async () => {
    vi.spyOn(systemService, "getFieldPolicies").mockResolvedValue([
      {
        id: "policy-1",
        formCode: "FORM_STUDENT_PROFILE",
        fieldKey: "Email",
        roleId: null,
        isVisible: true,
        isRequired: true,
        isReadOnly: false,
        customLabel: "Email trường",
        defaultValue: null,
        validationRegex: "^.+@example\\.edu$",
        errorMessage: "Hãy dùng email của trường.",
        sortOrder: 0,
      },
      {
        id: "policy-2",
        formCode: "FORM_STUDENT_PROFILE",
        fieldKey: "Phone",
        roleId: null,
        isVisible: false,
        isRequired: false,
        isReadOnly: false,
        customLabel: null,
        defaultValue: null,
        validationRegex: null,
        errorMessage: null,
        sortOrder: 1,
      },
    ]);

    render(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })}>
        <DynamicFormField
          formCode="FORM_STUDENT_PROFILE"
          roleId={null}
          fieldKey="Email"
          label="Email"
          name="email"
          value="person@invalid.com"
          onChange={vi.fn()}
        />
        <DynamicFormField
          formCode="FORM_STUDENT_PROFILE"
          roleId={null}
          fieldKey="Phone"
          label="Điện thoại"
          name="phone"
          value=""
          onChange={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const email = await screen.findByLabelText(/Email trường/);
    expect(email).toBeRequired();
    expect(screen.queryByLabelText("Điện thoại")).not.toBeInTheDocument();

    fireEvent.blur(email);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hãy dùng email của trường.");
  });

  it("uses the current role policy for a screenCode field", async () => {
    const getPolicies = vi.spyOn(systemService, "getFieldPolicies").mockResolvedValue([]);

    render(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })}>
        <DynamicFormField
          screenCode="STUDENT_WEEKLY_REPORT"
          roleId={null}
          currentUserRole
          fieldKey="keyResults"
          label="Kết quả đạt được"
          name="keyResults"
          value=""
          onChange={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText("Kết quả đạt được")).toBeInTheDocument();
    expect(getPolicies).toHaveBeenCalledWith("STUDENT_WEEKLY_REPORT", null, true);
  });
});
