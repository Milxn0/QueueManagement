"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Props = {
  onUploaded: (url: string) => void;
  initialUrl?: string;
};

export default function UploadImage({ onUploaded, initialUrl }: Props) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialUrl || "");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // ✅ ใช้ชื่อไฟล์ที่ปลอดภัย (timestamp + original name)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const fileName = `${Date.now()}_${safeFileName}`;

      // ✅ อัปโหลดไฟล์ไปยัง Supabase Storage
      const { data, error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file);

      if (error) throw error;

      // ✅ ดึง public URL
      const { data: publicData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(data.path);

      const imageUrl = publicData.publicUrl;

      setPreview(imageUrl);
      onUploaded(imageUrl);
      alert("✅ อัปโหลดสำเร็จแล้ว!");
    } catch (err: any) {
      alert("❌ อัปโหลดไม่สำเร็จ: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* รูป Preview */}
      {preview ? (
        <img
          src={preview}
          alt="Preview"
          className="w-full h-40 object-cover rounded-lg border"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
          ไม่มีรูปภาพ
        </div>
      )}

      {/* ปุ่มเลือกไฟล์ */}
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="w-full text-sm"
      />

      {uploading && (
        <p className="text-xs text-gray-500 animate-pulse">กำลังอัปโหลด...</p>
      )}
    </div>
  );
}
