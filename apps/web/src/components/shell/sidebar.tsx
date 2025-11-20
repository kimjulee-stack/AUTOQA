"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const automationItems = [
  { label: "매뉴얼 테스트", href: "/manual-test" },
  { label: "시나리오 테스트", href: "/functional-test" },
  { label: "QR 테스트", href: "/qr-test" },
  { label: "DB 테스트", href: "/db-test" },
  { label: "AI 테스트", href: "/ai-test" }
];

const rootNavItems = [
  { label: "대시보드", href: "/" },
  { label: "시나리오 저장소", href: "/scenarios" },
  { label: "일정", href: "/schedule" }
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: "transform 0.2s ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)"
      }}
    >
      <path d="M6 14L12 8L18 14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [isAutomationOpen, setAutomationOpen] = useState(true);
  return (
    <aside
      style={{
        background: "#1f1f23",
        color: "#fff",
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: 20 }}>
        <Image src="/logo.svg" alt="AutoQA" width={36} height={36} />
        AutoQA
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rootNavItems.map(item => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 12,
                padding: "10px 12px",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                color: "#fff",
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 600
              }}
            >
              {item.label}
            </Link>
          );
        })}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => setAutomationOpen(prev => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 12,
              padding: "10px 12px",
              background: automationItems.some(item => pathname.startsWith(item.href))
                ? "rgba(255,255,255,0.12)"
                : "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <span>자동화 테스트</span>
            <ChevronIcon open={isAutomationOpen} />
          </button>
          {isAutomationOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 8 }}>
              {automationItems.map(item => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 10,
                      padding: "8px 12px",
                      background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontSize: 14,
                      fontWeight: 500
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

