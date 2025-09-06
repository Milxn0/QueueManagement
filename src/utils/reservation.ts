export type AppSettings = {
  is_system_open?: boolean | null;
  days_ahead?: number | null;
  open_time?: string | null;
  close_time?: string | null; 
};

export function canModify(status: string | null) {
  const v = (status ?? "").toLowerCase();
  return v === "pending" || v === "confirmed" || v === "confirm";
}

/** ตรวจว่าเวลาที่ผู้ใช้เลือกถูกกฎระบบหรือไม่ */
export function validateReservationTime(settings: AppSettings | null | undefined, dateTime: string) {
  if (!settings) {
    return { ok: false as const, msg: "ระบบกำลังโหลดการตั้งค่า กรุณาลองใหม่" };
  }
  if (settings.is_system_open === false) {
    return { ok: false as const, msg: "ขณะนี้ปิดการรับจองชั่วคราว" };
  }
  if (!dateTime) {
    return { ok: false as const, msg: "กรุณาเลือกวันและเวลา" };
  }

  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) {
    return { ok: false as const, msg: "วันและเวลาไม่ถูกต้อง" };
  }

  const now = new Date();
  if (d.getTime() < now.getTime()) {
    return { ok: false as const, msg: "เลือกวันเวลาในอนาคตเท่านั้น" };
  }

  // จำกัดจำนวนวันล่วงหน้า
  const daysAhead = settings.days_ahead ?? 30;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOf(d) - startOf(now)) / 86400000);
  if (diffDays > daysAhead) {
    return { ok: false as const, msg: `จองล่วงหน้าได้ไม่เกิน ${daysAhead} วัน` };
  }

  // อยู่ในช่วงเวลาเปิด-ปิดรายวัน
  const [oh, om] = (settings.open_time || "09:00").split(":").map(Number);
  const [ch, cm] = (settings.close_time || "21:00").split(":").map(Number);
  const hh = d.getHours() * 60 + d.getMinutes();
  const openMin = (oh ?? 9) * 60 + (om ?? 0);
  const closeMin = (ch ?? 21) * 60 + (cm ?? 0);
  if (hh < openMin || hh > closeMin) {
    return { ok: false as const, msg: `วันนี้เปิดให้จองระหว่าง ${settings.open_time ?? "09:00"} - ${settings.close_time ?? "21:00"}` };
  }

  return { ok: true as const };
}
