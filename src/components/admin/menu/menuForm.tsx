"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import UploadImage from "./UploadImage";

type Menu = {
  id?: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
};

type Props = {
  menu?: Menu | null;
  onClose: () => void;
};

export default function MenuForm({ menu, onClose }: Props) {
  const supabase = createClient();
  const [name, setName] = useState(menu?.name || "");
  const [description, setDescription] = useState(menu?.description || "");
  const [category, setCategory] = useState(menu?.category || "A LA CARTE เส้น");
  const [imageUrl, setImageUrl] = useState(menu?.image_url || "");
  const [saving, setSaving] = useState(false);

  // ฟังก์ชันบันทึกเมนู (เพิ่มหรือแก้ไข)
  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !category.trim()) {
      alert("⚠️ กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setSaving(true);

    try {
      if (menu?.id) {
        // ✅ แก้ไขเมนูเก่า
        const { error } = await supabase
          .from("menus")
          .update({
            name,
            description,
            category,
            image_url: imageUrl || null,
          })
          .eq("id", menu.id);

        if (error) throw error;
        alert("✅ อัปเดตเมนูเรียบร้อยแล้ว!");
      } else {
        // ✅ เพิ่มเมนูใหม่
        const { data, error } = await supabase
          .from("menus")
          .insert([
            {
              name,
              description,
              category,
              image_url: null, // ใส่ null ไว้ก่อน (ยังไม่อัปโหลด)
            },
          ])
          .select("id")
          .single();

        if (error) throw error;

        // ✅ ถ้ามีรูป ให้ update image_url หลังจากสร้างเมนูสำเร็จ
        if (imageUrl && data?.id) {
          const { error: imgError } = await supabase
            .from("menus")
            .update({ image_url: imageUrl })
            .eq("id", data.id);

          if (imgError) throw imgError;
        }

        alert("✅ เพิ่มเมนูใหม่สำเร็จ!");
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg space-y-4">
        {/* ส่วนหัว */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">
            {menu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* หมวดหมู่ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หมวดหมู่
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="A LA CARTE เส้น">A LA CARTE เส้น</option>
            <option value="A LA CARTE ชุด">A LA CARTE ชุด</option>
            <option value="A LA CARTE ข้าว">A LA CARTE ข้าว</option>
            <option value="ALA กระทะร้อน">ALA กระทะร้อน</option>
            <option value="ALA ซุป">ALA ซุป</option>
            <option value="ALA หมู">ALA หมู</option>
            <option value="ALA เนื้อวัว">ALA เนื้อวัว</option>
            <option value="ALA เนื้อไก่">ALA เนื้อไก่</option>
            <option value="เครื่องเคียง">เครื่องเคียง</option>
          </select>
        </div>

        {/* ชื่อเมนู (อังกฤษ) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อเมนู (อังกฤษ)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น Jap Chae"
          />
        </div>

        {/* ชื่อเมนู (ไทย) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อเมนู (ไทย)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="เช่น จับแช"
          />
        </div>

        {/* รูปภาพ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รูปภาพ
          </label>
          <UploadImage
            menuId={menu?.id}
            onUploaded={(url) => setImageUrl(url)}
            initialUrl={imageUrl}
          />
        </div>

        {/* ปุ่มบันทึก */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
