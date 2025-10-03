import { useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebounced(value), 350);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, delay]);
  return debounced;
}
