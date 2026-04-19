
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
  BookOpen, Target, MessageSquare, Sparkles, Eye, EyeOff, Timer, Copy,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    onError: (e: any) => toast.error(e.message),
  });
  const regenerateSectionMutation = trpc.script.regenerateSection.useMutation({
    onSuccess: () => { toast.success(t("se.section_regenerated")); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reorderMutation = trpc.script.reorderSections.useMutation({
    onSuccess: () => { toast.success(t("se.section_reordered")); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateScriptMutation = trpc.script.update.useMutation({
    onSuccess: () => { toast.success(t("se.script_saved")); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const addSectionMutation = trpc.script.addSection.useMutation({
    onSuccess: () => { toast.success(t("se.section_added")); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteSectionMutation = trpc.script.deleteSection.useMutation({
    onSuccess: () => { toast.success(t("se.section_deleted")); refetch(); },
    onError: (e: any) => toast.error(e.message),
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
  const [previewMode, setPreviewMode] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [addAfterIdx, setAddAfterIdx] = useState<number>(-1);
  const [newSectionForm, setNewSectionForm] = useState({ title: "", content: "", durationSec: 60 });

  // v2.4: Version management
  const { data: versions, refetch: refetchVersions } = trpc.script.versions.useQuery(
    { scriptId },
    { enabled: !!scriptId && versionPanelOpen }
  );
  const saveVersionMutation = trpc.script.saveVersion.useMutation({
    onSuccess: () => { toast.success(t("se.version_saved")); refetchVersions(); },
    onError: (e: any) => toast.error(e.message),
  });
  const rollbackMutation = trpc.script.rollback.useMutation({
    onSuccess: () => { toast.success(t("se.restored")); refetch(); refetchVersions(); setRollbackConfirm(null); },
    onError: (e: any) => toast.error(e.message),
  });

  // v2.4: Content analysis
  const analyzeMutation = trpc.script.analyze.useMutation({
    onSuccess: () => { toast.success(t("se.analysis_complete")); setAnalysisPanelOpen(true); },
    onError: (e: any) => toast.error(e.message),
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

  // Add section
  const handleAddSection = () => {
    addSectionMutation.mutate({
      scriptId,
      afterIndex: addAfterIdx,
      title: newSectionForm.title || undefined,
      content: newSectionForm.content || undefined,
      durationSec: newSectionForm.durationSec || 60,
    });
    setAddSectionDialogOpen(false);
    setNewSectionForm({ title: "", content: "", durationSec: 60 });
  };

  // Delete section
  const handleDeleteSection = (idx: number) => {
    deleteSectionMutation.mutate({ scriptId, sectionIndex: idx });
    setDeleteConfirmIdx(null);
  };

  // Duration slider change (inline, saves on release)
  const handleDurationSliderChange = (idx: number, value: number[]) => {
    const newSections = [...sections];
    newSections[idx] = { ...newSections[idx], durationSec: value[0] };
    setSections(newSections);
  };
  const handleDurationSliderCommit = (idx: number, value: number[]) => {
    updateSectionMutation.mutate({ scriptId, sectionIndex: idx, durationSec: value[0] });
  };

  // Copy full script to clipboard
  const copyFullScript = () => {
    const fullText = sections.map((s, i) => `[${i + 1}] ${s.title}\n${s.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success(t("se.copied_to_clipboard"));
  };

  // Format time
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}${t("se.minutes")} ${s}${t("se.seconds")}` : `${s}${t("se.seconds")}`;
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
              {/* Preview toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={previewMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="hidden lg:inline ml-1">{previewMode ? t("se.edit_mode") : t("se.preview_mode")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{previewMode ? t("se.switch_to_edit") : t("se.switch_to_preview")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
                                    {v.changeDescription}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{new Date(v.createdAt).toLocaleString()}</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setRollbackConfirm(v.id)} disabled={rollbackMutation.isPending}>
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
                    <Button variant="destructive" onClick={() => rollbackMutation.mutate({ scriptId, versionId: rollbackConfirm! })} disabled={rollbackMutation.isPending}>
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
        {/* Preview Mode */}
        {previewMode ? (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" /> {t("se.full_preview")}
              </h2>
              <Button variant="outline" size="sm" onClick={copyFullScript}>
                <Copy className="h-4 w-4 mr-1" /> {t("se.copy_all")}
              </Button>
            </div>

            {/* Time distribution bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1"><Timer className="h-4 w-4" /> {t("se.time_distribution")}</span>
                  <span className="text-sm text-muted-foreground">{t("se.total_length")}: {formatTime(totalDuration)}</span>
                </div>
                <div className="flex h-6 rounded-md overflow-hidden gap-0.5">
                  {sections.map((s, i) => {
                    const pct = totalDuration > 0 ? (s.durationSec / totalDuration) * 100 : 0;
                    const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500"];
                    return (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`${colors[i % colors.length]} transition-all cursor-pointer hover:opacity-80`}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{s.title}</p>
                            <p className="text-xs">{formatTime(s.durationSec)} ({Math.round(pct)}%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Full script preview */}
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">{idx + 1}</Badge>
                    <h3 className="font-semibold text-base">{section.title}</h3>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatTime(section.durationSec)}
                    </span>
                  </div>
                  <div className="pl-8 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {section.content}
                  </div>
                  {section.slideNotes && (
                    <div className="pl-8 mt-2 text-xs text-muted-foreground italic border-l-2 border-muted ml-2 pl-3">
                      {t("se.slide_notes")}: {section.slideNotes}
                    </div>
                  )}
                  {idx < sections.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>

            <Separator className="my-6" />
            <div className="flex justify-end items-center gap-3">
              <span className="text-sm text-muted-foreground">{t("se.total_length")}: {formatTime(totalDuration)}</span>
              <Button size="lg" onClick={() => navigate(`/studio/generate/${scriptId}`)}>
                <Sparkles className="h-5 w-5 mr-2" />
                {t("se.generate_video")}
              </Button>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" /> {t("se.script_structure")}
              </h2>
              <Button size="sm" onClick={() => { setAddAfterIdx(-1); setAddSectionDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> {t("se.add_section")}
              </Button>
            </div>

            {/* Time distribution bar (edit mode) */}
            {sections.length > 0 && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1"><Timer className="h-4 w-4" /> {t("se.time_distribution")}</span>
                    <span className="text-sm text-muted-foreground">{t("se.total_length")}: {formatTime(totalDuration)}</span>
                  </div>
                  <div className="flex h-4 rounded-md overflow-hidden gap-0.5">
                    {sections.map((s, i) => {
                      const pct = totalDuration > 0 ? (s.durationSec / totalDuration) * 100 : 0;
                      const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500"];
                      return (
                        <div
                          key={i}
                          className={`${colors[i % colors.length]} transition-all`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                          title={`${s.title}: ${formatTime(s.durationSec)}`}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {sections.length > 0 ? (
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={idx}>
                    <div
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
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium w-20">{formatTime(editForm.durationSec)}</span>
                                <Slider
                                  value={[editForm.durationSec]}
                                  onValueChange={(v) => setEditForm({ ...editForm, durationSec: v[0] })}
                                  min={10}
                                  max={600}
                                  step={5}
                                  className="flex-1"
                                />
                              </div>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddAfterIdx(idx); setAddSectionDialogOpen(true); }}><Plus className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmIdx(idx)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <CardHeader className="flex-row items-start gap-3 p-4 cursor-grab active:cursor-grabbing bg-card">
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs font-mono">{idx + 1}</Badge>
                                <CardTitle className="text-base">{section.title}</CardTitle>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(section.durationSec)}</span>
                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {section.content.length} {t("se.chars")}</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{section.content}</p>
                            {/* Inline duration slider */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                              <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <Slider
                                value={[section.durationSec]}
                                onValueChange={(v) => handleDurationSliderChange(idx, v)}
                                onValueCommit={(v) => handleDurationSliderCommit(idx, v)}
                                min={10}
                                max={600}
                                step={5}
                                className="flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-16 text-right">{formatTime(section.durationSec)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-semibold">{t("se.script_empty")}</p>
                <p className="text-sm mt-1">{t("se.add_first_section_prompt")}</p>
                <Button className="mt-4" onClick={() => { setAddAfterIdx(-1); setAddSectionDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> {t("se.add_section")}
                </Button>
              </div>
            )}

            <Separator className="my-6" />

            <div className="flex justify-end items-center gap-3">
              <span className="text-sm text-muted-foreground">{t("se.total_length")}: {formatTime(totalDuration)}</span>
              <Button size="lg" onClick={() => navigate(`/studio/generate/${scriptId}`)}>
                <Sparkles className="h-5 w-5 mr-2" />
                {t("se.generate_video")}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Add Section Dialog */}
      <Dialog open={addSectionDialogOpen} onOpenChange={setAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> {t("se.add_new_section")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("se.section_title")}</label>
              <Input
                value={newSectionForm.title}
                onChange={(e) => setNewSectionForm({ ...newSectionForm, title: e.target.value })}
                placeholder={t("se.new_section_title_placeholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("se.section_content")}</label>
              <Textarea
                value={newSectionForm.content}
                onChange={(e) => setNewSectionForm({ ...newSectionForm, content: e.target.value })}
                placeholder={t("se.new_section_content_placeholder")}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("se.duration")}: {formatTime(newSectionForm.durationSec)}</label>
              <Slider
                value={[newSectionForm.durationSec]}
                onValueChange={(v) => setNewSectionForm({ ...newSectionForm, durationSec: v[0] })}
                min={10}
                max={600}
                step={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddSectionDialogOpen(false)}>{t("se.cancel")}</Button>
            <Button onClick={handleAddSection} disabled={addSectionMutation.isPending}>
              {addSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {t("se.add_section")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirm Dialog */}
      <Dialog open={deleteConfirmIdx !== null} onOpenChange={(open) => !open && setDeleteConfirmIdx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("se.confirm_delete_section")}</DialogTitle>
          </DialogHeader>
          <p>{t("se.confirm_delete_section_desc")}</p>
          {deleteConfirmIdx !== null && sections[deleteConfirmIdx] && (
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="font-medium">{sections[deleteConfirmIdx].title}</p>
              <p className="text-muted-foreground line-clamp-2 mt-1">{sections[deleteConfirmIdx].content}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmIdx(null)}>{t("se.cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteConfirmIdx !== null && handleDeleteSection(deleteConfirmIdx)} disabled={deleteSectionMutation.isPending}>
              {deleteSectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              {t("se.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
