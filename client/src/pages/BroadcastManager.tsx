import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Radio, Plus, Play, Pause, Square, Users, Clock, Copy, ExternalLink,
  ArrowLeft, Tv, MessageSquare, Eye
} from "lucide-react";

const TTS_VOICES = [
  { id: "alloy", name: "Alloy", desc: "중성적, 균형잡힌 톤" },
  { id: "echo", name: "Echo", desc: "남성적, 깊은 톤" },
  { id: "fable", name: "Fable", desc: "영국식, 따뜻한 톤" },
  { id: "onyx", name: "Onyx", desc: "남성적, 권위있는 톤" },
  { id: "nova", name: "Nova", desc: "여성적, 밝은 톤" },
  { id: "shimmer", name: "Shimmer", desc: "여성적, 부드러운 톤" },
];

export default function BroadcastManager() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedScript, setSelectedScript] = useState("");
  const [ttsVoice, setTtsVoice] = useState("alloy");
  const [filter, setFilter] = useState<"all" | "scheduled" | "live" | "ended">("all");

  const scripts = trpc.script.list.useQuery(undefined, { enabled: !!user });
  const broadcasts = trpc.broadcast.list.useQuery(undefined, { enabled: !!user });
  const createBroadcast = trpc.broadcast.create.useMutation({
    onSuccess: (data) => {
      toast.success(`방송방이 생성되었습니다! 코드: ${data.roomCode}`);
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setSelectedScript("");
      broadcasts.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const readyScripts = scripts.data?.filter((s: any) => s.status === "ready") || [];

  const filteredBroadcasts = broadcasts.data?.filter((item: any) => {
    if (filter === "all") return true;
    return item.broadcast.status === filter;
  }) || [];

  const handleCreate = () => {
    if (!selectedScript || !title.trim()) {
      toast.error("스크립트와 제목을 입력해주세요.");
      return;
    }
    createBroadcast.mutate({
      scriptId: parseInt(selectedScript),
      title: title.trim(),
      description: description.trim() || undefined,
      ttsVoiceId: ttsVoice,
    });
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("방송 코드가 복사되었습니다!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled": return <Badge variant="outline" className="text-blue-400 border-blue-400"><Clock className="w-3 h-3 mr-1" />예정</Badge>;
      case "live": return <Badge className="bg-red-500 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" />LIVE</Badge>;
      case "paused": return <Badge variant="outline" className="text-yellow-400 border-yellow-400"><Pause className="w-3 h-3 mr-1" />일시정지</Badge>;
      case "ended": return <Badge variant="secondary"><Square className="w-3 h-3 mr-1" />종료</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/instructor")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Tv className="w-8 h-8 text-red-500" />
                라이브 방송 관리
              </h1>
              <p className="text-muted-foreground mt-1">AI 강사가 슬라이드를 보여주며 실시간 강의를 진행합니다</p>
            </div>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                새 방송 만들기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>새 라이브 방송 만들기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">방송 제목 *</label>
                  <Input
                    placeholder="예: Web3 기초 강의 - 블록체인의 이해"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">방송 설명</label>
                  <Textarea
                    placeholder="방송 내용을 간단히 설명해주세요..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">강의 스크립트 선택 *</label>
                  <Select value={selectedScript} onValueChange={setSelectedScript}>
                    <SelectTrigger>
                      <SelectValue placeholder="스크립트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {readyScripts.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.title} ({s.sectionCount}개 섹션)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {readyScripts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      준비 완료된 스크립트가 없습니다. 먼저 스크립트를 생성해주세요.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">TTS 음성</label>
                  <Select value={ttsVoice} onValueChange={setTtsVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_VOICES.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} - {v.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
                <Button onClick={handleCreate} disabled={createBroadcast.isPending}>
                  {createBroadcast.isPending ? "생성 중..." : "방송방 생성"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "전체" },
            { key: "live", label: "방송 중" },
            { key: "scheduled", label: "예정" },
            { key: "ended", label: "종료" },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key as any)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Broadcast List */}
        {filteredBroadcasts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Tv className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {filter === "all" ? "아직 방송이 없습니다." : `${filter === "live" ? "진행 중인" : filter === "scheduled" ? "예정된" : "종료된"} 방송이 없습니다.`}
              </p>
              <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                첫 방송 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBroadcasts.map((item: any) => {
              const b = item.broadcast;
              const s = item.script;
              return (
                <Card key={b.id} className={`transition-all ${b.status === "live" ? "border-red-500/50 shadow-red-500/10 shadow-lg" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(b.status)}
                          <h3 className="text-lg font-semibold">{b.title}</h3>
                        </div>
                        {b.description && (
                          <p className="text-sm text-muted-foreground mb-3">{b.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            코드: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{b.roomCode}</code>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyRoomCode(b.roomCode)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {b.currentViewers || 0}명 시청
                            {b.peakViewers ? ` (최대 ${b.peakViewers})` : ""}
                          </span>
                          {s && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {s.sectionCount || 0}개 섹션
                            </span>
                          )}
                          <span>
                            {new Date(b.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(b.status === "scheduled" || b.status === "live" || b.status === "paused") && (
                          <Button
                            onClick={() => navigate(`/broadcast/studio/${b.id}`)}
                            className="gap-2"
                            variant={b.status === "live" ? "destructive" : "default"}
                          >
                            {b.status === "live" ? <Radio className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {b.status === "live" ? "스튜디오" : "방송 시작"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/broadcast/view/${b.roomCode}`)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          시청자 뷰
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Live Broadcasts Section (Public) */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            현재 진행 중인 방송
          </h2>
          <LiveBroadcastList />
        </div>
      </div>
    </div>
  );
}

function LiveBroadcastList() {
  const [, navigate] = useLocation();
  const liveBroadcasts = trpc.broadcast.liveList.useQuery(undefined, {
    refetchInterval: 5000,
  });

  if (!liveBroadcasts.data || liveBroadcasts.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">현재 진행 중인 방송이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {liveBroadcasts.data.map((item: any) => {
        const b = item.broadcast;
        const instructor = item.instructor;
        return (
          <Card key={b.id} className="border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer"
            onClick={() => navigate(`/broadcast/view/${b.roomCode}`)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-red-500 text-white animate-pulse text-xs">
                  <Radio className="w-3 h-3 mr-1" />LIVE
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />{b.currentViewers || 0}
                </span>
              </div>
              <CardTitle className="text-base mt-2">{b.title}</CardTitle>
              <CardDescription>
                {instructor?.name || "강사"} 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gap-2" variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                시청하기
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
