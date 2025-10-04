"use client";

import React from "react";
import { statusClass } from "@/utils/status"; 

export default function ReservationStatusBadge({ status }: { status: string }) {
  const cls = statusClass(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
