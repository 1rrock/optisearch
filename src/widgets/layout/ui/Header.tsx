"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ThemeToggle } from "@/shared/components/theme-toggle";

export function Header() {
  const pathname = usePathname();

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-8 transition-all">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">{currentTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:flex items-center w-64">
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          <Input type="text" placeholder="빠른 키워드 검색 (CMD+K)" className="h-9 rounded-full pl-9 pr-4 bg-muted/50 border-input focus-visible:ring-2 focus-visible:bg-background" />
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted relative">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-background" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
