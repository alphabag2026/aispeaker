import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  Clock,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation, useParams, Link } from "wouter";

const NETWORK_EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  bsc: "https://bscscan.com/address/",
  polygon: "https://polygonscan.com/address/",
  tron: "https://tronscan.org/#/address/",
  bitcoin: "https://mempool.space/address/",
};

const NETWORK_NAMES: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain",
  polygon: "Polygon",
  tron: "Tron",
  bitcoin: "Bitcoin",
};

export default function CryptoPayment() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const paymentId = parseInt(params.id || "0");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const { data, isLoading, refetch } = trpc.crypto.checkStatus.useQuery(
    { paymentId },
    {
      enabled: !!paymentId && !!user,
      refetchInterval: 10000, // Poll every 10s
    }
  );

  // Countdown timer
  useEffect(() => {
    if (!data?.cryptoDetail?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(data.cryptoDetail!.expiresAt).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        refetch();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.cryptoDetail?.expiresAt, refetch]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const cryptoDetail = data?.cryptoDetail;
  const status = data?.status || "pending";
  const isExpired = data?.isExpired;

  const explorerUrl = cryptoDetail
    ? (NETWORK_EXPLORERS[cryptoDetail.network] || "") + cryptoDetail.walletAddress
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-lg">
        <Link href="/pricing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> 요금제로 돌아가기
        </Link>

        {/* Status: Completed */}
        {status === "completed" && (
          <Card className="border-green-500/30 bg-green-950/20">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">결제 완료!</h2>
              <p className="text-muted-foreground mb-6">
                암호화폐 결제가 확인되었습니다. 서비스가 활성화되었습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/my-subscription")}>
                  내 구독 확인
                </Button>
                <Button variant="outline" onClick={() => navigate("/studio")}>
                  스튜디오 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status: Expired or Failed */}
        {(isExpired || status === "failed") && (
          <Card className="border-red-500/30 bg-red-950/20">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-400 mb-2">
                {isExpired ? "결제 시간 만료" : "결제 실패"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isExpired
                  ? "30분 내에 입금이 확인되지 않았습니다. 다시 시도해주세요."
                  : "결제 처리 중 문제가 발생했습니다."}
              </p>
              <Button onClick={() => navigate("/pricing")}>
                다시 시도하기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status: Pending */}
        {status === "pending" && !isExpired && cryptoDetail && (
          <>
            {/* Timer */}
            <Card className="border-amber-500/30 bg-amber-950/10 mb-4">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-400">결제 남은 시간</span>
                </div>
                <span className={`text-xl font-mono font-bold ${timeLeft < 300000 ? "text-red-400" : "text-amber-400"}`}>
                  {formatTime(timeLeft)}
                </span>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Wallet className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                  <h2 className="text-xl font-bold mb-1">암호화폐 결제</h2>
                  <p className="text-sm text-muted-foreground">
                    아래 주소로 정확한 금액을 전송해주세요
                  </p>
                </div>

                {/* Network & Currency */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {cryptoDetail.cryptoCurrency}
                  </Badge>
                  <Badge variant="secondary">
                    {NETWORK_NAMES[cryptoDetail.network] || cryptoDetail.network}
                  </Badge>
                </div>

                {/* Amount */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">전송 금액</div>
                  <div className="text-3xl font-bold font-mono text-foreground">
                    {cryptoDetail.cryptoAmount} {cryptoDetail.cryptoCurrency}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ≈ ${(cryptoDetail.usdEquivalent / 100).toFixed(2)} USD
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => copyToClipboard(cryptoDetail.cryptoAmount)}
                  >
                    <Copy className="w-3 h-3 mr-1" /> 금액 복사
                  </Button>
                </div>

                {/* Wallet Address */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-muted-foreground mb-2 text-center">수신 지갑 주소</div>

                  {/* QR Code placeholder - using a simple visual representation */}
                  <div className="flex justify-center mb-3">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="w-32 h-32 bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 rounded flex items-center justify-center">
                        <div className="text-center">
                          <Wallet className="w-8 h-8 text-white mx-auto mb-1" />
                          <span className="text-[8px] text-white/80 block">QR Code</span>
                          <span className="text-[7px] text-white/60 block">스캔하여 전송</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background rounded-lg p-3 break-all text-center font-mono text-xs text-foreground">
                    {cryptoDetail.walletAddress}
                  </div>
                  <div className="flex justify-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => copyToClipboard(cryptoDetail.walletAddress)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> 주소 복사
                    </Button>
                    {explorerUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(explorerUrl, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> 탐색기
                      </Button>
                    )}
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-400/80 space-y-1">
                      <p><strong>{NETWORK_NAMES[cryptoDetail.network]}</strong> 네트워크로만 전송하세요.</p>
                      <p>다른 네트워크로 전송 시 자산을 잃을 수 있습니다.</p>
                      <p>정확한 금액을 전송해야 자동 확인됩니다.</p>
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>입금 확인 대기 중... (10초마다 자동 확인)</span>
                </div>
              </CardContent>
            </Card>

            {/* Manual check button */}
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                수동 확인
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                입금 후 블록 확인에 1~10분이 소요될 수 있습니다.
              </p>
            </div>
          </>
        )}

        {/* FAQ Section */}
        <CryptoFAQ />
      </div>
    </div>
  );
}

const faqItems = [
  {
    q: "암호화폐 결제는 어떤 코인을 지원하나요?",
    a: "현재 USDT(ERC20, TRC20, BEP20), USDC(ERC20, BEP20), ETH(Ethereum), BTC(Bitcoin)를 지원합니다. 각 코인별로 지원하는 네트워크가 다르므로, 결제 시 표시되는 네트워크를 반드시 확인하세요. 잘못된 네트워크로 전송하면 자산을 잃을 수 있습니다.",
  },
  {
    q: "결제 후 얼마나 기다려야 서비스가 활성화되나요?",
    a: "네트워크에 따라 다릅니다. TRC20(Tron)은 약 1~3분, ERC20/BEP20(Ethereum/BSC)은 약 3~5분, BTC(Bitcoin)는 약 10~60분이 소요됩니다. 시스템이 10초마다 자동으로 입금을 확인하며, 블록 컨펌이 완료되면 즉시 서비스가 활성화됩니다. 30분이 지나도 확인되지 않으면 고객지원에 문의하세요.",
  },
  {
    q: "정확한 금액을 보내지 않으면 어떻게 되나요?",
    a: "자동 확인 시스템은 정확한 금액이 전송되었을 때 작동합니다. 소수점 이하 금액까지 정확히 일치해야 합니다. 금액이 다른 경우 자동 확인이 되지 않으며, 트랜잭션 해시(TxHash)와 함께 고객지원에 문의하시면 수동으로 확인해드립니다. 가스비(수수료)는 별도이므로 전송 금액에 포함하지 마세요.",
  },
  {
    q: "결제 시간(30분)이 만료되면 어떻게 되나요?",
    a: "30분 이내에 입금이 확인되지 않으면 해당 결제 건은 자동으로 만료됩니다. 이미 전송을 완료했지만 블록 컨펌이 늦어진 경우, 트랜잭션 해시와 함께 고객지원에 문의하시면 수동으로 확인 후 서비스를 활성화해드립니다. 아직 전송하지 않았다면 새로운 결제를 생성하세요.",
  },
  {
    q: "환불은 어떻게 받을 수 있나요?",
    a: "암호화폐 결제의 환불은 원래 전송한 지갑 주소로 동일한 코인으로 진행됩니다. 환불 요청 시 결제 ID, 전송 지갑 주소, 트랜잭션 해시를 포함하여 고객지원에 문의하세요. 환불 처리에는 영업일 기준 3~5일이 소요되며, 네트워크 수수료(가스비)는 환불 금액에서 차감될 수 있습니다.",
  },
  {
    q: "잘못된 네트워크로 전송했는데 복구할 수 있나요?",
    a: "안타깝게도 잘못된 네트워크로 전송된 자산은 대부분 복구가 불가능합니다. 예를 들어 ERC20 주소로 TRC20 토큰을 보내거나, BEP20 주소로 ERC20 토큰을 보낸 경우가 이에 해당합니다. 전송 전 반드시 네트워크를 확인하세요. 만약 잘못 전송한 경우 트랜잭션 해시와 함께 즉시 고객지원에 문의하세요.",
  },
  {
    q: "암호화폐로 정기 구독 결제가 가능한가요?",
    a: "현재 암호화폐 결제는 일회성 결제(크레딧 패키지 구매, 단건 구독)만 지원합니다. 자동 갱신되는 정기 구독은 Stripe(카드 결제)를 통해서만 가능합니다. 구독 만료 전에 암호화폐로 수동 갱신하실 수 있으며, 갱신 알림을 이메일로 보내드립니다.",
  },
];

function CryptoFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-10">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-purple-400" />
        암호화폐 결제 자주 묻는 질문 (FAQ)
      </h3>
      <div className="space-y-2">
        {faqItems.map((item, i) => (
          <div
            key={i}
            className="border border-border/50 rounded-lg overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span className="font-medium text-sm text-foreground pr-4">{item.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">
          더 궁금한 점이 있으신가요?
        </p>
        <Link href="/payment-troubleshooting">
          <Button variant="outline" size="sm" className="text-xs">
            결제 문제 해결 가이드 보기
          </Button>
        </Link>
      </div>
    </div>
  );
}
