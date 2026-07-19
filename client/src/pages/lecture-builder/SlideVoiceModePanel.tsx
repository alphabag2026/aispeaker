import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Check, Circle, Volume2, Headphones, Mic, StopCircle, Sparkles } from "lucide-react";
import AICloneVoiceSection from "./AICloneVoiceSection";

export default function SlideVoiceModePanel({ projectId, slideId, slideIdx, scripts, onRefresh }: {
  projectId: number;
  slideId: number;
  slideIdx: number;
  scripts: any[];
  onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const [voiceMode, setVoiceMode] = useState<"ai_tts" | "direct_record" | "ai_clone">("ai_tts");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing voice mode from scripts
  useEffect(() => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (script) {
      setVoiceMode(script.voiceMode || "ai_tts");
      setRecordedUrl(script.recordedAudioUrl || null);
    } else {
      setVoiceMode("ai_tts");
      setRecordedUrl(null);
    }
  }, [slideId, scripts]);

  const setVoiceModeMut = trpc.lectureBuilder.setSlideVoiceMode.useMutation({
    onSuccess: () => {
      toast.success("음성 모드가 변경되었습니다.");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadRecordingMut = trpc.lectureBuilder.uploadSlideRecording.useMutation({
    onSuccess: (data) => {
      setRecordedUrl(data.url);
      toast.success("녹음이 저장되었습니다.");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleVoiceModeChange = (mode: "ai_tts" | "direct_record" | "ai_clone") => {
    setVoiceMode(mode);
    setVoiceModeMut.mutate({ projectId, slideId, voiceMode: mode });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadRecordingMut.mutate({
            projectId,
            slideId,
            audioData: base64,
            fileName: `slide-${slideIdx + 1}-recording-${Date.now()}.webm`,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("마이크 접근이 거부되었습니다.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("파일 크기가 16MB를 초과합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadRecordingMut.mutate({
        projectId,
        slideId,
        audioData: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Headphones className="h-4 w-4 text-blue-500" />
          슬라이드 {slideIdx + 1} 음성 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Voice Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "ai_tts" as const, label: "AI 음성", icon: Volume2, desc: "AI TTS로 자동 생성" },
            { id: "direct_record" as const, label: "직접 녹음", icon: Mic, desc: "본인 목소리 녹음" },
            { id: "ai_clone" as const, label: "AI 클론", icon: Sparkles, desc: "AI가 본인 목소리로 읽기" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleVoiceModeChange(m.id)}
              className={`p-2.5 rounded-lg border-2 transition-all text-center ${
                voiceMode === m.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <m.icon className={`w-4 h-4 mx-auto mb-1 ${voiceMode === m.id ? "text-blue-500" : "text-muted-foreground"}`} />
              <div className="text-xs font-medium">{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* AI TTS Mode Info */}
        {voiceMode === "ai_tts" && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-muted-foreground">
              <Volume2 className="w-3 h-3 inline mr-1" />
              스크립트를 기반으로 AI가 자동으로 음성을 생성합니다. 프로필에서 설정한 TTS 음성이 사용됩니다.
            </p>
          </div>
        )}

        {/* AI Clone Mode - Generate Clone TTS */}
        {voiceMode === "ai_clone" && (
          <AICloneVoiceSection projectId={projectId} slideId={slideId} scripts={scripts} onRefresh={onRefresh} />
        )}

        {/* Direct Record Mode - Recording UI */}
        {voiceMode === "direct_record" && (
          <div className="space-y-3">
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={stopRecording}
                >
                  <StopCircle className="w-4 h-4" />
                  녹음 중지 ({formatTime(recordingTime)})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={startRecording}
                  disabled={uploadRecordingMut.isPending}
                >
                  <Mic className="w-4 h-4" />
                  직접 녹음하기
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadRecordingMut.isPending || isRecording}
              >
                <Upload className="w-4 h-4" />
                파일 업로드
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {uploadRecordingMut.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                업로드 중...
              </div>
            )}

            {/* Recorded Audio Preview */}
            {recordedUrl && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-600">녹음 완료</span>
                </div>
                <audio controls src={recordedUrl} className="w-full h-8" />
              </div>
            )}

            <div className="p-2 rounded bg-muted/50">
              <p className="text-[10px] text-muted-foreground">
                직접 녹음: 마이크로 스크립트를 읽어 녹음합니다.<br/>
                파일 업로드: 미리 녹음한 음성 파일(mp3, wav, webm 등)을 업로드합니다.
              </p>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}


// ── AI Clone Voice Section ──
