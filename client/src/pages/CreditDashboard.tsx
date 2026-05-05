import { useLanguage } from "@/contexts/LanguageContext";
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
  face_swap: { label: "페이스 스왕", icon: Wand2, color: "text-amber-400" },
  talking_avatar: { label: "토킹 아바타", icon: Camera, color: "text-indigo-400" },
  video_translate: { label: "비디오 번역", icon: Globe, color: "text-teal-400" },
  lecture_generation: { label: "강의 생성", icon: Sparkles, color: "text-violet-400" },
  avatar_generation: { label: "아바타 생성", icon: Camera, color: "text-rose-400" },
  ppt_script_generation: { label: "PPT 스크립트 생성", icon: BarChart3, color: "text-emerald-400" },
  script_generation: { label: "스크립트 생성", icon: Sparkles, color: "text-yellow-400" },
  subtitle_generation: { label: "자막 생성", icon: Globe, color: "text-sky-400" },
  thumbnail_generation: { label: "썸네일 생성", icon: ImageIcon, color: "text-lime-400" },
};

const CREDIT_PACKAGES = [
  { id: "credits_50", name: "Basic", credits: 50, price: 15, perCredit: 0.30, popular: false },
  { id: "credits_200", name: "Standard", credits: 200, price: 50, perCredit: 0.25, popular: true },
  { id: "credits_500", name: "Premium", credits: 500, price: 100, perCredit: 0.20, popular: false },
  { id: "credits_2000", name: "Bulk", credits: 2000, price: 300, perCredit: 0.15, popular: false },
];

function CreditPackageGrid() {
  const { user } = useAuth();
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const purchaseMut = trpc.payment.createCreditCheckout.useMutation();

  const handleBuy = async (pkgId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    setLoadingPkg(pkgId);
    try {
      const result = await purchaseMut.mutateAsync({ packageId: pkgId, origin: window.location.origin });
      if (result.checkoutUrl) {
        toast.info("결제 페이지로 이동합니다...");
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "결제 오류가 발생했습니다.");
    } finally {
      setLoadingPkg(null);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CREDIT_PACKAGES.map((pkg) => (
        <div
          key={pkg.id}
          className={`relative p-4 rounded-xl border text-center transition-all hover:shadow-lg ${
            pkg.popular ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border/50 hover:border-amber-500/30"
          }`}
        >
          {pkg.popular && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] px-2">
              인기
            </Badge>
          )}
          <p className="text-sm font-medium text-muted-foreground mb-1">{pkg.name}</p>
          <p className="text-2xl font-bold text-amber-500">{pkg.credits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mb-1">크레딧</p>
          <p className="text-lg font-bold mb-0.5">${pkg.price}</p>
          <p className="text-[10px] text-muted-foreground mb-3">개당 ${pkg.perCredit.toFixed(2)}</p>
          <Button
            size="sm"
            className={`w-full gap-1 ${pkg.popular ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
            variant={pkg.popular ? "default" : "outline"}
            onClick={() => handleBuy(pkg.id)}
            disabled={loadingPkg === pkg.id}
          >
            {loadingPkg === pkg.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <><CreditCard className="w-3 h-3" />구매</>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function CreditDashboard() {
  const { t } = useLanguage();
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
          <p className="text-muted-foreground mb-4">{t("{i18n_key}")}</p>
          <Link href="/">
            <Button>{t("{i18n_key}")}</Button>
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
              <p className="text-xs text-muted-foreground">{t("{i18n_key}")}</p>
            </div>
          </div>
          <Link href="/pricing">
            <Button className="glow-button gap-2">
              <ShoppingCart className="h-4 w-4" />{t("{i18n_key}")}</Button>
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
                    <p className="text-sm text-muted-foreground">{t("{i18n_key}")}</p>
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
                  {credits > 500 ? t("creditDashboard.statusSufficient") : credits > 100 ? t("creditDashboard.statusNormal") : t("creditDashboard.statusInsufficient")}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {credits > 0 ? `~${Math.floor(credits / 5)} images` : t("creditDashboard.pleaseCharge")}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("{i18n_key}")}</p>
                <div className="flex gap-1 mb-4">
                  {(["7d", "30d", "all"] as const).map((p) => (
                    <Button
                      key={p}
                      variant={period === p ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setPeriod(p)}
                    >
                      {p === "7d" ? t("creditDashboard.period7d") : p === "30d" ? t("creditDashboard.period30d") : t("creditDashboard.periodAll")}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-muted-foreground">{t("{i18n_key}")}</span>
                  </div>
                  <span className="font-semibold text-red-400">-{stats.totalUsed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">{t("{i18n_key}")}</span>
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
              <BarChart3 className="h-5 w-5 text-primary" />{t("{i18n_key}")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedFeatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("{i18n_key}")}</p>
                <Link href="/ai-studio">
                  <Button variant="outline" size="sm" className="mt-3">{t("{i18n_key}")}</Button>
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
                          <span className="text-xs text-muted-foreground">{amount} credits</span>
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

        {/* Detailed Usage Stats Widget */}
        <CreditUsageStatsWidget />

        {/* Recent History */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />{t("{i18n_key}")}</CardTitle>
          </CardHeader>
          <CardContent>
            {historyQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("{i18n_key}")}</p>
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
                          {info?.label || item.feature || (isDeduction ? t("creditDashboard.creditUsed") : t("creditDashboard.creditCharged"))}
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

        {/* Credit Packages - Direct Purchase */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" />크레딧 충전
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreditPackageGrid />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/pricing">
            <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t("creditDashboard.hardcoded1")}</p>
                  <p className="text-xs text-muted-foreground">{t("{i18n_key}")}</p>
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
                  <p className="text-xs text-muted-foreground">{t("{i18n_key}")}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/community">
            <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <ImageIcon className="h-8 w-8 text-fuchsia-400" />
                <div>
                  <p className="font-medium text-sm">{t("{i18n_key}")}</p>
                  <p className="text-xs text-muted-foreground">{t("{i18n_key}")}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}


// --- Detailed Credit Usage Stats Widget ---
function CreditUsageStatsWidget() {
  const [statsPeriod, setStatsPeriod] = useState<"7d" | "30d" | "all">("30d");
  const statsQuery = trpc.credit.usageStats.useQuery({ period: statsPeriod });

  const periodLabels: Record<string, string> = {
    "7d": "최근 7일",
    "30d": "최근 30일",
    "all": "전체",
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />크레딧 사용 상세 분석
          </CardTitle>
          <div className="flex gap-1">
            {(["7d", "30d", "all"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={statsPeriod === p ? "default" : "ghost"}
                className="text-xs h-7 px-2"
                onClick={() => setStatsPeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {statsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !statsQuery.data || statsQuery.data.totalCredits === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">선택한 기간에 사용 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{statsQuery.data.totalCredits}</p>
                <p className="text-xs text-muted-foreground">총 사용 크레딧</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{Object.keys(statsQuery.data.byFeature).length}</p>
                <p className="text-xs text-muted-foreground">사용 기능 수</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{statsQuery.data.dailyTrend.length}</p>
                <p className="text-xs text-muted-foreground">활동 일수</p>
              </div>
            </div>

            {/* Feature Breakdown - Pie-like bars */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">기능별 사용량</h4>
              <div className="space-y-2">
                {Object.entries(statsQuery.data.byFeature)
                  .sort(([, a], [, b]) => (b as any).credits - (a as any).credits)
                  .slice(0, 8)
                  .map(([feature, data]: [string, any]) => {
                    const info = FEATURE_INFO[feature];
                    const Icon = info?.icon || Sparkles;
                    const percent = (data.credits / statsQuery.data!.totalCredits) * 100;
                    return (
                      <div key={feature} className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-md bg-background/50 flex items-center justify-center ${info?.color || "text-muted-foreground"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium truncate">{info?.label || feature}</span>
                            <span className="text-xs text-muted-foreground">{data.credits}cr ({data.count}회)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-500/60 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {percent.toFixed(0)}%
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Daily Trend - Mini bar chart */}
            {statsQuery.data.dailyTrend.length > 1 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">일별 사용 추이</h4>
                <div className="flex items-end gap-0.5 h-20">
                  {statsQuery.data.dailyTrend.slice(-14).map((day: any, idx: number) => {
                    const maxCredits = Math.max(...statsQuery.data!.dailyTrend.slice(-14).map((d: any) => d.credits));
                    const height = maxCredits > 0 ? (day.credits / maxCredits) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.date}: ${day.credits}cr`}>
                        <div
                          className="w-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-sm transition-all hover:from-primary hover:to-primary/60"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        {idx % 3 === 0 && (
                          <span className="text-[8px] text-muted-foreground">{day.date.slice(5)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Usage Logs */}
            {statsQuery.data.recentLogs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">최근 사용 내역</h4>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {statsQuery.data.recentLogs.map((log: any, idx: number) => {
                    const info = FEATURE_INFO[log.feature];
                    const Icon = info?.icon || Sparkles;
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-background/30 hover:bg-background/50 transition-colors">
                        <Icon className={`h-3.5 w-3.5 ${info?.color || "text-muted-foreground"}`} />
                        <span className="text-xs flex-1 truncate">{info?.label || log.feature}</span>
                        <span className="text-xs font-medium text-red-400">-{log.creditsUsed}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
