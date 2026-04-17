import type { Metadata } from "next"
import Link from "next/link"
import { guides } from "./_content"

export const metadata: Metadata = {
  title: "SEO & 블로그 가이드 | 옵티써치",
  description: "키워드 분석, 블로그 SEO, 콘텐츠 마케팅, 실전 활용 등 블로거/마케터를 위한 무료 SEO 가이드 모음.",
}

const categories = ["키워드 분석", "블로그 SEO", "콘텐츠 마케팅", "실전 활용"] as const

export default function GuidesIndexPage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">SEO & 블로그 가이드</h1>
        <p className="text-lg text-muted-foreground">
          검색 상위 노출과 블로그 수익화에 필요한 핵심 지식을 정리한 무료 가이드입니다.
          키워드 분석부터 실전 운영 노하우까지 단계별로 학습해보세요.
        </p>
      </header>

      {categories.map(category => {
        const categoryGuides = guides.filter(g => g.category === category)
        if (categoryGuides.length === 0) return null
        return (
          <section key={category} className="space-y-4">
            <h2 className="text-2xl font-semibold border-b pb-2">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryGuides.map(guide => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="block p-6 rounded-xl border hover:border-foreground/40 hover:bg-muted/30 transition-colors"
                >
                  <h3 className="font-semibold mb-2">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{guide.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{guide.author}</span>
                    <span>·</span>
                    <span>{guide.readingMinutes}분 읽기</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
