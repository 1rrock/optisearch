import type { Metadata } from "next";
import { MessageCircle, Mail, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "문의하기 | 옵티써치",
  description: "옵티써치 고객센터 문의 안내 - 카카오톡, 이메일, 전화로 문의하세요.",
};

export default function ContactPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-black tracking-tight mb-2">문의하기</h1>
      <p className="text-sm text-muted-foreground mb-10">
        궁금한 점이나 도움이 필요하시면 아래 채널로 연락해 주세요.
      </p>

      <section className="mb-10 not-prose">
        <h2 className="text-xl font-bold mb-6 text-foreground">연락 채널</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="http://pf.kakao.com/_CupuX"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[#FEE500]/10 border border-[#FEE500]/30 rounded-2xl p-6 hover:bg-[#FEE500]/20 transition-colors"
          >
            <MessageCircle className="w-8 h-8 text-[#FEE500] mb-3" />
            <h3 className="font-bold text-foreground mb-1">카카오톡</h3>
            <p className="text-sm text-muted-foreground">가장 빠른 응대 채널</p>
            <p className="text-xs text-muted-foreground mt-2">평일 10:00 - 18:00</p>
          </a>

          <a
            href="mailto:zxcv1685@gmail.com"
            className="group bg-muted/20 border border-muted/40 rounded-2xl p-6 hover:bg-muted/30 transition-colors"
          >
            <Mail className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-bold text-foreground mb-1">이메일</h3>
            <p className="text-sm text-muted-foreground">zxcv1685@gmail.com</p>
            <p className="text-xs text-muted-foreground mt-2">영업일 기준 1~2일 내 답변</p>
          </a>

          <div className="bg-muted/20 border border-muted/40 rounded-2xl p-6">
            <Phone className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-bold text-foreground mb-1">전화</h3>
            <p className="text-sm text-muted-foreground">070-8065-7571</p>
            <p className="text-xs text-muted-foreground mt-2">평일 10:00 - 18:00</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">문의 시 참고사항</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>결제·환불 문의 시 가입 이메일과 결제 일시를 함께 알려주시면 빠른 처리가 가능합니다.</li>
          <li>서비스 오류 신고 시 화면 캡처와 사용 중인 브라우저 정보를 첨부해 주세요.</li>
          <li>제휴·협업 제안은 이메일로 보내주시면 검토 후 회신드리겠습니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">자주 묻는 질문</h2>
        <p className="text-muted-foreground">
          일반적인 질문에 대한 답변은{" "}
          <a href="/support" className="underline hover:text-foreground">고객지원 / FAQ 페이지</a>
          에서 확인하실 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">운영 정보</h2>
        <div className="bg-muted/20 rounded-2xl p-6 text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">서비스명:</span> 옵티써치 (OptiSearch)</p>
          <p><span className="font-semibold text-foreground">사업자명:</span> 알에이케이랩스</p>
          <p><span className="font-semibold text-foreground">사업자등록번호:</span> 570-01-03731</p>
          <p><span className="font-semibold text-foreground">대표자:</span> 최원락</p>
          <p><span className="font-semibold text-foreground">소재지:</span> 대한민국</p>
        </div>
      </section>
    </article>
  );
}
