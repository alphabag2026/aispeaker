import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  X,
  Sparkles,
  Crown,
  Building2,
  Zap,
  Rocket,
  Briefcase,
  Calculator,
  TrendingUp,
  CreditCard,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PLAN_ICONS: Record<string, any> = {
  free: Zap,
  starter: Rocket,
  professional: Crown,
  business: Briefcase,
  enterprise: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  free: "from-slate-600 to-slate-700",
  starter: "from-blue-600 to-cyan-700",
  professional: "from-violet-600 to-purple-700",
  business: "from-amber-600 to-orange-700",
  enterprise: "from-rose-600 to-red-800",
};

const PLAN_BUTTON_STYLES: Record<string, string> = {
  free: "",
  starter: "bg-blue-600 hover:bg-blue-700",
  professional: "bg-purple-600 hover:bg-purple-700",
  business: "bg-amber-600 hover:bg-amber-700",
  enterprise: "bg-rose-700 hover:bg-rose-800",
};

const CREDIT_PRICING = [
  { action: "AI 스크립트 생성", credits: 5, description: "10분 분량 강의 스크립트 1건" },
  { action: "TTS 음성 변환", credits: 10, description: "5분 분량 고품질 음성 생성" },
  { action: "AI 아바타 영상 (5분)", credits: 100, description: "D-ID 기반 아바타 영상 제작" },
  { action: "딥페이크 얼굴 변환", credits: 120, description: "얼굴 변환 + 영상 합성" },
  { action: "썸네일 자동 생성", credits: 5, description: "AI 이미지 기반 썸네일" },
  { action: "자막 자동 생성", credits: 3, description: "STT 기반 SRT 자막 파일" },
  { action: "음성 변조 적용", credits: 15, description: "피치/톤/말투 변환 적용" },
  { action: "라이브 방송 (시간당)", credits: 50, description: "실시간 AI 강의 방송" },
];

// Matches server-side CREDIT_PACKAGES in stripe.ts
const CREDIT_PACKAGE_MAP = [
  { id: "credits_50", name: "Basic", credits: 50, price: 15, perCredit: 0.30 },
  { id: "credits_200", name: "Standard", credits: 200, price: 50, perCredit: 0.25 },
  { id: "credits_500", name: "Premium", credits: 500, price: 100, perCredit: 0.20 },
  { id: "credits_2000", name: "Bulk", credits: 2000, price: 300, perCredit: 0.15 },
];

type PaymentMethod = "stripe" | "crypto";
type CryptoCurrency = "USDT" | "USDC" | "ETH" | "BTC";

export default function Pricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency>("USDT");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const { data: plans = [], isLoading } = trpc.plan.list.useQuery();

  // Stripe mutations
  const stripeSubscription = trpc.payment.createSubscriptionCheckout.useMutation();
  const stripeCreditPurchase = trpc.payment.createCreditCheckout.useMutation();
  // Crypto mutation
  const cryptoPayment = trpc.crypto.createPayment.useMutation();

  const handleSubscribe = async (planSlug: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      window.location.href = getLoginUrl();
      return;
    }
    if (planSlug === "free") {
      toast.success("Free 플랜이 활성화되었습니다!");
      navigate("/my-subscription");
      return;
    }
    if (planSlug === "enterprise") {
      toast.info("Enterprise 플랜은 영업팀에 문의해주세요.\ncontact@virtualspeaker.ai");
      return;
    }

    setLoadingPlan(planSlug);
    try {
      if (paymentMethod === "stripe") {
        const result = await stripeSubscription.mutateAsync({
          planSlug,
          billingCycle: isYearly ? "yearly" : "monthly",
          origin: window.location.origin,
        });
        if (result.checkoutUrl) {
          toast.info("Stripe 결제 페이지로 이동합니다...");
          window.open(result.checkoutUrl, "_blank");
        }
      } else {
        const result = await cryptoPayment.mutateAsync({
          type: "subscription",
          planSlug,
          billingCycle: isYearly ? "yearly" : "monthly",
          cryptoCurrency: selectedCrypto,
          network: selectedCrypto === "BTC" ? "bitcoin" : "ethereum",
        });
        navigate(`/crypto-payment/${result.paymentId}`);
      }
    } catch (e: any) {
      toast.error(e.message || "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      window.location.href = getLoginUrl();
      return;
    }

    setLoadingPackage(packageId);
    try {
      if (paymentMethod === "stripe") {
        const result = await stripeCreditPurchase.mutateAsync({
          packageId,
          origin: window.location.origin,
        });
        if (result.checkoutUrl) {
          toast.info("Stripe 결제 페이지로 이동합니다...");
          window.open(result.checkoutUrl, "_blank");
        }
      } else {
        const result = await cryptoPayment.mutateAsync({
          type: "credit_package",
          packageId,
          cryptoCurrency: selectedCrypto,
          network: selectedCrypto === "BTC" ? "bitcoin" : "ethereum",
        });
        navigate(`/crypto-payment/${result.paymentId}`);
      }
    } catch (e: any) {
      toast.error(e.message || "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setLoadingPackage(null);
    }
  };

  const getButtonLabel = (slug: string) => {
    const labels: Record<string, string> = {
      free: "무료로 시작",
      starter: "Starter 시작하기",
      professional: "Professional 시작하기",
      business: "Business 시작하기",
      enterprise: "영업팀 문의",
    };
    return labels[slug] || "시작하기";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 py-20">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10 text-center">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-4">
            <Sparkles className="w-3 h-3 mr-1" /> 수익성 높은 가격 모델
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            비즈니스에 맞는 플랜을 선택하세요
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            크레딧 기반 사용량 과금으로 필요한 만큼만 사용하세요.
            <br />
            모든 유료 플랜에 <span className="text-cyan-400 font-semibold">14일 무료 체험</span>이 포함됩니다.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`text-sm ${!isYearly ? "text-white font-medium" : "text-slate-400"}`}>월간</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "text-white font-medium" : "text-slate-400"}`}>
              연간{" "}
              <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400 border-0 text-[10px]">
                최대 20% 할인
              </Badge>
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400 mr-2">결제 수단:</span>
            <Button
              size="sm"
              variant={paymentMethod === "stripe" ? "default" : "outline"}
              className={`text-xs h-8 ${paymentMethod === "stripe" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}
              onClick={() => setPaymentMethod("stripe")}
            >
              <CreditCard className="w-3 h-3 mr-1" /> 카드 결제
            </Button>
            <Button
              size="sm"
              variant={paymentMethod === "crypto" ? "default" : "outline"}
              className={`text-xs h-8 ${paymentMethod === "crypto" ? "bg-orange-600 hover:bg-orange-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}
              onClick={() => setPaymentMethod("crypto")}
            >
              <Wallet className="w-3 h-3 mr-1" /> 암호화폐
            </Button>
          </div>

          {/* Crypto currency selector */}
          {paymentMethod === "crypto" && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {(["USDT", "USDC", "ETH", "BTC"] as CryptoCurrency[]).map((coin) => (
                <Button
                  key={coin}
                  size="sm"
                  variant={selectedCrypto === coin ? "default" : "outline"}
                  className={`text-xs h-7 px-3 ${selectedCrypto === coin ? "bg-amber-600" : "border-slate-600 text-slate-400 hover:bg-slate-800"}`}
                  onClick={() => setSelectedCrypto(coin)}
                >
                  {coin}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plans Grid - 5 columns */}
      <div className="container py-16 -mt-8">
        {isLoading ? (
          <div className="grid md:grid-cols-5 gap-4 max-w-7xl mx-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-8 bg-muted rounded w-1/3" />
                  <div className="h-12 bg-muted rounded w-1/2" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-muted rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-4 max-w-7xl mx-auto">
            {plans
              .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
              .map((plan: any) => {
                const Icon = PLAN_ICONS[plan.slug] || Zap;
                const isProfessional = plan.slug === "professional";
                const price = isYearly
                  ? plan.priceYearly ? Math.round(plan.priceYearly / 12) : 0
                  : plan.priceMonthly;
                const features = Array.isArray(plan.features) ? plan.features : [];
                const isLoadingThis = loadingPlan === plan.slug;

                return (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isProfessional
                        ? "border-purple-500/50 shadow-xl shadow-purple-500/10 scale-[1.03] z-10"
                        : "border-border/50"
                    }`}
                  >
                    {isProfessional && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                        MOST POPULAR
                      </div>
                    )}
                    <CardHeader
                      className={`bg-gradient-to-br ${PLAN_COLORS[plan.slug] || "from-slate-600 to-slate-700"} text-white p-4`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <CardTitle className="text-sm font-bold">{plan.name}</CardTitle>
                      </div>
                      <div className="mt-1">
                        {plan.slug === "enterprise" ? (
                          <div className="text-2xl font-bold">문의</div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              ${(price / 100).toFixed(0)}
                            </span>
                            <span className="text-white/70 text-xs">/월</span>
                          </div>
                        )}
                        {isYearly && plan.priceYearly > 0 && (
                          <p className="text-[10px] text-white/60 mt-0.5">
                            연 ${(plan.priceYearly / 100).toFixed(0)} 결제
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] text-white/80 mt-1">{plan.description}</p>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Credits highlight */}
                      <div className="bg-muted/50 rounded-lg p-2 mb-3 text-center">
                        <div className="text-lg font-bold text-foreground">
                          {plan.monthlyCredits.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">월 크레딧</div>
                      </div>

                      {/* Features */}
                      <div className="space-y-1.5 mb-4">
                        {features.map((feature: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-[11px] text-foreground/80">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Key specs */}
                      <div className="border-t border-border/50 pt-3 space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">영상 품질</span>
                          <span className="font-medium">{plan.maxVideoQuality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">딥페이크</span>
                          {plan.hasDeepfake ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">라이브 방송</span>
                          {plan.hasLiveBroadcast ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">화이트라벨</span>
                          {plan.hasWhiteLabel ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                      </div>

                      <Button
                        className={`w-full mt-4 text-xs ${PLAN_BUTTON_STYLES[plan.slug] || ""}`}
                        variant={isProfessional ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSubscribe(plan.slug)}
                        disabled={isLoadingThis}
                      >
                        {isLoadingThis ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 처리 중...</>
                        ) : (
                          <>
                            {paymentMethod === "crypto" && plan.slug !== "free" && plan.slug !== "enterprise" && (
                              <Wallet className="w-3 h-3 mr-1" />
                            )}
                            {getButtonLabel(plan.slug)}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Credit Pricing Table */}
      <div className="bg-muted/30 py-16">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-3">
              <CreditCard className="w-3 h-3 mr-1" /> 크레딧 시스템
            </Badge>
            <h2 className="text-3xl font-bold mb-3">기능별 크레딧 사용량</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              각 AI 기능은 사용량에 따라 크레딧이 차감됩니다. 플랜에 포함된 월 크레딧을 사용하거나, 추가 크레딧 패키지를 구매할 수 있습니다.
            </p>
          </div>

          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-left p-4 font-semibold">기능</th>
                    <th className="text-center p-4 font-semibold">크레딧</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">설명</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_PRICING.map((item, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">{item.action}</td>
                      <td className="p-4 text-center">
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {item.credits} 크레딧
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Additional Credit Packages */}
      <div className="container py-16 max-w-5xl">
        <div className="text-center mb-10">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-3">
            <TrendingUp className="w-3 h-3 mr-1" /> 추가 크레딧
          </Badge>
          <h2 className="text-3xl font-bold mb-3">크레딧이 부족하신가요?</h2>
          <p className="text-muted-foreground">
            월 포함 크레딧을 모두 사용하셨다면, 추가 크레딧 패키지를 구매하세요.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {CREDIT_PACKAGE_MAP.map((pkg) => {
            const isLoadingThis = loadingPackage === pkg.id;
            return (
              <Card key={pkg.id} className="border-border/50 hover:border-amber-500/30 transition-colors">
                <CardContent className="p-6 text-center">
                  <h3 className="font-bold text-lg mb-1">{pkg.name}</h3>
                  <div className="text-3xl font-bold text-amber-500 mb-1">
                    {pkg.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">크레딧</div>
                  <div className="text-2xl font-bold mb-1">${pkg.price}</div>
                  <div className="text-xs text-muted-foreground mb-4">
                    크레딧당 ${pkg.perCredit.toFixed(2)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={isLoadingThis}
                  >
                    {isLoadingThis ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 처리 중...</>
                    ) : (
                      <>
                        {paymentMethod === "crypto" ? (
                          <><Wallet className="w-3 h-3 mr-1" /> {selectedCrypto}로 구매</>
                        ) : (
                          <><CreditCard className="w-3 h-3 mr-1" /> 카드로 구매</>
                        )}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Test card info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            테스트 결제: 카드번호 <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">4242 4242 4242 4242</code> / 만료일: 미래 날짜 / CVC: 아무 숫자 3자리
          </p>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 py-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-10">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-3">
              <Calculator className="w-3 h-3 mr-1" /> ROI 계산
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">
              Virtual Speaker로 얼마나 절약할 수 있을까요?
            </h2>
            <p className="text-slate-400">
              전통적인 강의 영상 제작 대비 비용 절감 효과
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-red-950/30 border-red-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4">기존 방식 (월 10건 강의)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>영상 촬영 스튜디오 대여</span>
                    <span className="font-medium">$500</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>카메라맨 + 편집자 인건비</span>
                    <span className="font-medium">$2,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>강사 출연료 (10건)</span>
                    <span className="font-medium">$3,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>자막 + 번역 비용</span>
                    <span className="font-medium">$500</span>
                  </div>
                  <div className="border-t border-red-500/20 pt-3 flex justify-between text-red-400 font-bold text-lg">
                    <span>월 총 비용</span>
                    <span>$6,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-950/30 border-green-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4">Virtual Speaker (월 10건 강의)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Professional 구독</span>
                    <span className="font-medium">$99</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>추가 크레딧 (500)</span>
                    <span className="font-medium">$100</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>스튜디오/인건비</span>
                    <span className="font-medium text-green-400">$0</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>자막 자동 생성</span>
                    <span className="font-medium text-green-400">포함</span>
                  </div>
                  <div className="border-t border-green-500/20 pt-3 flex justify-between text-green-400 font-bold text-lg">
                    <span>월 총 비용</span>
                    <span>$199</span>
                  </div>
                </div>
                <div className="mt-4 bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">96.7% 절약</div>
                  <div className="text-xs text-green-400/70">월 $5,801 절감</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container py-16 max-w-3xl">
        <div className="text-center mb-10">
          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 mb-3">
            <HelpCircle className="w-3 h-3 mr-1" /> FAQ
          </Badge>
          <h2 className="text-3xl font-bold mb-3">자주 묻는 질문</h2>
        </div>
        <div className="space-y-3">
          {[
            {
              q: "크레딧은 어떻게 작동하나요?",
              a: "각 AI 기능(스크립트 생성, TTS, 아바타 영상 등)은 사용 시 크레딧이 차감됩니다. 구독 플랜에 포함된 월 크레딧이 매월 자동 충전되며, 부족 시 추가 크레딧 패키지를 구매할 수 있습니다. 미사용 크레딧은 다음 달로 이월되지 않습니다.",
            },
            {
              q: "어떤 결제 수단을 지원하나요?",
              a: "Stripe를 통한 신용카드/체크카드 결제와 암호화폐(USDT, USDC, ETH, BTC) 결제를 모두 지원합니다. 암호화폐 결제 시 Ethereum, BSC, Polygon, Tron, Bitcoin 네트워크를 사용할 수 있습니다.",
            },
            {
              q: "5분 강의 영상 1건에 크레딧이 얼마나 드나요?",
              a: "스크립트 생성(5) + TTS 음성(10) + 아바타 영상(100) + 썸네일(5) + 자막(3) = 약 123 크레딧입니다. Professional 플랜(500 크레딧)이면 월 4건, Business 플랜(2,000 크레딧)이면 월 16건 정도 제작 가능합니다.",
            },
            {
              q: "크레딧이 부족하면 어떻게 되나요?",
              a: "기능 사용 시 크레딧이 부족하면 자동으로 안내 모달이 표시됩니다. 모달에서 바로 크레딧 충전 페이지로 이동하거나, 플랜 업그레이드를 할 수 있습니다.",
            },
            {
              q: "API 비용은 누가 부담하나요?",
              a: "모든 AI API 비용(D-ID, OpenAI TTS, LLM 등)은 크레딧 가격에 이미 포함되어 있습니다. 별도의 외부 API 키를 준비하실 필요가 없습니다. 저희가 모든 인프라를 관리합니다.",
            },
            {
              q: "플랜 변경은 어떻게 하나요?",
              a: "언제든지 업그레이드 또는 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며 차액이 청구됩니다. 다운그레이드는 현재 결제 기간 종료 후 적용됩니다.",
            },
          ].map((faq, i) => (
            <Card
              key={i}
              className="border-border/50 cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{faq.q}</h3>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                {openFaq === i && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{faq.a}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 py-16">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">지금 시작하세요</h2>
          <p className="text-slate-300 mb-6">
            무료로 체험하고, 비즈니스에 맞는 플랜으로 업그레이드하세요.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleSubscribe("starter")}>
              Starter 시작하기
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handleSubscribe("enterprise")}>
              영업팀 문의
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
