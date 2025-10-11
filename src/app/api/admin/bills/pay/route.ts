/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseService";
export const runtime = "nodejs";
type AlaItem = { id?: string; name: string; qty: number; price: number };

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const reservationId: string = body?.reservationId;
    const rawMethod: string = body?.paymentMethod;

    const normalizePaymentMethod = (
      input: string | null | undefined
    ): "cash" | "card" | "qr" | "transfer" | "e-wallet" | null => {
      if (!input) return null;
      const v = String(input).trim().toLowerCase().replace(/\s/g, "").replace(/_/g, "-");
      if (["cash", "card", "qr", "transfer", "e-wallet"].includes(v)) return v as any;
      if (["ewallet", "wallet"].includes(v)) return "e-wallet";
      if (["promptpay", "qrpay", "qrcode"].includes(v)) return "qr";
      if (["credit", "debit", "creditcard", "debitcard"].includes(v)) return "card";
      return null;
    };

    const paymentMethod = normalizePaymentMethod(rawMethod);
    const selectedPackage: number | null = body?.selectedPackage ?? null;
    const people: number = Math.max(0, Number(body?.people ?? 0) || 0);
    const children: number = Math.max(0, Number(body?.children ?? 0) || 0);
    const childUnitReq: number = Math.max(0, Number(body?.childUnit ?? 0) || 0);

    const alaItems: AlaItem[] = Array.isArray(body?.alaItems) ? body.alaItems : [];

    if (!reservationId) return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
    if (!paymentMethod) return NextResponse.json({ error: "invalid paymentMethod" }, { status: 400 });

    // ------- คำนวณยอด -------
    const pkgUnit = Math.max(0, Number(selectedPackage ?? 0) || 0);
    const childUnit = childUnitReq > 0 ? childUnitReq : Math.round(pkgUnit / 2);

    const pkgAdultSubtotal = pkgUnit * people;
    const pkgChildSubtotal = childUnit * children;
    const pkgSubtotal = pkgAdultSubtotal + pkgChildSubtotal;

    const alaSubtotal = alaItems.reduce((s, it) => {
      const qty = Math.max(0, Number(it?.qty) || 0);
      const price = Math.max(0, Number(it?.price) || 0);
      return s + qty * price;
    }, 0);

    const total = pkgSubtotal + alaSubtotal;

    const supabase = createServiceClient();

    // upsert bills (หนึ่งบิลต่อ reservation)
    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .upsert(
        { reservation_id: reservationId, total, payment_method: paymentMethod, status: "paid" },
        { onConflict: "reservation_id" }
      )
      .select("*")
      .single();

    if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 });

    // ล้างรายการเก่าก่อน
    const { error: delErr } = await supabase.from("bill_items").delete().eq("bill_id", bill.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const items: any[] = [];

    if (pkgUnit > 0 && people > 0) {
      items.push({
        bill_id: bill.id,
        kind: "package",
        ref_id: null,
        name_snapshot: `Package ${pkgUnit}`,
        unit_price: pkgUnit,
        quantity: people,
        parent_item_id: null,
      });
    }

    if (childUnit > 0 && children > 0) {
      items.push({
        bill_id: bill.id,
        kind: "package",
        ref_id: null,
        name_snapshot: `Package (เด็ก) ${childUnit}`,
        unit_price: childUnit,
        quantity: children,
        parent_item_id: null,
      });
    }

    for (const it of alaItems) {
      items.push({
        bill_id: bill.id,
        kind: "item",
        ref_id:
          typeof it?.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(it.id)
            ? it.id
            : null,
        name_snapshot: String(it?.name ?? "Item"),
        unit_price: Math.max(0, Number(it?.price) || 0),
        quantity: Math.max(0, Number(it?.qty) || 0),
        parent_item_id: null,
      });
    }

    if (items.length > 0) {
      const { error: insertErr } = await supabase.from("bill_items").insert(items);
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // อัปเดตสถานะการจอง -> paid
    const { error: resErr } = await supabase.from("reservations").update({ status: "paid" }).eq("id", reservationId);
    if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

    // สำคัญ: "ปล่อยโต๊ะ" โดยตั้ง released_at (เก็บประวัติ ไม่ลบ)
    const { error: releaseErr } = await supabase
      .from("reservation_tables")
      .update({ released_at: new Date().toISOString() })
      .eq("reservation_id", reservationId)
      .is("released_at", null);

    if (releaseErr) {
      // ไม่ทำให้ fail การชำระ แต่บันทึก log
      console.error("[pay] release reservation_tables failed:", releaseErr.message);
    }

    return NextResponse.json(
      {
        bill: { id: bill.id, total, payment_method: bill.payment_method, status: bill.status },
        totals: { pkgAdultSubtotal, pkgChildSubtotal, pkgSubtotal, alaSubtotal, total },
        children: { count: children, unit: childUnit },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}
