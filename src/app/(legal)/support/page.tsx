"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";

const faqs = [
  {
    question: "옵티써치는 어떤 서비스인가요?",
    answer:
      "옵티써치는 키워드 분석과 AI 콘텐츠 최적화를 하나로 제공하는 도구입니다. 키워드의 검색량·경쟁도·트렌드를 분석하고, AI를 활용해 블로그 제목·본문 등을 최적화하여 더 많은 사람들에게 노출될 수 있도록 도와줍니다.",
  },
  {
    question: "무료 플랜과 유료 플랜의 차이는 무엇인가요?",
    answer:
      "무료 플랜은 하루 10회 키워드 검색, AI 제목 3회, 초안·점수 각 1회를 이용할 수 있으며 인기글 TOP3과 3개월 트렌드를 제공합니다. 베이직 플랜부터는 하루 300회 검색, 인기글 TOP7, 섹션 분석, 성별/연령 필터, 쇼핑 인사이트 등 모든 기능을 이용하실 수 있습니다.",
  },
  {
    question: "구독을 취소하면 어떻게 되나요?",
    answer:
      "구독을 취소하셔도 현재 결제된 기간이 끝날 때까지 모든 기능을 그대로 이용하실 수 있습니다. 결제 기간 종료 후에는 자동으로 무료 플랜으로 전환되며, 추가 과금은 발생하지 않습니다. 해지 시 남은 기간에 대한 비례환불이 자동으로 계산·처리되며, 일부 환불 건은 결제수단 확인에 따라 수동 검토가 추가될 수 있습니다.",
  },
  {
    question: "결제는 어떤 방식으로 진행되나요?",
    answer:
      "신용카드·체크카드를 통한 월 정기결제(자동갱신) 방식으로 운영됩니다. 카드 등록 후 첫 결제가 승인되면 구독이 시작되며, 이후 이용자가 명시적으로 해지하지 않는 한 매월 동일 금액이 자동으로 청구됩니다. 표시 요금은 VAT 10%가 포함된 금액입니다.",
  },
  {
    question: "데이터는 안전한가요?",
    answer:
      "네, 이용자의 개인정보는 암호화되어 안전하게 저장됩니다. 수집된 정보는 서비스 제공 목적에만 사용되며, 법령에서 정한 경우를 제외하고는 제3자에게 제공되지 않습니다. 자세한 내용은 개인정보처리방침을 확인해 주세요.",
  },
  {
    question: "환불이 가능한가요?",
    answer:
      "첫 정기구독 결제 건은 결제일 7일 이내 + 키워드 검색 5회 이하 + AI 기능 미사용 조건을 만족하면 셀프 전액환불을 요청할 수 있습니다. 그 외에는 구독 해지 시 남은 기간에 대한 자동 비례환불이 처리되며, 같은 이용기간 안의 업그레이드 차액 결제도 해당 비례환불 계산에 포함될 수 있습니다. 결제 오류·중복결제는 확인 즉시 전액 환불 처리됩니다.",
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
