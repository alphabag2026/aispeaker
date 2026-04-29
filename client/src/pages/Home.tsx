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
  Camera,
  Radio,
  Tv,
  Headphones,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

/* ── Product Tabs (Akool-style) ── */
const getProductTabs = (t: (k: string) => string) => [
  { key: "i2v", label: t("home.tab.i2v"), icon: Clapperboard, badge: "hot" as const },
  { key: "faceswap", label: t("home.tool.faceswap"), icon: Users, badge: "new" as const },
  { key: "avatar", label: t("home.tool.avatar"), icon: Brain, badge: null },
  { key: "translate", label: t("home.tool.translate"), icon: Languages, badge: null },
  { key: "tts", label: t("home.tab.tts"), icon: Volume2, badge: null },
  { key: "lecture", label: t("home.tab.lecture"), icon: BookOpen, badge: "hot" as const },
  { key: "live", label: t("home.tab.live"), icon: Radio, badge: null },
];

const getProductDetails = (t: (k: string) => string): Record<string, { title: string; desc: string; features: string[]; gradient: string; link: string }> => ({
  i2v: {
    title: "Image to Video",
    desc: t("home.product.i2v.desc"),
    features: [t("home.product.i2v.feat1"), t("home.product.i2v.feat2"), t("home.product.i2v.feat3"), t("home.product.i2v.feat4"), t("home.product.i2v.feat5")],
    gradient: "from-violet-600 to-blue-500",
    link: "/ai-studio",
  },
  faceswap: {
    title: "Face Swap Pro",
    desc: t("home.product.faceswap.desc"),
    features: [t("home.product.faceswap.feat1"), t("home.product.faceswap.feat2"), t("home.product.faceswap.feat3"), t("home.product.faceswap.feat4"), t("home.product.faceswap.feat5")],
    gradient: "from-pink-600 to-rose-500",
    link: "/ai-studio",
  },
  avatar: {
    title: "Talking Avatar",
    desc: t("home.product.avatar.desc"),
    features: [t("home.product.avatar.feat1"), t("home.product.avatar.feat2"), t("home.product.avatar.feat3"), t("home.product.avatar.feat4"), t("home.product.avatar.feat5")],
    gradient: "from-cyan-500 to-teal-500",
    link: "/ai-studio",
  },
  translate: {
    title: "Video Translation",
    desc: t("home.product.translate.desc"),
    features: [t("home.product.translate.feat1"), t("home.product.translate.feat2"), t("home.product.translate.feat3"), t("home.product.translate.feat4"), t("home.product.translate.feat5")],
    gradient: "from-amber-500 to-orange-500",
    link: "/ai-studio",
  },
  tts: {
    title: "Voice Clone & TTS",
    desc: t("home.product.tts.desc"),
    features: [t("home.product.tts.feat1"), t("home.product.tts.feat2"), t("home.product.tts.feat3"), t("home.product.tts.feat4"), t("home.product.tts.feat5")],
    gradient: "from-emerald-500 to-green-500",
    link: "/voices",
  },
  lecture: {
    title: t("home.tab.lecture"),
    desc: t("home.product.lecture.desc"),
    features: [t("home.product.lecture.feat1"), t("home.product.lecture.feat2"), t("home.product.lecture.feat3"), t("home.product.lecture.feat4"), t("home.product.lecture.feat5")],
    gradient: "from-fuchsia-500 to-purple-500",
    link: "/lecture-builder",
  },
  live: {
    title: t("home.tab.live"),
    desc: t("home.product.live.desc"),
    features: [t("home.product.live.feat1"), t("home.product.live.feat2"), t("home.product.live.feat3"), t("home.product.live.feat4"), t("home.product.live.feat5")],
    gradient: "from-blue-500 to-indigo-500",
    link: "/broadcasts",
  },
});

/* ── Stats ── */
const getStats = (t: (k: string) => string) => [
  { value: "25+", label: t("home.stat.tools") },
  { value: "10+", label: t("home.stat.models") },
  { value: "155+", label: t("home.stat.langs") },
  { value: "4K", label: t("home.stat.ultraHD") },
];

/* ── Hero typing words ── */
const getTypingWords = (t: (k: string) => string) => [t("home.typing.word1"), t("home.typing.word2"), t("home.typing.word3"), t("home.typing.word4"), t("home.typing.word5")];

/* ── Trusted logos ── */
const trustedLogos = [
  "Zoom", "Google Meet", "Webex", "MS Teams", "OBS Studio",
  "Tencent Meeting", "YouTube", "Twitch",
];

/* ── Full tool grid ── */
const getAllTools = (t: (k: string) => string) => [
  { icon: Clapperboard, label: t("home.tool.i2v"), href: "/ai-studio", badge: "hot" as const },
  { icon: FileVideo, label: t("home.tool.t2v"), href: "/ai-studio", badge: null },
  { icon: Users, label: t("home.tool.faceswap"), href: "/ai-studio", badge: "new" as const },
  { icon: Brain, label: t("home.tool.avatar"), href: "/ai-studio", badge: "unlimited" as const },
  { icon: Languages, label: t("home.tool.translate"), href: "/ai-studio", badge: null },
  { icon: Volume2, label: t("home.tool.tts"), href: "/voices", badge: null },
  { icon: Mic, label: t("home.tool.clone"), href: "/voices", badge: null },
  { icon: Headphones, label: t("home.tool.voicechanger"), href: "/voices", badge: null },
  { icon: Image, label: t("home.tool.imagegen"), href: "/ai-studio", badge: null },
  { icon: Camera, label: t("home.tool.livecam"), href: "/browser-studio", badge: null },
  { icon: Radio, label: t("home.tool.streamavatar"), href: "/broadcasts", badge: null },
  { icon: Tv, label: t("home.tool.lecturelive"), href: "/broadcasts", badge: "hot" as const },
  { icon: BookOpen, label: t("home.tool.lecturebuilder"), href: "/lecture-builder", badge: "hot" as const },
  { icon: MessageSquare, label: t("home.tool.whiteboard"), href: "/lecture-builder", badge: "new" as const },
  { icon: Monitor, label: t("home.tool.ppt2v"), href: "/lecture-builder", badge: "unlimited" as const },
  { icon: Palette, label: t("home.tool.bgchange"), href: "/ai-studio", badge: null },
  { icon: Wand2, label: t("home.tool.layout"), href: "/lecture-builder", badge: null },
  { icon: Play, label: t("home.tool.studio"), href: "/studio", badge: null },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const productTabs = getProductTabs(t);
  const productDetails = getProductDetails(t);
  const stats = getStats(t);
  const typingWords = getTypingWords(t);
  const allTools = getAllTools(t);
  const [activeTab, setActiveTab] = useState("i2v");
  const [typingIndex, setTypingIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);

  /* ── Typing animation ── */
  useEffect(() => {
    const word = typingWords[typingIndex];
    const speed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(word.substring(0, displayText.length + 1));
        if (displayText.length === word.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setDisplayText(word.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setTypingIndex((prev) => (prev + 1) % typingWords.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, typingIndex]);

  /* ── AI Instructor personas ── */
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

  const activeProduct = productDetails[activeTab];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ HERO - Premium dark with typing animation ═══════════ */}
      <section className="relative overflow-hidden min-h-[100vh] flex items-center">
        {/* Animated background */}
        <div className="particles-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_oklch(0.15_0.12_280_/_0.5),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_oklch(0.12_0.1_195_/_0.3),_transparent_50%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="container relative z-10 py-20 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div className="space-y-8">
              {/* Trust badges */}
              <div className="flex items-center gap-3">
                <span className="badge-api">Akool Powered</span>
                <span className="badge-hot">Multi-Model AI</span>
                <div className="flex items-center gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  <span className="text-xs text-muted-foreground ml-1">4.8/5</span>
                </div>
              </div>

              {/* Main heading with typing */}
              <div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="gradient-text">{t("home.hero.title1")}</span>
                  <br />
                  <span className="text-foreground">
                    {displayText}
                    <span className="inline-block w-[3px] h-[0.9em] bg-primary ml-1 align-middle" style={{ animation: 'blink 1s step-end infinite' }} />
                  </span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">{t("home.hero.desc")}</p>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <>
                    <Link href="/lecture-builder">
                      <Button size="lg" className="glow-button gap-2 text-base h-12 px-8">
                        <Sparkles className="h-5 w-5" />
                        {t("home.hero.btn.create")}
                      </Button>
                    </Link>
                    <Link href="/ai-studio">
                      <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10 h-12 px-8 text-base">
                        <Layers className="h-5 w-5" />
                        AI Studio
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button size="lg" asChild className="glow-button gap-2 text-base h-12 px-8">
                      <a href={getLoginUrl()}>
                        <Sparkles className="h-5 w-5" />
                        {t("home.hero.btn.start")}
                      </a>
                    </Button>
                    <Link href="#products">
                      <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10 h-12 px-8 text-base">
                        <Play className="h-5 w-5" />
                        {t("home.hero.btn.explore")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-8 pt-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-extrabold gradient-text">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Product showcase card */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-cyan-500/10 blur-3xl" />

                {/* Main card */}
                <div className="relative glass-card overflow-hidden">
                  {/* Tab bar */}
                  <div className="flex overflow-x-auto border-b border-border/30 px-4 pt-4 gap-1 no-scrollbar">
                    {productTabs.slice(0, 4).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all ${
                          activeTab === tab.key
                            ? "bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                        {tab.badge && <span className={tab.badge === "hot" ? "badge-hot" : "badge-new"}>{tab.badge}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${activeProduct.gradient} text-white text-xs font-bold mb-4`}>
                      <Zap className="h-3 w-3" />
                      {activeProduct.title}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {activeProduct.desc}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {activeProduct.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-medium text-foreground">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <Link href={activeProduct.link}>
                      <Button size="sm" className="mt-5 glow-button text-xs h-9 px-6">
                        {t("home.product.try")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-3 -right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold shadow-lg animate-pulse-glow">
                  Akool API
                </div>
                <div className="absolute -bottom-3 -left-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-bold shadow-lg">
                  Multi-Model
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Trusted By - Marquee ═══════════ */}
      <section className="py-6 border-y border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...trustedLogos, ...trustedLogos].map((logo, i) => (
            <span key={i} className="mx-8 text-sm font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════ Product Tabs Showcase (Akool-style) ═══════════ */}
      <section id="products" className="py-20 md:py-28 relative">
        <div className="particles-bg" />
        <div className="container relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              AI Products
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text">{t("home.section.products.title1")}</span>
              <span className="text-foreground">{t("home.section.products.title2")}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.section.products.desc")}
            </p>
          </div>

          {/* Tab navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {productTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card border border-border/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && <span className={tab.badge === "hot" ? "badge-hot" : "badge-new"}>{tab.badge}</span>}
              </button>
            ))}
          </div>

          {/* Active product detail card */}
          <div className="glass-card p-8 md:p-10 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${activeProduct.gradient} text-white text-sm font-bold mb-4`}>
                  {activeProduct.title}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {activeProduct.desc}
                </p>
                <Link href={activeProduct.link}>
                  <Button className="glow-button gap-2">
                    {t("home.product.try")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {activeProduct.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${activeProduct.gradient} flex items-center justify-center shrink-0`}>
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ All Tools Grid ═══════════ */}
      <section className="py-16 md:py-24 relative">
        <div className="container relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("home.section.tools.title")}
            </h2>
            <p className="text-muted-foreground">{t("home.section.tools.desc")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(showAllTools ? allTools : allTools.slice(0, 12)).map((tool, i) => (
              <Link key={i} href={tool.href}>
                <div className="glass-card p-4 text-center group cursor-pointer h-full">
                  <div className="mx-auto w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
                  {tool.badge && <span className={`mt-1.5 inline-block ${tool.badge === "hot" ? "badge-hot" : tool.badge === "new" ? "badge-new" : "badge-unlimited"}`}>{tool.badge}</span>}
                </div>
              </Link>
            ))}
          </div>
          {!showAllTools && allTools.length > 12 && (
            <div className="text-center mt-6">
              <Button variant="outline" onClick={() => setShowAllTools(true)} className="gap-2 border-primary/30 hover:bg-primary/10">
                {t("home.section.tools.more")} ({allTools.length - 12}{t("home.section.tools.count")}) <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
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
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text">10+ AI Models</span>
              <span className="text-foreground">, Your Choice</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.section.models.desc")}
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
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text-pink">12+ Effects</span>
              <span className="text-foreground">, One Click</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.section.effects.desc")}
            </p>
          </div>
          <EffectsGallery />
        </div>
      </section>

      {/* ═══════════ AI Instructor Showcase ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text">{t("home.section.instructors.title1")}</span>
              <span className="text-foreground">{t("home.section.instructors.title2")}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("home.section.instructors.desc")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {aiInstructors.map((inst, i) => (
              <div key={i} className="glass-card overflow-hidden group">
                <div className="aspect-square overflow-hidden">
                  <img src={inst.image} alt={inst.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">{inst.role}</p>
                  <p className="text-[10px] text-primary mt-1">{inst.lang}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Features Grid ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text">{t("home.section.features.title")}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featureKeys.map((feat, i) => (
              <div key={i} className="glass-card p-5 group">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors shrink-0">
                    <feat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground">{t(feat.titleKey)}</h3>
                      {feat.badge && <span className="badge-new">{feat.badge}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t(feat.descKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Pricing ═══════════ */}
      <section id="pricing" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_oklch(0.15_0.08_280_/_0.3),_transparent_60%)]" />
        <div className="container relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Crown className="h-3.5 w-3.5" />
              Pricing
              <span className="badge-hot">30% OFF</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="gradient-text">{t("home.section.pricing.title1")}</span>
              <span className="text-foreground">{t("home.section.pricing.title2")}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card key={i} className={`relative overflow-hidden border-border/50 bg-card backdrop-blur-sm transition-all duration-300 hover:border-primary/30 ${plan.popular ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.02]" : ""}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold rounded-bl-xl">
                    POPULAR
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <plan.icon className={`h-5 w-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold gradient-text">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className={`w-full ${plan.popular ? "glow-button" : "border-primary/30 hover:bg-primary/10"}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      if (isAuthenticated) {
                        window.location.href = "/pricing";
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
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-background to-blue-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.35_0.2_280_/_0.15),_transparent_60%)]" />
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("home.cta.title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
            {t("home.cta.desc")}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="glow-button gap-2 text-base h-12 px-8" asChild>
              <a href={isAuthenticated ? "/lecture-builder" : getLoginUrl()}>
                {t("home.hero.btn.start")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10 h-12 px-8 text-base">
                {t("home.cta.compare")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border/30 py-12 bg-card/10">
        <div className="container">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="font-extrabold text-xl mb-4 gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                AI Speaker
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t("home.footer.desc")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-foreground/80">Products</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/lecture-builder" className="hover:text-primary transition-colors">Lecture Builder</Link></li>
                <li><Link href="/ai-studio" className="hover:text-primary transition-colors">AI Studio</Link></li>
                <li><Link href="/studio" className="hover:text-primary transition-colors">Production Studio</Link></li>
                <li><Link href="/broadcasts" className="hover:text-primary transition-colors">Live Streaming</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-foreground/80">AI Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/ai-studio" className="hover:text-primary transition-colors">Image to Video</Link></li>
                <li><Link href="/ai-studio" className="hover:text-primary transition-colors">Face Swap</Link></li>
                <li><Link href="/ai-studio" className="hover:text-primary transition-colors">Video Translation</Link></li>
                <li><Link href="/faces" className="hover:text-primary transition-colors">Face Gallery</Link></li>
                <li><Link href="/voices" className="hover:text-primary transition-colors">Voice Gallery</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-foreground/80">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/onboarding" className="hover:text-primary transition-colors">Tutorial</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t("home.footer")}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Powered by Akool API</span>
              <span>•</span>
              <span>Multi-Model AI Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
