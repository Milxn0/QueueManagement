import * as XLSX from "xlsx";
import { makeRangeISO } from "@/utils/date";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExportMode } from "@/types/analytics";

export async function exportReservationsXLSX(
    supabase: SupabaseClient,
    m: ExportMode,
    d: string,
    mo: string,
    y: string,
    setExporting?: (v: boolean) => void
) {
    const { start, end, label } = makeRangeISO(m, d, mo, y);
    setExporting?.(true);

    try {
        const { data, error } = await supabase
            .from("reservations")
            .select(`*, user:users!reservations_user_id_fkey(name, phone, email)`)
            .gte("reservation_datetime", start)
            .lte("reservation_datetime", end)
            .order("reservation_datetime", { ascending: true });

        if (error) {
            alert(`ไม่สามารถส่งออกได้: ${error.message}`);
            return;
        }

        const list = data ?? [];
        if (!list.length) {
            alert("ไม่มีข้อมูลในช่วงเวลาที่เลือก");
            return;
        }

        //สร้างแถวข้อมูล (พร้อมชื่อคอลัมน์ภาษาไทย)
        const rows = list.map((r, index) => ({
            "ลำดับ": index + 1,
            "ID": r.id,
            "รหัสคิว": r.queue_code,
            "วันที่ / เวลา จอง": new Date(r.reservation_datetime).toLocaleString("th-TH"),
            "สถานะ": r.status,
            "จำนวนคน": r.partysize,
            "รหัสผู้ใช้ (user_id)": r.user_id,
            "ชื่อผู้จอง": r.user?.name ?? "",
            "เบอร์โทรศัพท์": r.user?.phone ?? "",
            "อีเมล": r.user?.email ?? "",
            "โต๊ะ (table_id)": r.table_id,
            "ยกเลิกโดย (cancelled_by_user_id)": r.cancelled_by_user_id,
            "เวลาที่ยกเลิก (cancelled_at)": r.cancelled_at
                ? new Date(r.cancelled_at).toLocaleString("th-TH")
                : "",
            "เหตุผลการยกเลิก": r.cancelled_reason ?? "",
            "หมายเหตุ": r.comment ?? "",
            "แจ้งเตือนก่อน 15 นาที (reminded_15m_at)": r.reminded_15m_at
                ? new Date(r.reminded_15m_at).toLocaleString("th-TH")
                : "",
            "วันที่สร้างรายการ": new Date(r.created_at).toLocaleString("th-TH"),
        }));

        //สร้าง Worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows);
        //ตั้งค่าให้ข้อความในเซลล์ขึ้นบรรทัดใหม่อัตโนมัติ
        // for (const cell in worksheet) {
        //     if (cell[0] === "!") continue;
        //     worksheet[cell].s = { alignment: { wrapText: true, vertical: "top" } };
        // }

        //จัดขนาดคอลัมน์ให้อัตโนมัติ
        const colWidths = Object.keys(rows[0]).map((key) => ({
            wch: Math.max(12, key.length + 4),
        }));
        worksheet["!cols"] = colWidths;

        //เพิ่ม style ให้หัวตาราง
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!worksheet[cellRef]) continue;
            worksheet[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4F81BD" } }, // ฟ้าเข้ม
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
            };
        }

        //สร้าง Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations");

        //เขียนและดาวน์โหลดไฟล์
        const wbout = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
            cellStyles: true, //ต้องเปิดเพื่อให้ style ทำงาน
        });

        const blob = new Blob([wbout], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `รายงานการจอง_${label}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } finally {
        setExporting?.(false);
    }
}
