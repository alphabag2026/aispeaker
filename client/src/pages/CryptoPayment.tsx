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

                {/* FAQ */}
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("cp.faqTitle")}</h3>
                  </div>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-semibold">{t("cp.faq1_q")}</p>
                      <p className="text-muted-foreground">{t("cp.faq1_a")}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{t("cp.faq2_q")}</p>
                      <p className="text-muted-foreground">{t("cp.faq2_a")}</p>
                    </div>
                    <div>
                      <p className="font-semibold">{t("cp.faq3_q")}</p>
                      <p className="text-muted-foreground">{t("cp.faq3_a")}</p>
                    </div>
                  </div>
                </div>
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
