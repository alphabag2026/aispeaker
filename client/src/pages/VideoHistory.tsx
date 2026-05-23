
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  History, Video, Download, Play, Pause, Square, Trash2, Clock, Layers,
  Monitor, AlertCircle, CheckCircle2, Loader2, ArrowLeft,
  Share2, Link2, ExternalLink, MessageCircle, Copy, FolderOpen,
  Search, RefreshCw, Calendar, Image as ImageIcon
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useLanguage, registerTranslations } from "@/contexts/LanguageContext";

// --- Translations ---
registerTranslations("ko", {
  "videoHistory.title": "영상 생성 이력",
  "videoHistory.description": "이전에 생성한 모든 강의 영상을 확인하고 다운로드하거나 공유할 수 있습니다.",
  "videoHistory.goBack": "돌아가기",
  "videoHistory.emptyState": "아직 생성된 영상이 없습니다",
  "videoHistory.goToBuilder": "강의 제작하러 가기",
  "videoHistory.clickToPlay": "클릭하여 재생",
  "videoHistory.generatingText": "생성 중...",
  "videoHistory.generationFailed": "생성 실패",
  "videoHistory.statusPending": "대기 중",
  "videoHistory.download": "다운로드",
  "videoHistory.deleteConfirm": "이 영상 기록을 삭제하시겠습니까?",
  "videoHistory.deleteSuccess": "삭제되었습니다",
  "videoHistory.slides": "슬라이드 {{count}}개",
  "videoHistory.resolution": "{{resolution}}",
  "videoHistory.duration": "{{duration}}초",
  "videoHistory.completedAt": "완료: {{time}}",
  "videoHistory.avatarPosition": "위치: {{position}}",
  "videoHistory.avatarSize": "크기: {{size}}",
  "videoHistory.bgmIncluded": "BGM 포함",
  "videoHistory.noiseReduction": "노이즈 제거",
  "videoHistory.loginRequired": "로그인이 필요합니다",
  "videoHistory.projectLabel": "프로젝트",
  "videoHistory.unknownProject": "삭제된 프로젝트",
  "videoHistory.shareBtn": "공유",
  "videoHistory.copyUrl": "URL 복사",
  "videoHistory.urlCopied": "영상 URL이 복사되었습니다",
  "videoHistory.shareTelegram": "텔레그램",
  "videoHistory.shareX": "X",
  "videoHistory.shareWhatsApp": "왓츠앱",
  "videoHistory.shareTitle": "AI 강의 영상",
  "videoHistory.shareText": "AI로 생성한 강의 영상을 확인해보세요!",
  "videoHistory.totalCount": "총 {{count}}개의 영상",
  "videoHistory.filterAll": "전체",
  "videoHistory.filterCompleted": "완료",
  "videoHistory.filterGenerating": "생성 중",
  "videoHistory.filterFailed": "실패",
  "videoHistory.openProject": "프로젝트 열기",
  "videoHistory.regenerate": "재생성",
  "videoHistory.regenerateTooltip": "동일한 설정으로 영상을 다시 생성합니다",
  "videoHistory.regenerating": "재생성 준비 중...",
  "videoHistory.regenerateSuccess": "영상 재생성이 시작되었습니다",
  "videoHistory.searchPlaceholder": "프로젝트 제목으로 검색...",
  "videoHistory.searchByDate": "날짜 필터",
  "videoHistory.noSearchResults": "검색 결과가 없습니다",
  "videoHistory.thumbnail": "썸네일",
  "videoHistory.noThumbnail": "썸네일 없음",
});

registerTranslations("en", {
  "videoHistory.title": "Video Generation History",
  "videoHistory.description": "View, download, and share all your previously generated lecture videos.",
  "videoHistory.goBack": "Go Back",
  "videoHistory.emptyState": "No videos generated yet",
  "videoHistory.goToBuilder": "Go to Lecture Builder",
  "videoHistory.clickToPlay": "Click to play",
  "videoHistory.generatingText": "Generating...",
  "videoHistory.generationFailed": "Generation failed",
  "videoHistory.statusPending": "Pending",
  "videoHistory.download": "Download",
  "videoHistory.deleteConfirm": "Delete this video record?",
  "videoHistory.deleteSuccess": "Deleted",
  "videoHistory.slides": "{{count}} slides",
  "videoHistory.resolution": "{{resolution}}",
  "videoHistory.duration": "{{duration}}s",
  "videoHistory.completedAt": "Done: {{time}}",
  "videoHistory.avatarPosition": "Position: {{position}}",
  "videoHistory.avatarSize": "Size: {{size}}",
  "videoHistory.bgmIncluded": "BGM included",
  "videoHistory.noiseReduction": "Noise reduction",
  "videoHistory.loginRequired": "Login required",
  "videoHistory.projectLabel": "Project",
  "videoHistory.unknownProject": "Deleted project",
  "videoHistory.shareBtn": "Share",
  "videoHistory.copyUrl": "Copy URL",
  "videoHistory.urlCopied": "Video URL copied",
  "videoHistory.shareTelegram": "Telegram",
  "videoHistory.shareX": "X",
  "videoHistory.shareWhatsApp": "WhatsApp",
  "videoHistory.shareTitle": "AI Lecture Video",
  "videoHistory.shareText": "Check out this AI-generated lecture video!",
  "videoHistory.totalCount": "{{count}} videos total",
  "videoHistory.filterAll": "All",
  "videoHistory.filterCompleted": "Completed",
  "videoHistory.filterGenerating": "Generating",
  "videoHistory.filterFailed": "Failed",
  "videoHistory.openProject": "Open Project",
  "videoHistory.regenerate": "Regenerate",
  "videoHistory.regenerateTooltip": "Regenerate video with the same settings",
  "videoHistory.regenerating": "Preparing regeneration...",
  "videoHistory.regenerateSuccess": "Video regeneration started",
  "videoHistory.searchPlaceholder": "Search by project title...",
  "videoHistory.searchByDate": "Date filter",
  "videoHistory.noSearchResults": "No search results",
  "videoHistory.thumbnail": "Thumbnail",
  "videoHistory.noThumbnail": "No thumbnail",
});

const STATUS_MAP: Record<string, { labelKey: string; color: string; icon: any }> = {
  pending: { labelKey: "videoHistory.statusPending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  generating: { labelKey: "videoHistory.generatingText", color: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  completed: { labelKey: "videoHistory.filterCompleted", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  failed: { labelKey: "videoHistory.generationFailed", color: "bg-red-500/20 text-red-400", icon: AlertCircle },
};

export default function VideoHistory() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [shareOpenId, setShareOpenId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const { data: generations, isLoading, refetch } = trpc.lectureBuilder.listAllVideoHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  const deleteMut = trpc.lectureBuilder.deleteVideoGeneration.useMutation({
    onSuccess: () => {
      toast.success(t("videoHistory.deleteSuccess"));
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const regenerateMut = trpc.lectureBuilder.regenerateVideo.useMutation({
    onSuccess: (data) => {
      // Navigate to the project's lecture builder to trigger regeneration
      toast.success(t("videoHistory.regenerateSuccess"));
      setLocation(`/lecture-builder/${data.projectId}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateVideoMut = trpc.lectureBuilder.generateVideo.useMutation({
    onSuccess: () => {
      toast.success(t("videoHistory.regenerateSuccess"));
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filter and search logic
  const filteredGenerations = useMemo(() => {
    if (!generations) return [];
    let result = [...generations];

    // Status filter
    if (filter !== "all") {
      result = result.filter((gen: any) => gen.status === filter);
    }

    // Search by project title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((gen: any) =>
        (gen.projectTitle || "").toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      result = result.filter((gen: any) => {
        const genDate = new Date(gen.createdAt);
        return genDate.toDateString() === filterDate.toDateString();
      });
    }

    return result;
  }, [generations, filter, searchQuery, dateFilter]);

  const completedCount = generations?.filter((g: any) => g.status === "completed").length || 0;
  const generatingCount = generations?.filter((g: any) => g.status === "generating").length || 0;
  const failedCount = generations?.filter((g: any) => g.status === "failed").length || 0;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 text-center text-muted-foreground">
          {t("videoHistory.loginRequired")}
        </div>
      </div>
    );
  }

  const handleRegenerate = (gen: any) => {
    const config = (gen.config as any) || {};
    generateVideoMut.mutate({
      projectId: gen.projectId,
      avatarPosition: config.avatarPosition || "bottom-right",
      avatarSize: config.avatarSize || 25,
      avatarShape: config.avatarShape || "circle",
      avatarOpacity: config.avatarOpacity || 100,
      bgmUrl: config.bgmUrl || undefined,
      bgmVolume: config.bgmVolume || 30,
      noiseReduction: config.noiseReduction || false,
      resolution: gen.resolution || "1080p",
    });
  };

  // Generate thumbnail from video
  const captureThumbnail = (genId: number) => {
    const video = videoRefs.current[genId];
    if (!video) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.7);
      }
    } catch (e) {
      // Cross-origin video, can't capture
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/lecture-builder">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("videoHistory.goBack")}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              {t("videoHistory.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("videoHistory.description")}
            </p>
          </div>
        </div>

        {/* Search & Date Filter */}
        {generations && generations.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("videoHistory.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 w-[180px]"
              />
              {dateFilter && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setDateFilter("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats & Filter */}
        {generations && generations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Badge variant="outline" className="text-xs">
              {t("videoHistory.totalCount", { count: generations.length })}
            </Badge>
            <div className="flex gap-1 ml-auto">
              {[
                { key: "all", label: t("videoHistory.filterAll"), count: generations.length },
                { key: "completed", label: t("videoHistory.filterCompleted"), count: completedCount },
                { key: "generating", label: t("videoHistory.filterGenerating"), count: generatingCount },
                { key: "failed", label: t("videoHistory.filterFailed"), count: failedCount },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={filter === f.key ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} ({f.count})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!generations || generations.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("videoHistory.emptyState")}</p>
              <Link href="/lecture-builder">
                <Button variant="outline" className="mt-4">
                  {t("videoHistory.goToBuilder")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {generations && generations.length > 0 && filteredGenerations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              {t("videoHistory.noSearchResults")}
            </CardContent>
          </Card>
        )}

        {/* History List */}
        <div className="space-y-4">
          {filteredGenerations.map((gen: any) => {
            const statusInfo = STATUS_MAP[gen.status] || STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            const config = gen.config as any;
            const isPlaying = playingId === gen.id;
            const isShareOpen = shareOpenId === gen.id;

            return (
              <Card key={gen.id} className={`overflow-hidden transition-all duration-300 ${isPlaying ? 'border-primary/60 ring-1 ring-primary/20 shadow-lg shadow-primary/5' : 'hover:border-primary/30'}`}>
                <div className="flex flex-col md:flex-row">
                  {/* Video Preview / Thumbnail */}
                  <div className={`md:w-80 bg-black/50 flex items-center justify-center relative ${isPlaying ? 'min-h-[220px]' : 'min-h-[180px]'}`}>
                    {gen.status === "completed" && gen.videoUrl ? (
                      isPlaying ? (
                        <div className="relative w-full h-full">
                          <video
                            ref={(el) => { videoRefs.current[gen.id] = el; }}
                            src={gen.videoUrl}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                            onEnded={() => setPlayingId(null)}
                            crossOrigin="anonymous"
                          />
                          <button
                            onClick={() => setPlayingId(null)}
                            className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
                            title="Stop"
                          >
                            <Square className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlayingId(gen.id)}
                          className="relative w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all duration-200 group cursor-pointer"
                        >
                          {/* Thumbnail from project */}
                          {gen.projectThumbnail ? (
                            <img
                              src={gen.projectThumbnail}
                              alt="Video thumbnail"
                              className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:scale-[1.02] transition-all duration-300"
                            />
                          ) : null}
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                          <div className="relative z-10 w-16 h-16 rounded-full bg-primary/30 backdrop-blur-md flex items-center justify-center border-2 border-primary/50 group-hover:scale-110 group-hover:bg-primary/40 transition-all duration-300 shadow-lg shadow-primary/20">
                            <Play className="w-7 h-7 text-primary fill-primary/30" />
                          </div>
                          <span className="relative z-10 text-xs font-medium bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white/90">
                            {t("videoHistory.clickToPlay")}
                          </span>
                          {/* Duration badge */}
                          {gen.totalDuration && (
                            <span className="absolute bottom-2 right-2 z-10 text-[10px] bg-black/70 text-white/80 px-1.5 py-0.5 rounded">
                              {Math.floor(gen.totalDuration / 60)}:{String(Math.round(gen.totalDuration % 60)).padStart(2, '0')}
                            </span>
                          )}
                        </button>
                      )
                    ) : gen.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <span className="text-xs text-blue-400">{t("videoHistory.generatingText")}</span>
                      </div>
                    ) : gen.status === "failed" ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <span className="text-xs text-red-400">{t("videoHistory.generationFailed")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Video className="w-8 h-8" />
                        <span className="text-xs">{t("videoHistory.statusPending")}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {/* Project Title */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {gen.projectTitle || t("videoHistory.unknownProject")}
                          </span>
                          <Link href={`/lecture-builder/${gen.projectId}`}>
                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-primary hover:text-primary/80">
                              {t("videoHistory.openProject")}
                            </Button>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${gen.status === "generating" ? "animate-spin" : ""}`} />
                            {t(statusInfo.labelKey)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            #{gen.id}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(gen.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {/* Regenerate Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleRegenerate(gen)}
                          disabled={generateVideoMut.isPending}
                          title={t("videoHistory.regenerateTooltip")}
                        >
                          {generateVideoMut.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          {t("videoHistory.regenerate")}
                        </Button>
                        {gen.status === "completed" && gen.videoUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = gen.videoUrl!;
                                a.download = `lecture-video-${gen.id}.mp4`;
                                a.target = "_blank";
                                a.click();
                              }}
                            >
                              <Download className="w-3 h-3 mr-1" /> {t("videoHistory.download")}
                            </Button>
                            <Button
                              variant={isShareOpen ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setShareOpenId(isShareOpen ? null : gen.id)}
                            >
                              <Share2 className="w-3 h-3 mr-1" /> {t("videoHistory.shareBtn")}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm(t("videoHistory.deleteConfirm"))) {
                              deleteMut.mutate({ id: gen.id });
                            }
                          }}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Share Panel */}
                    {isShareOpen && gen.videoUrl && (
                      <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(gen.videoUrl!);
                              toast.success(t("videoHistory.urlCopied"));
                            }}
                          >
                            <Link2 className="w-3 h-3" /> {t("videoHistory.copyUrl")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: gen.projectTitle || t("videoHistory.shareTitle"),
                                  text: t("videoHistory.shareText"),
                                  url: gen.videoUrl!,
                                }).catch(() => {});
                              } else {
                                navigator.clipboard.writeText(gen.videoUrl!);
                                toast.success(t("videoHistory.urlCopied"));
                              }
                            }}
                          >
                            <Share2 className="w-3 h-3" /> {t("videoHistory.shareBtn")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              const text = encodeURIComponent(gen.projectTitle || t("videoHistory.shareTitle"));
                              const url = encodeURIComponent(gen.videoUrl!);
                              window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                            }}
                          >
                            <ExternalLink className="w-3 h-3" /> {t("videoHistory.shareX")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              const text = encodeURIComponent(`${gen.projectTitle || t("videoHistory.shareTitle")}\n${gen.videoUrl!}`);
                              window.open(`https://t.me/share/url?url=${encodeURIComponent(gen.videoUrl!)}&text=${text}`, "_blank");
                            }}
                          >
                            <MessageCircle className="w-3 h-3" /> {t("videoHistory.shareTelegram")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              window.open(`https://wa.me/?text=${encodeURIComponent((gen.projectTitle || '') + '\n' + gen.videoUrl!)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="w-3 h-3" /> {t("videoHistory.shareWhatsApp")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(gen.videoUrl!)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="w-3 h-3" /> LINE
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t("videoHistory.slides", { count: gen.slideCount || "-" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>{t("videoHistory.resolution", { resolution: gen.resolution || "1080p" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t("videoHistory.duration", { duration: gen.totalDuration ? Math.round(gen.totalDuration) : "-" })}</span>
                      </div>
                      {gen.completedAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t("videoHistory.completedAt", { time: new Date(gen.completedAt).toLocaleTimeString("ko-KR") })}</span>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {gen.status === "failed" && gen.errorMessage && (
                      <div className="mt-3 p-2 bg-red-500/10 rounded text-xs text-red-400">
                        {gen.errorMessage}
                      </div>
                    )}

                    {/* Config Info */}
                    {config && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {config.avatarPosition && (
                          <Badge variant="outline" className="text-xs">
                            {t("videoHistory.avatarPosition", { position: config.avatarPosition })}
                          </Badge>
                        )}
                        {config.avatarSize && (
                          <Badge variant="outline" className="text-xs">
                            {t("videoHistory.avatarSize", { size: config.avatarSize })}
                          </Badge>
                        )}
                        {config.bgmUrl && (
                          <Badge variant="outline" className="text-xs">
                            {t("videoHistory.bgmIncluded")}
                          </Badge>
                        )}
                        {config.noiseReduction && (
                          <Badge variant="outline" className="text-xs">
                            {t("videoHistory.noiseReduction")}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
