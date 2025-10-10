"use client";

import React, { useMemo, useState } from "react";
import type { Series } from "@/types/chart";

export default function SimpleBars({
  days,
  series,
  maxY,
  width = 920,
  height = 300,
  onSelect,
}: {
  days: number;
  series: Series[];
  maxY: number;
  width?: number;
  height?: number;
  onSelect?: (index: number) => void;
}) {
  const margin = { top: 16, right: 16, bottom: 40, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const barValues = useMemo(() => {
  const pick = (re: RegExp) => series.find((s) => re.test(s.name))?.values;
  return (
    pick(/total|ทั้งหมด|รวม|reservations/i) ??
    pick(/all/i) ??
    (series[0]?.values ?? new Array<number>(days).fill(0))
  );
}, [days, series]);

  const x = (i: number) =>
    margin.left + (i * innerW) / days + innerW / days / 2;
  const y = (v: number) =>
    margin.top + innerH - (Math.min(v, maxY) * innerH) / scaleMax;

  const barW = Math.max(4, innerW / days - 6);
  const ticksX = useMemo(() => {
    const arr = [
      1,
      Math.ceil(days / 4),
      Math.ceil(days / 2),
      Math.ceil((3 * days) / 4),
      days,
    ];
    return Array.from(new Set(arr)).filter((n) => n >= 1 && n <= days);
  }, [days]);

  const pickTop = (v: number) => {
    if (v <= 1) return 1;
    if (v <= 3) return 3;
    if (v <= 5) return 5;
    if (v <= 7) return 7;
    if (v <= 10) return 10;
    return Math.ceil(v / 10) * 10;
  };
  const scaleMax = pickTop(Math.max(0, maxY));
  const ticksY = useMemo(() => {
    const base = [0, 1, 3, 5, 7, 10];
    const majors: number[] = [];
    if (scaleMax > 10) {
      for (let t = 10; t <= scaleMax; t += 10) majors.push(t);
    }
    const merged = Array.from(
      new Set([...base.filter((n) => n <= scaleMax), ...majors])
    );
    return merged.sort((a, b) => a - b);
  }, [scaleMax]);

  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        <g>
          {ticksY.map((v, idx) => (
            <g key={idx}>
              <line
                x1={margin.left}
                x2={margin.left + innerW}
                y1={y(v)}
                y2={y(v)}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
              <text
                x={margin.left - 8}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-gray-500 text-[10px]"
              >
                {v}
              </text>
            </g>
          ))}
          <line
            x1={margin.left}
            x2={margin.left + innerW}
            y1={margin.top + innerH}
            y2={margin.top + innerH}
            stroke="#9ca3af"
          />
          {ticksX.map((d, idx) => (
            <text
              key={idx}
              x={x(d - 1)}
              y={margin.top + innerH + 16}
              textAnchor="middle"
              className="fill-gray-500 text-[10px]"
            >
              {d}
            </text>
          ))}
        </g>

        {/* แท่งรวมต่อวัน */}
        <g>
          {barValues.map((v, i) => {
            const cx = x(i);
            const yTop = y(v);
            const h = margin.top + innerH - yTop;
            return (
              <rect
                key={i}
                x={cx - barW / 2}
                y={yTop}
                width={barW}
                height={h}
                rx={3}
                fill="#6366f1"
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(i)}
              />
            );
          })}
        </g>
        <text
          x={margin.left + innerW / 2}
          y={margin.top + innerH + 32}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          วันที่
        </text>
        <text
          x={12}
          y={margin.top + innerH / 2}
          transform={`rotate(-90, 12, ${margin.top + innerH / 2})`}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          อัตราการจอง
        </text>
      </svg>

      {/* Tooltip */}
      {hover !== null && hover >= 0 && hover < barValues.length && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${((hover + 0.5) / days) * 100}%`,
            top: 0,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="font-medium text-gray-900">วันที่ {hover + 1}</div>
          <div className="text-gray-600">รวม {barValues[hover] ?? 0}</div>
        </div>
      )}
    </div>
  );
}
