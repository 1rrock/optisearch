import type { Metadata } from "next";
import { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BusinessInfo } from "@/components/layout/BusinessInfo";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center">
        {children}
      </main>
      {/* 전자상거래법 표시 의무. 네이버 로그인 검수는 로그인 화면에서도 이 정보를 확인한다. */}
      <footer className="border-t border-border py-6 px-6">
        <BusinessInfo className="max-w-7xl mx-auto text-center" />
      </footer>
    </div>
  );
}
