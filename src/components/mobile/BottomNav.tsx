"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Receipt, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/m/",            icon: Home,           label: "główna"     },
  { href: "/m/transactions",icon: List,           label: "transakcje" },
  { href: "/m/podatki",     icon: Receipt,        label: "podatki"    },
  { href: "/settings",      icon: MoreHorizontal, label: "więcej"     },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/m/" ? pathname === "/m" || pathname === "/m/" : pathname.startsWith(href);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Left tabs */}
      {TABS.slice(0, 2).map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: "100%", textDecoration: "none", color: active ? "var(--text-1)" : "var(--text-3)" }}>
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span style={{ fontSize: 10, fontFamily: "var(--font-sans)" }}>{tab.label}</span>
          </Link>
        );
      })}

      {/* Center — + dodaj */}
      <Link
        href="/m/add"
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textDecoration: "none" }}
      >
        <span style={{ background: "var(--text-1)", color: "var(--bg)", borderRadius: 8, padding: "9px 18px", fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "-0.01em", lineHeight: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
          + dodaj
        </span>
      </Link>

      {/* Right tabs */}
      {TABS.slice(2).map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: "100%", textDecoration: "none", color: active ? "var(--text-1)" : "var(--text-3)" }}>
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span style={{ fontSize: 10, fontFamily: "var(--font-sans)" }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
