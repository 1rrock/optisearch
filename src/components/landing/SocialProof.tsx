
const stats = [
  "네이버 검색광고 API 연동",
  "키워드 수익성 점수 자동 산출",
  "실시간 순위 변동 모니터링",
  "대량 키워드 일괄 분석",
  "데이터 기반 의사결정 지원",
];

const repeatedStats = [...stats, ...stats];

function MarqueeTrack({ className }: { className?: string }) {
  return (
    <div className={`flex w-max space-x-12 px-6 ${className ?? ""}`}>
      {repeatedStats.map((stat, i) => (
        <div key={`${stat}-${i}`} className="flex items-center space-x-12 whitespace-nowrap">
          <span className="text-primary-foreground font-black text-xl tracking-widest uppercase">
            {stat}
          </span>
          <span className="text-primary-foreground/50 text-xl font-black">/</span>
        </div>
      ))}
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="bg-primary py-4 overflow-hidden border-y border-primary/80">
      <div className="relative flex max-w-[100vw] overflow-hidden group">
        <MarqueeTrack className="animate-marquee" />
        <MarqueeTrack className="absolute top-0 animate-marquee2" />
      </div>
    </section>
  );
}
