"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const maxW: React.CSSProperties = { maxWidth: 520, margin: "0 auto", padding: "0 24px" };

interface UserInfo {
  email: string;
  plan: "free" | "pro";
  createdAt?: string;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "24px 24px",
        background: "var(--surface)",
      }}
    >
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          color: "var(--text-1)",
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Nie zalogowano");
        return r.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-3)",
          fontSize: 14,
          fontFamily: "var(--font-sans)",
          background: "var(--bg)",
        }}
      >
        Ładowanie…
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "var(--bg)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15 }}>Nie jesteś zalogowany.</p>
        <Link
          href="/auth"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: "var(--text-1)",
            textDecoration: "underline",
          }}
        >
          Zaloguj się →
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-1)",
        fontFamily: "var(--font-sans)",
        paddingTop: 64,
        paddingBottom: 64,
      }}
    >
      <div style={{ ...maxW, width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--text-1)",
              textDecoration: "none",
            }}
          >
            zostaje.
          </Link>
          <button
            onClick={handleLogout}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Wyloguj
          </button>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            marginBottom: 32,
          }}
        >
          Twoje konto
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile */}
          <SectionCard title="Profil">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>E-mail</span>
                <span style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{user.email}</span>
              </div>
              {user.createdAt && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-3)" }}>Konto od</span>
                  <span style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>
                    {new Date(user.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Subscription */}
          <SectionCard title="Subskrypcja">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-3)" }}>Aktualny plan</span>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 4,
                  background: user.plan === "pro" ? "var(--green)" : "var(--surface2)",
                  color: user.plan === "pro" ? "#fff" : "var(--text-2)",
                }}
              >
                {user.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
            {user.plan !== "pro" && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>
                  Wersja przeglądarkowa wymaga planu Pro. Ulepsz aby korzystać z aplikacji w przeglądarce.
                </p>
                <button
                  onClick={() => toast.info("Płatności wkrótce — kontakt: hello@zostaje.app")}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--text-1)",
                    color: "var(--bg)",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Przejdź na Pro — 29 zł/mies →
                </button>
              </div>
            )}
          </SectionCard>

          {/* Desktop app */}
          <SectionCard title="Aplikacja desktopowa">
            <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
              Wersja desktopowa jest darmowa na zawsze. Twoje dane zostają na Twoim komputerze,
              zaszyfrowane kluczem AES-GCM 256-bit.
            </p>
            <div style={{ marginTop: 12 }}>
              <Link
                href="/"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--text-1)",
                  textDecoration: "underline",
                }}
              >
                Pobierz zostaje. na desktop →
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
