import { describe, it, expect } from "vitest";
import { toSkipTake, toPagedResult, DEFAULT_PAGE_SIZE } from "../lib/pagination";

describe("toSkipTake (adapter UI page → backend skip/take)", () => {
  it("chuyển 1-based page sang skip/take chính xác", () => {
    expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
    expect(toSkipTake({ page: 2, pageSize: 20 })).toEqual({ skip: 20, take: 20 });
    expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
    expect(toSkipTake({ page: 5, pageSize: 50 })).toEqual({ skip: 200, take: 50 });
  });

  it("chặn page/pageSize không hợp lệ về giá trị an toàn", () => {
    expect(toSkipTake({ page: 0, pageSize: 0 })).toEqual({ skip: 0, take: DEFAULT_PAGE_SIZE });
    expect(toSkipTake({ page: -3, pageSize: -10 })).toEqual({ skip: 0, take: DEFAULT_PAGE_SIZE });
    expect(toSkipTake({ page: NaN, pageSize: NaN })).toEqual({ skip: 0, take: DEFAULT_PAGE_SIZE });
    expect(toSkipTake({ page: 1.7, pageSize: 20.9 })).toEqual({ skip: 0, take: 20 });
  });
});

describe("toPagedResult (adapter phản hồi backend → hợp đồng chuẩn)", () => {
  it("adapter cho backend đang trả {items,total,skip,take}", () => {
    const res = toPagedResult<string>(
      { items: ["a", "b"], total: 45, skip: 20, take: 20 },
      { page: 2, pageSize: 20 },
    );
    expect(res).toEqual({
      items: ["a", "b"],
      totalCount: 45,
      page: 2,
      pageSize: 20,
      totalPages: 3,
    });
  });

  it("adapter cho backend trả mảng thuần (không phân trang)", () => {
    const res = toPagedResult<number>([1, 2, 3], { page: 1, pageSize: 50 });
    expect(res.items).toEqual([1, 2, 3]);
    expect(res.totalCount).toBe(3);
    expect(res.page).toBe(1);
    expect(res.totalPages).toBe(1);
  });

  it("adapter cho payload {data,totalCount,page,pageSize}", () => {
    const res = toPagedResult<{ id: string }>(
      { data: [{ id: "x" }], totalCount: 7, page: 1, pageSize: 10 },
      { page: 1, pageSize: 10 },
    );
    expect(res.items).toEqual([{ id: "x" }]);
    expect(res.totalCount).toBe(7);
    expect(res.totalPages).toBe(1);
  });

  it("payload rỗng/null không làm vỡ UI", () => {
    const res = toPagedResult<string>(null, { page: 1, pageSize: 20 });
    expect(res.items).toEqual([]);
    expect(res.totalCount).toBe(0);
    expect(res.page).toBe(1);
  });
});
