"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import {
  Home,
  Search,
  LineChart,
  Layers,
  Sparkles,
  ShoppingBag,
  ListPlus,
  LogOut,
  Settings,
  Bookmark,
  Menu,
  Zap,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PLAN_PRICING } from "@/shared/config/constants";
import { useUserName, useUserPlan } from "@/shared/hooks/use-user";
import { useQuotaStore } from "@/shared/stores/quota-store";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";

const NAV_ITEMS = [
  {
    section: "분석", items: [
      { href: "/dashboard", icon: Home, label: "대시보드" },
      { href: "/analyze", icon: Search, label: "키워드 분석" },
      { href: "/keywords", icon: Bookmark, label: "저장된 키워드" },
      { href: "/trends", icon: LineChart, label: "트렌드" },
      { href: "/shopping", icon: ShoppingBag, label: "쇼핑 인사이트" },
    ]
  },
  {
    section: "고급 도구", items: [
      { href: "/bulk", icon: Layers, label: "대량 분석" },
      { href: "/compare", icon: ListPlus, label: "키워드 비교" },
      { href: "/ai", icon: Sparkles, label: "AI 도구" },
    ]
  },
  {
    section: "계정", items: [
      { href: "/settings", icon: Settings, label: "설정" },
    ]
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const userPlan = useUserPlan();
  const userName = useUserName() ?? "사용자";
  const userInitial = userName.charAt(0).toUpperCase();
  const { limit, remaining } = useQuotaStore();
  const percentage = limit > 0 ? ((limit - remaining) / limit) * 100 : 100;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col" showCloseButton={false}>
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="옵티써치" width={28} height={28} className="w-full h-full object-cover" />
            </div>

            <span className="text-lg font-extrabold tracking-tighter">옵티써치</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map((group) => (
            <div key={group.section} className="mb-3">
              <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {group.section}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-sm",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t p-3">
          <div className="mb-3 flex items-center gap-3 bg-muted/30 px-3 py-2 rounded-lg border border-border">
            <Zap className="size-4 text-emerald-500" />
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center text-[10px] font-medium leading-none">
                <span className="text-muted-foreground">일일 분석</span>
                <span className="text-emerald-500">{remaining} / {limit}</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500 ease-in-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
              {userInitial}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{userName}</span>
              <span className={cn(
                "text-xs font-medium",
                userPlan === "pro" ? "text-violet-500" : userPlan === "basic" ? "text-blue-500" : "text-emerald-500"
              )}>
                {PLAN_PRICING[userPlan].label} 플랜
              </span>
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
            로그아웃
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
