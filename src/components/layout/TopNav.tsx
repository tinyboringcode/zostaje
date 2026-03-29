"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/",             label: "Przegląd"     },
  { href: "/transactions", label: "Transakcje"   },
  { href: "/podatki",      label: "Podatki"      },
  { href: "/contractors",  label: "Kontrahenci"  },
  { href: "/reports",      label: "Raporty"      },
];

const MORE_LINKS = [
  { href: "/wskazniki",  label: "Wskaźniki"        },
  { href: "/cykl",       label: "Cykl finansowy"   },
  { href: "/import",     label: "Import"            },
  { href: "/budgets",    label: "Budżety"           },
  { href: "/categories", label: "Kategorie"         },
  { href: "/historia",   label: "Historia"          },
  { href: "/wiedza",     label: "Baza wiedzy"       },
  { href: "/ai-demo",    label: "Demo AI"           },
  { href: "/settings",   label: "Ustawienia"        },
];

export function TopNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const moreIsActive = MORE_LINKS.some((l) => isActive(l.href));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav
      style={{
        height: 48,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        paddingInline: 24,
        gap: 0,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          fontWeight: 500,
          color: "var(--text-1)",
          textDecoration: "none",
          marginRight: 32,
          letterSpacing: "-0.02em",
          flexShrink: 0,
        }}
      >
        zostaje.
      </Link>

      {/* Primary links */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, flex: 1, height: "100%" }}>
        {PRIMARY_LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                paddingInline: 12,
                height: "100%",
                fontSize: 15,
                fontFamily: "var(--font-sans)",
                color: active ? "var(--text-1)" : "var(--text-2)",
                textDecoration: "none",
                borderBottom: active ? "2px solid var(--text-1)" : "2px solid transparent",
                transition: "color 150ms",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
              }}
            >
              {link.label}
            </Link>
          );
        })}

        {/* More dropdown */}
        <div ref={moreRef} style={{ position: "relative", height: "100%", display: "flex" }}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              paddingInline: 12,
              height: "100%",
              fontSize: 15,
              fontFamily: "var(--font-sans)",
              color: moreIsActive ? "var(--text-1)" : "var(--text-2)",
              background: "none",
              border: "none",
              borderBottom: moreIsActive ? "2px solid var(--text-1)" : "2px solid transparent",
              cursor: "pointer",
              transition: "color 150ms",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => {
              if (!moreIsActive) e.currentTarget.style.color = "var(--text-2)";
            }}
          >
            Więcej
            <ChevronDown
              size={12}
              style={{
                transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 150ms",
              }}
            />
          </button>

          {moreOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 1px)",
                left: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                minWidth: 180,
                padding: "4px 0",
                zIndex: 100,
              }}
            >
              {MORE_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "block",
                      padding: "7px 14px",
                      fontSize: 13,
                      fontFamily: "var(--font-sans)",
                      color: active ? "var(--text-1)" : "var(--text-2)",
                      textDecoration: "none",
                      background: active ? "var(--border)" : "transparent",
                      transition: "background 100ms, color 100ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = active
                        ? "var(--border)"
                        : "transparent";
                      (e.currentTarget as HTMLElement).style.color = active
                        ? "var(--text-1)"
                        : "var(--text-2)";
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side — inicjały */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 4,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-2)",
          flexShrink: 0,
          cursor: "default",
          userSelect: "none",
        }}
      >
        JDG
      </div>
    </nav>
  );
}
