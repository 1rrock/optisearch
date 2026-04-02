"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  ChevronUp,
  Bookmark,
  CreditCard,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const userName = session?.user?.name ?? "사용자";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card/60 backdrop-blur-md md:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-primary/20">
            <Image src="/logo.png" alt="옵티써치 로고" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            옵티써치
          </span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 scrollbar-hide">
        <nav className="flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">분석</div>
          <NavItem href="/dashboard" icon={<Home className="size-4" />} label="대시보드" active={pathname === "/dashboard"} />
          <NavItem href="/analyze" icon={<Search className="size-4" />} label="키워드 분석" active={pathname === "/analyze"} />
          <NavItem href="/keywords" icon={<Bookmark className="size-4" />} label="저장된 키워드" active={pathname === "/keywords"} />
          <NavItem href="/trends" icon={<LineChart className="size-4" />} label="트렌드" active={pathname === "/trends"} />
          <NavItem href="/shopping" icon={<ShoppingBag className="size-4" />} label="쇼핑 인사이트" active={pathname === "/shopping"} />

          <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4">고급 도구</div>
          <NavItem href="/bulk" icon={<Layers className="size-4" />} label="대량 분석" active={pathname === "/bulk"} />
          <NavItem href="/compare" icon={<ListPlus className="size-4" />} label="키워드 비교" active={pathname === "/compare"} />
          <NavItem href="/ai" icon={<Sparkles className="size-4" />} label="AI 도구" active={pathname === "/ai"} />

          <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mt-4">계정</div>
          <NavItem href="/pricing" icon={<CreditCard className="size-4" />} label="요금제" active={pathname === "/pricing"} />
        </nav>
      </div>
      <div className="mt-auto p-4 border-t bg-card/50 relative" ref={menuRef}>
        {/* Popup menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-muted/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="size-4" />
              설정
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors w-full cursor-pointer"
            >
              <LogOut className="size-4" />
              로그아웃
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 rounded-xl border bg-background/50 p-3 hover:bg-accent cursor-pointer transition-colors w-full"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0">
            {userInitial}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-sm font-semibold truncate">{userName}</span>
            <span className="text-xs text-emerald-500 font-medium truncate">
              {PLAN_PRICING.free.label} 플랜
            </span>
          </div>
          <ChevronUp className={cn("size-4 ml-auto text-muted-foreground transition-transform shrink-0", menuOpen && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 mx-1 transition-all group relative",
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <div className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
      {active && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />}
    </Link>
  );
}
