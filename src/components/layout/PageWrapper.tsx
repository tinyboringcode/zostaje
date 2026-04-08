"use client";

import { cn } from "@/lib/utils";

const MAX_WIDTH = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "",
} as const;

interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageWrapper({
  children,
  maxWidth = "xl",
  title,
  description,
  actions,
  className,
}: PageWrapperProps) {
  return (
    <div
      className={cn(
        "animate-fade-in space-y-6 px-4 py-6 md:px-0 md:py-0",
        MAX_WIDTH[maxWidth],
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {title && (
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-3)" }}>
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
