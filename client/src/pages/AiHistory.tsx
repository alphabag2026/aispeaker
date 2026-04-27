import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mic, Image, Video, Wand2, Download, Clock,
  ArrowLeft, Filter, Sparkles, Zap,
} from "lucide-react";

const TOOL_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  tts: { label: "TTS", icon: Mic, color: "bg-blue-500/10 text-blue-500" },
  voice_clone: { label: "음성 복제", icon: Mic, color: "bg-purple-500/10 text-purple-500" },
  voice_change: { label: "음성 변환", icon: Mic, color: "bg-pink-500/10 text-pink-500" },
  image_gen: { label: "이미지 생성", icon: Image, color: "bg-green-500/10 text-green-500" },
  bg_remove: { label: "배경 제거", icon: Image, color: "bg-teal-500/10 text-teal-500" },
  video_effects: { label: "비디오 효과", icon: Video, color: "bg-orange-500/10 text-orange-500" },
  image_to_video: { label: "이미지→비디오", icon: Video, color: "bg-red-500/10 text-red-500" },
  face_swap: { label: "페이스 스왑", icon: Wand2, color: "bg-amber-500/10 text-amber-500" },
  talking_avatar: { label: "토킹 아바타", icon: Wand2, color: "bg-indigo-500/10 text-indigo-500" },
  video_translate: { label: "비디오 번역", icon: Video, color: "bg-cyan-500/10 text-cyan-500" },
};

export default function AiHistory() {
  const { user } = useAuth();
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const historyQuery = trpc.aiHistory.list.useQuery(
    { tool: toolFilter === "all" ? undefined : toolFilter, limit, offset: page * limit },
    { enabled: !!user }
  );

  const items = historyQuery.data?.items ?? [];
  const total = historyQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">로그인이 필요합니다</p>
          <Link href="/"><Button>홈으로</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-3xl font-bold">AI 생성 히스토리</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="h-3 w-3 mr-1" /> 총 {total}건
            </Badge>
            <Link href="/ai-studio">
              <Button size="sm"><Wand2 className="h-3.5 w-3.5 mr-1" /> AI Studio</Button>
            </Link>
          </div>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={toolFilter} onValueChange={(v) => { setToolFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="도구 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 도구</SelectItem>
                  {Object.entries(TOOL_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">
                {items.length > 0 ? `${page * limit + 1}-${Math.min((page + 1) * limit, total)} / ${total}` : "결과 없음"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        {items.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">아직 생성 기록이 없습니다</p>
              <Link href="/ai-studio">
                <Button className="mt-4">AI Studio에서 시작하기</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => {
              const toolInfo = TOOL_LABELS[item.tool] || { label: item.tool, icon: Sparkles, color: "bg-gray-500/10 text-gray-500" };
              const Icon = toolInfo.icon;
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${toolInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{toolInfo.label}</span>
                          <Badge variant={item.status === "completed" ? "default" : "destructive"} className="text-xs">
                            {item.status === "completed" ? "완료" : "실패"}
                          </Badge>
                          {item.creditsUsed > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-2.5 w-2.5 mr-0.5" /> {item.creditsUsed}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.inputSummary || "입력 정보 없음"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(item.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.outputUrl && (
                          <a href={item.outputUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="h-3.5 w-3.5 mr-1" /> 다운로드
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
