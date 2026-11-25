import { describe, expect, it } from "vitest";
import { formatVnCurrencyText } from "../lib/formatVnCurrencyText";

describe("formatVnCurrencyText", () => {
  it.each([
    [0, "Không đồng chẵn."],
    [25_000_000, "Hai mươi lăm triệu đồng chẵn."],
    [500_000_000, "Năm trăm triệu đồng chẵn."],
    [1_024, "Một nghìn không trăm hai mươi tư đồng chẵn."],
    [1_000_005, "Một triệu không trăm lẻ năm đồng chẵn."],
  ])("converts %i VND to Vietnamese words", (amount, expected) => {
    expect(formatVnCurrencyText(amount)).toBe(expected);
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    "rejects invalid amount %s",
    (amount) => {
      expect(() => formatVnCurrencyText(amount)).toThrow(RangeError);
    },
  );
});
