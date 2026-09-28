import { useEffect, useState } from "react";

/**
 * Trả về `value` sau khi nó ổn định liên tục `delayMs`.
 * Dùng cho ô tìm kiếm: gõ nhanh chỉ phát sinh MỘT request cuối cùng (chống flood).
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
