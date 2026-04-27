import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft, Zap, TrendingUp, TrendingDown, Clock,
  CreditCard, BarChart3, Sparkles, ShoppingCart,
  Image as ImageIcon, Video, Mic, Headphones,
  Wand2, Camera, Globe, Palette, Film, Loader2
} from "lucide-react";

const FEATURE_INFO: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  tts_conversion: { label: "TTS 음성 생성", icon: Mic, color: "text-blue-400" },
  image_generation: { label: "이미지 생성", icon: ImageIcon, color: "text-purple-400" },
  bg_remove: { label: "배경 제거/교체", icon: Palette, color: "text-pink-400" },
  voice_clone: { label: "음성 복제", icon: Mic, color: "text-cyan-400" },
  voice_change: { label: "음성 변환", icon: Headphones, color: "text-green-400" },
  video_effects: { label: "비디오 이펙트", icon: Film, color: "text-orange-400" },
  image_to_video: { label: "이미지→비디오", icon: Video, color: "text-red-400" },
  face_swap: { label: "페이스 스왑", icon: Wand2, color: "text-amber-400" },
  talking_avatar: { label: "토킹 아바타", icon: Camera, color: "text-indigo-400" },
  video_translate: { label: "비디오 번역", icon: Globe, color: "text-teal-400" },
  lecture_generation: { label: "강의 생성", icon: Sparkles, color: "text-violet-400" },
  avatar_generation: { label: "아바타 생성", icon: Camera, color: "text-rose-400" },
};

export default function CreditDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");

  const balanceQuery = trpc.credit.balance.useQuery();
  const historyQuery = trpc.credit.history.useQuery({ limit: 50 });

  const credits = balanceQuery.data?.credits ?? 0;
  const maxCredits = 10000; // for progress bar scale
  const progressPercent = Math.min((credits / maxCredits) * 100, 100);

  // Calculate usage stats from history
  const stats = useMemo(() => {
    if (!historyQuery.data) return { totalUsed: 0, totalAdded: 0, byFeature: {} as Record<string, number> };
    
    const now = Date.now();
    const periodMs = period === "7d" ? 7 * 86400000 : period === "30d" ? 30 * 86400000 : Infinity;
    
    const filtered = historyQuery.data.filter((item: any) => {
      const itemTime = new Date(item.createdAt).getTime();
      return now - itemTime <= periodMs;
    });

    let totalUsed = 0;
    let totalAdded = 0;
    const byFeature: Record<string, number> = {};

    filtered.forEach((item: any) => {
      if (item.amount < 0) {
        totalUsed += Math.abs(item.amount);
        const feature = item.feature || "unknown";
        byFeature[feature] = (byFeature[feature] || 0) + Math.abs(item.amount);
      } else {
        totalAdded += item.amount;
      }
    });

    return { totalUsed, totalAdded, byFeature };
  }, [historyQuery.data, period]);

  // Sort features by usage
  const sortedFeatures = useMemo(() => {
    return Object.entries(stats.byFeature)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [stats.byFeature]);

  const maxFeatureUsage = sortedFeatures.length > 0 ? sortedFeatures[0][1] : 1;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="glass-card p-8 text-center">
          <p className="text-muted-foreground mb-4">로그인이 필요합니다</p>
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Credit Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">크레딧 잔액 및 사용 현황</p>
            </div>
          </div>
          <Link href="/pricing">
            <Button className="glow-button gap-2">
              <ShoppingCart className="h-4 w-4" />
              크레딧 충전
            </Button>
          </Link>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">현재 크레딧 잔액</p>
                    <p className="text-3xl font-bold text-foreground">
                      {balanceQuery.isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        credits.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                  {credits > 500 ? "충분" : credits > 100 ? "보통" : "부족"}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {credits > 0 ? `약 ${Math.floor(credits / 5)}회 이미지 생성 가능` : "크레딧을 충전해주세요"}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm text-muted-foreground mb-1">기간별 사용량</p>
                <div className="flex gap-1 mb-4">
                  {(["7d", "30d", "all"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={period === p ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setPeriod(p)}
                    >
                      {p === "7d" ? "7일" : p === "30d" ? "30일" : "전체"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-muted-foreground">사용</span>
                  </div>
                  <span className="font-semibold text-red-400">-{stats.totalUsed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">충전</span>
                  </div>
                  <span className="font-semibold text-green-400">+{stats.totalAdded.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage by Feature */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              기능별 사용량
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedFeatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">아직 사용 내역이 없습니다</p>
                <Link href="/ai-studio">
                  <Button variant="outline" size="sm" className="mt-3">
                    AI Studio 시작하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedFeatures.map(([feature, amount]) => {
                  const info = FEATURE_INFO[feature];
                  const Icon = info?.icon || Sparkles;
                  const percent = (amount / maxFeatureUsage) * 100;
                  return (
                    <div key={feature} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center ${info?.color || "text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{info?.label || feature}</span>
                          <span className="text-xs text-muted-foreground">{amount} 크레딧</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              최근 사용 내역
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">사용 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {historyQuery.data.slice(0, 20).map((item: any, idx: number) => {
                  const isDeduction = item.amount < 0;
                  const info = FEATURE_INFO[item.feature];
                  const Icon = info?.icon || (isDeduction ? TrendingDown : TrendingUp);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isDeduction ? "bg-red-500/10" : "bg-green-500/10"}`}>
                        <Icon className={`h-4 w-4 ${isDeduction ? "text-red-400" : "text-green-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {info?.label || item.feature || (isDeduction ? "크레딧 사용" : "크레딧 충전")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${isDeduction ? "text-red-400" : "text-green-400"}`}>
                        {isDeduction ? "" : "+"}{item.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/pricing">
            <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">크레딧 충전</p>
                  <p className="text-xs text-muted-foreground">패키지 구매</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ai-studio">
            <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-violet-400" />
                <div>
                  <p className="font-medium text-sm">AI Studio</p>
                  <p className="text-xs text-muted-foreground">도구 사용하기</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/community">
            <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <ImageIcon className="h-8 w-8 text-fuchsia-400" />
                <div>
                  <p className="font-medium text-sm">커뮤니티 갤러리</p>
                  <p className="text-xs text-muted-foreground">작품 공유하기</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
