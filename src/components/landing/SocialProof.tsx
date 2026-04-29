
const stats = [
  "네이버 공식 검색 데이터",
  "검색량+경쟁도 즉시 확인",
  "데이터를 자연어로 해석",
  "추천 제목 + 글 초안 생성",
  "글 순위 변동 자동 알림",
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
