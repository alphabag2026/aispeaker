import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  UserCircle,
  Mic,
  Video,
  FileText,
  Wand2,
  Play,
  Radio,
  CreditCard,
  Rocket,
  ChevronRight,
  Monitor,
  Palette,
  Volume2,
  Layers,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Link } from "wouter";

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  actionLabel: string;
  actionLink: string;
  tip?: string;
  estimatedTime: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "AI 얼굴 선택하기",
    subtitle: "강의에 사용할 AI 강사 페르소나를 선택하세요",
    description:
      "5종의 프리셋 AI 얼굴 중 강의 주제와 대상에 맞는 페르소나를 선택합니다. 각 얼굴은 전문적인 외모와 다양한 연령대, 성별을 제공합니다.",
    icon: <UserCircle className="w-8 h-8" />,
    details: [
      "AI 얼굴 갤러리에서 5종의 프리셋 확인",
      "강의 주제에 맞는 성별, 연령대 선택",
      "미리보기로 실제 영상 모습 확인",
      "커스텀 얼굴 업로드도 가능 (Professional 이상)",
    ],
    actionLabel: "AI 얼굴 갤러리 보기",
    actionLink: "/face-gallery",
    tip: "비즈니스/금융 강의에는 30~40대 전문가 얼굴, 기술/코딩 강의에는 20~30대 얼굴이 효과적입니다.",
    estimatedTime: "약 2분",
  },
  {
    id: 2,
    title: "AI 음성 설정하기",
    subtitle: "강의 음성 스타일과 언어를 설정하세요",
    description:
      "6종의 AI 음성 프리셋에서 강의에 적합한 음성을 선택합니다. 음성 속도, 톤, 피치를 세밀하게 조절할 수 있습니다.",
    icon: <Mic className="w-8 h-8" />,
    details: [
      "AI 음성 갤러리에서 6종 음성 미리듣기",
      "음성 속도 (0.5x ~ 2.0x) 조절",
      "피치, 톤 커스터마이징",
      "한국어, 영어, 중국어, 일본어 등 다국어 지원",
    ],
    actionLabel: "AI 음성 갤러리 보기",
    actionLink: "/voice-gallery",
    tip: "강의 시작 전 30초 분량의 테스트 음성을 생성해보세요. 실제 강의와 동일한 환경에서 음질을 확인할 수 있습니다.",
    estimatedTime: "약 3분",
  },
  {
    id: 3,
    title: "강의 스크립트 작성",
    subtitle: "AI가 강의 대본을 자동으로 생성합니다",
    description:
      "강의 주제와 핵심 키워드만 입력하면 AI가 구조화된 강의 스크립트를 자동으로 생성합니다. 섹션별 편집, 재배치, AI 재생성이 가능합니다.",
    icon: <FileText className="w-8 h-8" />,
    details: [
      "주제 입력 → AI 자동 스크립트 생성",
      "도입-본론-결론 구조 자동 구성",
      "섹션별 드래그 앤 드롭 재배치",
      "템플릿 라이브러리에서 구조 선택 가능",
      "버전 관리로 이전 버전 복원 가능",
    ],
    actionLabel: "스크립트 작성 시작",
    actionLink: "/studio",
    tip: "스크립트 템플릿 라이브러리에 5종의 기본 템플릿이 있습니다. 처음이라면 '도입-본론-결론' 템플릿을 추천합니다.",
    estimatedTime: "약 5~10분",
  },
  {
    id: 4,
    title: "영상 제작 파이프라인",
    subtitle: "원클릭으로 AI 강의 영상을 제작하세요",
    description:
      "스크립트, AI 얼굴, AI 음성을 조합하여 원클릭으로 완성된 강의 영상을 제작합니다. 자동 자막 생성과 썸네일 생성도 포함됩니다.",
    icon: <Wand2 className="w-8 h-8" />,
    details: [
      "스크립트 선택 → 얼굴/음성 설정 → 제작 시작",
      "D-ID API 기반 고품질 아바타 영상 생성",
      "자동 자막(SRT) 생성 및 다운로드",
      "AI 썸네일 자동 생성",
      "배치 처리로 최대 10개 동시 제작",
    ],
    actionLabel: "제작 스튜디오 열기",
    actionLink: "/studio",
    tip: "5분 강의 기준 약 20~40 크레딧이 소요됩니다. 먼저 1분짜리 테스트 영상을 만들어보세요.",
    estimatedTime: "약 3~10분 (영상 길이에 따라)",
  },
  {
    id: 5,
    title: "라이브 방송 시작",
    subtitle: "Zoom, Google Meet에서 AI 강사로 실시간 강의하세요",
    description:
      "제작된 AI 강의를 OBS 가상 카메라를 통해 Zoom, Google Meet, Tencent Meeting 등 외부 플랫폼에서 실시간 방송할 수 있습니다.",
    icon: <Radio className="w-8 h-8" />,
    details: [
      "OBS Studio 가상 카메라 설정 (튜토리얼 제공)",
      "Zoom, Google Meet, Tencent Meeting 연동",
      "실시간 슬라이드 제어 및 TTS 오디오",
      "시청자 채팅 및 Q&A 기능",
      "방송 녹화 및 VOD 자동 아카이브",
    ],
    actionLabel: "방송 관리 페이지",
    actionLink: "/broadcasts",
    tip: "첫 방송 전 OBS 튜토리얼 페이지를 반드시 확인하세요. 가상 카메라 설정이 핵심입니다.",
    estimatedTime: "초기 설정 약 15분",
  },
  {
    id: 6,
    title: "크레딧 관리 및 최적화",
    subtitle: "효율적인 크레딧 사용으로 비용을 절감하세요",
    description:
      "크레딧 사용량을 모니터링하고, 기능별 크레딧 소비를 최적화하여 비용 대비 최대 효과를 얻으세요.",
    icon: <CreditCard className="w-8 h-8" />,
    details: [
      "내 구독 페이지에서 크레딧 잔액 확인",
      "기능별 크레딧 소비량 분석",
      "크레딧 패키지 추가 구매 (최대 40% 할인)",
      "월간 사용량 리포트 확인",
      "자동 충전 알림 설정",
    ],
    actionLabel: "크레딧 관리",
    actionLink: "/my-subscription",
    tip: "연간 구독 시 20% 할인, 대량 크레딧 패키지 구매 시 최대 40% 할인이 적용됩니다.",
    estimatedTime: "약 2분",
  },
];

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / tutorialSteps.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border-b border-border/30">
        <div className="container py-12 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/20">
              <Rocket className="w-6 h-6 text-purple-400" />
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              결제 완료
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            시작 가이드
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            AI 강의 플랫폼의 핵심 기능을 단계별로 안내합니다.
            아래 6단계를 따라하면 첫 AI 강의 영상을 제작하고 라이브 방송까지 진행할 수 있습니다.
          </p>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-mono font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedSteps.size}/{tutorialSteps.length} 단계 완료
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* Step Navigation Sidebar */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-1">
              {tutorialSteps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    currentStep === index
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 shrink-0 ${
                        currentStep === index
                          ? "text-purple-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        currentStep === index
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {step.estimatedTime}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div>
            {tutorialSteps.map((step, index) => {
              if (index !== currentStep) return null;
              const isCompleted = completedSteps.has(step.id);

              return (
                <div key={step.id} className="space-y-6">
                  {/* Step Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        Step {step.id}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {step.estimatedTime}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                        {step.icon}
                      </div>
                      {step.title}
                    </h2>
                    <p className="text-muted-foreground mt-1">{step.subtitle}</p>
                  </div>

                  {/* Description */}
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <p className="text-sm text-foreground leading-relaxed mb-4">
                        {step.description}
                      </p>

                      {/* Detail List */}
                      <div className="space-y-2">
                        {step.details.map((detail, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-muted-foreground">
                              {detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tip */}
                  {step.tip && (
                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-blue-400 block mb-1">
                            PRO TIP
                          </span>
                          <p className="text-sm text-blue-300/80">{step.tip}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={step.actionLink}>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        {step.actionLabel}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      variant={isCompleted ? "secondary" : "outline"}
                      onClick={() => toggleComplete(step.id)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          완료됨
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          완료로 표시
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => setCurrentStep(index - 1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      이전 단계
                    </Button>
                    {index < tutorialSteps.length - 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(index + 1)}
                      >
                        다음 단계
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Link href="/studio">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Rocket className="w-4 h-4 mr-1" />
                          제작 시작하기
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 border-t border-border/30 pt-8">
          <h3 className="text-lg font-bold mb-4">빠른 링크</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: <Palette className="w-4 h-4" />, label: "AI 얼굴 갤러리", href: "/face-gallery" },
              { icon: <Volume2 className="w-4 h-4" />, label: "AI 음성 갤러리", href: "/voice-gallery" },
              { icon: <Video className="w-4 h-4" />, label: "제작 스튜디오", href: "/studio" },
              { icon: <Layers className="w-4 h-4" />, label: "스크립트 템플릿", href: "/script-templates" },
              { icon: <Monitor className="w-4 h-4" />, label: "OBS 튜토리얼", href: "/obs-tutorial" },
              { icon: <Zap className="w-4 h-4" />, label: "요금제 보기", href: "/pricing" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="text-purple-400">{link.icon}</div>
                  <span className="text-sm text-foreground">{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center pb-8">
          <p className="text-sm text-muted-foreground mb-3">
            도움이 필요하신가요?
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/payment-troubleshooting">
              <Button variant="outline" size="sm">
                결제 문제 해결
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                요금제 FAQ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
