"use client";
import { useState } from "react";

export default function Reservation() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");

  const handleSubmitStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const phoneValue = formData.get("phone")?.toString() || "";
    setPhone(phoneValue);
    setStep(2);
  };

  const handleSubmitStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert(`เบอร์โทรที่ยืนยันคือ: ${phone}`);
  };

  return (
    <div>
      <main className="flex flex-col gap-8 items-center text-center px-4 py-4">
        <h1 className="text-5xl text-indigo-500 font-bold py-10">ระบบจองคิว</h1>

        <div className="w-full max-w-md px-6 py-5 border-2 shadow-lg rounded-[20px] bg-white">
          {step === 1 && (
            <>
              <h2 className="text-center text-2xl">กรุณากรอกข้อมูลเพื่อจองคิว</h2>
              <form className="space-y-4 mt-4" onSubmit={handleSubmitStep1}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-left text-gray-700">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Nantawat Choolchinda"
                    required
                    className="mt-1 block w-full px-2 h-12 rounded-[20px] border-gray-300 shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-left text-gray-700">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="012-345-6789"
                    required
                    className="mt-1 block w-full px-2 h-12 rounded-[20px] border-gray-300 shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="people" className="block text-sm font-medium text-left text-gray-700">
                    จำนวนคน
                  </label>
                  <input
                    type="number"
                    id="people"
                    name="people"
                    min="1"
                    required
                    className="mt-1 block w-full px-2 h-12 rounded-[20px] border-gray-300 shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="datetime" className="block text-sm font-medium text-left text-gray-700">
                    วันที่และเวลา
                  </label>
                  <input
                    type="datetime-local"
                    id="datetime"
                    name="datetime"
                    required
                    className="mt-1 block w-full px-2 h-12 rounded-[20px] border-gray-300 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-[20px] bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                  ถัดไป
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-center text-2xl">ยืนยันเบอร์โทรศัพท์</h2>
              <p className="mt-4 text-gray-600">
                เบอร์ที่คุณกรอกคือ <span className="font-bold text-indigo-600">{phone}</span>
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmitStep2}>
                <input
                  type="tel"
                  name="confirmPhone"
                  placeholder="กรอกเบอร์โทรอีกครั้ง"
                  required
                  className="block w-full px-2 h-12 rounded-[20px] border-gray-300 shadow-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-[20px] bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  ยืนยัน
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
