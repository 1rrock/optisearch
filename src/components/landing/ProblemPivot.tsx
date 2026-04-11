
import { XCircle, CheckCircle2 } from "lucide-react";

export function ProblemPivot() {
  const oldWay = [
    "매일 아침 엑셀로 키워드 순위 수작업 정리",
    "순위 하락을 매출이 떨어진 뒤에야 뒤늦게 인지",
    "여기저기 흩어진 데이터 취합에 매일 2시간 낭비",
    "정확한 원인도 모른 채 어제와 똑같은 업무 반복"
  ];

  const newWay = [
    "매일 아침 자동화된 키워드 리포트 확인",
    "순위 변동 및 이상 징후 실시간 알림",
    "대시보드 하나로 모든 데이터 1분 만에 파악",
    "정확한 지표 기반으로 오늘 해야 할 일에 집중"
  ];

  return (
    <section className="py-32 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-6">
            엑셀 복사 붙여넣기에 <span className="text-destructive">시간을 낭비하지 마세요.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            반복되는 수작업과 뒤늦은 대응에서 벗어나, 키워드 조회부터 순위 모니터링까지 하나의 소프트웨어로 처리하세요.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="p-10 rounded-3xl bg-muted/30 border border-border shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <XCircle className="size-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold text-muted-foreground">기존 방식</h3>
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
              <h3 className="text-2xl font-black text-foreground drop-shadow-md">OptiSearch 솔루션</h3>
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
