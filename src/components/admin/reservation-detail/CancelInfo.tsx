"use client";
import { TH_TZ } from "./utils";

function fmtTH(iso?: string | null) {
  return !iso
    ? "—"
    : new Date(iso).toLocaleString("th-TH", {
        timeZone: TH_TZ,
        dateStyle: "medium",
        timeStyle: "short",
      });
}

type Props = {
  visible: boolean;
  autoId: string;
  cancelledByUserId?: string | null;
  cancelledBy?: { name: string | null; role: string | null } | null;
  cancelledReason?: string | null;
  cancelledAt?: string | null;
  rowCancelledByRole?: string | null;
  rowCancelledByName?: string | null;
};

export default function CancelInfo({
  visible,
  autoId,
  cancelledByUserId,
  cancelledBy,
  cancelledReason,
  cancelledAt,
  rowCancelledByRole,
  rowCancelledByName,
}: Props) {
  if (!visible) return null;

  const isAuto = cancelledByUserId === autoId;

  return (
    <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900">
      <div className="mb-3 text-sm font-semibold">ข้อมูลการยกเลิก</div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-red-700">บทบาทผู้ยกเลิก:</span>{" "}
          <span className="font-medium">
            {isAuto ? "ระบบอัตโนมัติ" : cancelledBy?.role ?? rowCancelledByRole ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-red-700">ชื่อผู้ยกเลิก:</span>{" "}
          <span className="font-medium">
            {isAuto ? "ระบบอัตโนมัติ" : cancelledBy?.name ?? rowCancelledByName ?? "—"}
          </span>
        </div>
        <div>
          <span className="text-red-700">สาเหตุ: </span>
          <span className="font-medium">{cancelledReason ?? "—"}</span>
        </div>
        <div>
          <span className="text-red-700">ยกเลิกเมื่อ: </span>
          <span className="font-medium">{fmtTH(cancelledAt)}</span>
        </div>
      </div>
    </div>
  );
}
