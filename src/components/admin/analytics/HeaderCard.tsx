"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartSimple } from "@fortawesome/free-solid-svg-icons/faChartSimple";

export default function HeaderCard() {
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
            ภาพรวมข้อมูลการจองประจำวันที่เลือก
          </p>
        </div>
      </div>
    </div>
  );
}
