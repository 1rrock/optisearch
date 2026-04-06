"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: size, height: size }} className={cn("bg-muted rounded-lg animate-pulse", className)} />;
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";
  
  // OKLCH Colors (as strings for raw SVG)
  // Light: Cyber Teal (oklch(0.55 0.13 180))
  // Dark: Neon Mint (oklch(0.75 0.15 175))
  const primaryColor = isDark ? "oklch(0.75 0.15 175)" : "oklch(0.55 0.13 180)";
  const accentColor = isDark ? "oklch(0.85 0.15 150)" : "oklch(0.60 0.12 180)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-colors duration-300", className)}
    >
      {/* Search Lens Frame */}
      <circle
        cx="14"
        cy="14"
        r="11"
        stroke={primaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        className="drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]"
      />
      
      {/* Magnifying Glass Handle */}
      <path
        d="M22 22L29 29"
        stroke={primaryColor}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Growth Chart - Bar 1 (Shortest) */}
      <rect
        x="8"
        y="16"
        width="3"
        height="4"
        rx="1.5"
        fill={accentColor}
      />
      
      {/* Growth Chart - Bar 2 (Medium) */}
      <rect
        x="12.5"
        y="12"
        width="3"
        height="8"
        rx="1.5"
        fill={primaryColor}
      />
      
      {/* Growth Chart - Bar 3 (Tallest) */}
      <rect
        x="17"
        y="8"
        width="3"
        height="12"
        rx="1.5"
        fill={accentColor}
      />
      
      {/* Subtle Data Dot */}
      <circle cx="21" cy="6" r="1.5" fill={primaryColor} className="animate-pulse" />
    </svg>
  );
}
