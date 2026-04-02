import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { QueryProvider } from "@/shared/providers/query-provider";
import { SessionProvider } from "@/shared/providers/session-provider";
import { Geist } from "next/font/google";
import { cn } from "@/shared/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "옵티써치 - 네이버 키워드 분석 + AI 콘텐츠 최적화",
    template: "%s | 옵티써치",
  },
  description: "블랙키위보다 저렴한 네이버 키워드 분석 도구. AI가 블로그 제목 추천, 글 초안 생성, SEO 점수 분석까지. 무료로 시작하세요.",
  keywords: ["네이버 키워드 분석", "블로그 SEO", "키워드 검색량", "AI 블로그", "콘텐츠 최적화", "블랙키위 대안"],
  openGraph: {
    title: "옵티써치 - 네이버 키워드 분석 + AI 콘텐츠 최적화",
    description: "블랙키위보다 저렴한 네이버 키워드 분석 도구. AI가 블로그 제목 추천, 글 초안 생성, SEO 점수 분석까지.",
    url: "https://optisearch-ochre.vercel.app",
    siteName: "옵티써치",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://optisearch-ochre.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <QueryProvider>{children}</QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
