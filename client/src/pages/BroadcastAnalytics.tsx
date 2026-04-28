
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  BarChart3, Users, Clock, MessageSquare, TrendingUp, Eye,
  RefreshCw, ArrowLeft, Trophy, HelpCircle, Percent
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/i18n/pages/BroadcastAnalytics";

function formatDuration(seconds: number, t: (key: string) => string): string {
  if (seconds < 60) return `${seconds}${t("broadcastAnalytics.timeUnit.second")}`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}${t("broadcastAnalytics.timeUnit.minute")} ${seconds % 60}${t("broadcastAnalytics.timeUnit.second")}`;
  return `${Math.floor(seconds / 3600)}${t("broadcastAnalytics.timeUnit.hour")} ${Math.floor((seconds % 3600) / 60)}${t("broadcastAnalytics.timeUnit.minute")}`;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-3xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function BroadcastAnalytics() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<number | null>(null);

  const { data: analyticsList, isLoading } = trpc.broadcast.analyticsList.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: recordings } = trpc.broadcast.recordings.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: selectedAnalytics } = trpc.broadcast.getAnalytics.useQuery(
    { broadcastId: selectedBroadcastId! },
    { enabled: !!selectedBroadcastId }
  );

  const regenerate = trpc.broadcast.regenerateAnalytics.useMutation({
    onSuccess: () => {
      // Refetch
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  // Aggregate stats
  const totalBroadcasts = analyticsList?.length || 0;
  const totalViewers = analyticsList?.reduce((sum, a) => sum + (a.broadcastAnalytics?.totalViewers || 0), 0) || 0;
  const avgEngagement = totalBroadcasts > 0
    ? Math.round(analyticsList!.reduce((sum, a) => sum + (a.broadcastAnalytics?.engagementScore || 0), 0) / totalBroadcasts)
    : 0;
  const avgRetention = totalBroadcasts > 0
    ? Math.round(analyticsList!.reduce((sum, a) => sum + (a.broadcastAnalytics?.retentionRate || 0), 0) / totalBroadcasts)
    : 0;

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/broadcast">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("broadcastAnalytics.dashboardTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.dashboardSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.totalBroadcasts")}</p>
                <p className="text-2xl font-bold">{totalBroadcasts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Users className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.totalViewers")}</p>
                <p className="text-2xl font-bold">{totalViewers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.avgEngagement")}</p>
                <p className="text-2xl font-bold">{avgEngagement}<span className="text-sm text-muted-foreground">/100</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><Percent className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.avgRetention")}</p>
                <p className="text-2xl font-bold">{avgRetention}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">{t("broadcastAnalytics.tabAnalytics")}</TabsTrigger>
          <TabsTrigger value="recordings">{t("broadcastAnalytics.tabRecordings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {(!analyticsList || analyticsList.length === 0) ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t("broadcastAnalytics.noAnalyticsData")}</p>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.analyticsGeneratedAfterBroadcast")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analyticsList.map((item) => {
                const a = item.broadcastAnalytics;
                const b = item.liveBroadcasts;
                if (!a || !b) return null;
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedBroadcastId(a.broadcastId)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{b.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                        </Badge>
                      </div>
                      <CardDescription>{b.roomCode}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Users className="w-3 h-3" />
                          </div>
                          <p className="text-lg font-semibold">{a.totalViewers}</p>
                          <p className="text-[10px] text-muted-foreground">{t("broadcastAnalytics.viewers")}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Eye className="w-3 h-3" />
                          </div>
                          <p className="text-lg font-semibold">{a.peakConcurrentViewers}</p>
                          <p className="text-[10px] text-muted-foreground">{t("broadcastAnalytics.peakConcurrent")}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <MessageSquare className="w-3 h-3" />
                          </div>
                          <p className="text-lg font-semibold">{a.totalChatMessages}</p>
                          <p className="text-[10px] text-muted-foreground">{t("broadcastAnalytics.chat")}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Trophy className="w-3 h-3" />
                          </div>
                          <p className="text-lg font-semibold">{a.engagementScore}</p>
                          <p className="text-[10px] text-muted-foreground">{t("broadcastAnalytics.engagement")}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                            style={{ width: `${a.retentionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{a.retentionRate}% {t("broadcastAnalytics.retention")}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Detail Panel */}
          {selectedAnalytics && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t("broadcastAnalytics.detailedAnalytics")}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => regenerate.mutate({ broadcastId: selectedBroadcastId! })}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("broadcastAnalytics.regenerate")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <ScoreGauge score={selectedAnalytics.engagementScore || 0} label={t("broadcastAnalytics.engagementScore")} />
                  <ScoreGauge score={selectedAnalytics.retentionRate || 0} label={t("broadcastAnalytics.retentionRate")} />
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-3xl font-bold text-blue-500">
                      {formatDuration(selectedAnalytics.avgWatchDurationSec || 0, t)}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("broadcastAnalytics.avgWatchTime")}</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-3xl font-bold text-purple-500">
                      {selectedAnalytics.totalQuestions || 0}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> {t("broadcastAnalytics.questionCount")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          {(!recordings || recordings.length === 0) ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t("broadcastAnalytics.noRecordings")}</p>
                <p className="text-sm text-muted-foreground">{t("broadcastAnalytics.recordingSavedAfterBroadcast")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recordings.map((item) => {
                const r = item.broadcastRecordings;
                const b = item.liveBroadcasts;
                if (!r || !b) return null;
                return (
                  <Card key={r.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50">
                            <Clock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{b.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(r.totalDurationSec || 0, t)} · {r.slideCount || 0}{t("broadcastAnalytics.slideCountUnit")} · {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={r.status === "ready" ? "default" : "secondary"}>
                          {r.status === "ready" ? t("broadcastAnalytics.vodReady") : r.status === "processing" ? t("broadcastAnalytics.processing") : r.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
