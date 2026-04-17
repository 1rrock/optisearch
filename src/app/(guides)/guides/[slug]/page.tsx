import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { guides, getGuideBySlug } from "../_content"
import { ChevronLeft } from "lucide-react"

export async function generateStaticParams() {
  return guides.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return {}
  return {
    title: `${guide.title} | 옵티써치 가이드`,
    description: guide.description,
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  // 가이드 본문 컴포넌트 동적 로드
  let GuideContent: React.ComponentType
  try {
    const mod = await import(`../_content/${slug}`)
    GuideContent = mod.default
  } catch {
    const fallback = await import(`../_content/_placeholder`)
    GuideContent = fallback.default
  }

  const relatedGuides = guides
    .filter(g => g.category === guide.category && g.slug !== slug)
    .slice(0, 3)

  return (
    <article className="space-y-8">
      <Link href="/guides" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" />
        가이드 목록으로
      </Link>

      <header className="space-y-4">
        <div className="text-sm text-muted-foreground">{guide.category}</div>
        <h1 className="text-4xl font-bold leading-tight">{guide.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{guide.author}</span>
          <span>·</span>
          <span>{guide.date}</span>
          <span>·</span>
          <span>{guide.readingMinutes}분 읽기</span>
        </div>
      </header>

      <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
        <GuideContent />
      </div>

      {relatedGuides.length > 0 && (
        <section className="pt-8 border-t space-y-4">
          <h2 className="text-xl font-semibold">관련 가이드</h2>
          <div className="grid gap-3">
            {relatedGuides.map(g => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="block p-4 rounded-lg border hover:border-foreground/40 hover:bg-muted/30 transition-colors"
              >
                <h3 className="font-medium">{g.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{g.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
