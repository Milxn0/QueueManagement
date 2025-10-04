import { useState } from "react";
import type { Dataset, VisibleKey } from "@/types/analytics";
import { useDebouncedValue } from "@/hooks/shared/useDebouncedValue";

export function useAnalyticsFilters() {
  const [dataset, setDataset] = useState<Dataset>("reservations");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState<VisibleKey[]>(["all", "customer", "staff"]);
  const debouncedName = useDebouncedValue(name, 350);

  const toggle = (k: VisibleKey) =>
    setVisible((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const clearName = () => setName("");

  return { dataset, setDataset, name, setName, visible, setVisible, debouncedName, toggle, clearName };
}
