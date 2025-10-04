"use client";

import React from "react";

type StatCardProps = {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
};

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  className = "",
  onClick,
  isActive = false,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full text-left rounded-2xl border bg-white shadow-sm p-4 md:p-6 transition",
        isActive ? "ring-2 ring-indigo-400 border-indigo-200" : "hover:shadow",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {icon ? <div className="text-xl">{icon}</div> : null}
        <div className="text-sm opacity-70">{label}</div>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {subtext ? (
        <div className="mt-1 text-xs opacity-60">{subtext}</div>
      ) : null}
    </button>
  );
}
