import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History, Video, Download, Play, Trash2, Clock, Layers,
  Monitor, AlertCircle, CheckCircle2, Loader2, ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "대기 중", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  generating: { label: "생성 중", color: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  completed: { label: "완료", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
  failed: { label: "실패", color: "bg-red-500/20 text-red-400", icon: AlertCircle },
};

export default function VideoHistory() {
  const { user, loading: authLoading } = useAuth();
  const [playingId, setPlayingId] = useState<number | null>(null);

  const { data: generations, isLoading, refetch } = trpc.lectureBuilder.listAllVideoHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  const deleteMut = trpc.lectureBuilder.deleteVideoGeneration.useMutation({
    onSuccess: () => {
      toast.success("기록이 삭제되었습니다");
      refetch();
    },
    onError: (err) => toast.error(err.message),
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
          로그인이 필요합니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/lecture-builder">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              영상 생성 히스토리
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              이전에 생성한 모든 영상을 확인하고 다시 재생하거나 다운로드할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {(!generations || generations.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">아직 생성된 영상이 없습니다.</p>
              <Link href="/lecture-builder">
                <Button variant="outline" className="mt-4">
                  강의 빌더로 이동
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        <div className="space-y-4">
          {generations?.map((gen) => {
            const statusInfo = STATUS_MAP[gen.status] || STATUS_MAP.pending;
            const StatusIcon = statusInfo.icon;
            const config = gen.config as any;
            const isPlaying = playingId === gen.id;

            return (
              <Card key={gen.id} className="overflow-hidden">
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
                          <span className="text-xs">클릭하여 재생</span>
                        </button>
                      )
                    ) : gen.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <span className="text-xs text-blue-400">생성 중...</span>
                      </div>
                    ) : gen.status === "failed" ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <span className="text-xs text-red-400">생성 실패</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Video className="w-8 h-8" />
                        <span className="text-xs">대기 중</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${gen.status === "generating" ? "animate-spin" : ""}`} />
                            {statusInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            #{gen.id}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(gen.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {gen.status === "completed" && gen.videoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = gen.videoUrl!;
                              a.download = `lecture-video-${gen.id}.mp4`;
                              a.click();
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" /> 다운로드
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm("이 기록을 삭제하시겠습니까?")) {
                              deleteMut.mutate({ id: gen.id });
                            }
                          }}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5" />
                        <span>슬라이드: {gen.slideCount || "-"}장</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>해상도: {gen.resolution || "1080p"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>길이: {gen.totalDuration ? `${Math.round(gen.totalDuration)}초` : "-"}</span>
                      </div>
                      {gen.completedAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>완료: {new Date(gen.completedAt).toLocaleTimeString("ko-KR")}</span>
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
                            위치: {config.avatarPosition}
                          </Badge>
                        )}
                        {config.avatarSize && (
                          <Badge variant="outline" className="text-xs">
                            크기: {config.avatarSize}%
                          </Badge>
                        )}
                        {config.bgmUrl && (
                          <Badge variant="outline" className="text-xs">
                            BGM 포함
                          </Badge>
                        )}
                        {config.noiseReduction && (
                          <Badge variant="outline" className="text-xs">
                            노이즈 제거
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
