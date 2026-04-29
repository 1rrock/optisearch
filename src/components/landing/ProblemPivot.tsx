
import { XCircle, CheckCircle2 } from "lucide-react";

export function ProblemPivot() {
  const oldWay = [
    "키워드 데이터를 봐도 뭘 골라야 할지 모르겠어요",
    "키워드는 찾았는데 글로 어떻게 풀지 막막해요",
    "글 한 편 쓰는 데 시간이 너무 오래 걸려요",
    "순위 떨어진 글을 한참 뒤에야 발견해요"
  ];

  const newWay = [
    "검색량·경쟁도를 자연어로 풀어줘서 바로 결정해요",
    "추천 제목 3개와 글 뼈대를 자동으로 받아요",
    "한 화면에서 분석부터 초안까지 끝내요",
    "순위 변동을 매일 알림으로 받아 즉시 대응해요"
  ];

  return (
    <section className="py-32 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-6">
            블로그 부업, <span className="text-destructive">이런 적 있으시죠?</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            키워드 고르기부터 글 쓰기까지, 1인 블로거가 자주 막히는 지점을 한 화면에서 풀어드려요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="p-10 rounded-3xl bg-muted/30 border border-border shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <XCircle className="size-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold text-muted-foreground">이런 상황</h3>
            </div>
            <ul className="space-y-6 relative z-10">
              {oldWay.map((item, i) => (
                <li key={i} className="flex items-start gap-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  <XCircle className="size-6 text-destructive/50 mt-0.5 shrink-0" />
                  <span className="text-lg text-muted-foreground font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-10 rounded-3xl bg-gradient-to-b from-primary/10 to-background border border-primary/30 shadow-[0_0_50px_hsl(var(--primary)/0.1)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                <CheckCircle2 className="size-6 text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.8)]" />
              </div>
              <h3 className="text-2xl font-black text-foreground drop-shadow-md">OptiSearch와 함께</h3>
            </div>
            <ul className="space-y-6 relative z-10">
              {newWay.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <CheckCircle2 className="size-6 text-primary mt-0.5 shrink-0 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                  <span className="text-lg text-foreground font-bold tracking-wide">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
