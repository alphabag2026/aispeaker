import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Loader2, XCircle, ArrowRight, CreditCard, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
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
            <h1 className="text-2xl font-bold mb-2">결제 정보 없음</h1>
            <p className="text-muted-foreground mb-6">유효한 결제 세션을 찾을 수 없습니다.</p>
            <Link href="/pricing">
              <Button>요금제 페이지로 돌아가기</Button>
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
            <h1 className="text-2xl font-bold mb-2">결제 확인 중...</h1>
            <p className="text-muted-foreground">잠시만 기다려 주세요.</p>
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
            <h1 className="text-3xl font-bold mb-2">결제 완료!</h1>
            <p className="text-muted-foreground mb-6">결제가 성공적으로 처리되었습니다.</p>

            {payment && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">결제 유형</span>
                  <span className="font-medium flex items-center gap-1">
                    {payment.paymentType === "subscription" ? (
                      <><CreditCard className="w-4 h-4" /> 구독</>
                    ) : (
                      <><Coins className="w-4 h-4" /> 크레딧 패키지</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">결제 금액</span>
                  <span className="font-bold text-lg">${(payment.amountCents / 100).toFixed(2)}</span>
                </div>
                {payment.creditAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">충전 크레딧</span>
                    <span className="font-medium text-primary">{payment.creditAmount} 크레딧</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">설명</span>
                  <span className="font-medium text-sm">{payment.description}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/my-subscription" className="flex-1">
                <Button className="w-full" variant="outline">
                  내 구독 확인 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/studio" className="flex-1">
                <Button className="w-full">
                  스튜디오로 이동 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
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
            <h1 className="text-2xl font-bold mb-2">결제 처리 중...</h1>
            <p className="text-muted-foreground mb-4">결제가 처리되고 있습니다. 잠시만 기다려 주세요.</p>
            <p className="text-xs text-muted-foreground">자동으로 새로고침됩니다.</p>
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
          <h1 className="text-2xl font-bold mb-2">결제 실패</h1>
          <p className="text-muted-foreground mb-6">결제 처리 중 문제가 발생했습니다. 다시 시도해 주세요.</p>
          <Link href="/pricing">
            <Button>요금제 페이지로 돌아가기</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
