import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { QueryProvider } from "@/shared/providers/query-provider";
import { SessionProvider } from "@/shared/providers/session-provider";
import { Geist } from "next/font/google";
import { cn } from "@/shared/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "옵티써치 - 네이버 키워드 분석 + AI 콘텐츠 최적화",
  description: "옵티써치 - 네이버 키워드 분석 + AI 콘텐츠 최적화",
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
