"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// เตรียม Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Stat = {
    label: string;
    value: number;
    color: string;
    text: string;
};

const DashboardPage = () => {
    const [stats, setStats] = useState<Stat[]>(
        [
            { label: "จำนวนลูกค้าวันนี้", value: 0, color: "bg-blue-100", text: "text-blue-700" },
            { label: "คิวที่จองเข้ามา", value: 0, color: "bg-green-100", text: "text-green-700" },
            { label: "จำนวนคิวที่ไม่มา", value: 0, color: "bg-red-100", text: "text-yellow-700" },
        ]
    );

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