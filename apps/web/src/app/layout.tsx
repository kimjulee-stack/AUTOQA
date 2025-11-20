import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { Sidebar } from "@/components/shell/sidebar";

import "./globals.css";

const notoSans = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "AutoQA Console",
  description: "모바일 테스트 자동화를 위한 대시보드",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.variable}>
        <div className="app-shell">
          <Sidebar />
          <main className="app-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
