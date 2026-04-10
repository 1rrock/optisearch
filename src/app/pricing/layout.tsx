"use client";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-12 flex-1 w-full">
        {children}
      </div>
      <LandingFooter />
    </div>
  );
}
