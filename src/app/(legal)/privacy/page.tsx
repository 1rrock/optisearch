import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 옵티써치",
  description: "옵티써치 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-black tracking-tight mb-2">개인정보처리방침</h1>
      <p className="text-sm text-muted-foreground mb-10">최종 수정일: 2026년 4월 2일</p>

      <p className="text-muted-foreground leading-relaxed mb-10">
        옵티써치(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
        본 방침은 서비스가 수집하는 개인정보의 항목, 수집 목적, 보유 기간, 처리 방식 및 이용자의 권리를 안내합니다.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">1. 수집하는 개인정보 항목</h2>
        <p className="text-muted-foreground mb-3">서비스는 소셜 로그인(구글, 카카오)을 통해 다음 정보를 수집합니다.</p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>이메일 주소</li>
          <li>이름(닉네임)</li>
        </ul>
        <p className="text-muted-foreground mt-3">서비스 이용 과정에서 다음 정보가 자동으로 생성·수집될 수 있습니다.</p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-1">
          <li>키워드 검색 기록</li>
          <li>AI 기능 사용 이력 (요청 횟수, 사용 시각)</li>
          <li>서비스 접속 로그, IP 주소, 브라우저 정보</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">2. 개인정보 수집 목적</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>회원 식별 및 서비스 제공</li>
          <li>키워드 분석·AI 기능 등 유료/무료 플랜별 사용량 관리</li>
          <li>고객 문의 대응 및 공지 전달</li>
          <li>서비스 품질 개선 및 통계 분석 (비식별 처리 후 활용)</li>
          <li>부정 이용 방지 및 보안 유지</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">3. 개인정보 보유 및 이용 기간</h2>
        <p className="text-muted-foreground mb-3">
          개인정보는 회원 탈퇴 시 지체 없이 파기합니다. 단, 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관합니다.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>전자상거래 관련 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
          <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          <li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">4. 개인정보의 제3자 제공</h2>
        <p className="text-muted-foreground mb-3">
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 서비스 운영을 위해 아래 수탁업체에 처리를 위탁합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground border border-muted/50 rounded-xl overflow-hidden">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">수탁업체</th>
                <th className="py-3 px-4 text-left font-semibold">위탁 업무</th>
                <th className="py-3 px-4 text-left font-semibold">보유 기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              <tr>
                <td className="py-3 px-4">Supabase, Inc.</td>
                <td className="py-3 px-4">회원 정보 및 서비스 데이터 클라우드 저장</td>
                <td className="py-3 px-4">회원 탈퇴 시까지</td>
              </tr>
              <tr>
                <td className="py-3 px-4">OpenAI, L.L.C.</td>
                <td className="py-3 px-4">AI 콘텐츠 생성 API 처리 (검색어 등 입력값 전달)</td>
                <td className="py-3 px-4">API 처리 완료 즉시 파기 (OpenAI 정책에 따름)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          위 업체들은 서비스 제공 목적 범위 내에서만 개인정보를 처리하며, 목적 외 이용은 금지됩니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">5. 이용자의 권리</h2>
        <p className="text-muted-foreground mb-3">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>개인정보 열람 요청</li>
          <li>오류 정정 또는 삭제 요청</li>
          <li>처리 정지 요청</li>
          <li>동의 철회 (회원 탈퇴를 통해 행사 가능)</li>
        </ul>
        <p className="text-muted-foreground mt-3">
          권리 행사는 아래 연락처로 요청하시면 지체 없이 조치하겠습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">6. 쿠키 및 자동 수집 장치</h2>
        <p className="text-muted-foreground">
          서비스는 세션 유지 및 로그인 상태 확인을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 비활성화할 수 있으나,
          일부 서비스 기능이 정상적으로 작동하지 않을 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">7. 개인정보보호 책임자 및 연락처</h2>
        <div className="bg-muted/20 rounded-2xl p-6 text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">서비스명:</span> 옵티써치 (OptiSearch)</p>
          <p><span className="font-semibold text-foreground">사업자명:</span> 알에이케이랩스</p>
          <p><span className="font-semibold text-foreground">사업자등록번호:</span> 570-01-03731</p>
          <p><span className="font-semibold text-foreground">대표자:</span> 최원락</p>
          <p><span className="font-semibold text-foreground">고객지원:</span>{" "}
            <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a>
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          개인정보 관련 불만·피해 구제를 위해 개인정보분쟁조정위원회(1833-6972) 또는 개인정보침해신고센터(privacy.kisa.or.kr)에 신고하실 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">8. 방침 변경 안내</h2>
        <p className="text-muted-foreground">
          본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 사전 안내합니다.
        </p>
      </section>
    </article>
  );
}
