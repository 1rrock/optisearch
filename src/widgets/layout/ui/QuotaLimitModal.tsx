"use client";

import { useQuotaStore } from "@/shared/stores/quota-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";

export function QuotaLimitModal() {
  const { isModalOpen, closeModal } = useQuotaStore();
  const router = useRouter();

  const handleUpgrade = () => {
    closeModal();
    router.push("/pricing");
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md border-emerald-500/50 bg-background/95 backdrop-blur shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-xl text-emerald-400 font-bold">
            일일 분석 한도 초과
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            무료 요금제의 일일 분석 횟수를 모두 사용했습니다. 무제한 분석과 프리미엄 기능을 이용하려면 요금제를 업그레이드 해주세요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={closeModal} className="w-full sm:w-auto">
            닫기
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            프리미엄 업그레이드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
