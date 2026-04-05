"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Copy,
  RefreshCcw,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { copyToClipboard } from "@/shared/lib/clipboard";
import { UsageLimitError, parseUsageLimitError } from "@/shared/lib/errors";
import { UsageBar, type UpgradeModalState } from "./shared";
import { toast } from "sonner";

// ─── API response types ────────────────────────────────────────────────────────

interface TitleSuggestion {
  title: string;
  rank: number;
  reason: string;
}

interface TitleResponse {
  suggestions: TitleSuggestion[];
}

// ─── TitleTool ─────────────────────────────────────────────────────────────────

export function TitleTool({
  onGoToDraft,
  onUsageLimitExceeded,
  used,
  limit,
  onMutationSuccess,
  initialKeyword,
}: {
  onGoToDraft: (title?: string) => void;
  onUsageLimitExceeded: (state: UpgradeModalState) => void;
  used: number;
  limit: number;
  onMutationSuccess: () => void;
  initialKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [context, setContext] = useState("");

  const mutation = useMutation<TitleResponse, Error, { keyword: string; context: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ai/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) throw limitErr;
        throw new Error(data.error ?? "제목 추천 요청에 실패했습니다.");
      }
      return res.json() as Promise<TitleResponse>;
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        onUsageLimitExceeded({ feature: "AI 제목 추천", used: err.used, limit: err.limit });
      }
    },
    onSuccess: (data) => {
      onMutationSuccess();
      toast.success(`제목 ${data.suggestions.length}개가 생성되었습니다`);
    },
  });

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), context: context.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!mutation.isPending) handleGenerate();
    }
  };

  const suggestions = mutation.data?.suggestions ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
      {/* Input Form */}
      <section className="col-span-1 lg:col-span-5 bg-card p-8 rounded-2xl shadow-sm border border-muted/50">
        <div className="mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            AI 제목 추천 받기
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            키워드와 타겟 독자를 입력하면 AI가 클릭을 부르는 매력적인 제목을 생성합니다.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center justify-between">
              메인 키워드
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">필수</span>
            </label>
            <input
              className="w-full bg-muted/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/10 rounded-xl py-3 px-4 text-sm transition-all"
              placeholder="예: 다이어트 식단"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold">추가 설명 (타겟 독자/컨셉)</label>
            <textarea
              className="w-full bg-muted/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/10 rounded-xl py-3 px-4 text-sm transition-all resize-none"
              placeholder="예: 1인 가구를 위한 가성비 위주"
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="pt-4">
            <Button
              size="lg"
              className="w-full rounded-xl font-bold bg-primary hover:scale-[1.02] shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              onClick={handleGenerate}
              disabled={mutation.isPending || !keyword.trim()}
            >
              <Sparkles className="size-5" />
              {mutation.isPending ? "생성 중..." : "추천 생성"}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center mt-2">⌘ + Enter</p>

            {mutation.isError && (
              <p className="mt-3 text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
            )}

            <UsageBar used={used} limit={limit} />
          </div>
        </div>
      </section>

      {/* Results List */}
      <section className="col-span-1 lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-lg font-bold">
            {mutation.isSuccess ? `생성된 제목 (${suggestions.length}건)` : "생성된 제목"}
          </h3>
          {mutation.isSuccess && (
            <Button
              variant="ghost"
              size="sm"
              className="font-bold text-muted-foreground"
              onClick={handleGenerate}
              disabled={mutation.isPending}
            >
              <RefreshCcw className="size-4 mr-2" /> 새로고침
            </Button>
          )}
        </div>

        {mutation.isPending && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border border-muted/50 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-1/3 mb-3" />
                <div className="h-6 bg-muted/50 rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {mutation.isSuccess && suggestions.map((s) => (
          <TitleResultCard
            key={s.rank}
            rank={s.rank}
            title={s.title}
            reason={s.reason}
            onUseTitleForDraft={onGoToDraft}
          />
        ))}

        {!mutation.isPending && !mutation.isSuccess && (
          <div className="py-16 text-center">
            <Zap className="size-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm font-bold text-muted-foreground mb-1">아직 생성된 제목이 없습니다</p>
            <p className="text-xs text-muted-foreground/70">키워드를 입력하고 추천 생성 버튼을 눌러주세요.</p>
          </div>
        )}

        {/* CTA to Draft Tool */}
        <div className="mt-8 p-6 bg-foreground text-background rounded-2xl flex items-center justify-between gap-6 overflow-hidden relative shadow-xl">
          <div className="relative z-10">
            <h4 className="font-extrabold text-lg">마음에 드는 제목을 고르셨나요?</h4>
            <p className="text-sm text-background/70 mt-1">곧바로 AI 초안 작성을 시작해 5분 만에 포스팅을 완성해보세요.</p>
          </div>
          <Button
            variant="outline"
            className="relative z-10 shrink-0 bg-background text-foreground border-none font-bold rounded-xl hover:bg-background/90"
            onClick={() => onGoToDraft()}
          >
            초안 작성하기 <ArrowRight className="size-4 ml-2" />
          </Button>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-primary/30 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>
    </div>
  );
}

// ─── TitleResultCard ──────────────────────────────────────────────────────────

function TitleResultCard({ rank, title, reason, onUseTitleForDraft }: { rank: number; title: string; reason: string; onUseTitleForDraft?: (title: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(title);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group bg-card p-6 rounded-2xl border border-muted/50 hover:border-primary/40 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              rank === 2 ? "bg-slate-200 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300" :
              rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
              "bg-muted text-muted-foreground"
            }`}>
              #{rank}
            </span>
          </div>
          <h4 className="text-lg md:text-xl font-bold leading-snug group-hover:text-primary transition-colors">
            {title}
          </h4>
          {reason && (
            <p className="text-xs text-muted-foreground mt-2">{reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-primary/10 text-primary"
            onClick={handleCopy}
            title="클립보드에 복사"
          >
            {copied ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          </Button>
          {onUseTitleForDraft && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-primary/10 text-primary"
              onClick={() => onUseTitleForDraft(title)}
              title="이 제목으로 초안 작성"
            >
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
