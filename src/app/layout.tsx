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
  title: {
    default: "옵티써치 - 키워드 분석 + AI 콘텐츠 최적화",
    template: "%s | 옵티써치",
  },
  description: "키워드 분석부터 AI 블로그 제목 추천, 글 초안 생성, SEO 점수 분석까지. 무료로 시작하세요.",
  keywords: ["키워드 분석", "블로그 SEO", "키워드 검색량", "AI 블로그", "콘텐츠 최적화", "키워드 분석 도구"],
  openGraph: {
    title: "옵티써치 - 키워드 분석 + AI 콘텐츠 최적화",
    description: "키워드 분석부터 AI 블로그 제목 추천, 글 초안 생성, SEO 점수 분석까지. 무료로 시작하세요.",
    url: "https://www.optisearch.kr",
    siteName: "옵티써치",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  robots: {
    index: true,
    follow: true,
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
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "옵티써치 (OptiSearch)",
              description: "키워드 분석부터 AI 블로그 제목 추천, 글 초안 생성, SEO 점수 분석까지 제공하는 콘텐츠 마케팅 도구",
              url: "https://www.optisearch.kr",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              inLanguage: "ko",
              offers: [
                { "@type": "Offer", name: "무료 플랜", price: "0", priceCurrency: "KRW" },
                { "@type": "Offer", name: "베이직 플랜", price: "9900", priceCurrency: "KRW", billingIncrement: "P1M" },
              ],
              publisher: {
                "@type": "Organization",
                name: "알에이케이랩스",
                url: "https://www.optisearch.kr",
                logo: "https://www.optisearch.kr/logo.png",
                contactPoint: {
                  "@type": "ContactPoint",
                  telephone: "070-8065-7571",
                  contactType: "customer service",
                  availableLanguage: "Korean",
                },
              },
            }),
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
