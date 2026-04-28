import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { CreditCard, Coins, Bitcoin, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";

export default function PaymentHistory() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const authLoading = !isAuthenticated && !user;
  const { data: payments, isLoading } = trpc.payment.myPayments.useQuery(undefined, { enabled: !!user });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("ph.loginRequired")}</h2>
            <p className="text-muted-foreground mb-4">{t("ph.loginToView")}</p>
            <a href={getLoginUrl()}>
              <Button>{t("ph.login")}</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    completed: { icon: <CheckCircle className="w-4 h-4" />, label: t("ph.statusCompleted"), color: "bg-green-500/10 text-green-500" },
    pending: { icon: <Clock className="w-4 h-4" />, label: t("ph.statusPending"), color: "bg-yellow-500/10 text-yellow-500" },
    processing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: t("ph.statusProcessing"), color: "bg-blue-500/10 text-blue-500" },
    failed: { icon: <XCircle className="w-4 h-4" />, label: t("ph.statusFailed"), color: "bg-red-500/10 text-red-500" },
    refunded: { icon: <XCircle className="w-4 h-4" />, label: t("ph.statusRefunded"), color: "bg-gray-500/10 text-gray-500" },
  };

  const methodIcon = (method: string) => {
    switch (method) {
      case "stripe": return <CreditCard className="w-4 h-4" />;
      case "crypto": return <Bitcoin className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 sm:px-6 max-w-4xl py-4 sm:py-8 px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/my-subscription">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">{t("ph.title")}</h1>
            <p className="text-muted-foreground">{t("ph.subtitle")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !payments || payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("ph.noPaymentsTitle")}</h3>
              <p className="text-muted-foreground mb-4">{t("ph.noPaymentsSubtitle")}</p>
              <Link href="/pricing">
                <Button>{t("ph.viewPricing")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment: any) => {
              const status = statusConfig[payment.status] || statusConfig.pending;
              return (
                <Card key={payment.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {payment.paymentType === "subscription" ? (
                            <CreditCard className="w-5 h-5 text-primary" />
                          ) : (
                            <Coins className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payment.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {methodIcon(payment.paymentMethod)}
                              {payment.paymentMethod === "stripe" ? t("ph.methodCard") : t("ph.methodCrypto")}
                            </span>
                            <span>·</span>
                            <span>{new Date(payment.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${(payment.amountCents / 100).toFixed(2)}</p>
                        <Badge variant="outline" className={`text-xs ${status.color}`}>
                          <span className="flex items-center gap-1">{status.icon} {status.label}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
