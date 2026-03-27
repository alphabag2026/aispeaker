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
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "음성 클로닝",
    desc: "강사의 목소리와 강의 습관을 AI가 학습하여 자연스러운 강의를 진행합니다.",
  },
  {
    icon: User,
    title: "AI 아바타",
    desc: "AI 아바타가 화면에 등장하여 실시간으로 강의를 진행하고 질문에 답변합니다.",
  },
  {
    icon: MessageSquare,
    title: "실시간 Q&A",
    desc: "수강생이 텍스트 또는 음성으로 질문하면 AI가 즉시 답변합니다.",
  },
  {
    icon: Monitor,
    title: "PPT 슬라이드",
    desc: "강의 자료를 슬라이드 형태로 표시하며 AI가 설명합니다.",
  },
  {
    icon: Palette,
    title: "화이트보드",
    desc: "실시간 칠판 기능으로 개념을 시각적으로 설명합니다.",
  },
  {
    icon: Video,
    title: "VOD 아카이브",
    desc: "강의 내용을 자동 녹화하여 VOD로 다시 볼 수 있습니다.",
  },
  {
    icon: Globe,
    title: "다국어 번역",
    desc: "AI 자동 번역으로 20개 이상의 언어로 Q&A 답변을 제공합니다.",
  },
  {
    icon: Volume2,
    title: "AI TTS",
    desc: "OpenAI TTS 기반으로 텍스트를 자연스러운 음성으로 변환합니다.",
  },
  {
    icon: Brain,
    title: "강사 모드 선택",
    desc: "음성, 텍스트, 아바타 중 원하는 AI 표현 방식을 선택할 수 있습니다.",
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
              AI 기반 인터랙티브 강의 플랫폼
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              AI가 강사의 목소리로
              <br />
              <span className="text-primary">실시간 강의</span>를 진행합니다
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              강사의 음성과 강의 스타일을 학습한 AI가 Web3, AI 등 최신 기술을 가르칩니다.
              수강생은 텍스트와 음성으로 실시간 질문이 가능합니다. 20개 이상의 언어로 자동 번역됩니다.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/lectures">
                <Button size="lg" className="gap-2">
                  <BookOpen className="h-5 w-5" />
                  강의 둘러보기
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/vod">
                <Button size="lg" variant="outline" className="gap-2">
                  <Video className="h-5 w-5" />
                  VOD 보기
                </Button>
              </Link>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" asChild>
                  <a href={getLoginUrl()}>로그인하고 시작하기</a>
                </Button>
              )}
              {isAuthenticated && (
                <Link href="/instructor">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Mic className="h-5 w-5" />
                    강사로 시작하기
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => (
            <span
              key={cat.name}
              className={`px-4 py-2 rounded-full text-sm font-medium ${cat.color}`}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">주요 기능</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI 기술을 활용한 차세대 온라인 강의 경험을 제공합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-card border-border hover:border-primary/50 transition-colors group"
            >
              <CardContent className="p-6">
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
              지금 바로 AI 강의를 시작하세요
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              강사로 등록하고 AI가 당신의 목소리로 강의하는 경험을 만들어보세요.
              강의는 자동으로 녹화되어 VOD로 제공됩니다.
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
          <p>AI Interactive Lecture Platform - Web3 &amp; AI Education</p>
        </div>
      </footer>
    </div>
  );
}
