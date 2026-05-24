import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export default function AICloneVoiceSection({ projectId, slideId, scripts, onRefresh }: {
  projectId: number;
  slideId: number;
  scripts: any[];
  onRefresh: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generateCloneMut = trpc.lectureBuilder.generateCloneVoice.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.audioUrl);
      toast.success("AI 클론 음성이 생성되었습니다.");
      setIsGenerating(false);
      onRefresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setIsGenerating(false);
    },
  });

  // Load existing generated audio
  useEffect(() => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (script?.recordedAudioUrl && script?.voiceMode === "ai_clone") {
      setGeneratedUrl(script.recordedAudioUrl);
    } else {
      setGeneratedUrl(null);
    }
  }, [slideId, scripts]);

  const handleGenerate = () => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (!script?.scriptText) {
      toast.error("이 슬라이드에 스크립트가 없습니다. 먼저 스크립트를 작성해주세요.");
      return;
    }
    setIsGenerating(true);
    generateCloneMut.mutate({ projectId, slideId, text: script.scriptText, speed: 1.0, pitch: 0 });
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <p className="text-xs text-muted-foreground mb-2">
          <Sparkles className="w-3 h-3 inline mr-1" />
          프로필에 등록된 본인 음성 샘플을 기반으로 AI가 스크립트를 본인 목소리로 읽어줍니다.
        </p>
        <Button
          size="sm"
          className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-3 h-3 animate-spin" />생성 중...</>
          ) : (
            <><Sparkles className="w-3 h-3" />AI 클론 음성 생성</>
          )}
        </Button>
      </div>

      {generatedUrl && (
        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <p className="text-xs text-green-600 mb-2 font-medium">AI 클론 음성 생성 완료</p>
          <audio controls src={generatedUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}


// --- Batch Clone Voice Button Component with Preview Modal ---
