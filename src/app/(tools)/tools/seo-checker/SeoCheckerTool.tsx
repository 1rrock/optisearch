"use client"

import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { BlurOverlay } from "@/components/tools/BlurOverlay"
import { CheckCircle2, XCircle } from "lucide-react"

interface CheckItem {
  label: string
  passed: boolean
  detail: string
}

interface SeoResponse {
  score: number
  grade: "A" | "B" | "C" | "D"
  checks: CheckItem[]
  remaining: number
  limit: number
}

const gradeColors: Record<SeoResponse["grade"], string> = {
  A: "text-green-600 bg-green-50 dark:bg-green-950",
  B: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  C: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  D: "text-red-600 bg-red-50 dark:bg-red-950",
}

export function SeoCheckerTool() {
  const [title, setTitle] = useState("")
  const [keyword, setKeyword] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SeoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !keyword.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/public/seo-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), keyword: keyword.trim(), content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "요청에 실패했습니다.")
        setResult(null)
      } else {
        setResult(data)
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="글 제목을 입력하세요"
          className="w-full h-12 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={200}
          disabled={loading}
        />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="타겟 키워드 (예: 블로그 SEO)"
          className="w-full h-12 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={50}
          disabled={loading}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="본문을 입력하세요 (선택 사항, 최대 20,000자)"
          className="w-full min-h-[160px] px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          maxLength={20000}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !title.trim() || !keyword.trim()} className="w-full h-12">
          {loading ? "분석 중..." : "SEO 점수 분석"}
        </Button>
      </form>

      {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">SEO 점수 결과</h2>
            <span className="text-sm text-muted-foreground">오늘 {result.limit - result.remaining}/{result.limit}회 사용</span>
          </div>

          {/* 점수 카드 */}
          <div className="p-6 rounded-xl border bg-card flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">총점</div>
              <div className="text-5xl font-bold">{result.score} <span className="text-xl text-muted-foreground">/ 100</span></div>
            </div>
            <div className={`px-6 py-3 rounded-xl text-3xl font-bold ${gradeColors[result.grade]}`}>
              {result.grade}
            </div>
          </div>

          {/* 체크리스트 */}
          <div className="space-y-2">
            <div className="font-semibold">기본 체크리스트</div>
            {result.checks.map((check, i) => (
              <div key={i} className="p-4 rounded-lg border flex items-start gap-3">
                {check.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium">{check.label}</div>
                  <div className="text-sm text-muted-foreground">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 블러 영역 */}
          <BlurOverlay
            title="상세 개선 제안은 로그인 후 확인"
            description="5가지 구체적 개선 포인트, 상위 경쟁 글과의 비교, 키워드 밀도 분석을 무료 회원가입으로 확인하세요."
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="font-semibold">상세 개선 제안</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>제목에 숫자 또는 연도를 추가하면 클릭률이 높아집니다</li>
                  <li>첫 문단 100자 안에 타겟 키워드를 한 번 더 반복하세요</li>
                  <li>H2 소제목을 3개 이상 추가해 가독성을 높이세요</li>
                  <li>관련 키워드 5~10개를 본문에 자연스럽게 포함하세요</li>
                  <li>이미지에 대체 텍스트(alt)를 추가하세요</li>
                </ol>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">경쟁 글 비교</div>
                <div className="text-sm text-muted-foreground">상위 노출 글 평균 2,400자 vs 내 글 {content.length.toLocaleString()}자</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">키워드 밀도</div>
                <div className="text-sm text-muted-foreground">타겟 키워드: 2.3% (권장: 1.5~3%)</div>
              </div>
            </div>
          </BlurOverlay>
        </div>
      )}
    </div>
  )
}
