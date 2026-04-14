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
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

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
                <div className="relative aspect-square rounded-full overflow-hidden w-32 mx-auto mb-4 border-2 border-transparent group-hover:border-primary transition-all duration-300 transform group-hover:scale-105">
                  <img src={instructor.image} alt={instructor.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-semibold">{instructor.name}</h3>
                <p className="text-sm text-muted-foreground">{instructor.role}</p>
                <p className="text-xs text-muted-foreground/70">{instructor.lang}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Features ═══════════ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.features.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {t("home.features.desc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featureKeys.map((feature, i) => (
              <Card key={i} className="bg-background/80 backdrop-blur-sm hover:shadow-lg transition-shadow flex flex-col">
                <CardContent className="p-6 flex-grow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                    {feature.badge && (
                      <div className="px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-foreground bg-primary rounded-full uppercase">
                        {feature.badge}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2 flex-grow">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Platform Integrations ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("home.platforms.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              {t("home.platforms.desc")}
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            {platforms.map((platform, i) => (
              <div key={i} className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
                <span>{platform.icon}</span>
                <span>{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
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
                className={`flex flex-col ${plan.popular ? "border-primary shadow-primary/20 shadow-lg -translate-y-4" : ""}`}
              >
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-1.5 text-sm font-semibold rounded-t-lg">
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
                        <Check className="h-5 w-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
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
