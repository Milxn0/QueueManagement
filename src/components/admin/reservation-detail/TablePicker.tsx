/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { memo, useMemo } from "react";
import type { OccupiedItem } from "@/types/reservationdetail";
import { showOccCode } from "./utils";

type Props = {
  tableNos: number[];
  tableCaps: Map<number, number>;
  picked: number[];
  setPicked: (updater: (arr: number[]) => number[]) => void;
  around: OccupiedItem[];
  myAssignedNos: number[];
  row: any;
  requiredSeats: number;
};

function TablePickerBase({
  tableNos,
  tableCaps,
  picked,
  setPicked,
  around,
  myAssignedNos,
  row,
}: Props) {
  const occByTable = useMemo(() => {
    const m = new Map<number, OccupiedItem>();
    (around ?? []).forEach((o) => m.set(o.tableNo, o));
    return m;
  }, [around]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {tableNos.map((no) => {
        const occ = occByTable.get(no);
        const cap = tableCaps.get(no) ?? null;
        const allowed = cap != null ? cap + 2 : null;

        const isMine =
          !!occ &&
          ((occ as any)?.reservationId === row.id ||
            (occ as any)?.queue_code === row.queue_code);

        const isOthers = !!occ && !isMine;
        const isPicked = picked.includes(no);
        const baseClass =
          "rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2";
        const stateClass = isOthers
          ? "border-rose-300 bg-rose-50 text-rose-700 opacity-60 cursor-not-allowed"
          : isPicked
          ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-indigo-200"
          : myAssignedNos.includes(no)
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white hover:bg-slate-50";

        return (
          <button
            key={no}
            onClick={() =>
              setPicked((arr) =>
                arr.length === 1 && arr[0] === no ? [] : [no]
              )
            }
            disabled={isOthers}
            className={[baseClass, stateClass].join(" ")}
            title={
              myAssignedNos.includes(no)
                ? `โต๊ะปัจจุบัน ${row.queue_code ?? ""}`
                : isOthers
                ? `โต๊ะของ ${showOccCode(occ)}`
                : isPicked
                ? "กำลังเลือก"
                : "ว่าง"
            }
            aria-pressed={isPicked}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">โต๊ะ {no}</div>
              {isPicked && (
                <span className="text-[10px] font-medium text-indigo-700">
                  เลือกแล้ว
                </span>
              )}
            </div>
            <div className="text-[11px]">
              {myAssignedNos.includes(no)
                ? `โต๊ะปัจจุบัน ${row.queue_code ?? ""}`
                : isOthers
                ? `โต๊ะของ ${showOccCode(occ)}`
                : isPicked
                ? "กำลังเลือก"
                : "ว่าง"}
            </div>
            {cap != null && (
              <div className="mt-0.5 text-[10px] text-slate-500">
                ความจุ {cap} • (สูงสุด {allowed})
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(TablePickerBase);
