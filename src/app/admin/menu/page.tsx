"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import MenuList from "@/components/admin/menu/MenuList";
import MenuForm from "@/components/admin/menu/menuForm";

export default function AdminMenuPage() {
  const supabase = createClient();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadMenus = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .order("category", { ascending: true });

    if (!error) setMenus(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const handleEdit = (menu: any) => {
    setEditingMenu(menu);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?")) return;
    await supabase.from("menus").delete().eq("id", id);
    await loadMenus();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMenu(null);
    loadMenus();
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการเมนูอาหาร 🍱</h1>
        <button
          onClick={() => {
            setEditingMenu(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          ➕ เพิ่มเมนู
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
      ) : (
        <MenuList menus={menus} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* ✅ Modal ฟอร์มเพิ่ม/แก้ไขเมนู */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative animate-fadeIn">
            <MenuForm menu={editingMenu} onClose={handleFormClose} />

            {/* ปุ่มปิดมุมขวา */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
