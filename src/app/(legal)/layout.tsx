import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

// robots metadata 제거 — 각 페이지(about/terms/privacy 등)의 metadata.robots를 따름
// (이전: layout이 noindex로 상속되어 about 등 색인 원하는 페이지까지 차단됨)

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />
      <div className="max-w-4xl mx-auto px-6 pt-28 pb-12 flex-1 w-full">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}
