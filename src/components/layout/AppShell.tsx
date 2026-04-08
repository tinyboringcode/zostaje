"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PanelLeft,
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  BarChart3,
  Settings,
  Command,
} from "lucide-react";
import { QuickAdd } from "@/components/quick-add/QuickAdd";
import { PageTransition } from "./PageTransition";

// ── Nav structure — max 5 primary items ──────────────────────────────────

const PRIMARY_NAV = [
  { href: "/dashboard",    label: "Przegląd",     icon: LayoutDashboard },
  { href: "/transactions", label: "Transakcje",    icon: ArrowLeftRight },
  { href: "/contractors",  label: "Kontrahenci",   icon: Building2 },
  { href: "/reports",      label: "Raporty",       icon: BarChart3 },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

// ── Nav item ───────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  open,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  open: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={!open ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 7,
        textDecoration: "none",
        background: active ? "var(--bg)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-2)",
        transition: "background 140ms ease, color 140ms ease, box-shadow 140ms ease",
        overflow: "hidden",
        whiteSpace: "nowrap",
        minWidth: 0,
        fontFamily: "var(--font-sans)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        fontWeight: active ? 500 : 400,
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
        }
      }}
    >
      <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
      <span
        style={{
          fontSize: 14,
          opacity: open ? 1 : 0,
          transition: "opacity 120ms ease",
          overflow: "hidden",
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </Link>
  );
}

// ── AppShell ───────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: open ? 240 : 56,
          transition: "width 200ms ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        {/* Header: toggle + logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
            height: 52,
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setOpen((v) => !v)}
            title={open ? "Zwiń menu" : "Rozwiń menu"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: 6,
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 100ms, color 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            <PanelLeft size={17} />
          </button>
          <Link
            href="/dashboard"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-1)",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              opacity: open ? 1 : 0,
              transition: "opacity 120ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            zostaje.
          </Link>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              open={open}
              active={isActive(item.href)}
            />
          ))}

          {/* Cmd+K hint */}
          <div style={{ height: 1, background: "var(--surface2)", margin: "14px 10px 8px" }} />
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            title={!open ? "Cmd+K" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              borderRadius: 7,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-3)",
              width: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)",
              transition: "color 140ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
            }}
          >
            <Command size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span
              style={{
                fontSize: 13,
                opacity: open ? 1 : 0,
                transition: "opacity 120ms ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Więcej
              <kbd style={{
                fontSize: 10,
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-3)",
                fontFamily: "var(--font-sans)",
              }}>
                ⌘K
              </kbd>
            </span>
          </button>
        </nav>

        {/* Bottom nav (Ustawienia) */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 6px",
          }}
        >
          {BOTTOM_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              open={open}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: "44px 40px 80px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      <QuickAdd />
    </div>
  );
}
