"use client";

import { useState } from "react";
import Link from "next/link";
import { useUserPlan } from "@/shared/hooks/use-user";
import { UpgradeModal } from "./UpgradeModal";

interface AiLinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  feature?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * AI 기능 링크 버튼 — free 플랜 유저 클릭 시 업그레이드 모달을 띄우고
 * basic/pro 유저는 href로 정상 이동합니다.
 */
export function AiLinkButton({
  href,
  children,
  className,
  title,
  feature = "AI 기능",
  onClick,
}: AiLinkButtonProps) {
  const plan = useUserPlan();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (plan === "free") {
      e.preventDefault();
      setShowModal(true);
      return;
    }
    onClick?.(e);
  };

  return (
    <>
      <Link href={href} className={className} title={title} onClick={handleClick}>
        {children}
      </Link>
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        used={0}
        limit={0}
        mode="plan_required"
      />
    </>
  );
}
