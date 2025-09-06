import type { FilterKey } from "@/types/filters";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "คิวทั้งหมด" },
  { key: "month",     label: "คิวแบบเลือกเดือน" },
  { key: "year",      label: "คิวปีนี้" },
  { key: "cancelled", label: "คิวที่ยกเลิก" },
];
