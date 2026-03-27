import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BookOpen, ArrowRight, GraduationCap } from "lucide-react";

export default function MyEnrollments() {
  const { isAuthenticated } = useAuth();
  const { data: enrollments, isLoading } = trpc.enrollment.myEnrollments.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">내 수강 목록</h1>
          <p className="text-muted-foreground">수강 신청한 강의를 확인하세요</p>
        </div>

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
                          {item.lecture?.title || `강의 #${item.enrollment.lectureId}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          수강 시작: {new Date(item.enrollment.joinedAt).toLocaleDateString("ko-KR")}
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
            <h3 className="text-lg font-semibold mb-2">수강 중인 강의가 없습니다</h3>
            <p className="text-muted-foreground mb-4">강의를 둘러보고 수강 신청해보세요!</p>
            <Link href="/lectures">
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" />
                강의 둘러보기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
