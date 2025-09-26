"use client";

import type { StatusKey } from "@/types/filters";
import { STATUSKEY } from "@/utils/filters";
import { useRouter, useSearchParams } from "next/navigation";

export default function StatusFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = (sp.get("status") || "") as StatusKey | "";

  const setStatus = (val: StatusKey | "") => {
    const qs = new URLSearchParams(sp.toString());
    if (!val) qs.delete("status");
    else qs.set("status", val);
    router.push(`?${qs.toString()}`);
  };
  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
        <button
          onClick={() => setStatus("")}
          aria-pressed={current === ""}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ring-1 transition
          ${
            current === ""
              ? "bg-indigo-600 text-white ring-indigo-600 shadow-sm"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          ทั้งหมด
        </button>

        {STATUSKEY.map(({ key, label }) => {
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => setStatus(key)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ring-1 transition
              ${
                active
                  ? "bg-indigo-600 text-white ring-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
