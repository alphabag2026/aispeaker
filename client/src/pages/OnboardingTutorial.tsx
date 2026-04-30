import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  UserCircle,
  Mic,
  Video,
  FileText,
  Wand2,
  Play,
  Radio,
  CreditCard,
  Rocket,
  ChevronRight,
  Monitor,
  Palette,
  Volume2,
  Layers,
  Zap,
  Clock,
  PartyPopper,
  Trophy,
  Star,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  actionLabel: string;
  actionLink: string;
  tip?: string;
  estimatedTime: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "onboardingTutorial.step1Title",
    subtitle: "onboardingTutorial.step1Subtitle",
    description:
      "onboardingTutorial.step1Desc",
    icon: <UserCircle className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step1Detail1",
      "onboardingTutorial.step1Detail2",
      "onboardingTutorial.step1Detail3",
      "onboardingTutorial.step1Detail4",
    ],
    actionLabel: "onboardingTutorial.step1Action",
    actionLink: "/face-gallery",
    tip: "onboardingTutorial.step1Tip",
    estimatedTime: "onboardingTutorial.step6Time",
  },
  {
    id: 2,
    title: "onboardingTutorial.step2Title",
    subtitle: "onboardingTutorial.step2Subtitle",
    description:
      "onboardingTutorial.step2Desc",
    icon: <Mic className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step2Detail1",
      "onboardingTutorial.step2Detail2",
      "onboardingTutorial.step2Detail3",
      "onboardingTutorial.step2Detail4",
    ],
    actionLabel: "onboardingTutorial.step2Action",
    actionLink: "/voice-gallery",
    tip: "onboardingTutorial.step2Tip",
    estimatedTime: "onboardingTutorial.step2Time",
  },
  {
    id: 3,
    title: "onboardingTutorial.step3Title",
    subtitle: "onboardingTutorial.step3Subtitle",
    description:
      "onboardingTutorial.step3Desc",
    icon: <FileText className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step3Detail1",
      "onboardingTutorial.step3Detail2",
      "onboardingTutorial.step3Detail3",
      "onboardingTutorial.step3Detail4",
      "onboardingTutorial.step3Detail5",
    ],
    actionLabel: "onboardingTutorial.step3Action",
    actionLink: "/studio",
    tip: "onboardingTutorial.step3Tip",
    estimatedTime: "onboardingTutorial.step3Time",
  },
  {
    id: 4,
    title: "onboardingTutorial.step4Title",
    subtitle: "onboardingTutorial.step4Subtitle",
    description:
      "onboardingTutorial.step4Desc",
    icon: <Wand2 className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step4Detail1",
      "onboardingTutorial.step4Detail2",
      "onboardingTutorial.step4Detail3",
      "onboardingTutorial.step4Detail4",
      "onboardingTutorial.step4Detail5",
    ],
    actionLabel: "onboardingTutorial.step4Action",
    actionLink: "/studio",
    tip: "onboardingTutorial.step4Tip",
    estimatedTime: "onboardingTutorial.step4Time",
  },
  {
    id: 5,
    title: "onboardingTutorial.step5Title",
    subtitle: "onboardingTutorial.step5Subtitle",
    description:
      "onboardingTutorial.step5Desc",
    icon: <Radio className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step5Detail1",
      "onboardingTutorial.step5Detail2",
      "onboardingTutorial.step5Detail3",
      "onboardingTutorial.step5Detail4",
      "onboardingTutorial.step5Detail5",
    ],
    actionLabel: "onboardingTutorial.step5Action",
    actionLink: "/broadcasts",
    tip: "onboardingTutorial.step5Tip",
    estimatedTime: "onboardingTutorial.step5Time",
  },
  {
    id: 6,
    title: "onboardingTutorial.step6Title",
    subtitle: "onboardingTutorial.step6Subtitle",
    description:
      "onboardingTutorial.step6Desc",
    icon: <CreditCard className="w-8 h-8" />,
    details: [
      "onboardingTutorial.step6Detail1",
      "onboardingTutorial.step6Detail2",
      "onboardingTutorial.step6Detail3",
      "onboardingTutorial.step6Detail4",
      "onboardingTutorial.step6Detail5",
    ],
    actionLabel: "onboardingTutorial.step6Action",
    actionLink: "/my-subscription",
    tip: "onboardingTutorial.step6Tip",
    estimatedTime: "onboardingTutorial.step6Time",
  },
];

export default function OnboardingTutorial() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('onboarding_completed_steps');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Persist completed steps to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_completed_steps', JSON.stringify(Array.from(completedSteps)));
  }, [completedSteps]);

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / tutorialSteps.length) * 100);
  const allCompleted = completedSteps.size === tutorialSteps.length;
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if all steps just completed
  const prevCompletedRef = useState({ count: 0 })[0];
  if (completedSteps.size === tutorialSteps.length && prevCompletedRef.count !== tutorialSteps.length) {
    prevCompletedRef.count = tutorialSteps.length;
    if (!showCelebration) {
      setTimeout(() => setShowCelebration(true), 300);
    }
  }
  if (completedSteps.size < tutorialSteps.length) {
    prevCompletedRef.count = completedSteps.size;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border-b border-border/30">
        <div className="container py-12 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/20">
              <Rocket className="w-6 h-6 text-purple-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              {t("onboardingTutorial.paymentComplete")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {t("onboardingTutorial.gettingStarted")}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t("onboardingTutorial.hardcoded1")}
            {t("onboardingTutorial.hardcoded2")}
          </p>

          {/* Total Estimated Time */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">
                {t("onboardingTutorial.totalEstimatedTime")}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t("onboardingTutorial.progress")}</span>
              <span className="font-mono font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allCompleted
                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                    : "bg-gradient-to-r from-purple-500 to-blue-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedSteps.size}/{tutorialSteps.length} completed
              {allCompleted && (
                <span className="ml-2 text-green-400 font-semibold">{t("onboardingTutorial.allStepsCompleted")}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* {t("onboardingTutorial.step")} Navigation Sidebar */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-1">
              {tutorialSteps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    currentStep === index
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 shrink-0 ${
                        currentStep === index
                          ? "text-purple-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        currentStep === index
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {step.estimatedTime}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* {t("onboardingTutorial.step")} Content */}
          <div>
            {tutorialSteps.map((step, index) => {
              if (index !== currentStep) return null;
              const isCompleted = completedSteps.has(step.id);

              return (
                <div key={step.id} className="space-y-6">
                  {/* {t("onboardingTutorial.step")} Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {t("onboardingTutorial.step")} {step.id}
                      </Badge>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">
                          {step.estimatedTime}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                        {step.icon}
                      </div>
                      {step.title}
                    </h2>
                    <p className="text-muted-foreground mt-1">{step.subtitle}</p>
                  </div>

                  {/* Description */}
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <p className="text-sm text-foreground leading-relaxed mb-4">
                        {step.description}
                      </p>

                      {/* Detail List */}
                      <div className="space-y-2">
                        {step.details.map((detail, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tip */}
                  {step.tip && (
                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-blue-400 block mb-1">
                            {t("onboardingTutorial.proTip")}
                          </span>
                          <p className="text-sm text-blue-300/80">{step.tip}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={step.actionLink}>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        {step.actionLabel}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      variant={isCompleted ? "secondary" : "outline"}
                      onClick={() => toggleComplete(step.id)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          {t("onboardingTutorial.completed")}
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          {t("onboardingTutorial.markAsCompleted")}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => setCurrentStep(index - 1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      {t("onboardingTutorial.prevStep")}
                    </Button>
                    {index < tutorialSteps.length - 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(index + 1)}
                      >
                        {t("onboardingTutorial.nextStep")}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Link href="/studio">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Rocket className="w-4 h-4 mr-1" />
                          {t("onboardingTutorial.startCreating")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 border-t border-border/30 pt-8">
          <h3 className="text-lg font-bold mb-4">{t("onboardingTutorial.quickLinks")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: <Palette className="w-4 h-4" />, label: t("onboardingTutorial.faceGallery"), href: "/face-gallery" },
              { icon: <Volume2 className="w-4 h-4" />, label: t("onboardingTutorial.voiceGallery"), href: "/voice-gallery" },
              { icon: <Video className="w-4 h-4" />, label: t("onboardingTutorial.studio"), href: "/studio" },
              { icon: <Layers className="w-4 h-4" />, label: t("onboardingTutorial.scriptTemplates"), href: "/script-templates" },
              { icon: <Monitor className="w-4 h-4" />, label: t("onboardingTutorial.obsTutorial"), href: "/obs-tutorial" },
              { icon: <Zap className="w-4 h-4" />, label: t("onboardingTutorial.pricing"), href: "/pricing" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="text-purple-400">{link.icon}</div>
                  <span className="text-sm text-foreground">{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center pb-8">
          <p className="text-sm text-muted-foreground mb-3">
            {t("onboardingTutorial.needHelp")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/payment-troubleshooting">
              <Button variant="outline" size="sm">
                {t("onboardingTutorial.paymentTroubleshooting")}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                {t("onboardingTutorial.pricingFaq")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-background border border-border rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in-95 fade-in duration-300">
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-2 border-background">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-2">{t("onboardingTutorial.congratulations")}</h2>
            <p className="text-lg text-purple-400 font-semibold mb-3">
              {t("onboardingTutorial.allOnboardingCompleted")}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {t("onboardingTutorial.hardcoded3")}
              {t("onboardingTutorial.hardcoded4")}
            </p>

            <div className="flex flex-col gap-2">
              <Link href="/studio">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Rocket className="w-4 h-4 mr-2" />
                  {t("onboardingTutorial.goToStudio")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => setShowCelebration(false)}
                className="text-muted-foreground"
              >
                {t("onboardingTutorial.keepExploring")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
