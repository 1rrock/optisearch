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
          <p className="text-sm text-muted-foreground">소셜 계정으로 로그인하고 분석을 시작하세요.</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => signIn("google", { callbackUrl })}
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-white hover:bg-gray-50 text-[#3c4043] font-bold text-md transition-colors shadow-sm gap-3 border border-gray-300"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            구글로 시작하기
          </Button>

          <Button
            onClick={() => signIn("kakao", { callbackUrl })}
            className="flex items-center justify-center w-full h-14 rounded-2xl bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-bold text-md transition-colors shadow-sm gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.726 1.8 5.117 4.508 6.482-.144.522-.928 3.37-.962 3.581 0 0-.02.166.087.229.107.063.232.03.232.03.306-.043 3.548-2.326 4.11-2.72.652.096 1.326.147 2.025.147 5.523 0 10-3.463 10-7.749C22 6.463 17.523 3 12 3" fill="#191919" />
            </svg>
            카카오로 시작하기
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
