import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wand2, Film, Share2, X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const TOUR_STORAGE_KEY = "vs_guide_tour_completed";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Wand2 className="w-8 h-8 text-violet-400" />,
    title: "1단계: AI 스크립트 생성",
    description: "주제와 카테고리를 입력하면 AI가 전문적인 강의 스크립트를 자동으로 생성합니다. 섹션별 편집, 재생성, 순서 변경도 자유롭게 가능합니다.",
    highlight: "/studio",
  },
  {
    icon: <Film className="w-8 h-8 text-blue-400" />,
    title: "2단계: 영상 제작",
    description: "생성된 스크립트에 AI 음성(TTS)과 아바타를 결합하여 강의 영상을 원클릭으로 제작합니다. 딥페이크, 음성 변조도 적용 가능합니다.",
    highlight: "/studio",
  },
  {
    icon: <Share2 className="w-8 h-8 text-emerald-400" />,
    title: "3단계: 공유 & 방송",
    description: "완성된 영상을 다운로드하거나, 라이브 방송으로 실시간 스트리밍할 수 있습니다. Zoom, Google Meet 등 외부 플랫폼과도 연동됩니다.",
    highlight: "/broadcast",
  },
];

export function GuideTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Show after a short delay for better UX
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-medium text-violet-400">시작 가이드</span>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Content */}
          <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
              {step.icon}
            </div>
            <h3 className="text-xl font-bold">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              {step.description}
            </p>
          </div>

          {/* Progress Dots */}
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

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              건너뛰기
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1 bg-violet-600 hover:bg-violet-700"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "시작하기" : "다음"} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* Hook to reset tour (for "다시 보기" option) */
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
