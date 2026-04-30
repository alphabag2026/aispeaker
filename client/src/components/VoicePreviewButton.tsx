
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

import { useTranslation } from "@/contexts/LanguageContext";
import { useLanguage } from "@/contexts/LanguageContext";
interface VoicePreviewButtonProps {
  voiceId: string;
  size?: "sm" | "default" | "icon";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export default function VoicePreviewButton({
  voiceId,
  size = "icon",
  variant = "ghost",
  className = "",
}: VoicePreviewButtonProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewMutation = trpc.tts.preview.useMutation();

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePreview = useCallback(async () => {
    // If already playing, stop
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!voiceId) return;

    try {
      const result = await previewMutation.mutateAsync({ voiceId });
      if (result.audioUrl) {
        stopAudio();
        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;
        setIsPlaying(true);

        audio.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlaying(false);
          audioRef.current = null;
          toast.error(t("vpb.audioPlaybackFailed"));
        };

        await audio.play();
      }
    } catch (err: any) {
      setIsPlaying(false);
      if (err?.message?.includes(t("voicePreviewButton.hardcoded1"))) {
        toast.error(t("vpb.apiLimitExceeded"));
      } else {
        toast.error(t("vpb.previewFailed"));
      }
    }
  }, [voiceId, isPlaying, stopAudio, previewMutation, t]);

  const isLoading = previewMutation.isPending && !isPlaying;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`${className} ${isPlaying ? "text-violet-400 animate-pulse" : "text-muted-foreground hover:text-violet-400"}`}
      onClick={handlePreview}
      disabled={isLoading || !voiceId}
      title={isPlaying ? t("vpb.stopPlayback") : t("vpb.voicePreview")}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Square className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}
