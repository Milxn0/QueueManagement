"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartSimple } from "@fortawesome/free-solid-svg-icons/faChartSimple";

type Props = {
  selectedMonth: string;
  onChangeMonth: (v: string) => void;
};
export default function HeaderCard({ selectedMonth, onChangeMonth }: Props) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60">
      <div className="flex items-start justify-between p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faChartSimple} />
            Analytics
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            สถิติของระบบ
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            เลือก “มุมมองข้อมูล”, เดือน, และพิมพ์ชื่อ
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <label className="text-xs text-gray-500">เดือน</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm bg-white"
            aria-label="เลือกเดือน"
          />
        </div>
      </div>
    </div>
  );
}
