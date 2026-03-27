import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  BookOpen,
  Brain,
  Mic,
  Users,
  Radio,
  Plus,
  ArrowRight,
  Loader2,
  Video,
  User2,
  Volume2,
  Monitor as MonitorIcon,
} from "lucide-react";

export default function InstructorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const switchRole = trpc.user.setRole.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const isInstructor = user?.platformRole === "instructor" || user?.role === "admin";

  const { data: stats, isLoading } = trpc.lecture.stats.useQuery(undefined, {
    enabled: isInstructor,
  });
  const { data: myLectures } = trpc.lecture.list.useQuery(
    { instructorId: user?.id },
    { enabled: isInstructor && !!user }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
          <Button asChild>
            <a href={getLoginUrl()}>로그인</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <Mic className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">강사로 시작하기</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            강사로 전환하면 AI 강의를 만들고 관리할 수 있습니다.
            음성 프로필을 등록하고 AI가 당신의 목소리로 강의합니다.
          </p>
          <Button
            size="lg"
            onClick={() => switchRole.mutate({ platformRole: "instructor" })}
            disabled={switchRole.isPending}
          >
            {switchRole.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            강사로 전환
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">강사 대시보드</h1>
            <p className="text-muted-foreground mt-1">강의를 관리하고 AI 음성 프로필을 설정하세요</p>
          </div>
          <Link href="/instructor/lectures/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              새 강의 만들기
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalLectures ?? 0}</p>
                  <p className="text-sm text-muted-foreground">전체 강의</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalStudents ?? 0}</p>
                  <p className="text-sm text-muted-foreground">총 수강생</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Radio className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.liveLectures ?? 0}</p>
                  <p className="text-sm text-muted-foreground">진행 중</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/instructor/lectures">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">강의 관리</h3>
                    <p className="text-sm text-muted-foreground">강의 생성, 수정, 교안 업로드</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/instructor/voice-profiles">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Mic className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">음성 프로필</h3>
                    <p className="text-sm text-muted-foreground">음성 클로닝 및 강의 스타일 설정</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/vod">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">VOD 아카이브</h3>
                    <p className="text-sm text-muted-foreground">녹화된 강의 관리 및 조회</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/instructor/templates">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI 템플릿</h3>
                    <p className="text-sm text-muted-foreground">카테고리별 AI 컨텍스트 관리</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v2.0 Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/instructor/face-swap">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <User2 className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">딥페이크 얼굴</h3>
                    <p className="text-sm text-muted-foreground">AI 얼굴 변환 프로필 관리</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/instructor/voice-mod">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Volume2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">음성 변조</h3>
                    <p className="text-sm text-muted-foreground">목소리 톤/말투 변환 관리</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/instructor/platforms">
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <MonitorIcon className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">외부 플랫폼</h3>
                    <p className="text-sm text-muted-foreground">Zoom/Meet/Webex 연동</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Lectures */}
        {myLectures && myLectures.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">최근 강의</h2>
            <div className="space-y-3">
              {myLectures.slice(0, 5).map((lecture: any) => (
                <Link key={lecture.id} href={`/instructor/lectures/${lecture.id}/edit`}>
                  <Card className="bg-card hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{lecture.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lecture.category} · {lecture.status} · {new Date(lecture.createdAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
