import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { categories, type Feature, type FeatureCategory } from "./Features";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Play,
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Star,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useState, useMemo } from "react";

/* ── Tutorial steps per feature (i18n keys) ── */
const tutorialSteps: Record<string, string[]> = {
  deepfake: [
    "features.detail.deepfake.step1",
    "features.detail.deepfake.step2",
    "features.detail.deepfake.step3",
    "features.detail.deepfake.step4",
  ],
  voice: [
    "features.detail.voice.step1",
    "features.detail.voice.step2",
    "features.detail.voice.step3",
    "features.detail.voice.step4",
  ],
  avatar: [
    "features.detail.avatar.step1",
    "features.detail.avatar.step2",
    "features.detail.avatar.step3",
    "features.detail.avatar.step4",
  ],
  pipeline: [
    "features.detail.pipeline.step1",
    "features.detail.pipeline.step2",
    "features.detail.pipeline.step3",
    "features.detail.pipeline.step4",
  ],
  editor: [
    "features.detail.editor.step1",
    "features.detail.editor.step2",
    "features.detail.editor.step3",
    "features.detail.editor.step4",
  ],
  template: [
    "features.detail.template.step1",
    "features.detail.template.step2",
    "features.detail.template.step3",
    "features.detail.template.step4",
  ],
  subtitle: [
    "features.detail.subtitle.step1",
    "features.detail.subtitle.step2",
    "features.detail.subtitle.step3",
    "features.detail.subtitle.step4",
  ],
  thumbnail: [
    "features.detail.thumbnail.step1",
    "features.detail.thumbnail.step2",
    "features.detail.thumbnail.step3",
    "features.detail.thumbnail.step4",
  ],
  platform: [
    "features.detail.platform.step1",
    "features.detail.platform.step2",
    "features.detail.platform.step3",
    "features.detail.platform.step4",
  ],
  broadcast: [
    "features.detail.broadcast.step1",
    "features.detail.broadcast.step2",
    "features.detail.broadcast.step3",
    "features.detail.broadcast.step4",
  ],
  vod: [
    "features.detail.vod.step1",
    "features.detail.vod.step2",
    "features.detail.vod.step3",
    "features.detail.vod.step4",
  ],
  qa: [
    "features.detail.qa.step1",
    "features.detail.qa.step2",
    "features.detail.qa.step3",
    "features.detail.qa.step4",
  ],
  whiteboard: [
    "features.detail.whiteboard.step1",
    "features.detail.whiteboard.step2",
    "features.detail.whiteboard.step3",
    "features.detail.whiteboard.step4",
  ],
  translate: [
    "features.detail.translate.step1",
    "features.detail.translate.step2",
    "features.detail.translate.step3",
    "features.detail.translate.step4",
  ],
  report: [
    "features.detail.report.step1",
    "features.detail.report.step2",
    "features.detail.report.step3",
    "features.detail.report.step4",
  ],
  preview: [
    "features.detail.preview.step1",
    "features.detail.preview.step2",
    "features.detail.preview.step3",
    "features.detail.preview.step4",
  ],
  certificate: [
    "features.detail.certificate.step1",
    "features.detail.certificate.step2",
    "features.detail.certificate.step3",
    "features.detail.certificate.step4",
  ],
  context: [
    "features.detail.context.step1",
    "features.detail.context.step2",
    "features.detail.context.step3",
    "features.detail.context.step4",
  ],
};

/* ── Use case keys per feature ── */
const useCases: Record<string, string[]> = {
  deepfake: ["features.usecase.deepfake.1", "features.usecase.deepfake.2", "features.usecase.deepfake.3"],
  voice: ["features.usecase.voice.1", "features.usecase.voice.2", "features.usecase.voice.3"],
  avatar: ["features.usecase.avatar.1", "features.usecase.avatar.2", "features.usecase.avatar.3"],
  pipeline: ["features.usecase.pipeline.1", "features.usecase.pipeline.2", "features.usecase.pipeline.3"],
  editor: ["features.usecase.editor.1", "features.usecase.editor.2", "features.usecase.editor.3"],
  template: ["features.usecase.template.1", "features.usecase.template.2", "features.usecase.template.3"],
  subtitle: ["features.usecase.subtitle.1", "features.usecase.subtitle.2", "features.usecase.subtitle.3"],
  thumbnail: ["features.usecase.thumbnail.1", "features.usecase.thumbnail.2", "features.usecase.thumbnail.3"],
  platform: ["features.usecase.platform.1", "features.usecase.platform.2", "features.usecase.platform.3"],
  broadcast: ["features.usecase.broadcast.1", "features.usecase.broadcast.2", "features.usecase.broadcast.3"],
  vod: ["features.usecase.vod.1", "features.usecase.vod.2", "features.usecase.vod.3"],
  qa: ["features.usecase.qa.1", "features.usecase.qa.2", "features.usecase.qa.3"],
  whiteboard: ["features.usecase.whiteboard.1", "features.usecase.whiteboard.2", "features.usecase.whiteboard.3"],
  translate: ["features.usecase.translate.1", "features.usecase.translate.2", "features.usecase.translate.3"],
  report: ["features.usecase.report.1", "features.usecase.report.2", "features.usecase.report.3"],
  preview: ["features.usecase.preview.1", "features.usecase.preview.2", "features.usecase.preview.3"],
  certificate: ["features.usecase.certificate.1", "features.usecase.certificate.2", "features.usecase.certificate.3"],
  context: ["features.usecase.context.1", "features.usecase.context.2", "features.usecase.context.3"],
};

/* ── Demo visual component ── */
function FeatureDemoVisual({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-10 animate-pulse`} style={{ animationDuration: "4s" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-2xl`}>
          <Icon className="h-10 w-10 text-white" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
          <Play className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{feature.demoLabel || "Demo Preview"}</span>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-6 left-8 w-3 h-3 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: "0s", animationDuration: "2.5s" }} />
      <div className="absolute top-10 right-12 w-2 h-2 rounded-full bg-cyan-400/20 animate-bounce" style={{ animationDelay: "0.7s", animationDuration: "3s" }} />
      <div className="absolute bottom-8 left-16 w-2.5 h-2.5 rounded-full bg-violet-400/20 animate-bounce" style={{ animationDelay: "1.2s", animationDuration: "2.8s" }} />
      <div className="absolute bottom-6 right-10 w-3 h-3 rounded-full bg-amber-400/15 animate-bounce" style={{ animationDelay: "1.8s", animationDuration: "2.3s" }} />
    </div>
  );
}

export default function FeatureDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [activeTutorialStep, setActiveTutorialStep] = useState(0);

  // Find the feature and its category
  const { feature, category, allFeatures } = useMemo(() => {
    let foundFeature: Feature | null = null;
    let foundCategory: FeatureCategory | null = null;
    const all: Feature[] = [];

    for (const cat of categories) {
      for (const f of cat.features) {
        all.push(f);
        if (f.id === params.id) {
          foundFeature = f;
          foundCategory = cat;
        }
      }
    }

    return { feature: foundFeature, category: foundCategory, allFeatures: all };
  }, [params.id]);

  // Get prev/next features for navigation
  const currentIndex = allFeatures.findIndex((f) => f.id === params.id);
  const prevFeature = currentIndex > 0 ? allFeatures[currentIndex - 1] : null;
  const nextFeature = currentIndex < allFeatures.length - 1 ? allFeatures[currentIndex + 1] : null;

  // Related features from same category (excluding current)
  const relatedFeatures = category?.features.filter((f) => f.id !== params.id) || [];

  if (!feature || !category) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">{t("features.detail.not_found")}</h1>
          <p className="text-muted-foreground mb-8">{t("features.detail.not_found_desc")}</p>
          <Link href="/features">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("features.detail.back")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const steps = tutorialSteps[feature.id] || [];
  const cases = useCases[feature.id] || [];
  const FeatureIcon = feature.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ Breadcrumb ═══════════ */}
      <div className="border-b border-border bg-muted/20">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">{t("features.detail.home")}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/features" className="hover:text-foreground transition-colors">{t("features.detail.features")}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{t(feature.titleKey)}</span>
          </div>
        </div>
      </div>

      {/* ═══════════ Hero Section ═══════════ */}
      <section className="relative overflow-hidden py-16 md:py-20">
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5`} />
        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Info */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <FeatureIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t(category.labelKey)}</span>
                  {feature.badge && (
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      feature.badge === "CORE"
                        ? "bg-primary/20 text-primary"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {feature.badge}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                {t(feature.titleKey)}
              </h1>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t(feature.descKey)}
              </p>

              {/* Feature specs */}
              <div className="space-y-3 mb-8">
                {feature.detailKeys.map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0`}>
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-foreground/90">{t(key)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link href="/studio">
                    <Button size="lg" className="gap-2">
                      <Play className="h-5 w-5" />
                      {t("features.cta.studio")}
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" className="gap-2" asChild>
                    <a href={getLoginUrl()}>
                      <Sparkles className="h-5 w-5" />
                      {t("features.cta.start_free")}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Demo visual */}
            <div>
              <FeatureDemoVisual feature={feature} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Tutorial Steps ═══════════ */}
      {steps.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-4">
                <BookOpen className="h-3.5 w-3.5" />
                {t("features.detail.tutorial")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.detail.how_to_use")}</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t("features.detail.tutorial_desc")}
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Step indicators */}
              <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTutorialStep(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTutorialStep === idx
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeTutorialStep === idx
                        ? "bg-primary-foreground/20"
                        : "bg-foreground/10"
                    }`}>
                      {idx + 1}
                    </span>
                    Step {idx + 1}
                  </button>
                ))}
              </div>

              {/* Active step content */}
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0 shadow-lg`}>
                      <span className="text-white font-bold text-lg">{activeTutorialStep + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Step {activeTutorialStep + 1} / {steps.length}</span>
                      </div>
                      <p className="text-lg leading-relaxed">{t(steps[activeTutorialStep])}</p>
                    </div>
                  </div>

                  {/* Step navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTutorialStep === 0}
                      onClick={() => setActiveTutorialStep((prev) => Math.max(0, prev - 1))}
                      className="gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {t("features.detail.prev")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeTutorialStep === steps.length - 1}
                      onClick={() => setActiveTutorialStep((prev) => Math.min(steps.length - 1, prev + 1))}
                      className="gap-1"
                    >
                      {t("features.detail.next")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ Use Cases ═══════════ */}
      {cases.length > 0 && (
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400 mb-4">
                <Star className="h-3.5 w-3.5" />
                {t("features.detail.use_cases")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("features.detail.use_cases_title")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {cases.map((caseKey, idx) => (
                <Card key={caseKey} className="border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-md`}>
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{t(caseKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ Related Features ═══════════ */}
      {relatedFeatures.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("features.detail.related")}</h2>
              <p className="text-muted-foreground">{t("features.detail.related_desc")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {relatedFeatures.map((rf) => (
                <Link key={rf.id} href={`/features/${rf.id}`}>
                  <Card className="group border-border hover:border-primary/50 transition-all cursor-pointer h-full">
                    <div className={`h-1 bg-gradient-to-r ${rf.color}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${rf.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                          <rf.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{t(rf.titleKey)}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{t(rf.descKey)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ Prev / Next Navigation ═══════════ */}
      <section className="border-t border-border py-8">
        <div className="container">
          <div className="flex justify-between items-center">
            {prevFeature ? (
              <Link href={`/features/${prevFeature.id}`}>
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t(prevFeature.titleKey)}
                </Button>
              </Link>
            ) : (
              <div />
            )}
            <Link href="/features">
              <Button variant="outline" size="sm">
                {t("features.detail.all_features")}
              </Button>
            </Link>
            {nextFeature ? (
              <Link href={`/features/${nextFeature.id}`}>
                <Button variant="ghost" className="gap-2">
                  {t(nextFeature.titleKey)}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA Section ═══════════ */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("features.cta.title")}</h2>
            <p className="text-muted-foreground mb-8">{t("features.cta.desc")}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2">
                    <Zap className="h-5 w-5" />
                    {t("features.cta.studio")}
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <Sparkles className="h-5 w-5" />
                    {t("features.cta.start_free")}
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
