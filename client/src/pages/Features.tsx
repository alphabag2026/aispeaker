import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  User2,
  Volume2,
  Monitor,
  Mic,
  Brain,
  MessageSquare,
  Palette,
  Video,
  Globe,
  BookOpen,
  Award,
  Wand2,
  ArrowRight,
  Sparkles,
  Play,
  Tv,
  FileText,
  BarChart3,
  Subtitles,
  Image,
  Layers,
  Zap,
  Check,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

/* ── Feature category definitions ── */
interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  details: string[];
  badge?: string;
  color: string;
}

interface FeatureCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  features: Feature[];
}

const categories: FeatureCategory[] = [
  {
    id: "identity",
    label: "AI 아이덴티티",
    icon: User2,
    features: [
      {
        icon: User2,
        title: "딥페이크 얼굴 변환",
        desc: "강사의 실제 얼굴 대신 AI가 생성한 전문 강사 얼굴로 강의하세요. 50개 이상의 프리셋에서 선택하거나 커스텀 얼굴을 생성할 수 있습니다.",
        details: [
          "50+ AI 얼굴 프리셋 제공",
          "실시간 얼굴 변환 (30ms 이하 지연)",
          "다양한 국적/성별/연령대 선택",
          "커스텀 얼굴 업로드 지원",
          "99.2% 자연스러움 평가",
        ],
        badge: "CORE",
        color: "from-violet-500 to-purple-600",
      },
      {
        icon: Volume2,
        title: "음성 변조 & 말투 변환",
        desc: "피치, 속도, 톤을 세밀하게 조절하고, 격식체/비격식체/학술체 등 다양한 말투 스타일로 변환합니다.",
        details: [
          "20+ 음성 스타일 프리셋",
          "피치/속도/톤 실시간 조절",
          "격식체, 비격식체, 학술체 말투",
          "음성 클로닝 (강사 목소리 학습)",
          "자연스러운 억양 및 감정 표현",
        ],
        badge: "CORE",
        color: "from-cyan-500 to-blue-600",
      },
      {
        icon: Brain,
        title: "D-ID AI 아바타",
        desc: "D-ID API 연동으로 실제 AI 아바타가 화면에서 립싱크와 함께 강의를 진행합니다. 딥페이크와 결합하여 더욱 사실적인 강의를 제공합니다.",
        details: [
          "D-ID API 실시간 연동",
          "립싱크 + 표정 애니메이션",
          "딥페이크 + 아바타 결합 모드",
          "API 키 미설정 시 내장 아바타 폴백",
          "커스텀 아바타 이미지 지원",
        ],
        color: "from-emerald-500 to-teal-600",
      },
    ],
  },
  {
    id: "content",
    label: "콘텐츠 제작",
    icon: Wand2,
    features: [
      {
        icon: Wand2,
        title: "원클릭 강의 영상 제작",
        desc: "프롬프트 하나로 AI가 스크립트, TTS 음성, 아바타 영상을 자동 생성합니다. 딥페이크와 음성 변조까지 한 번에 적용됩니다.",
        details: [
          "프롬프트 → 스크립트 자동 생성",
          "스크립트 → TTS 음성 변환",
          "음성 + 아바타 → 영상 합성",
          "딥페이크 + 음성 변조 자동 적용",
          "파이프라인 진행 상태 실시간 표시",
        ],
        badge: "POPULAR",
        color: "from-amber-500 to-orange-600",
      },
      {
        icon: FileText,
        title: "AI 스크립트 에디터",
        desc: "AI가 생성한 스크립트를 섹션별로 편집하고, 드래그&드롭으로 재배치하며, 개별 섹션만 AI로 재생성할 수 있습니다.",
        details: [
          "섹션별 인라인 편집",
          "드래그&드롭 재배치",
          "개별 섹션 AI 재생성",
          "버전 관리 (스냅샷/롤백/비교)",
          "섹션별 예상 시간 자동 계산",
        ],
        color: "from-blue-500 to-indigo-600",
      },
      {
        icon: Layers,
        title: "스크립트 템플릿 라이브러리",
        desc: "도입-본론-결론, Q&A 포함형, 실습형 등 다양한 템플릿으로 빠르게 스크립트를 생성하세요.",
        details: [
          "기본 내장 템플릿 5종+",
          "기존 스크립트에서 템플릿 저장",
          "템플릿 기반 새 스크립트 생성",
          "카테고리별 분류 (Web3, DeFi, AI 등)",
          "커스텀 템플릿 생성/공유",
        ],
        color: "from-pink-500 to-rose-600",
      },
      {
        icon: Subtitles,
        title: "자동 자막 생성",
        desc: "생성된 음성을 STT로 자동 변환하여 SRT 자막 파일을 생성합니다. 다국어 자막도 지원합니다.",
        details: [
          "음성 → SRT 자막 자동 변환",
          "타임스탬프 정확도 95%+",
          "자막 미리보기 및 편집",
          "SRT 파일 다운로드",
          "다국어 자막 생성 가능",
        ],
        color: "from-teal-500 to-cyan-600",
      },
      {
        icon: Image,
        title: "썸네일 자동 생성",
        desc: "강의 주제를 기반으로 AI가 자동으로 매력적인 썸네일 이미지를 생성합니다.",
        details: [
          "AI 이미지 생성 API 연동",
          "강의 주제 기반 자동 프롬프트",
          "썸네일 미리보기 및 재생성",
          "고해상도 다운로드",
          "파이프라인 완료 후 자동 생성 옵션",
        ],
        color: "from-fuchsia-500 to-purple-600",
      },
    ],
  },
  {
    id: "delivery",
    label: "강의 송출",
    icon: Monitor,
    features: [
      {
        icon: Monitor,
        title: "외부 플랫폼 연동",
        desc: "Zoom, Google Meet, Webex, Tencent Meeting에서 AI 강의를 바로 송출합니다. OBS 가상 카메라를 통해 어떤 플랫폼에서든 사용 가능합니다.",
        details: [
          "Zoom 미팅 링크 자동 생성",
          "Google Meet 연동",
          "Webex / Tencent Meeting 지원",
          "OBS 가상 카메라 연동",
          "단계별 설정 튜토리얼 제공",
        ],
        badge: "CORE",
        color: "from-green-500 to-emerald-600",
      },
      {
        icon: Tv,
        title: "라이브 방송 시스템",
        desc: "수백 명의 시청자에게 실시간으로 AI 강의를 송출합니다. 슬라이드 동기화, 실시간 채팅, TTS 오디오 자동 재생을 지원합니다.",
        details: [
          "실시간 슬라이드 동기화",
          "시청자 실시간 채팅",
          "TTS 오디오 자동 재생",
          "시청자 수 실시간 표시",
          "방송 녹화 및 VOD 변환",
        ],
        color: "from-red-500 to-rose-600",
      },
      {
        icon: Video,
        title: "VOD 자동 녹화",
        desc: "강의 내용을 자동 아카이브하여 VOD로 재활용할 수 있습니다. Q&A 타임라인과 화이트보드 스냅샷도 함께 저장됩니다.",
        details: [
          "강의 자동 아카이브",
          "Q&A 타임라인 저장",
          "화이트보드 스냅샷 보존",
          "VOD 검색 및 필터",
          "VOD 재생 페이지 제공",
        ],
        color: "from-orange-500 to-amber-600",
      },
    ],
  },
  {
    id: "interactive",
    label: "인터랙티브",
    icon: MessageSquare,
    features: [
      {
        icon: MessageSquare,
        title: "실시간 AI Q&A",
        desc: "텍스트 또는 음성으로 질문하면 AI가 강의 맥락에 맞게 즉시 답변합니다. 카테고리별 AI 컨텍스트 템플릿으로 정확도를 높입니다.",
        details: [
          "텍스트 + 음성 질문 지원",
          "강의 맥락 기반 AI 답변",
          "카테고리별 컨텍스트 템플릿",
          "Q&A 북마크 저장",
          "답변 다국어 번역",
        ],
        color: "from-sky-500 to-blue-600",
      },
      {
        icon: Palette,
        title: "PPT + 화이트보드",
        desc: "슬라이드 프레젠테이션과 실시간 칠판으로 시각적 강의를 진행합니다. Canvas 기반 드로잉 도구를 제공합니다.",
        details: [
          "PPT/PDF 슬라이드 뷰어",
          "실시간 페이지 전환",
          "Canvas 기반 화이트보드",
          "드로잉 도구 (펜, 형광펜, 지우개)",
          "화이트보드 스냅샷 저장",
        ],
        color: "from-yellow-500 to-amber-600",
      },
      {
        icon: Globe,
        title: "다국어 자동 번역",
        desc: "20개 이상의 언어로 AI 자동 번역하여 글로벌 강의를 제공합니다. Q&A 답변도 실시간 번역됩니다.",
        details: [
          "20+ 언어 지원",
          "국기 아이콘 기반 언어 선택",
          "Q&A 답변 실시간 번역",
          "AI 캐싱으로 빠른 번역",
          "사용자 선호 언어 자동 기억",
        ],
        color: "from-indigo-500 to-violet-600",
      },
    ],
  },
  {
    id: "analytics",
    label: "분석 & 관리",
    icon: BarChart3,
    features: [
      {
        icon: BarChart3,
        title: "AI 콘텐츠 분석 리포트",
        desc: "가독성 점수, 난이도 적절성, 키워드 밀도, 구조 균형을 AI가 분석하고 개선 제안을 제공합니다.",
        details: [
          "가독성 점수 분석",
          "난이도 적절성 평가",
          "키워드 밀도 분석",
          "구조 균형 분석 (섹션별 시간 배분)",
          "AI 개선 제안 생성",
        ],
        color: "from-slate-500 to-gray-600",
      },
      {
        icon: Play,
        title: "통합 미리보기 플레이어",
        desc: "슬라이드 + 오디오를 동기화하여 최종 강의를 미리 확인합니다. 섹션별 자동 전환과 타임라인 컨트롤을 제공합니다.",
        details: [
          "슬라이드 + 오디오 동기화",
          "섹션별 자동 전환",
          "재생/일시정지/이전/다음 컨트롤",
          "프로그레스 바 및 시간 표시",
          "전용 미리보기 페이지",
        ],
        color: "from-emerald-500 to-green-600",
      },
      {
        icon: Award,
        title: "수료증 자동 발급",
        desc: "수강 진도를 달성하면 AI가 자동으로 수료증을 생성합니다. 인증코드 검증 기능도 포함됩니다.",
        details: [
          "진도 달성 시 자동 발급",
          "수료증 HTML 다운로드",
          "디자인 템플릿 제공",
          "인증코드 검증 기능",
          "수료증 목록 관리",
        ],
        color: "from-amber-500 to-yellow-600",
      },
      {
        icon: BookOpen,
        title: "AI 컨텍스트 템플릿",
        desc: "Web3, DeFi, NFT, AI, Blockchain, Metaverse 등 카테고리별 AI 컨텍스트를 미리 설정하여 답변 정확도를 높입니다.",
        details: [
          "카테고리별 기본 템플릿",
          "Web3, DeFi, NFT, AI 등 지원",
          "커스텀 템플릿 생성",
          "강의 생성 시 자동 로드",
          "템플릿 관리 페이지",
        ],
        color: "from-blue-500 to-cyan-600",
      },
    ],
  },
];

/* ── Stats data ── */
const stats = [
  { value: "50+", label: "AI 얼굴 프리셋" },
  { value: "20+", label: "음성 스타일" },
  { value: "20+", label: "지원 언어" },
  { value: "6+", label: "연동 플랫폼" },
  { value: "18+", label: "핵심 기능" },
  { value: "99.2%", label: "자연스러움 평가" },
];

export default function Features() {
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("identity");

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══════════ Hero Section ═══════════ */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI Speaker 핵심 기능
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              AI 강의 자동화의
              <br />
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                모든 기능
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              얼굴 변환부터 음성 변조, 스크립트 자동 생성, 라이브 방송까지.
              AI Speaker가 제공하는 18가지 이상의 핵심 기능을 살펴보세요.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    지금 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <Sparkles className="h-5 w-5" />
                    무료로 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  요금제 보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Stats Bar ═══════════ */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Category Tabs + Feature Grid ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">카테고리별 기능 탐색</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI Speaker의 기능을 카테고리별로 살펴보세요. 각 기능의 상세 스펙과 활용 방법을 확인할 수 있습니다.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Feature cards for active category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentCategory.features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${feature.color}`} />

                <CardContent className="p-6">
                  {feature.badge && (
                    <span className={`absolute top-4 right-4 text-[10px] px-2.5 py-1 rounded-full font-bold ${
                      feature.badge === "CORE"
                        ? "bg-primary/20 text-primary"
                        : feature.badge === "POPULAR"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {feature.badge}
                    </span>
                  )}

                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">{feature.desc}</p>

                  <div className="space-y-2.5">
                    {feature.details.map((detail) => (
                      <div key={detail} className="flex items-start gap-2.5">
                        <div className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/80">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ All Features Overview Grid ═══════════ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">전체 기능 한눈에 보기</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              AI Speaker가 제공하는 모든 기능을 한 곳에서 확인하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {categories.map((cat) =>
              cat.features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center shrink-0`}>
                    <feature.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{feature.desc}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ Comparison Table ═══════════ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">플랜별 기능 비교</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              각 요금제에서 사용할 수 있는 기능을 비교해보세요
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">기능</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      Professional
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">추천</span>
                    </span>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">Business</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI 스크립트 생성", starter: true, pro: true, biz: true },
                  { feature: "기본 TTS 음성", starter: "5종", pro: "20종", biz: "20종" },
                  { feature: "AI 얼굴 프리셋", starter: "10종", pro: "50+", biz: "50+" },
                  { feature: "영상 해상도", starter: "720p", pro: "1080p", biz: "4K" },
                  { feature: "딥페이크 얼굴 변환", starter: false, pro: true, biz: true },
                  { feature: "음성 변조 & 말투 변환", starter: false, pro: true, biz: true },
                  { feature: "라이브 방송", starter: false, pro: true, biz: true },
                  { feature: "자동 자막 생성", starter: true, pro: true, biz: true },
                  { feature: "썸네일 자동 생성", starter: true, pro: true, biz: true },
                  { feature: "AI 콘텐츠 분석", starter: false, pro: true, biz: true },
                  { feature: "배치 처리", starter: false, pro: false, biz: true },
                  { feature: "API 접근 권한", starter: false, pro: false, biz: true },
                  { feature: "팀 멤버", starter: "1명", pro: "1명", biz: "5명" },
                  { feature: "월 크레딧", starter: "100", pro: "500", biz: "2,000" },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">{row.feature}</td>
                    {[row.starter, row.pro, row.biz].map((val, i) => (
                      <td key={i} className="text-center py-3 px-4">
                        {val === true ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : val === false ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className="text-sm font-medium">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button size="lg" className="gap-2">
                요금제 상세 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA Section ═══════════ */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 바로 AI 강사로 변신하세요
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              모든 기능을 무료로 체험해보세요. 얼굴과 목소리를 선택하고, Zoom에서 바로 강의를 시작할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/studio">
                  <Button size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    제작 스튜디오로 이동
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <Sparkles className="h-5 w-5" />
                    무료로 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  요금제 비교
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Footer ═══════════ */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>AI Speaker v3.0 &mdash; AI-Powered Virtual Lecture Automation Platform</p>
        </div>
      </footer>
    </div>
  );
}
