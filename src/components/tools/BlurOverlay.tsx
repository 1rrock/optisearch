"use client"

import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

export interface BlurOverlayProps {
  children: React.ReactNode
  ctaText?: string
  ctaHref?: string
  title?: string
  description?: string
}

export function BlurOverlay({
  children,
  ctaText = "무료 회원가입으로 전체 결과 보기",
  ctaHref = "/login?callbackUrl=/dashboard",
  title,
  description,
}: BlurOverlayProps) {
  return (
    <div className="relative rounded-xl border overflow-hidden">
      <div className="filter blur-md select-none pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm p-6 text-center">
        <LockKeyhole className="w-10 h-10 text-muted-foreground mb-3" />
        {title && (
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        <Link href={ctaHref} className={cn(buttonVariants({ variant: "default", size: "default" }))}>
          {ctaText}
        </Link>
      </div>
    </div>
  )
}
