"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "해석은 어떻게 작동하나요?",
    a: "검색량·경쟁도·콘텐츠 포화 지수 같은 데이터를 종합해서, '이 키워드는 어떤 상황에 적합한지', '먼저 노릴 연관 키워드는 무엇인지'까지 자연어로 풀어드려요.",
  },
  {
    q: "데이터는 어디서 오나요?",
    a: "네이버 검색광고 API, 데이터랩 공식 API를 사용합니다.",
  },
  {
    q: "만들어진 글, 네이버에서 노출 잘 되나요?",
    a: "OptiSearch는 글을 자동 발행하지 않아요. 초안만 드리고, 본인 경험·말투를 더해 발행하시는 걸 권장드립니다.",
  },
  {
    q: "환불되나요?",
    a: "가입 즉시 2주 동안 Pro 무료 체험이 자동으로 시작되고, 카드 등록 없이 끝나면 Free로 자동 전환되니 환불 부담이 없어요. 결제 등록 후에도 언제든 해지할 수 있습니다.",
  },
  {
    q: "모바일에서도 돼요?",
    a: "네, PC·모바일 모두 지원합니다.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`size-5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function FAQSection() {
  return (
    <section className="py-20 px-6 bg-muted/30 border-t border-border">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-center text-foreground mb-10">
          자주 묻는 질문
        </h2>

        <div className="rounded-2xl border border-border bg-background divide-y divide-border overflow-hidden px-6">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
