import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  apiRequest,
  ApiClientError,
  getApiErrorMessage,
  getStoredToken,
  setStoredToken,
} from "../lib/apiClient";
import { TOKEN_STORAGE_KEY } from "../config/env";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getApiErrorMessage", () => {
    it("maps known English backend messages to Vietnamese", () => {
      expect(getApiErrorMessage(new ApiClientError("Evaluation not found", 404))).toBe(
        "Không tìm thấy đánh giá.",
      );
      expect(getApiErrorMessage(new ApiClientError("Error retrieving evaluations", 500))).toBe(
        "Đã xảy ra lỗi. Vui lòng thử lại sau.",
      );
    });

    it("preserves messages without a known translation", () => {
      expect(getApiErrorMessage(new Error("Lịch nộp chưa được mở."))).toBe(
        "Lịch nộp chưa được mở.",
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Token storage helpers", () => {
    it("getStoredToken returns null when no token is saved", () => {
      expect(getStoredToken()).toBeNull();
    });

    it("setStoredToken saves and retrieves token from localStorage", () => {
      setStoredToken("test-jwt-token");
      expect(getStoredToken()).toBe("test-jwt-token");
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("test-jwt-token");
    });

    it("setStoredToken(null) removes token from localStorage", () => {
      setStoredToken("test-jwt-token");
      setStoredToken(null);
      expect(getStoredToken()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  describe("apiRequest", () => {
    it("attaches Authorization header when token is stored", async () => {
      setStoredToken("valid-token-123");

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            success: true,
            data: { id: "1", name: "InternLink" },
          }),
        ),
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse as unknown as Response);

      const data = await apiRequest<{ id: string; name: string }>("/api/test");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer valid-token-123");
      expect(data).toEqual({ id: "1", name: "InternLink" });
    });

    it("does not attach Authorization header when auth is false", async () => {
      setStoredToken("valid-token-123");

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            success: true,
            data: { status: "public" },
          }),
        ),
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse as unknown as Response);

      await apiRequest("/api/public", { auth: false });

      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
    });

    it("sends Content-Type application/json when body is provided", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            success: true,
            data: { created: true },
          }),
        ),
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse as unknown as Response);

      await apiRequest("/api/create", {
        method: "POST",
        body: { name: "Test" },
      });

      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(callArgs[1]?.body).toBe(JSON.stringify({ name: "Test" }));
    });

    it("throws ApiClientError when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            success: false,
            error: { title: "Unauthorized access", detail: "Token expired" },
          }),
        ),
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await expect(apiRequest("/api/protected")).rejects.toThrow(
        ApiClientError,
      );
      await expect(apiRequest("/api/protected")).rejects.toMatchObject({
        status: 401,
        message: "Unauthorized access",
      });
    });

    it("throws ApiClientError when success is false in payload", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            success: false,
            error: { title: "Business validation failed" },
          }),
        ),
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as unknown as Response,
      );

      await expect(apiRequest("/api/action")).rejects.toThrow(
        "Business validation failed",
      );
    });
  });
});