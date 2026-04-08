
import { CheckCircle2, X, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PLAN_PRICING, type PlanId } from "@/shared/config/constants";

type FeatureValue = string | boolean;

interface HighlightFeature {
  label: string;
  free: FeatureValue;
  basic: FeatureValue;
  pro: FeatureValue;
}

const HIGHLIGHT_FEATURES: HighlightFeature[] = [
  { label: "키워드 검색", free: "10회/일", basic: "300회/일", pro: "무제한" },
  { label: "AI 제목 추천", free: "3회/일", basic: "20회/일", pro: "100회/일" },
  { label: "쇼핑 인사이트", free: false, basic: true, pro: true },
  { label: "대량 키워드 분석", free: false, basic: "50개/회", pro: "500개/회" },
  { label: "트렌드 분석", free: "3개월", basic: "1년", pro: "전체" },
];

const PLAN_ORDER: { id: PlanId; isPopular?: boolean }[] = [
  { id: "free" },
  { id: "basic", isPopular: true },
  { id: "pro" },
];

function FeatureRow({ value }: { value: FeatureValue }) {
  if (!value) {
    return <X className="size-4 text-muted-foreground/40" />;
  }
  return <CheckCircle2 className="size-4 text-primary" />;
}

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            합리적인 요금제
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            무료로 시작하고, 필요에 따라 확장하세요.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PLAN_ORDER.map(({ id, isPopular }) => {
            const pricing = PLAN_PRICING[id];
            return (
              <div
                key={id}
                className={[
                  "relative flex flex-col rounded-3xl p-8 transition-all",
                  isPopular
                    ? "border-2 border-primary bg-primary/5 shadow-[0_0_40px_hsl(var(--primary)/0.15)] md:scale-[1.03] z-10"
                    : "border border-border bg-muted/30 hover:border-primary/30",
                ].join(" ")}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-primary/30">
                    인기
                  </div>
                )}

                {/* Plan name + price */}
                <div className="mb-6">
                  <span className={`text-lg font-bold ${isPopular ? "text-primary" : "text-muted-foreground"}`}>
                    {pricing.label}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-foreground">
                      ₩{pricing.monthly.toLocaleString()}
                    </span>
                    {pricing.monthly > 0 && (
                      <span className="text-sm font-semibold text-muted-foreground">/월</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {HIGHLIGHT_FEATURES.map((f) => {
                    const val = f[id];
                    return (
                      <li key={f.label} className="flex items-center gap-3">
                        <div className="shrink-0 w-5 flex justify-center">
                          <FeatureRow value={val} />
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            val === false ? "text-muted-foreground/50 line-through" : "text-foreground"
                          }`}
                        >
                          {f.label}
                          {typeof val === "string" && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">({val})</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <a href="/pricing">
                  <Button
                    size="lg"
                    variant={isPopular ? "default" : "outline"}
                    className={[
                      "w-full rounded-xl font-bold h-12 group",
                      isPopular
                        ? "bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                        : "hover:border-primary/50 transition-colors",
                    ].join(" ")}
                  >
                    자세히 보기
                    <ArrowRight className="size-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
