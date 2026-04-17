import Script from "next/script";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9970402588626346"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <LandingHeader />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-12 flex-1 w-full">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}
