import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import {
  BookOpen, Clock, MessageSquare, TrendingUp, Play, Bookmark,
  GraduationCap, BarChart3, ChevronRight, Loader2, Video,
  Brain, Star, ArrowLeft
} from "lucide-react";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}시간 ${m}분`;
}

export default function StudentDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: dashboard, isLoading: dashLoading } = trpc.progress.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: enrollments } = trpc.enrollment.myEnrollments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading || dashLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <GraduationCap className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground text-sm mb-4">학습 대시보드를 이용하려면 로그인해주세요.</p>
            <Button asChild><a href={getLoginUrl()}>로그인</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboard?.stats;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-learning-progress-2fYgZ3w9ho5GQ9toRA33fm.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  학습 대시보드
                </h1>
                <p className="text-white/70">
                  안녕하세요, {user?.name || "학습자"}님! 학습 현황을 확인하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.totalEnrollments || 0}</p>
              <p className="text-xs text-muted-foreground">수강 강의</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{formatTime(stats?.totalTimeSpent || 0)}</p>
              <p className="text-xs text-muted-foreground">총 학습 시간</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.totalQuestionsAsked || 0}</p>
              <p className="text-xs text-muted-foreground">질문 횟수</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.avgCompletion || 0}%</p>
              <p className="text-xs text-muted-foreground">평균 진도</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Video className="h-5 w-5 text-red-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.totalVodsWatched || 0}</p>
              <p className="text-xs text-muted-foreground">VOD 시청</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bookmark className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.totalBookmarks || 0}</p>
              <p className="text-xs text-muted-foreground">북마크</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="progress" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="progress">학습 진도</TabsTrigger>
            <TabsTrigger value="enrollments">수강 강의</TabsTrigger>
            <TabsTrigger value="vod">VOD 이력</TabsTrigger>
            <TabsTrigger value="bookmarks">북마크</TabsTrigger>
          </TabsList>

          {/* Learning Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {dashboard?.recentProgress && dashboard.recentProgress.length > 0 ? (
              dashboard.recentProgress.map((item) => (
                <Card key={item.progress.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{item.lecture.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs">{item.lecture.category}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {item.progress.questionsAsked}개 질문
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.progress.timeSpentSeconds || 0)}
                          </span>
                        </div>
                      </div>
                      <Link href={`/lecture/${item.lecture.id}`}>
                        <Button variant="outline" size="sm">
                          <Play className="h-3.5 w-3.5 mr-1" /> 계속 학습
                        </Button>
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={item.progress.completionPercent || 0} className="flex-1" />
                      <span className="text-sm font-medium min-w-[3rem] text-right">
                        {item.progress.completionPercent || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">학습 기록이 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">강의에 참여하면 진도가 자동으로 추적됩니다.</p>
                  <Link href="/lectures">
                    <Button><BookOpen className="h-4 w-4 mr-1" /> 강의 둘러보기</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments" className="space-y-4">
            {enrollments && enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map((item) => (
                  <Card key={item.enrollment.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.lecture.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.lecture.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{item.lecture.category}</Badge>
                            <Badge variant={item.lecture.status === "live" ? "default" : "secondary"} className="text-xs">
                              {item.lecture.status === "live" ? "🔴 라이브" : item.lecture.status}
                            </Badge>
                          </div>
                        </div>
                        <Link href={`/lecture/${item.lecture.id}`}>
                          <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">수강 중인 강의가 없습니다</h3>
                  <Link href="/lectures">
                    <Button><BookOpen className="h-4 w-4 mr-1" /> 강의 둘러보기</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* VOD History Tab */}
          <TabsContent value="vod" className="space-y-4">
            {dashboard?.recentVodHistory && dashboard.recentVodHistory.length > 0 ? (
              dashboard.recentVodHistory.map((item) => (
                <Card key={item.history.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{item.vod.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.lecture.title} | 시청 {item.history.watchCount}회
                        </p>
                      </div>
                      <Link href={`/vod/${item.vod.id}`}>
                        <Button variant="outline" size="sm">
                          <Play className="h-3.5 w-3.5 mr-1" /> 이어보기
                        </Button>
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={item.history.completionPercent || 0} className="flex-1" />
                      <span className="text-sm font-medium min-w-[3rem] text-right">
                        {item.history.completionPercent || 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <Video className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">VOD 시청 이력이 없습니다</h3>
                  <Link href="/vod">
                    <Button><Play className="h-4 w-4 mr-1" /> VOD 둘러보기</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="space-y-4">
            {dashboard?.recentBookmarks && dashboard.recentBookmarks.length > 0 ? (
              dashboard.recentBookmarks.map((item) => (
                <Card key={item.bookmark.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.message.messageType === "question"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-green-500/10 text-green-400"
                      }`}>
                        {item.message.messageType === "question" ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {item.message.messageType === "question" ? "질문" : "답변"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.lecture.title}</span>
                        </div>
                        <p className="text-sm line-clamp-3">{item.message.content}</p>
                        {item.bookmark.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            <Star className="h-3 w-3 inline mr-1" />
                            {item.bookmark.note}
                          </p>
                        )}
                      </div>
                      <Link href={`/lecture/${item.lecture.id}`}>
                        <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <Bookmark className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">북마크가 없습니다</h3>
                  <p className="text-sm text-muted-foreground">강의 중 유용한 Q&A를 북마크해보세요.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
