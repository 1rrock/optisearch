"use client";

import {
  BarChart3,
  Sparkles,
  CheckCircle2,
  X,
  TrendingUp,
  Target,
  ArrowRight
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import Aurora from "@/components/Aurora"
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { PLAN_PRICING } from "@/shared/config/constants";


export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">

      {/* Navbar (Landing Specific) */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-muted/30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-primary/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="옵티써치 로고" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              옵티써치
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">기능 안내</a>
            <a href="#pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">요금제</a>
            <a href="/support" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">고객지원</a>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <a href="/dashboard">
                <Button className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                  대시보드
                </Button>
              </a>
            ) : (
              <>
                <Button variant="ghost" className="hidden sm:flex rounded-xl font-bold" onClick={() => signIn()}>
                  로그인
                </Button>
                <a href="/login">
                  <Button className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                    무료 시작하기
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Custom Aurora Background */}
      <section className="relative pt-32 pb-40 overflow-hidden flex items-center min-h-[90vh] z-0">
        {/* WebGL Aurora Background with Smooth Fade-out Mask */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Use mix-blend-multiply in light mode to prevent washout, normal in dark mode */}
          <div className="absolute inset-0 opacity-80 mix-blend-multiply dark:mix-blend-normal dark:opacity-100">
            {mounted && <Aurora
              colorStops={["#3A29FF", "#FF94B4", "#7cff67"]}
              blend={0.8}
              amplitude={1.5}
              speed={0.8}
            />}
          </div>
          {/* Bottom Fade Mask */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-black tracking-wide uppercase shadow-sm border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Sparkles className="size-4" /> Next-Gen Content Tool
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              압도적인 상위 노출<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                SEO 최적화 AI
              </span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              단순한 키워드 조회를 넘어, AI가 검색어 트렌드를 분석하고 클릭을 유도하는 완벽한 블로그 포스팅 초안을 설계합니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <a href={isLoggedIn ? "/dashboard" : "/login"} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-2xl text-lg font-bold bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  {isLoggedIn ? "대시보드로 이동" : "시작하기"} <ArrowRight className="size-5" />
                </Button>
              </a>
              <a href="#features" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-2xl text-lg font-bold border-muted-foreground/20 hover:bg-muted/50 transition-all">
                  기능 둘러보기
                </Button>
              </a>
            </div>
          </div>

          {/* Dashboard Preview Image/Mockup */}
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="relative bg-card rounded-3xl shadow-2xl border border-muted/50 p-2 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
              <div className="absolute top-4 left-4 flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="mt-8 rounded-2xl overflow-hidden bg-muted/20">
                <img
                  alt="SEO Dashboard Preview"
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"
                  className="w-full h-auto object-cover opacity-90 rounded-2xl mix-blend-luminosity hover:mix-blend-normal transition-all duration-700"
                />
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute -left-12 top-10 bg-card p-4 rounded-2xl shadow-xl border border-muted/20 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">트래픽 증가</p>
                  <p className="text-sm font-black">+342%</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 bottom-20 bg-card p-4 rounded-2xl shadow-xl border border-muted/20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
              <div className="flex gap-4 items-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" className="text-muted/30 stroke-current" strokeWidth="4" fill="none" />
                    <circle cx="24" cy="24" r="20" className="text-blue-500 stroke-current" strokeWidth="4" strokeDasharray="125" strokeDashoffset="10" fill="none" strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-xs font-black">92</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">SEO 점수</p>
                  <p className="text-sm font-black text-blue-500">Excellent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-muted/20 border-y border-muted/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">콘텐츠 전략의 새로운 패러다임</h2>
            <p className="text-lg text-muted-foreground capitalize font-medium">검색량 분석부터 글쓰기, 진단까지 원스톱으로 해결하세요.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-10 rounded-3xl shadow-sm border border-muted/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <BarChart3 className="size-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">빅데이터 키워드 분석</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">실시간 검색량, 문서 수, 경쟁도를 분석하여 틈새 시장을 공략할 수 있는 황금 키워드를 발굴합니다.</p>
            </div>

            <div className="bg-card p-10 rounded-3xl shadow-sm border border-muted/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Sparkles className="size-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">생성형 AI 어시스턴트</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">선택한 키워드를 바탕으로 매력적인 제목과 독자를 사로잡는 구조화된 본문 초안을 단 몇 초 만에 생성합니다.</p>
            </div>

            <div className="bg-card p-10 rounded-3xl shadow-sm border border-muted/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Target className="size-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">SEO 정밀 진단 시스템</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">작성된 글의 키워드 밀도와 구조를 평가하여 상위 노출에 필요한 강력한 피드백과 개선 사항을 제공합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (Seoul Minimalist Styling) */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">왜 옵티써치 인가요?</h2>
            <p className="text-lg text-muted-foreground capitalize font-medium">기존의 복잡하고 파편화된 도구들과 비교해보세요.</p>
          </div>

          <div className="bg-card rounded-3xl border border-muted/50 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/30">
                <tr>
                  <th className="py-6 px-8 font-bold text-muted-foreground w-1/3">지원 기능</th>
                  <th className="py-6 px-8 font-bold text-muted-foreground text-center">기존 도구</th>
                  <th className="py-6 px-8 font-black text-primary text-center bg-primary/5 text-lg">옵티써치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30 text-sm md:text-base font-semibold">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-5 px-8">PC/Mobile 검색량 및 경쟁도</td>
                  <td className="py-5 px-8 text-center text-muted-foreground"><CheckCircle2 className="size-5 mx-auto" /></td>
                  <td className="py-5 px-8 bg-primary/5"><CheckCircle2 className="size-6 text-primary mx-auto drop-shadow-sm" /></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-5 px-8">클릭을 유도하는 AI 제목 추천</td>
                  <td className="py-5 px-8 text-center"><X className="size-5 text-muted-foreground/30 mx-auto" /></td>
                  <td className="py-5 px-8 bg-primary/5"><CheckCircle2 className="size-6 text-primary mx-auto drop-shadow-sm" /></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-5 px-8">고품질 블로그 초안 즉시 생성</td>
                  <td className="py-5 px-8 text-center"><X className="size-5 text-muted-foreground/30 mx-auto" /></td>
                  <td className="py-5 px-8 bg-primary/5"><CheckCircle2 className="size-6 text-primary mx-auto drop-shadow-sm" /></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-5 px-8">SEO 점수 측정 및 알고리즘 피드백</td>
                  <td className="py-5 px-8 text-center"><X className="size-5 text-muted-foreground/30 mx-auto" /></td>
                  <td className="py-5 px-8 bg-primary/5"><CheckCircle2 className="size-6 text-primary mx-auto drop-shadow-sm" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-muted/20 border-t border-muted/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">합리적인 요금제 플랜</h2>
            <p className="text-lg text-muted-foreground capitalize font-medium">투자한 시간 대비 압도적인 결과물을 얻으세요.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-card p-10 rounded-3xl border border-muted/50 hover:border-primary/30 transition-all flex flex-col">
              <h3 className="text-xl font-bold text-muted-foreground mb-2">{PLAN_PRICING.free.label} (Free)</h3>
              <div className="text-4xl font-black mb-8">
                ₩{PLAN_PRICING.free.monthly.toLocaleString()}
              </div>
              <ul className="space-y-4 mb-10 flex-1 font-semibold text-muted-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> 10회/일 키워드 검색</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> AI 제목 3회, 초안·점수 각 1회</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> 인기글 TOP3 · 트렌드 3개월</li>
              </ul>
              <a href="/login">
                <Button variant="outline" size="lg" className="w-full rounded-xl font-bold h-12">무료로 시작하기</Button>
              </a>
            </div>

            {/* Basic (Highlighted) */}
            <div className="bg-card p-8 md:p-10 rounded-3xl border-2 border-primary shadow-2xl md:scale-105 relative z-10 flex flex-col pt-12">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-primary/30">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{PLAN_PRICING.basic.label} (Basic)</h3>
              <div className="text-4xl font-black mb-1 text-foreground">
                ₩{PLAN_PRICING.basic.monthly.toLocaleString()}
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-8">첫 1개월 무료 · 이후 월 결제</p>

              <ul className="space-y-4 mb-10 flex-1 font-semibold text-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary" /> 무제한 키워드 검색</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary" /> AI 제목 20회/일, 초안 5회/일</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary" /> SEO 점수 분석 + 엑셀 추출</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary" /> 쇼핑 인사이트 + 트렌드 1년</li>
              </ul>
              <a href={isLoggedIn ? "/pricing" : "/login?callbackUrl=/pricing"}>
                <Button size="lg" className="w-full rounded-xl font-bold h-12 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform">1개월 무료 체험 시작하기</Button>
              </a>
            </div>

            {/* Pro */}
            <div className="bg-card p-10 rounded-3xl border border-muted/50 hover:border-primary/30 transition-all flex flex-col">
              <h3 className="text-xl font-bold text-muted-foreground mb-2">{PLAN_PRICING.pro.label} (Pro)</h3>
              <div className="text-4xl font-black mb-1">
                ₩{PLAN_PRICING.pro.monthly.toLocaleString()}
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-8">월 결제</p>
              <ul className="space-y-4 mb-10 flex-1 font-semibold text-muted-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> 베이직 플랜의 모든 기능</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> AI 제목 100회/일, 초안 30회/일</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="size-5 text-primary/60" /> 대량 분석 500개, 전체 트렌드</li>
              </ul>
              <a href={isLoggedIn ? "/pricing" : "/login?callbackUrl=/pricing"}>
                <Button variant="outline" size="lg" className="w-full rounded-xl font-bold h-12">프로 시작하기</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Section with consistent Aurora */}
      <section className="py-32 relative overflow-hidden z-0">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="bg-slate-900 rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-2xl border border-white/5 z-0">
            {/* Background Aurora overlay for CTA */}
            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
              {mounted && <Aurora
                colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
                blend={0.5}
                amplitude={1.0}
                speed={0.5}
              />}
            </div>
            {/* Dark gradient to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-transparent pointer-events-none" />

            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8 relative z-10 leading-tight">
              지금 바로 상위 노출을<br />시작하세요
            </h2>
            <p className="text-xl mb-12 opacity-80 relative z-10 max-w-2xl mx-auto font-medium">
              더 이상 복잡한 데이터와 빈 화면 앞에서 고민하지 마세요.
              최고의 AI가 당신의 콘텐츠 성공을 책임집니다.
            </p>
            <a href="/login" className="inline-block relative z-10 w-full sm:w-auto">
              <Button size="lg" className="w-full bg-white text-slate-900 px-12 h-16 rounded-2xl text-lg font-black hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 hover:scale-[1.03]">
                10초 만에 가입하기
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 border-t border-muted/30">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="옵티써치 로고" width={20} height={20} className="w-5 h-5 object-cover rounded" />
              <span className="font-bold text-lg">옵티써치</span>
              <span className="text-muted-foreground text-sm font-medium ml-4">© 2026. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-8 text-sm font-bold text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
              <a href="/support" className="hover:text-foreground transition-colors">고객센터</a>
            </div>
          </div>

          <div className="border-t border-muted/30 pt-6 text-xs text-muted-foreground space-y-1">
            <p>알에이케이랩스 | 사업자등록번호: 570-01-03731 | 대표자: 최원락</p>
            <p>고객문의: <a href="http://pf.kakao.com/_CupuX" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">카카오톡 채널</a></p>
          </div>
        </div>
      </footer>

    </div>
  );
}
