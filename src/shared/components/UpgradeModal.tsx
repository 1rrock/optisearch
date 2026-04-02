"use client";

import { useRouter } from "next/navigation";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-muted rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-bold mb-2">일일 사용 한도 초과</h3>
        <p className="text-muted-foreground mb-4">
          {feature} 기능의 일일 사용 한도({limit}회)를 모두 사용했습니다.
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
