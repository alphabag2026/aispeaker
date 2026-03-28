import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Radio,
  StopCircle,
  BookOpen,
  ArrowLeft,
} from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "준비중", color: "bg-muted text-muted-foreground" },
  scheduled: { label: "예정", color: "bg-blue-500/20 text-blue-400" },
  live: { label: "LIVE", color: "bg-green-500/20 text-green-400" },
  completed: { label: "완료", color: "bg-gray-500/20 text-gray-400" },
  archived: { label: "보관", color: "bg-gray-500/20 text-gray-400" },
};

export default function InstructorLectures() {
  const { user } = useAuth();
  const { data: lectures, refetch } = trpc.lecture.list.useQuery(
    { instructorId: user?.id },
    { enabled: !!user }
  );
  const utils = trpc.useUtils();

  const deleteMutation = trpc.lecture.delete.useMutation({
    onSuccess: () => {
      toast.success("강의가 삭제되었습니다.");
      refetch();
    },
  });

  const updateMutation = trpc.lecture.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleGoLive = (id: number) => {
    updateMutation.mutate({ id, status: "live" }, {
      onSuccess: () => toast.success("강의가 시작되었습니다!"),
    });
  };

  const handleEndLecture = (id: number) => {
    updateMutation.mutate({ id, status: "completed" }, {
      onSuccess: () => toast.success("강의가 종료되었습니다."),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-instructor-5bFzgmsZjjbs7sd8CyMpsR.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/instructor">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">강의 관리</h1>
                  <p className="text-white/70">강의를 생성하고 관리하세요</p>
                </div>
              </div>
              <Link href="/instructor/lectures/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 강의
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">

        {lectures && lectures.length > 0 ? (
          <div className="space-y-3">
            {lectures.map((lecture: any) => {
              const status = statusLabels[lecture.status] || statusLabels.draft;
              return (
                <Card key={lecture.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{lecture.title}</h3>
                          <Badge variant="outline" className={`${status.color} border-0 shrink-0`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lecture.category} · AI 모드: {lecture.aiMode} · {new Date(lecture.createdAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {lecture.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-green-400"
                            onClick={() => handleGoLive(lecture.id)}
                            disabled={updateMutation.isPending}
                          >
                            <Radio className="h-3.5 w-3.5" />
                            시작
                          </Button>
                        )}
                        {lecture.status === "live" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-destructive"
                            onClick={() => handleEndLecture(lecture.id)}
                            disabled={updateMutation.isPending}
                          >
                            <StopCircle className="h-3.5 w-3.5" />
                            종료
                          </Button>
                        )}
                        <Link href={`/instructor/lectures/${lecture.id}/edit`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Edit className="h-3.5 w-3.5" />
                            편집
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive"
                          onClick={() => {
                            if (confirm("정말 삭제하시겠습니까?")) {
                              deleteMutation.mutate({ id: lecture.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            type="lectures"
            title="강의가 없습니다"
            description="첫 번째 AI 강의를 만들어보세요!"
            actionLabel="새 강의 만들기"
            actionHref="/instructor/lectures/new"
          />
        )}
      </div>
    </div>
  );
}
