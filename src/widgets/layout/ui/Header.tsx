"use client";

import { useRef, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { MobileNav } from "./MobileNav";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const pathMap: Record<string, string> = {
    "/dashboard": "대시보드",
    "/analyze": "키워드 분석",
    "/trends": "검색 트렌드",
    "/shopping": "쇼핑 인사이트",
    "/bulk": "대량 분석",
    "/compare": "키워드 비교",
    "/ai": "AI 도구",
    "/pricing": "가격 정책",
    "/settings": "설정",
  };

  const currentTitle = pathMap[pathname] || "프리미엄 분석";

  const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        router.push(`/analyze?keyword=${encodeURIComponent(value)}`);
        (e.target as HTMLInputElement).value = "";
      }
    }
  }, [router]);

  // CMD+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-8 transition-all">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h1 className="text-lg font-bold tracking-tight">{currentTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:flex items-center w-64">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            type="text"
            placeholder="빠른 키워드 검색 (CMD+K)"
            className="h-9 rounded-full pl-9 pr-4 bg-muted/50 border-input focus-visible:ring-2 focus-visible:bg-background"
            onKeyDown={handleSearch}
          />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
