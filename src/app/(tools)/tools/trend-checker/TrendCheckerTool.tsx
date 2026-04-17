"use client"

import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { BlurOverlay } from "@/components/tools/BlurOverlay"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface TrendResponse {
  keyword: string
  period: string
  data: { date: string; ratio: number }[]
  remaining: number
  limit: number
}

export function TrendCheckerTool() {
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrendResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/public/trend", {
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
          placeholder="트렌드를 볼 키워드를 입력하세요"
          className="flex-1 h-12 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={50}
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="h-12 px-6"
        >
          {loading ? "분석 중..." : "트렌드 분석"}
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
            <h2 className="text-2xl font-bold">
              &ldquo;{result.keyword}&rdquo; 트렌드 (최근 3개월)
            </h2>
            <span className="text-sm text-muted-foreground">
              오늘 {result.limit - result.remaining}/{result.limit}회 사용
            </span>
          </div>

          {/* 공개: 3개월 차트 */}
          <div className="p-6 rounded-xl border bg-card">
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 블러: 12개월 차트, 비교, 시즌 분석 */}
          <BlurOverlay
            title="12개월 장기 트렌드는 로그인 후 확인"
            description="12개월 이상 장기 추이, 키워드 간 비교 분석, 시즌 패턴 자동 인식을 무료 회원가입으로 확인하세요."
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="font-semibold">12개월 장기 트렌드</div>
                <div className="h-[180px] rounded-lg border bg-muted/30" />
              </div>
              <div className="space-y-2">
                <div className="font-semibold">키워드 비교 분석</div>
                <div className="text-sm text-muted-foreground">
                  최대 5개 키워드를 동시 비교하여 상대적 트렌드 파악
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">시즌 분석</div>
                <div className="text-sm text-muted-foreground">
                  상승기·정점·하락기 자동 식별 및 콘텐츠 발행 시점 추천
                </div>
              </div>
            </div>
          </BlurOverlay>
        </div>
      )}
    </div>
  )
}
