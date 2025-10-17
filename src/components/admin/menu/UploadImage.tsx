"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Toast from "@/components/ui/Toast";

type Props = {
  initialUrl?: string | null;
  onUploaded: (url: string) => void;
};

export default function UploadImage({ initialUrl, onUploaded }: Props) {
  const supabase = createClient();
  const [imageUrl, setImageUrl] = useState(initialUrl || "");
  const [uploading, setUploading] = useState(false);

  //Toast state
  const [toast, setToast] = useState<
    { type: "error" | "success" | "info"; msg: string } | null
  >(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      //ตรวจสอบขนาดไฟล์ (ไม่เกิน 3MB)
      if (file.size > 3 * 1024 * 1024) {
        setToast({ type: "error", msg: "ขนาดไฟล์เกิน 3MB" });
        return;
      }

      setUploading(true);

      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("menu-images").getPublicUrl(fileName);

      setImageUrl(publicUrl);
      onUploaded(publicUrl);

      setToast({ type: "success", msg: "อัปโหลดรูปภาพสำเร็จ" });
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", msg: "อัปโหลดรูปภาพล้มเหลว: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    try {
      setImageUrl("");
      onUploaded("");
      setToast({ type: "info", msg: "ลบรูปภาพเรียบร้อย" });
    } catch {
      setToast({ type: "error", msg: "ไม่สามารถลบรูปภาพได้" });
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-3">
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-48 h-48 object-cover rounded-lg border"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-white/80 hover:bg-red-500 hover:text-white border border-gray-300 rounded-full p-1 text-xs transition"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition">
            <span className="text-gray-500 text-sm">
              {uploading ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/*Toast popup */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
