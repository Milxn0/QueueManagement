import type { FilterKey, StatusKey } from "@/types/filters";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "คิวทั้งหมด" },
  { key: "month", label: "คิวรายเดือนเดือน" },
  { key: "year", label: "คิวรายปี" },
  { key: "cancelled", label: "คิวที่ยกเลิก" },
];

export const STATUSKEY: { key: StatusKey; label: string }[] = [
  { key: "waiting", label: "waiting" },
  { key: "confirm", label: "confirmed" },
  { key: "seated", label: "Seated" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
];
