"use client";

import * as React from "react";
import { keystore } from "@/lib/keystore";
import { EncryptionError } from "@/lib/crypto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LockScreenProps {
  mode: "setup" | "unlock";
  onUnlocked: () => void;
}

export function LockScreen({ mode, onUnlocked }: LockScreenProps) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }

  async function handleUnlock() {
    setError(null);
    if (!password) {
      setError("Wprowadź hasło");
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await keystore.unlock(password);
      setPassword("");
      onUnlocked();
    } catch (err) {
      if (err instanceof EncryptionError) {
        setError("Nieprawidłowe hasło");
      } else {
        setError((err as Error).message || "Nie udało się odblokować skarbca");
      }
      triggerShake();
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    setError(null);
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków");
      triggerShake();
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są identyczne");
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await keystore.setup(password);
      setPassword("");
      setConfirm("");
      onUnlocked();
    } catch (err) {
      setError((err as Error).message || "Nie udało się utworzyć skarbca");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (mode === "setup") handleSetup();
    else handleUnlock();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div
        className={cn(
          "w-full max-w-sm space-y-6 text-center transition-transform",
          shake && "animate-[shake_0.4s_ease-in-out]"
        )}
      >
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">zostaje.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "setup" ? "Ustaw hasło do skarbca" : "Twoje dane są zaszyfrowane lokalnie"}
          </p>
        </div>

        <div className="space-y-3 text-left">
          <Input
            ref={inputRef}
            type="password"
            placeholder="hasło do skarbca"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
          />
          {mode === "setup" && (
            <Input
              type="password"
              placeholder="powtórz hasło"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              autoComplete="new-password"
            />
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={mode === "setup" ? handleSetup : handleUnlock}
            disabled={loading}
          >
            {mode === "setup" ? "Utwórz skarbiec" : "Odblokuj"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {mode === "setup"
            ? "Zapamiętaj to hasło. Bez niego dane są nie do odzyskania."
            : "Nie ma opcji odzyskania hasła. Przechowaj je bezpiecznie."}
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
