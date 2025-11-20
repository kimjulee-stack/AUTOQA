"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "대시보드", href: "/" },
  { label: "시나리오 테스트", href: "/functional-test" },
  { label: "UI 테스트", href: "/ui-test" },
  { label: "QR 테스트", href: "/qr-test" },
  { label: "DB 테스트", href: "/db-test" },
  { label: "AI 테스트", href: "/ai-test" },
  { label: "시나리오 저장소", href: "/scenarios" },
  { label: "일정", href: "/schedule" }
];

export function Sidebar() {
  const pathname = usePathname();
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
        {navItems.map(item => {
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
      </nav>
    </aside>
  );
}

