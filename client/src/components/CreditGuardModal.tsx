import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { useLocation } from "wouter";

// Credit costs per feature
const FEATURE_COSTS: Record<string, { name: string; credits: number; icon: string }> = {
  script_generation: { name: "스크립트 생성", credits: 5, icon: "📝" },
  tts_generation: { name: "TTS 음성 변환", credits: 10, icon: "🔊" },
  avatar_video: { name: "AI 아바타 영상", credits: 50, icon: "🎬" },
  deepfake_face: { name: "딥페이크 얼굴 변환", credits: 30, icon: "🎭" },
  subtitle_generation: { name: "자막 생성", credits: 3, icon: "📄" },
  thumbnail_generation: { name: "썸네일 생성", credits: 5, icon: "🖼️" },
  voice_cloning: { name: "음성 클로닝", credits: 20, icon: "🎤" },
};

interface CreditGuardModalProps {
  open: boolean;
  onClose: () => void;
  featureKey: string;
  currentCredits?: number;
  requiredCredits?: number;
}

export default function CreditGuardModal({
  open,
  onClose,
  featureKey,
  currentCredits = 0,
  requiredCredits,
}: CreditGuardModalProps) {
  const [, navigate] = useLocation();
  const feature = FEATURE_COSTS[featureKey] || { name: featureKey, credits: requiredCredits || 10, icon: "⚡" };
  const needed = requiredCredits || feature.credits;
  const deficit = Math.max(0, needed - currentCredits);
  const percentage = Math.min(100, (currentCredits / needed) * 100);

  const creditPackages = [
    { name: "100 크레딧", price: "$9.99", credits: 100, best: false },
    { name: "500 크레딧", price: "$39.99", credits: 500, best: true },
    { name: "1,200 크레딧", price: "$79.99", credits: 1200, best: false },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">크레딧이 부족합니다</DialogTitle>
              <DialogDescription className="text-xs">
                이 기능을 사용하려면 크레딧을 충전해주세요
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feature info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{feature.icon}</span>
              <span className="font-medium">{feature.name}</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {needed} 크레딧 필요
            </Badge>
          </div>

          {/* Credit bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>보유: <span className="text-foreground font-medium">{currentCredits}</span> 크레딧</span>
              <span className="text-red-400">부족: {deficit} 크레딧</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </div>

        {/* Quick credit packages */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <Zap className="w-4 h-4 text-cyan-500" />
            빠른 충전
          </p>
          <div className="grid grid-cols-3 gap-2">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.name}
                className={`relative rounded-lg border p-3 text-center transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 ${
                  pkg.best ? "border-cyan-500/30 bg-cyan-500/5" : "border-border/50"
                }`}
                onClick={() => {
                  onClose();
                  navigate("/pricing");
                }}
              >
                {pkg.best && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-[10px] px-1.5 py-0">
                    인기
                  </Badge>
                )}
                <div className="text-lg font-bold">{pkg.credits}</div>
                <div className="text-[10px] text-muted-foreground">{pkg.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Subscription upgrade suggestion */}
        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">구독 업그레이드로 더 많은 크레딧을</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Professional 플랜은 매월 500 크레딧이 포함되어 있어 개별 구매보다 60% 저렴합니다.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            나중에
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate("/pricing");
            }}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            충전하기
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy credit guard usage
export function useCreditGuard() {
  const [modalState, setModalState] = useState<{
    open: boolean;
    featureKey: string;
    currentCredits: number;
    requiredCredits?: number;
  }>({ open: false, featureKey: "", currentCredits: 0 });

  const checkCredits = (featureKey: string, currentCredits: number, requiredCredits?: number): boolean => {
    const feature = FEATURE_COSTS[featureKey];
    const needed = requiredCredits || feature?.credits || 10;
    if (currentCredits < needed) {
      setModalState({ open: true, featureKey, currentCredits, requiredCredits: needed });
      return false;
    }
    return true;
  };

  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));

  return { modalState, checkCredits, closeModal };
}
