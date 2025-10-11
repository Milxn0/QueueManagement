import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ExcelJS from "exceljs";
export const runtime = "nodejs";
// === Helper: คำนวณช่วงเวลา ===
function getRange(range: "today" | "month") {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (range === "today") {
    const start = new Date(y, m, now.getDate(), 0, 0, 0, 0);
    const end = new Date(y, m, now.getDate(), 23, 59, 59, 999);
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      label: "today",
    };
  } else {
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999); // วันสุดท้ายของเดือนนี้
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      label: "month",
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rangeParam = (searchParams.get("range") ?? "today") as
      | "today"
      | "month";

    // default: ไม่นับ cancelled, no_show
    const includeStatusesParam = searchParams
      .get("include")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const includeStatuses = includeStatusesParam ?? [
      "waiting",
      "confirmed",
      "seated",
      "paid",
    ];

    // === Supabase server client ที่ถูกต้องสำหรับ Route/Server ===
    const cookieStore = await cookies(); // ✅ ต้อง await

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
        },
      }
    );

    const { startISO, endISO, label } = getRange(rangeParam);

    // === Query ข้อมูลในช่วงเวลาที่เลือก ===
    let query = supabase
      .from("reservations")
      .select(
        "id,user_id,reservation_datetime,partysize,queue_code,status,created_at,table_id"
      )
      .gte("reservation_datetime", startISO)
      .lte("reservation_datetime", endISO)
      .order("reservation_datetime", { ascending: true });

    if (includeStatuses && includeStatuses.length > 0) {
      query = query.in("status", includeStatuses);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error(error);
      return new Response("Query error", { status: 500 });
    }

    // === ทำไฟล์ Excel ===
    const wb = new ExcelJS.Workbook();
    wb.creator = "Seoul BBQ Queue System";
    wb.created = new Date();

    // Sheet 1: รายการจอง
    const ws = wb.addWorksheet("Reservations");
    ws.columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "วัน-เวลา", key: "reservation_datetime", width: 22 },
      { header: "จำนวนที่นั่ง", key: "partysize", width: 14 },
      { header: "คิว/โต๊ะ", key: "queue_code", width: 14 },
      { header: "สถานะ", key: "status", width: 14 },
      { header: "ผู้ใช้ (user_id)", key: "user_id", width: 22 },
      { header: "Table ID", key: "table_id", width: 12 },
      { header: "สร้างเมื่อ", key: "created_at", width: 22 },
    ];

    let totalCustomers = 0;

    (rows ?? []).forEach((r) => {
      const size = Number(r.partysize ?? 0) || 0;
      totalCustomers += size;
      ws.addRow({
        id: r.id,
        reservation_datetime: r.reservation_datetime,
        partysize: size,
        queue_code: r.queue_code,
        status: r.status,
        user_id: r.user_id,
        table_id: r.table_id,
        created_at: r.created_at,
      });
    });

    // Sheet 2: Summary
    const sum = wb.addWorksheet("Summary");
    sum.addRow(["ช่วงเวลา", label === "today" ? "วันนี้" : "เดือนนี้"]);
    sum.addRow(["จำนวนรายการจอง", rows?.length ?? 0]);
    sum.addRow(["จำนวนลูกค้ารวม (partysize)", totalCustomers]);
    sum.addRow(["นับเฉพาะสถานะ", includeStatuses.join(", ")]);

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `reservations_${label}_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}
