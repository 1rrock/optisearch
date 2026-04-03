"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Edit3,
  Target,
  Copy,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Clock,
  LayoutTemplate,
  PieChart,
  Lock
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { copyToClipboard } from "@/shared/lib/clipboard";
import { UpgradeModal } from "@/shared/components/UpgradeModal";
import { PLAN_LIMITS, type PlanId } from "@/shared/config/constants";

type TabId = "title" | "draft" | "score";

// ---------------------------------------------------------------------------
// Usage limit error
// ---------------------------------------------------------------------------

class UsageLimitError extends Error {
  used: number;
  limit: number;
  constructor(message: string, used: number, limit: number) {
    super(message);
    this.name = "UsageLimitError";
    this.used = used;
    this.limit = limit;
  }
}

function parseUsageLimitError(status: number, data: Record<string, unknown>): UsageLimitError | null {
  if (status === 429 && data.code === "USAGE_LIMIT_EXCEEDED") {
    const match = /\((\d+)\/(\d+)\)/.exec((data.error as string) ?? "");
    const used = match ? parseInt(match[1], 10) : 0;
    const limit = match ? parseInt(match[2], 10) : 0;
    return new UsageLimitError((data.error as string) ?? "일일 사용 한도를 초과했습니다.", used, limit);
  }
  return null;
}

type UpgradeModalState = { feature: string; used: number; limit: number } | null;

// ─── API response types ────────────────────────────────────────────────────────

interface TitleSuggestion {
  title: string;
  rank: number;
  reason: string;
}

interface TitleResponse {
  suggestions: TitleSuggestion[];
}

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

interface SubMetrics {
  keywordUsage: number;
  readability: number;
  structure: number;
  depth: number;
  titleAttractiveness: number;
}

interface ScoreContent {
  totalScore: number;
  grade: string;
  subMetrics: SubMetrics;
  improvements: string[];
  strengths: string[];
}

interface ScoreResponse {
  score: ScoreContent;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("title");
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>(null);

  const queryClient = useQueryClient();
  const { data: dashboardData } = useQuery<{ plan: PlanId; usage: { search: number; title: number; draft: number; score: number } }>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return { plan: "free" as PlanId, usage: { search: 0, title: 0, draft: 0, score: 0 } };
      return res.json();
    },
    staleTime: 0,
  });

  const plan = (dashboardData?.plan ?? "free") as PlanId;
  const usage = dashboardData?.usage ?? { search: 0, title: 0, draft: 0, score: 0 };
  const limits = PLAN_LIMITS[plan];

  return (
    <div className="space-y-8">
      <UpgradeModal
        isOpen={upgradeModal !== null}
        onClose={() => setUpgradeModal(null)}
        feature={upgradeModal?.feature ?? "AI 기능"}
        used={upgradeModal?.used ?? 0}
        limit={upgradeModal?.limit ?? 0}
      />

      {/* 1. Page Header */}
      <PageHeader
        icon={<Sparkles className="size-8 text-primary" />}
        title="AI 도구 모음"
        description="강력한 생성형 AI를 활용하여 클릭을 부르는 제목, 고품질 초안, 완벽한 SEO 포스팅을 완성하세요."
      />

      {/* 2. Unified Tab Navigation */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-muted/30 mb-8 pt-2">
        <div className="flex gap-8">
          <TabButton
            active={activeTab === "title"}
            onClick={() => setActiveTab("title")}
            label="AI 제목 추천"
          />
          <TabButton
            active={activeTab === "draft"}
            onClick={() => setActiveTab("draft")}
            label="AI 글 초안"
          />
          <TabButton
            active={activeTab === "score"}
            onClick={() => setActiveTab("score")}
            label="콘텐츠 점수"
          />
        </div>
      </div>

      {/* 3. Screen Switching Area */}
      <div className="w-full">
        {activeTab === "title" && (
          <TitleTool
            onGoToDraft={() => setActiveTab("draft")}
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.title}
            limit={limits.dailyTitle}
            onMutationSuccess={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        )}
        {activeTab === "draft" && (
          <DraftTool
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.draft}
            limit={limits.dailyDraft}
            onMutationSuccess={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        )}
        {activeTab === "score" && (
          <ScoreTool
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.score}
            limit={limits.dailyScore}
            onMutationSuccess={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        )}
      </div>

    </div>
  );
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number }) {
  // limit === -1 means unlimited
  if (limit === -1) {
    return (
      <div className="mt-6 p-4 bg-muted/30 rounded-xl flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">일일 사용량</span>
        <span className="text-xs font-bold text-emerald-500">무제한</span>
      </div>
    );
  }
  // limit === 0 means feature not available
  if (limit === 0) {
    return (
      <div className="mt-6 p-4 bg-muted/30 rounded-xl flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">일일 사용량</span>
        <span className="text-xs font-bold text-muted-foreground">미지원 (업그레이드 필요)</span>
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const isMaxed = used >= limit;
  return (
    <div className="mt-6 p-4 bg-muted/30 rounded-xl flex items-center justify-between">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">일일 사용량</span>
      <div className="flex items-center gap-3 w-1/2">
        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isMaxed ? "bg-rose-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${isMaxed ? "text-rose-500" : "text-primary"}`}>
          {used}/{limit}
        </span>
      </div>
    </div>
  );
}

// ─── PlanLockOverlay ──────────────────────────────────────────────────────────

function PlanLockOverlay({ featureName, onUpgrade }: { featureName: string; onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground">베이직 플랜부터 사용 가능</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {featureName} 기능은 베이직 플랜 이상에서 이용할 수 있습니다.
      </p>
      <button
        onClick={onUpgrade}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
      >
        요금제 업그레이드
      </button>
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 text-sm font-bold transition-all border-b-2 ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Screen 1: AI Title Suggestions ──────────────────────────────────────────

function TitleTool({ onGoToDraft, onUsageLimitExceeded, used, limit, onMutationSuccess }: { onGoToDraft: () => void; onUsageLimitExceeded: (state: UpgradeModalState) => void; used: number; limit: number; onMutationSuccess: () => void }) {
  const [keyword, setKeyword] = useState("");
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
    onSuccess: onMutationSuccess,
  });

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), context: context.trim() });
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
          />
        ))}

        {!mutation.isPending && !mutation.isSuccess && (
          <div className="py-16 text-center text-muted-foreground text-sm">
            키워드를 입력하고 추천 생성 버튼을 눌러주세요.
          </div>
        )}

        {/* CTA to Draft Tool */}
        <div className="mt-8 p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl flex items-center justify-between gap-6 overflow-hidden relative shadow-xl">
          <div className="relative z-10">
            <h4 className="font-extrabold text-lg">마음에 드는 제목을 고르셨나요?</h4>
            <p className="text-sm text-slate-300 mt-1">곧바로 AI 초안 작성을 시작해 5분 만에 포스팅을 완성해보세요.</p>
          </div>
          <Button
            variant="outline"
            className="relative z-10 shrink-0 bg-white text-slate-900 border-none font-bold rounded-xl hover:bg-slate-100"
            onClick={onGoToDraft}
          >
            초안 작성하기 <ArrowRight className="size-4 ml-2" />
          </Button>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-primary/30 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>
    </div>
  );
}

function TitleResultCard({ rank, title, reason }: { rank: number; title: string; reason: string }) {
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
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-muted text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: AI Draft Generation ───────────────────────────────────────────

type PostType = "정보성" | "리뷰" | "리스트형" | "비교분석";
type DraftLength = "1000" | "1500" | "2500";

function DraftTool({ onUsageLimitExceeded, used, limit, onMutationSuccess }: { onUsageLimitExceeded: (state: UpgradeModalState) => void; used: number; limit: number; onMutationSuccess: () => void }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("다이어트 식단");
  const [postType, setPostType] = useState<PostType>("정보성");
  const [length, setLength] = useState<DraftLength>("1500");

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
    onSuccess: onMutationSuccess,
  });

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), postType, length });
  };

  const draft = mutation.data?.draft;

  const handleCopy = async () => {
    if (!draft?.content) return;
    await copyToClipboard(draft.content);
  };

  // Simple markdown to plain-text-friendly HTML: preserve newlines
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
      <section className="col-span-1 lg:col-span-4 space-y-6">
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

            {mutation.isError && (
              <p className="text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
            )}

            <UsageBar used={used} limit={limit} />
          </div>
        </div>

        {/* Pro Banner */}
        <div className="bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white overflow-hidden relative shadow-md">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest bg-white/20 inline-block px-2 py-0.5 rounded-md mb-3">Premium</p>
            <h3 className="font-extrabold text-xl leading-snug mb-2">프리미엄 AI 옵션</h3>
            <p className="text-sm text-indigo-100 mb-5">브랜드 톤앤매너 학습 및 구조화된 최적화 초안 작성</p>
            <Button variant="outline" className="h-9 font-bold bg-white text-indigo-700 border-none rounded-lg text-xs hover:bg-indigo-50">
              알아보기
            </Button>
          </div>
        </div>
      </section>

      {/* Right Output Area */}
      <section className="col-span-1 lg:col-span-8 flex flex-col min-h-[700px]">
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
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-24">
                설정을 입력하고 초안 생성 버튼을 눌러주세요.
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
                <Copy className="size-4 mr-2" /> 텍스트 복사
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

// ─── Screen 3: Content Score ──────────────────────────────────────────────────

function ScoreTool({ onUsageLimitExceeded, used, limit, onMutationSuccess }: { onUsageLimitExceeded: (state: UpgradeModalState) => void; used: number; limit: number; onMutationSuccess: () => void }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [content, setContent] = useState("");

  const mutation = useMutation<ScoreResponse, Error, { keyword: string; content: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const limitErr = parseUsageLimitError(res.status, data);
        if (limitErr) throw limitErr;
        throw new Error(data.error ?? "점수 분석 요청에 실패했습니다.");
      }
      return res.json() as Promise<ScoreResponse>;
    },
    onError: (err) => {
      if (err instanceof UsageLimitError) {
        onUsageLimitExceeded({ feature: "콘텐츠 점수", used: err.used, limit: err.limit });
      }
    },
    onSuccess: onMutationSuccess,
  });

  const handleAnalyze = () => {
    if (!keyword.trim() || !content.trim()) return;
    mutation.mutate({ keyword: keyword.trim(), content: content.trim() });
  };

  const score = mutation.data?.score;

  // strokeDashoffset = 552.9 - (552.9 * score / 100)
  const dashOffset = score ? 552.9 - (552.9 * score.totalScore) / 100 : 552.9;

  const gradeColor = (grade: string) => {
    if (grade === "A" || grade === "S") return "text-emerald-500";
    if (grade === "B") return "text-blue-500";
    if (grade === "C") return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
      {limit === 0 && (
        <PlanLockOverlay featureName="콘텐츠 점수" onUpgrade={() => router.push("/pricing")} />
      )}
      {/* Left Input */}
      <section className="col-span-1 lg:col-span-7 space-y-6">
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-muted/50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Target className="size-6 text-rose-500" /> SEO 최적화 점수 측정
            </h2>
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">v2.0 AI Engine</span>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-bold">목표 메인 키워드</label>
              <input
                className="w-full px-4 py-3 bg-muted/20 border border-muted/30 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
                placeholder="타겟으로 할 키워드를 하나만 입력하세요"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">분석할 블로그 본문</label>
                <span className="text-xs font-bold text-primary">{content.length > 0 ? `현재 ${content.replace(/\s/g, "").length.toLocaleString()}자` : ""}</span>
              </div>
              <textarea
                className="w-full px-6 py-5 bg-muted/20 border border-muted/30 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-sm leading-8 min-h-[300px]"
                placeholder="작성한 초안을 붙여넣으세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-muted/20">
              <Button
                size="lg"
                className="px-10 rounded-xl font-extrabold bg-gradient-to-r from-rose-500 to-amber-500 text-white border-none shadow-xl shadow-rose-500/20 hover:scale-[1.03] transition-transform flex items-center gap-2"
                onClick={handleAnalyze}
                disabled={mutation.isPending || !keyword.trim() || !content.trim()}
              >
                <PieChart className="size-5" />
                {mutation.isPending ? "분석 중..." : "점수 분석 시작"}
              </Button>

              {mutation.isError && (
                <p className="text-sm text-rose-500 font-semibold">{mutation.error.message}</p>
              )}
            </div>

            <UsageBar used={used} limit={limit} />
          </div>
        </div>
      </section>

      {/* Right Result */}
      <section className="col-span-1 lg:col-span-5 space-y-6">
        {/* Main Score UI */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-muted/50 text-center relative overflow-hidden">
          <h3 className="text-xs font-black text-muted-foreground mb-8 uppercase tracking-widest">
            AI 진단 결과
          </h3>

          <div className="relative inline-flex items-center justify-center mb-8">
            <svg className="w-48 h-48 transform -rotate-90 scale-110">
              <circle className="text-muted/30" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
              <circle
                className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-700"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeDasharray="552.9"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center pb-2">
              {mutation.isPending ? (
                <div className="w-16 h-16 rounded-full bg-muted/50 animate-pulse" />
              ) : (
                <>
                  <span className="text-6xl font-black tabular-nums tracking-tighter">
                    {score ? score.totalScore : "--"}
                  </span>
                  <span className={`text-sm font-black mt-1 uppercase tracking-widest ${score ? gradeColor(score.grade) : "text-muted-foreground"}`}>
                    {score ? score.grade : "?"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <ScoreMetricCard
              label="키워드 활용"
              value={score?.subMetrics.keywordUsage}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="가독성"
              value={score?.subMetrics.readability}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="구조화(소제목)"
              value={score?.subMetrics.structure}
              loading={mutation.isPending}
            />
            <ScoreMetricCard
              label="깊이/전문성"
              value={score?.subMetrics.depth}
              loading={mutation.isPending}
            />
          </div>
        </div>

        {/* Suggestion Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-muted/50">
          <h4 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
            <Target className="size-4 text-primary" /> 개선 액션 플랜
          </h4>

          {mutation.isPending && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded-xl" />
              ))}
            </div>
          )}

          {!mutation.isPending && !score && (
            <p className="text-sm text-muted-foreground text-center py-4">분석 후 결과가 표시됩니다.</p>
          )}

          {score && (
            <ul className="space-y-3">
              {score.strengths.map((s, i) => (
                <li key={`s-${i}`} className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-400">{s}</p>
                </li>
              ))}
              {score.improvements.map((imp, i) => (
                <li key={`i-${i}`} className="flex items-start gap-3 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <AlertCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-rose-900 dark:text-rose-400">{imp}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreMetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number;
  loading: boolean;
}) {
  const displayValue = value !== undefined ? `${value}/10` : "--";
  const color =
    value === undefined
      ? ""
      : value >= 8
      ? "text-emerald-500"
      : value >= 6
      ? "text-blue-500"
      : value >= 4
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div className="bg-muted/30 p-4 rounded-xl text-center">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      {loading ? (
        <div className="h-6 bg-muted/50 rounded w-1/2 mx-auto animate-pulse" />
      ) : (
        <p className={`text-lg font-black ${color}`}>{displayValue}</p>
      )}
    </div>
  );
}
