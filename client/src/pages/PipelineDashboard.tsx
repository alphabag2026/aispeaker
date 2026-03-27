import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  BarChart3, Clock, CheckCircle2, XCircle, FileText, Film, Download,
  Loader2, Subtitles, ArrowLeft, TrendingUp, PieChart,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  web3: "#6c63ff", ai: "#00d2ff", blockchain: "#ff6b6b", defi: "#ffd93d",
  nft: "#ff8a65", metaverse: "#a78bfa", general: "#94a3b8",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#4ade80", intermediate: "#fbbf24", advanced: "#f87171",
};
const CATEGORY_LABELS: Record<string, string> = {
  web3: "Web3", ai: "AI", blockchain: "블록체인", defi: "DeFi",
  nft: "NFT", metaverse: "메타버스", general: "일반",
};
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "초급", intermediate: "중급", advanced: "고급",
};

export default function PipelineDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.pipeline.stats.useQuery(undefined, { enabled: !!user });
  const { data: pipelines, isLoading: pipelinesLoading } = trpc.pipeline.list.useQuery(undefined, { enabled: !!user });

  const generateSubtitlesMutation = trpc.pipeline.generateSubtitles.useMutation({
    onSuccess: (data) => {
      toast.success(`자막 생성 완료! ${data.subtitleCount}개 자막 생성됨`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [generatingSubtitleId, setGeneratingSubtitleId] = useState<number | null>(null);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로그인이 필요합니다.</div>;

  const handleGenerateSubtitles = async (pipelineId: number) => {
    setGeneratingSubtitleId(pipelineId);
    try {
      await generateSubtitlesMutation.mutateAsync({ pipelineId });
    } finally {
      setGeneratingSubtitleId(null);
    }
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/instructor")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">제작 히스토리 대시보드</h1>
              <p className="text-sm text-muted-foreground">강의 영상 제작 통계 및 히스토리</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-6xl">
        {/* Stats Cards */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Film className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stats.totalPipelines}</div>
                  <div className="text-xs text-muted-foreground">총 제작</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{stats.completedPipelines}</div>
                  <div className="text-xs text-muted-foreground">완료</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold">{stats.failedPipelines}</div>
                  <div className="text-xs text-muted-foreground">실패</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{formatDuration(stats.totalDurationSec)}</div>
                  <div className="text-xs text-muted-foreground">총 시간</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{stats.successRate}%</div>
                  <div className="text-xs text-muted-foreground">성공률</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Monthly Production Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> 월별 제작 현황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.monthlyProduction.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.monthlyProduction}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} name="제작 수" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">데이터가 없습니다.</div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" /> 카테고리 분포
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.categoryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RePieChart>
                        <Pie
                          data={stats.categoryDistribution.map(d => ({ ...d, name: CATEGORY_LABELS[d.category] || d.category }))}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.categoryDistribution.map((entry, idx) => (
                            <Cell key={idx} fill={CATEGORY_COLORS[entry.category] || "#94a3b8"} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">데이터가 없습니다.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Difficulty Distribution */}
            {stats.difficultyDistribution.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">난이도 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {stats.difficultyDistribution.map((d) => (
                      <div key={d.difficulty} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS[d.difficulty] || "#94a3b8" }} />
                        <span className="text-sm">{DIFFICULTY_LABELS[d.difficulty] || d.difficulty}</span>
                        <Badge variant="secondary">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        {/* Pipeline History List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4" /> 제작 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelinesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : pipelines && pipelines.length > 0 ? (
              <div className="space-y-3">
                {pipelines.map((item) => {
                  const p = item.pipeline;
                  const s = item.script;
                  const audioUrls = p.audioUrls ? JSON.parse(p.audioUrls) : [];
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="shrink-0">
                        {p.status === "completed" ? (
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        ) : p.status === "failed" ? (
                          <XCircle className="h-8 w-8 text-red-500" />
                        ) : (
                          <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">{s.category}</Badge>
                          <span>{formatDuration(p.totalDurationSec || 0)}</span>
                          <span>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</span>
                          {audioUrls.length > 0 && <span>{audioUrls.length}개 오디오</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {p.status === "completed" && (
                          <>
                            {p.subtitleUrl ? (
                              <Button variant="outline" size="sm" asChild>
                                <a href={p.subtitleUrl} download>
                                  <Download className="h-3 w-3 mr-1" /> SRT
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateSubtitles(p.id)}
                                disabled={generatingSubtitleId === p.id}
                              >
                                {generatingSubtitleId === p.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Subtitles className="h-3 w-3 mr-1" />
                                )}
                                자막 생성
                              </Button>
                            )}
                            {audioUrls.length > 0 && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={audioUrls[0]} download>
                                  <Download className="h-3 w-3 mr-1" /> 오디오
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 제작 히스토리가 없습니다.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/studio")}>
                  첫 강의 영상 제작하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
