"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import UploadImage from "./UploadImage";
import Toast from "@/components/ui/Toast";

type Props = {
  menu?: any;
  onClose: () => void;
};

export default function MenuForm({ menu, onClose }: Props) {
  const supabase = createClient();

  const [name, setName] = useState(menu?.name || "");
  const [description, setDescription] = useState(menu?.description || "");
  const [category, setCategory] = useState(menu?.category || "");
  const [imageUrl, setImageUrl] = useState(menu?.image_url || "");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Toast state
  const [toast, setToast] = useState<
    { type: "error" | "success" | "info"; msg: string } | null
  >(null);

  // โหลดหมวดหมู่ทั้งหมดจาก DB
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("category")
        .not("category", "is", null);

      if (error) {
        setToast({ type: "error", msg: "โหลดหมวดหมู่ไม่สำเร็จ" });
        return;
      }

      const uniqueCats = Array.from(
        new Set(
          data
            .map((d) => d.category?.trim().toUpperCase())
            .filter((v) => !!v)
        )
      ).sort();

      setCategories(uniqueCats);
    };

    fetchCategories();
  }, [supabase]);

  // โหลดข้อมูลเมื่อแก้ไขเมนู
  useEffect(() => {
    if (menu) {
      setName(menu.name || "");
      setDescription(menu.description || "");
      setCategory(menu.category || "");
      setImageUrl(menu.image_url || "");
    }
  }, [menu]);

  const handleSave = async () => {
    if (!name || !category) {
      setToast({ type: "error", msg: "กรุณากรอกชื่อเมนูและหมวดหมู่" });
      return;
    }

    setSaving(true);
    try {
      const cleanCategory = category.trim().toUpperCase();
      const cleanName = name.trim();
      const cleanDesc = description.trim();

      const payload = {
        name: cleanName,
        description: cleanDesc,
        category: cleanCategory,
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      };

      let res;
      if (menu?.id) {
        // แก้ไขเมนู
        res = await supabase.from("menus").update(payload).eq("id", menu.id);
      } else {
        // เพิ่มเมนูใหม่
        res = await supabase
          .from("menus")
          .insert({ ...payload, created_at: new Date().toISOString() });
      }

      if (res.error) throw res.error;

      setToast({ type: "success", msg: "บันทึกข้อมูลเมนูสำเร็จ" });
      onClose();
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", msg: "เกิดข้อผิดพลาด: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-lg relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>

          <h2 className="text-xl font-semibold mb-4">
            {menu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
          </h2>

          <div className="space-y-4">
            {/* หมวดหมู่ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                * หมวดหมู่จะรวมเข้ากับของเดิมอัตโนมัติ
              </p>
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
                placeholder="เช่น Jap Chae"
                className="w-full border rounded-lg px-3 py-2 text-sm"
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
                placeholder="เช่น จับแช"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* อัปโหลดรูป */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รูปภาพเมนู
              </label>
              <UploadImage
                onUploaded={(url) => setImageUrl(url)}
                initialUrl={imageUrl}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>

      {/*Toast popup */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
