import "./globals.css";
import Navbar from "@/components/user/Navbar";
import { Prompt } from "next/font/google";
import Providers from "./providers";
import { Suspense } from "react";
import { getAppSettings } from "@/lib/appSettings";
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-prompt",
});

export const metadata = {
  title: "Seoul Korean BBQ Reservation",
  description: "Reservation website",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAppSettings();
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-prompt bg-gray-50">
        <Suspense fallback={null}>
          <Providers>
            <Navbar />
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
