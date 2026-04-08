"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const maxW: React.CSSProperties = { maxWidth: 540, margin: "0 auto", padding: "0 24px" };

interface UserInfo {
  id: string;
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
        padding: "24px",
        background: "var(--surface)",
      }}
    >
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          color: "var(--text-1)",
          marginBottom: 20,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          padding: "9px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text-1)",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary, #6366f1)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Change password state
  const [cpCurrent, setCpCurrent] = React.useState("");
  const [cpNew, setCpNew] = React.useState("");
  const [cpConfirm, setCpConfirm] = React.useState("");
  const [cpLoading, setCpLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/auth");
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (cpNew !== cpConfirm) {
      toast.error("Nowe hasła nie są takie same");
      return;
    }
    if (cpNew.length < 8) {
      toast.error("Nowe hasło musi mieć minimum 8 znaków");
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      });
      if (res.ok) {
        toast.success("Hasło zostało zmienione");
        setCpCurrent("");
        setCpNew("");
        setCpConfirm("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Nie udało się zmienić hasła");
      }
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setCpLoading(false);
    }
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
        }}
      >
        <p style={{ color: "var(--text-2)", fontSize: 15 }}>Nie jesteś zalogowany.</p>
        <Link
          href="/auth"
          style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-1)", textDecoration: "underline" }}
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
        paddingTop: 56,
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
            fontSize: 22,
            fontWeight: 500,
            marginBottom: 28,
          }}
        >
          Twoje konto
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile */}
          <SectionCard title="Profil">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row label="E-mail" value={user.email} />
              {user.createdAt && (
                <Row
                  label="Konto od"
                  value={new Date(user.createdAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              )}
              <Row
                label="Plan"
                value={
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 4,
                      background: user.plan === "pro" ? "#16a34a" : "var(--surface2, #1e1e1e)",
                      color: user.plan === "pro" ? "#fff" : "var(--text-2)",
                    }}
                  >
                    {user.plan === "pro" ? "Pro" : "Free"}
                  </span>
                }
              />
            </div>
          </SectionCard>

          {/* Subscription */}
          <SectionCard title="Subskrypcja">
            {user.plan === "pro" ? (
              <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
                Aktywna subskrypcja Pro. Dane synchronizowane z serwerem end-to-end.
                W celu anulowania skontaktuj się z{" "}
                <a href="mailto:hello@zostaje.app" style={{ color: "var(--text-1)" }}>
                  hello@zostaje.app
                </a>
                .
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 16 }}>
                  Wersja przeglądarkowa wymaga planu Pro. Twoje dane będą przechowywane
                  na naszych serwerach w formacie zaszyfrowanym end-to-end.
                </p>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "20px",
                    marginBottom: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {[
                    "Dostęp z przeglądarki na każdym urządzeniu",
                    "Synchronizacja danych E2E (klucz tylko u Ciebie)",
                    "Backup na serwerze",
                    "Priorytetowe wsparcie",
                  ].map((f) => (
                    <div key={f} style={{ fontSize: 13, color: "var(--text-2)", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#16a34a" }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toast.info("Płatności wkrótce — skontaktuj się: hello@zostaje.app")}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    padding: "11px 22px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--text-1)",
                    color: "var(--bg)",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                    width: "100%",
                  }}
                >
                  Przejdź na Pro — 29 zł/mies →
                </button>
              </div>
            )}
          </SectionCard>

          {/* Change password */}
          <SectionCard title="Zmień hasło konta">
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="Aktualne hasło"
                type="password"
                value={cpCurrent}
                onChange={setCpCurrent}
                placeholder="••••••••"
              />
              <Field
                label="Nowe hasło"
                type="password"
                value={cpNew}
                onChange={setCpNew}
                placeholder="min. 8 znaków"
              />
              <Field
                label="Powtórz nowe hasło"
                type="password"
                value={cpConfirm}
                onChange={setCpConfirm}
                placeholder="••••••••"
              />
              <button
                type="submit"
                disabled={cpLoading || !cpCurrent || !cpNew || !cpConfirm}
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--text-1)",
                  color: "var(--bg)",
                  cursor: cpLoading ? "wait" : "pointer",
                  opacity: cpLoading || !cpCurrent || !cpNew || !cpConfirm ? 0.5 : 1,
                  letterSpacing: "-0.01em",
                }}
              >
                {cpLoading ? "Zapisywanie…" : "Zmień hasło"}
              </button>
            </form>
          </SectionCard>

          {/* Desktop app */}
          <SectionCard title="Aplikacja desktopowa (darmowa)">
            <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 12 }}>
              Wersja desktopowa jest darmowa na zawsze. Dane zostają na Twoim komputerze
              w zaszyfrowanym pliku <code style={{ fontSize: 12 }}>vault.zostaje</code> chronionym hasłem.
              Brak wymagań konta ani subskrypcji.
            </p>
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
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
