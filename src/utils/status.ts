export type StatusKey =
  | "waiting"
  | "confirmed"
  | "confirm"
  | "seated"
  | "paid"
  | "cancelled"
  | "canceled";

const STATUS: Record<string, { badge: string; label: string }> = {
  waiting: { badge: "bg-amber-100 text-amber-700", label: "waiting" },
  confirm: { badge: "bg-indigo-100 text-indigo-700", label: "Confirmed" },
  confirmed: { badge: "bg-indigo-100 text-indigo-700", label: "Confirmed" },
  seated: { badge: "bg-sky-100 text-sky-700", label: "Seated" },
  paid: { badge: "bg-emerald-100 text-emerald-700", label: "Paid" },
  cancelled: { badge: "bg-rose-100 text-rose-700", label: "Cancelled" },
  canceled: { badge: "bg-rose-100 text-rose-700", label: "Cancelled" },
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
