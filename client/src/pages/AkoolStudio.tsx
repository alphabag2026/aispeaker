import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import ModelCarousel from "@/components/ModelCarousel";
import EffectsGallery from "@/components/EffectsGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
      <Icon className={`h-3.5 w-3.5 ${status === 2 ? "animate-spin" : ""}`} />
      {info.label}
    </Badge>
  );
}

/* ═══════════ Image to Video Tab ═══════════ */
function ImageToVideoTab() {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [videoLength, setVideoLength] = useState<5 | 10>(5);
  const [effectCode, setEffectCode] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const effectsQuery = trpc.akool.getEffects.useQuery(undefined, { staleTime: 600000 });
  const i2vMut = trpc.akool.imageToVideo.useMutation({
    onSuccess: (data) => {
      setJobId(data.id);
      setPollingEnabled(true);
      toast.success("AI가 비디오를 생성하고 있습니다...");
    },
    onError: (err) => toast.error(err.message),
  });

  const resultQuery = trpc.akool.getI2VResult.useQuery(
    { id: jobId! },
    {
      enabled: !!jobId && pollingEnabled,
      refetchInterval: pollingEnabled ? 5000 : false,
    }
  );

  useEffect(() => {
    if (resultQuery.data?.status === 3 || resultQuery.data?.status === 4) {
      setPollingEnabled(false);
      if (resultQuery.data.status === 3) {
        toast.success("비디오가 성공적으로 생성되었습니다.");
      }
    }
  }, [resultQuery.data?.status]);

  const handleGenerate = () => {
    if (!imageUrl || !prompt) {
      toast.error("이미지 URL과 프롬프트를 입력하세요.");
      return;
    }
    i2vMut.mutate({
      imageUrl,
      prompt,
      negativePrompt: negativePrompt || undefined,
      resolution,
      videoLength,
      effectCode: effectCode || undefined,
      isPremiumModel: isPremium,
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: Input */}
      <div className="space-y-5">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
              소스 이미지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>이미지 URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-background/50"
              />
            </div>
            {imageUrl && (
              <div className="rounded-lg overflow-hidden border border-border/50">
                <img src={imageUrl} alt="Preview" className="w-full max-h-64 object-contain bg-black/20" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              생성 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>모션 프롬프트</Label>
              <Textarea
                placeholder="카메라가 천천히 줌인하면서 꽃잎이 바람에 흩날리는 장면..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="bg-background/50"
              />
            </div>
            <div>
              <Label>네거티브 프롬프트 (선택)</Label>
              <Input
                placeholder="blurry, low quality, distorted..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>해상도</Label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as any)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                    <SelectItem value="4k">4K Ultra HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>영상 길이</Label>
                <Select value={String(videoLength)} onValueChange={(v) => setVideoLength(Number(v) as 5 | 10)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5초</SelectItem>
                    <SelectItem value="10">10초</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effects */}
            {effectsQuery.data && Array.isArray(effectsQuery.data) && effectsQuery.data.length > 0 && (
              <div>
                <Label>효과 프리셋</Label>
                <Select value={effectCode} onValueChange={setEffectCode}>
                  <SelectTrigger className="bg-background/50"><SelectValue placeholder="효과 선택 (선택사항)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">효과 없음</SelectItem>
                    {effectsQuery.data.map((effect: any) => (
                      <SelectItem key={effect.code || effect.effect_code} value={effect.code || effect.effect_code}>
                        {effect.name || effect.effect_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>프리미엄 모델 사용</Label>
              <Switch checked={isPremium} onCheckedChange={setIsPremium} />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={i2vMut.isPending || !imageUrl || !prompt}
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0"
              size="lg"
            >
              {i2vMut.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> 생성 중...</>
              ) : (
                <><Clapperboard className="h-5 w-5 mr-2" /> 비디오 생성</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right: Result */}
      <div>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-primary" />
                결과
              </span>
              {jobId && resultQuery.data && <StatusBadge status={resultQuery.data.status} />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!jobId ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Clapperboard className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">이미지를 비디오로 변환하세요</p>
                <p className="text-sm mt-1">왼쪽에서 이미지와 프롬프트를 입력하고 생성 버튼을 클릭하세요.</p>
              </div>
            ) : resultQuery.data?.status === 3 && resultQuery.data.videoUrl ? (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
                  <video
                    src={resultQuery.data.videoUrl}
                    controls
                    className="w-full aspect-video"
                    autoPlay
                    loop
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" asChild>
                    <a href={resultQuery.data.videoUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" /> 다운로드
                    </a>
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => { setJobId(null); setPollingEnabled(false); }}>
                    <RefreshCw className="h-4 w-4" /> 새로 만들기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">AI가 비디오를 생성하고 있습니다...</p>
                <p className="text-sm text-muted-foreground mt-1">보통 30초~2분 정도 소요됩니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════ Face Swap Tab ═══════════ */
function FaceSwapTab() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [mode, setMode] = useState<"pro" | "plus">("pro");
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const faceSwapProMut = trpc.akool.faceSwapPro.useMutation({
    onSuccess: (data) => {
      setJobId(data.id);
      setPollingEnabled(true);
      toast.success("AI가 얼굴을 교환하고 있습니다...");
    },
    onError: (err) => toast.error(err.message),
  });

  const faceSwapPlusMut = trpc.akool.faceSwapPlus.useMutation({
    onSuccess: (data) => {
      setJobId(data.id);
      setPollingEnabled(true);
      toast.success("AI가 얼굴을 교환하고 있습니다...");
    },
    onError: (err) => toast.error(err.message),
  });

  const resultQuery = trpc.akool.getFaceSwapResult.useQuery(
    { id: jobId! },
    {
      enabled: !!jobId && pollingEnabled,
      refetchInterval: pollingEnabled ? 5000 : false,
    }
  );

  useEffect(() => {
    if (resultQuery.data?.status === 3 || resultQuery.data?.status === 4) {
      setPollingEnabled(false);
      if (resultQuery.data.status === 3) {
        toast.success("얼굴 교환이 완료되었습니다.");
      }
    }
  }, [resultQuery.data?.status]);

  const handleSwap = () => {
    if (!sourceUrl || !targetUrl) {
      toast.error("소스와 타겟 이미지 URL을 모두 입력하세요.");
      return;
    }
    if (mode === "pro") {
      faceSwapProMut.mutate({ sourceImageUrl: sourceUrl, targetImageUrl: targetUrl, faceEnhance });
    } else {
      faceSwapPlusMut.mutate({ sourceUrl, targetUrl, faceEnhance });
    }
  };

  const isPending = faceSwapProMut.isPending || faceSwapPlusMut.isPending;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User2 className="h-5 w-5 text-pink-500" />
              Face Swap 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>모드</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "pro" | "plus")}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro (단일 얼굴, 최고 품질)</SelectItem>
                  <SelectItem value="plus">Plus (멀티 얼굴, 이미지+영상)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>소스 이미지 (교환할 얼굴)</Label>
              <Input placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="bg-background/50" />
              {sourceUrl && <img src={sourceUrl} alt="Source" className="mt-2 rounded-lg max-h-32 object-contain border border-border/50" />}
            </div>
            <div>
              <Label>타겟 이미지/영상 (얼굴이 교환될 대상)</Label>
              <Input placeholder="https://..." value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="bg-background/50" />
              {targetUrl && <img src={targetUrl} alt="Target" className="mt-2 rounded-lg max-h-32 object-contain border border-border/50" />}
            </div>
            <div className="flex items-center justify-between">
              <Label>얼굴 향상 (Face Enhance)</Label>
              <Switch checked={faceEnhance} onCheckedChange={setFaceEnhance} />
            </div>
            <Button
              onClick={handleSwap}
              disabled={isPending || !sourceUrl || !targetUrl}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border-0"
              size="lg"
            >
              {isPending ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> 처리 중...</> : <><User2 className="h-5 w-5 mr-2" /> Face Swap 실행</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg"><User2 className="h-5 w-5 text-pink-500" /> 결과</span>
            {jobId && resultQuery.data && <StatusBadge status={resultQuery.data.status} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!jobId ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <User2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">AI Face Swap</p>
              <p className="text-sm mt-1">소스와 타겟 이미지를 입력하고 실행하세요.</p>
            </div>
          ) : resultQuery.data?.status === 3 && resultQuery.data.resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border/50">
                <img src={resultQuery.data.resultUrl} alt="Result" className="w-full object-contain" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href={resultQuery.data.resultUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> 다운로드</a>
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { setJobId(null); setPollingEnabled(false); }}>
                  <RefreshCw className="h-4 w-4" /> 새로 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-pink-500 mb-4" />
              <p className="text-lg font-medium">AI가 얼굴을 교환하고 있습니다...</p>
              <p className="text-sm text-muted-foreground mt-1">보통 10~30초 정도 소요됩니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════ Talking Avatar Tab ═══════════ */
function TalkingAvatarTab() {
  const [avatarId, setAvatarId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFrom, setAvatarFrom] = useState(2);
  const [inputText, setInputText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const avatarsQuery = trpc.akool.getAvatars.useQuery({ page: 1, size: 50 }, { staleTime: 600000 });

  const createMut = trpc.akool.createTalkingAvatar.useMutation({
    onSuccess: (data) => {
      setJobId(data.id);
      setPollingEnabled(true);
      toast.success("AI가 아바타 영상을 만들고 있습니다...");
    },
    onError: (err) => toast.error(err.message),
  });

  const resultQuery = trpc.akool.getTalkingAvatarResult.useQuery(
    { videoId: jobId! },
    {
      enabled: !!jobId && pollingEnabled,
      refetchInterval: pollingEnabled ? 5000 : false,
    }
  );

  useEffect(() => {
    if (resultQuery.data?.status === 3 || resultQuery.data?.status === 4) {
      setPollingEnabled(false);
      if (resultQuery.data.status === 3) {
        toast.success("아바타 영상이 생성되었습니다.");
      }
    }
  }, [resultQuery.data?.status]);

  const handleCreate = () => {
    if (!inputText) {
      toast.error("스크립트 텍스트를 입력하세요.");
      return;
    }
    createMut.mutate({
      avatarId: avatarId || undefined,
      avatarUrl: avatarUrl || undefined,
      avatarFrom,
      inputText,
      voiceId: voiceId || undefined,
      backgroundUrl: backgroundUrl || undefined,
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        {/* Avatar selection */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-cyan-500" />
              아바타 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>아바타 소스</Label>
              <Select value={String(avatarFrom)} onValueChange={(v) => setAvatarFrom(Number(v))}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">시스템 아바타</SelectItem>
                  <SelectItem value="3">커스텀 아바타 (URL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {avatarFrom === 2 && avatarsQuery.data && Array.isArray(avatarsQuery.data) && (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {avatarsQuery.data.map((av: any) => (
                  <button
                    key={av.avatar_id}
                    onClick={() => setAvatarId(av.avatar_id)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${
                      avatarId === av.avatar_id ? "border-primary ring-2 ring-primary/30" : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <img src={av.thumbnailUrl || av.url} alt={av.name} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}

            {avatarFrom === 3 && (
              <div>
                <Label>아바타 이미지/영상 URL</Label>
                <Input placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="bg-background/50" />
              </div>
            )}

            <div>
              <Label>배경 이미지 URL (선택)</Label>
              <Input placeholder="https://..." value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} className="bg-background/50" />
            </div>
          </CardContent>
        </Card>

        {/* Script & Voice */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              스크립트 & 음성
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>스크립트 텍스트</Label>
              <Textarea
                placeholder="아바타가 읽을 텍스트를 입력하세요..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={5}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground mt-1">{inputText.length}/5,000자</p>
            </div>
            <div>
              <Label>Voice ID (선택)</Label>
              <Input placeholder="Akool Voice ID" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="bg-background/50" />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMut.isPending || !inputText}
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border-0"
              size="lg"
            >
              {createMut.isPending ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> 생성 중...</> : <><Brain className="h-5 w-5 mr-2" /> 아바타 영상 생성</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg"><Brain className="h-5 w-5 text-cyan-500" /> 결과</span>
            {jobId && resultQuery.data && <StatusBadge status={resultQuery.data.status} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!jobId ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Brain className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">AI Talking Avatar</p>
              <p className="text-sm mt-1">아바타와 스크립트를 선택하고 생성하세요.</p>
            </div>
          ) : resultQuery.data?.status === 3 && resultQuery.data.videoUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
                <video src={resultQuery.data.videoUrl} controls className="w-full aspect-video" autoPlay />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href={resultQuery.data.videoUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> 다운로드</a>
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { setJobId(null); setPollingEnabled(false); }}>
                  <RefreshCw className="h-4 w-4" /> 새로 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mb-4" />
              <p className="text-lg font-medium">AI가 아바타 영상을 생성하고 있습니다...</p>
              <p className="text-sm text-muted-foreground mt-1">보통 1~5분 정도 소요됩니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════ Video Translation Tab ═══════════ */
function VideoTranslationTab() {
  const [videoUrl, setVideoUrl] = useState("");
  const [targetLang, setTargetLang] = useState("en");
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const translateMut = trpc.akool.translateVideo.useMutation({
    onSuccess: (data) => {
      setJobId(data.id);
      setPollingEnabled(true);
      toast.success("AI가 비디오를 번역하고 있습니다...");
    },
    onError: (err) => toast.error(err.message),
  });

  const resultQuery = trpc.akool.getTranslationResult.useQuery(
    { id: jobId! },
    {
      enabled: !!jobId && pollingEnabled,
      refetchInterval: pollingEnabled ? 5000 : false,
    }
  );

  useEffect(() => {
    if (resultQuery.data?.status === 3 || resultQuery.data?.status === 4) {
      setPollingEnabled(false);
      if (resultQuery.data.status === 3) {
        toast.success("비디오 번역이 완료되었습니다.");
      }
    }
  }, [resultQuery.data?.status]);

  const languages = [
    { code: "en", name: "English" }, { code: "ko", name: "한국어" },
    { code: "ja", name: "日本語" }, { code: "zh", name: "中文" },
    { code: "es", name: "Español" }, { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" }, { code: "pt", name: "Português" },
    { code: "ru", name: "Русский" }, { code: "ar", name: "العربية" },
    { code: "hi", name: "हिन्दी" }, { code: "vi", name: "Tiếng Việt" },
    { code: "th", name: "ไทย" }, { code: "id", name: "Bahasa Indonesia" },
    { code: "tr", name: "Türkçe" }, { code: "it", name: "Italiano" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-amber-500" />
            비디오 번역 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>비디오 URL</Label>
            <Input placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-background/50" />
          </div>
          <div>
            <Label>타겟 언어</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Akool의 AI가 비디오의 음성을 자동 인식하고, 선택한 언어로 번역 + 립싱크 + 음성 복제를 수행합니다.
          </p>
          <Button
            onClick={() => translateMut.mutate({ videoUrl, targetLanguage: targetLang })}
            disabled={translateMut.isPending || !videoUrl}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0"
            size="lg"
          >
            {translateMut.isPending ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> 번역 중...</> : <><Languages className="h-5 w-5 mr-2" /> 비디오 번역 시작</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg"><Languages className="h-5 w-5 text-amber-500" /> 결과</span>
            {jobId && resultQuery.data && <StatusBadge status={resultQuery.data.status} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!jobId ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Languages className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">AI Video Translation</p>
              <p className="text-sm mt-1">155+ 언어로 비디오를 자동 번역하세요.</p>
            </div>
          ) : resultQuery.data?.status === 3 && resultQuery.data.videoUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
                <video src={resultQuery.data.videoUrl} controls className="w-full aspect-video" autoPlay />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href={resultQuery.data.videoUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /> 다운로드</a>
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { setJobId(null); setPollingEnabled(false); }}>
                  <RefreshCw className="h-4 w-4" /> 새로 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-amber-500 mb-4" />
              <p className="text-lg font-medium">AI가 비디오를 번역하고 있습니다...</p>
              <p className="text-sm text-muted-foreground mt-1">보통 2~10분 정도 소요됩니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════ Main Page ═══════════ */
export default function AkoolStudio() {
  const { isAuthenticated } = useAuth();
  const creditsQuery = trpc.akool.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h1 className="text-3xl font-bold mb-4">AI Studio</h1>
          <p className="text-muted-foreground mb-8">로그인 후 Akool AI 도구를 사용할 수 있습니다.</p>
          <Button asChild className="bg-gradient-to-r from-violet-600 to-blue-600 text-white border-0">
            <a href={getLoginUrl()}>로그인</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.2_0.12_280_/_0.4),_transparent_60%)]" />
        <div className="container relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  AI Studio
                </span>
              </h1>
              <p className="text-muted-foreground mt-2">Akool API 기반 AI 도구 모음</p>
            </div>
            {creditsQuery.data && (
              <Badge variant="outline" className="gap-2 text-sm px-3 py-1.5">
                <Zap className="h-4 w-4 text-yellow-500" />
                Credits: {creditsQuery.data.credits ?? "N/A"}
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container pb-20">
        <Tabs defaultValue="i2v" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="i2v" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Clapperboard className="h-4 w-4" /> Image to Video
            </TabsTrigger>
            <TabsTrigger value="faceswap" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-rose-600 data-[state=active]:text-white">
              <User2 className="h-4 w-4" /> Face Swap
            </TabsTrigger>
            <TabsTrigger value="avatar" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-teal-600 data-[state=active]:text-white">
              <Brain className="h-4 w-4" /> Talking Avatar
            </TabsTrigger>
            <TabsTrigger value="translate" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <Languages className="h-4 w-4" /> Video Translation
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">
              <Sparkles className="h-4 w-4" /> AI Models
            </TabsTrigger>
            <TabsTrigger value="effects" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Zap className="h-4 w-4" /> Effects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="i2v"><ImageToVideoTab /></TabsContent>
          <TabsContent value="faceswap"><FaceSwapTab /></TabsContent>
          <TabsContent value="avatar"><TalkingAvatarTab /></TabsContent>
          <TabsContent value="translate"><VideoTranslationTab /></TabsContent>
          <TabsContent value="models">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  AI Model Comparison
                </h2>
                <ModelCarousel showComparison={true} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="effects">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                  Effect Presets Gallery
                </h2>
                <EffectsGallery compact={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
