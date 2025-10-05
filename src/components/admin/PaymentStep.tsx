/* eslint-disable @typescript-eslint/no-unused-vars */
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
  faMoneyBillWave,
  faChild,
} from "@fortawesome/free-solid-svg-icons";

export type AlaItem = { id: string; name: string; qty: number; price: number };

type Props = {
  reservationId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (payload: {
    paymentMethod: "cash" | "card" | "qr" | "transfer" | "e-wallet" | null;
    selectedPackage: number | null;
    people: number; // ผู้ใหญ่
    alaItems: AlaItem[];
    totals: { pkg: number; ala: number; sum: number };
    children: number;
    childUnit: number;
  }) => void;
  packages?: number[];
  peopleInitial?: number;
  busy?: boolean;
  onUpdatePeople?: (newPeople: number) => Promise<void>;
  onRefresh?: () => Promise<void> | void;

  initialSelectedPackage?: number | null;
  initialAlaItems?: AlaItem[];
};

const currency = (n: number) => n.toLocaleString("th-TH") + " บาท";
const preventNumberScroll = (e: React.WheelEvent<HTMLInputElement>) =>
  (e.target as HTMLInputElement).blur();
const rid = () => Math.random().toString(36).slice(2, 8);

export default function PaymentStep({
  reservationId,
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
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "qr" | "transfer" | "e-wallet" | null
  >(null);

  // ---------- local states ----------
  const [selectedPackage, setSelectedPackage] = useState<number | null>(
    initialSelectedPackage
  );

  // ผู้ใหญ่
  const [people, setPeople] = useState<number>(
    Number.isFinite(peopleInitial) && peopleInitial > 0 ? peopleInitial : 1
  );

  const [children, setChildren] = useState<number>(0);
  const totalSeats = useMemo(
    () => Math.max(1, Number(people) || 1) + Math.max(0, Number(children) || 0),
    [people, children]
  );
  const [alaItems, setAlaItems] = useState<AlaItem[]>(initialAlaItems ?? []);
  const [addingAla, setAddingAla] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [savingPeople, setSavingPeople] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const SPLIT_KEY = (rid: string) => `pay-split:${rid}`;

  const lastReservationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const changedReservation = lastReservationIdRef.current !== reservationId;
    if (!changedReservation) return;

    try {
      const raw = localStorage.getItem(SPLIT_KEY(reservationId));
      if (raw) {
        const saved = JSON.parse(raw) as { people?: number; children?: number };
        const p = Math.max(1, Number(saved?.people) || 1);
        const c = Math.max(0, Number(saved?.children) || 0);
        setPeople(p);
        setChildren(c);
      } else {
        setPeople(peopleInitial > 0 ? peopleInitial : 1);
        setChildren(0);
      }
    } catch {
      setPeople(peopleInitial > 0 ? peopleInitial : 1);
      setChildren(0);
    }

    setSelectedPackage(initialSelectedPackage ?? null);
    setAlaItems(initialAlaItems ?? []);
    setAddingAla(false);
    setNewName("");
    setNewPrice("");
    setError(null);
    setPaymentMethod(null);

    lastReservationIdRef.current = reservationId;
  }, [reservationId, peopleInitial, initialAlaItems, initialSelectedPackage]);

  useEffect(() => {
    if (!reservationId) return;
    localStorage.setItem(
      SPLIT_KEY(reservationId),
      JSON.stringify({ people, children })
    );
  }, [reservationId, people, children]);

  useEffect(() => {
    if (addingAla) nameInputRef.current?.focus();
  }, [addingAla]);

  const childUnit = useMemo(
    () => (selectedPackage ? Math.round(selectedPackage / 2) : 0),
    [selectedPackage]
  );

  const totals = useMemo(() => {
    const pkgAdults = (selectedPackage ?? 0) * (people || 0);
    const pkgChildren = childUnit * (children || 0);
    const pkg = pkgAdults + pkgChildren;
    const ala = (alaItems ?? []).reduce((s, i) => s + i.price * i.qty, 0);
    return { pkg, ala, sum: pkg + ala };
  }, [selectedPackage, people, children, alaItems, childUnit]);

  if (!open) return null;

  // ---------- handlers ----------
  const togglePackage = (pk: number) =>
    setSelectedPackage((prev) => (prev === pk ? null : pk));

  const handleSaveSeats = async () => {
    if (!onUpdatePeople) return;
    try {
      setSavingPeople(true);
      await onUpdatePeople(totalSeats);
      await onRefresh?.();
    } catch (e: any) {
      setError(e?.message || "บันทึกจำนวนที่นั่งไม่สำเร็จ");
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
    if (!paymentMethod) {
      setError("กรุณาเลือกช่องทางการชำระเงิน");
      return;
    }
    onSaved({
      selectedPackage,
      people,
      alaItems,
      totals,
      paymentMethod,
      children,
      childUnit,
    });
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
            aria-live="polite"
            className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
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

          {/* People & Children */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {/* ผู้ใหญ่ */}
            <div className="mt-4 grid gap-2 sm:grid-cols-[auto,1fr] sm:items-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                <FontAwesomeIcon icon={faUsers} />
                <span>จำนวนคน (ผู้ใหญ่)</span>
              </div>

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
                  onBlur={handleSaveSeats}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  aria-label="จำนวนผู้ใหญ่"
                />
              </div>
            </div>

            {/* เด็กครึ่งราคา */}
            <div className="mt-4 grid gap-2 sm:grid-cols-[auto,1fr] sm:items-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                <FontAwesomeIcon icon={faChild} />
                <span>เด็ก (ครึ่งราคา)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  onWheel={preventNumberScroll}
                  className="h-10 w-28 rounded-lg border px-3 text-sm"
                  value={children}
                  onChange={(e) =>
                    setChildren(Math.max(0, Number(e.target.value) || 0))
                  }
                  onBlur={handleSaveSeats}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  aria-label="จำนวนเด็ก"
                />
              </div>
            </div>
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
              <span className="text-gray-700">รวมแพ็กเกจ (ผู้ใหญ่)</span>
              <span className="font-semibold text-indigo-700">
                {selectedPackage
                  ? `${selectedPackage.toLocaleString()} × ${people} คน = ${(
                      (selectedPackage ?? 0) * people
                    ).toLocaleString()} บาท`
                  : "0 บาท"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">
                รวมแพ็กเกจ (เด็ก • ครึ่งราคา)
              </span>
              <span className="font-semibold text-indigo-700">
                {selectedPackage
                  ? `${childUnit.toLocaleString()} × ${children} คน = ${(
                      childUnit * children
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

        <section className="mb-4 rounded-xl border bg-white p-3 text-sm">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              ช่องทางชำระเงิน
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "cash", label: "เงินสด" },
                { key: "card", label: "บัตร" },
                { key: "qr", label: "QR/PromptPay" },
                { key: "transfer", label: "โอนเงิน" },
                { key: "e-wallet", label: "E-Wallet" },
              ].map((m) => {
                const active = paymentMethod === (m.key as any);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        m.key as
                          | "cash"
                          | "card"
                          | "qr"
                          | "transfer"
                          | "e-wallet"
                      )
                    }
                    className={[
                      "rounded-xl px-3 py-1.5 text-sm font-medium border transition",
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Footer (sticky) */}
      <div className="sticky bottom-0 flex flex-none items-center gap-3 border-t bg-white/70 px-4 py-3 backdrop-blur">
        <div className="mr-auto text-sm leading-tight">
          <div className="font-semibold">
            รวมทั้งสิ้น {currency(totals.sum)}
          </div>
          <div className="text-[11px] text-gray-600">
            รวมที่นั่ง {totalSeats} คน • ผู้ใหญ่ {people} คน • เด็ก {children}{" "}
            คน
            {selectedPackage
              ? ` • ผู้ใหญ่ ${selectedPackage.toLocaleString()} บาท`
              : ""}
            {selectedPackage
              ? ` • เด็กคนละ ${childUnit.toLocaleString()} บาท`
              : ""}
            • Ala cart {totals.ala.toLocaleString()} บาท
          </div>
        </div>

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
          disabled={
            busy ||
            (!selectedPackage && alaItems.length === 0) ||
            !paymentMethod
          }
        >
          <FontAwesomeIcon icon={faMoneyBillWave} />
          บันทึกการชำระเงิน
        </button>
      </div>
    </div>
  );
}
