"use client";
import { memo } from "react";
import { normalizePaymentMethod, paymentMethodLabel } from "@/utils/status";
import { formatDisplayDate, formatTHB } from "./utils";

type PackageItem = { name: string; unitPrice: number; qty: number };
type Props = {
  payment: {
    method: string | null;
    total: number | null;
    paidAt: string | null;
    packageQty: number;
    packages: PackageItem[];
    alaItems: PackageItem[];
    pkgSubtotal: number;
    alaSubtotal: number;
  } | null;
  isPaid: boolean;
  showPkg: boolean;
  setShowPkg: (v: (b: boolean) => boolean) => void;
};

function PaidSummaryBase({ payment, isPaid, showPkg, setShowPkg }: Props) {
  if (!isPaid || !payment) return null;
  const alaQty = (payment.alaItems ?? []).reduce((s, it) => s + (it.qty ?? 0), 0);

  return (
    <>
      <section className="mt-4 mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">ช่องทางการชำระเงิน</p>
          <p className="mt-0.5 font-semibold text-emerald-900">
            {payment.method ? paymentMethodLabel(normalizePaymentMethod(payment.method)) : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-emerald-700">แพ็กเกจทั้งหมด</div>
            <button
              type="button"
              onClick={() => setShowPkg((v) => !v)}
              className="text-[11px] font-medium text-emerald-700 hover:underline"
            >
              ดูรายละเอียด
            </button>
          </div>
          <div className="mt-1">
            <div className="font-medium text-emerald-900">
              {(payment.packageQty ?? 0) + alaQty}
            </div>
            <div className="text-[11px] text-emerald-700/70">
              บุฟเฟต์ {payment.packageQty ?? 0} • เมนูเพิ่ม {alaQty}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">ราคารวม</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-900">
            {formatTHB(payment.total)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-700">เวลาชำระเงิน</p>
          <p className="mt-0.5 font-semibold text-emerald-900">
            {formatDisplayDate(payment.paidAt ?? null)}
          </p>
        </div>
      </section>

      {isPaid && payment && showPkg && (
        <div className="mt-5 md:mt-6 overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl text-sm">
            <thead>
              <tr className="bg-emerald-100/70 text-sm text-emerald-900">
                <th className="w-[45%] rounded-tl-xl px-4 py-2 text-left font-semibold">แพ็กเกจ</th>
                <th className="w-[20%] px-4 py-2 text-right font-semibold">ราคา/หน่วย</th>
                <th className="w-[15%] px-4 py-2 text-center font-semibold">จำนวน</th>
                <th className="w-[20%] rounded-tr-xl px-4 py-2 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {payment.packages.map((p, i) => (
                <tr key={`pkg-${i}`} className={i % 2 ? "bg-white" : "bg-emerald-50/30"}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-right">{formatTHB(p.unitPrice)}</td>
                  <td className="px-4 py-2 text-center">{p.qty}</td>
                  <td className="px-4 py-2 text-right">{formatTHB(p.unitPrice * p.qty)}</td>
                </tr>
              ))}

              <tr className="bg-white">
                <td className="px-4 py-2 text-right text-gray-600" colSpan={3}>รวมแพ็กเกจ</td>
                <td className="px-4 py-2 text-right font-medium">{formatTHB(payment.pkgSubtotal ?? 0)}</td>
              </tr>

              {Boolean(payment.alaItems?.length) && (
                <>
                  <tr>
                    <td className="px-4 pt-4 text-sm font-semibold text-emerald-900" colSpan={4}>เมนูเพิ่ม</td>
                  </tr>

                  {payment.alaItems.map((p, i) => (
                    <tr key={`ala-${i}`} className={i % 2 ? "bg-white" : "bg-emerald-50/30"}>
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 text-right">{formatTHB(p.unitPrice)}</td>
                      <td className="px-4 py-2 text-center">{p.qty}</td>
                      <td className="px-4 py-2 text-right">{formatTHB(p.unitPrice * p.qty)}</td>
                    </tr>
                  ))}

                  <tr className="bg-white">
                    <td className="px-4 py-2 text-right text-gray-600" colSpan={3}>รวมเมนูเพิ่ม</td>
                    <td className="px-4 py-2 text-right font-medium">{formatTHB(payment.alaSubtotal ?? 0)}</td>
                  </tr>
                </>
              )}

              <tr className="bg-emerald-600 text-white">
                <td className="rounded-bl-xl px-4 py-2 text-right font-semibold" colSpan={3}>รวมทั้งสิ้น</td>
                <td className="rounded-br-xl px-4 py-2 text-right text-base font-bold">
                  {formatTHB((payment.pkgSubtotal ?? 0) + (payment.alaSubtotal ?? 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default memo(PaidSummaryBase);
