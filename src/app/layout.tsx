import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { QueryProvider } from "@/shared/providers/query-provider";
import { SessionProvider } from "@/shared/providers/session-provider";
import { Toaster } from "@/shared/ui/sonner";
import { QuotaLimitModal } from "@/widgets/layout/ui/QuotaLimitModal";

import { UserStoreSync } from "@/shared/providers/user-store-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist } from "next/font/google";
import { cn } from "@/shared/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.optisearch.kr"),
  title: {
    default: "옵티써치 — 무료 키워드 분석 도구 + AI 블로그 최적화",
    template: "%s | 옵티써치",
  },
  description:
    "네이버 키워드 검색량, 경쟁도, 포화지수를 무료로 분석하고 AI가 블로그 상위노출 전략과 글 초안까지 자동 생성합니다. 키워드 분석부터 블로그 SEO 최적화까지 올인원.",
  keywords: [
    "키워드 분석",
    "키워드 분석 도구",
    "키워드 분석기",
    "네이버 키워드 분석",
    "키워드 검색량",
    "키워드 검색량 조회",
    "블로그 키워드 분석",
    "블로그 SEO",
    "블로그 상위노출",
    "네이버 블로그 상위노출",
    "AI 블로그 글쓰기",
    "AI 블로그 초안",
    "블로그 제목 추천",
    "블로그 제목 생성기",
    "콘텐츠 최적화",
    "SEO 분석 도구",
    "키워드 경쟁도",
    "키워드 트렌드",
    "블로그 수익화",
    "블랙키위 대안",
  ],
  openGraph: {
    title: "옵티써치 — 무료 키워드 분석 + AI 블로그 최적화",
    description:
      "네이버 키워드 검색량·경쟁도·포화지수 분석부터 AI 블로그 초안 생성까지. 무료로 시작하세요.",
    url: "https://www.optisearch.kr",
    siteName: "옵티써치",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "옵티써치 키워드 분석 대시보드" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "옵티써치 — 무료 키워드 분석 + AI 블로그 최적화",
    description: "키워드 분석부터 AI 블로그 초안 생성까지 올인원. 무료로 시작하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.optisearch.kr",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ? [process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION] : [],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "옵티써치 (OptiSearch)",
                description: "네이버 키워드 검색량, 경쟁도, 포화지수를 무료로 분석하고 AI가 블로그 글 초안까지 생성해주는 올인원 SEO 도구",
                url: "https://www.optisearch.kr",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                browserRequirements: "Requires JavaScript",
                inLanguage: "ko",
                offers: [
                  { "@type": "Offer", name: "무료 플랜", price: "0", priceCurrency: "KRW", description: "키워드 분석 10회/일, AI 경쟁분석 3회/일" },
                  { "@type": "Offer", name: "베이직 플랜", price: "9900", priceCurrency: "KRW", billingIncrement: "P1M", description: "키워드 분석 300회/일, AI 기능 20회/일" },
                ],
                featureList: [
                  "네이버 키워드 검색량 분석",
                  "키워드 경쟁도 및 포화지수 분석",
                  "S+~D- 키워드 등급 시스템",
                  "AI 블로그 경쟁 분석",
                  "AI 블로그 초안 자동 생성",
                  "블로그 SEO 점수 분석",
                  "AI 블로그 제목 추천",
                  "키워드 트렌드 차트",
                  "블로그 순위 추적",
                ],
                publisher: {
                  "@type": "Organization",
                  name: "알에이케이랩스",
                  url: "https://www.optisearch.kr",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.optisearch.kr/logo.png",
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: "070-8065-7571",
                    contactType: "customer service",
                    availableLanguage: "Korean",
                  },
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "옵티써치는 무료로 사용할 수 있나요?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "네, 가입 없이 무료 키워드 분석기, SEO 체크, 제목 생성기 등을 사용할 수 있습니다. 회원 가입 시 14일간 모든 프로 기능을 무료 체험할 수 있습니다.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "키워드 분석에서 어떤 데이터를 확인할 수 있나요?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "네이버 월간 검색량(PC/모바일), 경쟁도(낮음/중간/높음), 포화지수, S+~D- 등급, 클릭률, 추정 클릭수, 상위 인기글 분석, 연관 키워드까지 제공합니다.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "AI 기능은 어떤 것들이 있나요?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "AI 경쟁 분석(상위 글 공백 각도 발견), AI 블로그 초안 자동 생성(정보성/리뷰/리스트형/비교분석), AI 검색의도 분류, AI 콘텐츠 전략 제안 기능을 제공합니다.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "블랙키위와 어떤 차이가 있나요?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "블랙키위는 키워드 데이터만 제공하지만, 옵티써치는 AI 경쟁 분석, AI 초안 생성, 검색의도 분류까지 제공하여 '무엇을 어떻게 쓸지'까지 가이드합니다.",
                    },
                  },
                ],
              },
            ]),
          }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <UserStoreSync />
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
            <QuotaLimitModal />
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
