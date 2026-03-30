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
  User2,
  Wand2,
  Award,
  Play,
  Check,
  Zap,
  Crown,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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

/* ── AI Instructor personas for showcase ── */
const aiInstructors = [
  { name: "Dr. Anya Sharma", role: "AI & Tech Expert", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-1-CJqmfL44AkNaCDPzpx8GyZ.webp", lang: "한국어 / English" },
  { name: "Prof. Elias Thorne", role: "History & Ethics", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-2-MtSBCs2n7hXCoo4JGser92.webp", lang: "English / 日本語" },
  { name: "Dr. Nia Adebayo", role: "Machine Learning", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-3-LgLxHvyTnfBeSrLijSXYyT.webp", lang: "English / Français" },
  { name: "Kenji Tanaka", role: "Blockchain & Crypto", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-4-GBDjdyfCtR3JghrAsqk2n4.webp", lang: "한국어 / 中文" },
  { name: "Rajiv Kapoor", role: "Data Science Lead", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/face-sample-5-n282i3ov9kpDxnzMDBhoZB.webp", lang: "English / हिन्दी" },
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

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
        `TTS 5${t("home.face.presets").includes("预设") ? "种" : t("home.face.presets").includes("プリセット") ? "種" : "종"}`,
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

      {/* ═══════════ HERO - Carousel with video conference scenes ═══════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt={t(slide.labelKey)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/50" />
          </div>
        ))}

        <div className="container relative z-10 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.hero.badge_prefix")}{heroSlides[currentSlide].platform}{t("home.hero.badge_suffix")}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 drop-shadow-lg [text-shadow:0_2px_12px_var(--background)]">
              {t("home.hero.title1")}
              <br />
              <span className="text-primary">{t("home.hero.title2")}</span>{t("home.hero.title2_suffix")}
            </h1>

            <p className="text-lg md:text-xl text-foreground/80 mb-4 max-w-xl [text-shadow:0_1px_6px_var(--background)]">
              {t("home.hero.desc")}
            </p>

            <p className="text-sm text-foreground/60 mb-8 max-w-xl [text-shadow:0_1px_4px_var(--background)]">
              {t("home.hero.stats")}
            </p>

            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/studio">
                    <Button size="lg" className="gap-2">
                      <Play className="h-5 w-5" />
                      {t("home.hero.cta_create")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/face-gallery">
                    <Button size="lg" variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                      <User2 className="h-5 w-5" />
                      {t("home.hero.cta_browse")}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <a href={getLoginUrl()} className="gap-2">
                      <Sparkles className="h-5 w-5" />
                      {t("home.hero.cta_free")}
                    </a>
                  </Button>
                  <Link href="#pricing">
                    <Button size="lg" variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm">
                      <Crown className="h-5 w-5" />
                      {t("home.hero.cta_pricing")}
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.face.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.face.desc")}
            </p>
          </div>
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/ai-face-transform-gP9a9AqM42hnrzuU5ur2vP.webp"
              alt={t("home.face.alt")}
              className="w-full h-auto"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">{t("home.face.presets")}</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">99.2%</div>
              <div className="text-sm text-muted-foreground">{t("home.face.naturalness")}</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl font-bold text-primary mb-2">&lt;0.5s</div>
              <div className="text-sm text-muted-foreground">{t("home.face.speed")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ AI Instructor Gallery ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.gallery.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.gallery.desc")}
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
                {t("home.gallery.view_all")}
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.steps.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.steps.desc")}
            </p>
          </div>

          {/* Step 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/ai-instructor-gallery-bUZZDyeAqg6Dkq2uDiRpUK.webp"
                alt={t("home.step1.title")}
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">Step 1</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold">{t("home.step1.title")}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("home.step1.desc")}
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step1.tag1")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step1.tag2")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step1.tag3")}</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
            <div className="space-y-4 order-2 lg:order-1">
              <h3 className="text-2xl md:text-3xl font-bold">{t("home.step2.title")}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("home.step2.desc")}
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step2.tag1")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step2.tag2")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step2.tag3")}</span>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border order-1 lg:order-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-script-R59hKy4f2UyZt7RXjFfw6Y.webp"
                alt={t("home.step2.title")}
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
                alt={t("home.step3.title")}
                className="w-full h-auto"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-bold">Step 3</div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold">{t("home.step3.title")}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("home.step3.desc")}
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step3.tag1")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step3.tag2")}</span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">{t("home.step3.tag3")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Supported Platforms ═══════════ */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">{t("home.platforms.title")}</h3>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.features.title")}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("home.features.desc")}
          </p>
          <Link href="/features">
            <Button variant="link" className="gap-1 mt-2 text-primary">
              {t("home.features.view_all")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureKeys.map((feature) => (
            <Card key={feature.titleKey} className="bg-card border-border hover:border-primary/50 transition-colors group relative overflow-hidden">
              <CardContent className="p-6">
                {"badge" in feature && feature.badge && (
                  <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                    {feature.badge}
                  </span>
                )}
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(feature.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.pricing.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.pricing.desc")}
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
                    <span className="text-4xl font-bold">${plan.price}</span>
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
            {t("home.cta.title")}
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto text-lg">
            {t("home.cta.desc")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gap-2" asChild>
              <a href={isAuthenticated ? "/studio" : getLoginUrl()}>
                {t("home.cta.free")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="gap-2 text-white border-white/30 hover:bg-white/10">
                {t("home.cta.compare")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
