
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History, Video, Download, Play, Trash2, Clock, Layers,
  Monitor, AlertCircle, CheckCircle2, Loader2, ArrowLeft,
  Share2, Link2, ExternalLink, MessageCircle, Copy, FolderOpen
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
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
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [shareOpenId, setShareOpenId] = useState<number | null>(null);

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

  const filteredGenerations = generations?.filter((gen: any) => {
    if (filter === "all") return true;
    return gen.status === filter;
  }) || [];

  const completedCount = generations?.filter((g: any) => g.status === "completed").length || 0;
  const generatingCount = generations?.filter((g: any) => g.status === "generating").length || 0;
  const failedCount = generations?.filter((g: any) => g.status === "failed").length || 0;

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

        {/* Filtered Empty */}
        {generations && generations.length > 0 && filteredGenerations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              해당 상태의 영상이 없습니다.
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
              <Card key={gen.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                <div className="flex flex-col md:flex-row">
                  {/* Video Preview / Player */}
                  <div className="md:w-80 bg-black/50 flex items-center justify-center min-h-[180px] relative">
                    {gen.status === "completed" && gen.videoUrl ? (
                      isPlaying ? (
                        <video
                          src={gen.videoUrl}
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                          onEnded={() => setPlayingId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setPlayingId(gen.id)}
                          className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary" />
                          </div>
                          <span className="text-xs">{t("videoHistory.clickToPlay")}</span>
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
                      <div className="flex gap-1">
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
