import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Users, ChevronLeft, ChevronRight, Upload, Wand2, Loader2, Check, Circle, Volume2, Play, Pause, Video, Download, X, History, Sparkles, Link2, Save, Globe, Headphones, Share2, ExternalLink, MessageCircle } from "lucide-react";
import { useVideoProgress } from "@/hooks/useVideoProgress";

export default function Step5Preview({ projectId, project, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh










}: {projectId: number;project: any;slides: any[];scripts: any[];avatars: any[];annotations: any[];avatarOverrides: any[];insertContent: any[];transitions: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [prevSlideIdx, setPrevSlideIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<number>>(() => new Set(slides.map((s: any) => s.id)));
  const [bgmUrl, setBgmUrl] = useState("");
  const [bgmVolume, setBgmVolume] = useState(30);
  const [bgmUploading, setBgmUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(project?.finalVideoUrl || "");
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [exportResolution, setExportResolution] = useState<"720p" | "1080p" | "1440p">("1080p");
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState("");

  // AI Layout Recommendation
  const layoutsQuery = trpc.slideLayout.list.useQuery({ projectId });
  const recommendLayoutMut = trpc.slideLayout.recommend.useMutation({
    onSuccess: (data) => {
      layoutsQuery.refetch();
      toast.success(t("lectureBuilder.hardcoded.layoutsRecommended", { count: String(data.count) }));
    },
    onError: (err) => toast.error(err.message || t("lectureBuilder.stringLiteral297"))
  });
  const applyLayoutMut = trpc.slideLayout.applyLayout.useMutation({
    onSuccess: () => {layoutsQuery.refetch();toast.success(t("lectureBuilder.stringLiteral298"));}
  });
  const clearLayoutsMut = trpc.slideLayout.clear.useMutation({
    onSuccess: () => {layoutsQuery.refetch();toast.info(t("lectureBuilder.stringLiteral299"));}
  });

  // Watermark Settings
  const watermarkQuery = trpc.watermark.get.useQuery({ projectId });
  const saveWatermarkMut = trpc.watermark.upsert.useMutation({
    onSuccess: () => {watermarkQuery.refetch();toast.success(t("lectureBuilder.stringLiteral300"));},
    onError: (err) => toast.error(err.message || t("lectureBuilder.stringLiteral301"))
  });
  const uploadLogoMut = trpc.watermark.uploadLogo.useMutation();

  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmType, setWmType] = useState<"text" | "logo" | "both">("text");
  const [wmText, setWmText] = useState("");
  const [wmLogoUrl, setWmLogoUrl] = useState("");
  const [wmLogoFileKey, setWmLogoFileKey] = useState("");
  const [wmPosition, setWmPosition] = useState<"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right">("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(70);
  const [wmFontSize, setWmFontSize] = useState(24);
  const [wmFontColor, setWmFontColor] = useState("#FFFFFF");
  const [wmSizePercent, setWmSizePercent] = useState(15);

  // Load existing watermark
  useEffect(() => {
    if (watermarkQuery.data) {
      const wm = watermarkQuery.data;
      setWmEnabled(wm.isEnabled ?? false);
      setWmType(wm.watermarkType as any || "text");
      setWmText(wm.textContent || "");
      setWmLogoUrl(wm.logoUrl || "");
      setWmLogoFileKey(wm.logoFileKey || "");
      setWmPosition(wm.position as any || "bottom-right");
      setWmOpacity(wm.opacity ?? 70);
      setWmFontSize(wm.fontSize ?? 24);
      setWmFontColor(wm.fontColor || "#FFFFFF");
      setWmSizePercent(wm.sizePercent ?? 15);
    }
  }, [watermarkQuery.data]);

  const handleSaveWatermark = () => {
    saveWatermarkMut.mutate({
      projectId,
      watermarkType: wmType,
      logoUrl: wmLogoUrl || undefined,
      logoFileKey: wmLogoFileKey || undefined,
      textContent: wmText || undefined,
      fontSize: wmFontSize,
      fontColor: wmFontColor,
      position: wmPosition,
      opacity: wmOpacity,
      sizePercent: wmSizePercent,
      isEnabled: wmEnabled
    });
  };

  const updateProject = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral302"));onRefresh();}
  });
  const uploadBgmMut = trpc.lectureBuilder.uploadBgm.useMutation();
  const generateVideoMut = trpc.lectureBuilder.generateVideo.useMutation();
  const exportVideoMut = trpc.lectureBuilder.exportVideo.useMutation();
  // WebSocket real-time progress (primary)
  const wsProgress = useVideoProgress(projectId, generating);

  // Polling fallback (slower interval, only if WebSocket misses)
  const progressQuery = trpc.lectureBuilder.getVideoProgress.useQuery(
    { projectId },
    { enabled: generating, refetchInterval: generating ? 5000 : false }
  );

  // Handle WebSocket progress updates (real-time)
  useEffect(() => {
    if (!generating || !wsProgress) return;
    setGenProgress(wsProgress.progress);
    setGenStep(wsProgress.step);
    if (wsProgress.status === "completed" && wsProgress.videoUrl) {
      setGenerating(false);
      setGeneratedVideoUrl(wsProgress.videoUrl);
      setGenProgress(100);
      setGenStep(t("lectureBuilder.stringLiteral303"));
      toast.success(t("lectureBuilder.stringLiteral304"));
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("🎬 영상 생성 완료", { body: "AI 강의 영상이 성공적으로 생성되었습니다." });
      }
      onRefresh();
      setTimeout(() => {
        document.getElementById('generated-video-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else if (wsProgress.status === "failed") {
      setGenerating(false);
      setGenProgress(0);
      setGenStep("");
      toast.error(wsProgress.errorMessage || t("lectureBuilder.stringLiteral305"));
    }
  }, [generating, wsProgress]);

  // Polling fallback - only acts if WebSocket hasn't delivered updates
  useEffect(() => {
    if (!generating || !progressQuery.data) return;
    // Only use polling data if WebSocket hasn't provided recent data
    if (wsProgress && wsProgress.progress > 0) return;
    const d = progressQuery.data;
    setGenProgress(d.progress);
    setGenStep(d.step);
    if (d.status === "completed" && d.videoUrl) {
      setGenerating(false);
      setGeneratedVideoUrl(d.videoUrl);
      setGenProgress(100);
      setGenStep(t("lectureBuilder.stringLiteral303"));
      toast.success(t("lectureBuilder.stringLiteral304"));
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("🎬 영상 생성 완료", { body: "AI 강의 영상이 성공적으로 생성되었습니다." });
      }
      onRefresh();
      setTimeout(() => {
        document.getElementById('generated-video-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else if (d.status === "failed") {
      setGenerating(false);
      setGenProgress(0);
      setGenStep("");
      toast.error(d.errorMessage || t("lectureBuilder.stringLiteral305"));
    }
  }, [generating, progressQuery.data, wsProgress]);

  const assignedSlides = slides.filter((s: any) => scripts.some((sc: any) => sc.slideId === s.id));
  const totalDuration = scripts.reduce((acc: number, s: any) => acc + (s.estimatedDurationSec || 30), 0);

  // Filter slides for preview based on selection
  const previewSlides = useMemo(() => {
    return slides.filter((s: any) => selectedSlideIds.has(s.id));
  }, [slides, selectedSlideIds]);

  // Get transition for current slide
  const getTransition = (slideId: number) => {
    return transitions.find((t: any) => t.slideId === slideId) || { type: 'none', durationMs: 500, easing: 'ease' };
  };

  // Handle slide change with transition
  const changeSlide = useCallback((newIdx: number) => {
    if (newIdx === previewSlideIdx || isTransitioning) return;
    const targetSlide = previewSlides[newIdx];
    if (!targetSlide) return;
    const trans = getTransition(targetSlide.id);
    if (trans.type !== 'none') {
      setPrevSlideIdx(previewSlideIdx);
      setIsTransitioning(true);
      setPreviewSlideIdx(newIdx);
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevSlideIdx(null);
      }, trans.durationMs || 500);
    } else {
      setPreviewSlideIdx(newIdx);
    }
  }, [previewSlideIdx, previewSlides, transitions, isTransitioning]);

  // Auto-play preview with transition
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (previewSlideIdx >= previewSlides.length - 1) {setIsPlaying(false);return;}
      changeSlide(previewSlideIdx + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, previewSlideIdx, previewSlides.length, changeSlide]);

  // Update selection when slides change
  useEffect(() => {
    setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  }, [slides]);

  const currentSlide = previewSlides[previewSlideIdx];
  const currentSlideScript = currentSlide ? scripts.find((s: any) => s.slideId === currentSlide.id) : null;
  const currentAvatar = currentSlideScript?.avatarId ? avatars.find((a: any) => a.id === currentSlideScript.avatarId) : avatars[0];

  // === Interpreter Audio Playback ===
  const [interpreterMode, setInterpreterMode] = useState(false);
  const [interpreterPlaying, setInterpreterPlaying] = useState(false);
  const [interpreterPhase, setInterpreterPhase] = useState<"original" | "interpreter">("original");
  const [interpreterAudioUrls, setInterpreterAudioUrls] = useState<Record<number, string>>({});
  const interpreterAudioRef = useRef<HTMLAudioElement | null>(null);
  const interpreterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateInterpreterTtsMut = trpc.lectureBuilder.generateInterpreterTts.useMutation({
    onSuccess: (data) => {
      setInterpreterAudioUrls((prev) => ({ ...prev, [data.scriptId]: data.audioUrl }));
    },
    onError: (e: any) => toast.error(e.message)
  });
  const generateAllInterpreterTtsMut = trpc.lectureBuilder.generateAllInterpreterTts.useMutation({
    onSuccess: (data) => {
      data.results.forEach((r: any) => {
        setInterpreterAudioUrls((prev) => ({ ...prev, [r.scriptId]: r.audioUrl }));
      });
      toast.success(t("lectureBuilder.hardcoded.interpreterTtsGenerated", { generated: String(data.generated), total: String(data.total) }));
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Interpreter sequential playback: original script (timer) -> interpreter audio -> next slide
  useEffect(() => {
    if (!interpreterMode || !interpreterPlaying) return;
    const script = currentSlideScript;
    if (!script) {setInterpreterPlaying(false);return;}

    if (interpreterPhase === "original") {
      // Show original script for estimated duration, then switch to interpreter
      const dur = (script.estimatedDurationSec || 5) * 1000;
      interpreterTimerRef.current = setTimeout(() => {
        const audioUrl = interpreterAudioUrls[script.id];
        if (audioUrl && script.interpreterText) {
          setInterpreterPhase("interpreter");
        } else {
          // No interpreter audio, advance to next slide
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        }
      }, dur);
    } else {
      // Play interpreter audio
      const audioUrl = interpreterAudioUrls[currentSlideScript?.id || 0];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        interpreterAudioRef.current = audio;
        audio.onended = () => {
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        };
        audio.onerror = () => {
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        };
        audio.play().catch(() => {});
      }
    }

    return () => {
      if (interpreterTimerRef.current) clearTimeout(interpreterTimerRef.current);
      if (interpreterAudioRef.current) {
        interpreterAudioRef.current.pause();
        interpreterAudioRef.current = null;
      }
    };
  }, [interpreterMode, interpreterPlaying, interpreterPhase, previewSlideIdx, currentSlideScript, interpreterAudioUrls]);

  const toggleSlideSelection = (slideId: number) => {
    setSelectedSlideIds((prev) => {
      const next = new Set(prev);
      if (next.has(slideId)) next.delete(slideId);else
      next.add(slideId);
      return next;
    });
  };

  const selectAll = () => setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  const deselectAll = () => setSelectedSlideIds(new Set());

  // BGM upload
  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("lectureBuilder.stringLiteral306"));
      return;
    }
    setBgmUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadBgmMut.mutateAsync({
        projectId,
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "audio/mpeg"
      });
      setBgmUrl(result.url);
      toast.success(t("lectureBuilder.stringLiteral307"));
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral308"));
    } finally {
      setBgmUploading(false);
      if (bgmInputRef.current) bgmInputRef.current.value = "";
    }
  };

  // Generate video (fire-and-forget, progress via polling)
  const handleGenerateVideo = async () => {
    if (selectedSlideIds.size === 0) {
      toast.error(t("lectureBuilder.stringLiteral309"));
      return;
    }
    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setGenerating(true);
    setGenProgress(0);
    setGenStep(t("lectureBuilder.stringLiteral310"));
    try {
      const result = await generateVideoMut.mutateAsync({
        projectId,
        avatarPosition: project?.avatarPosition,
        avatarSize: project?.avatarSize === "small" ? 15 : project?.avatarSize === "large" ? 35 : 25,
        avatarShape: project?.avatarShape,
        avatarOpacity: project?.avatarOpacity,
        bgmUrl: bgmUrl || undefined,
        bgmVolume,
        noiseReduction: false,
        resolution: "1080p",
        selectedSlideIds: Array.from(selectedSlideIds)
      });
      setGeneratedVideoUrl(result.videoUrl);
      setGenProgress(100);
      setGenStep(t("lectureBuilder.stringLiteral311"));
      toast.success(t("lectureBuilder.stringLiteral312"));
      // Browser notification when tab is not focused
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("🎬 영상 생성 완료", { body: "AI 강의 영상이 성공적으로 생성되었습니다." });
      }
      onRefresh();
      // Auto-scroll to generated video result
      setTimeout(() => {
        document.getElementById('generated-video-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral313"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText314")}</h2>

      <div className="grid grid-cols-12 gap-6 overflow-hidden">
        {/* Preview Area */}
        <div className="col-span-8 min-w-0">
          <Card>
            <CardContent className="pt-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                {/* Previous slide (for transition) */}
                {isTransitioning && prevSlideIdx !== null && previewSlides[prevSlideIdx] &&
                <img src={previewSlides[prevSlideIdx].imageUrl} alt={t("lectureBuilder.stringLiteral315")} className="absolute inset-0 w-full h-full object-contain z-0" />
                }
                {currentSlide ?
                <>
                    <img
                    src={currentSlide.imageUrl}
                    alt={t("lectureBuilder.stringLiteral316")}
                    className="w-full h-full object-contain"
                    style={isTransitioning ? (() => {
                      const trans = getTransition(currentSlide.id);
                      const dur = `${trans.durationMs || 500}ms`;
                      const ease = trans.easing || 'ease';
                      const base: React.CSSProperties = { position: 'relative', zIndex: 1, transition: `all ${dur} ${ease}` };
                      switch (trans.type) {
                        case 'fade':return { ...base, animation: `fadeIn ${dur} ${ease} forwards` };
                        case 'slide-left':return { ...base, animation: `slideFromRight ${dur} ${ease} forwards` };
                        case 'slide-right':return { ...base, animation: `slideFromLeft ${dur} ${ease} forwards` };
                        case 'slide-up':return { ...base, animation: `slideFromBottom ${dur} ${ease} forwards` };
                        case 'slide-down':return { ...base, animation: `slideFromTop ${dur} ${ease} forwards` };
                        case 'zoom-in':return { ...base, animation: `zoomIn ${dur} ${ease} forwards` };
                        case 'zoom-out':return { ...base, animation: `zoomOut ${dur} ${ease} forwards` };
                        case 'wipe':return { ...base, animation: `wipeRight ${dur} ${ease} forwards` };
                        case 'dissolve':return { ...base, animation: `dissolve ${dur} ${ease} forwards` };
                        default:return base;
                      }
                    })() : undefined} />
                  
                    {/* Avatar PIP overlay */}
                    {project?.avatarPosition !== "none" && currentAvatar &&
                  <div className={`absolute ${
                  project?.avatarPosition === "bottom-right" ? "bottom-4 right-4" :
                  project?.avatarPosition === "bottom-left" ? "bottom-4 left-4" :
                  project?.avatarPosition === "top-right" ? "top-4 right-4" :
                  "top-4 left-4"}`
                  }>
                        <div className={`${
                    project?.avatarSize === "small" ? "w-20 h-20" :
                    project?.avatarSize === "medium" ? "w-28 h-28" :
                    "w-36 h-36"} ${

                    project?.avatarShape === "circle" ? "rounded-full" :
                    project?.avatarShape === "rounded" ? "rounded-xl" :
                    "rounded-none"} overflow-hidden border-2 border-white/30 shadow-lg`
                    }
                    style={{ opacity: (project?.avatarOpacity || 100) / 100 }}>
                      
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Users className="w-8 h-8 text-white/70" />
                          </div>
                        </div>
                      </div>
                  }
                    {/* Script overlay */}
                    {currentSlideScript &&
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
                        {interpreterMode && interpreterPhase === "interpreter" && currentSlideScript.interpreterText ?
                    <>
                            <p className="text-yellow-300 text-xs mb-1 flex items-center gap-1">
                              <Globe className="w-3 h-3" />{t("lectureBuilder.jsxText317")}
                      </p>
                            <p className="text-white text-sm line-clamp-2">{currentSlideScript.interpreterText}</p>
                          </> :

                    <p className="text-white text-sm line-clamp-2">{currentSlideScript.scriptText}</p>
                    }
                      </div>
                  }
                  </> :

                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {selectedSlideIds.size === 0 ? t("lectureBuilder.stringLiteral318") : t("lectureBuilder.stringLiteral319")}
                  </div>
                }
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3 mt-4">
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.max(0, previewSlideIdx - 1))} disabled={isTransitioning}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={isTransitioning}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.min(previewSlides.length - 1, previewSlideIdx + 1))} disabled={isTransitioning}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: previewSlides.length > 0 ? `${(previewSlideIdx + 1) / previewSlides.length * 100}%` : "0%" }} />
                </div>
                <span className="text-sm text-muted-foreground">{previewSlides.length > 0 ? previewSlideIdx + 1 : 0}/{previewSlides.length}</span>
                {/* Interpreter mode toggle */}
                <Button
                  variant={interpreterMode ? "default" : "outline"}
                  size="icon"
                  className="ml-2"
                  onClick={() => {
                    setInterpreterMode(!interpreterMode);
                    if (interpreterPlaying) {
                      setInterpreterPlaying(false);
                      setInterpreterPhase("original");
                    }
                  }}
                  title={t("lectureBuilder.stringLiteral320")}>
                  
                  <Globe className="w-4 h-4" />
                </Button>
              </div>
              {/* Interpreter playback controls */}
              {interpreterMode &&
              <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Globe className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 shrink-0">{t("lectureBuilder.jsxText321")}</span>
                  <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    if (interpreterPlaying) {
                      setInterpreterPlaying(false);
                      setInterpreterPhase("original");
                      if (interpreterAudioRef.current) {interpreterAudioRef.current.pause();interpreterAudioRef.current = null;}
                    } else {
                      setInterpreterPlaying(true);
                      setInterpreterPhase("original");
                      setIsPlaying(false);
                    }
                  }}>
                  
                    {interpreterPlaying ? <><Pause className="w-3 h-3" />{t("lectureBuilder.jsxText322")}</> : <><Play className="w-3 h-3" />{t("lectureBuilder.jsxText323")}</>}
                  </Button>
                  {interpreterPlaying &&
                <Badge variant="outline" className="text-xs">
                      {interpreterPhase === "original" ? t("lectureBuilder.stringLiteral324") : t("lectureBuilder.stringLiteral325")}
                    </Badge>
                }
                  <div className="flex-1" />
                  <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={generateAllInterpreterTtsMut.isPending}
                  onClick={() => generateAllInterpreterTtsMut.mutate({ projectId })}>
                  
                    {generateAllInterpreterTtsMut.isPending ?
                  <><Loader2 className="w-3 h-3 animate-spin" />{t("lectureBuilder.jsxText326")}</> :

                  <><Headphones className="w-3 h-3" />{t("lectureBuilder.jsxText327")}</>
                  }
                  </Button>
                </div>
              }
            </CardContent>
          </Card>

          {/* AI Slide Layout Recommendation */}
          <Card className="mt-4 border-purple-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />{t("lectureBuilder.jsxText328")}
                </CardTitle>
                <Button variant="outline" size="sm" className="text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => recommendLayoutMut.mutate({ projectId })}
                disabled={recommendLayoutMut.isPending || slides.length === 0}>
                  {recommendLayoutMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}{t("lectureBuilder.jsxText329")}

                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layoutsQuery.data && layoutsQuery.data.length > 0 ?
              <div className="space-y-1.5">
                  {layoutsQuery.data.map((layout: any) => {
                  const slideIdx = slides.findIndex((s: any) => s.id === layout.slideId);
                  return (
                    <div key={layout.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">{t("lectureBuilder.jsxText330")}{slideIdx + 1}</Badge>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">{layout.layoutType}</Badge>
                        <span className="text-muted-foreground truncate flex-1">{layout.aiReasoning}</span>
                        {!layout.isApplied &&
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600"
                      onClick={() => applyLayoutMut.mutate({ layoutId: layout.id })}>{t("lectureBuilder.jsxText331")}

                      </Button>
                      }
                        {layout.isApplied && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                      </div>);

                })}
                  <Button variant="ghost" size="sm" className="text-xs text-red-400 w-full"
                onClick={() => clearLayoutsMut.mutate({ projectId })}>{t("lectureBuilder.jsxText332")}

                </Button>
                </div> :

              <p className="text-xs text-muted-foreground text-center py-2">{t("lectureBuilder.jsxText333")}

              </p>
              }
            </CardContent>
          </Card>

          {/* Slide Selection for Preview */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText334")}{selectedSlideIds.size}/{slides.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={selectAll}>{t("lectureBuilder.jsxText335")}</Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={deselectAll}>{t("lectureBuilder.jsxText336")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {slides.map((slide: any, idx: number) => {
                  const isSelected = selectedSlideIds.has(slide.id);
                  return (
                    <button key={slide.id}
                    className={`relative w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    isSelected ? "border-primary ring-1 ring-primary/30" : "border-muted opacity-50"}`
                    }
                    onClick={() => toggleSlideSelection(slide.id)}>
                      
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                      <div className="absolute top-0 left-0 text-[8px] bg-black/60 text-white px-0.5 rounded-br">{idx + 1}</div>
                      {isSelected && <Check className="absolute bottom-0 right-0 w-3 h-3 text-green-400" />}
                    </button>);

                })}
              </div>
            </CardContent>
          </Card>

          {/* Generated Video & Export */}
          {generatedVideoUrl &&
          <Card id="generated-video-result" className="mt-4 border-green-500/30 ring-2 ring-green-500/50 animate-pulse-once">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />{t("lectureBuilder.jsxText337")}
                </CardTitle>
                  <Badge variant="outline" className="text-green-500 border-green-500/30">{t("lectureBuilder.jsxText338")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <video src={generatedVideoUrl} controls className="w-full rounded-lg" />
                {/* Download & Share Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm" className="gap-1 w-full">
                      <Download className="w-3 h-3" />{t("lectureBuilder.jsxText339")}
                    </Button>
                  </a>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    navigator.clipboard.writeText(generatedVideoUrl);
                    toast.success(t("lectureBuilder.stringLiteral340"));
                  }}>
                    <Link2 className="w-3 h-3" />{t("lectureBuilder.jsxText341")}
                  </Button>
                </div>
                {/* SNS Share Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: project?.title || t("lectureBuilder.shareVideoTitle"),
                        text: t("lectureBuilder.shareVideoText"),
                        url: generatedVideoUrl
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(generatedVideoUrl);
                      toast.success(t("lectureBuilder.stringLiteral340"));
                    }
                  }}>
                    <Share2 className="w-3 h-3" />{t("lectureBuilder.shareBtn")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => {
                    const text = encodeURIComponent(project?.title || t("lectureBuilder.shareVideoTitle"));
                    const url = encodeURIComponent(generatedVideoUrl);
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                  }}>
                    <ExternalLink className="w-3 h-3" />X
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => {
                    const text = encodeURIComponent(`${project?.title || t("lectureBuilder.shareVideoTitle")}\n${generatedVideoUrl}`);
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(generatedVideoUrl)}&text=${text}`, "_blank");
                  }}>
                    <MessageCircle className="w-3 h-3" />{t("lectureBuilder.shareTelegram")}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => {
                    const url = encodeURIComponent(generatedVideoUrl);
                    window.open(`https://wa.me/?text=${encodeURIComponent((project?.title || '') + '\n' + generatedVideoUrl)}`, "_blank");
                  }}>
                    <MessageCircle className="w-3 h-3" />{t("lectureBuilder.shareWhatsApp")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        </div>

        {/* Settings Panel */}
        <div className="col-span-4 space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText342")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText343")}</span><span>{avatars.length}{t("lectureBuilder.jsxText344")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText345")}</span><span>{slides.length}{t("lectureBuilder.jsxText346")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText347")}</span><span>{assignedSlides.length}/{slides.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText348")}</span><span>~{Math.ceil(totalDuration / 60)}{t("lectureBuilder.jsxText349")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText350")}</span><span>{selectedSlideIds.size}{t("lectureBuilder.jsxText351")}</span></div>
              {project.status && project.status !== "draft" &&
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText352")}</span>
                  <Badge variant={project.status === "completed" ? "default" : project.status === "generating" ? "secondary" : "destructive"}>
                    {project.status === "completed" ? t("lectureBuilder.stringLiteral353") : project.status === "generating" ? t("lectureBuilder.stringLiteral354") : project.status === "error" ? t("lectureBuilder.stringLiteral355") : project.status}
                  </Badge>
                </div>
              }
            </CardContent>
          </Card>

          {/* Avatar Position */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText356")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={project.avatarPosition} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarPosition: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">{t("lectureBuilder.jsxText357")}</SelectItem>
                  <SelectItem value="bottom-left">{t("lectureBuilder.jsxText358")}</SelectItem>
                  <SelectItem value="top-right">{t("lectureBuilder.jsxText359")}</SelectItem>
                  <SelectItem value="top-left">{t("lectureBuilder.jsxText360")}</SelectItem>
                  <SelectItem value="none">{t("lectureBuilder.jsxText361")}</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText362")}</Label>
                <Select value={project.avatarSize} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarSize: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t("lectureBuilder.jsxText363")}</SelectItem>
                    <SelectItem value="medium">{t("lectureBuilder.jsxText364")}</SelectItem>
                    <SelectItem value="large">{t("lectureBuilder.jsxText365")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText366")}</Label>
                <Select value={project.avatarShape} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarShape: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">{t("lectureBuilder.jsxText367")}</SelectItem>
                    <SelectItem value="rounded">{t("lectureBuilder.jsxText368")}</SelectItem>
                    <SelectItem value="rectangle">{t("lectureBuilder.jsxText369")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText370")}{project.avatarOpacity}%</Label>
                <Slider value={[project.avatarOpacity]} min={20} max={100} step={5}
                onValueChange={(v) => updateProject.mutate({ id: projectId, avatarOpacity: v[0] })} />
              </div>
            </CardContent>
          </Card>

          {/* BGM Upload */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText371")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input ref={bgmInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a" className="hidden" onChange={handleBgmUpload} />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => bgmInputRef.current?.click()} disabled={bgmUploading}>
                {bgmUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                {bgmUrl ? t("lectureBuilder.stringLiteral372") : t("lectureBuilder.stringLiteral373")}
              </Button>
              {bgmUrl &&
              <>
                  <audio src={bgmUrl} controls className="w-full h-8" />
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText374")}{bgmVolume}%</Label>
                    <Slider value={[bgmVolume]} min={0} max={100} step={5} onValueChange={(v) => setBgmVolume(v[0])} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-red-400" onClick={() => setBgmUrl("")}>
                    <X className="w-3 h-3 mr-1" />{t("lectureBuilder.jsxText375")}
                </Button>
                </>
              }
            </CardContent>
          </Card>

          {/* MP4 Export Settings */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText376")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText377")}</Label>
                <Select value={exportResolution} onValueChange={(v) => setExportResolution(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subtitles" checked={includeSubtitles} onChange={(e) => setIncludeSubtitles(e.target.checked)} className="rounded" />
                <Label htmlFor="subtitles" className="text-xs cursor-pointer">{t("lectureBuilder.jsxText378")}</Label>
              </div>
              <Button
                className="w-full gap-2"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (slides.length === 0) {toast.error(t("lectureBuilder.stringLiteral379"));return;}
                  setExporting(true);
                  setExportProgress(0);
                  setExportStep(t("lectureBuilder.stringLiteral380"));
                  try {
                    const result = await exportVideoMut.mutateAsync({
                      projectId,
                      resolution: exportResolution,
                      includeSubtitles
                    });
                    setGeneratedVideoUrl(result.videoUrl);
                    setExportProgress(100);
                    setExportStep(t("lectureBuilder.stringLiteral381"));
                    toast.success(t("lectureBuilder.hardcoded.mp4ExportComplete", { size: (result.fileSize / 1024 / 1024).toFixed(1) }));
                    onRefresh();
                  } catch (err: any) {
                    toast.error(err.message || t("lectureBuilder.stringLiteral382"));
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting || slides.length === 0}>
                
                {exporting ?
                <><Loader2 className="w-4 h-4 animate-spin" />{t("lectureBuilder.jsxText383")}</> :

                <><Download className="w-4 h-4" />{t("lectureBuilder.jsxText384")}</>
                }
              </Button>
              {exporting &&
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{exportStep}</span>
                    <span className="font-mono text-primary">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${exportProgress}%` }} />
                  </div>
                </div>
              }
            </CardContent>
          </Card>

          {/* Watermark Settings */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText385")}</CardTitle>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="wm-enabled" checked={wmEnabled}
                  onChange={(e) => setWmEnabled(e.target.checked)} className="rounded" />
                  <Label htmlFor="wm-enabled" className="text-xs cursor-pointer">{t("lectureBuilder.jsxText386")}</Label>
                </div>
              </div>
            </CardHeader>
            {wmEnabled &&
            <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t("lectureBuilder.jsxText387")}</Label>
                  <Select value={wmType} onValueChange={(v) => setWmType(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t("lectureBuilder.jsxText388")}</SelectItem>
                      <SelectItem value="logo">{t("lectureBuilder.jsxText389")}</SelectItem>
                      <SelectItem value="both">{t("lectureBuilder.jsxText390")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(wmType === "text" || wmType === "both") &&
              <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText391")}</Label>
                    <Input value={wmText} onChange={(e) => setWmText(e.target.value)}
                placeholder={t("lectureBuilder.stringLiteral392")} className="h-8 text-xs" />
                  </div>
              }
                {(wmType === "logo" || wmType === "both") &&
              <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText393")}</Label>
                    <div className="flex gap-2">
                      <Input type="file" accept="image/*" className="h-8 text-xs flex-1"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = (reader.result as string).split(",")[1];
                      try {
                        const result = await uploadLogoMut.mutateAsync({
                          projectId,
                          fileName: file.name,
                          fileBase64: base64,
                          mimeType: file.type
                        });
                        setWmLogoUrl(result.url);
                        setWmLogoFileKey(result.fileKey);
                        toast.success(t("lectureBuilder.stringLiteral394"));
                      } catch (err: any) {
                        toast.error(err.message || t("lectureBuilder.stringLiteral395"));
                      }
                    };
                    reader.readAsDataURL(file);
                  }} />
                  
                      {wmLogoUrl && <img src={wmLogoUrl} alt="logo" className="w-8 h-8 rounded border object-contain" />}
                    </div>
                  </div>
              }
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText396")}</Label>
                    <Select value={wmPosition} onValueChange={(v) => setWmPosition(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">{t("lectureBuilder.jsxText397")}</SelectItem>
                        <SelectItem value="top-center">{t("lectureBuilder.jsxText398")}</SelectItem>
                        <SelectItem value="top-right">{t("lectureBuilder.jsxText399")}</SelectItem>
                        <SelectItem value="bottom-left">{t("lectureBuilder.jsxText400")}</SelectItem>
                        <SelectItem value="bottom-center">{t("lectureBuilder.jsxText401")}</SelectItem>
                        <SelectItem value="bottom-right">{t("lectureBuilder.jsxText402")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText403")}{wmOpacity}%</Label>
                    <Slider value={[wmOpacity]} min={10} max={100} step={5}
                  onValueChange={(v) => setWmOpacity(v[0])} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText404")}{wmFontSize}px</Label>
                    <Slider value={[wmFontSize]} min={12} max={48} step={2}
                  onValueChange={(v) => setWmFontSize(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText405")}{wmSizePercent}%</Label>
                    <Slider value={[wmSizePercent]} min={5} max={40} step={1}
                  onValueChange={(v) => setWmSizePercent(v[0])} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("lectureBuilder.jsxText406")}</Label>
                  <div className="flex gap-1">
                    {["#FFFFFF", "#000000", "#FF0000", "#0066FF", "#00AA00", "#FFAA00"].map((c) =>
                  <button key={c}
                  className={`w-6 h-6 rounded-full border-2 ${wmFontColor === c ? "border-primary scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c, boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #ccc" : undefined }}
                  onClick={() => setWmFontColor(c)} />

                  )}
                  </div>
                </div>
                <Button variant="default" size="sm" className="w-full gap-1"
              onClick={handleSaveWatermark}
              disabled={saveWatermarkMut.isPending}>
                  {saveWatermarkMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{t("lectureBuilder.jsxText407")}

              </Button>
                {/* Preview */}
                <div className="relative w-full aspect-video bg-muted rounded-lg border overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">{t("lectureBuilder.jsxText408")}

                </div>
                  <div className={`absolute flex items-center gap-1 ${
                wmPosition.includes("top") ? "top-2" : "bottom-2"} ${

                wmPosition.includes("left") ? "left-2" : wmPosition.includes("center") ? "left-1/2 -translate-x-1/2" : "right-2"}`
                } style={{ opacity: wmOpacity / 100 }}>
                    {wmLogoUrl && (wmType === "logo" || wmType === "both") &&
                  <img src={wmLogoUrl} alt="wm" className="rounded" style={{ height: `${wmSizePercent * 1.5}px` }} />
                  }
                    {(wmType === "text" || wmType === "both") && wmText &&
                  <span style={{ fontSize: `${Math.max(8, wmFontSize * 0.5)}px`, color: wmFontColor }} className="font-bold drop-shadow-md">
                        {wmText}
                      </span>
                  }
                  </div>
                </div>
              </CardContent>
            }
          </Card>

          {/* TTS Mode Notice - when no avatar face is configured */}
          {avatars.length === 0 || avatars.every((a: any) => !a.customFaceUrl) ?
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold">{t("lectureBuilder.ttsModeBanner.title")}</p>
                  <p className="mt-0.5 text-blue-600 dark:text-blue-400">{t("lectureBuilder.ttsModeBanner.desc")}</p>
                </div>
              </div>
            </div> : null
          }

          {/* Generate Button */}
          <Button id="step5-generate-video-btn" className="w-full gap-2" size="lg" onClick={handleGenerateVideo} disabled={generating || exporting || selectedSlideIds.size === 0}>
            {generating ?
            <><Loader2 className="w-5 h-5 animate-spin" />{t("lectureBuilder.jsxText409")}</> :

            <><Video className="w-5 h-5" />{t("lectureBuilder.jsxText410")}</>
            }
          </Button>
          <Link href="/video-history">
            <Button variant="outline" className="w-full gap-2 mt-2" size="sm">
              <History className="w-4 h-4" />{t("lectureBuilder.viewVideoHistory")}
            </Button>
          </Link>
          {generating &&
          <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("lectureBuilder.jsxText411")}</span>
                  <span className="font-mono font-bold text-primary">{genProgress}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${genProgress}%` }} />
                
                </div>
                {genStep &&
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {genStep}
                  </p>
              }
                <p className="text-[10px] text-muted-foreground/60 text-center">{t("lectureBuilder.jsxText412")}</p>
              </CardContent>
            </Card>
          }
        </div>
      </div>
    </div>);

}
// ============ PPT AI Script Generation Panel ============
