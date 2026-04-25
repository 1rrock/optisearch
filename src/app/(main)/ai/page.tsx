"use client";

import { useState, useCallback, Suspense } from "react";
import { useUserStore } from "@/shared/stores/user-store";
import { useUsage, useUserPlan } from "@/shared/hooks/use-user";
import { useSearchParams } from "next/navigation";
import { Sparkles, BarChart2, Edit3 } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { UpgradeModal } from "@/shared/components/UpgradeModal";
import { PLAN_LIMITS } from "@/shared/config/constants";
import { TabButton, type UpgradeModalState } from "./components/shared";
import { AnalyzeTool } from "./components/AnalyzeTool";
import { DraftTool } from "./components/DraftTool";
import type { AICompetitiveAnalysis } from "@/entities/analysis/model/types";

type AnalysisContext = Pick<AICompetitiveAnalysis, "uncoveredTopics" | "recommendedTitles" | "strategySummary">;

type TabId = "analyze" | "draft";

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
  const urlHint = searchParams.get("hint") ?? "";

  const [activeTab, setActiveTab] = useState<TabId>(
    urlTab && (["analyze", "draft"] as TabId[]).includes(urlTab) ? urlTab : "analyze"
  );
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>(null);
  const [draftKeyword, setDraftKeyword] = useState(urlKeyword);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | undefined>(undefined);

  const plan = useUserPlan();
  const { usage } = useUsage();
  const limits = PLAN_LIMITS[plan];

  const handleGoToDraft = useCallback((title?: string, context?: AnalysisContext) => {
    if (title) setDraftKeyword(title);
    if (context) setAnalysisContext(context);
    setActiveTab("draft");
  }, []);

  const invalidate = useCallback(() => { void useUserStore.getState().refresh(); }, []);

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
        description="상위글 경쟁 분석으로 공백을 발견하고, AI 초안으로 5분 만에 포스팅을 완성하세요."
      />

      {/* Segmented Tab Navigation */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-muted/30 mb-8 pt-2 pb-2 overflow-x-auto">
        <div className="inline-flex bg-muted/30 rounded-xl p-1 gap-1 min-w-max">
          <TabButton
            active={activeTab === "analyze"}
            onClick={() => setActiveTab("analyze")}
            label="경쟁 분석"
            icon={<BarChart2 className="size-4" />}
            usage={{ used: usage.analyze, limit: limits.dailyAnalyze }}
          />
          <TabButton
            active={activeTab === "draft"}
            onClick={() => setActiveTab("draft")}
            label="AI 글 초안"
            icon={<Edit3 className="size-4" />}
            usage={{ used: usage.draft, limit: limits.dailyDraft }}
          />
        </div>
      </div>

      {/* All tabs rendered, inactive hidden — preserves state */}
      <div className="w-full">
        <div className={activeTab === "analyze" ? "animate-in fade-in duration-300" : "hidden"}>
          <AnalyzeTool
            onGoToDraft={handleGoToDraft}
            onUsageLimitExceeded={setUpgradeModal}
            used={usage.analyze}
            limit={limits.dailyAnalyze}
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
            initialHint={urlHint}
            analysisContext={analysisContext}
          />
        </div>
      </div>
    </div>
  );
}
