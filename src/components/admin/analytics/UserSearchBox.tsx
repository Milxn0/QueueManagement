"use client";
type Props = {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder?: string;
};
export default function UserSearchBox({ value, onChange, onClear, placeholder }: Props) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "พิมพ์ชื่อ/อีเมล/เบอร์ (เว้นว่าง = แสดงรวม)"}
        className="input input-bordered rounded-2xl px-4 py-2 w-72 pr-10"
      />
      {!!value && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="ล้างคำค้น"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
