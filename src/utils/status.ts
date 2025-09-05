// src/utils/status.ts
export type StatusKey =
  | "pending"
  | "confirmed"
  | "confirm"
  | "seated"
  | "cancelled"
  | "canceled";

const STATUS: Record<string, { badge: string; label: string }> = {
  pending: { badge: "bg-yellow-100 text-yellow-700", label: "Pending" },
  confirm: { badge: "bg-indigo-100 text-indigo-700", label: "Confirmed" },
  confirmed: { badge: "bg-indigo-100 text-indigo-700", label: "Confirmed" },
  seated: { badge: "bg-emerald-100 text-emerald-700", label: "Seated" },
  cancelled: { badge: "bg-red-100 text-red-700", label: "Cancelled" },
  canceled: { badge: "bg-red-100 text-red-700", label: "Cancelled" },
};

const FALLBACK = {
  badge: "bg-gray-100 text-gray-700",
  dot: "bg-gray-400",
  label: "ไม่ระบุ",
};

export function statusClass(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return STATUS.cancelled.badge;
  return STATUS[v]?.badge ?? FALLBACK.badge;
}

export function statusLabel(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("cancel")) return STATUS.cancelled.label;
  return STATUS[v]?.label ?? FALLBACK.label;
}
