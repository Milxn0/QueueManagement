"use client";

import { Series } from "@/types/chart";
import React, { useMemo, useState } from "react";

export default function LinesChart({
  days,
  series,
  maxY,
  width = 920,
  height = 300,
}: {
  days: number;
  series: Series[];
  maxY: number;
  width?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = width;
  const H = height;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const x = (i: number) => pad.l + (iw * i) / (days - 1 || 1);
  const y = (v: number) => pad.t + ih - (ih * v) / (maxY || 1);

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

  const ticksY = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxY / 5));
    const out: number[] = [];
    for (let v = 0; v <= maxY; v += step) out.push(v);
    if (out[out.length - 1] !== maxY) out.push(maxY);
    return out;
  }, [maxY]);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const handleMove = (e: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - rect.left - pad.l;
    const i = Math.round((px / (iw || 1)) * (days - 1));
    if (i >= 0 && i < days) setHover(i);
  };

  const handleLeave = () => setHover(null);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]">
        {/* X grid */}
        {ticksX.map((d) => (
          <line
            key={`gx-${d}`}
            x1={x(d - 1)}
            x2={x(d - 1)}
            y1={pad.t}
            y2={pad.t + ih}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y grid + labels */}
        {ticksY.map((v) => (
          <g key={`gy-${v}`}>
            <line
              x1={pad.l}
              x2={pad.l + iw}
              y1={y(v)}
              y2={y(v)}
              stroke="#e5e7eb"
            />
            <text
              x={pad.l - 8}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X labels (day numbers) */}
        {ticksX.map((d) => (
          <text
            key={`xl-${d}`}
            x={x(d - 1)}
            y={pad.t + ih + 18}
            textAnchor="middle"
            fontSize="11"
            fill="#6b7280"
          >
            {d}
          </text>
        ))}

        {/* lines */}
        {series.map((s) => (
          <path
            key={s.name}
            d={toPath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
          />
        ))}

        {/* markers on hover */}
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={pad.t + ih}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
            {series.map((s, i) => (
              <circle
                key={`dot-${i}`}
                cx={x(hover)}
                cy={y(s.values[hover] ?? 0)}
                r={3.5}
                fill="#fff"
                stroke={s.color}
                strokeWidth={2}
              />
            ))}
          </>
        )}

        {/* capture area */}
        <rect
          x={pad.l}
          y={pad.t}
          width={iw}
          height={ih}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        />
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-gray-700">{s.name}</span>
          </div>
        ))}

        {hover !== null && (
          <div className="ml-auto rounded-xl border bg-white px-3 py-2 text-xs shadow-sm">
            <div className="font-semibold text-gray-800">
              วันที่ {hover + 1}
            </div>
            {series.map((s) => (
              <div key={`tt-${s.name}`} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-gray-700">{s.name}</span>
                <span className="ml-2 font-medium text-gray-900">
                  {s.values[hover] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
