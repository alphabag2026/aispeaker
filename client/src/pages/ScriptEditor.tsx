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
} from "lucide-react";
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
            <Button onClick={() => navigate("/studio")} variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" /> 스튜디오로
            </Button>
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
