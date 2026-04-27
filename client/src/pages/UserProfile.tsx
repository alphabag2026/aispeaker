import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  User, Zap, Image, Calendar, Edit3, Save, X,
  Sparkles, ArrowRight, Shield, Globe,
} from "lucide-react";

export default function UserProfile() {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: !!user });
  const updateMut = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("프로필 업데이트 완료");
      setEditing(false);
      profileQuery.refetch();
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">로그인이 필요합니다</p>
          <Link href="/">
            <Button>홈으로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const data = profileQuery.data;
  const maxCredits = 1000;
  const creditPercent = data ? Math.min((data.credits / maxCredits) * 100, 100) : 0;

  const startEdit = () => {
    setName(data?.user.name || "");
    setBio(data?.user.bio || "");
    setEditing(true);
  };

  const saveProfile = () => {
    updateMut.mutate({ name, bio });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">내 프로필</h1>
          <Link href="/ai-studio">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Studio
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-white" />
                </div>
                {editing ? (
                  <div className="w-full space-y-3">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개" rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveProfile} disabled={updateMut.isPending}>
                        <Save className="h-3 w-3 mr-1" /> 저장
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="h-3 w-3 mr-1" /> 취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">{data?.user.name || user.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{data?.user.bio || "자기소개를 입력해주세요"}</p>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={startEdit}>
                      <Edit3 className="h-3 w-3 mr-1" /> 편집
                    </Button>
                  </>
                )}
                <div className="w-full mt-4 pt-4 border-t space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">역할:</span>
                    <Badge variant="secondary">{data?.user.role || user.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">언어:</span>
                    <span>{data?.user.preferredLang || "ko"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">가입:</span>
                    <span>{data?.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString("ko-KR") : "-"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credits Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  크레딧 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mb-3">
                  <span className="text-4xl font-bold">{data?.credits ?? 0}</span>
                  <span className="text-muted-foreground mb-1">/ {maxCredits}</span>
                </div>
                <Progress value={creditPercent} className="h-2 mb-4" />
                <div className="flex gap-3">
                  <Link href="/credits">
                    <Button size="sm" variant="outline">사용 내역</Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="sm">충전하기 <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Generation Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  AI 생성 활동
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <p className="text-3xl font-bold">{data?.generationCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">총 생성 횟수</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{data?.recentGallery?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">갤러리 공유</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href="/ai-history">
                    <Button size="sm" variant="outline">히스토리 보기</Button>
                  </Link>
                  <Link href="/community">
                    <Button size="sm" variant="outline">
                      <Image className="h-3 w-3 mr-1" /> 내 갤러리
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Gallery */}
            {data?.recentGallery && data.recentGallery.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">최근 공유 작품</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {data.recentGallery.slice(0, 6).map((post: any) => (
                      <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        {post.mediaType === "image" ? (
                          <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            {post.mediaType}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
