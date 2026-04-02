import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  rightContent?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  icon,
  badge,
  rightContent,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4", className)} {...props}>
      <div className="space-y-2 flex-1">
        {badge && <div className="mb-2">{badge}</div>}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          {icon && <span className="text-primary flex-shrink-0">{icon}</span>}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-muted-foreground font-medium max-w-2xl mt-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {rightContent && (
        <div className="flex-shrink-0 w-full md:w-auto">
          {rightContent}
        </div>
      )}
    </div>
  )
}
