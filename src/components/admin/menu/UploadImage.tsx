"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Props = {
  menuId?: string;
  onUploaded: (url: string) => void;
  initialUrl?: string;
};

export default function UploadImage({ menuId, onUploaded, initialUrl }: Props) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialUrl || "");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(data.path);

      const imageUrl = publicData.publicUrl;
      setPreview(imageUrl);
      onUploaded(imageUrl);

      alert("✅ อัปโหลดเรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error(err);
      alert("❌ อัปโหลดไม่สำเร็จ: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
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

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && (
        <p className="text-sm text-gray-500">กำลังอัปโหลด...</p>
      )}
    </div>
  );
}
