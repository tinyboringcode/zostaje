"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Wraps page content with a smooth enter animation on route change.
 * Uses a key derived from pathname — when the path changes, the div
 * unmounts and remounts, triggering the CSS animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayKey, setDisplayKey] = useState(pathname);
  const [isExiting, setIsExiting] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathname.current) return;

    // Trigger exit → then swap content
    setIsExiting(true);
    const t = setTimeout(() => {
      setDisplayKey(pathname);
      setIsExiting(false);
      prevPathname.current = pathname;
    }, 100); // match exit duration

    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      key={displayKey}
      style={{
        animation: isExiting
          ? "page-exit 100ms ease forwards"
          : "page-enter 240ms cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {children}
    </div>
  );
}
