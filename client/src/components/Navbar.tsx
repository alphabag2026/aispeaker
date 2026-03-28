import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Home,
  LogOut,
  Monitor,
  User,
  Menu,
  X,
  Video,
  Play,
  HelpCircle,
  History,
  Tv,
  Sun,
  Moon,
  Users,
  Volume2,
  CreditCard,
  Shield,
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme, switchable } = useTheme();

  const isInstructor = user?.platformRole === "instructor" || user?.role === "admin";

  const isAdmin = user?.role === "admin";

  const navLinks = [
    { href: "/", label: "홈", icon: Home },
    { href: "/faces", label: "AI 얼굴", icon: Users },
    { href: "/voices", label: "AI 목소리", icon: Volume2 },
    { href: "/pricing", label: "요금제", icon: CreditCard },
    ...(isInstructor ? [
      { href: "/studio", label: "스튜디오", icon: Play },
      { href: "/instructor", label: "대시보드", icon: Monitor },
      { href: "/broadcasts", label: "라이브", icon: Tv },
    ] : []),
    ...(isAdmin ? [
      { href: "/admin", label: "관리자", icon: Shield },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/vs-logo-icon-QHaTxEF2mDDePGaUptJBPp.webp"
            alt="Virtual Speaker"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="hidden sm:inline bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Virtual Speaker</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={location === link.href ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {switchable && toggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-600" />
              )}
            </Button>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name || "사용자"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-muted-foreground text-xs">
                  {isInstructor ? "강사" : "수강생"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isInstructor && (
                  <DropdownMenuItem asChild>
                    <Link href="/instructor" className="cursor-pointer">
                      <Monitor className="h-4 w-4 mr-2" />
                      강사로 전환
                    </Link>
                  </DropdownMenuItem>
                )}
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
            <Button size="sm" asChild>
              <a href={getLoginUrl()}>로그인</a>
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
              <Button
                variant={location === link.href ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
