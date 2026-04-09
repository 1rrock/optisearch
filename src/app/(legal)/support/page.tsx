"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";

const faqs = [
  {
    question: "옵티써치는 어떤 서비스인가요?",
    answer:
      "옵티써치는 네이버 키워드 분석과 AI 콘텐츠 최적화를 하나로 제공하는 도구입니다. 키워드의 검색량·경쟁도·트렌드를 분석하고, AI를 활용해 블로그 제목·본문 등을 최적화하여 더 많은 사람들에게 노출될 수 있도록 도와줍니다.",
  },
  {
    question: "무료 플랜과 유료 플랜의 차이는 무엇인가요?",
    answer:
      "무료 플랜은 하루 10회 키워드 검색, AI 제목 3회, 초안·점수 각 1회를 이용할 수 있으며 인기글 TOP3과 3개월 트렌드를 제공합니다. 베이직 플랜부터는 하루 300회 검색, 인기글 TOP7, 섹션 분석, 성별/연령 필터, 쇼핑 인사이트 등 모든 기능을 이용하실 수 있습니다.",
  },
  {
    question: "베이직 플랜 무료 체험은 어떻게 되나요?",
    answer:
      "베이직 플랜은 첫 1개월을 무료로 체험하실 수 있습니다. 무료 체험 기간이 끝나면 월 9,900원으로 자동 결제됩니다. 원치 않으시면 무료 체험 기간 내 언제든지 취소하시면 과금이 발생하지 않습니다.",
  },
  {
    question: "프로 플랜도 무료 체험이 있나요?",
    answer:
      "프로 플랜은 무료 체험 기간 없이 바로 결제가 이루어집니다. 결제 전 무료 플랜 또는 베이직 플랜 체험을 통해 서비스를 먼저 경험해 보시는 것을 권장드립니다.",
  },
  {
    question: "구독을 취소하면 어떻게 되나요?",
    answer:
      "구독을 취소하셔도 현재 결제된 기간이 끝날 때까지 모든 기능을 그대로 이용하실 수 있습니다. 결제 기간 종료 후에는 자동으로 무료 플랜으로 전환되며, 추가 과금은 발생하지 않습니다.",
  },
  {
    question: "결제는 어떤 방식으로 진행되나요?",
    answer:
      "결제 시스템은 현재 준비 중입니다. 곧 안전한 결제 수단을 제공할 예정입니다.",
  },
  {
    question: "데이터는 안전한가요?",
    answer:
      "네, 이용자의 개인정보는 암호화되어 안전하게 저장됩니다. 수집된 정보는 서비스 제공 목적에만 사용되며, 법령에서 정한 경우를 제외하고는 제3자에게 제공되지 않습니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.",
  },
  {
    question: "환불이 가능한가요?",
    answer:
      "베이직 플랜 무료 체험 기간 내에 취소하시면 과금 없이 이용하실 수 있습니다. 정식 결제 이후의 환불은 케이스별로 검토하고 있으니, 아래 고객지원 채널로 문의해 주시면 최대한 도움을 드리겠습니다.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-muted/40 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-muted-foreground leading-relaxed text-sm border-t border-muted/30">
          <p className="pt-4">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-black tracking-tight mb-2">고객지원 / FAQ</h1>
      <p className="text-sm text-muted-foreground mb-10">
        궁금한 점이 있으시면 아래 자주 묻는 질문을 먼저 확인해 주세요.
      </p>

      {/* FAQ Section */}
      <section className="mb-14 not-prose">
        <h2 className="text-xl font-bold mb-6 text-foreground">자주 묻는 질문</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="not-prose">
        <h2 className="text-xl font-bold mb-6 text-foreground">직접 문의하기</h2>
        <div className="bg-muted/20 rounded-2xl p-8 space-y-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            FAQ에서 해결되지 않은 문제는 아래 채널로 문의해 주세요. 빠르게 도움을 드리겠습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <a
              href="http://pf.kakao.com/_CupuX"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="rounded-xl font-bold bg-[#FEE500] text-[#191919] hover:bg-[#F5DC00] shadow-md hover:scale-[1.02] transition-all flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                카카오톡으로 문의하기
              </Button>
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            평일 10:00 - 18:00 운영 (주말/공휴일 제외)
          </p>
        </div>
      </section>
    </article>
  );
}
