
import { Search, Settings, Trophy } from "lucide-react";

export function Workflow() {
  return (
    <section className="py-32 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            체계적인 데이터 분석 프로세스
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            키워드 수집부터 순위 모니터링까지, 데이터 기반의 일관된 의사결정을 지원합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px bg-border -translate-y-1/2 pointer-events-none"></div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Search className="size-8 text-primary" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-primary/10 transition-colors">01</div>
            <h3 className="text-2xl font-black text-foreground mb-4">데이터 수집</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              분석할 기준 키워드를 입력하면, 연관 검색어부터 경쟁 상품 수, 평균 단가 등 시장 파악에 필요한 핵심 지표를 자동으로 수집합니다.
            </p>
          </div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl md:mt-12">
            <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Settings className="size-8 text-accent" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-accent/10 transition-colors">02</div>
            <h3 className="text-2xl font-black text-foreground mb-4">지표 분석</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              수집된 원시 데이터를 바탕으로 실제 경쟁 강도와 예상 마진율을 계산하여, 진입 가치가 높은 타겟 키워드를 효율적으로 선별합니다.
            </p>
          </div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl md:mt-24">
            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Trophy className="size-8 text-purple-400" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-purple-400/10 transition-colors">03</div>
            <h3 className="text-2xl font-black text-foreground mb-4">지속 모니터링</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              최적화된 상품의 일별 노출 순위를 기록하고, 급격한 하락 등 특이 변동이 감지될 경우 관리자에게 즉각적인 알림을 발송합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
