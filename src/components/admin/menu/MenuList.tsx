"use client";

import React from "react";

export default function MenuList({
  menus,
  onEdit,
  onDelete,
}: {
  menus: any[];
  onEdit: (m: any) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="overflow-hidden bg-white rounded-lg border">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รูป</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ชื่อเมนู</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">หมวดหมู่</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รายละเอียด</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {menus.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <img
                    src={m.image_url || "/placeholder.png"}
                    alt={m.name}
                    className="h-12 w-12 object-cover rounded-md"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">{m.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.description}</td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onEdit(m)}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {menus.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  ไม่พบเมนู
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
