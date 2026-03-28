import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, Building2, CreditCard, Clock, TrendingDown, ArrowUpRight, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PLAN_ICONS: Record<string, any> = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

export default function MySubscription() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: subData, isLoading } = trpc.subscription.my.useQuery(undefined, { enabled: !!user });
  const { data: creditData } = trpc.credit.balance.useQuery(undefined, { enabled: !!user });
  const { data: creditHistory = [] } = trpc.credit.history.useQuery({ limit: 20 }, { enabled: !!user });
  const cancelMutation = trpc.subscription.cancel.useMutation();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
          <p className="text-muted-foreground mb-4">구독 정보를 확인하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  const subscription = subData?.subscription;
  const plan = subData?.plan;
  const Icon = plan ? PLAN_ICONS[plan.slug] || Zap : Zap;
  const creditsUsed = plan ? (plan.monthlyCredits - (subscription?.creditsRemaining ?? 0)) : 0;
  const creditPercent = plan?.monthlyCredits ? Math.min(100, (creditsUsed / plan.monthlyCredits) * 100) : 0;

  const handleCancel = async () => {
    if (!confirm("정말로 구독을 취소하시겠습니까? 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.")) return;
    try {
      await cancelMutation.mutateAsync();
      toast.success("구독 취소가 예약되었습니다.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">내 구독</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Icon className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan?.name || "Free"} 플랜</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {subscription?.status === "active" ? "활성" : subscription?.status || "활성"}
                        {subscription?.cancelAtPeriodEnd && " (기간 종료 시 취소 예정)"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={plan?.slug === "pro" ? "default" : "secondary"} className={plan?.slug === "pro" ? "bg-violet-600" : ""}>
                    {plan?.slug === "free" ? "무료" : plan?.slug === "pro" ? "PRO" : "Enterprise"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">결제 주기</p>
                    <p className="font-medium text-sm">{subscription?.billingCycle === "yearly" ? "연간" : "월간"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">현재 기간</p>
                    <p className="font-medium text-sm">
                      {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR") : "-"}까지
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">영상 품질</p>
                    <p className="font-medium text-sm">{plan?.maxVideoQuality || "720p"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">이번 달 강의</p>
                    <p className="font-medium text-sm">
                      {subscription?.lecturesUsedThisPeriod || 0}
                      {plan?.maxLecturesPerMonth ? ` / ${plan.maxLecturesPerMonth}` : " / 무제한"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {plan?.slug !== "pro" && (
                    <Button onClick={() => navigate("/pricing")} className="bg-violet-600 hover:bg-violet-700">
                      <ArrowUpRight className="w-4 h-4 mr-1" /> 업그레이드
                    </Button>
                  )}
                  {plan?.slug !== "free" && !subscription?.cancelAtPeriodEnd && (
                    <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
                      구독 취소
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Credits */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" /> 크레딧 사용량
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">이번 달 사용</span>
                  <span className="font-medium">
                    {creditsUsed.toLocaleString()} / {plan?.monthlyCredits?.toLocaleString() || 0}
                  </span>
                </div>
                <Progress value={creditPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  남은 크레딧: <span className="font-medium text-foreground">{(subscription?.creditsRemaining ?? 0).toLocaleString()}</span>
                </p>
              </CardContent>
            </Card>

            {/* Credit History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> 크레딧 이력
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">아직 크레딧 사용 이력이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {creditHistory.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div>
                          <p className="text-sm">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">잔액: {tx.balanceAfter}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
