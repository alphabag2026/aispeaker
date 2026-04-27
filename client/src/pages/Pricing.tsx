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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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

  const CREDIT_PRICING = [
    { action: t("pp.ci.script"), credits: 5, description: t("pp.ci.script_desc") },
    { action: t("pp.ci.tts"), credits: 3, description: t("pp.ci.tts_desc") },
    { action: t("pp.ci.avatar"), credits: 20, description: t("pp.ci.avatar_desc") },
    { action: t("pp.ci.deepfake"), credits: 30, description: t("pp.ci.deepfake_desc") },
    { action: t("pp.ci.thumbnail"), credits: 2, description: t("pp.ci.thumbnail_desc") },
    { action: t("pp.ci.subtitle"), credits: 3, description: t("pp.ci.subtitle_desc") },
    { action: t("pp.ci.voice_mod"), credits: 5, description: t("pp.ci.voice_mod_desc") },
    { action: t("pp.ci.live"), credits: 10, description: t("pp.ci.live_desc") },
    // v8.1 AI Studio features
    { action: "AI 이미지 생성", credits: 5, description: "AI Studio 이미지 생성 1건" },
    { action: "배경 제거/교체", credits: 3, description: "AI 배경 제거 또는 교체 1건" },
    { action: "음성 복제", credits: 5, description: "음성 복제(Voice Clone) 1건" },
    { action: "음성 변환", credits: 3, description: "음성 변환(Voice Change) 1건" },
    { action: "비디오 이펙트", credits: 15, description: "V2V 스타일 변환 1건" },
    { action: "이미지→비디오", credits: 20, description: "Kling I2V 생성 1건" },
    { action: "페이스 스왑", credits: 25, description: "AI 얼굴 변환 1건" },
    { action: "토킹 아바타", credits: 20, description: "AI 토킹 아바타 1건" },
    { action: "비디오 번역", credits: 30, description: "AI 비디오 번역 1건" },
  ];

  const handleSubscribe = async (planSlug: string) => {
    if (!user) {
      toast.error(t("pp.toast.login_required"));
      window.location.href = getLoginUrl();
      return;
    }
    if (planSlug === "free") {
      toast.success(t("pp.toast.free_activated"));
      navigate("/my-subscription");
      return;
    }
    if (planSlug === "enterprise") {
      toast.info(t("pp.toast.enterprise_contact"));
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
          toast.info(t("pp.toast.stripe_redirect"));
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
      toast.error(e.message || t("pp.toast.payment_error"));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    if (!user) {
      toast.error(t("pp.toast.login_required"));
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
          toast.info(t("pp.toast.stripe_redirect"));
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
      toast.error(e.message || t("pp.toast.payment_error"));
    } finally {
      setLoadingPackage(null);
    }
  };

  const getButtonLabel = (slug: string) => {
    const key = `pp.plan.${slug}`;
    return t(key) || t("pp.plan.start");
  };

  const faqs = [
    { q: t("pp.faq.q1"), a: t("pp.faq.a1") },
    { q: t("pp.faq.q2"), a: t("pp.faq.a2") },
    { q: t("pp.faq.q3"), a: t("pp.faq.a3") },
    { q: t("pp.faq.q4"), a: t("pp.faq.a4") },
    { q: t("pp.faq.q5"), a: t("pp.faq.a5") },
    { q: t("pp.faq.q6"), a: t("pp.faq.a6") },
  ];

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
            <Sparkles className="w-3 h-3 mr-1" /> {t("pp.hero.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("pp.hero.title")}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            {t("pp.hero.desc1")}
            <br />
            {t("pp.hero.desc2")}<span className="text-cyan-400 font-semibold">{t("pp.hero.trial")}</span>{t("pp.hero.desc3")}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={`text-sm ${!isYearly ? "text-white font-medium" : "text-slate-400"}`}>{t("pp.hero.monthly")}</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "text-white font-medium" : "text-slate-400"}`}>
              {t("pp.hero.yearly")}{" "}
              <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400 border-0 text-[10px]">
                {t("pp.hero.discount")}
              </Badge>
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400 mr-2">{t("pp.hero.payment")}</span>
            <Button
              size="sm"
              variant={paymentMethod === "stripe" ? "default" : "outline"}
              className={`text-xs h-8 ${paymentMethod === "stripe" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}
              onClick={() => setPaymentMethod("stripe")}
            >
              <CreditCard className="w-3 h-3 mr-1" /> {t("pp.hero.card")}
            </Button>
            <Button
              size="sm"
              variant={paymentMethod === "crypto" ? "default" : "outline"}
              className={`text-xs h-8 ${paymentMethod === "crypto" ? "bg-orange-600 hover:bg-orange-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}
              onClick={() => setPaymentMethod("crypto")}
            >
              <Wallet className="w-3 h-3 mr-1" /> {t("pp.hero.crypto")}
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
                        {t("pp.plan.most_popular")}
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
                          <div className="text-2xl font-bold">{t("pp.plan.inquiry")}</div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              ${(price / 100).toFixed(0)}
                            </span>
                            <span className="text-white/70 text-xs">{t("pp.plan.per_month")}</span>
                          </div>
                        )}
                        {isYearly && plan.priceYearly > 0 && (
                          <p className="text-[10px] text-white/60 mt-0.5">
                            {t("pp.plan.yearly_billing").replace("${amount}", (plan.priceYearly / 100).toFixed(0))}
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
                        <div className="text-[10px] text-muted-foreground">{t("pp.plan.monthly_credits")}</div>
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
                          <span className="text-muted-foreground">{t("pp.spec.video_quality")}</span>
                          <span className="font-medium">{plan.maxVideoQuality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pp.spec.deepfake")}</span>
                          {plan.hasDeepfake ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pp.spec.live_broadcast")}</span>
                          {plan.hasLiveBroadcast ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("pp.spec.white_label")}</span>
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
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("pp.plan.processing")}</>
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
              <CreditCard className="w-3 h-3 mr-1" /> {t("pp.credit.badge")}
            </Badge>
            <h2 className="text-3xl font-bold mb-3">{t("pp.credit.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("pp.credit.desc")}
            </p>
          </div>

          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/50">
                    <th className="text-left p-4 font-semibold">{t("pp.credit.feature")}</th>
                    <th className="text-center p-4 font-semibold">{t("pp.credit.credits")}</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("pp.credit.description")}</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_PRICING.map((item, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">{item.action}</td>
                      <td className="p-4 text-center">
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {item.credits} {t("pp.credit.unit")}
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
            <TrendingUp className="w-3 h-3 mr-1" /> {t("pp.extra.badge")}
          </Badge>
          <h2 className="text-3xl font-bold mb-3">{t("pp.extra.title")}</h2>
          <p className="text-muted-foreground">
            {t("pp.extra.desc")}
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
                  <div className="text-xs text-muted-foreground mb-3">{t("pp.extra.credits")}</div>
                  <div className="text-2xl font-bold mb-1">${pkg.price}</div>
                  <div className="text-xs text-muted-foreground mb-4">
                    {t("pp.extra.per_credit")} ${pkg.perCredit.toFixed(2)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={isLoadingThis}
                  >
                    {isLoadingThis ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("pp.plan.processing")}</>
                    ) : (
                      <>
                        {paymentMethod === "crypto" ? (
                          <><Wallet className="w-3 h-3 mr-1" /> {selectedCrypto}{t("pp.extra.buy_crypto")}</>
                        ) : (
                          <><CreditCard className="w-3 h-3 mr-1" /> {t("pp.extra.buy_card")}</>
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
            {t("pp.extra.test_info")} <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">4242 4242 4242 4242</code> / {t("pp.extra.test_expiry")}
          </p>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 py-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-10">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-3">
              <Calculator className="w-3 h-3 mr-1" /> {t("pp.roi.badge")}
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">
              {t("pp.roi.title")}
            </h2>
            <p className="text-slate-400">
              {t("pp.roi.desc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-red-950/30 border-red-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4">{t("pp.roi.traditional")}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.studio")}</span>
                    <span className="font-medium">$500</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.crew")}</span>
                    <span className="font-medium">$2,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.instructor")}</span>
                    <span className="font-medium">$3,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.subtitle_cost")}</span>
                    <span className="font-medium">$500</span>
                  </div>
                  <div className="border-t border-red-500/20 pt-3 flex justify-between text-red-400 font-bold text-lg">
                    <span>{t("pp.roi.total")}</span>
                    <span>$6,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-950/30 border-green-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4">{t("pp.roi.ai_speaker")}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.pro_sub")}</span>
                    <span className="font-medium">$99</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.extra_credits")}</span>
                    <span className="font-medium">$100</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.studio_cost")}</span>
                    <span className="font-medium text-green-400">$0</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("pp.roi.auto_subtitle")}</span>
                    <span className="font-medium text-green-400">{t("pp.roi.included")}</span>
                  </div>
                  <div className="border-t border-green-500/20 pt-3 flex justify-between text-green-400 font-bold text-lg">
                    <span>{t("pp.roi.total")}</span>
                    <span>$199</span>
                  </div>
                </div>
                <div className="mt-4 bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">96.7% {t("pp.roi.savings")}</div>
                  <div className="text-xs text-green-400/70">{t("pp.roi.savings_amount")}</div>
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
            <HelpCircle className="w-3 h-3 mr-1" /> {t("pp.faq.badge")}
          </Badge>
          <h2 className="text-3xl font-bold mb-3">{t("pp.faq.title")}</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
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
        <div className="text-center mt-6">
          <a href="/payment-troubleshooting" className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4">
            {t("pp.faq.troubleshoot")} {/* 문제 해결 가이드 */}
          </a>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 py-16">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">{t("pp.cta.title")}</h2>
          <p className="text-slate-300 mb-6">
            {t("pp.cta.desc")}
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleSubscribe("starter")}>
              {t("pp.cta.starter")}
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handleSubscribe("enterprise")}>
              {t("pp.cta.enterprise")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
