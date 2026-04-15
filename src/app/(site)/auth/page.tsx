"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Mode = "login" | "register";

// ── Shared styles ─────────────────────────────────────────────────────────
const maxW: React.CSSProperties = { maxWidth: 400, margin: "0 auto", padding: "0 24px" };

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoFocus,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          color: "var(--text-2)",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          padding: "10px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-1)",
          outline: "none",
          transition: "border-color 150ms",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "register" && password !== confirm) {
      toast.error("Hasła nie są takie same");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Uzupełnij wszystkie pola");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? (mode === "login" ? "Nieprawidłowe dane" : "Rejestracja nie powiodła się"));
      }
    } catch {
      toast.error("Błąd połączenia — spróbuj ponownie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text-1)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ ...maxW, width: "100%" }}>
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-1)",
            textDecoration: "none",
            display: "block",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          zostaje.
        </Link>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            marginBottom: 32,
          }}
        >
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "10px 0",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: mode === m ? 600 : 400,
                color: mode === m ? "var(--text-1)" : "var(--text-3)",
                background: "none",
                border: "none",
                borderBottom: mode === m ? "2px solid var(--text-1)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 150ms, border-color 150ms",
              }}
            >
              {m === "login" ? "Zaloguj się" : "Zarejestruj się"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            autoFocus
            placeholder="jan@firma.pl"
          />
          <Field
            label="Hasło"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="min. 8 znaków"
          />
          {mode === "register" && (
            <Field
              label="Powtórz hasło"
              type="password"
              value={confirm}
              onChange={setConfirm}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              padding: "12px 0",
              borderRadius: 6,
              border: "none",
              background: "var(--text-1)",
              color: "var(--bg)",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 150ms",
              letterSpacing: "-0.01em",
            }}
          >
            {loading
              ? "Ładowanie…"
              : mode === "login"
              ? "Zaloguj się"
              : "Utwórz konto"}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-3)",
            marginTop: 32,
          }}
        >
          {mode === "login" ? (
            <>
              Nie masz konta?{" "}
              <button
                onClick={() => setMode("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-1)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                }}
              >
                Zarejestruj się
              </button>
            </>
          ) : (
            <>
              Masz już konto?{" "}
              <button
                onClick={() => setMode("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-1)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                }}
              >
                Zaloguj się
              </button>
            </>
          )}
        </p>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", marginTop: 24 }}>
          <Link href="/" style={{ color: "var(--text-2)", textDecoration: "underline" }}>
            Pobierz wersję desktopową
          </Link>{" "}
          — za darmo, dla większej prywatności.
        </p>
      </div>
    </div>
  );
}
