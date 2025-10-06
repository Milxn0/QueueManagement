export type StatusKey =
  | ""
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

export function normalizeStatus(s: string | null | undefined): StatusKey {
  const v = (s ?? "").toLowerCase().trim();
  if (!v) return "";
  if (v.includes("cancel")) return "cancelled";
  if (v.startsWith("seat")) return "seated";
  if (v.startsWith("confirm")) return "confirmed";
  if (v.startsWith("paid") || v.startsWith("pay")) return "paid";
  if (v.startsWith("wait")) return "waiting";
  return "" as StatusKey;
}


// ----- Payment Method -----

export type PaymentMethodKey =
  | "cash"
  | "card"
  | "qr"
  | "transfer"
  | "e-wallet"
  | ""; 

export function normalizePaymentMethod(
  s: string | null | undefined
): PaymentMethodKey {
  const v = (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");

  if (!v) return "";

  if (["cash", "card", "qr", "transfer", "e-wallet"].includes(v)) {
    return v as PaymentMethodKey;
  }

  if (v === "promptpay" || v === "qrcode" || v === "qrpay") return "qr";
  if (
    v === "credit" ||
    v === "debit" ||
    v === "creditcard" ||
    v === "debitcard" ||
    v === "cardpay"
  )
    return "card";
  if (v === "bank" || v === "ibanking" || v === "transfermoney") return "transfer";
  if (v === "ewallet" || v === "wallet" || v === "e-walletpay") return "e-wallet";

  return "" as PaymentMethodKey;
}

export function paymentMethodLabel(k: PaymentMethodKey): string {
  switch (k) {
    case "cash":
      return "เงินสด";
    case "card":
      return "บัตร";
    case "qr":
      return "QR / PromptPay";
    case "transfer":
      return "โอนเงิน";
    case "e-wallet":
      return "E-Wallet";
    default:
      return "-";
  }
}
