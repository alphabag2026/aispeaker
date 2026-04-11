import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Users, CreditCard, BarChart3, Settings, Search,
  Crown, Zap, Building2, TrendingUp, Activity,
  User, Image, Volume2, Shield, AlertCircle, Cpu, Clock, AlertTriangle, CheckCircle2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

function ApiMonitoringPanel() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = trpc.revenue.apiUsage.useQuery({ days }, {
    refetchInterval: 60000, // Auto-refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>API 사용량 데이터가 없습니다.</p>
          <p className="text-xs mt-1">AI 스크립트 생성이나 TTS 음성 생성을 실행하면 데이터가 기록됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">기간:</span>
        {[7, 14, 30, 90].map(d => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
            {d}일
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Cpu className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCalls}</p>
                <p className="text-xs text-muted-foreground">전체 API 호출</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.llmCalls}</p>
                <p className="text-xs text-muted-foreground">LLM 호출</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Volume2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ttsCalls}</p>
                <p className="text-xs text-muted-foreground">TTS 호출</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${Number(stats.errorRate) > 5 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {Number(stats.errorRate) > 5 ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.errorRate}%</p>
                <p className="text-xs text-muted-foreground">에러율 ({stats.errorCalls}건)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage & Performance */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">토큰 사용량</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">입력 토큰</span>
              <span className="font-mono font-medium">{stats.totalInputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">출력 토큰</span>
              <span className="font-mono font-medium">{stats.totalOutputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/50 pt-3">
              <span className="text-sm font-medium">총 토큰</span>
              <span className="font-mono font-bold">{(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">성능 지표</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">평균 응답 시간</span>
              <span className="font-mono font-medium">
                <Clock className="w-3 h-3 inline mr-1" />
                {stats.avgDurationMs > 1000 ? `${(stats.avgDurationMs / 1000).toFixed(1)}초` : `${stats.avgDurationMs}ms`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">일평균 호출</span>
              <span className="font-mono font-medium">
                {stats.dailyBreakdown.length > 0 ? Math.round(stats.totalCalls / stats.dailyBreakdown.length) : 0}회
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      {stats.dailyBreakdown.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">일별 API 호출 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.dailyBreakdown.slice(0, 14).map((day: any) => {
                const total = day.llm + day.tts;
                const maxCalls = Math.max(...stats.dailyBreakdown.map((d: any) => d.llm + d.tts));
                const pct = maxCalls > 0 ? (total / maxCalls) * 100 : 0;
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{day.date.slice(5)}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden flex">
                      <div className="h-full bg-violet-500/60 transition-all" style={{ width: `${maxCalls > 0 ? (day.llm / maxCalls) * 100 : 0}%` }} />
                      <div className="h-full bg-emerald-500/60 transition-all" style={{ width: `${maxCalls > 0 ? (day.tts / maxCalls) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-mono w-12 text-right">{total}회</span>
                    {day.errors > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">{day.errors} err</Badge>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-violet-500/60 rounded" /> LLM</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500/60 rounded" /> TTS</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      {stats.recentLogs && stats.recentLogs.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">최근 API 호출 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">시간</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">타입</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">모델</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">상태</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">소요시간</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">토큰</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLogs.slice(0, 20).map((log: any) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`text-xs ${log.apiType === 'llm' ? 'border-violet-500/30 text-violet-500' : 'border-emerald-500/30 text-emerald-500'}`}>
                          {log.apiType.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">{log.model || '-'}</td>
                      <td className="py-2 px-3">
                        {log.status === 'success' ? (
                          <Badge className="bg-green-500/10 text-green-500 border-0 text-[10px]">성공</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-0 text-[10px]" title={log.errorMessage || ''}>
                            실패 {log.errorCode && `(${log.errorCode})`}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {log.durationMs ? (log.durationMs > 1000 ? `${(log.durationMs / 1000).toFixed(1)}s` : `${log.durationMs}ms`) : '-'}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {log.inputTokens || log.outputTokens ? `${(log.inputTokens || 0).toLocaleString()} / ${(log.outputTokens || 0).toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");

  // Data queries
  const { data: plans = [] } = trpc.plan.list.useQuery();
  const { data: allSubs = [] } = trpc.subscription.listAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: faces = [] } = trpc.sampleFace.list.useQuery();
  const { data: voices = [] } = trpc.sampleVoice.list.useQuery();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">관리자 권한이 필요합니다</h2>
          <p className="text-muted-foreground">이 페이지는 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalSubs = allSubs.length;
  const activeSubs = allSubs.filter((s: any) => s.status === "active").length;
  const totalFaces = faces.length;
  const totalVoices = voices.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-sm text-muted-foreground mt-1">AI Speaker 플랫폼 관리</p>
          </div>
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" /> 개요</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> 유저</TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5"><CreditCard className="w-4 h-4" /> 매출</TabsTrigger>
            <TabsTrigger value="samples" className="gap-1.5"><Image className="w-4 h-4" /> 샘플</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5"><Cpu className="w-4 h-4" /> API 모니터링</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" /> 설정</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalSubs}</p>
                      <p className="text-xs text-muted-foreground">전체 구독자</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeSubs}</p>
                      <p className="text-xs text-muted-foreground">활성 구독</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <User className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalFaces}</p>
                      <p className="text-xs text-muted-foreground">얼굴 프리셋</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Volume2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalVoices}</p>
                      <p className="text-xs text-muted-foreground">음성 프리셋</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">빠른 작업</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab("samples")}>
                  <Image className="w-5 h-5" />
                  <span className="text-xs">샘플 관리</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab("users")}>
                  <Users className="w-5 h-5" />
                  <span className="text-xs">유저 관리</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab("revenue")}>
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs">매출 현황</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab("settings")}>
                  <Settings className="w-5 h-5" />
                  <span className="text-xs">시스템 설정</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">구독자 목록</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="검색..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9 h-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allSubs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">아직 구독자가 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">ID</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">유저 ID</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">플랜</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">상태</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">크레딧</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">기간 종료</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubs.map((sub: any) => (
                          <tr key={sub.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-2 px-3">{sub.id}</td>
                            <td className="py-2 px-3">{sub.userId}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-xs">{sub.planId}</Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs">
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">{sub.creditsRemaining}</td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(sub.currentPeriodEnd).toLocaleDateString("ko-KR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {plans.map((plan: any) => {
                const planSubs = allSubs.filter((s: any) => s.planId === plan.id);
                const Icon = plan.slug === "pro" ? Crown : plan.slug === "enterprise" ? Building2 : Zap;
                return (
                  <Card key={plan.id} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5 text-violet-500" />
                        <h3 className="font-semibold">{plan.name}</h3>
                      </div>
                      <p className="text-3xl font-bold">{planSubs.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">구독자 수</p>
                      {plan.priceMonthly > 0 && (
                        <p className="text-sm text-green-500 mt-2">
                          예상 MRR: ${((planSubs.length * plan.priceMonthly) / 100).toFixed(0)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>결제 시스템 연동 후 상세 매출 데이터가 표시됩니다.</p>
                <p className="text-xs mt-1">Stripe 연동을 통해 실시간 매출 추적이 가능합니다.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Samples Tab */}
          <TabsContent value="samples">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-5 h-5 text-violet-500" /> 얼굴 프리셋
                    </CardTitle>
                    <Badge>{totalFaces}개</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {faces.map((face: any) => (
                    <div key={face.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <img src={face.imageUrl} alt={face.name} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{face.name}</p>
                        <p className="text-xs text-muted-foreground">{face.category} · {face.gender}</p>
                      </div>
                      {face.isPremium && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[10px]">PRO</Badge>}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info("얼굴 프리셋 추가 기능 준비 중")}>
                    + 새 얼굴 추가
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-emerald-500" /> 음성 프리셋
                    </CardTitle>
                    <Badge>{totalVoices}개</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {voices.map((voice: any) => (
                    <div key={voice.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        voice.gender === "female" ? "bg-pink-500/10" : "bg-blue-500/10"
                      }`}>
                        <Volume2 className={`w-4 h-4 ${voice.gender === "female" ? "text-pink-500" : "text-blue-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{voice.name}</p>
                        <p className="text-xs text-muted-foreground">{voice.language} · {voice.tone}</p>
                      </div>
                      {voice.isPremium && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[10px]">PRO</Badge>}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info("음성 프리셋 추가 기능 준비 중")}>
                    + 새 음성 추가
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Monitoring Tab */}
          <TabsContent value="api">
            <ApiMonitoringPanel />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">구독 플랜 설정</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {plans.map((plan: any) => (
                      <div key={plan.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {plan.priceMonthly === 0 ? "무료" : `$${(plan.priceMonthly / 100).toFixed(0)}/월`}
                          </p>
                          <p className="text-xs text-muted-foreground">크레딧: {plan.monthlyCredits}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">시스템 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">플랫폼 버전</span>
                    <span>v3.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DB 테이블</span>
                    <span>32개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">결제 시스템</span>
                    <Badge variant="outline" className="text-xs">미연동</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
