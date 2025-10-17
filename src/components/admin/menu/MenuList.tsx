"use client";

type Menu = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

type MenuListProps = {
  menus: Menu[];
  onEdit: (menu: Menu) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function MenuList({ menus, onEdit, onDelete }: MenuListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600 w-20">รูป</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อเมนู</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">หมวดหมู่</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อไทย</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {menus.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">
                ยังไม่มีเมนูในระบบ
              </td>
            </tr>
          ) : (
            menus.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-2">
                  {m.image_url ? (
                    <img
                      src={m.image_url}
                      alt={m.name}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                      ไม่มีรูป
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 font-medium text-gray-800">{m.name}</td>
                <td className="px-4 py-2 text-gray-600">{m.category}</td>
                <td className="px-4 py-2 text-gray-600">
                  {m.description || "-"}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => onEdit(m)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-3"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
