
import { MessageCircleQuestion, Sparkles } from "lucide-react";

const KIN_QUESTIONS = [
  "알러지있는 강아지 사료 추천 좀 해주세요",
  "만성변비 강아지 사료 추천해 주세요",
  "강아지 췌장염 사료 추천",
  "11개월 강아지 사료 추천해 주세요ㅠ",
];

export function SocialProof() {
  return (
    <section className="py-24 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
            검색량은 누구나 봅니다. <span className="text-primary">우리는 질문을 봅니다.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            &quot;강아지 사료 추천&quot; 키워드로 지식iN에 실제로 올라온 질문 4개입니다. ChatGPT는 이 데이터를 볼 수 없습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KIN_QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
            >
              <MessageCircleQuestion className="size-5 text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                &quot;{q}&quot;
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="w-px h-8 bg-border"></div>
          <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-2xl px-6 py-4 shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
            <Sparkles className="size-5 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground font-mono">AI 초안 소제목 →</span>
            <span className="text-lg font-black text-primary">알러지와 눈물 관리</span>
          </div>
        </div>
      </div>
    </section>
  );
}
