"use client";
type Props = {
  dataset: "reservations" | "users";
  onChange: (v: "reservations" | "users") => void;
};
export default function DatasetTabs({ dataset, onChange }: Props) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-gray-300" role="tablist">
      {(["reservations", "users"] as const).map((key) => {
        const active = dataset === key;
        const label = key === "reservations" ? "การจอง" : "การใช้งานผู้ใช้";
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            role="tab"
            aria-selected={active}
            className={[
              "px-4 py-1.5 text-sm",
              active ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
