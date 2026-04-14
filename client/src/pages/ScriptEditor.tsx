
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

import { useTranslation } from "@/contexts/LanguageContext";
interface Section {
  title: string;
  content: string;
  durationSec: number;
  slideNotes: string;
}

export default function ScriptEditor() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const scriptId = Number(params.id);

  const { data: script, isLoading, refetch } = trpc.script.getById.useQuery({ id: scriptId }, { enabled: !!scriptId });

  const updateSectionMutation = trpc.script.updateSection.useMutation({
    onSuccess: () => { toast.success(t("se.section_updated")); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const regenerateSectionMutation = trpc.script.regenerateSection.useMutation({
    onSuccess: () => { toast.success(t("se.section_regenerated")); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reorderMutation = trpc.script.reorderSections.useMutation({
    onSuccess: () => { toast.success(t("se.section_reordered")); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateScriptMutation = trpc.script.update.useMutation({
    onSuccess: () => { toast.success(t("se.script_saved")); refetch(); },
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
    onSuccess: () => { toast.success(t("se.version_saved")); refetchVersions(); },
    onError: (e) => toast.error(e.message),
  });
  const rollbackMutation = trpc.script.rollback.useMutation({
    onSuccess: () => { toast.success(t("se.restored")); refetch(); refetchVersions(); setRollbackConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  // v2.4: Content analysis
  const analyzeMutation = trpc.script.analyze.useMutation({
    onSuccess: () => { toast.success(t("se.analysis_complete")); setAnalysisPanelOpen(true); },
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

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("se.login_required")}</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!script) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("se.script_not_found")}</div>;

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
            <p className="text-white/70 text-sm">{t("se.script_editor")}</p>
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
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(totalDuration / 60)}{t("se.minutes")}</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {sections.length}{t("se.sections_count")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveVersionMutation.mutate({ scriptId, changeDescription: t("se.manual_save") })}
                disabled={saveVersionMutation.isPending}
              >
                {saveVersionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="hidden lg:inline ml-1">{t("se.save_version")}</span>
              </Button>
              <Sheet open={versionPanelOpen} onOpenChange={setVersionPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4" />
                    <span className="hidden lg:inline ml-1">{t("se.version_history")}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[450px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><History className="h-5 w-5" /> {t("se.version_history")}</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                    {!versions || versions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">{t("se.no_versions_yet")}</p>
                        <p className="text-xs mt-1">{t("se.use_save_version_button")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {versions.map((v: any) => (
                          <Card key={v.id} className="border">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm flex items-center gap-1.5">
                                    {v.version === script.version && <Badge variant="default" className="text-[10px] px-1.5 py-0">{t("se.current_version")}</Badge>}
                                    {v.changeDescription}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{new Date(v.createdAt).toLocaleString()}</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setRollbackConfirm(v.version)} disabled={v.version === script.version || rollbackMutation.isPending}>
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  {t("se.restore")}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              <Dialog open={rollbackConfirm !== null} onOpenChange={(open) => !open && setRollbackConfirm(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("se.confirm_restore_title")}</DialogTitle>
                  </DialogHeader>
                  <p>{t("se.confirm_restore")}</p>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setRollbackConfirm(null)}>{t("se.cancel")}</Button>
                    <Button variant="destructive" onClick={() => rollbackMutation.mutate({ scriptId, version: rollbackConfirm! })} disabled={rollbackMutation.isPending}>
                      {rollbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      <span className="ml-1">{t("se.restore")}</span>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Sheet open={analysisPanelOpen} onOpenChange={setAnalysisPanelOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                    {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                    <span className="hidden lg:inline ml-1">{t("se.content_analysis")}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[450px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> {t("se.content_analysis")}</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                    {analysisResult ? (
                      <div className="space-y-4 text-sm">
                        <Card>
                          <CardHeader className="p-3">
                            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {t("se.target_audience_and_difficulty")}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p><strong>{t("se.target_audience")}:</strong> {analysisResult.targetAudience}</p>
                            <p><strong>{t("se.difficulty")}:</strong> {analysisResult.difficulty}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="p-3">
                            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("se.core_keywords")}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.keywords.map((kw: string) => <Badge key={kw} variant="secondary">{kw}</Badge>)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="p-3">
                            <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {t("se.summary")}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p>{analysisResult.summary}</p>
                          </CardContent>
                        </Card>
                        {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                          <Card>
                            <CardHeader className="p-3">
                              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t("se.ai_improvement_suggestions")}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
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
                                        {s.category === "readability" ? t("se.readability") : s.category === "difficulty" ? t("se.difficulty") : s.category === "keyword" ? t("se.keywords") : s.category === "structure" ? t("se.structure") : t("se.engagement")}
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
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">{t("se.run_analysis_prompt")}</p>
                        <Button size="sm" className="mt-3" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                          {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                          {t("se.start_analysis")}
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2
"><SlidersHorizontal className="h-5 w-5" /> {t("se.script_structure")}</h2>
          <Button size="sm" onClick={() => {}}><Plus className="h-4 w-4 mr-1" /> {t("se.add_section")}</Button>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(idx)}
                className={`transition-all duration-300 ${dragIdx === idx ? "opacity-50" : ""} ${dragOverIdx === idx ? "bg-primary/10" : ""}`}
              >
                {editingIdx === idx ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder={t("se.section_title")}
                        className="font-bold text-base"
                      />
                      <Textarea
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        rows={6}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editForm.durationSec}
                          onChange={(e) => setEditForm({ ...editForm, durationSec: Number(e.target.value) })}
                          className="w-24"
                        />
                        <span>{t("se.seconds")}</span>
                      </div>
                      <Textarea
                        value={editForm.slideNotes}
                        onChange={(e) => setEditForm({ ...editForm, slideNotes: e.target.value })}
                        placeholder={t("se.slide_notes")}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={cancelEdit}>{t("se.cancel")}</Button>
                        <Button onClick={saveEdit} disabled={updateSectionMutation.isPending}>
                          {updateSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          <span className="ml-1">{t("se.save")}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="group relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-1 z-10">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(idx)}><Edit3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startRegen(idx)}><Wand2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, "up")} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {}}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <CardHeader className="flex-row items-start gap-3 p-4 cursor-grab active:cursor-grabbing bg-card">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                      <div>
                        <CardTitle className="text-base mb-1">{section.title}</CardTitle>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {section.durationSec} {t("se.seconds")}</span>
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {section.content.split(" ").length} {t("se.words")}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-muted-foreground leading-relaxed">
                      <p className="line-clamp-3">{section.content}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">{t("se.script_empty")}</p>
            <p className="text-sm mt-1">{t("se.add_first_section_prompt")}</p>
          </div>
        )}

        <Separator className="my-6" />

        <div className="flex justify-end items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("se.total_length")}: {Math.floor(totalDuration / 60)}{t("se.minutes")} {totalDuration % 60}{t("se.seconds")}</span>
          <Button size="lg" onClick={() => navigate(`/studio/generate/${scriptId}`)}>
            <Sparkles className="h-5 w-5 mr-2" />
            {t("se.generate_video")}
          </Button>
        </div>
      </main>

      {/* Analysis Result Dialog */}
      <Dialog open={analysisPanelOpen && !!analysisResult} onOpenChange={(open) => !open && setAnalysisPanelOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> {t("se.analysis_results")}</DialogTitle>
          </DialogHeader>
          {analysisResult && (
            <div className="max-h-[80vh] overflow-y-auto pr-2 space-y-4 text-sm">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {t("se.target_audience_and_difficulty")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p><strong>{t("se.target_audience")}:</strong> {analysisResult.targetAudience}</p>
                  <p><strong>{t("se.difficulty")}:</strong> {analysisResult.difficulty}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("se.core_keywords")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.keywords.map((kw: string) => <Badge key={kw} variant="secondary">{kw}</Badge>)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {t("se.summary")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p>{analysisResult.summary}</p>
                </CardContent>
              </Card>
              {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t("se.ai_improvement_suggestions")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
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
                              {s.category === "readability" ? t("se.readability") : s.category === "difficulty" ? t("se.difficulty") : s.category === "keyword" ? t("se.keywords") : s.category === "structure" ? t("se.structure") : t("se.engagement")}
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
            <DialogTitle>{t("se.ai_regenerate_section")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {regenIdx !== null && sections[regenIdx] && (
              <div className="bg-muted/50 rounded p-3 text-sm">
                <p className="font-medium mb-1">{t("se.current_section")}: {sections[regenIdx].title}</p>
                <p className="text-muted-foreground line-clamp-2">{sections[regenIdx].content}</p>
              </div>
            )}
            <Textarea
              value={regenPrompt}
              onChange={(e) => setRegenPrompt(e.target.value)}
              placeholder={t("se.edit_request_placeholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenIdx(null)}>{t("se.cancel")}</Button>
            <Button onClick={doRegen} disabled={regenerateSectionMutation.isPending}>
              {regenerateSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              {t("se.regenerate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
