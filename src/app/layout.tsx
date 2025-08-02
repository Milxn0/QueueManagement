import "./globals.css";
import Navbar from "@/components/Navbar";
import { Prompt } from "next/font/google";
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-prompt",
});

export const metadata = {
  title: "Seoul Korean BBQ Reservation",
  description: "Reservation website",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-prompt bg-gray-50">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
