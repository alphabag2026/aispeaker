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
import { useTranslation } from "@/contexts/LanguageContext";

function ApiMonitoringPanel() {
  const { t } = useTranslation();
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
          <p>{t("ad.noApiUsageData")}</p>
          <p className="text-xs mt-1">{t("ad.runAiOrTtsToLogData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("ad.period")}</span>
        {[7, 14, 30, 90].map(d => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
            {t("ad.days", { days: d })}
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
                <p className="text-xs text-muted-foreground">{t("ad.totalApiCalls")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ad.llmCalls")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ad.ttsCalls")}</p>
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
                <p className="text-xs text-muted-foreground">{t("ad.errorRate", { count: stats.errorCalls })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage & Performance */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("ad.tokenUsage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("ad.inputTokens")}</span>
              <span className="font-mono font-medium">{stats.totalInputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("ad.outputTokens")}</span>
              <span className="font-mono font-medium">{stats.totalOutputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/50 pt-3">
              <span className="text-sm font-medium">{t("ad.totalTokens")}</span>
              <span className="font-mono font-bold">{(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("ad.performanceMetrics")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("ad.avgResponseTime")}</span>
              <span className="font-mono font-medium">
                <Clock className="w-3 h-3 inline mr-1" />
                {stats.avgDurationMs > 1000 ? `${(stats.avgDurationMs / 1000).toFixed(1)}${t("ad.seconds")}` : `${stats.avgDurationMs}ms`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("ad.avgDailyCalls")}</span>
              <span className="font-mono font-medium">
                {stats.dailyBreakdown.length > 0 ? Math.round(stats.totalCalls / stats.dailyBreakdown.length) : 0}{t("ad.calls")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      {stats.dailyBreakdown.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{t("ad.dailyApiCallTrend")}</CardTitle>
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
                    <span className="text-xs font-mono w-12 text-right">{total}{t("ad.calls")}</span>
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
            <CardTitle className="text-base">{t("ad.recentApiCallLogs")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.time")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.type")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.model")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.status")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.duration")}</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">{t("ad.tokens")}</th>
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
                          <Badge className="bg-green-500/10 text-green-500 border-0 text-[10px]">{t("ad.success")}</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">{t("ad.failure")}</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">{log.durationMs}ms</td>
                      <td className="py-2 px-3 text-xs font-mono">{log.totalTokens}</td>
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery();
  const { data: subsData, isLoading: subsLoading } = trpc.admin.listSubscriptions.useQuery();
  const { data: presets, isLoading: presetsLoading } = trpc.admin.listPresets.useQuery();
  const { data: plans, isLoading: plansLoading } = trpc.admin.listPlans.useQuery();

  const isLoading = usersLoading || subsLoading || presetsLoading || plansLoading;

  const filteredUsers = users?.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const allSubs = subsData || [];
  const faces = presets?.faces || [];
  const voices = presets?.voices || [];
  const totalUsers = users?.length || 0;
  const totalFaces = faces.length;
  const totalVoices = voices.length;

  const getLastSeen = (date: Date | null) => {
    if (!date) return t("ad.stale");
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} ${t("ad.minutesAgo")}`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t("ad.hoursAgo")}`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ${t("ad.daysAgo")}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("ad.adminDashboard")}</h1>
        </header>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5 border-b border-border/50 rounded-none bg-transparent px-0 pb-2 mb-6">
            <TabsTrigger value="users" className="rounded-none"><Users className="w-4 h-4 mr-2" />{t("ad.users")}</TabsTrigger>
            <TabsTrigger value="revenue" className="rounded-none"><CreditCard className="w-4 h-4 mr-2" />{t("ad.revenue")}</TabsTrigger>
            <TabsTrigger value="samples" className="rounded-none"><Image className="w-4 h-4 mr-2" />{t("ad.samples")}</TabsTrigger>
            <TabsTrigger value="api" className="rounded-none"><Cpu className="w-4 h-4 mr-2" />{t("ad.api")}</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none"><Settings className="w-4 h-4 mr-2" />{t("ad.settings")}</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="mb-4 flex justify-between items-center">
              <div className="relative w-full max-w-xs">
                <Input 
                  placeholder={t("ad.searchUsers")}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              <Badge variant="secondary">{t("ad.totalUsers", { count: totalUsers })}</Badge>
            </div>
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("ad.status")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("ad.subscription")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("ad.lastSeen")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => {
                        const sub = allSubs.find(s => s.userId === user.id && s.status === 'active');
                        const plan = sub ? plans.find(p => p.id === sub.planId) : null;
                        return (
                          <tr key={user.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img src={user.image || `https://avatar.vercel.sh/${user.id}.png`} alt={user.name || 'User'} className="w-8 h-8 rounded-full" />
                                <div>
                                  <p className="font-semibold">{user.name || 'Unnamed User'}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={user.isActive ? "default" : "outline"} className={user.isActive ? "bg-green-500/10 text-green-500 border-green-500/30" : ""}>
                                {user.isActive ? t("ad.active") : t("ad.inactive")}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {plan ? (
                                <Badge variant="secondary" className="font-mono">{plan.name}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {getLastSeen(user.lastSeen)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                      <p className="text-xs text-muted-foreground mt-1">{t("ad.subscriberCount")}</p>
                      {plan.priceMonthly > 0 && (
                        <p className="text-sm text-green-500 mt-2">
                          {t("ad.estimatedMrr")} ${((planSubs.length * plan.priceMonthly) / 100).toFixed(0)}
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
                <p>{t("ad.detailedRevenueDataAfterPaymentIntegration")}</p>
                <p className="text-xs mt-1">{t("ad.realtimeRevenueTrackingWithStripe")}</p>
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
                      <User className="w-5 h-5 text-violet-500" /> {t("ad.facePresets")}
                    </CardTitle>
                    <Badge>{t("ad.totalFaces", { count: totalFaces })}</Badge>
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info(t("ad.addFacePresetComingSoon"))}>
                    {t("ad.addNewFace")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-emerald-500" /> {t("ad.voicePresets")}
                    </CardTitle>
                    <Badge>{t("ad.totalVoices", { count: totalVoices })}</Badge>
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info(t("ad.addVoicePresetComingSoon"))}>
                    {t("ad.addNewVoice")}
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
                  <CardTitle className="text-base">{t("ad.subscriptionPlanSettings")}</CardTitle>
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
                            {plan.priceMonthly === 0 ? t("ad.free") : `$${(plan.priceMonthly / 100).toFixed(0)}/${t("ad.month")}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{t("ad.credits")}: {plan.monthlyCredits}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">{t("ad.systemInformation")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ad.platformVersion")}</span>
                    <span>v3.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ad.dbTables")}</span>
                    <span>32</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ad.paymentSystem")}</span>
                    <Badge variant="outline" className="text-xs">{t("ad.notLinked")}</Badge>
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
