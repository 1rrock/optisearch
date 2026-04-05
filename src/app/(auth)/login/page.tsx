"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Login Card */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-muted/80 shadow-2xl rounded-3xl p-8 sm:p-12 relative z-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <Link href="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20">
              <Image src="/logo.png" alt="옵티써치 로고" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              옵티써치
            </span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">옵티써치에 오신 것을 환영합니다!</h1>
          <p className="text-sm text-muted-foreground">네이버 계정으로 로그인하고 분석을 시작하세요.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => signIn("naver", { callbackUrl })}
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-[#03C75A] hover:bg-[#02b34f] text-white font-bold text-md transition-colors shadow-sm gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 12.674L8.217 1H1v22h7V10.326L15.783 23H23V1h-7z" />
            </svg>
            네이버로 시작하기
          </Button>
        </div>

        <div className="mt-10 pt-6 border-t border-muted/50 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            계속 진행하면 <Link href="/terms" className="underline font-medium hover:text-foreground">이용약관</Link> 및 <Link href="/privacy" className="underline font-medium hover:text-foreground">개인정보처리방침</Link>에<br />동의하는 것으로 간주합니다.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
