import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Video, Download, Trash2, Play, Loader2, Sparkles, Clock, ArrowLeft, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const VOICE_OPTIONS = [
  { id: "en-US-JennyNeural", label: "Jenny (English, Female)" },
  { id: "en-US-GuyNeural", label: "Guy (English, Male)" },
  { id: "ko-KR-SunHiNeural", label: "SunHi (Korean, Female)" },
  { id: "ko-KR-InJoonNeural", label: "InJoon (Korean, Male)" },
  { id: "ja-JP-NanamiNeural", label: "Nanami (Japanese, Female)" },
  { id: "zh-CN-XiaoxiaoNeural", label: "Xiaoxiao (Chinese, Female)" },
  { id: "es-ES-ElviraNeural", label: "Elvira (Spanish, Female)" },
  { id: "fr-FR-DeniseNeural", label: "Denise (French, Female)" },
];

export default function DidVideoGallery() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"gallery" | "pipeline">("gallery");
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const [pollingIds, setPollingIds] = useState<Set<number>>(new Set());

  const historyQuery = trpc.didHistory.list.useQuery(undefined, { enabled: !!user });
  const deleteMutation = trpc.didHistory.delete.useMutation({
    onSuccess: () => { historyQuery.refetch(); toast.success(t("didGallery.deleted")); },
    onError: (err) => toast.error(err.message),
  });

  // Poll for processing videos
  const pollStatusQuery = trpc.didHistory.pollStatus.useQuery(
    { id: Array.from(pollingIds)[0] || 0 },
    {
      enabled: pollingIds.size > 0,
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    }
  );

  useEffect(() => {
    if (pollStatusQuery.data && (pollStatusQuery.data.status === "done" || pollStatusQuery.data.status === "error")) {
      setPollingIds(prev => {
        const next = new Set(prev);
        next.delete(pollStatusQuery.data!.id);
        return next;
      });
      historyQuery.refetch();
      if (pollStatusQuery.data.status === "done") {
        toast.success(t("didGallery.videoReady"));
      }
    }
  }, [pollStatusQuery.data]);

  // Auto-start polling for processing videos
  useEffect(() => {
    if (historyQuery.data) {
      const processingIds = historyQuery.data
        .filter(v => v.status === "pending" || v.status === "processing")
        .map(v => v.id);
      if (processingIds.length > 0) {
        setPollingIds(new Set(processingIds));
      }
    }
  }, [historyQuery.data]);

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) { navigate("/login"); return null; }

  const videos = historyQuery.data || [];

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            {t("didGallery.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("didGallery.subtitle")}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="gallery" className="gap-1.5"><Video className="w-4 h-4" />{t("didGallery.tabGallery")}</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><Sparkles className="w-4 h-4" />{t("didGallery.tabPipeline")}</TabsTrigger>
        </TabsList>

        {/* Gallery Tab */}
        <TabsContent value="gallery">
          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : videos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t("didGallery.empty")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("didGallery.emptyHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-muted">
                    {video.status === "done" && video.videoUrl ? (
                      <div className="relative w-full h-full cursor-pointer group" onClick={() => setPreviewVideo(video)}>
                        <video src={video.videoUrl} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    ) : video.status === "processing" || video.status === "pending" ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">{t("didGallery.processing")}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-destructive">{t("didGallery.failed")}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.avatarName || t("didGallery.unnamed")}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{video.spokenText}</p>
                      </div>
                      <Badge variant={video.status === "done" ? "default" : video.status === "error" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                        {video.status === "done" ? t("didGallery.statusDone") : video.status === "error" ? t("didGallery.statusError") : t("didGallery.statusProcessing")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      {video.durationSec && <span>· {video.durationSec}s</span>}
                      <span>· {VOICE_OPTIONS.find(v => v.id === video.voiceId)?.label || video.voiceId}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {video.status === "done" && video.videoUrl && (
                        <>
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setPreviewVideo(video)}>
                            <Play className="w-3 h-3 mr-1" />{t("didGallery.play")}
                          </Button>
                          <a href={video.videoUrl} download target="_blank" rel="noreferrer" className="flex-1">
                            <Button variant="outline" size="sm" className="w-full text-xs h-7">
                              <Download className="w-3 h-3 mr-1" />{t("didGallery.download")}
                            </Button>
                          </a>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => {
                        if (confirm(t("didGallery.confirmDelete"))) deleteMutation.mutate({ id: video.id });
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline">
          <DidPipelineTab />
        </TabsContent>
      </Tabs>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {previewVideo?.avatarName || t("didGallery.videoPreview")}
            </DialogTitle>
          </DialogHeader>
          {previewVideo?.videoUrl && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border shadow-lg">
                <video src={previewVideo.videoUrl} controls autoPlay className="w-full" />
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">{previewVideo.spokenText}</p>
              </div>
              <div className="flex gap-2">
                <a href={previewVideo.videoUrl} download target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" />{t("didGallery.download")}
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== DID Pipeline Sub-component ==========
function DidPipelineTab() {
  const { t } = useLanguage();
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [voiceId, setVoiceId] = useState("ko-KR-SunHiNeural");
  const [generating, setGenerating] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // Fetch user's scripts
  const scriptsQuery = trpc.script.list.useQuery();
  // Fetch user's avatars for selection
  const avatarsQuery = trpc.userAvatar.list.useQuery();
  // Fetch pipeline results for selected script
  const pipelineVideosQuery = trpc.didPipeline.getByScript.useQuery(
    { scriptId: selectedScriptId! },
    { enabled: !!selectedScriptId }
  );
  const generateAllMutation = trpc.didPipeline.generateAll.useMutation({
    onSuccess: (data) => {
      setPipelineResult(data);
      setGenerating(false);
      toast.success(t("didGallery.pipelineStarted", { count: String(data.results.length) }));
      pipelineVideosQuery.refetch();
    },
    onError: (err) => {
      setGenerating(false);
      toast.error(err.message);
    },
  });

  // Poll processing pipeline videos
  const processingVideos = pipelineVideosQuery.data?.filter(v => v.status === "pending" || v.status === "processing") || [];
  useEffect(() => {
    if (processingVideos.length > 0) {
      const interval = setInterval(() => { pipelineVideosQuery.refetch(); }, 4000);
      return () => clearInterval(interval);
    }
  }, [processingVideos.length]);

  const scripts = scriptsQuery.data || [];
  const avatars = avatarsQuery.data || [];
  const pipelineVideos = pipelineVideosQuery.data || [];

  const handleGenerate = () => {
    if (!selectedScriptId || !avatarImageUrl) return;
    setGenerating(true);
    generateAllMutation.mutate({
      scriptId: selectedScriptId,
      avatarImageUrl,
      avatarName: avatarName || undefined,
      voiceId,
    });
  };

  const completedCount = pipelineVideos.filter(v => v.status === "done").length;
  const totalCount = pipelineVideos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {t("didGallery.pipelineTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("didGallery.pipelineDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Script Selection */}
          <div className="space-y-2">
            <Label>{t("didGallery.selectScript")}</Label>
            <Select value={selectedScriptId?.toString() || ""} onValueChange={(v) => setSelectedScriptId(Number(v))}>
              <SelectTrigger><SelectValue placeholder={t("didGallery.selectScriptPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {scripts.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.title} ({s.sectionCount || 0} {t("didGallery.sections")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label>{t("didGallery.selectAvatar")}</Label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {avatars.map((av) => (
                <button
                  key={av.id}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${avatarImageUrl === av.imageUrl ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/30"}`}
                  onClick={() => { setAvatarImageUrl(av.imageUrl); setAvatarName(av.name); }}
                >
                  <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-0.5">
                    <p className="text-[9px] text-white truncate text-center">{av.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label>{t("didGallery.selectVoice")}</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full gap-2"
            disabled={!selectedScriptId || !avatarImageUrl || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t("didGallery.pipelineGenerating")}</>
            ) : (
              <><Sparkles className="w-4 h-4" />{t("didGallery.pipelineStart")}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline Progress & Results */}
      {selectedScriptId && pipelineVideos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("didGallery.pipelineResults")}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={completedCount === totalCount ? "default" : "secondary"}>
                  {completedCount}/{totalCount} {t("didGallery.completed")}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => pipelineVideosQuery.refetch()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineVideos.map((video, idx) => (
                <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {(video.sectionIndex ?? idx) + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{video.spokenText.substring(0, 80)}...</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={video.status === "done" ? "default" : video.status === "error" ? "destructive" : "secondary"} className="text-[10px]">
                        {video.status === "done" ? t("didGallery.statusDone") : video.status === "error" ? t("didGallery.statusError") : t("didGallery.statusProcessing")}
                      </Badge>
                      {video.durationSec && <span className="text-xs text-muted-foreground">{video.durationSec}s</span>}
                    </div>
                  </div>
                  {video.status === "done" && video.videoUrl && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(video.videoUrl!, "_blank")}>
                        <Play className="w-4 h-4" />
                      </Button>
                      <a href={video.videoUrl} download target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="w-4 h-4" /></Button>
                      </a>
                    </div>
                  )}
                  {(video.status === "pending" || video.status === "processing") && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
