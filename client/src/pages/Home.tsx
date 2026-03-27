import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  BookOpen,
  Brain,
  Mic,
  Monitor,
  MessageSquare,
  Palette,
  Sparkles,
  Volume2,
  ArrowRight,
  Video,
  Globe,
  User,
  User2,
  Wand2,
  Award,
  ExternalLink,
} from "lucide-react";

const features = [
  {
    icon: User2,
    title: "딥페이크 얼굴 변환",
    desc: "강사의 얼굴을 AI로 완전히 다른 사람으로 변환하여 익명으로 강의할 수 있습니다.",
    badge: "NEW",
  },
  {
    icon: Volume2,
    title: "음성 변조 & 말투 변환",
    desc: "피치, 속도, 톤, 말투를 조합하여 원래 목소리와 완전히 다른 음성으로 강의합니다.",
    badge: "NEW",
  },
  {
    icon: Monitor,
    title: "외부 플랫폼 연동",
    desc: "Zoom, Google Meet, Webex, Tencent Meeting에서 AI 강의를 바로 송출합니다.",
    badge: "NEW",
  },
  {
    icon: Mic,
    title: "음성 클로닝",
    desc: "강사의 목소리와 강의 습관을 AI가 학습하여 자연스러운 강의를 진행합니다.",
  },
  {
    icon: User,
    title: "AI 아바타 (D-ID)",
    desc: "D-ID API 연동으로 실제 AI 아바타가 화면에서 강의를 진행합니다.",
  },
  {
    icon: MessageSquare,
    title: "실시간 AI Q&A",
    desc: "텍스트 또는 음성으로 질문하면 AI가 강의 맥락에 맞게 즉시 답변합니다.",
  },
  {
    icon: Palette,
    title: "PPT + 화이트보드",
    desc: "슬라이드 프레젠테이션과 실시간 칠판으로 시각적 강의를 진행합니다.",
  },
  {
    icon: Video,
    title: "VOD 자동 녹화",
    desc: "강의 내용을 자동 아카이브하여 VOD로 재활용할 수 있습니다.",
  },
  {
    icon: Globe,
    title: "다국어 자동 번역",
    desc: "20개 이상의 언어로 AI 자동 번역하여 글로벌 강의를 제공합니다.",
  },
  {
    icon: Brain,
    title: "AI 컨텍스트 템플릿",
    desc: "Web3, DeFi, NFT 등 카테고리별 AI 컨텍스트를 미리 설정합니다.",
  },
  {
    icon: Award,
    title: "수료증 자동 발급",
    desc: "수강 진도를 달성하면 AI가 자동으로 수료증(PDF)을 생성합니다.",
  },
  {
    icon: Wand2,
    title: "프롬프트 기반 강의",
    desc: "프롬프트만 입력하면 AI가 자동으로 강의 콘텐츠를 생성하고 진행합니다.",
  },
];

const categories = [
  { name: "Web3", color: "bg-blue-500/20 text-blue-400" },
  { name: "AI", color: "bg-purple-500/20 text-purple-400" },
  { name: "Blockchain", color: "bg-green-500/20 text-green-400" },
  { name: "DeFi", color: "bg-yellow-500/20 text-yellow-400" },
  { name: "NFT", color: "bg-pink-500/20 text-pink-400" },
  { name: "Metaverse", color: "bg-cyan-500/20 text-cyan-400" },
];

const platforms = [
  { name: "Zoom", icon: "📹" },
  { name: "Google Meet", icon: "🎥" },
  { name: "Webex", icon: "🌐" },
  { name: "Tencent Meeting", icon: "💬" },
  { name: "MS Teams", icon: "💼" },
  { name: "OBS Studio", icon: "🎬" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI 강의 자동화 플랫폼 v2.0
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              AI가 당신 대신
              <br />
              <span className="text-primary">온라인 강의</span>를 진행합니다
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl">
              프롬프트만 입력하면 AI가 강의 콘텐츠를 생성하고, 딥페이크 얼굴 변환과 음성 변조로
              완전히 다른 강사로 변신하여 Zoom, Google Meet 등에서 실시간 강의를 진행합니다.
            </p>

            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              강사의 얼굴, 목소리, 말투를 AI로 변환 · 외부 회의 플랫폼 직접 송출 · 20개 이상 다국어 지원
            </p>

            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/instructor">
                    <Button size="lg" className="gap-2">
                      <Wand2 className="h-5 w-5" />
                      강사 스튜디오
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/lectures">
                    <Button size="lg" variant="outline" className="gap-2">
                      <BookOpen className="h-5 w-5" />
                      강의 둘러보기
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <a href={getLoginUrl()} className="gap-2">
                      <Sparkles className="h-5 w-5" />
                      시작하기
                    </a>
                  </Button>
                  <Link href="/lectures">
                    <Button size="lg" variant="outline" className="gap-2">
                      <BookOpen className="h-5 w-5" />
                      강의 둘러보기
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">작동 방식</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            3단계로 AI 강의를 생성하고 외부 플랫폼에서 송출합니다
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-card border-border text-center">
            <CardContent className="p-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI 강사 설정</h3>
              <p className="text-muted-foreground text-sm">
                딥페이크 얼굴, 음성 변조, 말투 스타일을 설정하여 원하는 AI 강사 페르소나를 만듭니다
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border text-center">
            <CardContent className="p-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">강의 콘텐츠 생성</h3>
              <p className="text-muted-foreground text-sm">
                프롬프트 또는 교안을 입력하면 AI가 자동으로 강의 콘텐츠와 PPT를 생성합니다
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border text-center">
            <CardContent className="p-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">외부 플랫폼 송출</h3>
              <p className="text-muted-foreground text-sm">
                Zoom, Google Meet, Webex 등에서 AI 강사가 실시간으로 강의를 진행합니다
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="container py-12">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">지원 플랫폼</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {platforms.map((p) => (
            <div key={p.name} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border">
              <span className="text-xl">{p.icon}</span>
              <span className="font-medium text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold mb-2">강의 카테고리</h3>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => (
            <span key={cat.name} className={`px-4 py-2 rounded-full text-sm font-medium ${cat.color}`}>
              {cat.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">전체 기능</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI 기술을 활용한 강의 자동화의 모든 것
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border-border hover:border-primary/50 transition-colors group relative overflow-hidden">
              <CardContent className="p-6">
                {"badge" in feature && feature.badge && (
                  <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                    {feature.badge}
                  </span>
                )}
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-24">
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              AI 강사로 변신하세요
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              얼굴과 목소리를 AI로 변환하고, Zoom에서 바로 강의를 시작하세요.
              프롬프트 하나로 전문적인 강의 콘텐츠가 자동 생성됩니다.
            </p>
            <Link href={isAuthenticated ? "/instructor" : "/lectures"}>
              <Button size="lg" className="gap-2">
                시작하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>AI Lecture Platform v2.0 - AI-Powered Lecture Automation for Web3 &amp; AI Education</p>
        </div>
      </footer>
    </div>
  );
}
