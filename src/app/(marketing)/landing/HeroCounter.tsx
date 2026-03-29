"use client";
import { useEffect, useRef, useState } from "react";

const TARGET = 5224;
const DURATION = 1800;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroCounter() {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      setValue(Math.floor(easeOutCubic(progress) * TARGET));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(TARGET);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const formatted = value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(48px, 9vw, 84px)",
        fontWeight: 400,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        color: "var(--green)",
        display: "block",
      }}
    >
      +{formatted} zł
    </span>
  );
}
