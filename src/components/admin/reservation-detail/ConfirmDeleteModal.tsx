/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { fallbackName } from "./utils";

type Props = {
  open: boolean;
  row: any;
  delBusy: boolean;
  delErr: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

function ConfirmDeleteModalBase({
  open,
  row,
  delBusy,
  delErr,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-rose-100">
        <div className="flex items-start gap-3 border-b bg-rose-50 px-5 py-4">
          <div className="mt-1 rounded-full bg-rose-100 p-2 text-rose-700">
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-rose-800">
              ยืนยันการลบการจอง
            </h4>
            <p className="mt-0.5 text-xs text-rose-700/80">
              การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด และไม่สามารถกู้คืนได้
            </p>
          </div>
        </div>

        <div className="px-5 py-4 text-sm">
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-rose-900">
            <div>
              <span className="text-rose-700">รหัสคิว:</span>{" "}
              <span className="font-semibold">{row.queue_code ?? "—"}</span>
            </div>
            <div className="text-[12px] text-rose-700/70">ชื่อ: {fallbackName(row) ?? "—"}</div>
          </div>

          {delErr && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {delErr}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            disabled={delBusy}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            disabled={delBusy}
          >
            {delBusy ? "กำลังลบ..." : "ลบเลย"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ConfirmDeleteModalBase);
