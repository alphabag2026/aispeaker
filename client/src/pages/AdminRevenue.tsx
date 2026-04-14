
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DollarSign, Users, TrendingUp, CreditCard, Coins, Bitcoin, Loader2, ArrowLeft, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

import { useTranslation } from "@/contexts/LanguageContext";

export default function AdminRevenue() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const authLoading = !isAuthenticated && !user;
  const { data: overview, isLoading } = trpc.revenue.overview.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const { data: recentPayments } = trpc.revenue.payments.useQuery({ limit: 20 }, {
    enabled: !!user && user.role === "admin",
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("ar.noAccess")}</h2>
            <p className="text-muted-foreground">{t("ar.adminOnly")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = overview?.stats || { totalRevenue: 0, totalPayments: 0, completedPayments: 0, activeSubscriptions: 0 };
  const monthlyRevenue = overview?.monthlyRevenue || [];
  const planDistribution = overview?.planDistribution || [];
  const creditTrend = overview?.creditConsumptionTrend || [];

  // Calculate MRR
  const mrr = stats.totalRevenue ? Math.round(stats.totalRevenue / Math.max(monthlyRevenue.length, 1)) : 0;

  // Colors for plan distribution
  const planColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t("ar.title")}</h1>
            <p className="text-muted-foreground">{t("ar.description")}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ar.totalRevenue")}</p>
                  <p className="text-2xl font-bold">${((stats.totalRevenue || 0) / 100).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ar.estimatedMrr")}</p>
                  <p className="text-2xl font-bold">${(mrr / 100).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ar.activeSubscriptions")}</p>
                  <p className="text-2xl font-bold">{(stats as any).activeSubscriptions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ar.totalPayments")}</p>
                  <p className="text-2xl font-bold">{stats.completedPayments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Revenue Chart (Bar chart using CSS) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> {t("ar.monthlyRevenueTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyRevenue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t("ar.noRevenueData")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monthlyRevenue.slice(-6).map((item: any, i: number) => {
                    const maxRevenue = Math.max(...monthlyRevenue.map((m: any) => m.revenue || 0));
                    const pct = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-16 shrink-0">{item.month}</span>
                        <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            <span className="text-xs font-medium text-white">${((item.revenue || 0) / 100).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> {t("ar.planDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planDistribution.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t("ar.noSubscriberData")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Simple donut representation */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {(() => {
                          const total = planDistribution.reduce((sum: number, p: any) => sum + (p.count || 0), 0);
                          let offset = 0;
                          return planDistribution.map((plan: any, i: number) => {
                            const pct = total > 0 ? ((plan.count || 0) / total) * 100 : 0;
                            const dashArray = `${pct * 2.51} ${251 - pct * 2.51}`;
                            const el = (
                              <circle
                                key={i}
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke={planColors[i % planColors.length]}
                                strokeWidth="12"
                                strokeDasharray={dashArray}
                                strokeDashoffset={-offset * 2.51}
                              />
                            );
                            offset += pct;
                            return el;
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{planDistribution.reduce((s: number, p: any) => s + (p.count || 0), 0)}</p>
                          <p className="text-xs text-muted-foreground">{t("ar.totalSubscribers")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-2">
                    {planDistribution.map((plan: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: planColors[i % planColors.length] }} />
                          <span className="text-sm">{plan.planName || "Unknown"}</span>
                        </div>
                        <span className="font-medium">{t("ar.subscriberCount", { count: plan.count || 0 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Credit Consumption Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" /> {t("ar.creditConsumptionTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creditTrend.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("ar.noCreditData")}</p>
              </div>
            ) : (
              <div className="h-48 flex items-end gap-1">
                {creditTrend.slice(-30).map((item: any, i: number) => {
                  const maxCredits = Math.max(...creditTrend.map((c: any) => c.creditsUsed || 0));
                  const pct = maxCredits > 0 ? ((item.creditsUsed || 0) / maxCredits) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={t("ar.creditUsageTooltip", { date: item.date, credits: item.creditsUsed || 0 })}>
                      <div
                        className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t transition-all duration-300 min-h-[2px]"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                      {i % 5 === 0 && (
                        <span
                          className="text-xs text-muted-foreground mt-1 transform -translate-x-1/2 whitespace-nowrap"
                        >
                          {item.date.slice(5)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> {t("ar.recentPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentPayments || recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t("ar.noPaymentHistory")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("ar.date")}</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("ar.user")}</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("ar.type")}</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("ar.paymentMethod")}</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("ar.amount")}</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">{t("ar.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2">{new Date(p.createdAt).toLocaleDateString("ko-KR")}</td>
                        <td className="py-3 px-2">User #{p.userId}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-xs">
                            {p.paymentType === "subscription" ? t("ar.subscription") : t("ar.credit")}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className="flex items-center gap-1">
                            {p.paymentMethod === "stripe" ? <CreditCard className="w-3 h-3" /> : <Bitcoin className="w-3 h-3" />}
                            {p.paymentMethod === "stripe" ? t("ar.card") : t("ar.crypto")}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">${(p.amountCents / 100).toFixed(2)}</td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-xs">
                            {p.status === "completed" ? t("ar.completed") : p.status === "pending" ? t("ar.pending") : p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
