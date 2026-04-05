"use client";

import { Lock } from "lucide-react";

export type UpgradeModalState = { feature: string; used: number; limit: number } | null;

// ─── UsageBar ─────────────────────────────────────────────────────────────────

export function UsageBar({ used, limit }: { used: number; limit: number }) {
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

export function PlanLockOverlay({ featureName, onUpgrade }: { featureName: string; onUpgrade: () => void }) {
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

// ─── TabButton ─────────────────────────────────────────────────────────────────

export function TabButton({ active, label, onClick, icon, usage }: {
  active: boolean; label: string; onClick: () => void;
  icon?: React.ReactNode;
  usage?: { used: number; limit: number };
}) {
  const usageText = usage
    ? usage.limit === -1 ? "∞" : usage.limit === 0 ? "잠금" : `${usage.used}/${usage.limit}`
    : null;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {usageText && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
          active ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
        }`}>
          {usageText}
        </span>
      )}
    </button>
  );
}
