"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import UploadImage from "./UploadImage";

type Menu = {
  id?: string;
  name: string;
  category: string;
  description: string;
  image_url?: string | null;
};

type Props = {
  menu?: Menu | null;
  onClose: () => void;
};

export default function MenuForm({ menu, onClose }: Props) {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = [
    "A LA CARTE เส้น",
    "ALA กระทะร้อน",
    "ALA ข้าว",
    "ALA ซุป",
    "ALA ของทอด",
    "ALA เนื้อไก่",
    "ALA หมู",
    "ALA เนื้อวัว",
    "เพิ่มเติม",
  ];

  useEffect(() => {
    if (menu) {
      setName(menu.name || "");
      setCategory(menu.category || "");
      setDescription(menu.description || "");
      setImageUrl(menu.image_url || "");
    } else {
      setName("");
      setCategory("");
      setDescription("");
      setImageUrl("");
    }
  }, [menu]);

  const handleSave = async () => {
    if (!name || !category) {
      alert("กรุณากรอกชื่อเมนูและเลือกหมวดหมู่");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        category,
        description,
        image_url: imageUrl || null,
      };

      if (menu?.id) {
        const { error } = await supabase.from("menus").update(payload).eq("id", menu.id);
        if (error) throw error;
        alert("✅ อัปเดตเมนูเรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("menus").insert(payload);
        if (error) throw error;
        alert("✅ เพิ่มเมนูใหม่เรียบร้อยแล้ว");
      }

      onClose();
    } catch (e: any) {
      alert("❌ เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        {menu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1">หมวดหมู่</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">-- เลือกหมวดหมู่ --</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ชื่อเมนู (อังกฤษ)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ชื่อเมนู (ไทย)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">รูปภาพ</label>
        <UploadImage onUploaded={setImageUrl} initialUrl={imageUrl} />
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          disabled={loading}
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          {loading ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
