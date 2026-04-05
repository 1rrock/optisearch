"use client";

import { useState, useCallback, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Sparkles, Zap, Edit3, Target } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { UpgradeModal } from "@/shared/components/UpgradeModal";
import { PLAN_LIMITS, type PlanId } from "@/shared/config/constants";
import { TabButton, type UpgradeModalState } from "./components/shared";
import { TitleTool } from "./components/TitleTool";
import { DraftTool } from "./components/DraftTool";
import { ScoreTool } from "./components/ScoreTool";

type TabId = "title" | "draft" | "score";

export default function AIToolsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-muted-foreground">로딩 중...</div>}>
      <AIToolsPageInner />
    </Suspense>
  );
}

function AIToolsPageInner() {
  const searchParams = useSearchParams();
  const urlKeyword = searchParams.get("keyword") ?? "";
  const urlTab = searchParams.get("tab") as TabId | null;

  const [activeTab, setActiveTab] = useState<TabId>(
    urlTab && ["title", "draft", "score"].includes(urlTab) ? urlTab : "title"
  );
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>(null);
  const [draftKeyword, setDraftKeyword] = useState(urlKeyword);

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

  const handleGoToDraft = useCallback((title?: string) => {
    if (title) setDraftKeyword(title);
    setActiveTab("draft");
  }, []);

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ["dashboard"] }), [queryClient]);

  return (
    <div className="space-y-8">
      <UpgradeModal
        isOpen={upgradeModal !== null}
        onClose={() => setUpgradeModal(null)}
        feature={upgradeModal?.feature ?? "AI 기능"}
        used={upgradeModal?.used ?? 0}
        limit={upgradeModal?.limit ?? 0}
      />

      <PageHeader
        icon={<Sparkles className="size-8 text-primary" />}
        title="AI 도구 모음"
        description="강력한 생성형 AI를 활용하여 클릭을 부르는 제목, 고품질 초안, 완벽한 SEO 포스팅을 완성하세요."
      />

      {/* Segmented Tab Navigation */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-muted/30 mb-8 pt-2 pb-2 overflow-x-auto">
        <div className="inline-flex bg-muted/30 rounded-xl p-1 gap-1 min-w-max">
          <TabButton
            active={activeTab === "title"}
            onClick={() => setActiveTab("title")}
            label="AI 제목 추천"
            icon={<Zap className="size-4" />}
            usage={{ used: usage.title, limit: limits.dailyTitle }}
          />
          <TabButton
            active={activeTab === "draft"}
            onClick={() => setActiveTab("draft")}
            label="AI 글 초안"
            icon={<Edit3 className="size-4" />}
            usage={{ used: usage.draft, limit: limits.dailyDraft }}
          />
          <TabButton
            active={activeTab === "score"}
            onClick={() => setActiveTab("score")}
            label="콘텐츠 점수"
            icon={<Target className="size-4" />}
            usage={{ used: usage.score, limit: limits.dailyScore }}
          />
        </div>
      </div>

      {/* All tabs rendered, inactive hidden — preserves state */}
      <div className="w-full">
        <div className={activeTab === "title" ? "animate-in fade-in duration-300" : "hidden"}>
          <TitleTool
            onGoToDraft={handleGoToDraft}
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.title}
            limit={limits.dailyTitle}
            onMutationSuccess={invalidate}
            initialKeyword={urlKeyword}
          />
        </div>
        <div className={activeTab === "draft" ? "animate-in fade-in duration-300" : "hidden"}>
          <DraftTool
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.draft}
            limit={limits.dailyDraft}
            onMutationSuccess={invalidate}
            initialKeyword={draftKeyword}
          />
        </div>
        <div className={activeTab === "score" ? "animate-in fade-in duration-300" : "hidden"}>
          <ScoreTool
            onGoToDraft={handleGoToDraft}
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.score}
            limit={limits.dailyScore}
            onMutationSuccess={invalidate}
            initialKeyword={urlKeyword}
          />
        </div>
      </div>
    </div>
  );
}
