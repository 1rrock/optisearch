"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/shared/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-muted/50 bg-muted/30 p-0.5 transition-colors cursor-pointer",
          className
        )}
        aria-label="Toggle theme"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm transition-transform translate-x-0">
          <Sun className="size-3.5 text-muted-foreground" />
        </span>
      </button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer",
        isDark
          ? "bg-primary/20 border border-primary/30"
          : "bg-amber-100 dark:bg-muted/30 border border-amber-200 dark:border-muted/50",
        className
      )}
      aria-label="Toggle theme"
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-200",
          isDark
            ? "translate-x-6 bg-primary/30"
            : "translate-x-0 bg-white"
        )}
      >
        {isDark ? (
          <Moon className="size-3.5 text-primary" />
        ) : (
          <Sun className="size-3.5 text-amber-500" />
        )}
      </span>
    </button>
  )
}
