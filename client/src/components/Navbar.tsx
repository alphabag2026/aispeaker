
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
  Store,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Bell, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
      { label: "DID 영상 갤러리", href: "/did-gallery", icon: Video, badge: "new" as const },
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

  const getTranslationKey = (label: string) => {
    const mapping: { [key: string]: string } = {
      "동영상": "navbar.products.video.title",
      "이미지 → 비디오": "navbar.products.video.imageToVideo",
      "텍스트 → 비디오": "navbar.products.video.textToVideo",
      "얼굴 교환": "navbar.products.video.faceSwap",
      "아바타 비디오": "navbar.products.video.avatarVideo",
      "비디오 번역": "navbar.products.video.videoTranslation",
      "PPT → 비디오": "navbar.products.video.pptToVideo",
      "이미지": "navbar.products.image.title",
      "이미지 생성기": "navbar.products.image.imageGenerator",
      "얼굴 교환 (이미지)": "navbar.products.image.faceSwapImage",
      "배경 변경": "navbar.products.image.backgroundChange",
      "오디오": "navbar.products.audio.title",
      "텍스트 → 음성": "navbar.products.audio.textToSpeech",
      "음성 복제": "navbar.products.audio.voiceCloning",
      "음성 변환기": "navbar.products.audio.voiceChanger",
      "실시간": "navbar.products.live.title",
      "라이브 카메라": "navbar.products.live.liveCamera",
      "스트리밍 아바타": "navbar.products.live.streamingAvatar",
      "AI 강의 라이브": "navbar.products.live.aiLectureLive",
      "강의 제작": "navbar.products.lecture.title",
      "5단계 강의 빌더": "navbar.products.lecture.lectureBuilder",
      "스크립트 에디터": "navbar.products.lecture.scriptEditor",
      "프로덕션 스튜디오": "navbar.products.lecture.productionStudio",
      "화이트보드 협업": "navbar.products.lecture.whiteboardCollaboration",
      "DID 영상 갤러리": "navbar.products.lecture.didVideoGallery",
      "AI 강의 빌더": "navbar.featured.aiLectureBuilder",
      "효과 프리셋": "navbar.featured.effectsPreset",
    };
    return mapping[label] || label;
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
              {t("navbar.links.products")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${megaMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Mega Menu Dropdown */}
            {megaMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 mega-menu p-6 w-[800px] animate-scale-in" style={{ animationDuration: '0.2s' }}>
                <div className="flex gap-6">
                  {/* Featured sidebar */}
                  <div className="w-44 shrink-0 border-r border-border/50 pr-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("navbar.megaMenu.featured")}</p>
                    <div className="space-y-1">
                      {featuredProducts.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMegaMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-primary/10 transition-colors"
                        >
                          {t(getTranslationKey(item.label))}
                          {item.badge && <span className={badgeClass(item.badge)}>{item.badge}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Category columns */}
                  <div className="flex-1 grid grid-cols-3 gap-5">
                    {productCategories.map((cat) => (
                      <div key={cat.title}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t(getTranslationKey(cat.title))}</p>
                        <div className="space-y-0.5">
                          {cat.items.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setMegaMenuOpen(false)}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-accent/10 transition-colors group/item"
                            >
                              <item.icon className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                              <span className="truncate">{t(getTranslationKey(item.label))}</span>
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
                  <p className="text-xs text-muted-foreground">{t("navbar.megaMenu.footer")}</p>
                  <Link href="/ai-studio" onClick={() => setMegaMenuOpen(false)} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                    {t("navbar.megaMenu.viewAll")} <ExternalLink className="h-3 w-3" />
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
                {t("navbar.links.lectureCreation")}
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
              <Users className="h-3.5 w-3.5" />
              {t("navbar.links.facesAndVoices")}
            </Button>
          </Link>

          {/* Features */}
          <Link href="/features">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/features' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t("navbar.links.features")}
            </Button>
          </Link>

          {/* Pricing */}
          <Link href="/pricing">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 text-sm font-medium ${location === '/pricing' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {t("navbar.links.pricing")}
            </Button>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {switchable && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
              {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Auth buttons */}
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                    <img
                      src={user?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.id}`}
                      alt={user?.name || "User"}
                      className="h-6 w-6 rounded-full bg-muted"
                    />
                    <span className="hidden md:inline text-sm font-medium text-foreground truncate max-w-[100px]">{user?.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t("navbar.user.myProfile")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-lectures">
                      <Video className="mr-2 h-4 w-4" />
                      <span>{t("navbar.user.myLectures")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>{t("navbar.user.paymentHistory")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isInstructor && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/studio">
                          <Play className="mr-2 h-4 w-4" />
                          <span>{t("navbar.products.lecture.productionStudio")}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/instructor">
                          <Monitor className="mr-2 h-4 w-4" />
                          <span>{t("navbar.user.instructorDashboard")}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/broadcasts">
                          <Tv className="mr-2 h-4 w-4" />
                          <span>{t("navbar.user.liveBroadcast")}</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>{t("navbar.user.admin")}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(isInstructor || isAdmin) && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("navbar.user.logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  {t("navbar.auth.login")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="text-sm font-medium">
                  {t("navbar.auth.signup")}
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-slide-down-fade" style={{ animationDuration: '0.3s' }}>
          <div className="container py-4 space-y-2">
            {!isAuthenticated && (
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {t("navbar.auth.login")}
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">{t("navbar.auth.signup")}</Button>
                </Link>
              </div>
            )}

            {productCategories.map((cat) => (
              <div key={cat.title} className="py-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t(getTranslationKey(cat.title))}</p>
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs h-9">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{t(getTranslationKey(item.label))}</span>
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
                  <Layers className="h-4 w-4" /> {t("navbar.links.features")}
                </Button>
              </Link>
              <Link href="/marketplace" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Store className="h-4 w-4" /> {t("navbar.links.marketplace")} <span className="badge-new ml-auto">NEW</span>
                </Button>
              </Link>
              <Link href="/recommendations" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Sparkles className="h-4 w-4" /> {t("navbar.links.recommendations")}
                </Button>
              </Link>
              <Link href="/live-interpretation" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Languages className="h-4 w-4" /> {t("navbar.links.liveInterpretation")} <span className="badge-new ml-auto">NEW</span>
                </Button>
              </Link>
              <Link href="/pricing" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <CreditCard className="h-4 w-4" /> {t("navbar.links.pricing")} <span className="badge-hot ml-auto">30% OFF</span>
                </Button>
              </Link>
              {isInstructor && (
                <>
                  <Link href="/studio" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Play className="h-4 w-4" /> {t("navbar.products.lecture.productionStudio")}
                    </Button>
                  </Link>
                  <Link href="/instructor" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Monitor className="h-4 w-4" /> {t("navbar.user.instructorDashboard")}
                    </Button>
                  </Link>
                  <Link href="/broadcasts" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Tv className="h-4 w-4" /> {t("navbar.user.liveBroadcast")}
                    </Button>
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" /> {t("navbar.user.admin")}
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

/* ── Notification Bell Component ── */
function NotificationBell() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount = 0 } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: notifications = [] } = trpc.notification.list.useQuery(
    { limit: 10, offset: 0 },
    { enabled: open }
  );
  const utils = trpc.useUtils();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "like": return "❤️";
      case "comment": return "💬";
      case "reply": return "↩️";
      case "report_resolved": return "✅";
      case "system": return "🔔";
      default: return "🔔";
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return t("navbar.notifications.justNow");
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t("navbar.notifications.minutesAgo")}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t("navbar.notifications.hoursAgo")}`;
    return `${Math.floor(diff / 86400000)}${t("navbar.notifications.daysAgo")}`;
  };

  return (
    <div ref={bellRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {(unreadCount as number) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {(unreadCount as number) > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold">{t("navbar.notifications.title")}</h3>
            {(unreadCount as number) > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> {t("navbar.notifications.markAllAsRead")}
              </button>
            )}
          </div>
          {(notifications as any[]).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("navbar.notifications.noNotifications")}
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {(notifications as any[]).map((n: any) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ id: n.id });
                    if (n.link) window.location.href = n.link;
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : ""}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
