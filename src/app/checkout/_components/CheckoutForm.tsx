"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PLAN_PRICING } from "@/shared/config/constants";

interface CheckoutFormProps {
  plan: "basic" | "pro";
}

function normalizeDigits(raw: string): string {
  // +82 10 6270 4201 → 01062704201 (크롬 자동완성 국제번호 처리)
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length === 12) {
    digits = "0" + digits.slice(2); // 82 → 0
  }
  return digits;
}

function formatPhone(raw: string): string {
  const digits = normalizeDigits(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function stripPhone(formatted: string): string {
  return normalizeDigits(formatted);
}

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}

function CheckboxRow({ id, checked, onChange, children }: CheckboxRowProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-muted accent-primary"
      />
      <label htmlFor={id} className="text-sm font-medium leading-relaxed cursor-pointer">
        {children}
      </label>
    </div>
  );
}

export default function CheckoutForm({ plan }: CheckoutFormProps) {
  const pricing = PLAN_PRICING[plan];

  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeFintech, setAgreeFintech] = useState(false);
  const [agreeRecurring, setAgreeRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  const phone = stripPhone(phoneDisplay);
  const isPhoneValid = /^010\d{8}$/.test(phone);
  const canSubmit = isPhoneValid && agreePrivacy && agreeFintech && agreeRecurring && !loading;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneDisplay(formatPhone(e.target.value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/payments/payapp/create-rebill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, phone }),
      });

      const data = await res.json() as {
        ok?: boolean;
        payurl?: string;
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? "결제 처리 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      if (data.ok && data.payurl) {
        window.location.href = data.payurl;
        // 리다이렉트 후에는 로딩 상태 유지 (이탈 예정)
      } else {
        toast.error("결제 링크 생성에 실패했습니다. 다시 시도해주세요.");
        setLoading(false);
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 안내 배너 */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2">
        <p className="text-xs font-bold text-primary">💳 카드 등록하고 구독 시작</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          버튼 클릭 시 PayApp 결제 페이지로 이동합니다.
          결제 확인 후 구독이 활성화됩니다.
        </p>
      </div>

      {/* 휴대폰번호 입력 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-semibold">
          휴대폰번호 <span className="text-destructive">*</span>
          <span className="text-xs text-muted-foreground font-normal ml-1">(영수증 수신용)</span>
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="010-0000-0000"
          value={phoneDisplay}
          onChange={handlePhoneChange}
          maxLength={13}
          className="rounded-xl h-12 text-base"
          autoComplete="tel"
        />
        {phoneDisplay.length > 0 && !isPhoneValid && (
          <p className="text-xs text-destructive font-medium">
            010으로 시작하는 11자리 번호를 입력해주세요.
          </p>
        )}
      </div>

      {/* 정기결제 고지 배너 */}
      <div className="border-2 border-destructive rounded-xl p-4 bg-destructive/5">
        <p className="text-sm font-semibold text-destructive leading-relaxed">
          첫 결제 확인 후 매월{" "}
          <span className="font-black">{pricing.monthly.toLocaleString()}원</span>이 자동으로 결제됩니다.
          언제든{" "}
          <a href="/settings" className="underline hover:text-destructive/80">
            설정
          </a>
          에서 다음 결제부터 해지할 수 있으며, 이용기간 종료일까지 사용 가능합니다.
        </p>
      </div>

      {/* 약관 체크박스 */}
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-foreground">약관 동의</p>

        <CheckboxRow id="agree-privacy" checked={agreePrivacy} onChange={setAgreePrivacy}>
          <span className="text-destructive font-bold">[필수]</span> 개인정보 수집·이용 동의
          <span className="block text-xs text-muted-foreground mt-0.5">
            수집항목: 휴대폰번호 / 목적: 정기결제 처리 및 영수증 발송 / 보유기간: 계약 종료 후 5년 (전자상거래법)
          </span>
        </CheckboxRow>

        <CheckboxRow id="agree-fintech" checked={agreeFintech} onChange={setAgreeFintech}>
          <span className="text-destructive font-bold">[필수]</span> 전자금융거래 이용약관 동의
          <span className="block text-xs text-muted-foreground mt-0.5">
            전자금융거래법에 따른 이용약관에 동의합니다.
          </span>
        </CheckboxRow>

        <CheckboxRow id="agree-recurring" checked={agreeRecurring} onChange={setAgreeRecurring}>
          <span className="text-destructive font-bold">[필수]</span> 정기결제(자동갱신) 서비스임을 확인했습니다
          <span className="block text-xs text-muted-foreground mt-0.5">
            매월 자동으로 결제되며, 해지 시 이용기간 만료까지 서비스가 유지됩니다.
          </span>
        </CheckboxRow>
      </div>

      {/* 법정 환불 안내 */}
      <div className="rounded-xl border border-muted bg-muted/30 p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">환불 정책 안내</p>
          <a href="/terms#refund" className="text-xs text-primary underline hover:text-primary/80">
            전체 보기 →
          </a>
        </div>
        <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-foreground font-semibold shrink-0">•</span>
            결제 후 7일 이내 + 키워드 검색 5회 이하 + AI 기능 미사용 시:{" "}
            <span className="text-foreground font-semibold">전액 환불</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-semibold shrink-0">•</span>
            결제 오류·중복결제:{" "}
            <span className="text-foreground font-semibold">전액 환불</span>
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-semibold shrink-0">•</span>
            셀프 전액환불은 첫 정기구독 결제 건만 지원됩니다.
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-semibold shrink-0">•</span>
            구독 해지는 다음 결제부터 적용되며, 해지 후에도 남은 이용기간 동안 서비스를 계속 이용하실 수 있습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-foreground font-semibold shrink-0">•</span>
            청약철회 기간: 결제일로부터{" "}
            <span className="text-foreground font-semibold">7일</span>
            {" "}/ 환불 처리:{" "}
            <span className="text-foreground font-semibold">3영업일 이내</span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground mt-1">
          환불 요청 및 문의:{" "}
          <a href="/support" className="underline hover:text-foreground">
            고객센터
          </a>
        </p>
      </div>

      {/* 결제하기 버튼 */}
      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className="w-full h-14 rounded-xl font-black text-base shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform disabled:hover:scale-100"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            결제 페이지 이동 중...
          </span>
        ) : (
          `${pricing.monthly.toLocaleString()}원 구독 시작`
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        버튼 클릭 시 카드 등록 후 첫 결제 확인을 거쳐 구독이 활성화됩니다.
      </p>
    </form>
  );
}
