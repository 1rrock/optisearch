import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "면책조항 | 옵티써치",
  description: "옵티써치 서비스 이용에 관한 면책조항 안내",
};

export default function DisclaimerPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-black tracking-tight mb-2">면책조항</h1>
      <p className="text-sm text-muted-foreground mb-10">최종 수정일: 2026년 4월 16일</p>

      <p className="text-muted-foreground leading-relaxed mb-10">
        옵티써치(이하 &ldquo;서비스&rdquo;)를 이용해 주셔서 감사합니다.
        본 면책조항은 서비스 이용 시 참고해야 할 중요한 사항을 안내합니다.
        서비스를 이용함으로써 아래 내용에 동의하는 것으로 간주됩니다.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">1. 정보의 정확성</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스에서 제공하는 키워드 검색량, 경쟁도, 트렌드 등의 데이터는 외부 검색 플랫폼의 공개 데이터를
          기반으로 산출한 추정치입니다. 데이터의 정확성, 완전성, 최신성을 100% 보장하지 않으며,
          참고 자료로만 활용해 주시기 바랍니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">2. AI 생성 콘텐츠</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스의 AI 기능(제목 생성, 본문 초안, SEO 점수 분석 등)이 제공하는 결과물은 자동화된 알고리즘에 의해
          생성되며, 사실 관계의 정확성이나 적법성을 보장하지 않습니다. AI가 생성한 콘텐츠를 그대로 게시하기 전에
          반드시 이용자 본인이 내용을 검토하고 수정하시기 바랍니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">3. 비즈니스 결과에 대한 보증 부재</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스를 이용하여 얻은 키워드 분석 결과나 AI 콘텐츠를 활용한 블로그 운영, 검색 순위 변동, 트래픽 증감,
          수익 창출 등 비즈니스 결과에 대해 어떠한 보증도 하지 않습니다. 콘텐츠 전략 수립 및 실행의 최종 판단과
          책임은 이용자에게 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">4. 외부 플랫폼 정책 변경</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스는 외부 검색 플랫폼의 데이터를 활용합니다. 해당 플랫폼의 정책 변경, API 변경,
          서비스 중단 등으로 인해 데이터 제공이 일시적 또는 영구적으로 중단될 수 있으며,
          이에 따른 손해에 대해 서비스는 책임을 지지 않습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">5. 서비스 가용성</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스는 안정적인 운영을 위해 최선을 다하고 있으나, 서버 점검, 기술적 장애, 천재지변 등의 사유로
          일시적인 서비스 중단이 발생할 수 있습니다. 서비스 중단으로 인한 데이터 손실이나
          업무 차질에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">6. 손해배상 한도</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스의 고의 또는 중대한 과실로 인한 손해를 제외하고, 서비스 이용으로 발생한 직접적·간접적 손해에 대한
          배상 책임은 이용자가 해당 월에 지불한 서비스 이용 요금을 한도로 합니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">7. 외부 링크</h2>
        <p className="text-muted-foreground leading-relaxed">
          서비스 내에 포함된 외부 웹사이트 링크는 이용자의 편의를 위해 제공되며,
          해당 외부 사이트의 내용이나 정책에 대해 서비스는 책임을 지지 않습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">8. 면책조항 변경</h2>
        <p className="text-muted-foreground leading-relaxed">
          본 면책조항은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
          변경된 면책조항은 공지 후 효력이 발생합니다.
        </p>
      </section>

      <div className="pt-6 border-t border-muted/50 space-y-3">
        <p className="text-sm text-muted-foreground">
          문의사항이 있으시면{" "}
          <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>
          {" "}또는 이메일(zxcv1685@gmail.com)로 연락해 주세요.
        </p>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>상호: 알에이케이랩스 (OptiSearch) | 사업자등록번호: 570-01-03731 | 대표자: 최원락</p>
        </div>
      </div>
    </article>
  );
}
