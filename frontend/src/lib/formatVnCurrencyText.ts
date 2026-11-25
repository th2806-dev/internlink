const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

function readThreeDigits(value: number, includeZeroHundreds: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const words: string[] = [];

  if (hundreds > 0 || includeZeroHundreds) {
    words.push(digits[hundreds], "trăm");
  }

  if (tens > 1) {
    words.push(digits[tens], "mươi");
    if (ones === 1) words.push("mốt");
    else if (ones === 4) words.push("tư");
    else if (ones === 5) words.push("lăm");
    else if (ones > 0) words.push(digits[ones]);
  } else if (tens === 1) {
    words.push("mười");
    if (ones === 5) words.push("lăm");
    else if (ones > 0) words.push(digits[ones]);
  } else if (ones > 0) {
    if (hundreds > 0 || includeZeroHundreds) words.push("lẻ");
    words.push(digits[ones]);
  }

  return words.join(" ");
}

export function formatVnCurrencyText(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError("Số tiền phải là số nguyên không âm trong giới hạn an toàn.");
  }
  if (amount === 0) return "Không đồng chẵn.";

  const groups: number[] = [];
  let remainder = amount;
  while (remainder > 0) {
    groups.push(remainder % 1000);
    remainder = Math.floor(remainder / 1000);
  }

  const highestGroup = groups.length - 1;
  const words = groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => group > 0)
    .reverse()
    .map(({ group, index }) => {
      const value = readThreeDigits(group, index < highestGroup);
      return [value, units[index]].filter(Boolean).join(" ");
    })
    .join(" ");
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

  return `${capitalized} đồng chẵn.`;
}
