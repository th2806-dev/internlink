import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenantBillingView } from "../features/admin/pages/TenantBillingView";
import type { TenantBillingInvoicePage, VietQrSettings } from "../services/systemBilling.service";

const mocks = vi.hoisted(() => ({
  getInvoices: vi.fn(),
  getPriceCatalog: vi.fn(),
  createPriceCatalogItem: vi.fn(),
  updatePriceCatalogItem: vi.fn(),
  updatePlan: vi.fn(),
  createInvoice: vi.fn(),
  getVietQr: vi.fn(),
  getVietQrSettings: vi.fn(),
  updateVietQrSettings: vi.fn(),
  previewVietQr: vi.fn(),
  markPaid: vi.fn(),
  getCatalog: vi.fn(),
  getAdminSettings: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,preview") },
}));

vi.mock("../contexts/ActiveTenantContext", () => ({
  useActiveTenant: () => ({
    tenants: [{ id: "tenant-1", name: "Đại học thử nghiệm", tenantCode: "UNI01" }],
    selectedTenant: null,
    selectedTenantId: "",
    selectTenant: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../services/systemBilling.service", () => ({
  billingStatusLabel: (status: string) => status,
  systemBillingService: {
    getInvoices: mocks.getInvoices,
    getPriceCatalog: mocks.getPriceCatalog,
    createPriceCatalogItem: mocks.createPriceCatalogItem,
    updatePriceCatalogItem: mocks.updatePriceCatalogItem,
    updatePlan: mocks.updatePlan,
    createInvoice: mocks.createInvoice,
    getVietQr: mocks.getVietQr,
    getVietQrSettings: mocks.getVietQrSettings,
    updateVietQrSettings: mocks.updateVietQrSettings,
    previewVietQr: mocks.previewVietQr,
    markPaid: mocks.markPaid,
  },
}));

vi.mock("../services/systemCatalog.service", () => ({
  systemCatalogService: {
    getCatalog: mocks.getCatalog,
  },
}));

vi.mock("../services/adminSettings.service", () => ({
  adminSettingsService: {
    getSettings: mocks.getAdminSettings,
  },
}));

const emptyInvoices: TenantBillingInvoicePage = {
  items: [],
  page: 1,
  pageSize: 25,
  totalCount: 0,
  summary: {
    totalCount: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    cancelledCount: 0,
    totalAmountVnd: 0,
    paidAmountVnd: 0,
    outstandingAmountVnd: 0,
  },
};

const invoice = {
  id: "invoice-1",
  tenantId: "tenant-1",
  tenantName: "Đại học thử nghiệm",
  tenantCode: "UNI01",
  invoiceNumber: "INV-202611-0001",
  planCode: "PRO",
  planName: "Chuyên nghiệp",
  baseAmountVnd: 25_000_000,
  taxRatePercent: 0,
  taxAmountVnd: 0,
  amountVnd: 25_000_000,
  billingCycleMonths: 12,
  maxStudentsQuota: 5000,
  maxLecturersQuota: 200,
  storageQuotaBytes: 100 * 1024 ** 3,
  status: "PendingPayment" as const,
  paymentMethod: "VietQR" as const,
  createdAt: "2026-11-23T00:00:00.000Z",
  dueDate: "2026-12-01T00:00:00.000Z",
  paidAt: null,
  paymentReference: null,
};

const invoicePage: TenantBillingInvoicePage = {
  ...emptyInvoices,
  items: [invoice],
  totalCount: 1,
};

function renderBillingView(onShowToast = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TenantBillingView onShowToast={onShowToast} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return onShowToast;
}

beforeEach(() => {
  mocks.getInvoices.mockResolvedValue(emptyInvoices);
  mocks.markPaid.mockResolvedValue(invoice);
  mocks.getCatalog.mockResolvedValue({
    vietQrBanks: [
      { value: "970415", label: "VietinBank" },
      { value: "970436", label: "Vietcombank" },
      { value: "970423", label: "TPBank" },
    ],
    billingPlans: [],
    billingCycles: [12, 24, 36],
    paymentMethods: [
      { value: "VietQR", label: "VietQR" },
      { value: "BankTransfer", label: "Chuyển khoản ngân hàng" },
    ],
    announcementTypes: [],
    announcementAudiences: [],
  });
  mocks.getAdminSettings.mockResolvedValue({
    departmentName: "Khoa Công nghệ",
    supportEmail: "support@example.test",
    phone: "0900000000",
    address: "Hà Nội",
    companyName: "CÔNG TY TEST INTERNLINK",
    companyTaxCode: "0100000001",
    companyAddress: "Hà Nội",
    companyHotline: "1900 0000",
    billingEmail: "billing@example.test",
  });
  const catalog = {
    plans: [
      { code: "STANDARD", name: "Tiêu chuẩn", licenseTier: 1, maxStudentsQuota: 500, maxLecturersQuota: 25, storageQuotaBytes: 20 * 1024 ** 3 },
      { code: "PRO", name: "Chuyên nghiệp", licenseTier: 2, maxStudentsQuota: 2000, maxLecturersQuota: 100, storageQuotaBytes: 100 * 1024 ** 3 },
      { code: "ENTERPRISE", name: "Doanh nghiệp", licenseTier: 3, maxStudentsQuota: 10000, maxLecturersQuota: 500, storageQuotaBytes: 500 * 1024 ** 3 },
    ],
    billingCycleOptions: [12, 24, 36],
    items: [{
      id: "price-pro-12",
      planCode: "PRO",
      planName: "Chuyên nghiệp",
      billingCycleMonths: 12,
      baseAmountVnd: 25_000_000,
      taxRatePercent: 10,
      taxAmountVnd: 2_500_000,
      totalAmountVnd: 27_500_000,
      effectiveFrom: "2026-11-23T00:00:00.000Z",
      effectiveTo: null,
      isActive: true,
      isUsedByInvoice: false,
    }],
  };
  mocks.getPriceCatalog.mockResolvedValue(catalog);
  mocks.createPriceCatalogItem.mockResolvedValue(catalog.items[0]);
  mocks.updatePriceCatalogItem.mockResolvedValue(catalog.items[0]);
  mocks.updatePlan.mockResolvedValue(catalog.plans[1]);
  mocks.createInvoice.mockResolvedValue(invoice);
  mocks.getVietQr.mockResolvedValue({
    payload: "sample-payload",
    bankId: "970415",
    accountNo: "0123456789",
    accountName: "NGUYEN VAN A",
    amountVnd: 25_000_000,
    memo: "ILPAY INV-202611-0001",
  });
  mocks.getVietQrSettings.mockResolvedValue({
    bankId: "",
    accountNo: "",
    accountName: "",
    merchantCity: "",
  });
  mocks.previewVietQr.mockResolvedValue({
    payload: "sample-payload",
    bankId: "970415",
    accountNo: "0123456789",
    accountName: "NGUYEN VAN A",
    amountVnd: 10000,
    memo: "ILPAY TEST-10000",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("TenantBillingView price catalog", () => {
  it("creates an invoice using the active catalog total instead of accepting a manual amount", async () => {
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Tạo hóa đơn mới" }));
    const dialog = await screen.findByRole("dialog", { name: "Tạo hóa đơn bản quyền" });
    expect(await within(dialog).findByText("27.500.000 ₫")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Số tiền (VND) *")).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Đơn vị *"), { target: { value: "tenant-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo hóa đơn" }));

    await waitFor(() => {
      expect(mocks.createInvoice).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        planCode: "PRO",
        billingCycleMonths: 12,
        paymentMethod: "VietQR",
        dueDate: null,
      });
    });
  });

  it("updates plan quotas without asking for or changing invoice values", async () => {
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Bảng giá dịch vụ" }));
    const dialog = await screen.findByRole("dialog", { name: "Bảng giá dịch vụ" });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Chỉnh sửa hạn mức Chuyên nghiệp" }));
    fireEvent.change(within(dialog).getByLabelText("Sinh viên"), { target: { value: "4000" } });
    fireEvent.change(within(dialog).getByLabelText("Giảng viên"), { target: { value: "200" } });
    fireEvent.change(within(dialog).getByLabelText("Lưu trữ (GB)"), { target: { value: "250" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu hạn mức" }));

    await waitFor(() => {
      expect(mocks.updatePlan).toHaveBeenCalledWith("PRO", {
        maxStudentsQuota: 4000,
        maxLecturersQuota: 200,
        storageQuotaBytes: 250 * 1024 ** 3,
      });
    });
  });

  it("allows updating an unused price version and its VAT rate", async () => {
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Bảng giá dịch vụ" }));
    const dialog = await screen.findByRole("dialog", { name: "Bảng giá dịch vụ" });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(within(dialog).getByLabelText("Thuế suất VAT (%) *"), { target: { value: "8" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      expect(mocks.updatePriceCatalogItem).toHaveBeenCalledWith(
        "price-pro-12",
        expect.objectContaining({ taxRatePercent: 8, isActive: true }),
      );
    });
  });
});

describe("TenantBillingView payment notice", () => {
  it("prints a payment notice with invoice details, amount in words, and VietQR", async () => {
    mocks.getInvoices.mockResolvedValue(invoicePage);
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", {
      name: "In đề nghị thanh toán INV-202611-0001",
    }));

    const dialog = await screen.findByRole("dialog", { name: "Giấy đề nghị thanh toán" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Đại học thử nghiệm")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText("CÔNG TY TEST INTERNLINK")).toBeInTheDocument();
      expect(within(dialog).getByText(/0100000001/)).toBeInTheDocument();
    });
    expect(within(dialog).getByText("Hai mươi lăm triệu đồng chẵn.")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Mã VietQR hóa đơn INV-202611-0001" })).toHaveAttribute(
      "src",
      "data:image/png;base64,preview",
    );
    expect(mocks.getVietQr).toHaveBeenCalledWith(invoice.id, expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "In / Xuất PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("opens the A4 payment notice from the VietQR dialog", async () => {
    mocks.getInvoices.mockResolvedValue(invoicePage);
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Xem mã VietQR" }));
    fireEvent.click(await screen.findByRole("button", { name: "In giấy đề nghị thanh toán A4" }));

    expect(await screen.findByRole("dialog", { name: "Giấy đề nghị thanh toán" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Mã thanh toán VietQR" })).not.toBeInTheDocument();
  });

  it("opens a confirmation dialog and marks the invoice paid with a bank reference", async () => {
    mocks.getInvoices.mockResolvedValue(invoicePage);
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận thanh toán" }));
    const dialog = await screen.findByRole("dialog", { name: "Xác nhận thanh toán" });
    fireEvent.change(within(dialog).getByLabelText("Mã giao dịch ngân hàng *"), {
      target: { value: "FT260012345678" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận đã thanh toán" }));

    await waitFor(() => {
      expect(mocks.markPaid).toHaveBeenCalledWith(invoice.id, "FT260012345678");
    });
  });
});

describe("TenantBillingView VietQR settings", () => {
  it("creates a 10,000 VND QR preview from unsaved settings without saving them", async () => {
    renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Cấu hình tài khoản nhận tiền" }));
    await screen.findByRole("dialog", { name: "Cấu hình Tài khoản Thụ hưởng VietQR" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Ngân hàng *"), { target: { value: "970415" } });
    fireEvent.change(screen.getByLabelText("Số tài khoản *"), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText("Tên chủ tài khoản (không dấu) *"), { target: { value: "Nguyễn Văn A" } });
    fireEvent.change(screen.getByLabelText("Chi nhánh *"), { target: { value: "Hồ Chí Minh" } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tạo mã thử nghiệm" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo mã thử nghiệm" }));

    expect(await screen.findByRole("region", { name: "Mã VietQR thử nghiệm" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Mã VietQR thử nghiệm trị giá 10.000 đồng" })).toHaveAttribute(
      "src",
      "data:image/png;base64,preview",
    );
    expect(mocks.previewVietQr).toHaveBeenCalledWith({
      bankId: "970415",
      accountNo: "0123456789",
      accountName: "NGUYEN VAN A",
      merchantCity: "HO CHI MINH",
    });
    expect(mocks.updateVietQrSettings).not.toHaveBeenCalled();
  });

  it("loads, normalizes, and saves the beneficiary account settings", async () => {
    const savedSettings: VietQrSettings = {
      bankId: "970415",
      accountNo: "0123456789",
      accountName: "NGUYEN ANH DAO",
      merchantCity: "HO CHI MINH",
    };
    mocks.updateVietQrSettings.mockResolvedValue(savedSettings);
    const onShowToast = renderBillingView();

    fireEvent.click(await screen.findByRole("button", { name: "Cấu hình tài khoản nhận tiền" }));
    expect(await screen.findByRole("dialog", { name: "Cấu hình Tài khoản Thụ hưởng VietQR" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Ngân hàng *"), { target: { value: "970415" } });
    fireEvent.change(screen.getByLabelText("Số tài khoản *"), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText("Tên chủ tài khoản (không dấu) *"), {
      target: { value: "Nguyễn Ánh Đào" },
    });
    fireEvent.change(screen.getByLabelText("Chi nhánh *"), { target: { value: "HO CHI MINH" } });

    expect(screen.getByLabelText("Tên chủ tài khoản (không dấu) *")).toHaveValue("NGUYEN ANH DAO");
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => {
      expect(mocks.updateVietQrSettings).toHaveBeenCalledWith(savedSettings);
      expect(onShowToast).toHaveBeenCalledWith("Đã lưu cấu hình tài khoản nhận tiền VietQR.", "success");
    });
    expect(screen.queryByRole("dialog", { name: "Cấu hình Tài khoản Thụ hưởng VietQR" })).not.toBeInTheDocument();
  });
});
