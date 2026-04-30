import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/i18n/pages/AkoolStudio";
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
  const { t } = useLanguage();
  const shareMut = trpc.community.create.useMutation({
    onSuccess: () => toast.success("akoolStudio.share.success"),
    onError: (err: any) => toast.error(err.message || "akoolStudio.share.error"),
  });
  return shareMut;
}

function ShareToGalleryButton({ mediaUrl, mediaType, toolUsed }: { mediaUrl: string; mediaType: "image" | "video" | "audio"; toolUsed: string }) {
  const { t } = useLanguage();
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
          description: `AI Studio - ${toolUsed}`,
          mediaUrl,
          mediaType,
          toolUsed,
        }, { onSuccess: () => setShared(true) });
      }}
    >
      <Share2 className="h-4 w-4" />
      {shared ? "akoolStudio.share.shared" : "akoolStudio.share.share"}
    </Button>
  );
}

/* ── Status helpers ── */
const statusMap: Record<number, { label: string; icon: typeof Clock; color: string }> = {
  1: { label: "akoolStudio.status.waiting", icon: Clock, color: "text-yellow-500" },
  2: { label: "akoolStudio.status.processing", icon: Loader2, color: "text-blue-500" },
  3: { label: "akoolStudio.status.completed", icon: CheckCircle2, color: "text-green-500" },
  4: { label: "akoolStudio.status.failed", icon: XCircle, color: "text-red-500" },
};

function StatusBadge({ status }: { status: number }) {
  const { t } = useLanguage();
  const info = statusMap[status] || statusMap[1];
  const Icon = info.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${info.color}`}>
      <Icon className={`h-3 w-3 ${status === 2 ? 'animate-spin' : ''}`} />
      {t(info.label)}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════════
   IMAGE TO VIDEO TAB
   ══════════════════════════════════════════════════════════════ */
function ImageToVideoTab() {
  const { t } = useLanguage();
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
      toast.success("akoolStudio.imageToVideo.requestSuccess");
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
      toast.success("akoolStudio.imageToVideo.createSuccess");
      setPollId(null);
    } else if (d.status === 4) {
      toast.error("akoolStudio.imageToVideo.createError");
      setPollId(null);
    }
  }, [pollQuery.data]);

  const effects = [
    { id: "none", label: "akoolStudio.imageToVideo.effectNone" },
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
            {"akoolStudio.main.tabs.imageToVideo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.bgRemove.imageUrlLabel"}</Label>
            <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.imageToVideo.promptLabel"}</Label>
            <Textarea placeholder={"akoolStudio.imageToVideo.promptPlaceholder"} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">{"akoolStudio.imageToVideo.resolutionLabel"}</Label>
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
              <Label className="text-sm font-medium">{"akoolStudio.imageToVideo.durationLabel"}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{"akoolStudio.imageToVideo.duration3"}</SelectItem>
                  <SelectItem value="5">{"akoolStudio.imageToVideo.duration5"}</SelectItem>
                  <SelectItem value="10">{"akoolStudio.imageToVideo.duration10"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.imageToVideo.effectPresetLabel"}</Label>
            <Select value={selectedEffect} onValueChange={setSelectedEffect}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue placeholder={"akoolStudio.imageToVideo.effectSelectPlaceholder"} /></SelectTrigger>
              <SelectContent>
                {effects.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{t(e.label)}</SelectItem>
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
            {"akoolStudio.imageToVideo.createButton"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-cyan-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{"akoolStudio.imageToVideo.creating"}</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setPollId(resultId)} disabled={pollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${pollQuery.isFetching ? 'animate-spin' : ''}`} />{t("{i18n_key}")}</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Video className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{"akoolStudio.imageToVideo.placeholder"}</p>
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
  const { t } = useLanguage();
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
      toast.success(t("akoolStudio.hardcoded1"));
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
      toast.success(t("akoolStudio.hardcoded2"));
      setFsPollId(null);
    } else if (d.status === 4) {
      toast.error(t("akoolStudio.hardcoded3"));
      setFsPollId(null);
    }
  }, [fsPollQuery.data]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User2 className="h-5 w-5 text-pink-400" />
            {t("akoolStudio.hardcoded1")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "pro" ? "default" : "outline"} size="sm" onClick={() => setMode("pro")} className={mode === "pro" ? "bg-gradient-to-r from-pink-600 to-rose-600 border-0" : ""}>{t("akoolStudio.hardcoded4")}</Button>
            <Button variant={mode === "plus" ? "default" : "outline"} size="sm" onClick={() => setMode("plus")} className={mode === "plus" ? "bg-gradient-to-r from-violet-600 to-blue-600 border-0" : ""}>{t("akoolStudio.hardcoded5")}</Button>
          </div>
          <div>
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded6")}</Label>
            <Input placeholder="https://example.com/source-face.jpg" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded7")}</Label>
            <Input placeholder="https://example.com/target.jpg" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded8")}</Label>
            <Switch checked={faceEnhance} onCheckedChange={setFaceEnhance} />
          </div>
          <Button className="w-full glow-button" disabled={!sourceUrl || !targetUrl || faceSwapMut.isPending || isDeducting} onClick={() => deductAndRun("face_swap", () => faceSwapMut.mutate({ sourceUrl, targetUrl, faceEnhance } as any))}>
            {faceSwapMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {t("akoolStudio.hardcoded2")}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            {"akoolStudio.common.result"}
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
                <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{t("akoolStudio.hardcoded9")}</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setFsPollId(resultId)} disabled={fsPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${fsPollQuery.isFetching ? 'animate-spin' : ''}`} />
                {t("akoolStudio.hardcoded3")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <User2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{t("akoolStudio.hardcoded10")}</p>
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
  const { t } = useLanguage();
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
      toast.success("akoolStudio.talkingAvatar.requestSuccess");
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
      toast.success("akoolStudio.talkingAvatar.createSuccess");
      setAvatarPollId(null);
    } else if (d.status === 4) {
      toast.error(t("akoolStudio.hardcoded11"));
      setAvatarPollId(null);
    }
  }, [avatarPollQuery.data]);


  const voices = [
    { id: "en-US-1", label: "English (US) - Male" },
    { id: "en-US-2", label: "English (US) - Female" },
    { id: "ko-KR-1", label: t("akoolStudio.hardcoded12") },
    { id: "ko-KR-2", label: t("akoolStudio.hardcoded13") },
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
            <Label className="text-sm font-medium">{"akoolStudio.talkingAvatar.avatarUrlLabel"}</Label>
            <Input placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.talkingAvatar.scriptLabel"}</Label>
            <Textarea placeholder={t("akoolStudio.hardcoded14")} value={script} onChange={(e) => setScript(e.target.value)} rows={4} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.tts.voiceLabel"}</Label>
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
            {"akoolStudio.talkingAvatar.createButton"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-cyan-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{"akoolStudio.talkingAvatar.creating"}</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setAvatarPollId(resultId)} disabled={avatarPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${avatarPollQuery.isFetching ? 'animate-spin' : ''}`} />
                {t("akoolStudio.hardcoded3")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Brain className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{"akoolStudio.talkingAvatar.placeholder"}</p>
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
  const { t } = useLanguage();
  const [videoUrl, setVideoUrl] = useState("");
  const [targetLang, setTargetLang] = useState("ko");
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const translateMut = trpc.akool.translateVideo.useMutation({
    onSuccess: (data: any) => {
      setResultId(data._id || data.id);
      toast.success("akoolStudio.videoTranslation.requestSuccess");
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
      toast.success("akoolStudio.videoTranslation.translateSuccess");
      setTransPollId(null);
    } else if (d.status === 4) {
      toast.error("akoolStudio.videoTranslation.translateError");
      setTransPollId(null);
    }
  }, [transPollQuery.data]);

  const languages = [
    { code: "ko", label: "akoolStudio.videoTranslation.langKorean" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" },
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
            {"akoolStudio.main.tabs.videoTranslation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.videoTranslation.videoUrlLabel"}</Label>
            <Input placeholder="https://example.com/video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.videoTranslation.targetLangLabel"}</Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="mt-1.5 bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{t(l.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full glow-button" disabled={!videoUrl || translateMut.isPending || isDeducting} onClick={() => deductAndRun("video_translate", () => translateMut.mutate({ videoUrl, targetLang } as any))}>
            {translateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Languages className="h-4 w-4 mr-2" />}
            {"akoolStudio.videoTranslation.translateButton"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-amber-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <video src={resultUrl} controls className="w-full h-full object-contain" />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
              </Button>
            </div>
          ) : resultId ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{"akoolStudio.videoTranslation.translating"}</p>
               <Button variant="outline" size="sm" className="gap-2" onClick={() => setTransPollId(resultId)} disabled={transPollQuery.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${transPollQuery.isFetching ? 'animate-spin' : ''}`} />
                {t("akoolStudio.hardcoded3")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Globe className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{"akoolStudio.videoTranslation.placeholder"}</p>
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
  const { t } = useLanguage();
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
      toast.success(`Voice generated! (${data.voiceName})`);
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
            {"akoolStudio.tts.title"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.tts.textLabel"}</Label>
            <Textarea
              placeholder={"akoolStudio.tts.textPlaceholder"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="mt-1.5 bg-background/50"
            />
            <p className="text-xs text-muted-foreground mt-1">{text.length}/5000</p>
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.tts.voiceLabel"}</Label>
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
              <Label className="text-sm font-medium">{"akoolStudio.tts.speedLabel"}</Label>
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
            {"akoolStudio.tts.createButton"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-emerald-400" />
            {"akoolStudio.common.result"}
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
                  {isPlaying ? t("akoolStudio.hardcoded15") : t("akoolStudio.hardcoded16")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(audioUrl, "_blank")}>
                  <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="tts" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Volume2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{t("akoolStudio.hardcoded17")}</p>
              <p className="text-xs mt-2 opacity-60">{t("akoolStudio.hardcoded18")}</p>
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
  const { t } = useLanguage();
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
      toast.success(`Voice cloned! (match: ${data.voiceName})`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-indigo-400" />
            {t("akoolStudio.hardcoded4")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-300">
              {t("akoolStudio.hardcoded5")}
              {t("akoolStudio.hardcoded6")}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded19")}</Label>
            <Input placeholder="https://example.com/voice-sample.mp3" value={sampleUrl} onChange={(e) => setSampleUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded20")}</Label>
            <Textarea placeholder={t("akoolStudio.hardcoded21")} value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1.5 bg-background/50" />
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
            {t("akoolStudio.hardcoded7")}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-indigo-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioUrl ? (
            <div className="space-y-6">
              {matchedVoice && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-300">Matched voice: <strong>{matchedVoice}</strong></p>
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
                  <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="voice-clone" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Mic className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{t("akoolStudio.hardcoded23")}</p>
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
  const { t } = useLanguage();
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
      toast.success(`Voice converted! (${data.voiceName})`);
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
            {"akoolStudio.main.tabs.voiceChange"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.voiceChange.sourceAudioLabel"} URL</Label>
            <Input placeholder="https://example.com/original-voice.mp3" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.voiceChange.targetVoiceLabel"}</Label>
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
            <Label className="text-sm font-medium">{t("akoolStudio.hardcoded24")}</Label>
            <Switch checked={useTranscription} onCheckedChange={setUseTranscription} />
          </div>
          {!useTranscription && (
            <div>
              <Label className="text-sm font-medium">{t("akoolStudio.hardcoded25")}</Label>
              <Textarea placeholder={t("akoolStudio.hardcoded26")} value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
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
            {"akoolStudio.main.tabs.voiceChange"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioUrl ? (
            <div className="space-y-6">
              {originalText && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t("akoolStudio.hardcoded27")}</p>
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
                  <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
                </Button>
                <ShareToGalleryButton mediaUrl={audioUrl} mediaType="audio" toolUsed="voice-change" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Headphones className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{"akoolStudio.voiceChange.placeholder"}</p>
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
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const genMut = trpc.akool.imageGen.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.imageUrl || null);
      if (data.imageUrl) toast.success("akoolStudio.imageGen.createSuccess");
      else toast.error("akoolStudio.imageGen.createError");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const styles = [
    { id: "realistic", label: "akoolStudio.imageGen.styleRealistic", icon: "📷" },
    { id: "illustration", label: "akoolStudio.imageGen.styleIllustration", icon: "🎨" },
    { id: "cartoon", label: "akoolStudio.imageGen.styleCartoon", icon: "🖌️" },
    { id: "sketch", label: "akoolStudio.imageGen.styleSketch", icon: "✏️" },
    { id: "3d", label: "akoolStudio.imageGen.style3d", icon: "🧊" },
    { id: "anime", label: "akoolStudio.imageGen.styleAnime", icon: "🌸" },
    { id: "watercolor", label: "akoolStudio.imageGen.styleWatercolor", icon: "💧" },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-rose-400" />
            {"akoolStudio.main.tabs.imageGen"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.imageGen.promptLabel"}</Label>
            <Textarea
              placeholder={"akoolStudio.imageGen.promptPlaceholder"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-1.5 bg-background/50"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-3 block">{"akoolStudio.imageGen.styleLabel"}</Label>
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
                  {t(s.label)}
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
            {"akoolStudio.main.tabs.imageGen"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-rose-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {genMut.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{"akoolStudio.imageGen.creating"}</p>
            </div>
          ) : imageUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-black/50">
                <img src={imageUrl} alt="Generated" className="w-full object-contain max-h-[400px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(imageUrl, "_blank")}>
                  <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
                </Button>
                <ShareToGalleryButton mediaUrl={imageUrl} mediaType="image" toolUsed="image-gen" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{"akoolStudio.imageGen.placeholder"}</p>
              <p className="text-xs mt-2 opacity-60">{"akoolStudio.imageGen.stylesSupported"}</p>
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
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState("");
  const [newBg, setNewBg] = useState("");
  const [mode, setMode] = useState<"remove" | "change">("remove");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { deductAndRun, isDeducting, insufficientCredits, closeInsufficientModal } = useCreditDeduction();

  const bgMut = trpc.akool.bgRemove.useMutation({
    onSuccess: (data) => {
      setResultUrl(data.imageUrl || null);
      if (data.imageUrl) toast.success("akoolStudio.bgRemove.processSuccess");
      else toast.error("akoolStudio.bgRemove.processError");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eraser className="h-5 w-5 text-teal-400" />
            {"akoolStudio.bgRemove.title"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "remove" ? "default" : "outline"} size="sm" onClick={() => setMode("remove")} className={mode === "remove" ? "bg-gradient-to-r from-teal-600 to-cyan-600 border-0" : ""}>
              <Eraser className="h-3.5 w-3.5 mr-1.5" /> {"akoolStudio.main.tabs.bgRemove"}
            </Button>
            <Button variant={mode === "change" ? "default" : "outline"} size="sm" onClick={() => setMode("change")} className={mode === "change" ? "bg-gradient-to-r from-violet-600 to-blue-600 border-0" : ""}>
              <Palette className="h-3.5 w-3.5 mr-1.5" /> {"akoolStudio.bgRemove.changeMode"}
            </Button>
          </div>
          <div>
            <Label className="text-sm font-medium">{"akoolStudio.bgRemove.imageUrlLabel"}</Label>
            <Input placeholder="https://example.com/photo.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1.5 bg-background/50" />
          </div>
          {mode === "change" && (
            <div>
              <Label className="text-sm font-medium">{"akoolStudio.bgRemove.newBgLabel"}</Label>
              <Textarea placeholder={"akoolStudio.bgRemove.newBgPlaceholder"} value={newBg} onChange={(e) => setNewBg(e.target.value)} rows={3} className="mt-1.5 bg-background/50" />
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
            {mode === "remove" ? "akoolStudio.main.tabs.bgRemove" : "akoolStudio.bgRemove.changeMode"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-teal-400" />
            {"akoolStudio.common.result"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bgMut.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
              <p className="text-sm text-muted-foreground">{"akoolStudio.bgRemove.processing"}</p>
            </div>
          ) : resultUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ background: "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px" }}>
                <img src={resultUrl} alt="Result" className="w-full object-contain max-h-[400px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.open(resultUrl, "_blank")}>
                  <Download className="h-4 w-4" /> {"akoolStudio.common.download"}
                </Button>
                <ShareToGalleryButton mediaUrl={resultUrl} mediaType="image" toolUsed="bg-remove" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Palette className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">{t("akoolStudio.hardcoded28")}</p>
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
  const { t } = useLanguage();
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 blur-2xl rounded-full" />
              <Camera className="h-16 w-16 text-cyan-400 relative" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t("akoolStudio.hardcoded29")}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Apply real-time AI effects to webcam. Face swap, background change, beauty filters
              can be applied in real-time for video conferences or live streaming.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 w-full mb-8">
              {[
                { icon: User2, label: t("akoolStudio.hardcoded30"), desc: t("akoolStudio.hardcoded31") },
                { icon: Palette, label: t("akoolStudio.hardcoded32"), desc: t("akoolStudio.hardcoded33") },
                { icon: Sparkles, label: t("akoolStudio.hardcoded34"), desc: t("akoolStudio.hardcoded35") },
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
              Coming Soon - WebRTC Integration
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
  const { t } = useLanguage();
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-pink-600/20 blur-2xl rounded-full" />
              <Radio className="h-16 w-16 text-violet-400 relative" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{t("akoolStudio.hardcoded36")}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Create AI avatars that converse in real-time. Combining speech recognition and NLP
              to provide interactive avatars capable of real-time conversation.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 w-full mb-8">
              {[
                { icon: Brain, label: t("akoolStudio.hardcoded37"), desc: t("akoolStudio.hardcoded38") },
                { icon: Mic, label: t("akoolStudio.hardcoded39"), desc: t("akoolStudio.hardcoded40") },
                { icon: Video, label: t("akoolStudio.hardcoded41"), desc: t("akoolStudio.hardcoded42") },
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
              Coming Soon - Real-time Avatar Engine
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
  const { t } = useLanguage();
  const tools = [
    { label: "akoolStudio.main.tabs.imageToVideo", href: "/ai-studio/image-to-video", icon: Clapperboard, color: "from-violet-600 to-blue-600", desc: t("akoolStudio.hardcoded43"), badge: "hot" },
    { label: t("akoolStudio.hardcoded44"), href: "/ai-studio/face-swap", icon: User2, color: "from-pink-600 to-rose-600", desc: t("akoolStudio.hardcoded45"), badge: "hot" },
    { label: t("akoolStudio.hardcoded46"), href: "/ai-studio/talking-avatar", icon: Brain, color: "from-cyan-600 to-teal-600", desc: t("akoolStudio.hardcoded47"), badge: "" },
    { label: "akoolStudio.main.tabs.videoTranslation", href: "/ai-studio/video-translate", icon: Languages, color: "from-amber-600 to-orange-600", desc: t("akoolStudio.hardcoded48"), badge: "" },
    { label: "akoolStudio.tts.title", href: "/ai-studio/tts", icon: Volume2, color: "from-green-600 to-emerald-600", desc: t("akoolStudio.hardcoded49"), badge: "new" },
    { label: t("akoolStudio.hardcoded50"), href: "/ai-studio/voice-clone", icon: Mic, color: "from-indigo-600 to-violet-600", desc: t("akoolStudio.hardcoded51"), badge: "new" },
    { label: "akoolStudio.main.tabs.voiceChange", href: "/ai-studio/voice-change", icon: Headphones, color: "from-purple-600 to-pink-600", desc: t("akoolStudio.hardcoded52"), badge: "new" },
    { label: "akoolStudio.main.tabs.imageGen", href: "/ai-studio/image-gen", icon: ImageIcon, color: "from-rose-600 to-orange-600", desc: t("akoolStudio.hardcoded53"), badge: "new" },
    { label: "akoolStudio.bgRemove.title", href: "/ai-studio/bg-remove", icon: Eraser, color: "from-teal-600 to-cyan-600", desc: t("akoolStudio.hardcoded54"), badge: "new" },
    { label: t("akoolStudio.hardcoded55"), href: "/ai-studio/live-camera", icon: Camera, color: "from-sky-600 to-blue-600", desc: t("akoolStudio.hardcoded56"), badge: "" },
    { label: t("akoolStudio.hardcoded36"), href: "/ai-studio/streaming-avatar", icon: Radio, color: "from-fuchsia-600 to-violet-600", desc: t("akoolStudio.hardcoded57"), badge: "" },
    { label: t("akoolStudio.hardcoded58"), href: "/ai-studio/models", icon: Sparkles, color: "from-fuchsia-600 to-pink-600", desc: t("akoolStudio.hardcoded59"), badge: "" },
    { label: "akoolStudio.imageToVideo.effectPresetLabel", href: "/ai-studio/effects", icon: Zap, color: "from-yellow-600 to-amber-600", desc: t("akoolStudio.hardcoded60"), badge: "" },
  ];

  const badgeColors: Record<string, string> = {
    hot: "bg-red-500/80 text-white",
    new: "bg-green-500/80 text-white",
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          <span className="gradient-text">{t("akoolStudio.hardcoded61")}</span>
        </h2>
        <p className="text-muted-foreground">{t("akoolStudio.hardcoded62")}</p>
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
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.main.tabs.imageToVideo")} subtitle={t("akoolStudio.hardcoded63")}>
      <ImageToVideoTab />
    </StudioLayout>
  );
}

export function AkoolFaceSwap() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded44")} subtitle={t("akoolStudio.hardcoded64")}>
      <FaceSwapTab />
    </StudioLayout>
  );
}

export function AkoolTalkingAvatar() {
  const { t } = useLanguage();
  return (
    <StudioLayout title="Talking Avatar" subtitle={t("akoolStudio.hardcoded65")}>
      <TalkingAvatarTab />
    </StudioLayout>
  );
}

export function AkoolVideoTranslate() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.main.tabs.videoTranslation")} subtitle={t("akoolStudio.hardcoded66")}>
      <VideoTranslationTab />
    </StudioLayout>
  );
}

export function AkoolTTS() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.tts.title")} subtitle={t("akoolStudio.hardcoded67")}>
      <TTSTab />
    </StudioLayout>
  );
}

export function AkoolVoiceClone() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded50")} subtitle={t("akoolStudio.hardcoded68")}>
      <VoiceCloneTab />
    </StudioLayout>
  );
}

export function AkoolVoiceChange() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.main.tabs.voiceChange")} subtitle={t("akoolStudio.hardcoded69")}>
      <VoiceChangeTab />
    </StudioLayout>
  );
}

export function AkoolImageGen() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.main.tabs.imageGen")} subtitle={t("akoolStudio.hardcoded70")}>
      <ImageGenTab />
    </StudioLayout>
  );
}

export function AkoolBgRemove() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.bgRemove.title")} subtitle={t("akoolStudio.hardcoded71")}>
      <BgRemoveTab />
    </StudioLayout>
  );
}

export function AkoolLiveCamera() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded55")} subtitle={t("akoolStudio.hardcoded56")}>
      <LiveCameraTab />
    </StudioLayout>
  );
}

export function AkoolStreamingAvatar() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded36")} subtitle={t("akoolStudio.hardcoded57")}>
      <StreamingAvatarTab />
    </StudioLayout>
  );
}

export function AkoolModels() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded58")} subtitle={t("akoolStudio.hardcoded72")}>
      <ModelCarousel showComparison={true} />
    </StudioLayout>
  );
}

export function AkoolEffects() {
  const { t } = useLanguage();
  return (
    <StudioLayout title={t("akoolStudio.hardcoded73")} subtitle={t("akoolStudio.hardcoded74")}>
      <EffectsGallery />
    </StudioLayout>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEFAULT EXPORT - STUDIO OVERVIEW
   ══════════════════════════════════════════════════════════════ */
export default function AkoolStudio() {
  const { t } = useLanguage();
  return (
    <StudioLayout title="AI Studio" subtitle={t("akoolStudio.hardcoded75")}>
      <StudioOverview />
    </StudioLayout>
  );
}
