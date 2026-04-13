"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/shared/ui/button";
import { Lock, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  used: number;
  limit: number;
  /** "limit_exceeded" = 일일 한도 초과 (기존), "plan_required" = 플랜 업그레이드 필요 */
  mode?: "limit_exceeded" | "plan_required";
}

export function UpgradeModal({ isOpen, onClose, feature, used, limit, mode = "limit_exceeded" }: UpgradeModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // Auto-focus the dialog
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        tabIndex={-1}
        className="bg-card border border-muted rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl outline-none"
      >
        {mode === "plan_required" ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="size-6 text-primary" />
              </div>
              <div>
                <h3 id="upgrade-modal-title" className="text-xl font-bold">베이직 이상 플랜 전용</h3>
                <p className="text-xs text-muted-foreground mt-0.5">무료 플랜에서는 사용할 수 없는 기능입니다</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-primary shrink-0" />
                <span><strong>{feature}</strong> 기능은 베이직/프로 플랜에서 이용 가능합니다</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                <li>베이직: AI 경쟁 분석 20회/일, 초안 5회/일</li>
                <li>프로: AI 경쟁 분석 100회/일, 초안 30회/일</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <h3 id="upgrade-modal-title" className="text-xl font-bold mb-2">일일 사용 한도 초과</h3>
            <p className="text-muted-foreground mb-4">
              {feature} 기능의 일일 사용 한도를 모두 사용했습니다. ({used}/{limit}회)
            </p>
            <p className="text-muted-foreground mb-6 text-sm">
              베이직 플랜으로 업그레이드하면 더 많은 기능을 이용할 수 있습니다.
            </p>
          </>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">닫기</Button>
          <Button onClick={() => router.push("/pricing")} className="flex-1 bg-primary">
            요금제 보기
          </Button>
        </div>
      </div>
    </div>
  );
}
