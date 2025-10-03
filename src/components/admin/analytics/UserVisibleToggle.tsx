"use client";
type VisibleKey = "all" | "customer" | "staff";
type Props = {
  visible: VisibleKey[];
  onToggle: (k: VisibleKey) => void;
};
export default function UserVisibleToggle({ visible, onToggle }: Props) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-gray-300">
      {(["all", "customer", "staff"] as const).map((k) => {
        const active = visible.includes(k);
        const label = k === "all" ? "ทั้งหมด" : k === "customer" ? "ลูกค้า" : "พนักงาน";
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            className={[
              "px-3 py-1 text-sm",
              active ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
