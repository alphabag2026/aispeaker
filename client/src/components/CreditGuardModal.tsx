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

import { useTranslation } from "@/contexts/LanguageContext";

// Credit costs per feature
const FEATURE_COSTS: Record<string, { nameKey: string; credits: number; icon: string }> = {
  script_generation: { nameKey: "cgm.feature.script_generation", credits: 5, icon: "📝" },
  tts_generation: { nameKey: "cgm.feature.tts_generation", credits: 10, icon: "🔊" },
  avatar_video: { nameKey: "cgm.feature.avatar_video", credits: 50, icon: "🎬" },
  deepfake_face: { nameKey: "cgm.feature.deepfake_face", credits: 30, icon: "🎭" },
  subtitle_generation: { nameKey: "cgm.feature.subtitle_generation", credits: 3, icon: "📄" },
  thumbnail_generation: { nameKey: "cgm.feature.thumbnail_generation", credits: 5, icon: "🖼️" },
  voice_cloning: { nameKey: "cgm.feature.voice_cloning", credits: 20, icon: "🎤" },
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
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const featureInfo = FEATURE_COSTS[featureKey];
  const featureName = featureInfo ? t(featureInfo.nameKey) : featureKey;
  const featureIcon = featureInfo ? featureInfo.icon : "⚡";
  const needed = requiredCredits || (featureInfo ? featureInfo.credits : 10);
  const deficit = Math.max(0, needed - currentCredits);
  const percentage = Math.min(100, (currentCredits / needed) * 100);

  const creditPackages = [
    { credits: 100, price: "$9.99", best: false },
    { credits: 500, price: "$39.99", best: true },
    { credits: 1200, price: "$79.99", best: false },
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
              <DialogTitle className="text-lg">{t("cgm.title")}</DialogTitle>
              <DialogDescription className="text-xs">
                {t("cgm.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feature info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{featureIcon}</span>
              <span className="font-medium">{featureName}</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {needed} {t("cgm.credits_needed")}
            </Badge>
          </div>

          {/* Credit bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("cgm.current")}: <span className="text-foreground font-medium">{currentCredits}</span> {t("cgm.credits")}</span>
              <span className="text-red-400">{t("cgm.deficit")}: {deficit} {t("cgm.credits")}</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </div>

        {/* Quick credit packages */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <Zap className="w-4 h-4 text-cyan-500" />
            {t("cgm.quick_charge")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.credits}
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
                    {t("cgm.popular")}
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
            <span className="text-sm font-medium">{t("cgm.upgrade_title")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("cgm.upgrade_desc")}
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("cgm.later")}
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate("/pricing");
            }}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            {t("cgm.charge")}
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
