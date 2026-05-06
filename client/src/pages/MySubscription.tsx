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

import { useTranslation } from "@/contexts/LanguageContext";
const PLAN_ICONS: Record<string, any> = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

export default function MySubscription() {
  const { t } = useTranslation();
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
          <h2 className="text-xl font-semibold mb-2">{t("mysub.login_required")}</h2>
          <p className="text-muted-foreground mb-4">{t("mysub.login_prompt")}</p>
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
    if (!confirm(t("mysub.cancel_confirm"))) return;
    try {
      await cancelMutation.mutateAsync();
      toast.success(t("mysub.cancel_scheduled_msg"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">{t("mysub.my_subscription")}</h1>

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
                      <CardTitle className="text-lg">{t("mysub.plan_title", { planName: plan?.name || "Free" })}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {subscription?.status === "active" ? t("mysub.active") : subscription?.status || t("mysub.active")}
                        {subscription?.cancelAtPeriodEnd && t("mysub.cancel_scheduled")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={plan?.slug === "pro" ? "default" : "secondary"} className={plan?.slug === "pro" ? "bg-violet-600" : ""}>
                    {plan?.slug === "free" ? t("mysub.free") : plan?.slug === "pro" ? "PRO" : "Enterprise"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("mysub.billing_cycle")}</p>
                    <p className="font-medium text-sm">{subscription?.billingCycle === "yearly" ? t("mysub.annual") : t("mysub.monthly")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("mysub.current_period")}</p>
                    <p className="font-medium text-sm">
                      {subscription?.currentPeriodEnd ? `${new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}${t("mysub.until_date")}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("mysub.video_quality")}</p>
                    <p className="font-medium text-sm">{plan?.maxVideoQuality || "720p"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("mysub.monthly_lectures")}</p>
                    <p className="font-medium text-sm">
                      {subscription?.lecturesUsedThisPeriod || 0}
                      {plan?.maxLecturesPerMonth ? ` / ${plan.maxLecturesPerMonth}` : t("mysub.unlimited")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {plan?.slug !== "pro" && (
                    <Button onClick={() => navigate("/pricing")} className="bg-violet-600 hover:bg-violet-700">
                      <ArrowUpRight className="w-4 h-4 mr-1" /> {t("mysub.upgrade")}
                    </Button>
                  )}
                  {plan?.slug !== "free" && !subscription?.cancelAtPeriodEnd && (
                    <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
                      {t("mysub.cancel_subscription")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Credit Subscription Plans */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-emerald-500" /> 월정액 크레딧 구독
                  </CardTitle>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">매월 자동 충전</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">매월 자동으로 크레딧이 충전됩니다. 언제든지 해지 가능합니다.</p>
              </CardHeader>
              <CardContent>
                <SubscriptionPlansGrid />
              </CardContent>
            </Card>

            {/* Credits */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" /> {t("mysub.credit_usage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("mysub.monthly_usage")}</span>
                  <span className="font-medium">
                    {creditsUsed.toLocaleString()} / {plan?.monthlyCredits?.toLocaleString() || 0}
                  </span>
                </div>
                <Progress value={creditPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {t("mysub.remaining_credits")} <span className="font-medium text-foreground">{(subscription?.creditsRemaining ?? 0).toLocaleString()}</span>
                </p>
              </CardContent>
            </Card>

            {/* Credit History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> {t("mysub.credit_history")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creditHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("mysub.no_credit_history")}</p>
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
                          <p className="text-xs text-muted-foreground">{t("mysub.balance")} {tx.balanceAfter}</p>
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


// SubscriptionPlansGrid - Monthly credit subscription plans
function SubscriptionPlansGrid() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const createSub = trpc.payment.createCreditSubscription.useMutation();
  const { data: subStatus } = trpc.payment.subscriptionStatus.useQuery();

  const plans = [
    { slug: "starter", name: "Starter", credits: 100, priceMonthly: 29, priceYearly: 278, color: "text-blue-500", bg: "bg-blue-500/10" },
    { slug: "professional", name: "Professional", credits: 500, priceMonthly: 99, priceYearly: 950, popular: true, color: "text-violet-500", bg: "bg-violet-500/10" },
    { slug: "business", name: "Business", credits: 2000, priceMonthly: 299, priceYearly: 2870, color: "text-amber-500", bg: "bg-amber-500/10" },
    { slug: "enterprise", name: "Enterprise", credits: 10000, priceMonthly: 799, priceYearly: 7670, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const handleSubscribe = async (planSlug: string) => {
    try {
      const result = await createSub.mutateAsync({
        planSlug: planSlug as any,
        billingCycle,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) {
        toast.info("결제 페이지로 이동합니다...");
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message || "구독 생성 실패");
    }
  };

  const currentPlan = subStatus?.plan?.slug;

  return (
    <div className="space-y-4">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          월간
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          연간 <span className="text-xs text-emerald-500 ml-1">17% 할인</span>
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((plan) => {
          const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const monthlyEquiv = billingCycle === "yearly" ? (plan.priceYearly / 12).toFixed(2) : plan.priceMonthly.toFixed(2);
          const isActive = currentPlan === plan.slug;

          return (
            <div key={plan.slug} className={`relative rounded-lg border p-4 transition-all hover:shadow-md ${plan.popular ? "border-violet-500/50 ring-1 ring-violet-500/20" : "border-border/50"} ${isActive ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-violet-600 text-[10px] px-2 py-0.5">인기</Badge>
                </div>
              )}
              {isActive && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-[10px] px-2 py-0.5">현재 구독중</Badge>
                </div>
              )}
              <div className="text-center space-y-2">
                <div className={`inline-flex p-2 rounded-lg ${plan.bg}`}>
                  <Zap className={`w-4 h-4 ${plan.color}`} />
                </div>
                <h4 className="font-semibold text-sm">{plan.name}</h4>
                <div>
                  <span className="text-2xl font-bold">${monthlyEquiv}</span>
                  <span className="text-xs text-muted-foreground">/월</span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-[10px] text-muted-foreground">연 ${price} 결제</p>
                )}
                <p className="text-xs text-muted-foreground">
                  매월 <span className="font-semibold text-foreground">{plan.credits.toLocaleString()}</span> 크레딧 충전
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  variant={isActive ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isActive || createSub.isPending}
                  onClick={() => handleSubscribe(plan.slug)}
                >
                  {isActive ? "구독중" : createSub.isPending ? "처리중..." : "구독하기"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {subStatus?.hasSubscription && subStatus.cancelAtPeriodEnd && (
        <p className="text-xs text-amber-500 text-center mt-2">
          현재 구독이 {subStatus.currentPeriodEnd ? new Date(subStatus.currentPeriodEnd).toLocaleDateString("ko-KR") : "기간 종료 후"} 해지 예정입니다.
        </p>
      )}
    </div>
  );
}

import React from "react";
