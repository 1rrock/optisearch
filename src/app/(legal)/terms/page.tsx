import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 옵티써치",
  description: "옵티써치 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-black tracking-tight mb-2">이용약관</h1>
      <p className="text-sm text-muted-foreground mb-10">최종 수정일: 2026년 4월 2일</p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제1조 (목적)</h2>
        <p className="text-muted-foreground leading-relaxed">
          본 약관은 옵티써치(이하 &ldquo;서비스&rdquo;)가 제공하는 네이버 키워드 분석 및 AI 콘텐츠 최적화 서비스의 이용 조건과
          절차, 서비스 제공자와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제2조 (서비스 소개)</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          옵티써치는 네이버 검색 데이터를 기반으로 키워드 검색량·경쟁도를 분석하고, AI를 활용하여 블로그 제목 및 초안을 생성하며,
          SEO 점수 피드백을 제공하는 한국형 콘텐츠 마케팅 SaaS입니다.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          서비스는 인터넷을 통해 제공되며, 별도 설치 없이 웹 브라우저에서 이용할 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제3조 (회원가입 및 계정)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>회원가입은 네이버 소셜 로그인을 통해 이루어집니다.</li>
          <li>이용자는 타인의 계정 정보를 도용하거나 허위 정보로 가입할 수 없습니다.</li>
          <li>계정의 관리 책임은 이용자에게 있으며, 계정 양도·공유는 허용되지 않습니다.</li>
          <li>이용자는 계정 도용 또는 보안 위협을 인지한 즉시 서비스에 신고해야 합니다.</li>
          <li>서비스는 법령 위반, 약관 위반, 운영 정책 위반 시 사전 통보 후 또는 즉시 계정을 정지·삭제할 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제4조 (서비스 이용 — 무료 및 유료 플랜)</h2>
        <p className="text-muted-foreground mb-3">서비스는 다음 플랜으로 제공됩니다.</p>
        <div className="space-y-4">
          <div className="bg-muted/20 rounded-2xl p-5">
            <h3 className="font-bold mb-2">무료 플랜 (Free)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
              <li>키워드 검색 10회/일</li>
              <li>AI 제목 생성 3회/일, 초안 1회/일, 점수 1회/일</li>
              <li>인기글 TOP3, 트렌드 차트 3개월</li>
            </ul>
          </div>
          <div className="bg-muted/20 rounded-2xl p-5">
            <h3 className="font-bold mb-2">베이직 플랜 (Basic)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
              <li>무제한 키워드 검색</li>
              <li>AI 제목 20회/일, 초안 5회/일</li>
              <li>SEO 점수 분석 10회/일</li>
              <li>대량 키워드 분석 50개/회</li>
              <li>검색량 데이터 엑셀 추출</li>
              <li>첫 1개월 무료 체험</li>
            </ul>
          </div>
          <div className="bg-muted/20 rounded-2xl p-5">
            <h3 className="font-bold mb-2">프로 플랜 (Pro)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
              <li>베이직 플랜의 모든 기능</li>
              <li>AI 제목 100회/일, 초안 30회/일</li>
              <li>SEO 점수 분석 50회/일</li>
              <li>대량 키워드 분석 500개/회</li>
              <li>전체 기간 트렌드 분석</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          각 플랜의 기능 및 요금은 서비스 내 요금 안내 페이지에서 확인할 수 있으며, 사전 공지 후 변경될 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제5조 (결제 및 환불)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>유료 플랜 이용 요금은 결제일 기준 월 단위로 청구됩니다.</li>
          <li>
            디지털 콘텐츠 서비스 특성상, 결제 후 서비스를 이용하기 시작한 경우 「전자상거래 등에서의 소비자보호에 관한 법률」
            제17조에 따라 청약 철회가 제한될 수 있습니다.
          </li>
          <li>
            결제 후 14일 이내이며 서비스를 실질적으로 이용하지 않은 경우, 환불을 요청할 수 있습니다.
            환불 요청은 <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>로 문의하시기 바랍니다.
          </li>
          <li>구독 취소 후에는 해당 결제 기간 종료 시까지 서비스를 이용할 수 있으며, 이후 무료 플랜으로 전환됩니다.</li>
          <li>결제 오류 또는 이중 청구 발생 시 즉시 전액 환불 처리합니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제6조 (금지 행위)</h2>
        <p className="text-muted-foreground mb-3">이용자는 다음 행위를 하여서는 안 됩니다.</p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>자동화 봇, 스크레이퍼, 매크로 등을 이용한 서비스 과도 접근 또는 데이터 수집</li>
          <li>API 키 무단 복제·공유 또는 허용 범위를 초과한 API 호출</li>
          <li>타인의 명의나 계정을 도용하여 서비스 이용</li>
          <li>서비스의 정상적인 운영을 방해하거나 서버에 과부하를 유발하는 행위</li>
          <li>서비스를 이용하여 저작권·상표권 등 타인의 지식재산권을 침해하는 콘텐츠 생성</li>
          <li>불법 정보, 음란물, 혐오 표현 등 법령에서 금지하는 내용을 생성·유포하는 행위</li>
          <li>서비스 소스코드·알고리즘의 역공학(리버스 엔지니어링) 시도</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-3">
          금지 행위 적발 시 사전 경고 없이 계정 정지 또는 영구 삭제 조치가 취해질 수 있으며, 법적 책임을 질 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제7조 (서비스 변경 및 중단)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>서비스는 운영 및 기술적 필요에 의해 기능 일부 또는 전부를 변경·추가·제거할 수 있습니다.</li>
          <li>서비스 종료 시 최소 30일 전 서비스 내 공지사항을 통해 사전 고지합니다.</li>
          <li>서버 점검·장애·천재지변 등 불가피한 사유로 일시적 서비스 중단이 발생할 수 있으며, 이 경우 별도 보상은 제공되지 않습니다.</li>
          <li>유료 플랜 이용자에 대해서는 서비스 중단 기간에 비례하여 이용 기간 연장 또는 환불을 검토합니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제8조 (면책 조항)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            서비스는 AI를 통해 생성된 콘텐츠의 정확성, 완전성, 적법성을 보장하지 않습니다. 생성된 콘텐츠의 최종 검토 및
            활용 책임은 이용자에게 있습니다.
          </li>
          <li>서비스는 이용자가 서비스를 통해 달성하는 검색 순위, 트래픽, 수익 등 비즈니스 결과를 보장하지 않습니다.</li>
          <li>네이버 등 외부 플랫폼의 정책 변경으로 인한 데이터 제공 중단에 대해 서비스는 책임을 지지 않습니다.</li>
          <li>이용자 귀책 사유로 발생한 손해에 대해서는 서비스가 책임을 지지 않습니다.</li>
          <li>서비스의 고의 또는 중과실로 발생한 손해에 대한 배상 한도는 해당 월 결제 금액을 초과하지 않습니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제9조 (지식재산권)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>서비스 내 UI, 로고, 소프트웨어, 데이터베이스 등의 지식재산권은 옵티써치에 귀속됩니다.</li>
          <li>이용자가 서비스를 통해 생성한 콘텐츠의 권리는 이용자에게 귀속됩니다.</li>
          <li>
            이용자는 서비스 개선을 위해 생성 콘텐츠를 비식별 처리하여 모델 학습에 활용하는 것에 동의합니다.
            원하지 않는 경우 고객센터에 거부 의사를 알릴 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제10조 (분쟁 해결)</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>서비스 이용과 관련한 분쟁은 먼저 <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>을 통한 협의로 해결을 시도합니다.</li>
          <li>협의가 이루어지지 않을 경우, 소비자분쟁조정위원회에 조정을 신청하거나 소 제기를 통해 해결할 수 있습니다.</li>
          <li>본 약관에 관한 소송은 대한민국 법률을 준거법으로 하며, 관할 법원은 서울중앙지방법원으로 합니다.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">제11조 (약관 변경)</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스는 법령 변경 또는 서비스 정책 변경 시 본 약관을 수정할 수 있습니다. 변경된 약관은 서비스 내 공지사항을 통해
          시행 7일 전(중요 사항의 경우 30일 전)에 안내하며, 이후에도 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 간주합니다.
        </p>
      </section>

      <div className="pt-6 border-t border-muted/50 space-y-3">
        <p className="text-sm text-muted-foreground">
          문의사항이 있으시면 <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>로 연락해 주세요.
        </p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>상호: 알에이케이랩스 | 사업자등록번호: 570-01-03731 | 대표자: 최원락</p>
        </div>
      </div>
    </article>
  );
}
