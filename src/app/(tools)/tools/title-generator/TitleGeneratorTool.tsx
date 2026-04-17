"use client"

import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { BlurOverlay } from "@/components/tools/BlurOverlay"

interface TitleResponse {
  titles: string[]
  remaining: number
  limit: number
}

const POST_TYPES = ["정보성", "리뷰", "리스트형", "비교분석"] as const

export function TitleGeneratorTool() {
  const [keyword, setKeyword] = useState("")
  const [postType, setPostType] = useState<typeof POST_TYPES[number]>("정보성")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TitleResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/public/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), postType }),
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
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="키워드를 입력하세요 (예: 제주도 여행)"
          className="w-full h-12 px-4 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          maxLength={50}
          disabled={loading}
        />
        <div className="flex gap-2">
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as typeof POST_TYPES[number])}
            className="h-12 px-4 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          >
            {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button type="submit" disabled={loading || !keyword.trim()} className="flex-1 h-12">
            {loading ? "생성 중..." : "AI 제목 생성"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">AI 추천 제목</h2>
            <span className="text-sm text-muted-foreground">오늘 {result.limit - result.remaining}/{result.limit}회 사용</span>
          </div>

          {/* 공개: 제목 3개 */}
          <div className="space-y-3">
            {result.titles.map((title, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card">
                <div className="text-xs text-muted-foreground mb-2">추천 제목 {i + 1}</div>
                <div className="text-lg font-semibold">{title}</div>
              </div>
            ))}
          </div>

          {/* 블러: 본문 초안/아웃라인/태그 */}
          <BlurOverlay
            title="본문 초안과 SEO 태그는 로그인 후 확인"
            description="AI가 제목에 맞춰 본문 초안, SEO 아웃라인, 추천 태그를 자동 생성해드립니다."
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="font-semibold">본문 초안 (1,500자)</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>서론: 최근 많은 분들이 이 주제에 관심을 갖고 계신데요...</p>
                  <p>본론: 첫 번째로 중요한 것은...</p>
                  <p>결론: 지금까지 살펴본 내용을 정리하면...</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">SEO 아웃라인 (H2/H3)</div>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>개요 및 핵심 요약</li>
                  <li>상세 분석 5단계</li>
                  <li>자주 묻는 질문 FAQ</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-semibold">추천 SEO 태그</div>
                <div className="flex flex-wrap gap-2">
                  {["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"].map(t => (
                    <span key={t} className="px-3 py-1 rounded-full border text-sm">{t}</span>
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
