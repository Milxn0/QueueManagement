"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient"; // ใช้ import จาก lib

type Stat = {
    label: string;
    value: number;
    color: string;
    text: string;
};

const DashboardPage = () => {
    const [stats, setStats] = useState<Stat[]>(
        [
            { label: "จำนวนคิววันนี้", value: 0, color: "bg-blue-100", text: "text-blue-700" },
            { label: "จำนวนคิวเดือนนี้", value: 0, color: "bg-green-100", text: "text-green-700" },
            { label: "จำนวนคิวปีนี้", value: 0, color: "bg-yellow-100", text: "text-yellow-700" },
        ]
    );

    // ฟังก์ชันดึงข้อมูล queue
    const fetchStats = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error || !data) return;

        const today = new Date().toISOString().slice(0, 10);
        const month = today.slice(0, 7);
        const year = today.slice(0, 4);

        const todayCount = data.filter((item: any) => item.created_at?.slice(0, 10) === today).length;
        const monthCount = data.filter((item: any) => item.created_at?.slice(0, 7) === month).length;
        const yearCount = data.filter((item: any) => item.created_at?.slice(0, 4) === year).length;

        setStats([
            { label: "จำนวนคิววันนี้", value: todayCount, color: "bg-blue-100", text: "text-blue-700" },
            { label: "จำนวนคิวเดือนนี้", value: monthCount, color: "bg-green-100", text: "text-green-700" },
            { label: "จำนวนคิวปีนี้", value: yearCount, color: "bg-yellow-100", text: "text-yellow-700" },
        ]);
    };

    useEffect(() => {
        fetchStats();

        // subscribe realtime
        const channel = supabase
            .channel('queue-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'queue' },
                () => {
                    fetchStats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="min-h-screen px-4 py-10 bg-gray-50 flex items-center justify-center">
      <main className="max-w-4xl w-full px-6 py-10 bg-white shadow-xl rounded-2xl">
        <h1 className="text-5xl font-extrabold text-black uppercase mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className={`rounded-2xl shadow-lg p-8 flex flex-col items-center ${stat.color}`}
                    >
                        <div className={`text-4xl font-bold mb-2 ${stat.text}`}>{stat.value}</div>
                        <div className="text-lg font-medium text-gray-700">{stat.label}</div>
                    </div>
                ))}
            </div>
      </main>
    </div>
    );
};

export default DashboardPage;