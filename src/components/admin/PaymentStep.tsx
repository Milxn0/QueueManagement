/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faUsers,
  faBowlFood,
  faArrowLeft,
  faFloppyDisk,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";

export type AlaItem = { id: string; name: string; qty: number; price: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (payload: {
    selectedPackage: number | null;
    people: number;
    alaItems: AlaItem[];
    totals: { pkg: number; ala: number; sum: number };
  }) => void;
  /** รายการแพ็กเกจที่ให้เลือก */
  packages?: number[];
  /** จำนวนคนเริ่มต้น (sync ทุกครั้งที่ modal เปิดใหม่) */
  peopleInitial?: number;
  /** สถานะยุ่ง/กำลังทำงาน */
  busy?: boolean;
  /** อัพเดตจำนวนคนลง DB (กด “บันทึกจำนวน” จะเรียก) */
  onUpdatePeople?: (newPeople: number) => Promise<void>;
  /** ให้โมดัลแม่ refresh ข้อมูลหลังอัพเดต (เช่นจำนวนคน) */
  onRefresh?: () => Promise<void> | void;

  /** ค่าเริ่มต้น (optional) – ถ้ามีการแก้ไขแล้วเปิดมาใหม่จะเติมให้ */
  initialSelectedPackage?: number | null;
  initialAlaItems?: AlaItem[];
};

const currency = (n: number) => n.toLocaleString("th-TH") + " บาท";

/** ป้องกัน scroll เปลี่ยนค่าตัวเลขโดยไม่ตั้งใจ */
const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) =>
  (e.target as HTMLInputElement).blur();

/** สุ่ม id สั้น ๆ สำหรับรายการ Ala cart */
const rid = () => Math.random().toString(36).slice(2, 8);

export default function PaymentStep({
  open,
  onClose,
  onSaved,
  packages = [399, 599, 799],
  peopleInitial = 1,
  busy = false,
  onUpdatePeople,
  onRefresh,
  initialSelectedPackage = null,
  initialAlaItems,
}: Props) {
  // ---------- local states ----------
  const [selectedPackage, setSelectedPackage] = useState<number | null>(
    initialSelectedPackage
  );

  const [people, setPeople] = useState<number>(
    Number.isFinite(peopleInitial) && peopleInitial > 0 ? peopleInitial : 1
  );
  const [editingPeople, setEditingPeople] = useState(false);
  const [savingPeople, setSavingPeople] = useState(false);

  const [alaItems, setAlaItems] = useState<AlaItem[]>(initialAlaItems ?? []);
  const [addingAla, setAddingAla] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  // sync เมื่อ modal เปิดรอบใหม่
  useEffect(() => {
    if (!open) return;
    setSelectedPackage(initialSelectedPackage ?? null);
    setAlaItems(initialAlaItems ?? []);
    setPeople(peopleInitial > 0 ? peopleInitial : 1);
    setEditingPeople(false);
    setAddingAla(false);
    setNewName("");
    setNewPrice("");
    setError(null);
  }, [open, peopleInitial, initialAlaItems, initialSelectedPackage]);

  // focus ชื่อเมนูทันทีเมื่อกด “เพิ่มเมนู”
  useEffect(() => {
    if (addingAla) nameInputRef.current?.focus();
  }, [addingAla]);

  const totals = useMemo(() => {
    const pkg = (selectedPackage ?? 0) * (people || 0);
    const ala = (alaItems ?? []).reduce((s, i) => s + i.price * i.qty, 0);
    return { pkg, ala, sum: pkg + ala };
  }, [selectedPackage, people, alaItems]);

  if (!open) return null;

  // ---------- handlers ----------
  const togglePackage = (pk: number) =>
    setSelectedPackage((prev) => (prev === pk ? null : pk));

  const handleSavePeople = async () => {
    const normalized = Math.max(1, Number(people) || 1);
    setPeople(normalized);
    setError(null);

    if (!onUpdatePeople) {
      setEditingPeople(false);
      return;
    }
    try {
      setSavingPeople(true);
      await onUpdatePeople(normalized);
      await onRefresh?.();
      setEditingPeople(false);
    } catch (e: any) {
      setError(e?.message || "บันทึกจำนวนคนไม่สำเร็จ");
    } finally {
      setSavingPeople(false);
    }
  };

  const addAlaItem = () => {
    const name = newName.trim();
    const priceNum =
      typeof newPrice === "string" ? Number(newPrice) : Number(newPrice);

    if (!name) return setError("กรุณาระบุชื่อเมนู Ala cart");
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setError("กรุณาระบุราคาให้ถูกต้อง (> 0)");

    setAlaItems((arr) => [
      { id: rid(), name, qty: 1, price: priceNum },
      ...arr,
    ]);
    setNewName("");
    setNewPrice("");
    setAddingAla(false);
    setError(null);
  };

  const removeAlaItem = (id: string) =>
    setAlaItems((arr) => arr.filter((i) => i.id !== id));

  const onSubmit = () => {
    setError(null);
    if (!selectedPackage && alaItems.length === 0) {
      setError("กรุณาเลือกแพ็กเกจอย่างน้อย 1 อย่าง หรือเพิ่มเมนู Ala cart");
      return;
    }
    onSaved({ selectedPackage, people, alaItems, totals });
  };

  // ---------- UI ----------
  return (
    <div className="mt-5 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/30">
      {/* Header (sticky) */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FontAwesomeIcon icon={faMoneyBillWave} />
            ชำระเงิน
          </div>
          <div className="text-[11px] opacity-90">
            เลือกแพ็กเกจและเพิ่มเมนู Ala cart
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {/* Packages */}
        <section className="mb-5">
          <label className="mb-2 block text-xs font-medium text-gray-700">
            แพ็กเกจ
          </label>
          <div className="flex flex-wrap gap-2">
            {packages.map((pk) => {
              const active = selectedPackage === pk;
              return (
                <button
                  key={pk}
                  type="button"
                  onClick={() => togglePackage(pk)}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-medium transition border focus:outline-none focus:ring-2 focus:ring-indigo-300",
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50",
                  ].join(" ")}
                  aria-pressed={active}
                  aria-label={`เลือกแพ็กเกจ ${pk.toLocaleString()} บาท`}
                >
                  {pk.toLocaleString()} บาท
                </button>
              );
            })}
          </div>

          {/* People */}
          <div className="mt-4 grid gap-2 sm:grid-cols-[auto,1fr] sm:items-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-700">
              <FontAwesomeIcon icon={faUsers} />
              <span>จำนวนคน</span>
            </div>

            {!editingPeople ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-lg bg-white px-3 py-1 font-medium ring-1 ring-gray-200">
                  {people} คน
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPeople(true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  แก้ไขจำนวนคน
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  onWheel={preventNumberScroll}
                  className="h-10 w-28 rounded-lg border px-3 text-sm"
                  value={people}
                  onChange={(e) =>
                    setPeople(Math.max(1, Number(e.target.value) || 1))
                  }
                  aria-label="จำนวนคน"
                />
                <button
                  type="button"
                  onClick={handleSavePeople}
                  disabled={savingPeople}
                  className="h-10 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingPeople ? (
                    "กำลังบันทึก..."
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <FontAwesomeIcon icon={faFloppyDisk} />
                      บันทึก
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeople(peopleInitial > 0 ? peopleInitial : 1);
                    setEditingPeople(false);
                  }}
                  disabled={savingPeople}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Ala cart */}
        <section className="mb-5">
          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-700">
            <FontAwesomeIcon icon={faBowlFood} />
            เมนู Ala cart
          </label>

          {!addingAla ? (
            <button
              type="button"
              onClick={() => setAddingAla(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <FontAwesomeIcon icon={faPlus} />
              เพิ่มเมนู Ala cart
            </button>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                addAlaItem();
              }}
            >
              <input
                ref={nameInputRef}
                className="h-10 flex-1 rounded-lg border px-3 text-sm"
                placeholder="ชื่อเมนู"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                aria-label="ชื่อเมนู Ala cart"
              />
              <div className="relative w-full sm:w-60">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  ฿
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  onWheel={preventNumberScroll}
                  className="h-10 w-full rounded-lg border pl-7 pr-3 text-sm"
                  placeholder="ราคา (รวม)"
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(
                      Math.max(0, Number(e.target.value) || 0) as number
                    )
                  }
                  aria-label="ราคาสุทธิ"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName("");
                    setNewPrice("");
                    setAddingAla(false);
                    setError(null);
                  }}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          )}

          {alaItems.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border bg-white p-3">
              <div className="mb-2 text-xs text-gray-600">รายการที่เลือก</div>
              <ul className="space-y-2 text-sm">
                {alaItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{it.name}</span>{" "}
                      <span className="text-gray-700">
                        — {it.qty} × {currency(it.price)} ={" "}
                        {currency(it.qty * it.price)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAlaItem(it.id)}
                      className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      aria-label={`ลบ ${it.name}`}
                      title="ลบรายการ"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="mb-4 rounded-xl border bg-white p-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">แพ็กเกจที่เลือก</span>
              <span className="font-medium">
                {selectedPackage
                  ? `${selectedPackage.toLocaleString()} บาท`
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">รวมแพ็กเกจ</span>
              <span className="font-semibold text-indigo-700">
                {selectedPackage
                  ? `${selectedPackage.toLocaleString()} × ${people} คน = ${(
                      (selectedPackage ?? 0) * people
                    ).toLocaleString()} บาท`
                  : "0 บาท"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Ala cart</span>
              <span className="font-medium">{currency(totals.ala)}</span>
            </div>
            <hr className="my-1" />
            <div className="flex items-center justify-between">
              <span className="font-medium">รวมทั้งสิ้น</span>
              <span className="font-bold text-indigo-700">
                {currency(totals.sum)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer (sticky) */}
      <div className="sticky bottom-0 flex flex-none justify-end gap-2 border-t bg-white/70 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
          disabled={busy}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          disabled={busy || (!selectedPackage && alaItems.length === 0)}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} />
          บันทึกการชำระเงิน
        </button>
      </div>
    </div>
  );
}
