import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-black text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-3">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-muted rounded-xl font-bold text-foreground hover:bg-muted/50 transition-colors"
          >
            대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
