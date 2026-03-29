import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  BookOpen,
  Brain,
  Mic,
  Monitor,
  MessageSquare,
  Palette,
  Sparkles,
  Volume2,
  ArrowRight,
  Video,
  Globe,
  User,
  User2,
  Wand2,
  Award,
  ExternalLink,
  Play,
  Check,
  Zap,
  Crown,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";

/* ── Hero carousel images ── */
const heroSlides = [
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-zoom-lecture-RcYw5EPDZvzFEWss9eDRtH.webp",
    platform: "Zoom",
    label: "Zoom에서 AI 강사가 블록체인 강의 중",
  },
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-google-meet-aLJFbrTjpY64CGP6Z4na42.webp",
    platform: "Google Meet",
    label: "Google Meet에서 AI 교수가 딥러닝 강의 중",
  },
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-tencent-meeting-PptRdhGKujxp98N67GNCeA.webp",
    platform: "Tencent Meeting",
    label: "텐센트 회의에서 DeFi 강의 송출 중",
  },
];

/* ── AI Instructor personas for showcase ── */
const aiInstructors = [
  { name: "Dr. Anya Sharma", role: "AI & Tech Expert", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-1-CJqmfL44AkNaCDPzpx8GyZ.webp", lang: "한국어 / English" },
  { name: "Prof. Elias Thorne", role: "History & Ethics", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-2-MtSBCs2n7hXCoo4JGser92.webp", lang: "English / 日本語" },
  { name: "Dr. Nia Adebayo", role: "Machine Learning", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-3-LgLxHvyTnfBeSrLijSXYyT.webp", lang: "English / Français" },
  { name: "Kenji Tanaka", role: "Blockchain & Crypto", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-4-GBDjdyfCtR3JghrAsqk2n4.webp", lang: "한국어 / 中文" },
  { name: "Rajiv Kapoor", role: "Data Science Lead", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-5-n282i3ov9kpDxnzMDBhoZB.webp", lang: "English / हिन्दी" },
];

const features = [
  { icon: User2, title: "딥페이크 얼굴 변환", desc: "강사의 얼굴을 AI로 완전히 다른 사람으로 변환하여 익명으로 강의할 수 있습니다.", badge: "NEW" },
  { icon: Volume2, title: "음성 변조 & 말투 변환", desc: "피치, 속도, 톤, 말투를 조합하여 원래 목소리와 완전히 다른 음성으로 강의합니다.", badge: "NEW" },
  { icon: Monitor, title: "외부 플랫폼 연동", desc: "Zoom, Google Meet, Webex, Tencent Meeting에서 AI 강의를 바로 송출합니다.", badge: "NEW" },
  { icon: Mic, title: "음성 클로닝", desc: "강사의 목소리와 강의 습관을 AI가 학습하여 자연스러운 강의를 진행합니다." },
  { icon: Brain, title: "AI 아바타 (D-ID)", desc: "D-ID API 연동으로 실제 AI 아바타가 화면에서 강의를 진행합니다." },
  { icon: MessageSquare, title: "실시간 AI Q&A", desc: "텍스트 또는 음성으로 질문하면 AI가 강의 맥락에 맞게 즉시 답변합니다." },
  { icon: Palette, title: "PPT + 화이트보드", desc: "슬라이드 프레젠테이션과 실시간 칠판으로 시각적 강의를 진행합니다." },
  { icon: Video, title: "VOD 자동 녹화", desc: "강의 내용을 자동 아카이브하여 VOD로 재활용할 수 있습니다." },
  { icon: Globe, title: "다국어 자동 번역", desc: "20개 이상의 언어로 AI 자동 번역하여 글로벌 강의를 제공합니다." },
  { icon: BookOpen, title: "AI 컨텍스트 템플릿", desc: "Web3, DeFi, NFT 등 카테고리별 AI 컨텍스트를 미리 설정합니다." },
  { icon: Award, title: "수료증 자동 발급", desc: "수강 진도를 달성하면 AI가 자동으로 수료증(PDF)을 생성합니다." },
  { icon: Wand2, title: "프롬프트 기반 강의", desc: "프롬프트만 입력하면 AI가 자동으로 강의 콘텐츠를 생성하고 진행합니다." },
];

const platforms = [
  { name: "Zoom", icon: "📹" },
  { name: "Google Meet", icon: "🎥" },
  { name: "Webex", icon: "🌐" },
  { name: "Tencent Meeting", icon: "💬" },
  { name: "MS Teams", icon: "💼" },
  { name: "OBS Studio", icon: "🎬" },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "29",
    period: "/월",
    icon: Zap,
    credits: "100",
    desc: "개인 강사 입문",
    features: ["월 100 크레딧", "스크립트 무제한 생성", "기본 TTS 5종", "얼굴 프리셋 10종", "720p HD 영상", "Zoom 연동"],
    cta: "Starter 시작하기",
    popular: false,
  },
  {
    name: "Professional",
    price: "99",
    period: "/월",
    icon: Crown,
    credits: "500",
    desc: "전문 강사 필수",
    features: ["월 500 크레딧", "프리미엄 TTS 20종", "전체 얼굴 라이브러리", "1080p Full HD", "딥페이크 얼굴 변환", "음성 변조 & 말투 변환", "모든 플랫폼 연동", "라이브 방송"],
    cta: "Professional 시작하기",
    popular: true,
  },
  {
    name: "Business",
    price: "299",
    period: "/월",
    icon: Building2,
    credits: "2,000",
    desc: "팀/기업용",
    features: ["월 2,000 크레딧", "Professional 전체 기능", "4K 초고화질 영상", "팀 멤버 5명", "API 접근 권한", "전화 + 이메일 지원", "대량 배치 처리"],
    cta: "Business 시작하기",
    popular: false,
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ HERO - Carousel with video conference scenes ═══════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt={slide.label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/50" />
          </div>
        ))}

        <div className="container relative z-10 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI Speaker v3.0 &mdash; 지금 {heroSlides[currentSlide].platform}에서 라이브
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 drop-shadow-lg [text-shadow:0_2px_12px_var(--background)]">
              AI가 당신의 얼굴과 목소리로
              <br />
              <span className="text-primary">온라인 강의</span>를 대신합니다
            </h1>

            <p className="text-lg md:text-xl text-foreground/80 mb-4 max-w-xl [text-shadow:0_1px_6px_var(--background)]">
              원하는 얼굴과 목소리를 선택하고, 프롬프트만 입력하면 AI가 Zoom, Google Meet, 텐센트 회의에서 실시간으로 강의합니다.
            </p>

            <p className="text-sm text-foreground/60 mb-8 max-w-xl [text-shadow:0_1px_4px_var(--background)]">
              50+ AI 얼굴 프리셋 · 20+ 음성 스타일 · 20개 언어 지원 · 외부 플랫폼 직접 송출
            </p>

            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/studio">
                    <Button size="lg" className="gap-2">
                      <Play className="h-5 w-5" />
                      강의 만들기
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/face-gallery">
                    <Button size="lg" variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                      <User2 className="h-5 w-5" />
                      AI 강사 둘러보기
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <a href={getLoginUrl()} className="gap-2">
                      <Sparkles className="h-5 w-5" />
                      무료로 시작하기
                    </a>
                  </Button>
                  <Link href="#pricing">
                    <Button size="lg" variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                      <Crown className="h-5 w-5" />
                      요금제 보기
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Slide indicators */}
            <div className="flex gap-2 mt-8">
              {heroSlides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    i === currentSlide
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {slide.platform}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ AI Face Transform Showcase ═══════════ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">AI 얼굴 변환 기술</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              당신의 실제 얼굴 대신 AI가 생성한 전문 강사 얼굴로 강의하세요. 완벽한 익명성과 전문성을 동시에.
            </p>
          </div>
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/ai-face-transform-gP9a9AqM42hnrzuU5ur2vP.webp"
              alt="AI 얼굴 변환 - Before & After"
              className="w-full h-auto"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">AI 얼굴 프리셋</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">99.2%</div>
              <div className="text-sm text-muted-foreground">자연스러움 평가</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">&lt;0.5s</div>
              <div className="text-sm text-muted-foreground">실시간 변환 속도</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ AI Instructor Gallery ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">AI 강사 페르소나 선택</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              다양한 국적, 성별, 전문 분야의 AI 강사를 선택하세요. 각 페르소나에 맞는 얼굴과 목소리가 제공됩니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {aiInstructors.map((instructor) => (
              <div key={instructor.name} className="group relative">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-border group-hover:border-primary transition-colors shadow-lg">
                  <img
                    src={instructor.image}
                    alt={instructor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="mt-3 text-center">
                  <div className="font-semibold text-sm">{instructor.name}</div>
                  <div className="text-xs text-primary">{instructor.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">{instructor.lang}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href={isAuthenticated ? "/face-gallery" : "#"}>
              <Button variant="outline" size="lg" className="gap-2" onClick={(e) => { if (!isAuthenticated) { e.preventDefault(); window.location.href = getLoginUrl(); } }}>
                전체 AI 강사 라이브러리 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ How it Works with real conference images ═══════════ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">3단계로 AI 강의 시작</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              얼굴과 목소리를 선택하고, 프롬프트를 입력하면 Zoom에서 바로 강의가 시작됩니다
            </p>
          </div>

          {/* Step 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/ai-instructor-gallery-bUZZDyeAqg6Dkq2uDiRpUK.webp"
                alt="AI 강사 페르소나 선택"
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">Step 1</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold">AI 강사 페르소나 선택</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                50개 이상의 AI 얼굴 프리셋과 20개 이상의 음성 스타일에서 원하는 강사를 선택하세요.
                딥페이크 얼굴 변환, 음성 변조, 말투 스타일까지 세밀하게 커스터마이징할 수 있습니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">50+ 얼굴 프리셋</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">20+ 음성 스타일</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">말투 커스터마이징</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="space-y-4 order-2 lg:order-1">
              <h3 className="text-2xl md:text-3xl font-bold">강의 콘텐츠 자동 생성</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                프롬프트 하나로 AI가 강의 스크립트, PPT 슬라이드, TTS 오디오를 자동 생성합니다.
                카테고리별 템플릿으로 빠르게 제작하거나, 직접 편집할 수도 있습니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">AI 스크립트</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">자동 PPT</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">TTS 음성</span>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border order-1 lg:order-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-script-R59hKy4f2UyZt7RXjFfw6Y.webp"
                alt="AI 스크립트 에디터"
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">Step 2</div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-zoom-lecture-RcYw5EPDZvzFEWss9eDRtH.webp"
                alt="Zoom에서 AI 강의 송출"
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">Step 3</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold">Zoom / Google Meet에서 바로 송출</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                AI 강사가 Zoom, Google Meet, Webex, 텐센트 회의에서 실시간으로 강의합니다.
                라이브 방송으로 수백 명에게 동시 송출도 가능합니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">실시간 송출</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">라이브 방송</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">자동 녹화</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Supported Platforms ═══════════ */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">지원 플랫폼</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {platforms.map((p) => (
            <div key={p.name} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border">
              <span className="text-xl">{p.icon}</span>
              <span className="font-medium text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ All Features ═══════════ */}
      <section className="container py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">전체 기능</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI 기술을 활용한 강의 자동화의 모든 것
          </p>
          <Link href="/features">
            <Button variant="link" className="gap-1 mt-2 text-primary">
              전체 기능 상세 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border-border hover:border-primary/50 transition-colors group relative overflow-hidden">
              <CardContent className="p-6">
                {"badge" in feature && feature.badge && (
                  <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                    {feature.badge}
                  </span>
                )}
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">요금제</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              필요에 맞는 플랜을 선택하세요. 모든 플랜에서 기본 AI 강의 기능을 사용할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden ${
                  plan.popular ? "border-primary shadow-xl shadow-primary/10 scale-105" : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${plan.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      {plan.price === "문의" ? "" : "$"}{plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>

                  <p className="text-muted-foreground text-sm mb-6">{plan.desc}</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = getLoginUrl();
                      }
                    }}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-tencent-meeting-PptRdhGKujxp98N67GNCeA.webp"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            지금 바로 AI 강사로 변신하세요
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto text-lg">
            얼굴과 목소리를 선택하고, Zoom에서 바로 강의를 시작하세요.
            무료 플랜으로 지금 바로 체험할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2" asChild>
              <a href={isAuthenticated ? "/studio" : getLoginUrl()}>
                무료로 시작하기
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="gap-2 text-white border-white/30 hover:bg-white/10">
                요금제 비교
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>AI Speaker v3.0 &mdash; AI-Powered Virtual Lecture Automation Platform</p>
        </div>
      </footer>
    </div>
  );
}
