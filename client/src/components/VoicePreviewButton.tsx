import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Square } from "lucide-react";
import { toast } from "sonner";

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
          toast.error("오디오 재생에 실패했습니다.");
        };

        await audio.play();
      }
    } catch (err: any) {
      setIsPlaying(false);
      if (err?.message?.includes("한도")) {
        toast.error("API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        toast.error("음성 미리듣기에 실패했습니다.");
      }
    }
  }, [voiceId, isPlaying, stopAudio, previewMutation]);

  const isLoading = previewMutation.isPending && !isPlaying;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`${className} ${isPlaying ? "text-violet-400 animate-pulse" : "text-muted-foreground hover:text-violet-400"}`}
      onClick={handlePreview}
      disabled={isLoading || !voiceId}
      title={isPlaying ? "재생 중지" : "음성 미리듣기"}
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
