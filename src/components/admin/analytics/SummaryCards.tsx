"use client";

type Props = {
  total: number;
  paid: number;
  cancelled: number;
};

export default function SummaryCards({ total, paid, cancelled }: Props) {
  const Item = ({
    title,
    value,
    subtitle,
    ring,
    text,
  }: {
    title: string;
    value: number;
    subtitle: string;
    ring: string;
    text: string;
  }) => (
    <div
      className={[
        "rounded-2xl border bg-white p-4 shadow-sm",
        "ring-1",
        ring,
      ].join(" ")}
    >
      <div className={["text-sm font-semibold", text].join(" ")}>{title}</div>
      <div className={`mt-2 text-3xl font-bold ${text}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Item
        title="Total Queue"
        value={total}
        subtitle="ยอดรวมทั้งหมดของเดือนนี้"
        ring="ring-indigo-200"
        text="text-indigo-700"
      />
      <Item
        title="Paid"
        value={paid}
        subtitle="ชำระเงินแล้ว"
        ring="ring-emerald-200"
        text="text-emerald-700"
      />
      <Item
        title="Cancelled"
        value={cancelled}
        subtitle="ยกเลิก"
        ring="ring-rose-200"
        text="text-rose-700"
      />
    </div>
  );
}
