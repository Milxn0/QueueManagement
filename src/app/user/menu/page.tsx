"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";

type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export default function MenuPage() {
  const supabase = createClient();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ทั้งหมด");

  // Custom order ของหมวด A LA CARTE
  const ALA_CATEGORIES = [
    "A LA CARTE เส้น",
    "A LA CARTE ข้าว",
    "A LA CARTE หมู",
    "A LA CARTE เนื้อวัว",
    "A LA CARTE ซุป",
    "A LA CARTE กระทะร้อน",
  ];

  // โหลดข้อมูลจาก Supabase
  useEffect(() => {
    const loadMenus = async () => {
      try {
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setMenus(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMenus();
  }, [supabase]);

  // Normalize Category
  const normalizedMenus = useMemo(() => {
    return menus.map((m) => ({
      ...m,
      category: m.category ? m.category.trim() : "ไม่ระบุหมวด",
    }));
  }, [menus]);

  // รวมหมวดทั้งหมด + เรียงลำดับตาม Custom order
  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(normalizedMenus.map((m) => m.category)));

    const sortedCats = cats.sort((a, b) => {
      const indexA = ALA_CATEGORIES.findIndex(
        (c) => c.toUpperCase() === a.toUpperCase()
      );
      const indexB = ALA_CATEGORIES.findIndex(
        (c) => c.toUpperCase() === b.toUpperCase()
      );

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b, "th");
    });

    // “เพิ่มเติม” จะอยู่ท้ายสุด
    const extras = sortedCats.filter((c) => c.includes("เพิ่มเติม"));
    const rest = sortedCats.filter((c) => !c.includes("เพิ่มเติม"));

    return ["ทั้งหมด", ...rest, ...extras];
  }, [normalizedMenus]);

  // Filter ตามหมวดและคำค้นหา
  const filteredMenus = useMemo(() => {
    let filtered = normalizedMenus;
    if (activeCategory !== "ทั้งหมด") {
      filtered = filtered.filter((m) => m.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          (m.description && m.description.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [normalizedMenus, activeCategory, searchTerm]);

  // Group ตามหมวด
  const grouped = useMemo(() => {
    return filteredMenus.reduce((acc: Record<string, MenuItem[]>, item) => {
      const cat = item.category || "ไม่ระบุหมวด";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [filteredMenus]);

  // แยกหมวด ALA กับหมวดอื่น
  const alaGroups = Object.keys(grouped).filter((cat) =>
    ALA_CATEGORIES.includes(cat)
  );
  const otherGroups = Object.keys(grouped).filter(
    (cat) => !ALA_CATEGORIES.includes(cat)
  );

  // Loading / Error state
  if (loading)
    return (
      <main className="max-w-5xl mx-auto px-6 py-12 text-center text-gray-500">
        กำลังโหลดเมนู...
      </main>
    );

  if (error)
    return (
      <main className="max-w-5xl mx-auto px-6 py-12 text-center text-red-500">
        โหลดเมนูไม่สำเร็จ: {error}
      </main>
    );

  // UI หลัก
  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          เมนูทั้งหมดของ Seoul Korean BBQ
        </h1>
        <p className="text-gray-600">
          เลือกหมวดหมู่หรือพิมพ์ชื่อเมนูที่ต้องการค้นหาได้เลย
        </p>
      </header>

      {/* Tabs: Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar justify-center flex-wrap">
        {allCategories
          .filter((cat) => cat !== "เพิ่มเติม")
          .map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 whitespace-nowrap rounded-full border transition text-sm font-medium ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}

        
        {allCategories.includes("เพิ่มเติม") && (
          <button
            onClick={() => setActiveCategory("เพิ่มเติม")}
            className={`px-4 py-2 whitespace-nowrap rounded-full border transition text-sm font-medium ${
              activeCategory === "เพิ่มเติม"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
            }`}
          >
            เพิ่มเติม
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex justify-center">
        <input
          type="text"
          placeholder="ค้นหาเมนู (เช่น บูลโกกิ, ซุป, ไก่)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-96 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Section: A LA CARTE */}
      {alaGroups.length > 0 && (
        <section className="space-y-8">
          {ALA_CATEGORIES.map(
            (cat) =>
              grouped[cat] && (
                <div key={cat} className="space-y-4">
                  <h3 className="text-2xl font-semibold text-indigo-600 border-b pb-2">
                    {cat}
                  </h3>

                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {grouped[cat].map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border shadow-sm bg-white hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        <div className="aspect-video bg-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                              ไม่มีรูปภาพ
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-800">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
          )}
        </section>
      )}

      {/* Section: หมวดอื่นๆ */}
      {otherGroups.length > 0 && (
        <section className="space-y-8">
          {otherGroups.map((cat) => (
            <div key={cat} className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-700 border-b pb-2">
                {cat}
              </h3>

              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {grouped[cat].map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border shadow-sm bg-white hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          ไม่มีรูปภาพ
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
