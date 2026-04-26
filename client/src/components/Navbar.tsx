import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Monitor,
  User,
  Menu,
  X,
  Video,
  Play,
  Tv,
  Sun,
  Moon,
  Users,
  Volume2,
  CreditCard,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  Image,
  Clapperboard,
  Languages,
  Mic,
  Wand2,
  Brain,
  Camera,
  Radio,
  FileVideo,
  Palette,
  MessageSquare,
  Headphones,
  Zap,
  BookOpen,
  Globe,
  BarChart3,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ── Mega Menu Data ── */
const productCategories = [
  {
    title: "동영상",
    items: [
      { label: "이미지 → 비디오", href: "/ai-studio", icon: Clapperboard, badge: "hot" as const },
      { label: "텍스트 → 비디오", href: "/ai-studio", icon: FileVideo, badge: null },
      { label: "얼굴 교환", href: "/ai-studio", icon: Users, badge: "new" as const },
      { label: "아바타 비디오", href: "/ai-studio", icon: Brain, badge: "unlimited" as const },
      { label: "비디오 번역", href: "/ai-studio", icon: Languages, badge: null },
      { label: "PPT → 비디오", href: "/lecture-builder", icon: Monitor, badge: "unlimited" as const },
    ],
  },
  {
    title: "이미지",
    items: [
      { label: "이미지 생성기", href: "/ai-studio", icon: Image, badge: null },
      { label: "얼굴 교환 (이미지)", href: "/ai-studio", icon: Wand2, badge: "new" as const },
      { label: "배경 변경", href: "/ai-studio", icon: Palette, badge: null },
    ],
  },
  {
    title: "오디오",
    items: [
      { label: "텍스트 → 음성", href: "/voices", icon: Volume2, badge: null },
      { label: "음성 복제", href: "/voices", icon: Mic, badge: null },
      { label: "음성 변환기", href: "/voices", icon: Headphones, badge: null },
    ],
  },
  {
    title: "실시간",
    items: [
      { label: "라이브 카메라", href: "/browser-studio", icon: Camera, badge: null },
      { label: "스트리밍 아바타", href: "/broadcasts", icon: Radio, badge: null },
      { label: "AI 강의 라이브", href: "/broadcasts", icon: Tv, badge: "hot" as const },
    ],
  },
  {
    title: "강의 제작",
    items: [
      { label: "5단계 강의 빌더", href: "/lecture-builder", icon: BookOpen, badge: "hot" as const },
      { label: "스크립트 에디터", href: "/script-templates", icon: FileVideo, badge: null },
      { label: "프로덕션 스튜디오", href: "/studio", icon: Play, badge: null },
      { label: "화이트보드 협업", href: "/lecture-builder", icon: MessageSquare, badge: "new" as const },
    ],
  },
];

const featuredProducts = [
  { label: "AI 강의 빌더", href: "/lecture-builder", badge: "hot" as const },
  { label: "스트리밍 아바타", href: "/broadcasts", badge: null },
  { label: "비디오 번역", href: "/ai-studio", badge: null },
  { label: "얼굴 교환", href: "/ai-studio", badge: "new" as const },
  { label: "효과 프리셋", href: "/ai-studio", badge: null },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const { theme, toggleTheme, switchable } = useTheme();
  const { t } = useLanguage();
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInstructor = user?.platformRole === "instructor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const handleMegaMenuEnter = () => {
    if (megaMenuTimeout.current) clearTimeout(megaMenuTimeout.current);
    setMegaMenuOpen(true);
  };
  const handleMegaMenuLeave = () => {
    megaMenuTimeout.current = setTimeout(() => setMegaMenuOpen(false), 200);
  };

  useEffect(() => {
    return () => {
      if (megaMenuTimeout.current) clearTimeout(megaMenuTimeout.current);
    };
  }, []);

  const badgeClass = (badge: string | null) => {
    if (badge === "hot") return "badge-hot";
    if (badge === "new") return "badge-new";
    if (badge === "unlimited") return "badge-unlimited";
    if (badge === "api") return "badge-api";
    return "";
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg shrink-0 group">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/vs-logo-icon-QHaTxEF2mDDePGaUptJBPp.webp"
            alt="AI Speaker"
            className="h-9 w-9 rounded-xl object-contain group-hover:scale-110 transition-transform"
          />
          <span className="hidden sm:inline gradient-text font-extrabold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Speaker
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {/* Products Mega Menu */}
          <div
            className="relative"
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
            ref={megaMenuRef}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 text-sm font-medium transition-colors ${megaMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              제품
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Mega Menu Dropdown */}
            {megaMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 mega-menu p-6 w-[800px] animate-scale-in" style={{ animationDuration: '0.2s' }}>
                <div className="flex gap-6">
                  {/* Featured sidebar */}
                  <div className="w-44 shrink-0 border-r border-border/50 pr-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">추천</p>
                    <div className="space-y-1">
                      {featuredProducts.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMegaMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-primary/10 transition-colors"
                        >
                          {item.label}
                          {item.badge && <span className={badgeClass(item.badge)}>{item.badge}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Category columns */}
                  <div className="flex-1 grid grid-cols-3 gap-5">
                    {productCategories.map((cat) => (
                      <div key={cat.title}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.title}</p>
                        <div className="space-y-0.5">
                          {cat.items.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setMegaMenuOpen(false)}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors group/item"
                            >
                              <item.icon className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                              <span className="truncate">{item.label}</span>
                              {item.badge && <span className={badgeClass(item.badge)}>{item.badge}</span>}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">25+ AI 도구를 하나의 플랫폼에서</p>
                  <Link href="/ai-studio" onClick={() => setMegaMenuOpen(false)} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                    모든 도구 보기 <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* AI Studio */}
          <Link href="/ai-studio">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/ai-studio' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Studio
            </Button>
          </Link>

          {/* Lecture Builder */}
          {user && (
            <Link href="/lecture-builder">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 text-sm font-medium ${location.startsWith('/lecture-builder') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Video className="h-3.5 w-3.5" />
                강의 제작
              </Button>
            </Link>
          )}

          {/* Faces & Voices */}
          <Link href="/faces">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/faces' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AI 얼굴
            </Button>
          </Link>
          <Link href="/voices">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/voices' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AI 목소리
            </Button>
          </Link>

          {/* Features */}
          <Link href="/features">
            <Button
              variant="ghost"
              size="sm"
              className={`text-sm font-medium ${location === '/features' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              기능
            </Button>
          </Link>

          {/* Pricing with badge */}
          <Link href="/pricing">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/pricing' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              가격
              <span className="badge-hot">30% OFF</span>
            </Button>
          </Link>

          {/* More menu for instructor/admin */}
          {(isInstructor || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                  더보기
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 bg-popover/95 backdrop-blur-xl border-border/50">
                {isInstructor && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/studio" className="cursor-pointer flex items-center gap-2">
                        <Play className="h-4 w-4" /> 프로덕션 스튜디오
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/instructor" className="cursor-pointer flex items-center gap-2">
                        <Monitor className="h-4 w-4" /> 강사 대시보드
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/broadcasts" className="cursor-pointer flex items-center gap-2">
                        <Tv className="h-4 w-4" /> 라이브 방송
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pipeline-dashboard" className="cursor-pointer flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> 파이프라인
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="h-4 w-4" /> 관리자
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {switchable && toggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={t("nav.theme_toggle")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-sm">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate text-foreground/80">{user?.name || t("nav.user")}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover/95 backdrop-blur-xl border-border/50">
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "관리자" : isInstructor ? "강사" : "학생"}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/payments" className="cursor-pointer flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> 결제 내역
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-subscription" className="cursor-pointer flex items-center gap-2">
                    <Zap className="h-4 w-4" /> 구독 관리
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/video-history" className="cursor-pointer flex items-center gap-2">
                    <FileVideo className="h-4 w-4" /> 비디오 히스토리
                  </Link>
                </DropdownMenuItem>
                {!isInstructor && (
                  <DropdownMenuItem asChild>
                    <Link href="/instructor" className="cursor-pointer flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> 강사 모드 전환
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                  로그인
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="glow-button text-sm px-4 py-1.5 h-auto">
                  시작하기
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
          {/* Mobile Product Categories */}
          <div className="p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">제품</p>
            {productCategories.map((cat) => (
              <div key={cat.title}>
                <p className="text-xs font-medium text-primary/70 mb-1.5">{cat.title}</p>
                <div className="grid grid-cols-2 gap-1">
                  {cat.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs h-9">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && <span className={`${badgeClass(item.badge)} ml-auto`}>{item.badge}</span>}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border/50 pt-3 space-y-1">
              <Link href="/ai-studio" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Sparkles className="h-4 w-4" /> AI Studio
                </Button>
              </Link>
              <Link href="/features" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Layers className="h-4 w-4" /> 기능
                </Button>
              </Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <CreditCard className="h-4 w-4" /> 가격 <span className="badge-hot ml-auto">30% OFF</span>
                </Button>
              </Link>
              {isInstructor && (
                <>
                  <Link href="/studio" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Play className="h-4 w-4" /> 프로덕션 스튜디오
                    </Button>
                  </Link>
                  <Link href="/instructor" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Monitor className="h-4 w-4" /> 강사 대시보드
                    </Button>
                  </Link>
                  <Link href="/broadcasts" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Tv className="h-4 w-4" /> 라이브 방송
                    </Button>
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" /> 관리자
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
