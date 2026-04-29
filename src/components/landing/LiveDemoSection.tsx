"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, ArrowRight, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useRouter } from "next/navigation";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const EXAMPLE_KEYWORDS = ["강아지 사료", "다이어트 식단", "재테크 입문"];

interface DemoResult {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: "낮음" | "중간" | "높음";
  saturation: number;
  interpretation: string;
  titles: string[];
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string | undefined;
      reset: (id?: string) => void;
    };
  }
}

export function LiveDemoSection() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Turnstile script 로드 + 명시 렌더링
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current) return;
      if (widgetIdRef.current) return;
      const id = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        theme: "dark",
      });
      widgetIdRef.current = id ?? null;
    };

    // 이미 script가 로드돼 있으면 바로 렌더
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderWidget, { once: true });
    document.head.appendChild(script);
  }, []);

  async function handleSubmit(kw?: string) {
    const target = (kw ?? keyword).trim();
    if (!target) return;

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("CAPTCHA를 완료해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRateLimited(false);

    try {
      const res = await fetch("/api/public/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: target,
          turnstileToken: turnstileToken || "dev-bypass",
        }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as DemoResult;
      setResult(data);
    } catch {
      setError("네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  function handleExampleClick(kw: string) {
    setKeyword(kw);
    handleSubmit(kw);
  }

  const competitionColor =
    result?.competition === "낮음"
      ? "text-primary"
      : result?.competition === "중간"
      ? "text-amber-400"
      : "text-destructive";

  return (
    <section
      id="live-demo"
      className="relative py-32 bg-background border-y border-border overflow-hidden"
    >
      {/* 배경 그라디언트 효과 (다른 섹션과 톤 통일) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 z-10">
        {/* 헤더 */}
        <div className="text-center mb-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-widest shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
            <Sparkles className="w-3 h-3" />
            가입 없이 1회 무료 체험
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            직접 보여드릴게요.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
              키워드 1개 입력해보세요.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            검색량, 경쟁도, 포화 지수와 추천 블로그 제목 3개까지 한 번에 확인하세요.
          </p>
        </div>

        {/* Mock 콘솔 스타일 컨테이너 */}
        <div className="relative bg-muted/30 backdrop-blur-xl border border-border rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] pointer-events-none rounded-3xl"></div>

          {/* 콘솔 헤더 라인 */}
          <div className="flex justify-between items-center mb-8 border-b border-border/80 pb-4 relative z-10">
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              LIVE DEMO · 실시간 분석
            </span>
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-border"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-pulse"></span>
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="space-y-5 relative z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10 h-12 text-base bg-background/60 border-border/80 font-medium"
                  placeholder="키워드를 입력하세요 (예: 강아지 사료)"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  maxLength={50}
                />
              </div>
              <Button
                className="h-12 px-7 font-bold text-base shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-shadow"
                onClick={() => handleSubmit()}
                disabled={loading || !keyword.trim()}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    분석하기
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* 예시 칩 */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-mono">EXAMPLES:</span>
              {EXAMPLE_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleExampleClick(kw)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full border border-border bg-background/50 text-sm text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Turnstile 위젯 */}
            {TURNSTILE_SITE_KEY && (
              <div ref={turnstileContainerRef} className="pt-2" />
            )}
          </div>

          {/* 에러 */}
          {error && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium relative z-10">
              {error}
            </div>
          )}

          {/* Rate limited */}
          {rateLimited && (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-4 relative z-10">
              <p className="text-base font-bold text-foreground">
                이미 한 번 체험하셨어요.
              </p>
              <p className="text-sm text-muted-foreground">
                무료 가입하면 일 3회까지 사용할 수 있어요.
              </p>
              <Button onClick={() => router.push("/login")} className="gap-2">
                무료 가입하기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 결과 카드 */}
          {result && (
            <div className="mt-8 space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* 데이터 그리드 */}
              <div className="rounded-2xl border border-border/80 bg-background/60 backdrop-blur-sm shadow-inner p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    데이터 — {result.keyword}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="총 검색량"
                    value={result.totalSearchVolume.toLocaleString()}
                    unit="회/월"
                  />
                  <StatCard
                    label="PC"
                    value={result.pcSearchVolume.toLocaleString()}
                    unit="회/월"
                  />
                  <StatCard
                    label="모바일"
                    value={result.mobileSearchVolume.toLocaleString()}
                    unit="회/월"
                  />
                  <div className="rounded-xl bg-muted/40 border border-border/50 p-4 space-y-1">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                      경쟁도
                    </p>
                    <p className={`text-2xl font-black ${competitionColor}`}>
                      {result.competition}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      포화 {(result.saturation * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 해석 */}
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-background/60 shadow-[0_0_30px_hsl(var(--primary)/0.1)] p-6 space-y-3">
                <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold tracking-widest drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  키워드 해석
                </div>
                <p className="text-base md:text-lg text-foreground leading-relaxed font-medium">
                  {result.interpretation}
                </p>
              </div>

              {/* 추천 제목 */}
              <div className="rounded-2xl border border-border/80 bg-background/60 backdrop-blur-sm shadow-inner p-6 space-y-4">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  추천 블로그 제목
                </h3>
                <ol className="space-y-2.5">
                  {result.titles.map((title, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-muted/40 border border-border/50 px-4 py-3.5 hover:border-primary/30 transition-colors"
                    >
                      <span className="text-xs font-black text-primary mt-1 w-5 shrink-0 font-mono">
                        0{i + 1}
                      </span>
                      <span className="text-sm md:text-base text-foreground font-medium leading-snug">
                        {title}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* CTA */}
              <div className="text-center pt-4">
                <Button
                  size="lg"
                  className="h-14 px-8 gap-2 font-black text-base shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)] hover:scale-[1.02] transition-all"
                  onClick={() => router.push("/login")}
                >
                  무료 가입하고 글 초안까지 받기
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/50 p-4 space-y-1">
      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{unit}</p>
    </div>
  );
}
