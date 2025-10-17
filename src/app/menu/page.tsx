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

    const categories = useMemo(() => {
        const cats = Array.from(new Set(menus.map((m) => m.category))).sort();
        return ["ทั้งหมด", ...cats];
    }, [menus]);

    const filteredMenus = useMemo(() => {
        let filtered = menus;
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
    }, [menus, activeCategory, searchTerm]);

    const grouped = useMemo(() => {
        return filteredMenus.reduce((acc: Record<string, MenuItem[]>, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});
    }, [filteredMenus]);

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

    return (
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
            {/* Header */}
            <header className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    🍱 เมนูทั้งหมดของ Seoul Korean BBQ
                </h1>
                <p className="text-gray-600">
                    เลือกหมวดหมู่หรือพิมพ์ชื่อเมนูที่ต้องการค้นหาได้เลย
                </p>
            </header>

            {/* Tabs: Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 whitespace-nowrap rounded-full border transition text-sm font-medium ${activeCategory === cat
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="flex justify-center">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาเมนู (เช่น บูลโกกิ, ซุป, ไก่)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-96 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Menu List */}
            {filteredMenus.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">
                    ไม่พบเมนูที่ค้นหา 😢
                </p>
            ) : (
                Object.keys(grouped).map((category) => (
                    <section key={category} className="space-y-4">
                        <h2 className="text-2xl font-semibold text-indigo-700 border-b pb-2">
                            {category}
                        </h2>

                        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                            {grouped[category].map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border shadow-sm bg-white hover:shadow-lg transition-all transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden duration-200"
                                >
                                    <div className="aspect-video bg-gray-100">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                loading="lazy" // 💤 โหลดเฉพาะเมื่ออยู่ใน viewport
                                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                                ไม่มีรูปภาพ
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                        {item.description && (
                                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </main>
    );
}
