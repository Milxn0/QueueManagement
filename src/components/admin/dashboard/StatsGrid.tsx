"use client";

import React from "react";
import StatCard from "./StatCard";
import type { StatusKey } from "@/types/filters";

type StatItem = {
  label: string;
  value: number;
  subtext?: string;
  icon?: React.ReactNode;
  className?: string;
  key?: StatusKey | "";
};

type StatsGridProps = {
  items: StatItem[];
  currentKey?: StatusKey | "";
  onSelect?: (key: StatusKey | "") => void;
};

export default function StatsGrid({
  items,
  currentKey,
  onSelect,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((it, idx) => {
        const { key: statKey, ...rest } = it;
        const reactKey =
          statKey && String(statKey).length > 0 ? String(statKey) : String(idx);

        const handleClick = () => onSelect?.(statKey ?? "");

        return (
          <div key={reactKey} data-key={statKey ?? ""}>
            <StatCard
              {...rest}
              isActive={statKey === currentKey}
              onClick={handleClick}
            />
          </div>
        );
      })}
    </div>
  );
}
