import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function MyEnrollments() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: enrollments, isLoading } = trpc.enrollment.myEnrollments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">{t("me.loginRequired")}</h2>
          <Button asChild>
            <a href={getLoginUrl()}>{t("me.login")}</a>
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
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-my-courses-2ZXexYSrAS9FTAXsurEWdN.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t("me.myEnrollments")}</h1>
            <p className="text-white/70 text-lg">{t("me.checkYourCourses")}</p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : enrollments && enrollments.length > 0 ? (
          <div className="space-y-3">
            {enrollments.map((item) => (
              <Link key={item.enrollment.id} href={`/lecture/${item.enrollment.lectureId}`}>
                <Card className="bg-card hover:border-primary/30 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {item.lecture?.title || `${t("me.lecture")} #${item.enrollment.lectureId}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("me.enrollmentStartDate")}: {new Date(item.enrollment.joinedAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("me.noCourses")}</h3>
            <p className="text-muted-foreground mb-4">{t("me.browseAndEnroll")}</p>
            <Link href="/lectures">
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" />
                {t("me.browseCourses")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
