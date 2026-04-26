
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function CTABlock() {
  return (
    <section className="py-32 relative overflow-hidden bg-background">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-purple-600/30 mix-blend-screen opacity-50 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.05] pointer-events-none"></div>
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-black mb-6">
          🎉 신규 가입자 전원 — 프로 플랜 14일 무료 체험
        </div>

        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          14일 동안 프로 기능을<br />
          전부 무료로 써보세요.
        </h2>
        <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto mb-12">
          카드 등록 없이 시작합니다. 14일 체험이 끝나도 무료 플랜으로 계속 사용 가능하며, 구독은 직접 원할 때만 시작됩니다.
        </p>

        <div className="flex flex-col items-center gap-6">
          <a href="/login">
            <Button size="lg" className="h-16 px-10 rounded-2xl text-xl font-black bg-foreground text-background hover:bg-muted-foreground shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all group flex items-center gap-3">
              14일 무료 체험 시작
              <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-bold text-muted-foreground mt-4">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 카드 등록 불필요
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 체험 후 자동 결제 없음
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 프로 기능 전부 이용 가능
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
