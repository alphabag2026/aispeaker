import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  User2,
  Volume2,
  Monitor,
  Mic,
  Brain,
  MessageSquare,
  Palette,
  Video,
  Globe,
  BookOpen,
  Award,
  Wand2,
  ArrowRight,
  Sparkles,
  Play,
  Tv,
  FileText,
  BarChart3,
  Subtitles,
  Image,
  Layers,
  Zap,
  Check,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

/* ── Feature category definitions ── */
interface Feature {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  detailKeys: string[];
  badge?: string;
  color: string;
  demoType?: "video" | "gif" | "animation";
  demoLabel?: string;
}

interface FeatureCategory {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  features: Feature[];
}

const categories: FeatureCategory[] = [
  {
    id: "identity",
    labelKey: "features.cat.identity",
    icon: User2,
    features: [
      {
        id: "deepfake",
        icon: User2,
        titleKey: "features.identity.deepfake.title",
        descKey: "features.identity.deepfake.desc",
        detailKeys: [
          "features.identity.deepfake.d1",
          "features.identity.deepfake.d2",
          "features.identity.deepfake.d3",
          "features.identity.deepfake.d4",
          "features.identity.deepfake.d5",
        ],
        badge: "CORE",
        color: "from-violet-500 to-purple-600",
        demoType: "animation",
        demoLabel: "Face Swap Demo",
      },
      {
        id: "voice",
        icon: Volume2,
        titleKey: "features.identity.voice.title",
        descKey: "features.identity.voice.desc",
        detailKeys: [
          "features.identity.voice.d1",
          "features.identity.voice.d2",
          "features.identity.voice.d3",
          "features.identity.voice.d4",
          "features.identity.voice.d5",
        ],
        badge: "CORE",
        color: "from-cyan-500 to-blue-600",
        demoType: "animation",
        demoLabel: "Voice Modulation Demo",
      },
      {
        id: "avatar",
        icon: Brain,
        titleKey: "features.identity.avatar.title",
        descKey: "features.identity.avatar.desc",
        detailKeys: [
          "features.identity.avatar.d1",
          "features.identity.avatar.d2",
          "features.identity.avatar.d3",
          "features.identity.avatar.d4",
          "features.identity.avatar.d5",
        ],
        color: "from-emerald-500 to-teal-600",
        demoType: "animation",
        demoLabel: "AI Avatar Demo",
      },
    ],
  },
  {
    id: "content",
    labelKey: "features.cat.content",
    icon: Wand2,
    features: [
      {
        id: "pipeline",
        icon: Wand2,
        titleKey: "features.content.pipeline.title",
        descKey: "features.content.pipeline.desc",
        detailKeys: [
          "features.content.pipeline.d1",
          "features.content.pipeline.d2",
          "features.content.pipeline.d3",
          "features.content.pipeline.d4",
          "features.content.pipeline.d5",
        ],
        badge: "POPULAR",
        color: "from-amber-500 to-orange-600",
        demoType: "animation",
        demoLabel: "Pipeline Demo",
      },
      {
        id: "editor",
        icon: FileText,
        titleKey: "features.content.editor.title",
        descKey: "features.content.editor.desc",
        detailKeys: [
          "features.content.editor.d1",
          "features.content.editor.d2",
          "features.content.editor.d3",
          "features.content.editor.d4",
          "features.content.editor.d5",
        ],
        color: "from-blue-500 to-indigo-600",
        demoType: "animation",
        demoLabel: "Editor Demo",
      },
      {
        id: "template",
        icon: Layers,
        titleKey: "features.content.template.title",
        descKey: "features.content.template.desc",
        detailKeys: [
          "features.content.template.d1",
          "features.content.template.d2",
          "features.content.template.d3",
          "features.content.template.d4",
          "features.content.template.d5",
        ],
        color: "from-pink-500 to-rose-600",
        demoType: "animation",
        demoLabel: "Template Demo",
      },
      {
        id: "subtitle",
        icon: Subtitles,
        titleKey: "features.content.subtitle.title",
        descKey: "features.content.subtitle.desc",
        detailKeys: [
          "features.content.subtitle.d1",
          "features.content.subtitle.d2",
          "features.content.subtitle.d3",
          "features.content.subtitle.d4",
          "features.content.subtitle.d5",
        ],
        color: "from-teal-500 to-cyan-600",
        demoType: "animation",
        demoLabel: "Subtitle Demo",
      },
      {
        id: "thumbnail",
        icon: Image,
        titleKey: "features.content.thumbnail.title",
        descKey: "features.content.thumbnail.desc",
        detailKeys: [
          "features.content.thumbnail.d1",
          "features.content.thumbnail.d2",
          "features.content.thumbnail.d3",
          "features.content.thumbnail.d4",
          "features.content.thumbnail.d5",
        ],
        color: "from-fuchsia-500 to-purple-600",
        demoType: "animation",
        demoLabel: "Thumbnail Demo",
      },
    ],
  },
  {
    id: "delivery",
    labelKey: "features.cat.delivery",
    icon: Monitor,
    features: [
      {
        id: "platform",
        icon: Monitor,
        titleKey: "features.delivery.platform.title",
        descKey: "features.delivery.platform.desc",
        detailKeys: [
          "features.delivery.platform.d1",
          "features.delivery.platform.d2",
          "features.delivery.platform.d3",
          "features.delivery.platform.d4",
          "features.delivery.platform.d5",
        ],
        badge: "CORE",
        color: "from-green-500 to-emerald-600",
        demoType: "animation",
        demoLabel: "Platform Demo",
      },
      {
        id: "broadcast",
        icon: Tv,
        titleKey: "features.delivery.broadcast.title",
        descKey: "features.delivery.broadcast.desc",
        detailKeys: [
          "features.delivery.broadcast.d1",
          "features.delivery.broadcast.d2",
          "features.delivery.broadcast.d3",
          "features.delivery.broadcast.d4",
          "features.delivery.broadcast.d5",
        ],
        color: "from-red-500 to-rose-600",
        demoType: "animation",
        demoLabel: "Broadcast Demo",
      },
      {
        id: "vod",
        icon: Video,
        titleKey: "features.delivery.vod.title",
        descKey: "features.delivery.vod.desc",
        detailKeys: [
          "features.delivery.vod.d1",
          "features.delivery.vod.d2",
          "features.delivery.vod.d3",
          "features.delivery.vod.d4",
          "features.delivery.vod.d5",
        ],
        color: "from-orange-500 to-amber-600",
        demoType: "animation",
        demoLabel: "VOD Demo",
      },
    ],
  },
  {
    id: "interactive",
    labelKey: "features.cat.interactive",
    icon: MessageSquare,
    features: [
      {
        id: "qa",
        icon: MessageSquare,
        titleKey: "features.interactive.qa.title",
        descKey: "features.interactive.qa.desc",
        detailKeys: [
          "features.interactive.qa.d1",
          "features.interactive.qa.d2",
          "features.interactive.qa.d3",
          "features.interactive.qa.d4",
          "features.interactive.qa.d5",
        ],
        color: "from-sky-500 to-blue-600",
        demoType: "animation",
        demoLabel: "Q&A Demo",
      },
      {
        id: "whiteboard",
        icon: Palette,
        titleKey: "features.interactive.whiteboard.title",
        descKey: "features.interactive.whiteboard.desc",
        detailKeys: [
          "features.interactive.whiteboard.d1",
          "features.interactive.whiteboard.d2",
          "features.interactive.whiteboard.d3",
          "features.interactive.whiteboard.d4",
          "features.interactive.whiteboard.d5",
        ],
        color: "from-yellow-500 to-amber-600",
        demoType: "animation",
        demoLabel: "Whiteboard Demo",
      },
      {
        id: "translate",
        icon: Globe,
        titleKey: "features.interactive.translate.title",
        descKey: "features.interactive.translate.desc",
        detailKeys: [
          "features.interactive.translate.d1",
          "features.interactive.translate.d2",
          "features.interactive.translate.d3",
          "features.interactive.translate.d4",
          "features.interactive.translate.d5",
        ],
        color: "from-indigo-500 to-violet-600",
        demoType: "animation",
        demoLabel: "Translation Demo",
      },
    ],
  },
  {
    id: "analytics",
    labelKey: "features.cat.analytics",
    icon: BarChart3,
    features: [
      {
        id: "report",
        icon: BarChart3,
        titleKey: "features.analytics.report.title",
        descKey: "features.analytics.report.desc",
        detailKeys: [
          "features.analytics.report.d1",
          "features.analytics.report.d2",
          "features.analytics.report.d3",
          "features.analytics.report.d4",
          "features.analytics.report.d5",
        ],
        color: "from-slate-500 to-gray-600",
        demoType: "animation",
        demoLabel: "Report Demo",
      },
      {
        id: "preview",
        icon: Play,
        titleKey: "features.analytics.preview.title",
        descKey: "features.analytics.preview.desc",
        detailKeys: [
          "features.analytics.preview.d1",
          "features.analytics.preview.d2",
          "features.analytics.preview.d3",
          "features.analytics.preview.d4",
          "features.analytics.preview.d5",
        ],
        color: "from-emerald-500 to-green-600",
        demoType: "animation",
        demoLabel: "Preview Demo",
      },
      {
        id: "certificate",
        icon: Award,
        titleKey: "features.analytics.certificate.title",
        descKey: "features.analytics.certificate.desc",
        detailKeys: [
          "features.analytics.certificate.d1",
          "features.analytics.certificate.d2",
          "features.analytics.certificate.d3",
          "features.analytics.certificate.d4",
          "features.analytics.certificate.d5",
        ],
        color: "from-amber-500 to-yellow-600",
        demoType: "animation",
        demoLabel: "Certificate Demo",
      },
      {
        id: "context",
        icon: BookOpen,
        titleKey: "features.analytics.context.title",
        descKey: "features.analytics.context.desc",
        detailKeys: [
          "features.analytics.context.d1",
          "features.analytics.context.d2",
          "features.analytics.context.d3",
          "features.analytics.context.d4",
          "features.analytics.context.d5",
        ],
        color: "from-blue-500 to-cyan-600",
        demoType: "animation",
        demoLabel: "Context Demo",
      },
    ],
  },
];

/* ── Animated Demo Placeholder ── */
function DemoPreview({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  const colorClass = feature.color;

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 group-hover:border-primary/30 transition-all">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} animate-pulse`} style={{ animationDuration: "3s" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />
      </div>

      {/* Center icon with animation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Play className="h-3 w-3" />
          <span>{feature.demoLabel}</span>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute top-4 left-6 w-2 h-2 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: "0s", animationDuration: "2s" }} />
      <div className="absolute top-8 right-10 w-1.5 h-1.5 rounded-full bg-cyan-400/20 animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "2.5s" }} />
      <div className="absolute bottom-6 left-12 w-1 h-1 rounded-full bg-violet-400/20 animate-bounce" style={{ animationDelay: "1s", animationDuration: "3s" }} />
      <div className="absolute bottom-4 right-8 w-2.5 h-2.5 rounded-full bg-amber-400/15 animate-bounce" style={{ animationDelay: "1.5s", animationDuration: "2.2s" }} />
    </div>
  );
}

/* ── Stats data with i18n keys ── */
const statsData = [
  { value: "50+", labelKey: "features.stats.faces" },
  { value: "20+", labelKey: "features.stats.voices" },
  { value: "20+", labelKey: "features.stats.languages" },
  { value: "6+", labelKey: "features.stats.platforms" },
  { value: "18+", labelKey: "features.stats.features" },
  { value: "99.2%", labelKey: "features.stats.naturalness" },
];

/* ── Comparison table data with i18n keys ── */
const comparisonRows = [
  { featureKey: "features.compare.script_gen", starter: true, pro: true, biz: true },
  { featureKey: "features.compare.basic_tts", starter: "5", pro: "20", biz: "20" },
  { featureKey: "features.compare.face_presets", starter: "10", pro: "50+", biz: "50+" },
  { featureKey: "features.compare.resolution", starter: "720p", pro: "1080p", biz: "4K" },
  { featureKey: "features.compare.deepfake", starter: false, pro: true, biz: true },
  { featureKey: "features.compare.voice_mod", starter: false, pro: true, biz: true },
  { featureKey: "features.compare.broadcast", starter: false, pro: true, biz: true },
  { featureKey: "features.compare.subtitle", starter: true, pro: true, biz: true },
  { featureKey: "features.compare.thumbnail", starter: true, pro: true, biz: true },
  { featureKey: "features.compare.analysis", starter: false, pro: true, biz: true },
  { featureKey: "features.compare.batch", starter: false, pro: false, biz: true },
  { featureKey: "features.compare.api", starter: false, pro: false, biz: true },
  { featureKey: "features.compare.team", starter: "1", pro: "1", biz: "5" },
  { featureKey: "features.compare.credits", starter: "100", pro: "500", biz: "2,000" },
];

export default function Features() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("identity");

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ Hero Section ═══════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {t("features.hero.badge")}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {t("features.hero.title1")}
              <br />
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {t("features.hero.title2")}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("features.hero.desc")}
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    {t("features.hero.explore")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <Sparkles className="h-5 w-5" />
                    {t("features.cta.start_free")}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  {t("features.hero.pricing")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Stats Bar ═══════════ */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {statsData.map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Category Tabs + Feature Grid ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.all.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("features.all.desc")}
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {t(cat.labelKey)}
              </button>
            ))}
          </div>

          {/* Feature cards for active category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentCategory.features.map((feature) => (
              <Link key={feature.id} href={`/features/${feature.id}`}>
                <Card className="group relative overflow-hidden border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full">
                  {/* Gradient top bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${feature.color}`} />

                  <CardContent className="p-6">
                    {feature.badge && (
                      <span className={`absolute top-4 right-4 text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        feature.badge === "CORE"
                          ? "bg-primary/20 text-primary"
                          : feature.badge === "POPULAR"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {feature.badge}
                      </span>
                    )}

                    {/* Demo Preview */}
                    <div className="mb-5">
                      <DemoPreview feature={feature} />
                    </div>

                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>

                    <h3 className="text-lg font-bold mb-2">{t(feature.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">{t(feature.descKey)}</p>

                    <div className="space-y-2">
                      {feature.detailKeys.slice(0, 3).map((key) => (
                        <div key={key} className="flex items-start gap-2">
                          <div className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5 text-primary" />
                          </div>
                          <span className="text-xs text-foreground/80">{t(key)}</span>
                        </div>
                      ))}
                      {feature.detailKeys.length > 3 && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-1">
                          <ExternalLink className="h-3 w-3" />
                          {t("features.cta.detail")} (+{feature.detailKeys.length - 3})
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ All Features Overview Grid ═══════════ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.all.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("features.all.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {categories.map((cat) =>
              cat.features.map((feature) => (
                <Link key={feature.id} href={`/features/${feature.id}`}>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group">
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t(feature.titleKey)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t(feature.descKey)}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ Comparison Table ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.compare.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("features.compare.desc")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">{t("features.compare.feature")}</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      Professional
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{t("features.compare.recommended")}</span>
                    </span>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.featureKey} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">{t(row.featureKey)}</td>
                    {[row.starter, row.pro, row.biz].map((val, i) => (
                      <td key={i} className="text-center py-3 px-4">
                        {val === true ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : val === false ? (
                          <span className="text-muted-foreground/40">&mdash;</span>
                        ) : (
                          <span className="text-sm font-medium">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button size="lg" className="gap-2">
                {t("features.compare.view_pricing")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA Section ═══════════ */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("features.cta.title")}
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              {t("features.cta.desc")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    {t("features.cta.studio")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <Sparkles className="h-5 w-5" />
                    {t("features.cta.start_free")}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  {t("features.cta.compare")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t("features.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

/* Export categories for use in FeatureDetail page */
export { categories };
export type { Feature, FeatureCategory };
