import { useState } from "react";
import type { ExportMode } from "@/types/analytics";

export function useExportControls() {
  const today = new Date();
  const defaultDay = today.toISOString().slice(0, 10);
  const defaultMonth = defaultDay.slice(0, 7);
  const defaultYear = String(today.getFullYear());

  const [mode, setMode] = useState<ExportMode>("day");
  const [dayVal, setDayVal] = useState<string>(defaultDay);
  const [monthVal, setMonthVal] = useState<string>(defaultMonth);
  const [yearVal, setYearVal] = useState<string>(defaultYear);
  const [exporting, setExporting] = useState(false);

  return {
    mode,
    setMode,
    dayVal,
    setDayVal,
    monthVal,
    setMonthVal,
    yearVal,
    setYearVal,
    exporting,
    setExporting,
  };
}
