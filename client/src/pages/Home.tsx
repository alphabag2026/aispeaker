import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import ModelCarousel from "@/components/ModelCarousel";
import EffectsGallery from "@/components/EffectsGallery";
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
  User2,
  Wand2,
  Award,
  Play,
  Check,
  Zap,
  Crown,
  Building2,
  Image,
  Clapperboard,
  Languages,
  Layers,
  ChevronRight,
  Star,
  Users,
  FileVideo,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

/* ── Akool-style product cards ── */
const akoolProducts = [
  {
    icon: Clapperboard,
    title: "Image to Video",
    desc: "정적 이미지를 고화질 AI 비디오로 즉시 변환. 모션 제어, 카메라 효과, 캐릭터 일관성 유지.",
    gradient: "from-violet-600 to-blue-500",
    badge: "Akool API",
    link: "/ai-studio",
  },
  {
    icon: User2,
    title: "Face Swap Pro",
    desc: "사진/영상에서 얼굴을 자연스럽게 교환. 멀티페이스 지원, HQ 모델로 최고 품질.",
    gradient: "from-pink-600 to-rose-500",
    badge: "Akool API",
    link: "/ai-studio",
  },
  {
    icon: Brain,
    title: "Talking Avatar",
    desc: "AI 아바타가 텍스트를 읽어주는 강의 영상 자동 생성. 100+ 아바타, 155+ 언어 TTS.",
    gradient: "from-cyan-500 to-teal-500",
    badge: "Akool API",
    link: "/ai-studio",
  },
  {
    icon: Languages,
    title: "Video Translation",
    desc: "강의 영상을 155+ 언어로 자동 번역. 립싱크 + 음성 복제로 자연스러운 다국어 콘텐츠.",
    gradient: "from-amber-500 to-orange-500",
    badge: "Akool API",
    link: "/ai-studio",
  },
  {
    icon: Volume2,
    title: "Voice Clone & TTS",
    desc: "나만의 목소리를 복제하거나 300+ AI 음성으로 강의 내레이션 자동 생성.",
    gradient: "from-emerald-500 to-green-500",
    badge: "NEW",
    link: "/voices",
  },
  {
    icon: Image,
    title: "AI Image Generate",
    desc: "텍스트 프롬프트로 강의 슬라이드 배경, 일러스트, 다이어그램을 AI가 자동 생성.",
    gradient: "from-fuchsia-500 to-purple-500",
    badge: "NEW",
    link: "/lecture-builder",
  },
];

/* ── Stats ── */
const stats = [
  { value: "25+", label: "AI 모델" },
  { value: "155+", label: "지원 언어" },
  { value: "100+", label: "AI 아바타" },
  { value: "4K", label: "Ultra HD" },
];

/* ── Hero carousel images ── */
const heroSlides = [
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-zoom-lecture-RcYw5EPDZvzFEWss9eDRtH.webp",
    platform: "Zoom",
    labelKey: "home.slide.zoom",
  },
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-google-meet-aLJFbrTjpY64CGP6Z4na42.webp",
    platform: "Google Meet",
    labelKey: "home.slide.meet",
  },
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/hero-tencent-meeting-PptRdhGKujxp98N67GNCeA.webp",
    platform: "Tencent Meeting",
    labelKey: "home.slide.tencent",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  /* ── AI Instructor personas for showcase ── */
  const aiInstructors = [
    { name: "Dr. Anya Sharma", role: t("home.instructor.role1"), image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-1-CJqmfL44AkNaCDPzpx8GyZ.webp", lang: t("home.instructor.lang_ko_en") },
    { name: "Prof. Elias Thorne", role: t("home.instructor.role2"), image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-2-MtSBCs2n7hXCoo4JGser92.webp", lang: t("home.instructor.lang_en_ja") },
    { name: "Dr. Nia Adebayo", role: t("home.instructor.role3"), image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-3-LgLxHvyTnfBeSrLijSXYyT.webp", lang: t("home.instructor.lang_en_fr") },
    { name: "Kenji Tanaka", role: t("home.instructor.role4"), image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-4-GBDjdyfCtR3JghrAsqk2n4.webp", lang: t("home.instructor.lang_ko_zh") },
    { name: "Rajiv Kapoor", role: t("home.instructor.role5"), image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-5-n282i3ov9kpDxnzMDBhoZB.webp", lang: t("home.instructor.lang_en_hi") },
  ];

  const featureKeys = [
    { icon: User2, titleKey: "home.feat.deepfake", descKey: "home.feat.deepfake_desc", badge: "NEW" },
    { icon: Volume2, titleKey: "home.feat.voice", descKey: "home.feat.voice_desc", badge: "NEW" },
    { icon: Monitor, titleKey: "home.feat.platform", descKey: "home.feat.platform_desc", badge: "NEW" },
    { icon: Mic, titleKey: "home.feat.clone", descKey: "home.feat.clone_desc" },
    { icon: Brain, titleKey: "home.feat.avatar", descKey: "home.feat.avatar_desc" },
    { icon: MessageSquare, titleKey: "home.feat.qa", descKey: "home.feat.qa_desc" },
    { icon: Palette, titleKey: "home.feat.whiteboard", descKey: "home.feat.whiteboard_desc" },
    { icon: Video, titleKey: "home.feat.vod", descKey: "home.feat.vod_desc" },
    { icon: Globe, titleKey: "home.feat.translate", descKey: "home.feat.translate_desc" },
    { icon: BookOpen, titleKey: "home.feat.context", descKey: "home.feat.context_desc" },
    { icon: Award, titleKey: "home.feat.cert", descKey: "home.feat.cert_desc" },
    { icon: Wand2, titleKey: "home.feat.prompt", descKey: "home.feat.prompt_desc" },
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
      period: t("home.pricing.period"),
      icon: Zap,
      credits: "100",
      desc: t("home.pricing.starter_desc"),
      features: [
        `${t("pricing.credits_month")}: 100`,
        t("home.step2.tag1"),
        `TTS 5${t("home.pricing.unit_type")}`,
        `${t("home.face.presets")} 10`,
        "720p HD",
        "Zoom",
      ],
      cta: t("home.pricing.starter_cta"),
      popular: false,
    },
    {
      name: "Professional",
      price: "99",
      period: t("home.pricing.period"),
      icon: Crown,
      credits: "500",
      desc: t("home.pricing.pro_desc"),
      features: [
        `${t("pricing.credits_month")}: 500`,
        `TTS 20+`,
        t("home.gallery.title"),
        "1080p Full HD",
        t("home.feat.deepfake"),
        t("home.feat.voice"),
        t("home.feat.platform"),
        t("pp.spec.live_broadcast"),
      ],
      cta: t("home.pricing.pro_cta"),
      popular: true,
    },
    {
      name: "Business",
      price: "299",
      period: t("home.pricing.period"),
      icon: Building2,
      credits: "2,000",
      desc: t("home.pricing.biz_desc"),
      features: [
        `${t("pricing.credits_month")}: 2,000`,
        "Professional+",
        "4K Ultra HD",
        `5 ${t("nav.dashboard")}`,
        "API",
        t("pp.spec.white_label"),
      ],
      cta: t("home.pricing.biz_cta"),
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ HERO - Akool-style dark gradient with animated bg ═══════════ */}
      <section className="relative overflow-hidden min-h-[100vh] flex items-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          {heroSlides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1500 ${i === currentSlide ? "opacity-30" : "opacity-0"}`}
            >
              <img src={slide.image} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-violet-950/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.35_0.2_280_/_0.3),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_oklch(0.3_0.15_195_/_0.2),_transparent_60%)]" />
        </div>

        {/* Floating grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="container relative z-10 py-24 md:py-32 lg:py-40">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-sm text-primary mb-6 animate-pulse">
                <Sparkles className="h-3.5 w-3.5" />
                Powered by Akool AI + Multi-Model Engine
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                {t("home.hero.title1")}
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {t("home.hero.title2")}
                </span>
                {t("home.hero.title2_suffix")}
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-xl leading-relaxed">
                {t("home.hero.desc")}
              </p>

              <p className="text-sm text-muted-foreground/60 mb-8 max-w-xl">
                Image to Video, Face Swap, Talking Avatar, Video Translation, Voice Clone, AI Image Generation
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                {isAuthenticated ? (
                  <>
                    <Link href="/studio">
                      <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/25">
                        <Play className="h-5 w-5" />
                        {t("home.hero.cta_create")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/lecture-builder">
                      <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                        <Clapperboard className="h-5 w-5" />
                        AI Studio
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/25">
                      <a href={getLoginUrl()} className="gap-2">
                        <Sparkles className="h-5 w-5" />
                        {t("home.hero.cta_free")}
                      </a>
                    </Button>
                    <Link href="#products">
                      <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                        <Layers className="h-5 w-5" />
                        AI Tools
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-8">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Floating product preview */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/20 via-blue-500/10 to-cyan-500/20 blur-3xl" />
                
                {/* Main preview card */}
                <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-500/10">
                  <div className="p-1">
                    <img
                      src={heroSlides[currentSlide].image}
                      alt=""
                      className="w-full aspect-video rounded-xl object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">AI Processing</span>
                    </div>
                    <div className="flex gap-2">
                      {["Face Swap", "TTS", "Avatar"].map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold shadow-lg animate-bounce">
                  Akool Powered
                </div>
                <div className="absolute -bottom-2 -left-4 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-bold shadow-lg">
                  Multi-Model
                </div>
              </div>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex gap-2 mt-8 lg:mt-0">
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
      </section>

      {/* ═══════════ Trusted By / Logo Bar ═══════════ */}
      <section className="py-8 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {platforms.map((platform, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                <span className="text-xl">{platform.icon}</span>
                <span className="text-sm font-medium">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI Products - Akool-style card grid ═══════════ */}
      <section id="products" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.2_0.1_280_/_0.3),_transparent_70%)]" />
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Layers className="h-3.5 w-3.5" />
              AI Tools Suite
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                25+ AI Tools
              </span>
              , One Platform
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Akool API 기반의 최첨단 AI 도구들로 강의 콘텐츠를 혁신하세요. 이미지→비디오, 얼굴 교환, 아바타, 번역까지 모든 것을 하나의 플랫폼에서.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {akoolProducts.map((product, i) => (
              <Link key={i} href={product.link}>
                <Card
                  className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 cursor-pointer h-full"
                  onMouseEnter={() => setHoveredProduct(i)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${product.gradient} text-white shadow-lg`}>
                        <product.icon className="h-6 w-6" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        product.badge === "Akool API"
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }`}>
                        {product.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {product.desc}
                    </p>
                    <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Try now <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Multi-Model Carousel ═══════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.15_0.08_260_/_0.4),_transparent_60%)]" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Multi-Model AI
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                10+ AI Models
              </span>
              , Your Choice
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Akool, Kling, Wan, Seedance, Sora, Veo 등 세계 최고의 AI 모델을 하나의 플랫폼에서 비교하고 선택하세요.
            </p>
          </div>
          <ModelCarousel showComparison={true} />
        </div>
      </section>

      {/* ═══════════ Effects Gallery ═══════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Zap className="h-3.5 w-3.5" />
              Effect Presets
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                12+ Effects
              </span>
              , One Click
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Kiss Screen, Catwalk, 360° Orbit 등 다양한 효과 프리셋을 원클릭으로 적용하세요. 전문가 수준의 영상을 누구나 만들 수 있습니다.
            </p>
          </div>
          <EffectsGallery />
        </div>
      </section>

      {/* ═══════════ AI Face Transform Showcase ═══════════ */}
      <section className="py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.face.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.face.desc")}
            </p>
          </div>
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/10 border border-border/50">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/ai-face-transform-gP9a9AqM42hnrzuU5ur2vP.webp"
              alt={t("home.face.alt")}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ═══════════ AI Instructor Showcase ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.instructors.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {t("home.instructors.desc")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {aiInstructors.map((instructor, i) => (
              <div key={i} className="text-center group">
                <div className="relative aspect-square rounded-full overflow-hidden w-32 mx-auto mb-4 border-2 border-transparent group-hover:border-primary transition-all duration-300 transform group-hover:scale-105 shadow-lg shadow-violet-500/10">
                  <img src={instructor.image} alt={instructor.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold">{instructor.name}</h3>
                <p className="text-sm text-muted-foreground">{instructor.role}</p>
                <p className="text-xs text-muted-foreground/70">{instructor.lang}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ How It Works - Akool-style steps ═══════════ */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_oklch(0.15_0.08_280_/_0.4),_transparent_70%)]" />
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              3 Steps to{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                AI Lecture
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              스크립트 작성부터 AI 아바타 영상 생성까지, 단 3단계로 완성하세요.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", title: "스크립트 작성", desc: "AI가 주제를 분석하여 강의 스크립트를 자동 생성. 슬라이드 구성, 핵심 포인트, Q&A까지.", icon: BookOpen, gradient: "from-violet-600 to-blue-600" },
              { step: "02", title: "AI 아바타 선택", desc: "100+ AI 아바타 중 선택하거나 나만의 얼굴/목소리를 복제. Face Swap으로 커스터마이징.", icon: User2, gradient: "from-blue-600 to-cyan-600" },
              { step: "03", title: "영상 생성 & 배포", desc: "Akool API로 고화질 AI 강의 영상을 자동 생성. 155+ 언어 자동 번역으로 글로벌 배포.", icon: FileVideo, gradient: "from-cyan-600 to-teal-600" },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                  <div className="text-6xl font-black text-muted/30 mb-4">{item.step}</div>
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.gradient} text-white mb-4`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRight className="h-8 w-8 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Features Grid ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.features.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {t("home.features.desc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featureKeys.map((feature, i) => (
              <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 flex flex-col">
                <CardContent className="p-5 flex-grow flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <feature.icon className="h-7 w-7 text-primary" />
                    {feature.badge && (
                      <div className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary bg-primary/10 rounded-full uppercase border border-primary/20">
                        {feature.badge}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-base mb-1.5 flex-grow">{t(feature.titleKey)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="pricing" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.15_0.08_280_/_0.3),_transparent_60%)]" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.pricing.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {t("home.pricing.desc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {pricingPlans.map((plan, i) => (
              <Card
                key={i}
                className={`flex flex-col border-border/50 bg-card/50 backdrop-blur-sm ${
                  plan.popular
                    ? "border-primary/50 shadow-xl shadow-violet-500/10 -translate-y-4 relative"
                    : "hover:border-primary/20"
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white text-center py-1.5 text-sm font-semibold rounded-t-lg">
                    {t("home.pricing.popular")}
                  </div>
                )}
                <CardContent className="p-8 flex-grow flex flex-col">
                  <plan.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4 h-10">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground"> / {plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-muted-foreground flex-grow">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    className={`w-full ${plan.popular ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0" : "border-primary/30 hover:bg-primary/10"}`}
                    onClick={() => {
                      if (isAuthenticated) {
                        window.location.href = "/billing";
                      } else {
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

      {/* ═══════════ CTA - Akool-style gradient ═══════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-background to-blue-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.35_0.2_280_/_0.2),_transparent_60%)]" />
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("home.cta.title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
            {t("home.cta.desc")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-violet-500/25" asChild>
              <a href={isAuthenticated ? "/studio" : getLoginUrl()}>
                {t("home.cta.free")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                {t("home.cta.compare")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border/50 py-12 bg-card/20">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                AI Speaker
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Akool API 기반 AI 강의 플랫폼. 이미지→비디오, 얼굴 교환, 아바타, 번역까지.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/lecture-builder" className="hover:text-primary transition-colors">Lecture Builder</Link></li>
                <li><Link href="/studio" className="hover:text-primary transition-colors">Production Studio</Link></li>
                <li><Link href="/faces" className="hover:text-primary transition-colors">Face Gallery</Link></li>
                <li><Link href="/voices" className="hover:text-primary transition-colors">Voice Gallery</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">AI Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/lecture-builder" className="hover:text-primary transition-colors">Image to Video</Link></li>
                <li><Link href="/faces" className="hover:text-primary transition-colors">Face Swap</Link></li>
                <li><Link href="/studio" className="hover:text-primary transition-colors">Talking Avatar</Link></li>
                <li><Link href="/studio" className="hover:text-primary transition-colors">Video Translation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/onboarding" className="hover:text-primary transition-colors">Tutorial</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>{t("home.footer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
