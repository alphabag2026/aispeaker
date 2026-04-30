import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Loader2, XCircle, ArrowRight, CreditCard, Coins, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PaymentSuccess() {
  const { t } = useLanguage();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");

  const { data, isLoading, error } = trpc.payment.verifySession.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId, refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    }}
  );

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t("ps.noPaymentInfo")}</h1>
            <p className="text-muted-foreground mb-6">{t("ps.noValidSession")}</p>
            <Link href="/pricing">
              <Button>{t("ps.backToPricing")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">{t("ps.verifyingPayment")}</h1>
            <p className="text-muted-foreground">{t("ps.pleaseWait")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = data?.status;
  const payment = data?.payment as any;

  if (status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-green-500/30">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("ps.paymentSuccess")}</h1>
            <p className="text-muted-foreground mb-6">{t("ps.paymentProcessedSuccessfully")}</p>

            {payment && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("ps.paymentType")}</span>
                  <span className="font-medium flex items-center gap-1">
                    {payment.paymentType === "subscription" ? (
                      <><CreditCard className="w-4 h-4" /> {t("ps.subscription")}</>
                    ) : (
                      <><Coins className="w-4 h-4" /> {t("ps.creditPackage")}</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("ps.paymentAmount")}</span>
                  <span className="font-bold text-lg">${(payment.amountCents / 100).toFixed(2)}</span>
                </div>
                {payment.creditAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ps.creditsCharged")}</span>
                    <span className="font-medium text-primary">{payment.creditAmount} {t("ps.credits")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("ps.description")}</span>
                  <span className="font-medium text-sm">{payment.description}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link href="/onboarding">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  <Rocket className="w-4 h-4 mr-2" />
                  {t("ps.gettingStarted")}
                </Button>
              </Link>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/my-subscription" className="flex-1">
                  <Button className="w-full" variant="outline">
                    {t("ps.mySubscription")} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/studio" className="flex-1">
                  <Button className="w-full" variant="outline">
                    {t("ps.goToStudio")} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "pending" || status === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">{t("ps.paymentProcessing")}</h1>
            <p className="text-muted-foreground mb-4">{t("ps.paymentIsProcessing")}</p>
            <p className="text-xs text-muted-foreground">{t("ps.autoRefresh")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-500/30">
        <CardContent className="pt-6 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("ps.paymentFailed")}</h1>
          <p className="text-muted-foreground mb-6">{t("ps.paymentError")}</p>
          <Link href="/pricing">
            <Button>{t("ps.backToPricing")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
