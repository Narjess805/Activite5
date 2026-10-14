import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  light?: boolean;
}

export default function BrandLogo({
  className,
  compact = false,
  light = false,
}: BrandLogoProps) {
  const labelTone = light ? "text-white" : "text-foreground";
  const subTone = light ? "text-white/62" : "text-muted-foreground";
  const markShell = light
    ? "bg-[linear-gradient(145deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08))] border-white/18"
    : "bg-[linear-gradient(145deg,hsl(var(--foreground)),hsl(var(--primary)))] border-white/20";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.45rem] border shadow-[0_20px_40px_-24px_rgba(20,42,36,0.45)]",
          markShell
        )}
      >
        <div className="absolute inset-[0.72rem] rounded-[0.95rem] border border-white/22" />
        <div className="absolute left-[0.8rem] top-[0.85rem] h-[1.7rem] w-[0.38rem] rotate-[28deg] rounded-full bg-white/90" />
        <div className="absolute left-[1.45rem] top-[1rem] h-[1.42rem] w-[0.38rem] rotate-[28deg] rounded-full bg-[hsl(var(--secondary))]" />
        <div className="absolute left-[2.05rem] top-[1.2rem] h-[1.06rem] w-[0.38rem] rotate-[28deg] rounded-full bg-[hsl(var(--accent))]" />
        <div className="absolute right-[0.48rem] top-[0.48rem] h-2.5 w-2.5 rounded-full border border-white/35 bg-white/80" />
      </div>

      {!compact && (
        <div className="min-w-0">
          <p className={cn("text-[0.68rem] font-semibold uppercase tracking-[0.28em]", subTone)}>
            Lunexa Academy
          </p>
          <span className={cn("block truncate font-display text-[1.8rem] leading-none", labelTone)}>
            Learning, reimagined
          </span>
        </div>
      )}
    </div>
  );
}
