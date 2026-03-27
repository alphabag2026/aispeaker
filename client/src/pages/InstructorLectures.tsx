import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
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
  Loader2,
  Upload,
} from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "준비중", color: "bg-muted text-muted-foreground" },
  scheduled: { label: "예정", color: "bg-blue-500/20 text-blue-400" },
  live: { label: "LIVE", color: "bg-green-500/20 text-green-400" },
  completed: { label: "완료", color: "bg-gray-500/20 text-gray-400" },
  archived: { label: "보관", color: "bg-gray-500/20 text-gray-400" },
};

export default function InstructorLectures() {
  const { data: lectures, refetch } = trpc.lecture.myLectures.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.lecture.delete.useMutation({
    onSuccess: () => {
      toast.success("강의가 삭제되었습니다.");
      utils.lecture.myLectures.invalidate();
    },
  });

  const goLiveMutation = trpc.lecture.goLive.useMutation({
    onSuccess: () => {
      toast.success("강의가 시작되었습니다!");
      utils.lecture.myLectures.invalidate();
    },
  });

  const endLectureMutation = trpc.lecture.endLecture.useMutation({
    onSuccess: () => {
      toast.success("강의가 종료되었습니다.");
      utils.lecture.myLectures.invalidate();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/instructor">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">강의 관리</h1>
              <p className="text-muted-foreground text-sm">강의를 생성하고 관리하세요</p>
            </div>
          </div>
          <Link href="/instructor/lectures/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              새 강의
            </Button>
          </Link>
        </div>

        {lectures && lectures.length > 0 ? (
          <div className="space-y-3">
            {lectures.map((lecture) => {
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
                            onClick={() => goLiveMutation.mutate({ id: lecture.id })}
                            disabled={goLiveMutation.isPending}
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
                            onClick={() => endLectureMutation.mutate({ id: lecture.id })}
                            disabled={endLectureMutation.isPending}
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
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">강의가 없습니다</h3>
            <p className="text-muted-foreground mb-4">첫 번째 AI 강의를 만들어보세요!</p>
            <Link href="/instructor/lectures/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 강의 만들기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
