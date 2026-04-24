This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PayApp Local Test 연결

`/Users/1rrock/opencodeproject/PAYAPP_LOCAL_TEST`를 이미 설치한 상태에서 OptiSearch와 연결하는 절차입니다.

1. 로컬 테스트 서버 실행

```bash
cd "/Users/1rrock/opencodeproject/PAYAPP_LOCAL_TEST"
./gradlew bootRun
```

2. OptiSearch env 분리 템플릿 복사

```bash
cd "/Users/1rrock/opencodeproject/optisearch"
cp .env.payapp-local-test.example .env.payapp-local-test
```

3. `.env.payapp-local-test`의 PayApp 값들을 `.env.local`에 반영

- `PAYAPP_LOCAL_TEST_MODE=true`
- `PAYAPP_API_URL=http://localhost:20001/oapi/apiLoad.html`
- `PAYAPP_LINK_VAL=linkval`
- `PAYAPP_FEEDBACK_URL=http://localhost:3000/api/payments/payapp/webhook`

4. OptiSearch 실행

```bash
npm run dev
```

5. 결제 테스트

- 브라우저에서 결제 시작(체크아웃)
- 로컬 페이앱 화면(`http://localhost:20001`)에서 **카드결제완료** 클릭
- OptiSearch webhook(`/api/payments/payapp/webhook`)로 콜백 수신되어 구독 상태가 갱신되는지 확인

주의:
- `PAYAPP_LOCAL_TEST`는 정식 PayApp의 `billRegist/billPay`를 그대로 지원하지 않습니다.
- 이 프로젝트는 `PAYAPP_LOCAL_TEST_MODE=true`일 때 로컬 테스트 서버 호환 경로로 자동 변환해 테스트를 가능하게 합니다.
