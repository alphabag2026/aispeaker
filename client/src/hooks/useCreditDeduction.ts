import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Credit costs per AI Studio feature (must match server CREDIT_COSTS)
 */
export const AI_FEATURE_COSTS: Record<string, { label: string; cost: number; icon: string }> = {
  tts_conversion: { label: t("useCreditDeduction.hardcoded1"), cost: 3, icon: "🔊" },
  image_generation: { label: t("useCreditDeduction.hardcoded2"), cost: 5, icon: "🖼️" },
  bg_remove: { label: t("useCreditDeduction.hardcoded3"), cost: 3, icon: "🎨" },
  voice_clone: { label: t("useCreditDeduction.hardcoded4"), cost: 5, icon: "🎤" },
  voice_change: { label: t("useCreditDeduction.hardcoded5"), cost: 3, icon: "🎧" },
  video_effects: { label: t("useCreditDeduction.hardcoded6"), cost: 15, icon: "✨" },
  image_to_video: { label: t("useCreditDeduction.hardcoded7"), cost: 20, icon: "🎬" },
  face_swap: { label: t("useCreditDeduction.hardcoded8"), cost: 25, icon: "🎭" },
  talking_avatar: { label: t("useCreditDeduction.hardcoded9"), cost: 20, icon: "🧑‍💻" },
  video_translate: { label: t("useCreditDeduction.hardcoded10"), cost: 30, icon: "🌐" },
};

export type CreditFeatureKey = keyof typeof AI_FEATURE_COSTS;

/**
 * Hook for automatic credit deduction before AI tool usage.
 * 
 * Usage:
 * ```
 * const { deductAndRun, isDeducting, insufficientCredits } = useCreditDeduction();
 * 
 * // Wrap your mutation call:
 * deductAndRun("image_generation", () => genMut.mutate({ prompt, style }));
 * ```
 */
export function useCreditDeduction() {
  const { t } = useLanguage();
  const [isDeducting, setIsDeducting] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState<{
    open: boolean;
    feature: string;
    currentCredits: number;
    requiredCredits: number;
  }>({ open: false, feature: "", currentCredits: 0, requiredCredits: 0 });

  const utils = trpc.useUtils();
  const creditBalanceQuery = trpc.credit.balance.useQuery(undefined, {
    staleTime: 30000,
  });

  const useCredits = trpc.credit.useCredits.useMutation({
    onSuccess: () => {
      // Invalidate credit balance queries to refresh UI
      utils.credit.balance.invalidate();
      utils.akool.getCredits.invalidate();
    },
  });

  const deductAndRun = useCallback(
    async (feature: CreditFeatureKey, onSuccess: () => void) => {
      const featureInfo = AI_FEATURE_COSTS[feature];
      if (!featureInfo) {
        toast.error(t("useCreditDeduction.hardcoded11"));
        return;
      }

      const currentCredits = creditBalanceQuery.data?.credits ?? 0;
      const requiredCredits = featureInfo.cost;

      // Check if sufficient credits
      if (currentCredits < requiredCredits) {
        setInsufficientCredits({
          open: true,
          feature,
          currentCredits,
          requiredCredits,
        });
        return;
      }

      // Deduct credits first
      setIsDeducting(true);
      try {
        await useCredits.mutateAsync({ feature: feature as any });
        // Credits deducted successfully, now run the actual operation
        onSuccess();
      } catch (err: any) {
        if (err.message?.includes(t("useCreditDeduction.hardcoded12"))) {
          setInsufficientCredits({
            open: true,
            feature,
            currentCredits,
            requiredCredits,
          });
        } else {
          toast.error(`Credit deduction failed: ${err.message}`);
        }
      } finally {
        setIsDeducting(false);
      }
    },
    [creditBalanceQuery.data, useCredits]
  );

  const closeInsufficientModal = useCallback(() => {
    setInsufficientCredits((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    deductAndRun,
    isDeducting,
    insufficientCredits,
    closeInsufficientModal,
    currentCredits: creditBalanceQuery.data?.credits ?? 0,
    isLoadingCredits: creditBalanceQuery.isLoading,
  };
}
