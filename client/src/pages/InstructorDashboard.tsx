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
  Play,
  HelpCircle,
  History,
  BookTemplate,
  ListChecks,
  Image,
  GitBranch,
  BarChart3,
  PlayCircle,
  Tv,
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function InstructorDashboard() {
  const { t } = useTranslation();
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
          <h2 className="text-2xl font-bold mb-4">{t("id.loginRequired")}</h2>
          <Button asChild>
            <a href={getLoginUrl()}>{t("id.login")}</a>
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
          <h2 className="text-2xl font-bold mb-4">{t("id.startAsInstructor")}</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t("id.instructorDescription")}
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
            {t("id.switchToInstructor")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-instructor-5bFzgmsZjjbs7sd8CyMpsR.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{t("id.instructorDashboard")}</h1>
                <p className="text-white/70 text-lg mt-2">{t("id.dashboardSubtitle")}</p>
              </div>
              <Link href="/instructor/lectures/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("id.createNewLecture")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">

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
                  <p className="text-sm text-muted-foreground">{t("id.totalLectures")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("id.totalStudents")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("id.inProgress")}</p>
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
                    <h3 className="font-semibold">{t("id.lectureManagement")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.lectureManagementDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.voiceProfile")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.voiceProfileDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.vodArchive")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.vodArchiveDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.aiTemplates")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.aiTemplatesDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.deepfakeFace")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.deepfakeFaceDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.voiceModulation")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.voiceModulationDesc")}</p>
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
                    <h3 className="font-semibold">{t("id.externalPlatforms")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.externalPlatformsDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v2.1 Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/studio">
            <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Play className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.oneClickStudio")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.oneClickStudioDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/obs-tutorial">
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.obsGuide")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.obsGuideDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/pipeline-dashboard">
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <History className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.productionHistoryDashboard")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.productionHistoryDashboardDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v2.3 Quick Actions */}
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{t("id.v2_3_tools")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/script-templates">
            <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <BookTemplate className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.scriptTemplateLibrary")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.scriptTemplateLibraryDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/studio?tab=batch">
            <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <ListChecks className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.batchVideoProduction")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.batchVideoProductionDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/pipeline-dashboard">
            <Card className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 hover:border-pink-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Image className="h-5 w-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.aiThumbnailGeneration")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.aiThumbnailGenerationDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-pink-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v2.4 Quick Actions */}
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{t("id.v2_4_tools")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/studio">
            <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.scriptVersionControl")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.scriptVersionControlDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/pipeline-dashboard">
            <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.integratedPreviewPlayer")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.integratedPreviewPlayerDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/studio">
            <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 hover:border-orange-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.aiContentAnalysis")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.aiContentAnalysisDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* v2.5 Quick Actions */}
        <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{t("id.v2_5_tools")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/broadcasts">
            <Card className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30 hover:border-red-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Tv className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.liveBroadcast")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.liveBroadcastDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/broadcasts">
            <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-500/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("id.broadcastManagement")}</h3>
                    <p className="text-sm text-muted-foreground">{t("id.broadcastManagementDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Lectures */}
        {myLectures && myLectures.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">{t("id.recentLectures")}</h2>
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
