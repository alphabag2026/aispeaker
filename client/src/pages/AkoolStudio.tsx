import { Link } from "wouter";
import StudioLayout from "@/components/StudioLayout";
import ModelCarousel from "@/components/ModelCarousel";
import EffectsGallery from "@/components/EffectsGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Clapperboard,
  User2,
  Brain,
  Languages,
  Upload,
  Play,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Video,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  Download,
  Volume2,
  Mic,
  Headphones,
  Camera,
  Radio,
  Palette,
  Wand2,
  Square,
  Pause,
  RotateCcw,
  Eraser,
  Type,
  Globe,
  Share2,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useCreditDeduction } from "@/hooks/useCreditDeduction";
import InsufficientCreditsDialog from "@/components/InsufficientCreditsDialog";
import { useLocation } from "wouter";

/** Shared gallery share helper */
function useGalleryShare() {
  const shareMut = trpc.community.create.useMutation({
    onSuccess: () => toast.success("커뮤니티 갤러리에 공유되었습니다! 🎉"),
    onError: (err: any) => toast.error(err.message || "공유 실패"),
  });
  return shareMut;
}

function ShareToGalleryButton({ mediaUrl, mediaType, toolUsed }: { mediaUrl: string; mediaType: "image" | "video" | "audio"; toolUsed: string }) {
  const shareMut = useGalleryShare();
  const [shared, setShared] = useState(false);
  return (
    <Button
      variant="outline"
      className="flex-1 gap-2"
      disabled={shareMut.isPending || shared}
      onClick={() => {
        shareMut.mutate({
          title: `AI Studio - ${toolUsed}`,
          description: `AI Studio ${toolUsed} 도구로 생성한 작품입니다.`,
          mediaUrl,
          mediaType,
          toolUsed,
        }, { onSuccess: () => setShared(true) });
      }}
    >
      <Share2 className="h-4 w-4" />
      {shared ? "공유 완료" : "갤러리 공유"}
    </Button>
  );
}

/* ── Status helpers ── */
const statusMap: Record<number, { label: string; icon: typeof Clock; color: string }> = {
  1: { label: "대기 중", icon: Clock, color: "text-yellow-500" },
  2: { label: "처리 중", icon: Loader2, color: "text-blue-500" },
  3: { label: "완료", icon: CheckCircle2, color: "text-green-500" },
  4: { label: "실패", icon: XCircle, color: "text-red-500" },
};

function StatusBadge({ status }: { status: number }) {
  const info = statusMap[status] || statusMap[1];
  const Icon = info.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${info.color}`}>
      <Icon className={`h-3 w-3 ${status === 2 ? 'animate-spin' : ''}`} />
      {info.label}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════════
   IMAGE TO VIDEO TAB
   ══════════════════════════════════════════════════════════════ */
function ImageToVideoTab() {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState("1080");
  const [selectedEffect, setSelectedEffect] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const i2vMut = trpc.akool.imageToVideo.useMutation({
    onSuccess: (data: any) => {
      setResultId(data._id || data.id);
      toast.success("비디오 생성 요청 완료! 처리 중...");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [pollId, setPollId] = useState<string | null>(null);
  const pollQuery = trpc.akool.getI2VResult.useQuery(
    { id: pollId! },
    {
      enabled: !!pollId,
      refetchInterval: (query) => {
        const d = query.state.data as any;
        if (d && (d.status === 3 || d.status === 4)) return false;
        return 3000;
      },
    }
  );
  useEffect(() => {
    const d = pollQuery.data as any;
    if (!d) return;
    if (d.status === 3 && (d.videoUrl || d.video_url)) {
      setResultUrl(d.videoUrl || d.video_url);
      toast.success("비디오 생성 완료!");
      setPollId(null);
    } else if (d.status === 4) {
      toast.error("비디오 생성 실패");
      setPollId(null);
    }
  }, [pollQuery.data]);

  const effects = [
    { id: "none", label: "없음" },
    { id: "kiss_screen", label: "Kiss Screen" },
    { id: "catwalk", label: "Catwalk" },
    { id: "360_orbit", label: "360° Orbit" },
    { id: "zoom_in", label: "Zoom In" },
    { id: "pan_left", label: "Pan Left" },
    { id: "tilt_up", label: "Tilt Up" },
    { id: "dolly_zoom", label: "Dolly Zoom" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clapperboard className="h-5 w-5 text-violet-400" />
            이미지 → 비디오
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">이미지 URL</Label>
            <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">프롬프트 (선택)</Label>
            <Textarea placeholder="비디오에 적용할 모션이나 효과를 설명하세요..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">해상도</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="720">720p</SelectItem>
                  <SelectItem value="1080">1080p</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">길이 (초)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3초</SelectItem>
                  <SelectItem value="5">5초</SelectItem>
                  <SelectItem value="10">10초</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">효과 프리셋</Label>
            <Select value={selectedEffect} onValueChange={setSelectedEffect}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue placeholder="효과 선택..." /></SelectTrigger>
              <SelectContent>
                {effects.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full glow-button"
            disabled={!imageUrl || i2vMut.isPending || isDeducting}
            onClick={() => deductAndRun("image_to_video", () => i2vMut.mutate({ imageUrl, prompt, duration: parseInt(duration), resolution, effect: selectedEffect === "none" ? undefined : selectedEffect } as any))}
          >
            {i2vMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            비디오 생성
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-cyan-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> 다운로드
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">비디오 생성 중...</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setPollId(resultId)} disabled={pollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${pollQuery.isFetching ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Video className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">이미지를 업로드하고 비디오를 생성하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
      <InsufficientCreditsDialog open={insufficientCredits.open} onClose={closeInsufficientModal} feature={insufficientCredits.feature} currentCredits={insufficientCredits.currentCredits} requiredCredits={insufficientCredits.requiredCredits} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FACE SWAP TAB
   ══════════════════════════════════════════════════════════════ */
function FaceSwapTab() {
  const [mode, setMode] = useState<"pro" | "plus">("pro");
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [faceEnhance, setFaceEnhance] = useState(true);
  const [resultId, setResultId] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const faceSwapMut = trpc.akool.faceSwapPro.useMutation({
    onSuccess: (data: any) => {
      setResultId(data._id || data.id);
      toast.success("얼굴 교환 요청 완료!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [fsPollId, setFsPollId] = useState<string | null>(null);
  const fsPollQuery = trpc.akool.getFaceSwapResult.useQuery(
    { id: fsPollId! },
    {
      enabled: !!fsPollId,
      refetchInterval: (query) => {
        const d = query.state.data as any;
        if (d && (d.status === 3 || d.status === 4)) return false;
        return 3000;
      },
    }
  );
  useEffect(() => {
    const d = fsPollQuery.data as any;
    if (!d) return;
    if (d.status === 3 && (d.resultUrl)) {
      setResultUrl(d.resultUrl);
      toast.success("얼굴 교환 완료!");
      setFsPollId(null);
    } else if (d.status === 4) {
      toast.error("얼굴 교환 실패");
      setFsPollId(null);
    }
  }, [fsPollQuery.data]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User2 className="h-5 w-5 text-pink-400" />
            얼굴 교환
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "pro" ? "default" : "outline"} size="sm" onClick={() => setMode("pro")} className={mode === "pro" ? "bg-gradient-to-r from-pink-600 to-rose-600 border-0" : ""}>Pro 모드</Button>
            <Button variant={mode === "plus" ? "default" : "outline"} size="sm" onClick={() => setMode("plus")} className={mode === "plus" ? "bg-gradient-to-r from-violet-600 to-blue-600 border-0" : ""}>Plus 모드</Button>
          </div>
          <div>
            <Label className="text-sm font-medium">소스 이미지 (교체할 얼굴)</Label>
            <Input placeholder="https://example.com/source-face.jpg" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">타겟 이미지/비디오</Label>
            <Input placeholder="https://example.com/target.jpg" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">얼굴 향상</Label>
            <Switch checked={faceEnhance} onCheckedChange={setFaceEnhance} />
          </div>
          <Button className="w-full glow-button" disabled={!sourceUrl || !targetUrl || faceSwapMut.isPending || isDeducting} onClick={() => deductAndRun("face_swap", () => faceSwapMut.mutate({ sourceUrl, targetUrl, faceEnhance } as any))}>
            {faceSwapMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            얼굴 교환 시작
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                {resultUrl.includes(".mp4") || resultUrl.includes("video") ? (
                  <video src={resultUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={resultUrl} alt="Face swap result" className="w-full h-full object-contain" />
                )}
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> 다운로드
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">처리 중...</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setFsPollId(resultId)} disabled={fsPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${fsPollQuery.isFetching ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <User2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">소스와 타겟 이미지를 입력하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TALKING AVATAR TAB
   ══════════════════════════════════════════════════════════════ */
function TalkingAvatarTab() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [script, setScript] = useState("");
  const [voiceId, setVoiceId] = useState("en-US-1");
  const [bgColor, setBgColor] = useState("#000000");
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const avatarMut = trpc.akool.createTalkingAvatar.useMutation({
    onSuccess: (data: any) => {
      setResultId(data._id || data.id);
      toast.success("아바타 비디오 생성 요청 완료!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [avatarPollId, setAvatarPollId] = useState<string | null>(null);
  const avatarPollQuery = trpc.akool.getTalkingAvatarResult.useQuery(
    { videoId: avatarPollId! },
    {
      enabled: !!avatarPollId,
      refetchInterval: (query) => {
        const d = query.state.data as any;
        if (d && (d.status === 3 || d.status === 4)) return false;
        return 3000;
      },
    }
  );
  useEffect(() => {
    const d = avatarPollQuery.data as any;
    if (!d) return;
    if (d.status === 3 && d.videoUrl) {
      setResultUrl(d.videoUrl);
      toast.success("아바타 비디오 생성 완료!");
      setAvatarPollId(null);
    } else if (d.status === 4) {
      toast.error("생성 실패");
      setAvatarPollId(null);
    }
  }, [avatarPollQuery.data]);


  const voices = [
    { id: "en-US-1", label: "English (US) - Male" },
    { id: "en-US-2", label: "English (US) - Female" },
    { id: "ko-KR-1", label: "한국어 - 남성" },
    { id: "ko-KR-2", label: "한국어 - 여성" },
    { id: "ja-JP-1", label: "日本語 - 男性" },
    { id: "zh-CN-1", label: "中文 - 男声" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-teal-400" />
            Talking Avatar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">아바타 이미지 URL</Label>
            <Input placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">스크립트</Label>
            <Textarea placeholder="아바타가 말할 내용을 입력하세요..." value={script} onChange={(e) => setScript(e.target.value)} rows={4} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">음성 선택</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full glow-button"
            disabled={!avatarUrl || !script || avatarMut.isPending}
            onClick={() => deductAndRun("talking_avatar", () => avatarMut.mutate({ avatarUrl, inputText: script, voiceId } as any))}
          >
            {avatarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            아바타 비디오 생성
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-cyan-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> 다운로드
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">아바타 비디오 생성 중...</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setAvatarPollId(resultId)} disabled={avatarPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${avatarPollQuery.isFetching ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Brain className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">아바타 이미지와 스크립트를 입력하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VIDEO TRANSLATION TAB
   ══════════════════════════════════════════════════════════════ */
function VideoTranslationTab() {
  const [videoUrl, setVideoUrl] = useState("");
  const [targetLang, setTargetLang] = useState("ko");
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const translateMut = trpc.akool.translateVideo.useMutation({
    onSuccess: (data: any) => {
      setResultId(data._id || data.id);
      toast.success("번역 요청 완료!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [transPollId, setTransPollId] = useState<string | null>(null);
  const transPollQuery = trpc.akool.getTranslationResult.useQuery(
    { id: transPollId! },
    {
      enabled: !!transPollId,
      refetchInterval: (query) => {
        const d = query.state.data as any;
        if (d && (d.status === 3 || d.status === 4)) return false;
        return 3000;
      },
    }
  );
  useEffect(() => {
    const d = transPollQuery.data as any;
    if (!d) return;
    if (d.status === 3 && d.videoUrl) {
      setResultUrl(d.videoUrl);
      toast.success("번역 완료!");
      setTransPollId(null);
    } else if (d.status === 4) {
      toast.error("번역 실패");
      setTransPollId(null);
    }
  }, [transPollQuery.data]);

  const languages = [
    { code: "ko", label: "한국어" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" },
    { code: "zh", label: "中文" }, { code: "es", label: "Español" }, { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" }, { code: "pt", label: "Português" }, { code: "ru", label: "Русский" },
    { code: "ar", label: "العربية" }, { code: "hi", label: "हिन्दी" }, { code: "vi", label: "Tiếng Việt" },
    { code: "th", label: "ไทย" }, { code: "id", label: "Bahasa Indonesia" }, { code: "tr", label: "Türkçe" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-amber-400" />
            비디오 번역
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">비디오 URL</Label>
            <Input placeholder="https://example.com/video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">타겟 언어</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full glow-button" disabled={!videoUrl || translateMut.isPending || isDeducting} onClick={() => deductAndRun("video_translate", () => translateMut.mutate({ videoUrl, targetLang } as any))}>
            {translateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Languages className="h-4 w-4 mr-2" />}
            번역 시작
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-amber-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> 다운로드
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">번역 처리 중...</p>
               <Button variant="outline" size="sm" className="gap-2" onClick={() => setTransPollId(resultId)} disabled={transPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${transPollQuery.isFetching ? 'animate-spin' : ''}`} />
                상태 확인
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Globe className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">비디오 URL과 타겟 언어를 선택하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TTS (Text to Speech) TAB - v8.0
   ══════════════════════════════════════════════════════════════ */
function TTSTab() {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("Kore");
  const [speed, setSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const voicesQuery = trpc.akool.ttsVoices.useQuery();
  const ttsMut = trpc.akool.ttsGenerate.useMutation({
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      toast.success(`음성 생성 완료! (${data.voiceName})`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handlePlay = useCallback(() => {
    if (!audioUrl) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const voices = voicesQuery.data || [];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5 text-green-400" />
            텍스트 → 음성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">텍스트 입력</Label>
            <Textarea
              placeholder="음성으로 변환할 텍스트를 입력하세요..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="mt-1.5 bg-background/50"
            />
            <p className="text-xs text-muted-foreground mt-1">{text.length}/5000</p>
          </div>
          <div>
            <Label className="text-sm font-medium">음성 선택</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {voices.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} - {v.desc} ({v.style})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">속도</Label>
              <span className="text-xs text-muted-foreground">{speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
          <Button
            className="w-full glow-button"
            disabled={!text.trim() || ttsMut.isPending}
            onClick={() => {
              audioRef.current = null;
              setAudioUrl(null);
              setIsPlaying(false);
              deductAndRun("tts_conversion", () => ttsMut.mutate({ text, voiceId, speed }));
            }}
          >
            {ttsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
            음성 생성
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-emerald-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioUrl ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-2xl rounded-full" />
                  <button
                    onClick={handlePlay}
                    className="relative h-20 w-20 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white ml-1" />}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPlaying ? "재생 중..." : "클릭하여 재생"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(audioUrl, "_blank")}>
                  <Download className="h-4 w-4" /> 다운로드
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="tts" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Volume2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">텍스트를 입력하고 음성을 생성하세요</p>
              <p className="text-xs mt-2 opacity-60">30종 AI 음성 지원</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOICE CLONE TAB - v8.0
   ══════════════════════════════════════════════════════════════ */
function VoiceCloneTab() {
  const [sampleUrl, setSampleUrl] = useState("");
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [matchedVoice, setMatchedVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const cloneMut = trpc.akool.voiceClone.useMutation({
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      setMatchedVoice(data.voiceName);
      toast.success(`음성 복제 완료! (매칭: ${data.voiceName})`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-indigo-400" />
            음성 복제
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-300">
              음성 샘플을 분석하여 가장 유사한 AI 음성을 자동 매칭합니다.
              짧은 음성 샘플(5초 이상)로도 높은 정확도의 매칭이 가능합니다.
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">음성 샘플 URL</Label>
            <Input placeholder="https://example.com/voice-sample.mp3" value={sampleUrl} onChange={(e) => setSampleUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">생성할 텍스트</Label>
            <Textarea placeholder="복제된 음성으로 말할 내용을 입력하세요..." value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1.5 bg-background/50" />
          </div>
          <Button
            className="w-full glow-button"
            disabled={!sampleUrl || !text.trim() || cloneMut.isPending}
            onClick={() => {
              audioRef.current = null;
              setAudioUrl(null);
              setIsPlaying(false);
              deductAndRun("voice_clone", () => cloneMut.mutate({ sampleAudioUrl: sampleUrl, text }));
            }}
          >
            {cloneMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            음성 복제 시작
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-indigo-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioUrl ? (
            <div className="space-y-6">
              {matchedVoice && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-300">매칭된 음성: <strong>{matchedVoice}</strong></p>
                </div>
              )}
              <div className="flex flex-col items-center py-6">
                <button
                  onClick={() => {
                    if (!audioRef.current) {
                      audioRef.current = new Audio(audioUrl);
                      audioRef.current.onended = () => setIsPlaying(false);
                    }
                    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                    else { audioRef.current.play(); setIsPlaying(true); }
                  }}
                  className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(audioUrl, "_blank")}>
                  <Download className="h-4 w-4" /> 다운로드
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="voice-clone" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Mic className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">음성 샘플과 텍스트를 입력하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOICE CHANGE TAB - v8.0
   ══════════════════════════════════════════════════════════════ */
function VoiceChangeTab() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetVoice, setTargetVoice] = useState("Kore");
  const [text, setText] = useState("");
  const [useTranscription, setUseTranscription] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const voicesQuery = trpc.akool.ttsVoices.useQuery();
  const changeMut = trpc.akool.voiceChange.useMutation({
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      setOriginalText(data.originalText || null);
      toast.success(`음성 변환 완료! (${data.voiceName})`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const voices = voicesQuery.data || [];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-purple-400" />
            음성 변환
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">원본 음성 URL</Label>
            <Input placeholder="https://example.com/original-voice.mp3" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">변환할 음성</Label>
            <Select value={targetVoice} onValueChange={setTargetVoice}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {voices.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>{v.name} - {v.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">자동 음성 인식 사용</Label>
            <Switch checked={useTranscription} onCheckedChange={setUseTranscription} />
          </div>
          {!useTranscription && (
            <div>
              <Label className="text-sm font-medium">텍스트 직접 입력</Label>
              <Textarea placeholder="변환할 텍스트를 입력하세요..." value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
            </div>
          )}
          <Button
            className="w-full glow-button"
            disabled={!sourceUrl || changeMut.isPending || (!useTranscription && !text.trim())}
            onClick={() => {
              audioRef.current = null;
              setAudioUrl(null);
              setIsPlaying(false);
              deductAndRun("voice_change", () => changeMut.mutate({
                sourceAudioUrl: sourceUrl,
                targetVoiceId: targetVoice,
                text: useTranscription ? undefined : text,
              }));
            }}
          >
            {changeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Headphones className="h-4 w-4 mr-2" />}
            음성 변환
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioUrl ? (
            <div className="space-y-6">
              {originalText && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">인식된 텍스트:</p>
                  <p className="text-sm">{originalText}</p>
                </div>
              )}
              <div className="flex flex-col items-center py-6">
                <button
                  onClick={() => {
                    if (!audioRef.current) {
                      audioRef.current = new Audio(audioUrl);
                      audioRef.current.onended = () => setIsPlaying(false);
                    }
                    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                    else { audioRef.current.play(); setIsPlaying(true); }
                  }}
                  className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(audioUrl, "_blank")}>
                  <Download className="h-4 w-4" /> 다운로드
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="voice-change" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Headphones className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">원본 음성과 변환할 음성을 선택하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   IMAGE GENERATION TAB - v8.0
   ══════════════════════════════════════════════════════════════ */
function ImageGenTab() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const genMut = trpc.akool.imageGen.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.imageUrl || null);
      if (data.imageUrl) toast.success("이미지 생성 완료!");
      else toast.error("이미지 생성에 실패했습니다");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const styles = [
    { id: "realistic", label: "사실적", icon: "📷" },
    { id: "illustration", label: "일러스트", icon: "🎨" },
    { id: "cartoon", label: "카툰", icon: "🖌️" },
    { id: "sketch", label: "스케치", icon: "✏️" },
    { id: "3d", label: "3D 렌더", icon: "🧊" },
    { id: "anime", label: "애니메이션", icon: "🌸" },
    { id: "watercolor", label: "수채화", icon: "💧" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-rose-400" />
            이미지 생성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">프롬프트</Label>
            <Textarea
              placeholder="생성할 이미지를 자세히 설명하세요..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-1.5 bg-background/50"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-3 block">스타일</Label>
            <div className="grid grid-cols-4 gap-2">
              {styles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`p-2 rounded-lg border text-center text-xs transition-all ${
                    style === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <span className="text-lg block mb-0.5">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full glow-button"
            disabled={!prompt.trim() || genMut.isPending}
            onClick={() => {
              setImageUrl(null);
              deductAndRun("image_generation", () => genMut.mutate({ prompt, style: style as any }));
            }}
          >
            {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            이미지 생성
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-rose-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {genMut.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">이미지 생성 중... (5~20초)</p>
            </div>
          ) : imageUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black/50">
                <img src={imageUrl} alt="Generated" className="w-full object-contain max-h-[400px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(imageUrl, "_blank")}>
                  <Download className="h-4 w-4" /> 다운로드
                </Button>
                <ShareToGalleryButton mediaUrl={imageUrl} mediaType="image" toolUsed="image-gen" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">프롬프트를 입력하고 이미지를 생성하세요</p>
              <p className="text-xs mt-2 opacity-60">7종 스타일 지원</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BACKGROUND REMOVE / CHANGE TAB - v8.0
   ══════════════════════════════════════════════════════════════ */
function BgRemoveTab() {
  const [imageUrl, setImageUrl] = useState("");
  const [newBg, setNewBg] = useState("");
  const [mode, setMode] = useState<"remove" | "change">("remove");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const bgMut = trpc.akool.bgRemove.useMutation({
    onSuccess: (data) => {
      setResultUrl(data.imageUrl || null);
      if (data.imageUrl) toast.success("배경 처리 완료!");
      else toast.error("배경 처리에 실패했습니다");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eraser className="h-5 w-5 text-teal-400" />
            배경 변경
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "remove" ? "default" : "outline"} size="sm" onClick={() => setMode("remove")} className={mode === "remove" ? "bg-gradient-to-r from-teal-600 to-cyan-600 border-0" : ""}>
              <Eraser className="h-3.5 w-3.5 mr-1.5" /> 배경 제거
            </Button>
            <Button variant={mode === "change" ? "default" : "outline"} size="sm" onClick={() => setMode("change")} className={mode === "change" ? "bg-gradient-to-r from-violet-600 to-blue-600 border-0" : ""}>
              <Palette className="h-3.5 w-3.5 mr-1.5" /> 배경 교체
            </Button>
          </div>
          <div>
            <Label className="text-sm font-medium">이미지 URL</Label>
            <Input placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          {mode === "change" && (
            <div>
              <Label className="text-sm font-medium">새 배경 설명</Label>
              <Textarea placeholder="예: 파란 하늘과 해변, 현대적인 사무실 배경..." value={newBg} onChange={(e) => setNewBg(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
            </div>
          )}
          <Button
            className="w-full glow-button"
            disabled={!imageUrl || bgMut.isPending || (mode === "change" && !newBg.trim())}
            onClick={() => {
              setResultUrl(null);
              deductAndRun("bg_remove", () => bgMut.mutate({
                imageUrl,
                newBackground: mode === "change" ? newBg : undefined,
              }));
            }}
          >
            {bgMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {mode === "remove" ? "배경 제거" : "배경 교체"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-teal-400" />
            결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bgMut.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">배경 처리 중...</p>
            </div>
          ) : resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ background: "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px" }}>
                <img src={resultUrl} alt="Result" className="w-full object-contain max-h-[400px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                  <Download className="h-4 w-4" /> 다운로드
                </Button>
                <ShareToGalleryButton mediaUrl={resultUrl} mediaType="image" toolUsed="bg-remove" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Palette className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">이미지 URL을 입력하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIVE CAMERA - v8.0 (WebRTC placeholder with feature preview)
   ══════════════════════════════════════════════════════════════ */
function LiveCameraTab() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-2xl rounded-full" />
              <Camera className="h-16 w-16 text-cyan-400 relative" />
            </div>
            <h2 className="text-2xl font-bold mb-3">라이브 카메라 AI</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              웹캠에 실시간 AI 효과를 적용합니다. 얼굴 교환, 배경 변경, 뷰티 필터 등을
              실시간으로 적용하여 화상회의나 라이브 스트리밍에 활용할 수 있습니다.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 w-full mb-8">
              {[
                { icon: User2, label: "실시간 얼굴 교환", desc: "WebRTC 기반 실시간 처리" },
                { icon: Palette, label: "배경 실시간 변경", desc: "AI 세그멘테이션 기반" },
                { icon: Sparkles, label: "뷰티 필터", desc: "피부 보정, 메이크업 효과" },
              ].map((f, i) => (
                <div key={i} className="p-4 rounded-lg bg-background/30 border border-border/30">
                  <f.icon className="h-6 w-6 text-cyan-400 mb-2 mx-auto" />
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
            <Badge variant="outline" className="gap-2 text-sm px-4 py-2">
              <Clock className="h-4 w-4" />
              Coming Soon - WebRTC 통합 준비 중
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STREAMING AVATAR - v8.0 (Real-time interactive avatar)
   ══════════════════════════════════════════════════════════════ */
function StreamingAvatarTab() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-pink-600/20 blur-2xl rounded-full" />
              <Radio className="h-16 w-16 text-violet-400 relative" />
            </div>
            <h2 className="text-2xl font-bold mb-3">스트리밍 아바타</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              실시간으로 대화하는 AI 아바타를 생성합니다. 음성 인식과 자연어 처리를 결합하여
              실시간 대화가 가능한 인터랙티브 아바타를 제공합니다.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 w-full mb-8">
              {[
                { icon: Brain, label: "실시간 대화", desc: "LLM 기반 자연어 응답" },
                { icon: Mic, label: "음성 인식", desc: "STT + 실시간 처리" },
                { icon: Video, label: "아바타 렌더링", desc: "실시간 립싱크 + 표정" },
              ].map((f, i) => (
                <div key={i} className="p-4 rounded-lg bg-background/30 border border-border/30">
                  <f.icon className="h-6 w-6 text-violet-400 mb-2 mx-auto" />
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
            <Badge variant="outline" className="gap-2 text-sm px-4 py-2">
              <Clock className="h-4 w-4" />
              Coming Soon - 실시간 아바타 엔진 개발 중
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STUDIO OVERVIEW (default landing)
   ══════════════════════════════════════════════════════════════ */
function StudioOverview() {
  const tools = [
    { label: "이미지 → 비디오", href: "/ai-studio/image-to-video", icon: Clapperboard, color: "from-violet-600 to-blue-600", desc: "정적 이미지를 생동감 있는 비디오로 변환", badge: "hot" },
    { label: "얼굴 교환", href: "/ai-studio/face-swap", icon: User2, color: "from-pink-600 to-rose-600", desc: "AI 기반 정밀 얼굴 교환", badge: "hot" },
    { label: "아바타 비디오", href: "/ai-studio/talking-avatar", icon: Brain, color: "from-cyan-600 to-teal-600", desc: "텍스트로 말하는 아바타 생성", badge: "" },
    { label: "비디오 번역", href: "/ai-studio/video-translate", icon: Languages, color: "from-amber-600 to-orange-600", desc: "15+ 언어로 비디오 자동 번역", badge: "" },
    { label: "텍스트 → 음성", href: "/ai-studio/tts", icon: Volume2, color: "from-green-600 to-emerald-600", desc: "30종 AI 음성 합성", badge: "new" },
    { label: "음성 복제", href: "/ai-studio/voice-clone", icon: Mic, color: "from-indigo-600 to-violet-600", desc: "목소리를 복제하여 콘텐츠 제작", badge: "new" },
    { label: "음성 변환", href: "/ai-studio/voice-change", icon: Headphones, color: "from-purple-600 to-pink-600", desc: "음성을 다른 목소리로 변환", badge: "new" },
    { label: "이미지 생성", href: "/ai-studio/image-gen", icon: ImageIcon, color: "from-rose-600 to-orange-600", desc: "텍스트로 고품질 이미지 생성", badge: "new" },
    { label: "배경 변경", href: "/ai-studio/bg-remove", icon: Eraser, color: "from-teal-600 to-cyan-600", desc: "AI 배경 제거 및 교체", badge: "new" },
    { label: "라이브 카메라", href: "/ai-studio/live-camera", icon: Camera, color: "from-sky-600 to-blue-600", desc: "실시간 AI 카메라 효과", badge: "" },
    { label: "스트리밍 아바타", href: "/ai-studio/streaming-avatar", icon: Radio, color: "from-fuchsia-600 to-violet-600", desc: "실시간 대화형 AI 아바타", badge: "" },
    { label: "AI 모델 비교", href: "/ai-studio/models", icon: Sparkles, color: "from-fuchsia-600 to-pink-600", desc: "10+ AI 모델 성능 비교", badge: "" },
    { label: "효과 프리셋", href: "/ai-studio/effects", icon: Zap, color: "from-yellow-600 to-amber-600", desc: "12종 비디오 효과 프리셋", badge: "" },
  ];

  const badgeColors: Record<string, string> = {
    hot: "bg-red-500/80 text-white",
    new: "bg-green-500/80 text-white",
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          <span className="gradient-text">AI 도구 모음</span>
        </h2>
        <p className="text-muted-foreground">원하는 도구를 선택하여 시작하세요</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="glass-card cursor-pointer group h-full relative">
              {tool.badge && (
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColors[tool.badge] || ""}`}>
                  {tool.badge.toUpperCase()}
                </span>
              )}
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{tool.label}</h3>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   EXPORTED SUB-PAGE COMPONENTS
   ══════════════════════════════════════════════════════════════ */
export function AkoolImageToVideo() {
  return (
    <StudioLayout title="이미지 → 비디오" subtitle="정적 이미지를 생동감 있는 비디오로 변환합니다">
      <ImageToVideoTab />
    </StudioLayout>
  );
}

export function AkoolFaceSwap() {
  return (
    <StudioLayout title="얼굴 교환" subtitle="AI 기반 정밀 얼굴 교환 (Pro / Plus 모드)">
      <FaceSwapTab />
    </StudioLayout>
  );
}

export function AkoolTalkingAvatar() {
  return (
    <StudioLayout title="Talking Avatar" subtitle="텍스트 스크립트로 말하는 아바타 비디오를 생성합니다">
      <TalkingAvatarTab />
    </StudioLayout>
  );
}

export function AkoolVideoTranslate() {
  return (
    <StudioLayout title="비디오 번역" subtitle="15+ 언어로 비디오를 자동 번역합니다">
      <VideoTranslationTab />
    </StudioLayout>
  );
}

export function AkoolTTS() {
  return (
    <StudioLayout title="텍스트 → 음성" subtitle="30종 AI 음성으로 자연스러운 음성 합성">
      <TTSTab />
    </StudioLayout>
  );
}

export function AkoolVoiceClone() {
  return (
    <StudioLayout title="음성 복제" subtitle="음성 샘플을 분석하여 유사한 AI 음성으로 복제">
      <VoiceCloneTab />
    </StudioLayout>
  );
}

export function AkoolVoiceChange() {
  return (
    <StudioLayout title="음성 변환" subtitle="음성을 다른 목소리로 변환합니다">
      <VoiceChangeTab />
    </StudioLayout>
  );
}

export function AkoolImageGen() {
  return (
    <StudioLayout title="이미지 생성" subtitle="텍스트 프롬프트로 7종 스타일 이미지 생성">
      <ImageGenTab />
    </StudioLayout>
  );
}

export function AkoolBgRemove() {
  return (
    <StudioLayout title="배경 변경" subtitle="AI 기반 배경 제거 및 교체">
      <BgRemoveTab />
    </StudioLayout>
  );
}

export function AkoolLiveCamera() {
  return (
    <StudioLayout title="라이브 카메라" subtitle="실시간 AI 카메라 효과">
      <LiveCameraTab />
    </StudioLayout>
  );
}

export function AkoolStreamingAvatar() {
  return (
    <StudioLayout title="스트리밍 아바타" subtitle="실시간 대화형 AI 아바타">
      <StreamingAvatarTab />
    </StudioLayout>
  );
}

export function AkoolModels() {
  return (
    <StudioLayout title="AI 모델 비교" subtitle="10+ AI 모델의 성능과 특징을 비교합니다">
      <ModelCarousel showComparison={true} />
    </StudioLayout>
  );
}

export function AkoolEffects() {
  return (
    <StudioLayout title="효과 프리셋 갤러리" subtitle="12종 비디오 효과 프리셋을 미리보기합니다">
      <EffectsGallery compact={false} />
    </StudioLayout>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEFAULT EXPORT - STUDIO OVERVIEW
   ══════════════════════════════════════════════════════════════ */
export default function AkoolStudio() {
  return (
    <StudioLayout title="AI Studio" subtitle="25+ AI 도구를 하나의 플랫폼에서">
      <StudioOverview />
    </StudioLayout>
  );
}
