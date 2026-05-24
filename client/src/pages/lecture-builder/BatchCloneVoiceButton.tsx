import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, History, Headphones, Mic } from "lucide-react";

export default function BatchCloneVoiceButton({ projectId, slides, slideScriptMap, onComplete }: {
  projectId: number;
  slides: any[];
  slideScriptMap: Record<number, any>;
  onComplete: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"confirm" | "preview" | "generating">("confirm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVoiceName, setPreviewVoiceName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);

  const previewMut = trpc.lectureBuilder.generateCloneVoice.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.audioUrl);
      setPreviewVoiceName(data.voiceName);
      setStep("preview");
    },
    onError: (e) => {
      if (e.message.includes("NO_VOICE_CLONE")) {
        toast.error("음성 프로필에서 음성 샘플을 먼저 등록해주세요.");
      } else {
        toast.error(e.message);
      }
      setShowModal(false);
    },
  });

  const batchMut = trpc.lectureBuilder.batchGenerateCloneVoice.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      setShowModal(false);
      if (data.success === data.total) {
        toast.success(`전체 ${data.total}개 슬라이드 AI 클론 음성 생성 완료! (${data.voiceName})`);
      } else {
        toast.info(`${data.success}/${data.total}개 슬라이드 생성 완료 (${data.total - data.success}개 실패)`);
      }
      onComplete();
    },
    onError: (e) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  const scriptsWithText = slides.filter(s => slideScriptMap[s.id]?.text?.trim());

  const handleOpenModal = () => {
    if (scriptsWithText.length === 0) {
      toast.error("스크립트가 있는 슬라이드가 없습니다.");
      return;
    }
    setStep("confirm");
    setPreviewUrl(null);
    setSpeed(1.0);
    setPitch(0);
    setShowModal(true);
  };

  const handlePreviewTest = () => {
    const firstSlide = scriptsWithText[0];
    const text = slideScriptMap[firstSlide.id]?.text || "";
    previewMut.mutate({ projectId, slideId: firstSlide.id, text, speed, pitch });
  };

  const handleRegenPreview = () => {
    setPreviewUrl(null);
    handlePreviewTest();
  };

  const handleBatchGenerate = () => {
    setIsGenerating(true);
    setStep("generating");
    batchMut.mutate({ projectId, speed, pitch });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        onClick={handleOpenModal}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            AI 클론 생성중...
          </>
        ) : (
          <>
            <Headphones className="w-3 h-3" />
            전체 AI 클론 음성 생성
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={(open) => { if (!isGenerating) setShowModal(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-purple-400" />
              AI 클론 음성 일괄 생성
            </DialogTitle>
          </DialogHeader>

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm">총 <span className="font-bold text-primary">{scriptsWithText.length}개</span> 슬라이드의 스크립트를 AI 클론 음성으로 생성합니다.</p>
                <p className="text-xs text-muted-foreground">속도와 피치를 조절한 뒤, 첫 번째 슬라이드로 음성 품질을 테스트해보세요.</p>
              </div>

              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">속도</label>
                  <span className="text-xs font-mono text-primary">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.5x (느리게)</span>
                  <span>1.0x</span>
                  <span>2.0x (빠르게)</span>
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">피치</label>
                  <span className="text-xs font-mono text-primary">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-12 (낮게)</span>
                  <span>0</span>
                  <span>+12 (높게)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={handlePreviewTest}
                  disabled={previewMut.isPending}
                >
                  {previewMut.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />테스트 생성중...</>
                  ) : (
                    <><Mic className="w-4 h-4" />미리 테스트 (1개 슬라이드)</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">테스트 생성 완료</span>
                </div>
                <p className="text-xs text-muted-foreground">음성: {previewVoiceName} | 속도: {speed.toFixed(1)}x | 피치: {pitch > 0 ? `+${pitch}` : pitch}</p>
                {previewUrl && (
                  <audio controls className="w-full h-8" src={previewUrl}>
                    Your browser does not support audio.
                  </audio>
                )}
              </div>

              {/* Speed/Pitch adjustment in preview */}
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">설정 변경 후 다시 테스트할 수 있습니다</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted-foreground">속도</label>
                      <span className="text-[10px] font-mono text-primary">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.0" step="0.1" value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted-foreground">피치</label>
                      <span className="text-[10px] font-mono text-primary">{pitch > 0 ? `+${pitch}` : pitch}</span>
                    </div>
                    <input
                      type="range" min="-12" max="12" step="1" value={pitch}
                      onChange={(e) => setPitch(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleRegenPreview}
                  disabled={previewMut.isPending}
                >
                  {previewMut.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />재생성 중...</>
                  ) : (
                    <><Mic className="w-3 h-3" />설정 변경 후 다시 테스트</>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">음성 품질이 만족스러우면 전체 생성을 진행하세요.</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700"
                  onClick={handleBatchGenerate}
                >
                  <Headphones className="w-4 h-4" />
                  전체 {scriptsWithText.length}개 생성하기
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                <p className="text-sm font-medium">AI 클론 음성 일괄 생성 중...</p>
                <p className="text-xs text-muted-foreground">{scriptsWithText.length}개 슬라이드 처리 중 (잠시 기다려주세요)</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


// --- Version History Button for Step4 Matching Editor ---
