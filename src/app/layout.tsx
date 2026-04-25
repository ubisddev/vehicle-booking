import type { Metadata } from "next";
import "./globals.css";
import ChatBot from "@/components/ChatBot";

export const metadata: Metadata = {
  title: "AI-UBISD Vehicle Intelligent System - ระบบขอใช้รถยนต์ราชการอัจฉริยะ",
  description: "ระบบขอใช้รถยนต์ราชการอัจฉริยะ สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen">
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
