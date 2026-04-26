import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import {
  Clapperboard,
  User2,
  Brain,
  Languages,
  Sparkles,
  Zap,
  Video,
  Image as ImageIcon,
  Mic,
  Headphones,
  Volume2,
  Camera,
  Radio,
  Wand2,
  Palette,
  LayoutGrid,
  ChevronRight,
  Crown,
  TrendingUp,
} from "lucide-react";
import { useState, type ReactNode } from "react";

/* ── Sidebar Menu Data ── */
const sidebarSections = [
  {
    title: "동영상",
    items: [
      { label: "이미지 → 비디오", href: "/ai-studio/image-to-video", icon: Clapperboard, badge: "hot" as const },
      { label: "얼굴 교환", href: "/ai-studio/face-swap", icon: User2, badge: "new" as const },
      { label: "아바타 비디오", href: "/ai-studio/talking-avatar", icon: Brain, badge: null },
      { label: "비디오 번역", href: "/ai-studio/video-translate", icon: Languages, badge: null },
    ],
  },
  {
    title: "이미지",
    items: [
      { label: "이미지 생성", href: "/ai-studio/image-gen", icon: ImageIcon, badge: null },
      { label: "배경 변경", href: "/ai-studio/bg-remove", icon: Palette, badge: null },
    ],
  },
  {
    title: "오디오",
    items: [
      { label: "텍스트 → 음성", href: "/ai-studio/tts", icon: Volume2, badge: null },
      { label: "음성 복제", href: "/ai-studio/voice-clone", icon: Mic, badge: null },
      { label: "음성 변환", href: "/ai-studio/voice-change", icon: Headphones, badge: null },
    ],
  },
  {
    title: "실시간",
    items: [
      { label: "라이브 카메라", href: "/ai-studio/live-camera", icon: Camera, badge: null },
      { label: "스트리밍 아바타", href: "/ai-studio/streaming-avatar", icon: Radio, badge: null },
    ],
  },
  {
    title: "라이브러리",
    items: [
      { label: "AI 모델 비교", href: "/ai-studio/models", icon: Sparkles, badge: null },
      { label: "효과 프리셋", href: "/ai-studio/effects", icon: Zap, badge: null },
    ],
  },
];

const badgeClass = (badge: string | null) => {
  if (badge === "hot") return "badge-hot";
  if (badge === "new") return "badge-new";
  if (badge === "unlimited") return "badge-unlimited";
  return "";
};

interface StudioLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function StudioLayout({ children, title, subtitle }: StudioLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const creditsQuery = trpc.akool.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60000,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 blur-3xl rounded-full" />
            <Sparkles className="h-20 w-20 text-primary relative" />
          </div>
          <h1 className="text-4xl font-bold mb-4 gradient-text">AI Studio</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            25+ AI 도구를 하나의 플랫폼에서 사용하세요. 로그인 후 시작할 수 있습니다.
          </p>
          <Button asChild className="glow-button text-base px-8 py-3 h-auto">
            <a href={getLoginUrl()}>무료로 시작하기</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 ${
            sidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-border/50 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Studio</p>
                  <p className="text-[10px] text-muted-foreground">Powered by Akool</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>

          {/* Credits */}
          {!sidebarCollapsed && creditsQuery.data && (
            <div className="px-3 py-2 border-b border-border/50">
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-muted-foreground">크레딧:</span>
                <span className="font-semibold text-foreground">{creditsQuery.data.credits ?? "N/A"}</span>
              </div>
            </div>
          )}

          {/* Menu Sections */}
          <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
            {sidebarSections.map((section) => (
              <div key={section.title} className="mb-1">
                {!sidebarCollapsed && (
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </p>
                )}
                {section.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all cursor-pointer ${
                          isActive
                            ? "bg-primary/15 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                        } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge && <span className={badgeClass(item.badge)}>{item.badge}</span>}
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-border/50">
              <Link href="/pricing">
                <div className="glass-card p-3 cursor-pointer group">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-semibold">Pro 업그레이드</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">무제한 생성 + 우선 처리</p>
                </div>
              </Link>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Page Header */}
          {title && (
            <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                {creditsQuery.data && (
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    {creditsQuery.data.credits ?? "N/A"} credits
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
