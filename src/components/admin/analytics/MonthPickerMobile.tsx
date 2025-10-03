"use client";
type Props = { value: string; onChange: (v: string) => void };
export default function MonthPickerMobile({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <label className="text-sm text-gray-600">เดือน</label>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2 text-sm"
      />
    </div>
  );
}
