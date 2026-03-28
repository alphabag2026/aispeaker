import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, GripVertical, RefreshCw, Edit3, Save, X, Clock, FileText,
  ChevronUp, ChevronDown, Trash2, Plus, Loader2, Wand2, SlidersHorizontal,
  History, RotateCcw, BarChart3, AlertCircle, CheckCircle, TrendingUp,
  BookOpen, Target, MessageSquare, Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useState, useCallback, useRef, useEffect } from "react";

interface Section {
  title: string;
  content: string;
  durationSec: number;
  slideNotes: string;
}

export default function ScriptEditor() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const scriptId = Number(params.id);

  const { data: script, isLoading, refetch } = trpc.script.getById.useQuery({ id: scriptId }, { enabled: !!scriptId });

  const updateSectionMutation = trpc.script.updateSection.useMutation({
    onSuccess: () => { toast.success("섹션이 업데이트되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const regenerateSectionMutation = trpc.script.regenerateSection.useMutation({
    onSuccess: () => { toast.success("섹션이 재생성되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reorderMutation = trpc.script.reorderSections.useMutation({
    onSuccess: () => { toast.success("섹션 순서가 변경되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateScriptMutation = trpc.script.update.useMutation({
    onSuccess: () => { toast.success("스크립트가 저장되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Section>({ title: "", content: "", durationSec: 0, slideNotes: "" });
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [scriptTitle, setScriptTitle] = useState("");
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [rollbackConfirm, setRollbackConfirm] = useState<number | null>(null);

  // v2.4: Version management
  const { data: versions, refetch: refetchVersions } = trpc.script.versions.useQuery(
    { scriptId },
    { enabled: !!scriptId && versionPanelOpen }
  );
  const saveVersionMutation = trpc.script.saveVersion.useMutation({
    onSuccess: () => { toast.success("버전이 저장되었습니다."); refetchVersions(); },
    onError: (e) => toast.error(e.message),
  });
  const rollbackMutation = trpc.script.rollback.useMutation({
    onSuccess: () => { toast.success("이전 버전으로 복원되었습니다."); refetch(); refetchVersions(); setRollbackConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  // v2.4: Content analysis
  const analyzeMutation = trpc.script.analyze.useMutation({
    onSuccess: () => { toast.success("분석이 완료되었습니다."); setAnalysisPanelOpen(true); },
    onError: (e) => toast.error(e.message),
  });
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = async () => {
    const result = await analyzeMutation.mutateAsync({ scriptId });
    setAnalysisResult(result);
  };

  useEffect(() => {
    if (script) {
      const parsed = script.sections ? JSON.parse(script.sections) : [];
      setSections(parsed);
      setScriptTitle(script.title || "");
    }
  }, [script]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로그인이 필요합니다.</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!script) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">스크립트를 찾을 수 없습니다.</div>;

  const totalDuration = sections.reduce((sum, s) => sum + (s.durationSec || 0), 0);

  // Drag and drop handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const newOrder = sections.map((_, i) => i);
    const [removed] = newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, removed);
    reorderMutation.mutate({ scriptId, newOrder });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Move section up/down
  const moveSection = (idx: number, direction: "up" | "down") => {
    const newOrder = sections.map((_, i) => i);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    reorderMutation.mutate({ scriptId, newOrder });
  };

  // Inline edit
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditForm({ ...sections[idx] });
  };
  const saveEdit = () => {
    if (editingIdx === null) return;
    updateSectionMutation.mutate({ scriptId, sectionIndex: editingIdx, ...editForm });
    setEditingIdx(null);
  };
  const cancelEdit = () => { setEditingIdx(null); };

  // Regenerate section
  const startRegen = (idx: number) => { setRegenIdx(idx); setRegenPrompt(""); };
  const doRegen = () => {
    if (regenIdx === null) return;
    regenerateSectionMutation.mutate({ scriptId, sectionIndex: regenIdx, customPrompt: regenPrompt || undefined });
    setRegenIdx(null);
  };

  // Save title
  const saveTitle = () => {
    if (scriptTitle !== script.title) {
      updateScriptMutation.mutate({ id: scriptId, title: scriptTitle });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-32 md:h-40 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-script-R59hKy4f2UyZt7RXjFfw6Y.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <p className="text-white/70 text-sm">스크립트 에디터</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/studio")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <Input
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                onBlur={saveTitle}
                className="text-xl font-bold bg-transparent border-none focus-visible:ring-1 h-auto py-1"
              />
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline">{script.category}</Badge>
                <Badge variant="outline">{script.difficulty}</Badge>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(totalDuration / 60)}분</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {sections.length}개 섹션</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveVersionMutation.mutate({ scriptId, changeDescription: "수동 저장" })}
                disabled={saveVersionMutation.isPending}
              >
                {saveVersionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden lg:inline ml-1">버전 저장</span>
              </Button>
              <Sheet open={versionPanelOpen} onOpenChange={setVersionPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4" />
                    <span className="hidden lg:inline ml-1">버전 이력</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[450px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><History className="h-5 w-5" /> 버전 이력</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                    {!versions || versions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">아직 저장된 버전이 없습니다.</p>
                        <p className="text-xs mt-1">"버전 저장" 버튼으로 현재 상태를 기록하세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((v: any) => (
                          <Card key={v.id} className="border">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={v.changeType === "rollback" ? "destructive" : v.changeType === "manual" ? "default" : "secondary"} className="text-xs">
                                    v{v.versionNumber}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {v.changeType === "auto" ? "자동" : v.changeType === "manual" ? "수동" : "롤백"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(v.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-sm font-medium truncate">{v.title}</p>
                              {v.changeDescription && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{v.changeDescription}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>{v.sectionCount}개 섹션</span>
                                <span>{Math.round((v.estimatedDurationSec || 0) / 60)}분</span>
                              </div>
                              {rollbackConfirm === v.id ? (
                                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                                  <p className="text-destructive font-medium text-xs">이 버전으로 복원하시겠습니까?</p>
                                  <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => rollbackMutation.mutate({ scriptId, versionId: v.id })} disabled={rollbackMutation.isPending}>
                                      {rollbackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                      <span className="ml-1">복원</span>
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRollbackConfirm(null)}>취소</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs w-full" onClick={() => setRollbackConfirm(v.id)}>
                                  <RotateCcw className="h-3 w-3 mr-1" /> 이 버전으로 복원
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                <span className="hidden lg:inline ml-1">AI 분석</span>
              </Button>
              <Button onClick={() => navigate("/studio")} variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-1" /> 스튜디오
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section List */}
      <div className="container py-6 max-w-4xl">
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <Card
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              className={`transition-all cursor-grab active:cursor-grabbing ${
                dragIdx === idx ? "opacity-50 scale-95" : ""
              } ${dragOverIdx === idx && dragIdx !== idx ? "border-primary border-2" : ""} ${
                editingIdx === idx ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-4">
                {editingIdx === idx ? (
                  /* Inline Edit Mode */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="shrink-0">{idx + 1}</Badge>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="섹션 제목"
                        className="font-semibold"
                      />
                    </div>
                    <Textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="강사 스크립트 내용"
                      rows={6}
                      className="text-sm"
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">예상 시간 (초)</label>
                        <Input
                          type="number"
                          value={editForm.durationSec}
                          onChange={(e) => setEditForm({ ...editForm, durationSec: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="text-xs text-muted-foreground">슬라이드 노트</label>
                        <Input
                          value={editForm.slideNotes}
                          onChange={(e) => setEditForm({ ...editForm, slideNotes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4 mr-1" /> 취소</Button>
                      <Button size="sm" onClick={saveEdit} disabled={updateSectionMutation.isPending}>
                        {updateSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, "up")} disabled={idx === 0 || reorderMutation.isPending}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1 || reorderMutation.isPending}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-base">{section.title}</h3>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {Math.round(section.durationSec / 60)}분 {section.durationSec % 60}초
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{section.content}</p>
                      {section.slideNotes && (
                        <div className="text-xs bg-muted/50 rounded px-2 py-1 text-muted-foreground mb-2">
                          📝 {section.slideNotes}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(idx)}>
                          <Edit3 className="h-3 w-3 mr-1" /> 편집
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startRegen(idx)} disabled={regenerateSectionMutation.isPending}>
                          {regenerateSectionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                          AI 재생성
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>섹션이 없습니다. 스튜디오에서 스크립트를 먼저 생성해주세요.</p>
          </div>
        )}

        {/* Summary */}
        {sections.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  총 {sections.length}개 섹션 · 예상 시간 {Math.round(totalDuration / 60)}분 {totalDuration % 60}초
                </div>
                <Button onClick={() => navigate("/studio")} className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> 영상 제작하기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Content Analysis Panel */}
      <Dialog open={analysisPanelOpen && !!analysisResult} onOpenChange={setAnalysisPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> AI 콘텐츠 분석 리포트</DialogTitle>
          </DialogHeader>
          {analysisResult && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                <div className="text-5xl font-bold text-primary mb-1">{analysisResult.overall}</div>
                <p className="text-sm text-muted-foreground">종합 점수</p>
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: "readability", label: "가독성", icon: BookOpen, color: "text-blue-500" },
                  { key: "difficulty", label: "난이도", icon: Target, color: "text-green-500" },
                  { key: "keyword", label: "키워드", icon: Sparkles, color: "text-purple-500" },
                  { key: "structure", label: "구조", icon: FileText, color: "text-orange-500" },
                  { key: "engagement", label: "참여도", icon: MessageSquare, color: "text-pink-500" },
                ].map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="text-center p-3 rounded-lg bg-card border">
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                    <div className="text-lg font-bold">{analysisResult.scores?.[key] || 0}</div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <Progress value={analysisResult.scores?.[key] || 0} className="h-1 mt-1" />
                  </div>
                ))}
              </div>

              {/* Metrics */}
              {analysisResult.metrics && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 주요 지표</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{analysisResult.metrics.totalWords?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">총 단어 수</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{analysisResult.metrics.avgSentenceLength}</div>
                        <p className="text-xs text-muted-foreground">평균 문장 길이</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-lg font-bold">{analysisResult.metrics.estimatedReadingTime}분</div>
                        <p className="text-xs text-muted-foreground">예상 읽기 시간</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Analysis Details */}
              {analysisResult.analysis && (
                <div className="space-y-3">
                  {analysisResult.analysis.keywords?.topKeywords && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-2">주요 키워드</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.analysis.keywords.topKeywords.map((kw: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Suggestions */}
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI 개선 제안</h4>
                    <div className="space-y-2">
                      {analysisResult.suggestions.map((s: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                          {s.priority === "high" ? (
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          ) : s.priority === "medium" ? (
                            <TrendingUp className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <Badge variant="outline" className="text-[10px] mb-1">
                              {s.category === "readability" ? "가독성" : s.category === "difficulty" ? "난이도" : s.category === "keyword" ? "키워드" : s.category === "structure" ? "구조" : "참여도"}
                            </Badge>
                            <p className="text-sm">{s.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={regenIdx !== null} onOpenChange={(open) => !open && setRegenIdx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>섹션 AI 재생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {regenIdx !== null && sections[regenIdx] && (
              <div className="bg-muted/50 rounded p-3 text-sm">
                <p className="font-medium mb-1">현재 섹션: {sections[regenIdx].title}</p>
                <p className="text-muted-foreground line-clamp-2">{sections[regenIdx].content}</p>
              </div>
            )}
            <Textarea
              value={regenPrompt}
              onChange={(e) => setRegenPrompt(e.target.value)}
              placeholder="수정 요청을 입력하세요 (비워두면 자동으로 개선됩니다)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenIdx(null)}>취소</Button>
            <Button onClick={doRegen} disabled={regenerateSectionMutation.isPending}>
              {regenerateSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              재생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
