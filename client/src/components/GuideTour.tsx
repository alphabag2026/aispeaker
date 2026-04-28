import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wand2, Film, Share2, X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/i18n/components/GuideTour";

const TOUR_STORAGE_KEY = "vs_guide_tour_completed";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}

export function GuideTour() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const TOUR_STEPS: TourStep[] = [
    {
      icon: <Wand2 className="w-8 h-8 text-violet-400" />,
      title: t("guideTour.step1Title"),
      description: t("guideTour.step1Description"),
      highlight: "/studio",
    },
    {
      icon: <Film className="w-8 h-8 text-blue-400" />,
      title: t("guideTour.step2Title"),
      description: t("guideTour.step2Description"),
      highlight: "/studio",
    },
    {
      icon: <Share2 className="w-8 h-8 text-emerald-400" />,
      title: t("guideTour.step3Title"),
      description: t("guideTour.step3Description"),
      highlight: "/broadcast",
    },
  ];

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-medium text-violet-400">{t("guideTour.header")}</span>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
              {step.icon}
            </div>
            <h3 className="text-xl font-bold">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              {step.description}
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? "w-6 bg-violet-400" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> {t("guideTour.prevButton")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              {t("guideTour.skipButton")}
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1 bg-violet-600 hover:bg-violet-700"
            >
              {currentStep === TOUR_STEPS.length - 1 ? t("guideTour.startButton") : t("guideTour.nextButton")} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useGuideTour() {
  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.location.reload();
  };

  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  };

  return { resetTour, isTourCompleted };
}
