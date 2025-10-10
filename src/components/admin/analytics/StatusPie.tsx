"use client";

import React from "react";

type Props = {
  paid: number;
  cancel: number;
  size?: number;
  thickness?: number;
};

export default function StatusPie({
  paid,
  cancel,
  size = 240,
  thickness = 28,
}: Props) {
  const total = Math.max(0, paid) + Math.max(0, cancel);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;

  const pct = (v: number) => (total === 0 ? 0 : v / total);
  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcPath = (v: number, start: number) => {
    const fraction = pct(v);
    const end = start + 2 * Math.PI * fraction;
    const p1 = toXY(start);
    const p2 = toXY(end);
    const large = fraction > 0.5 ? 1 : 0;
    const d = [
      `M ${p1.x} ${p1.y}`,
      `A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`,
      `L ${cx} ${cy}`,
      "Z",
    ].join(" ");
    return { d, end };
  };

  const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);

  const GREEN = "#22c55e";
  const RED = "#ef4444";
  const GRID = "#e5e7eb";

  if (total === 0) {
    return (
      <div className="flex items-center gap-6">
        <svg width={size} height={size} className="shrink-0">
          <circle cx={cx} cy={cy} r={r} fill={GRID} />
          <circle cx={cx} cy={cy} r={r - thickness} fill="#fff" />
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-gray-900 text-sm font-semibold"
          >
            ทั้งหมด 0
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-gray-500 text-xs"
          >
            paid 0 · cancel 0
          </text>
        </svg>
        <Legend paid={paid} cancel={cancel} />
      </div>
    );
  }

  const onlyPaid = paid > 0 && cancel === 0;
  const onlyCancel = cancel > 0 && paid === 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {onlyPaid ? (
          <circle cx={cx} cy={cy} r={r} fill={GREEN} />
        ) : onlyCancel ? (
          <circle cx={cx} cy={cy} r={r} fill={RED} />
        ) : (
          (() => {
            const start0 = -Math.PI / 2;
            const paidArc = arcPath(paid, start0);
            const cancelArc = arcPath(cancel, paidArc.end);
            return (
              <>
                <path d={paidArc.d} fill={GREEN} />
                <path d={cancelArc.d} fill={RED} />
              </>
            );
          })()
        )}

        <circle cx={cx} cy={cy} r={r - thickness} fill="#fff" />

        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-gray-900 text-sm font-semibold"
        >
          ทั้งหมด {fmt(total)}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-gray-500 text-xs"
        >
          paid {fmt(paid)} · cancel {fmt(cancel)}
        </text>
      </svg>

      <Legend paid={paid} cancel={cancel} />
    </div>
  );
}

function Legend({ paid, cancel }: { paid: number; cancel: number }) {
  const total = Math.max(0, paid) + Math.max(0, cancel);
  const pct = (v: number) => (total === 0 ? 0 : (v / total) * 100);

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ background: "#22c55e" }}
        />
        <span className="text-gray-700">paid</span>
        <span className="ml-2 font-medium text-gray-900">
          {new Intl.NumberFormat("th-TH").format(paid)}
        </span>
        {total > 0 && (
          <span className="ml-2 text-gray-500">({pct(paid).toFixed(1)}%)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ background: "#ef4444" }}
        />
        <span className="text-gray-700">cancel</span>
        <span className="ml-2 font-medium text-gray-900">
          {new Intl.NumberFormat("th-TH").format(cancel)}
        </span>
        {total > 0 && (
          <span className="ml-2 text-gray-500">
            ({pct(cancel).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}
