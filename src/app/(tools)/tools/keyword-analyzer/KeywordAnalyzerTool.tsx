"use client"

import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { BlurOverlay } from "@/components/tools/BlurOverlay"

interface AnalyzeResponse {
  keyword: string
  totalSearchVolume: number
  pcSearchVolume: number
  mobileSearchVolume: number
  competition: "낮음" | "중간" | "높음"
  keywordGrade: string
  remaining: number
  limit: number
}

export function KeywordAnalyzerTool() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/public/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="분석할 키워드를 입력하세요 (예: 아이폰 17)"
          className="flex-1 h-12 px-4 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={50}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !keyword.trim()} size="lg">
          {loading ? "분석 중..." : "분석하기"}
        </Button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">&quot;{result.keyword}&quot; 분석 결과</h2>
            <span className="text-sm text-muted-foreground">
              오늘 {result.limit - result.remaining}/{result.limit}회 사용
            </span>
          </div>

          {/* 공개 영역: 검색량 + 경쟁도 + 등급 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 rounded-xl border bg-card">
              <div className="text-sm text-muted-foreground mb-2">월간 검색량</div>
              <div className="text-3xl font-bold">{result.totalSearchVolume.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-2">
                PC {result.pcSearchVolume.toLocaleString()} · 모바일 {result.mobileSearchVolume.toLocaleString()}
              </div>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="text-sm text-muted-foreground mb-2">경쟁도</div>
              <div className="text-3xl font-bold">{result.competition}</div>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="text-sm text-muted-foreground mb-2">키워드 등급</div>
              <div className="text-3xl font-bold">{result.keywordGrade}</div>
            </div>
          </div>

          {/* 블러 영역: 포화지수, 클릭률, 관련 키워드, 상위 글 */}
          <BlurOverlay
            title="상세 분석은 로그인 후 확인"
            description="포화지수, 예상 클릭률, 관련 키워드 20개, 상위 노출 글 분석 등 더 자세한 데이터를 무료 회원가입으로 확인하세요."
          >
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground">포화지수</div>
                  <div className="text-2xl font-bold">0.0234</div>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground">예상 클릭률</div>
                  <div className="text-2xl font-bold">12.5%</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">관련 키워드 TOP 20</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} className="px-3 py-1 rounded-full border text-sm">
                      샘플 키워드 {i + 1}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">상위 노출 글 분석</div>
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border text-sm">
                      상위 노출 글 제목 예시 {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BlurOverlay>
        </div>
      )}
    </div>
  )
}
