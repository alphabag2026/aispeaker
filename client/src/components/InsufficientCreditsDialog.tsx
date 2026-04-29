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
import { AlertTriangle, CreditCard, ArrowRight, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { AI_FEATURE_COSTS } from "@/hooks/useCreditDeduction";
import { useLanguage } from "@/contexts/LanguageContext";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  currentCredits: number;
  requiredCredits: number;
}

export default function InsufficientCreditsDialog({
  open,
  onClose,
  feature,
  currentCredits,
  requiredCredits,
}: InsufficientCreditsDialogProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const featureInfo = AI_FEATURE_COSTS[feature];
  const featureName = featureInfo?.label || feature;
  const featureIcon = featureInfo?.icon || "⚡";
  const deficit = Math.max(0, requiredCredits - currentCredits);
  const percentage = Math.min(100, (currentCredits / requiredCredits) * 100);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">{t("insufficientCreditsDialog.title")}</DialogTitle>
              <DialogDescription className="text-xs">
                {t("insufficientCreditsDialog.description")}
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
              {t("insufficientCreditsDialog.requiredCredits")}
            </Badge>
          </div>

          {/* Credit bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>보유: <span className="text-foreground font-medium">{currentCredits}</span> 크레딧</span>
              <span className="text-red-400">{t("insufficientCreditsDialog.deficit")}</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </div>

        {/* Quick credit packages */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <Zap className="w-4 h-4 text-cyan-500" />
            {t("insufficientCreditsDialog.quickCharge")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { credits: 100, price: "$9.99", best: false },
              { credits: 500, price: "$39.99", best: true },
              { credits: 1200, price: "$79.99", best: false },
            ].map((pkg) => (
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
                    {t("insufficientCreditsDialog.popular")}
                  </Badge>
                )}
                <div className="text-lg font-bold">{pkg.credits}</div>
                <div className="text-[10px] text-muted-foreground">{pkg.price}</div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("insufficientCreditsDialog.later")}
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate("/pricing");
            }}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            {t("insufficientCreditsDialog.chargeNow")}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
