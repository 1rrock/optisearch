"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { UsageBar, PlanLockOverlay, type UpgradeModalState } from "./shared";

// ─── API response types ────────────────────────────────────────────────────────

interface DraftContent {
  keyword: string;
  suggestedTitle: string;
  content: string;
  wordCount: number;
  outline: string[];
  tags: string[];
}

interface DraftResponse {
  draft: DraftContent;
}

// ─── Local types ──────────────────────────────────────────────────────────────

type PostType = "정보성" | "리뷰" | "리스트형" | "비교분석";
type DraftLength = "1000" | "1500" | "2500";

// ─── DraftTool ────────────────────────────────────────────────────────────────

export function DraftTool({
  onUsageLimitExceeded,
  used,
  limit,
  onMutationSuccess,
  initialKeyword,
}: {
  onUsageLimitExceeded: (state: UpgradeModalState) => void;
  used: number;
  limit: number;
  onMutationSuccess: () => void;
  initialKeyword?: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword || "");
  const [postType, setPostType] = useState<PostType>("정보성");
  const [length, setLength] = useState<DraftLength>("1500");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialKeyword && initialKeyword !== keyword) {
      setKeyword(initialKeyword);
    }
  // Note: intentionally omitting `keyword` from deps — we only want to sync when parent changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

  const mutation = useMutation<DraftResponse, Error, { keyword: string; postType: PostType; length: DraftLength }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) throw limitErr;
        throw new Error(data.error ?? "초안 생성 요청에 실패했습니다.");
      }
      return res.json() as Promise<DraftResponse>;
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        onUsageLimitExceeded({ feature: "AI 글 초안", used: err.used, limit: err.limit });
      }
    },
    onSuccess: () => {
      onMutationSuccess();
      toast.success("초안이 생성되었습니다");
    },
  });

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), postType, length });
  };

  const draft = mutation.data?.draft;

  const handleCopy = async () => {
    if (!draft?.content) return;
    const ok = await copyToClipboard(draft.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
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
                <option value="1000">1,000자 (짧게)</option>
                <option value="1500">1,500자 (보통)</option>
                <option value="2500">2,500자 (길게)</option>
              </select>
            </div>

            <Button
              size="lg"
              className="w-full rounded-xl font-bold mt-2 shadow-lg hover:-translate-y-0.5 transition-all"
              onClick={handleGenerate}
              disabled={mutation.isPending || !keyword.trim()}
            >
              <Sparkles className="size-5 mr-2" />
              {mutation.isPending ? "생성 중..." : "초안 생성"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">⌘ + Enter</p>

            {mutation.isError && (
              <p className="text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
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
            {mutation.isSuccess && (
              <>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">고품질 초안 완료</span>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" /> AI 생성 완료
                </span>
              </>
            )}
          </div>
        </div>

        {/* Editor Box */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-muted/50 flex flex-col overflow-hidden">
          <div className="flex-1 p-8 overflow-y-auto w-full">
            {mutation.isPending && (
              <div className="max-w-2xl mx-auto py-4 space-y-4 animate-pulse">
                <div className="h-8 bg-muted/50 rounded w-3/4" />
                <div className="h-4 bg-muted/50 rounded w-full" />
                <div className="h-4 bg-muted/50 rounded w-5/6" />
                <div className="h-4 bg-muted/50 rounded w-4/5" />
                <div className="h-6 bg-muted/50 rounded w-1/2 mt-6" />
                <div className="h-4 bg-muted/50 rounded w-full" />
                <div className="h-4 bg-muted/50 rounded w-3/4" />
              </div>
            )}

            {mutation.isSuccess && draft && (
              <div
                className="max-w-2xl mx-auto py-4 prose dark:prose-invert prose-headings:font-extrabold prose-p:leading-relaxed prose-li:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: renderContent(draft.content) }}
              />
            )}

            {!mutation.isPending && !mutation.isSuccess && (
              <div className="flex flex-col items-center justify-center h-full py-24">
                <Edit3 className="size-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-bold text-muted-foreground mb-1">아직 생성된 초안이 없습니다</p>
                <p className="text-xs text-muted-foreground/70">설정을 입력하고 초안 생성 버튼을 눌러주세요.</p>
              </div>
            )}
          </div>

          {/* Editor Footer Actions */}
          <div className="h-16 border-t border-muted/30 px-6 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-bold"
                onClick={handleCopy}
                disabled={!draft?.content}
              >
                {copied ? <CheckCircle2 className="size-4 mr-2 text-emerald-500" /> : <Copy className="size-4 mr-2" />}
                {copied ? "복사됨" : "텍스트 복사"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg font-bold text-muted-foreground"
                onClick={handleGenerate}
                disabled={mutation.isPending || !keyword.trim()}
              >
                <RefreshCcw className="size-4 mr-2" /> 재생성
              </Button>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {draft ? (
                <>총 공백제외 <span className="text-foreground">{draft.wordCount.toLocaleString()}자</span></>
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
