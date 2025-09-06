"use client";
import { useEffect } from "react";

export default function Toast({
  type = "error",
  message,
  onClose,
}: {
  type?: "error" | "success" | "info";
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const tone =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : type === "info"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className="fixed right-4 top-4 z-[70]">
      <div className={`max-w-xs rounded-xl border px-4 py-3 text-sm shadow ${tone}`}>
        <div className="flex items-start gap-3">
          <div className="font-medium">
            {type === "error" ? "แจ้งเตือน" : type === "success" ? "สำเร็จ" : "ข้อมูล"}
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-0.5 text-xs hover:opacity-70"
            aria-label="ปิดแจ้งเตือน"
          >
            ปิด
          </button>
        </div>
        <div className="mt-1 leading-5">{message}</div>
      </div>
    </div>
  );
}
