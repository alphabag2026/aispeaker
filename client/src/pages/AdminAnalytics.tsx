import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, Users, Zap, TrendingUp, ArrowLeft,
  Shield, Activity, UserPlus, Mic, Image, Video, Wand2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TOOL_ICONS: Record<string, any> = {
  tts: Mic, voice_clone: Mic, voice_change: Mic,
  image_gen: Image, bg_remove: Image,
  video_effects: Video, image_to_video: Video, video_translate: Video,
  face_swap: Wand2, talking_avatar: Wand2,
};

const TOOL_NAMES: Record<string, string> = {
  tts: "TTS", voice_clone: "음성 복제", voice_change: "음성 변환",
  image_gen: "이미지 생성", bg_remove: "배경 제거",
  video_effects: "비디오 효과", image_to_video: "이미지→비디오",
  face_swap: "페이스 스왑", talking_avatar: "토킹 아바타", video_translate: "비디오 번역",
};

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const salesQuery = trpc.adminAnalytics.creditSales.useQuery({ period }, { enabled: user?.role === "admin" });
  const toolQuery = trpc.adminAnalytics.toolUsage.useQuery(undefined, { enabled: user?.role === "admin" });
  const userStatsQuery = trpc.adminAnalytics.userStats.useQuery(undefined, { enabled: user?.role === "admin" });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">{t("adminAnalytics.hardcoded10")}</p>
          <Link href="/"><Button>{t("adminAnalytics.hardcoded11")}</Button></Link>
        </Card>
      </div>
    );
  }

  const sales = (salesQuery.data as any[]) || [];
  const tools = (toolQuery.data as any[]) || [];
  const userStats = userStatsQuery.data || { totalUsers: 0, dau: 0, wau: 0, mau: 0, newToday: 0 };
  const maxToolCount = Math.max(...tools.map((t: any) => Number(t.useCount) || 0), 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-3xl font-bold">{t("adminAnalytics.hardcoded12")}</h1>
            <Badge variant="destructive">Admin Only</Badge>
          </div>
        </div>

        {/* User Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{userStats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">{t("adminAnalytics.hardcoded13")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Activity className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{userStats.dau}</p>
              <p className="text-xs text-muted-foreground">{t("adminAnalytics.dau")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Activity className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{userStats.wau}</p>
              <p className="text-xs text-muted-foreground">{t("adminAnalytics.wau")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{userStats.mau}</p>
              <p className="text-xs text-muted-foreground">{t("adminAnalytics.mau")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <UserPlus className="h-6 w-6 mx-auto text-pink-500 mb-2" />
              <p className="text-2xl font-bold">{userStats.newToday}</p>
              <p className="text-xs text-muted-foreground">{t("adminAnalytics.newToday")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credit Sales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {t("adminAnalytics.creditSalesTitle")}
                </CardTitle>
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t("adminAnalytics.daily")}</SelectItem>
                    <SelectItem value="week">{t("adminAnalytics.weekly")}</SelectItem>
                    <SelectItem value="month">{t("adminAnalytics.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("adminAnalytics.noSalesData")}</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {sales.slice(0, 15).map((row: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-mono">{row.period}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{row.txCount}</span>
                        <Badge variant="secondary">
                          <Zap className="h-3 w-3 mr-0.5" />
                          {Number(row.totalAmount).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tool Usage Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                {t("adminAnalytics.toolRankingTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tools.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("adminAnalytics.noToolData")}</p>
              ) : (
                <div className="space-y-4">
                  {tools.map((tool: any, i: number) => {
                    const Icon = TOOL_ICONS[tool.tool] || Wand2;
                    const pct = (Number(tool.useCount) / maxToolCount) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{TOOL_NAMES[tool.tool] || tool.tool}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span>{Number(tool.useCount).toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-2.5 w-2.5 mr-0.5" />
                              {Number(tool.totalCredits || 0).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
