import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, X, Sparkles, Crown, Building2, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";

const PLAN_ICONS: Record<string, any> = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

const PLAN_COLORS: Record<string, string> = {
  free: "from-slate-600 to-slate-700",
  pro: "from-violet-600 to-purple-700",
  enterprise: "from-amber-600 to-orange-700",
};

export default function Pricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const { data: plans = [], isLoading } = trpc.plan.list.useQuery();
  const subscribeMutation = trpc.subscription.subscribe.useMutation();

  const handleSubscribe = async (planSlug: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (planSlug === "enterprise") {
      toast.info("Enterprise 플랜은 영업팀에 문의해주세요. contact@virtualspeaker.ai");
      return;
    }
    try {
      await subscribeMutation.mutateAsync({
        planSlug,
        billingCycle: isYearly ? "yearly" : "monthly",
      });
      toast.success("구독이 활성화되었습니다!");
      navigate("/my-subscription");
    } catch (e: any) {
      toast.error(e.message || "구독 처리 중 오류가 발생했습니다.");
    }
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
            <Sparkles className="w-3 h-3 mr-1" /> 시작하기
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            당신에게 맞는 플랜을 선택하세요
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            무료로 시작하고, 필요에 따라 업그레이드하세요. 모든 플랜에 14일 무료 체험이 포함됩니다.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!isYearly ? "text-white font-medium" : "text-slate-400"}`}>월간</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "text-white font-medium" : "text-slate-400"}`}>
              연간 <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400 border-0 text-[10px]">17% 할인</Badge>
            </span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="container py-16 -mt-8">
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-8 space-y-4">
                  <div className="h-8 bg-muted rounded w-1/3" />
                  <div className="h-12 bg-muted rounded w-1/2" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 bg-muted rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan: any) => {
              const Icon = PLAN_ICONS[plan.slug] || Zap;
              const isPro = plan.slug === "pro";
              const price = isYearly
                ? plan.priceYearly ? Math.round(plan.priceYearly / 12) : 0
                : plan.priceMonthly;
              const features = (plan.features as string[]) || [];

              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    isPro ? "border-purple-500/50 shadow-xl shadow-purple-500/10 scale-[1.02]" : "border-border/50"
                  }`}
                >
                  {isPro && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-violet-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}
                  <CardHeader className={`bg-gradient-to-br ${PLAN_COLORS[plan.slug] || "from-slate-600 to-slate-700"} text-white p-6`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <div className="mt-2">
                      {plan.slug === "enterprise" ? (
                        <div className="text-3xl font-bold">문의</div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">${(price / 100).toFixed(0)}</span>
                          <span className="text-white/70">/월</span>
                        </div>
                      )}
                      {isYearly && plan.priceYearly > 0 && (
                        <p className="text-xs text-white/60 mt-1">
                          연 ${(plan.priceYearly / 100).toFixed(0)} 결제
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-white/80 mt-2">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 mb-6">
                      {features.map((feature: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-foreground/80">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Feature Comparison */}
                    <div className="border-t border-border/50 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">월 크레딧</span>
                        <span className="font-medium">{plan.monthlyCredits >= 99999 ? "무제한" : plan.monthlyCredits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">영상 품질</span>
                        <span className="font-medium">{plan.maxVideoQuality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">얼굴 프리셋</span>
                        <span className="font-medium">{plan.facePresetLimit >= 999 ? "무제한" : plan.facePresetLimit}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">딥페이크</span>
                        {plan.hasDeepfake ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground/30" />}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">라이브 방송</span>
                        {plan.hasLiveBroadcast ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground/30" />}
                      </div>
                    </div>

                    <Button
                      className={`w-full mt-6 ${isPro ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                      variant={isPro ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.slug)}
                      disabled={subscribeMutation.isPending}
                    >
                      {plan.slug === "enterprise" ? "영업팀 문의" : plan.slug === "free" ? "무료로 시작" : "Pro 시작하기"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="container pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">자주 묻는 질문</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { q: "무료 플랜으로 무엇을 할 수 있나요?", a: "월 3회 강의 영상 생성, 기본 TTS 음성 5종, 기본 얼굴 프리셋 3종을 사용할 수 있습니다. 720p 품질의 영상을 만들 수 있습니다." },
            { q: "Pro 플랜은 어떤 추가 기능이 있나요?", a: "무제한 강의 생성, 딥페이크 얼굴 변환, 음성 변조, 외부 플랫폼 연동(Zoom, Google Meet 등), 라이브 방송 기능이 포함됩니다." },
            { q: "크레딧은 어떻게 사용되나요?", a: "영상 생성, TTS 변환, 아바타 생성 등 AI 기능 사용 시 크레딧이 차감됩니다. 매월 자동으로 충전됩니다." },
            { q: "언제든지 플랜을 변경할 수 있나요?", a: "네, 언제든지 업그레이드 또는 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며, 다운그레이드는 현재 결제 기간 종료 후 적용됩니다." },
          ].map((faq, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
