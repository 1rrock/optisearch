"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/shared/ui/button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  used: number;
  limit: number;
}

export function UpgradeModal({ isOpen, onClose, feature, used, limit }: UpgradeModalProps) {
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
        <h3 id="upgrade-modal-title" className="text-xl font-bold mb-2">일일 사용 한도 초과</h3>
        <p className="text-muted-foreground mb-4">
          {feature} 기능의 일일 사용 한도를 모두 사용했습니다. ({used}/{limit}회)
        </p>
        <p className="text-muted-foreground mb-6 text-sm">
          베이직 플랜으로 업그레이드하면 더 많은 기능을 이용할 수 있습니다.
        </p>
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
