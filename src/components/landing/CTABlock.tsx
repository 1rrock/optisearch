
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
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          데이터 기반 키워드 분석,<br />
          지금 바로 시작하세요.
        </h2>
        <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto mb-12">
          불확실한 예측 대신 명확한 지표를 확인하세요. 객관적인 검색 데이터로 더 나은 의사결정을 내릴 수 있습니다.
        </p>

        <div className="flex flex-col items-center gap-6">
          <a href="/login">
            <Button size="lg" className="h-16 px-10 rounded-2xl text-xl font-black bg-foreground text-background hover:bg-muted-foreground shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all group flex items-center gap-3">
              무료로 시작하기
              <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-bold text-muted-foreground mt-4">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 언제든 해지 가능
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 카드 등록 없이 진단 시작
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> 24시간마다 데이터 자동 갱신
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
