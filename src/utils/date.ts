/* eslint-disable @typescript-eslint/no-unused-vars */
export const TZ = "Asia/Bangkok" as const;

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISO(d: Date) {
  return d.toISOString();
}

export function ymdLocal(dateISO: string, tz: string = TZ) {
  const d = new Date(dateISO);
  const y = d.toLocaleString("en-CA", { timeZone: tz, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: tz, month: "2-digit" });
  const day = d.toLocaleString("en-CA", { timeZone: tz, day: "2-digit" });
  return `${y}-${m}-${day}`;
}

export function monthRangeFromYYYYMM(ym: string) {
  const [Y, M] = ym.split("-").map(Number);
  const start = new Date(Y, (M ?? 1) - 1, 1, 0, 0, 0, 0);
  const end = new Date(Y, M ?? 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(Y, M ?? 1, 0).getDate();
  return { startISO: start.toISOString(), endISO: end.toISOString(), daysInMonth };
}

export function makeRangeISO(
  mode: "all" | "day" | "month" | "year",
  dayStr: string,
  monthStr: string,
  yearStr: string
) {
  //โหมดทั้งหมด (Export ข้อมูลทั้งตาราง)
  if (mode === "all") {
    const start = new Date(1900, 0, 1, 0, 0, 0, 0); // 1900-01-01 00:00
    const end = new Date(2100, 11, 31, 23, 59, 59, 999); // 2100-12-31 23:59
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: "ทั้งหมด",
    };
  }

  //โหมดรายวัน
  if (mode === "day") {
    const [Y, M, D] = dayStr.split("-").map(Number);
    const start = new Date(Y, (M ?? 1) - 1, D ?? 1, 0, 0, 0, 0);
    const end = new Date(Y, (M ?? 1) - 1, D ?? 1, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: dayStr };
  }

  //โหมดรายเดือน
  if (mode === "month") {
    const [Y, M] = monthStr.split("-").map(Number);
    const start = new Date(Y, (M ?? 1) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Y, M ?? 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: monthStr };
  }

  //โหมดรายปี
  const Y = Number(yearStr);
  const start = new Date(Y, 0, 1, 0, 0, 0, 0);
  const end = new Date(Y, 11, 31, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), label: yearStr };
}

export function formatBangkok(iso: string, tz: string = TZ) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTh(value: string | null, tz: string = TZ) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("th-TH", { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
}

export function toLocalInputValue(iso: string, tz: string = TZ) {
  const d = new Date(iso);
  const y = d.toLocaleString("en-CA", { timeZone: tz, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: tz, month: "2-digit" });
  const day = d.toLocaleString("en-CA", { timeZone: tz, day: "2-digit" });
  const hh = d.toLocaleString("en-CA", { timeZone: tz, hour: "2-digit", hour12: false });
  const mm = d.toLocaleString("en-CA", { timeZone: tz, minute: "2-digit" });
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function localInputToISO(localStr: string, tz: string = TZ) {
  const [date, time] = localStr.split("T");
  const [Y, M, D] = (date ?? "").split("-").map(Number);
  const [h, i] = (time ?? "").split(":").map(Number);
  const utcMs = Date.UTC(Y ?? 1970, (M ?? 1) - 1, D ?? 1, h ?? 0, i ?? 0);
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  const realUtc = new Date(utcMs - bangkokOffsetMs);
  return realUtc.toISOString();
}

export function toInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
