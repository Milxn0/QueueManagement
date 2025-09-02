"use client";

import { useState } from "react";
import CardMenu from "@/components/CardMenu";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export default function Page() {
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");

  // ข้อมูลเมนูอาหารเกาหลี
  const menuItems: MenuItem[] = [
    {
      id: "1",
      name: "ซัมกยอปซัล (Samgyeopsal)",
      description: "หมูสามชั้นย่างเกาหลี พร้อมผักสดและซอส",
      price: 0,
      image: "/menu.jpg",
      category: "หมู",
    },
    {
      id: "2",
      name: "กัลบี (Galbi)",
      description: "ซี่โครงวัวหมักซอสเกาหลี ย่างไฟอ่อน",
      price: 399,
      image: "/menu.jpg",
      category: "เนื้อวัว",
    },
    {
      id: "3",
      name: "ดักกัลบี (Dakgalbi)",
      description: "อกไก่หมักซอสเผ็ด ย่างกับผัก",
      price: 249,
      image: "/menu.jpg",
      category: "ไก่",
    },
    {
      id: "4",
      name: "ซัมกเยทัง (Samgyetang)",
      description: "ซุปไก่โสมเกาหลี ใส่ข้าวเหนียวและสมุนไพร",
      price: 199,
      image: "/menu.jpg",
      category: "ซุป",
    },
    {
      id: "5",
      name: "บิบิมบับ (Bibimbap)",
      description: "ข้าวผัดเกาหลีกับผักสด ไข่ดาว และซอสโกชูจัง",
      price: 179,
      image: "/menu.jpg",
      category: "ข้าว",
    },
    {
      id: "6",
      name: "กิมจิจิแก (Kimchi Jjigae)",
      description: "ซุปกิมจิเผ็ดร้อน ใส่หมูและเต้าหู้",
      price: 159,
      image: "/menu.jpg",
      category: "ซุป",
    },
  ];

  // หมวดหมู่ทั้งหมด
  const categories = ["ทั้งหมด", "หมู", "เนื้อวัว", "ไก่", "ซุป", "ข้าว"];

  // กรองเมนูตามหมวดหมู่
  const filteredMenuItems =
    selectedCategory === "ทั้งหมด"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const handleOrder = (item: MenuItem) => {
    setCart((prev) => [...prev, item]);
    alert(`เพิ่ม ${item.name} ลงในตะกร้าแล้ว!`);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            เมนูอาหารเกาหลี
          </h1>
          <p className="text-gray-600">เลือกเมนูที่คุณชื่นชอบ</p>
        </div>

        {/* ปุ่มกรองหมวดหมู่ */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? "bg-blue-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* ตะกร้าสินค้า */}
        {cart.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">
              ตะกร้าสินค้า ({cart.length} รายการ)
            </h3>
            <div className="space-y-2">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span>{item.name}</span>
                  <span className="font-semibold">฿{item.price}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>รวมทั้งหมด:</span>
                <span className="text-red-600">
                  ฿{getTotalPrice().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* เมนูอาหาร */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenuItems.map((item) => (
            <CardMenu key={item.id} menuItem={item} onOrder={handleOrder} />
          ))}
        </div>

        {/* แสดงข้อความเมื่อไม่มีเมนูในหมวดหมู่ที่เลือก */}
        {filteredMenuItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              ไม่มีเมนูในหมวดหมู่ "{selectedCategory}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
