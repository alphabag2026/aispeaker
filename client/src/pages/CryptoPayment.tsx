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
import { useTranslation } from "@/contexts/LanguageContext";

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

// ── Crypto Logo SVG Components ──
function UsdtLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" fill="white"/>
    </svg>
  );
}

function UsdcLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path d="M20.022 18.124c0-2.12-1.28-2.852-3.84-3.156-1.828-.228-2.196-.692-2.196-1.504 0-.812.692-1.352 1.828-1.352 1.02 0 1.712.38 2.024 1.164a.48.48 0 00.456.304h1.04a.44.44 0 00.44-.456c-.228-1.392-1.312-2.46-2.82-2.688v-1.544a.46.46 0 00-.456-.456h-.996a.46.46 0 00-.456.456v1.504c-1.828.228-2.996 1.392-2.996 2.852 0 1.968 1.236 2.736 3.796 3.04 1.712.268 2.24.66 2.24 1.544 0 .884-.804 1.504-1.904 1.504-1.484 0-2.024-.612-2.216-1.428a.47.47 0 00-.44-.34h-1.1a.44.44 0 00-.44.456c.268 1.58 1.312 2.508 3.06 2.772v1.544a.46.46 0 00.456.456h.996a.46.46 0 00.456-.456v-1.544c1.828-.304 3.068-1.468 3.068-3.012z" fill="white"/>
      <path d="M12.584 24.476c-4.632-1.656-7.028-6.784-5.336-11.38a8.56 8.56 0 015.336-5.336.42.42 0 00.268-.42v-.936c0-.228-.152-.38-.38-.38-.04 0-.116.04-.152.04C7.024 8.024 4 12.62 5.96 17.916a9.16 9.16 0 005.696 5.696c.076.04.152.04.192.04.228 0 .38-.152.38-.38v-.936c0-.188-.116-.38-.268-.42-.344-.116-.344-.116-.376-.116v-.324zm7.208-18.412c-.076-.04-.152-.04-.192-.04-.228 0-.38.152-.38.38v.936c0 .228.152.38.268.42 4.632 1.656 7.028 6.784 5.336 11.38a8.56 8.56 0 01-5.336 5.336.42.42 0 00-.268.42v.936c0 .228.152.38.38.38.04 0 .116-.04.152-.04 5.296-1.96 8.32-6.556 6.36-11.852a9.16 9.16 0 00-5.696-5.696c-.344-.116-.344-.116-.376-.116v-.324l.376-.116-.04-.004z" fill="white"/>
    </svg>
  );
}

function EthLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="white" fillOpacity=".602"/>
      <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="white"/>
      <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="white" fillOpacity=".602"/>
      <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="white"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="white" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="white" fillOpacity=".602"/>
    </svg>
  );
}

function BtcLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path d="M22.818 14.032c.31-2.077-1.27-3.193-3.432-3.937l.702-2.814-1.713-.427-.683 2.74c-.45-.112-.912-.218-1.372-.323l.688-2.759-1.712-.427-.702 2.813c-.372-.085-.738-.169-1.093-.257l.002-.009-2.362-.59-.456 1.83s1.27.291 1.243.309c.694.173.819.632.798 .996l-.8 3.208c.048.012.11.03.178.057l-.18-.045-1.122 4.5c-.085.21-.3.527-.786.407.017.025-1.244-.31-1.244-.31l-.85 1.962 2.23.556c.414.104.82.213 1.22.315l-.71 2.852 1.712.427.702-2.816c.468.127.922.244 1.366.355l-.7 2.806 1.713.427.71-2.848c2.924.553 5.122.33 6.048-2.314.746-2.13-.037-3.358-1.575-4.16 1.12-.258 1.963-1.003 2.188-2.533zm-3.916 5.49c-.53 2.13-4.114.978-5.277.69l.941-3.774c1.163.29 4.893.864 4.336 3.084zm.53-5.52c-.483 1.938-3.466.953-4.432.712l.854-3.422c.966.241 4.083.69 3.578 2.71z" fill="white"/>
    </svg>
  );
}

// ── CryptoFAQ Component ──
const faqItems = [
  {
    q: "어떤 암호화폐로 결제할 수 있나요?",
    a: "USDT, USDC, ETH, BTC를 지원합니다. USDT와 USDC는 ERC20 및 TRC20 네트워크를 통해 전송할 수 있습니다.",
    icons: [UsdtLogo, UsdcLogo, EthLogo, BtcLogo],
  },
  {
    q: "결제 확인까지 얼마나 걸리나요?",
    a: "네트워크에 따라 다릅니다. ERC20 네트워크는 보통 5~15분, TRC20은 1~5분, BTC는 10~60분 정도 소요됩니다.",
    icons: [EthLogo, BtcLogo],
  },
  {
    q: "잘못된 네트워크로 전송하면 어떻게 되나요?",
    a: "잘못된 네트워크로 전송된 자산은 복구가 불가능할 수 있습니다. 반드시 지정된 네트워크를 확인 후 전송해주세요.",
    icons: [AlertTriangle as any],
  },
  {
    q: "최소 결제 금액이 있나요?",
    a: "최소 결제 금액은 $5 USD 상당입니다. 네트워크 수수료(가스비)는 별도이므로 충분한 금액을 전송해주세요.",
    icons: [UsdtLogo, UsdcLogo],
  },
  {
    q: "환불은 어떻게 받을 수 있나요?",
    a: "환불은 원래 전송한 지갑 주소로 동일한 암호화폐로 진행됩니다. 환불 요청은 고객센터로 문의해주세요. 처리까지 영업일 기준 3~5일 소요됩니다.",
    icons: [UsdtLogo],
  },
  {
    q: "USDT와 USDC의 차이점은 무엇인가요?",
    a: "USDT(Tether)와 USDC(USD Coin)는 모두 1 USD에 페깅된 스테이블코인입니다. USDT는 Tether Limited가, USDC는 Circle이 발행합니다. 두 코인 모두 ERC20과 TRC20 네트워크를 지원합니다.",
    icons: [UsdtLogo, UsdcLogo],
  },
  {
    q: "결제 시간이 초과되면 어떻게 하나요?",
    a: "결제 시간(30분)이 초과되면 해당 결제는 자동 취소됩니다. 이미 전송한 경우 고객센터로 트랜잭션 해시를 보내주시면 수동으로 확인해드립니다.",
    icons: [Clock as any],
  },
];

function CryptoFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">자주 묻는 질문</h3>
      </div>
      <div className="space-y-2">
        {faqItems.map((item, idx) => (
          <div key={idx} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium">{item.q}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {item.icons.map((Icon, i) => (
                    <Icon key={i} className="w-4 h-4" />
                  ))}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  openIndex === idx ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === idx && (
              <div className="px-3 pb-3 text-sm text-muted-foreground border-t bg-muted/20">
                <p className="pt-2">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link href="/payment-troubleshooting" className="text-sm text-primary hover:underline">
          결제 문제 해결 가이드 보기 →
        </Link>
      </div>
    </div>
  );
}

export default function CryptoPayment() {
  const { t } = useTranslation();
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
    toast.success(t("cp.clipboardCopySuccess"));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">{t("cp.loginRequired")}</p>
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
          <ArrowLeft className="w-4 h-4" /> {t("cp.returnToPricing")}
        </Link>

        {/* Status: Completed */}
        {status === "completed" && (
          <Card className="border-green-500/30 bg-green-950/20">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-400 mb-2">{t("cp.paymentCompletedTitle")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("cp.paymentCompletedDesc")}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/my-subscription")}>
                  {t("cp.checkMySubscription")}
                </Button>
                <Button variant="outline" onClick={() => navigate("/studio")}>
                  {t("cp.goToStudio")}
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
                {isExpired ? t("cp.paymentExpiredTitle") : t("cp.paymentFailedTitle")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isExpired
                  ? t("cp.paymentExpiredDesc")
                  : t("cp.paymentFailedDesc")}
              </p>
              <Button onClick={() => navigate("/pricing")}>
                {t("cp.retry")}
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
                  <span className="text-sm text-amber-400">{t("cp.paymentTimeLeft")}</span>
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
                  <h2 className="text-xl font-bold mb-1">{t("cp.cryptoPaymentTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("cp.cryptoPaymentDesc")}
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
                  <div className="text-xs text-muted-foreground mb-1">{t("cp.transferAmount")}</div>
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
                    <Copy className="w-3 h-3 mr-1" /> {t("cp.copyAmount")}
                  </Button>
                </div>

                {/* Wallet Address */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-muted-foreground mb-2 text-center">{t("cp.recipientAddress")}</div>

                  {/* QR Code placeholder - using a simple visual representation */}
                  <div className="flex justify-center mb-3">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="w-32 h-32 bg-gradient-to-br from-slate-800 via-slate-600 to-slate-800 rounded flex items-center justify-center">
                        <div className="text-center">
                          <Wallet className="w-8 h-8 text-white mx-auto mb-1" />
                          <span className="text-[8px] text-white/80 block">QR Code</span>
                          <span className="text-[7px] text-white/60 block">{t("cp.scanToSend")}</span>
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
                      <Copy className="w-3 h-3 mr-1" /> {t("cp.copyAddress")}
                    </Button>
                    {explorerUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(explorerUrl, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> {t("cp.explorer")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-400/80 space-y-1">
                      <p><strong>{NETWORK_NAMES[cryptoDetail.network]}</strong> {t("cp.warningNetwork")}</p>
                      <p>{t("cp.warningLoss")}</p>
                      <p>{t("cp.warningAmount")}</p>
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("cp.waitingForDeposit")}</span>
                </div>

                {/* CryptoFAQ Component */}
                <CryptoFAQ />
              </CardContent>
            </Card>
          </>
        )}

        {/* Fallback for invalid state */}
        {!isLoading && !cryptoDetail && status !== 'completed' && status !== 'failed' && !isExpired && (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-amber-400 mb-2">{t("cp.paymentInfoErrorTitle")}</h2>
                    <p className="text-muted-foreground mb-6">{t("cp.paymentInfoErrorDesc")}</p>
                    <Button onClick={() => navigate('/pricing')}>{t("cp.returnToPricing")}</Button>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
