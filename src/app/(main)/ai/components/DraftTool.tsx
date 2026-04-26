"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  RefreshCcw,
  Edit3,
  LayoutTemplate,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { copyToClipboard } from "@/shared/lib/clipboard";
import { parseUsageLimitError } from "@/shared/lib/errors";
import { UsageBar, PlanLockOverlay, type UpgradeModalState } from "./shared";
import type { AICompetitiveAnalysis } from "@/entities/analysis/model/types";

type AnalysisContext = Pick<AICompetitiveAnalysis, "uncoveredTopics" | "recommendedTitles" | "strategySummary">;

type PostType = "정보성" | "리뷰" | "리스트형" | "비교분석";
type DraftLength = "500" | "1000" | "1500" | "2500";

interface StreamedMeta {
  suggestedTitle: string;
  outline: string[];
  tags: string[];
}

// ─── DraftTool ────────────────────────────────────────────────────────────────

export function DraftTool({
  onUsageLimitExceeded,
  used,
  limit,
  onMutationSuccess,
  initialKeyword,
  initialHint,
  analysisContext,
}: {
  onUsageLimitExceeded: (state: UpgradeModalState) => void;
  used: number;
  limit: number;
  onMutationSuccess: () => void;
  initialKeyword?: string;
  /** URL ?hint= 파라미터로 전달된 키워드 맥락 힌트 */
  initialHint?: string;
  /** 경쟁 분석 결과 — 공백 각도를 초안에 주입 */
  analysisContext?: AnalysisContext;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const [hint, setHint] = useState(initialHint || "");
  const [showHint, setShowHint] = useState(!!initialHint);
  const [postType, setPostType] = useState<PostType>("정보성");
  const [length, setLength] = useState<DraftLength>("1500");
  const [copied, setCopied] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamedMeta, setStreamedMeta] = useState<StreamedMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const refineAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialKeyword && initialKeyword !== keyword) {
      setKeyword(initialKeyword);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

  useEffect(() => {
    if (initialHint !== undefined) {
      setHint(initialHint);
      if (initialHint) setShowHint(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHint]);

  const handleGenerate = useCallback(async () => {
    if (!keyword.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setIsSuccess(false);
    setStreamedContent("");
    setStreamedMeta(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          postType,
          length,
          hint: hint.trim() || undefined,
          analysisContext,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) {
          onUsageLimitExceeded({ feature: "AI 글 초안", used: limitErr.used, limit: limitErr.limit });
        } else {
          setError(data.error ?? "초안 생성 요청에 실패했습니다.");
        }
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let metaEndIdx = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (metaEndIdx === -1) {
          const firstNewline = buffer.indexOf("\n");
          if (firstNewline !== -1) {
            try {
              const meta = JSON.parse(buffer.slice(0, firstNewline));
              setStreamedMeta({
                suggestedTitle: meta.suggestedTitle ?? keyword,
                outline: Array.isArray(meta.outline) ? meta.outline : [],
                tags: Array.isArray(meta.tags) ? meta.tags : [],
              });
              metaEndIdx = firstNewline + 1;
            } catch {
              // JSON not yet complete — wait for more chunks
            }
          }
        }

        if (metaEndIdx !== -1) {
          setStreamedContent(buffer.slice(metaEndIdx).trimStart());
        }
      }

      setIsSuccess(true);
      onMutationSuccess();
      toast.success("초안이 생성되었습니다");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("초안 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsStreaming(false);
    }
  }, [keyword, postType, length, hint, analysisContext, onUsageLimitExceeded, onMutationSuccess]);

  const handleCopy = async () => {
    if (!streamedContent) return;
    const ok = await copyToClipboard(streamedContent);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isStreaming) void handleGenerate();
    }
  };

  // Entity-escape first (prevents XSS), then apply safe formatting
  const renderContent = (content: string) => {
    return content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />");
  };

  const handleRefine = useCallback(async () => {
    if (!refineInstruction.trim() || !streamedContent || isRefining) return;

    refineAbortRef.current?.abort();
    const controller = new AbortController();
    refineAbortRef.current = controller;

    setIsRefining(true);
    setRefineError(null);

    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          content: streamedContent,
          instruction: refineInstruction.trim(),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) {
          onUsageLimitExceeded({ feature: "AI 글 초안", used: limitErr.used, limit: limitErr.limit });
        } else {
          setRefineError(data.error ?? "수정 요청에 실패했습니다.");
        }
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let refined = "";

      setStreamedContent("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        refined += decoder.decode(value, { stream: true });
        setStreamedContent(refined);
      }

      setRefineInstruction("");
      toast.success("수정이 완료되었습니다");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setRefineError("수정 요청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsRefining(false);
    }
  }, [refineInstruction, streamedContent, keyword, isRefining, onUsageLimitExceeded]);

  const wordCount = streamedContent.replace(/\s/g, "").length;

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
      {limit === 0 && (
        <PlanLockOverlay featureName="AI 글 초안" onUpgrade={() => router.push("/pricing")} />
      )}
      {/* Left Input Sidebar */}
      <section className="col-span-1 lg:col-span-5 space-y-6">
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-muted/50">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Edit3 className="size-5 text-blue-500" />
            AI 초안 설정
          </h2>

          <div className="space-y-5">
            {analysisContext && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider">경쟁 분석 연동됨</span>
                <span className="text-[10px] text-muted-foreground">공백 각도가 초안에 자동 반영됩니다</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">메인 키워드</label>
              <input
                className="w-full bg-muted/20 border-transparent rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 다이어트 식단"
              />
            </div>

            {/* 맥락 힌트 — 다의어 문제 해결 */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span className={`transition-transform duration-200 inline-block ${showHint ? "rotate-90" : ""}`}>▶</span>
                맥락 힌트 {hint && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded text-[10px] font-black">설정됨</span>}
              </button>
              {showHint && (
                <div className="space-y-1">
                  <input
                    className="w-full bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="예: 마스터스 골프 대회, 2024년 우승자"
                    maxLength={200}
                  />
                  <p className="text-[11px] text-muted-foreground px-1">
                    키워드의 구체적 의미를 입력하면 AI가 올바른 맥락으로 초안을 작성합니다
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">포스팅 유형</label>
              <div className="grid grid-cols-2 gap-2">
                {(["정보성", "리뷰", "리스트형", "비교분석"] as PostType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                      postType === type
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">생성 길이</label>
              <select
                className="w-full bg-muted/20 border-transparent rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none appearance-none"
                value={length}
                onChange={(e) => setLength(e.target.value as DraftLength)}
              >
                <option value="500">500자 (간략)</option>
                <option value="1000">1,000자 (짧게)</option>
                <option value="1500">1,500자 (보통)</option>
                <option value="2500">2,500자 (길게)</option>
              </select>
            </div>

            <Button
              size="lg"
              className="w-full rounded-xl font-bold mt-2 shadow-lg hover:-translate-y-0.5 transition-all"
              onClick={() => void handleGenerate()}
              disabled={isStreaming || !keyword.trim()}
            >
              <Sparkles className="size-5 mr-2" />
              {isStreaming ? "생성 중..." : "초안 생성"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">⌘ + Enter</p>

            {error && (
              <p className="text-sm text-rose-500 font-semibold">{error}</p>
            )}

            <UsageBar used={used} limit={limit} />
          </div>
        </div>

        {/* Pro Banner */}
        <div className="bg-gradient-to-b from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground overflow-hidden relative shadow-md">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest bg-white/20 inline-block px-2 py-0.5 rounded-md mb-3">Premium</p>
            <h3 className="font-extrabold text-xl leading-snug mb-2">프리미엄 AI 옵션</h3>
            <p className="text-sm text-primary-foreground/70 mb-5">브랜드 톤앤매너 학습 및 구조화된 최적화 초안 작성</p>
            <Button variant="outline" className="h-9 font-bold bg-background text-foreground border-none rounded-lg text-xs hover:bg-background/90">
              알아보기
            </Button>
          </div>
        </div>
      </section>

      {/* Right Output Area */}
      <section className="col-span-1 lg:col-span-7 flex flex-col min-h-[700px]">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest">생성된 초안 결과</h3>
          </div>
          <div className="flex items-center gap-3">
            {isSuccess && (
              <>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">고품질 초안 완료</span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" /> AI 생성 완료
                </span>
              </>
            )}
            {isStreaming && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black animate-pulse">
                작성 중...
              </span>
            )}
          </div>
        </div>

        {/* Editor Box */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-muted/50 flex flex-col overflow-hidden">
          <div className="flex-1 p-8 overflow-y-auto w-full">
            {streamedContent ? (
              <>
                <div
                  className="max-w-2xl mx-auto py-4 prose dark:prose-invert prose-headings:font-extrabold prose-p:leading-relaxed prose-li:leading-relaxed max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderContent(streamedContent) }}
                />
                {isSuccess && (
                  <div className="max-w-2xl mx-auto mt-6 px-4 py-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl">
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                      💡 <strong>AI 초안 활용 팁:</strong> 이 초안은 글의 구조와 흐름을 잡는 데 활용하세요.
                      구체적인 장소명, 수치, 개인 경험담을 직접 추가하면 네이버 상위 노출에 훨씬 유리한 고품질 콘텐츠가 됩니다.
                    </p>
                  </div>
                )}
              </>
            ) : isStreaming ? (
              <div className="max-w-2xl mx-auto py-4 space-y-3">
                <div className="h-6 bg-muted/40 rounded w-2/3 animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-full animate-pulse" />
                <div className="h-4 bg-muted/30 rounded w-5/6 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24">
                <Edit3 className="size-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-bold text-muted-foreground mb-1">아직 생성된 초안이 없습니다</p>
                <p className="text-xs text-muted-foreground/70">설정을 입력하고 초안 생성 버튼을 눌러주세요.</p>
              </div>
            )}
          </div>

          {/* Refine Panel */}
          {streamedContent && !isStreaming && (
            <div className="border-t border-muted/30 px-6 py-4 bg-muted/5 space-y-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">AI 수정 요청</p>
              <div className="flex flex-wrap gap-2">
                {["더 친근하게", "더 전문적으로", "더 짧게", "도입부 다시 써줘", "결론 강조해줘"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setRefineInstruction(preset)}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-muted/20 border-transparent rounded-xl py-2.5 px-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="수정 지시사항을 입력하세요 (예: 3번째 문단을 더 구체적으로)"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleRefine(); }
                  }}
                  maxLength={300}
                />
                <Button
                  size="sm"
                  className="rounded-xl font-bold shrink-0"
                  onClick={() => void handleRefine()}
                  disabled={isRefining || !refineInstruction.trim()}
                >
                  <Sparkles className="size-4 mr-1.5" />
                  {isRefining ? "수정 중..." : "수정"}
                </Button>
              </div>
              {refineError && <p className="text-xs text-rose-500 font-semibold">{refineError}</p>}
            </div>
          )}

        {/* Editor Footer Actions */}
          <div className="h-16 border-t border-muted/30 px-6 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-bold"
                onClick={() => void handleCopy()}
                disabled={!streamedContent}
              >
                {copied ? <CheckCircle2 className="size-4 mr-2 text-emerald-500" /> : <Copy className="size-4 mr-2" />}
                {copied ? "복사됨" : "텍스트 복사"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg font-bold text-muted-foreground"
                onClick={() => void handleGenerate()}
                disabled={isStreaming || !keyword.trim()}
              >
                <RefreshCcw className="size-4 mr-2" /> 재생성
              </Button>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {streamedContent ? (
                <>총 공백제외 <span className="text-foreground">{wordCount.toLocaleString()}자</span></>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
