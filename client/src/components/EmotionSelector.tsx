import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const EMOTIONS = [
  { value: "neutral", label: "중립", emoji: "😐", color: "bg-gray-100 text-gray-700" },
  { value: "happy", label: "기쁨", emoji: "😊", color: "bg-yellow-100 text-yellow-700" },
  { value: "serious", label: "진지", emoji: "🧐", color: "bg-blue-100 text-blue-700" },
  { value: "excited", label: "열정", emoji: "🔥", color: "bg-red-100 text-red-700" },
  { value: "empathetic", label: "공감", emoji: "💜", color: "bg-purple-100 text-purple-700" },
  { value: "confident", label: "자신감", emoji: "💪", color: "bg-green-100 text-green-700" },
  { value: "questioning", label: "질문", emoji: "🤔", color: "bg-orange-100 text-orange-700" },
] as const;

interface EmotionSelectorProps {
  scriptId: number;
  currentEmotion?: string;
  currentIntensity?: number;
  onUpdate?: () => void;
}

export function EmotionSelector({ scriptId, currentEmotion = "neutral", currentIntensity = 5, onUpdate }: EmotionSelectorProps) {
  const [emotion, setEmotion] = useState(currentEmotion);
  const [intensity, setIntensity] = useState(currentIntensity);
  const updateScript = trpc.lectureBuilder.updateScript.useMutation({
    onSuccess: () => {
      toast.success("감정 설정 저장됨");
      onUpdate?.();
    },
  });

  const handleSave = () => {
    updateScript.mutate({
      id: scriptId,
      emotion: emotion as any,
      emotionIntensity: intensity,
    });
  };

  const currentEmotionInfo = EMOTIONS.find(e => e.value === emotion) || EMOTIONS[0];

  return (
    <div className="flex items-center gap-2">
      <Select value={emotion} onValueChange={(v) => { setEmotion(v); }}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue>
            <span>{currentEmotionInfo.emoji} {currentEmotionInfo.label}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {EMOTIONS.map(e => (
            <SelectItem key={e.value} value={e.value}>
              <span className="flex items-center gap-1.5">
                <span>{e.emoji}</span>
                <span>{e.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="w-20">
        <Slider
          value={[intensity]}
          onValueChange={([v]) => setIntensity(v)}
          min={1}
          max={10}
          step={1}
          className="h-6"
        />
      </div>
      <span className="text-xs text-muted-foreground w-4">{intensity}</span>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSave} disabled={updateScript.isPending}>
        저장
      </Button>
    </div>
  );
}

interface EmotionBadgeProps {
  emotion?: string | null;
  intensity?: number | null;
}

export function EmotionBadge({ emotion, intensity }: EmotionBadgeProps) {
  if (!emotion || emotion === "neutral") return null;
  const info = EMOTIONS.find(e => e.value === emotion);
  if (!info) return null;
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${info.color}`}>
      {info.emoji} {info.label} {intensity && intensity > 5 ? `(${intensity})` : ""}
    </Badge>
  );
}

interface AutoEmotionButtonProps {
  projectId: number;
  onComplete?: () => void;
}

export function AutoEmotionButton({ projectId, onComplete }: AutoEmotionButtonProps) {
  const analyzeEmotions = trpc.lectureBuilder.analyzeEmotions.useMutation({
    onSuccess: (data) => {
      toast.success(`감정 분석 완료: ${data.updated}개 스크립트에 감정 태그 적용`);
      onComplete?.();
    },
    onError: () => {
      toast.error("감정 분석 실패");
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => analyzeEmotions.mutate({ projectId })}
      disabled={analyzeEmotions.isPending}
      className="gap-1.5"
    >
      <Sparkles className="w-3.5 h-3.5" />
      {analyzeEmotions.isPending ? "분석 중..." : "AI 감정 자동 분석"}
    </Button>
  );
}
