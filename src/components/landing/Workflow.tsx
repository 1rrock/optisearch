
import { Search, MessageSquare, PenLine } from "lucide-react";

export function Workflow() {
  return (
    <section className="py-32 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            쓰는 법은 단순해요
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            키워드 1개 입력으로 분석부터 글 초안까지 한 흐름으로 끝나요.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px bg-border -translate-y-1/2 pointer-events-none"></div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Search className="size-8 text-primary" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-primary/10 transition-colors">01</div>
            <h3 className="text-2xl font-black text-foreground mb-4">키워드 입력</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              떠오르는 주제 1개만 적으면 검색량·경쟁도·콘텐츠 포화 지수까지 즉시 가져옵니다.
            </p>
          </div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl md:mt-12">
            <div className="w-16 h-16 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="size-8 text-accent" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-accent/10 transition-colors">02</div>
            <h3 className="text-2xl font-black text-foreground mb-4">분석 받기</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              데이터를 자연어로 풀어주고, 1인 블로거가 들어갈 만한 연관 키워드까지 추천해드려요.
            </p>
          </div>

          <div className="bg-muted/50 border border-border p-8 rounded-3xl relative group hover:-translate-y-2 transition-transform duration-300 shadow-2xl md:mt-24">
            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <PenLine className="size-8 text-purple-400" />
            </div>
            <div className="absolute top-8 right-8 text-6xl font-black text-muted-foreground/10 pointer-events-none select-none group-hover:text-purple-400/10 transition-colors">03</div>
            <h3 className="text-2xl font-black text-foreground mb-4">글 초안 받기</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              추천 제목 3개와 본문 뼈대를 자동 생성해드려요. 발행 후엔 자동으로 순위까지 추적합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
