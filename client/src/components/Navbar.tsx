import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  LogOut,
  Mic,
  Monitor,
  User,
  Menu,
  X,
  Video,
  Play,
  HelpCircle,
  History,
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInstructor = user?.platformRole === "instructor" || user?.role === "admin";

  const navLinks = [
    { href: "/", label: "홈", icon: Home },
    { href: "/lectures", label: "강의 목록", icon: BookOpen },
    { href: "/vod", label: "VOD", icon: Video },
    ...(isAuthenticated ? [
      { href: "/my-lectures", label: "내 수강", icon: GraduationCap },
      { href: "/my-dashboard", label: "학습 현황", icon: BarChart3 },
      { href: "/certificates", label: "수료증", icon: Award },
    ] : []),
    ...(isInstructor ? [
      { href: "/studio", label: "스튜디오", icon: Play },
      { href: "/instructor", label: "강사 대시보드", icon: Monitor },
      { href: "/pipeline-dashboard", label: "제작 히스토리", icon: History },
      { href: "/obs-tutorial", label: "OBS 가이드", icon: HelpCircle },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Mic className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:inline">Virtual Speaker</span>
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
