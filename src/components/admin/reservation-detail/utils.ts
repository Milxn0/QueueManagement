/* eslint-disable @typescript-eslint/no-explicit-any */

export const TH_TZ = "Asia/Bangkok";

export const parseDate = (value: string | null) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  const withT = raw.replace(" ", "T");
  d = new Date(withT);
  if (!Number.isNaN(d.getTime())) return d;

  const withTZ = withT.endsWith("Z") ? withT : withT + "Z";
  d = new Date(withTZ);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const toInputLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export const formatDate = (value: string | null) => {
  const d = parseDate(value);
  return d
    ? d.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: TH_TZ,
      })
    : "-";
};

export const formatDisplayDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TH_TZ,
  }).format(d);
};

export const formatTHB = (n?: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(n);

const pickUserObj = (r: any) => r?.users ?? r?.user ?? null;

export const fallbackName = (r: any) =>
  pickUserObj(r)?.name ??
  r?.name ??
  r?.customer_name ??
  r?.contact_name ??
  r?.fullname ??
  r?.full_name ??
  r?.booker_name ??
  r?.guest_name ??
  null;

export const fallbackPhone = (r: any) =>
  pickUserObj(r)?.phone ??
  r?.phone ??
  r?.tel ??
  r?.mobile ??
  r?.contact_phone ??
  null;

export const showOccCode = (o?: {
  queue_code?: string | null;
  reservationId?: string | null;
}) => {
  const q = (o?.queue_code ?? "").trim();
  if (q) return q;
  const rid = (o?.reservationId ?? "").trim();
  return rid ? rid.slice(0, 6) : "-";
};

export const parseHHMM = (s?: string | null) => {
  const [h, m] = String(s ?? "")
    .split(":")
    .map((x) => Number(x));
  return { H: Number.isFinite(h) ? h : 0, M: Number.isFinite(m) ? m : 0 };
};

export const isWithinOpenClose = (
  d: Date,
  open?: string | null,
  close?: string | null
) => {
  const { H: oH, M: oM } = parseHHMM(open ?? "09:00");
  const { H: cH, M: cM } = parseHHMM(close ?? "21:00");

  const mins = d.getHours() * 60 + d.getMinutes();
  const openM = oH * 60 + oM;
  const closeM = cH * 60 + cM;

  if (closeM >= openM) {
    return mins >= openM && mins <= closeM;
  }
  return mins >= openM || mins <= closeM;
};
