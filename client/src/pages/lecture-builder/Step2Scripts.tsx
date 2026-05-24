import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs } from "@/components/ui/tabs";
import { Users, Layers, Plus, Trash2, Wand2, Loader2, Check, ArrowRight, Download, X, History, Undo2, Sparkles, Save, Clock } from "lucide-react";
import ScriptAutocomplete from "@/components/ScriptAutocomplete";
import { ScriptSection, getAVATAR_ROLES } from "./types";

export default function Step2Scripts({ projectId, slides, scripts, avatars, onRefresh, onGoToStep4





}: {projectId: number;slides: any[];scripts: any[];avatars: any[];onRefresh: () => void;onGoToStep4?: () => void;}) {const { t } = useLanguage();
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const [mode, setMode] = useState<"generate" | "split" | "manual" | "ppt_ai">("manual");
  const [prompt, setPrompt] = useState("");
  const [fullText, setFullText] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [language, setLanguage] = useState("ko");
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [unsavedGenerated, setUnsavedGenerated] = useState(false);
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingGenerateAction, setPendingGenerateAction] = useState<(() => void) | null>(null);
  const [showSavedSummary, setShowSavedSummary] = useState(false);
  const [savedTotalDuration, setSavedTotalDuration] = useState(0);

  const saveVersionMut = trpc.lectureBuilder.saveScriptVersion.useMutation({
    onSuccess: (data) => {toast.success(`\uBC84\uC804 ${data.versionNumber} \uC800\uC7A5\uB428`);versionsQuery.refetch();}
  });
  const versionsQuery = trpc.lectureBuilder.listScriptVersions.useQuery(
    { projectId },
    { enabled: showVersionPanel }
  );
  const restoreVersionMut = trpc.lectureBuilder.restoreScriptVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`\uBC84\uC804 ${data.restoredVersion}\uC73C\uB85C \uBCF5\uC6D0\uB428 (${data.sectionCount}\uAC1C \uC139\uC158)`);
      onRefresh();
    }
  });

  // Load existing scripts into sections
  useEffect(() => {
    if (scripts.length > 0 && sections.length === 0) {
      setSections(scripts.map((s, i) => ({
        id: `existing-${s.id}`,
        section: i + 1,
        text: s.scriptText,
        avatarId: s.avatarId || undefined
      })));
    }
  }, [scripts]);

  const generateScript = trpc.lectureBuilder.generateScript.useMutation({
    onSuccess: (data) => {
      const newSections = (data.sections || []).map((s: any, i: number) => {
        let text = s.text;
        // Prepend speaker and type info if available
        const prefix: string[] = [];
        if (s.type && s.type !== 'main') {
          const typeMap: Record<string, string> = { intro: t("lectureBuilder.stringLiteral67"), main: t("lectureBuilder.stringLiteral68"), insert: t("lectureBuilder.stringLiteral69"), qa: 'Q&A', closing: t("lectureBuilder.stringLiteral70") };
          prefix.push(typeMap[s.type] || s.type);
        }
        if (s.speaker) prefix.push(s.speaker);
        if (prefix.length > 0 && !text.startsWith('[')) {
          text = `[${prefix.join(' - ')}] ${text}`;
        }
        return {
          id: `gen-${Date.now()}-${i}`,
          section: s.section || i + 1,
          text
        };
      });
      setSections(newSections);
      setUnsavedGenerated(true);
      toast.success(t("lectureBuilder.hardcoded.sectionsCreated", { count: String(newSections.length) }));
    },
    onError: (e) => toast.error(e.message)
  });

  const splitScript = trpc.lectureBuilder.splitScript.useMutation({
    onSuccess: (data) => {
      const newSections = (data.sections || []).map((s: any, i: number) => ({
        id: `split-${Date.now()}-${i}`,
        section: s.section || i + 1,
        text: s.text
      }));
      setSections(newSections);
      setUnsavedGenerated(true);
      toast.success(t("lectureBuilder.hardcoded.sectionsClassified", { count: String(newSections.length) }));
    },
    onError: (e) => toast.error(e.message)
  });

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const deleteScriptMut = trpc.lectureBuilder.deleteScript.useMutation();

  // AI Script Proofread (교정)
  const [proofreadingIdx, setProofreadingIdx] = useState<number | null>(null);
  const [proofreadFilter, setProofreadFilter] = useState<"smooth" | "news" | "presentation" | "conversational" | "dramatic" | "concise">("smooth");
  const [proofreadPreview, setProofreadPreview] = useState<{idx: number;original: string;proofread: string;filter: string;} | null>(null);
  const proofreadMut = trpc.lectureBuilder.proofreadScript.useMutation({
    onSuccess: (data) => {
      if (proofreadingIdx !== null) {
        setProofreadPreview({ idx: proofreadingIdx, original: data.original, proofread: data.proofread, filter: data.filter });
      }
      setProofreadingIdx(null);
    },
    onError: (e: any) => {toast.error(t("lectureBuilder.hardcoded.aiProofreadFailed", { error: e.message }));setProofreadingIdx(null);}
  });
  const handleProofread = (idx: number) => {
    const sec = sections[idx];
    if (!sec?.text.trim()) {toast.error(t("lectureBuilder.stringLiteral71"));return;}
    setProofreadingIdx(idx);
    proofreadMut.mutate({ scriptText: sec.text, filter: proofreadFilter, language });
  };
  const applyProofread = () => {
    if (!proofreadPreview) return;
    const newSections = [...sections];
    newSections[proofreadPreview.idx] = { ...newSections[proofreadPreview.idx], text: proofreadPreview.proofread };
    setSections(newSections);
    setProofreadPreview(null);
    toast.success(t("lectureBuilder.stringLiteral72"));
  };

  // AI Script Improvement
  const [improvingIdx, setImprovingIdx] = useState<number | null>(null);
  const [improvedPreview, setImprovedPreview] = useState<{idx: number;original: string;improved: string;} | null>(null);
  const [improveStyle, setImproveStyle] = useState<"formal" | "casual" | "educational" | "storytelling">("educational");
  const improveScriptMut = trpc.lectureBuilder.improveScript.useMutation({
    onSuccess: (data, _vars) => {
      if (improvingIdx !== null) {
        setImprovedPreview({ idx: improvingIdx, original: data.original, improved: data.improved });
      }
      setImprovingIdx(null);
    },
    onError: (e: any) => {
      toast.error(t("lectureBuilder.hardcoded.aiImproveFailed", { error: e.message }));
      setImprovingIdx(null);
    }
  });

  const handleImproveScript = (idx: number) => {
    const sec = sections[idx];
    if (!sec || !sec.text.trim()) {
      toast.error(t("lectureBuilder.stringLiteral73"));
      return;
    }
    setImprovingIdx(idx);
    improveScriptMut.mutate({
      scriptText: sec.text,
      style: improveStyle,
      language: language
    });
  };

  const applyImprovement = () => {
    if (!improvedPreview) return;
    const newSections = [...sections];
    newSections[improvedPreview.idx] = { ...newSections[improvedPreview.idx], text: improvedPreview.improved };
    setSections(newSections);
    setImprovedPreview(null);
    toast.success(t("lectureBuilder.stringLiteral74"));
  };

  // --- Batch AI Improvement ---
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [batchImproving, setBatchImproving] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<{id: string;original: string;improved: string;}[] | null>(null);

  const toggleSectionSelect = (id: string) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const validIds = sections.filter((s) => s.text.trim()).map((s) => s.id);
    if (selectedSectionIds.size === validIds.length) {
      setSelectedSectionIds(new Set());
    } else {
      setSelectedSectionIds(new Set(validIds));
    }
  };
  const improveAllMut = trpc.lectureBuilder.improveAllScripts.useMutation({
    onSuccess: (data) => {
      setBatchImproving(false);
      setBatchProgress(100);
      setBatchResults(data.results);
      toast.success(t("lectureBuilder.hardcoded.batchImproveResult", { improved: String(data.improved), total: String(data.total) }));
    },
    onError: (e: any) => {
      setBatchImproving(false);
      setBatchProgress(0);
      toast.error(t("lectureBuilder.hardcoded.batchImproveFailed", { error: e.message }));
    }
  });

  const handleImproveAll = () => {
    let targetSections = sections.filter((s) => s.text.trim().length > 0);
    if (selectedSectionIds.size > 0) {
      targetSections = targetSections.filter((s) => selectedSectionIds.has(s.id));
    }
    if (targetSections.length === 0) {
      toast.error(t("lectureBuilder.stringLiteral75"));
      return;
    }
    setBatchImproving(true);
    setBatchProgress(10);
    const progressInterval = setInterval(() => {
      setBatchProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 2000);
    improveAllMut.mutate(
      { projectId, sections: targetSections.map((s) => ({ id: s.id, text: s.text })), style: improveStyle, language },
      { onSettled: () => clearInterval(progressInterval) }
    );
  };

  const applyAllImprovements = () => {
    if (!batchResults) return;
    const newSections = sections.map((sec) => {
      const result = batchResults.find((r) => r.id === sec.id);
      return result && result.improved !== result.original ? { ...sec, text: result.improved } : sec;
    });
    setSections(newSections);
    setBatchResults(null);
    setBatchProgress(0);
    toast.success(t("lectureBuilder.stringLiteral76"));
  };

  // Auto-save: debounce 30s after any section edit
  useEffect(() => {
    if (sections.length === 0 || sections.every((s) => !s.text.trim())) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        for (const s of scripts) {
          await deleteScriptMut.mutateAsync({ id: s.id });
        }
        const current = sectionsRef.current;
        for (let i = 0; i < current.length; i++) {
          if (!current[i].text.trim()) continue;
          await setScriptMut.mutateAsync({
            projectId,
            slideId: slides[i]?.id || 0,
            scriptText: current[i].text,
            avatarId: current[i].avatarId,
            sortOrder: i
          });
        }
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
        onRefresh();
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 30000);
    return () => {if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);};
  }, [sections]);

  const saveAllScripts = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      // Delete existing scripts first
      for (const s of scripts) {
        await deleteScriptMut.mutateAsync({ id: s.id });
      }
      // Save new sections - map to actual slide IDs
      for (let i = 0; i < sections.length; i++) {
        await setScriptMut.mutateAsync({
          projectId,
          slideId: slides[i]?.id || 0,
          scriptText: sections[i].text,
          avatarId: sections[i].avatarId,
          sortOrder: i
        });
      }
      toast.success(t("lectureBuilder.stringLiteral77"));
      setUnsavedGenerated(false);
      setSavingGenerated(false);
      // Calculate total estimated duration and show summary
      const totalSec = sections.reduce((acc, s) => acc + Math.ceil(s.text.length / 5), 0);
      setSavedTotalDuration(totalSec);
      setShowSavedSummary(true);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || t("lectureBuilder.stringLiteral78"));
      setSavingGenerated(false);
    }
  };

  const addSection = () => {
    setSections((prev) => [...prev, {
      id: `manual-${Date.now()}`,
      section: prev.length + 1,
      text: ""
    }]);
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, section: i + 1 })));
  };

  const updateSection = (idx: number, text: string) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, text } : s));
  };

  const updateSectionAvatar = (idx: number, avatarId: number | undefined) => {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, avatarId } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText79")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText80")}</p>
        </div>
        {sections.length > 0 &&
        <div className="flex items-center gap-3">
            {autoSaveStatus === "saving" &&
          <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {t("lectureBuilder.hardcoded.autoSaving")}
              </span>
          }
            {autoSaveStatus === "saved" && lastSavedAt &&
          <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> {t("lectureBuilder.hardcoded.autoSaved")} {lastSavedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
          }
            <Button onClick={async () => {await saveAllScripts();saveVersionMut.mutate({ projectId, changeDescription: t("lectureBuilder.hardcoded.manualSave", { count: String(sections.length) }), changeType: "manual" });}} disabled={setScriptMut.isPending} className="gap-2">
              {setScriptMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t("lectureBuilder.hardcoded.saveScript", { count: String(sections.length) })}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowVersionPanel(!showVersionPanel)} className="gap-1">
              <History className="w-4 h-4" /> {t("lectureBuilder.hardcoded.version")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              const text = sections.map((s, i) => `[${i + 1}] ${s.avatarId ? `(${avatars.find((a: any) => a.id === s.avatarId)?.name || 'Speaker'})` : ''} ${s.text}`).join('\n\n');
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `script_${projectId}_${new Date().toISOString().slice(0,10)}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(t("lectureBuilder.hardcoded.exportSuccess") || 'TXT 내보내기 완료');
            }}>
              <Download className="w-4 h-4" /> {t("lectureBuilder.hardcoded.exportTxt") || "TXT"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              const lines = sections.map((s, i) => {
                const speaker = s.avatarId ? avatars.find((a: any) => a.id === s.avatarId)?.name || 'Speaker' : t("lectureBuilder.jsxText112");
                return `<h2>Section ${i + 1} - ${speaker}</h2><p>${s.text.replace(/\n/g, '<br/>')}</p><hr/>`;
              }).join('');
              const html = `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:2rem;line-height:1.8;}h2{color:#333;border-bottom:1px solid #ddd;padding-bottom:0.5rem;}hr{margin:2rem 0;border:none;border-top:1px solid #eee;}</style></head><body><h1>${t("lectureBuilder.hardcoded.scriptExportTitle") || '강의 스크립트'}</h1>${lines}</body></html>`;
              const blob = new Blob([html], { type: 'application/vnd.ms-word;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `script_${projectId}_${new Date().toISOString().slice(0,10)}.doc`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(t("lectureBuilder.hardcoded.exportDocSuccess") || 'DOC 내보내기 완료');
            }}>
              <Download className="w-4 h-4" /> {t("lectureBuilder.hardcoded.exportDoc") || "DOC"}
            </Button>
          </div>
        }
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        {[
        { id: "ppt_ai" as const, label: "PPT AI", icon: Presentation, desc: "PPT 슬라이드를 분석하여 AI가 스크립트 자동 생성" },
        { id: "generate" as const, label: t("lectureBuilder.stringLiteral81"), icon: Wand2, desc: t("lectureBuilder.stringLiteral82") },
        { id: "split" as const, label: t("lectureBuilder.stringLiteral83"), icon: Layers, desc: t("lectureBuilder.stringLiteral84") },
        { id: "manual" as const, label: t("lectureBuilder.stringLiteral85"), icon: FileText, desc: t("lectureBuilder.stringLiteral86") }].
        map((m) =>
        <button key={m.id}
        className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
        mode === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"}`
        }
        onClick={() => setMode(m.id)}>
          
            <m.icon className={`w-5 h-5 mb-2 ${mode === m.id ? "text-primary" : "text-muted-foreground"}`} />
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-muted-foreground">{m.desc}</div>
          </button>
        )}
      </div>

      {/* Mode Content */}
      {mode === "ppt_ai" && <PPTAIScriptPanel projectId={projectId} slides={slides} sections={sections} setSections={setSections} language={language} setLanguage={setLanguage} onRefresh={onRefresh} onGenerated={() => setUnsavedGenerated(true)} />}

      {mode === "generate" &&
      <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>{t("lectureBuilder.jsxText87")}</Label>
              <Textarea placeholder={t("lectureBuilder.stringLiteral88")} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("lectureBuilder.jsxText89")}</Label>
                <Input type="number" min={1} max={50} value={slideCount} onChange={(e) => setSlideCount(parseInt(e.target.value) || 10)} />
              </div>
              <div>
                <Label>{t("lectureBuilder.jsxText90")}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">{t("lectureBuilder.jsxText91")}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="th">ภาษาไทย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Format context toggle */}
            {avatars.length > 0 &&
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <input type="checkbox" id="useFormatCtx" className="w-4 h-4 rounded" defaultChecked />
                <label htmlFor="useFormatCtx" className="text-sm flex-1">
                  <span className="font-medium">{t("lectureBuilder.jsxText92")}</span>
                  <span className="text-muted-foreground ml-1">{t("lectureBuilder.jsxText93")}{avatars.length}{t("lectureBuilder.jsxText94")}</span>
                </label>
              </div>
          }
            {generateScript.isPending ? (
              <div className="w-full space-y-4 py-4 px-4 border border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 w-10 h-10 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">AI가 스크립트를 생성하고 있습니다...</p>
                    <p className="text-xs text-muted-foreground">{slideCount}개 섹션 · 약 20초 소요</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full" style={{ animation: 'loading-progress 3s ease-in-out infinite' }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wand2 className="w-3 h-3 text-primary animate-pulse" />프롬프트 분석 → 구조화 → 스크립트 생성
                    </span>
                    <span>잠시만 기다려주세요</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full" disabled={!prompt.trim()}
              onClick={() => {
                const action = () => generateScript.mutate({ projectId, prompt: prompt.trim(), language, slideCount, useFormatContext: !!(avatars.length > 0 && (document.getElementById('useFormatCtx') as HTMLInputElement)?.checked) });
                if (sections.length > 0) {
                  setPendingGenerateAction(() => action);
                  setShowOverwriteConfirm(true);
                } else {
                  action();
                }
              }}>
                  <Wand2 className="w-4 h-4 mr-2" />{t("lectureBuilder.jsxText95")}
                </Button>
                {scripts.length > 0 &&
              <Button variant="outline" className="w-full" disabled={!prompt.trim()}
              onClick={() => {
                if (confirm(t("lectureBuilder.stringLiteral96"))) {
                  generateScript.mutate({ projectId, prompt: t("lectureBuilder.hardcoded.addToExistingScript", { content: prompt.trim() }), language, slideCount, useFormatContext: true });
                }
              }}>
                    <Plus className="w-4 h-4 mr-2" />{t("lectureBuilder.jsxText97")}
              </Button>
              }
              </div>
            )}
          </CardContent>
        </Card>
      }

      {mode === "split" &&
      <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>{t("lectureBuilder.jsxText98")}</Label>
              <Textarea placeholder={t("lectureBuilder.stringLiteral99")} value={fullText} onChange={(e) => setFullText(e.target.value)} rows={10} />
            </div>
            <div>
              <Label>{t("lectureBuilder.jsxText100")}</Label>
              <Input type="number" min={1} max={50} value={slideCount} onChange={(e) => setSlideCount(parseInt(e.target.value) || 10)} />
            </div>
            <Button className="w-full" disabled={!fullText.trim() || splitScript.isPending}
          onClick={() => {
            const action = () => splitScript.mutate({ projectId, fullText: fullText.trim(), slideCount, language });
            if (sections.length > 0) {
              setPendingGenerateAction(() => action);
              setShowOverwriteConfirm(true);
            } else {
              action();
            }
          }}>
              {splitScript.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />}{t("lectureBuilder.jsxText101")}

          </Button>
          </CardContent>
        </Card>
      }

      {mode === "manual" &&
      <Button variant="outline" onClick={addSection} className="gap-2">
          <Plus className="w-4 h-4" />{t("lectureBuilder.jsxText102")}
      </Button>
      }

      {/* Save Script CTA Banner */}
      {unsavedGenerated && sections.length > 0 &&
      <div className="p-4 rounded-xl border-2 border-green-500/50 bg-green-500/10 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Save className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("lectureBuilder.hardcoded.scriptReadyToSave") || "스크립트가 준비되었습니다!"}</p>
              <p className="text-xs text-muted-foreground">{sections.length}{t("lectureBuilder.hardcoded.sectionsReadyDesc") || "개 섹션을 저장하여 다음 단계로 진행하세요"}</p>
            </div>
          </div>
          <Button
            className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
            disabled={savingGenerated}
            onClick={async () => {
              setSavingGenerated(true);
              await saveAllScripts();
              saveVersionMut.mutate({ projectId, changeDescription: `AI 생성 스크립트 저장 (${sections.length}개 섹션)`, changeType: "manual" });
            }}>
            {savingGenerated ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingGenerated ? (t("lectureBuilder.hardcoded.saving") || "저장 중...") : (t("lectureBuilder.hardcoded.saveNow") || "지금 저장")}
          </Button>
        </div>
      }

      {/* Speaker Duration Distribution */}
      {sections.length > 0 && avatars.length > 0 && (() => {
        const speakerColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
        const totalChars = sections.reduce((acc, s) => acc + s.text.length, 0);
        const speakerStats = avatars.map((av: any, i: number) => {
          const chars = sections.filter(s => s.avatarId === av.id).reduce((acc, s) => acc + s.text.length, 0);
          const defaultChars = sections.filter(s => !s.avatarId).reduce((acc, s) => acc + s.text.length, 0);
          const effectiveChars = i === 0 ? chars + defaultChars : chars;
          return { name: av.name, chars: effectiveChars, pct: totalChars > 0 ? Math.round((effectiveChars / totalChars) * 100) : 0, color: speakerColors[i % speakerColors.length], sec: Math.ceil(effectiveChars / 5) };
        }).filter(s => s.chars > 0);
        return speakerStats.length > 0 ? (
          <div className="p-4 rounded-xl border bg-card/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                {t("lectureBuilder.hardcoded.speakerDistribution") || "화자별 발표 시간 비율"}
              </h4>
              <span className="text-xs text-muted-foreground">
                {t("lectureBuilder.hardcoded.totalTime") || "총"} {Math.floor(Math.ceil(totalChars / 5) / 60)}{t("lectureBuilder.hardcoded.minutes") || "분"} {Math.ceil(totalChars / 5) % 60}{t("lectureBuilder.hardcoded.seconds") || "초"}
              </span>
            </div>
            {/* Stacked bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted">
              {speakerStats.map((sp, i) => (
                <div key={i} className={`${sp.color} h-full transition-all`} style={{ width: `${sp.pct}%` }} title={`${sp.name}: ${sp.pct}%`} />
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {speakerStats.map((sp, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-3 h-3 rounded-sm ${sp.color}`} />
                  <span className="font-medium">{sp.name}</span>
                  <span className="text-muted-foreground">{sp.pct}% ({Math.floor(sp.sec / 60)}{t("lectureBuilder.hardcoded.minutes") || "분"}{sp.sec % 60}{t("lectureBuilder.hardcoded.seconds") || "초"})</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Script Sections List */}
      {sections.length > 0 &&
      <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <input
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-primary"
                checked={selectedSectionIds.size > 0 && selectedSectionIds.size === sections.filter((s) => s.text.trim()).length}
                onChange={toggleSelectAll} />{t("lectureBuilder.jsxText103")}


            </label>
              <h3 className="font-semibold text-lg">{t("lectureBuilder.jsxText104")}{sections.length}{t("lectureBuilder.jsxText105")}{selectedSectionIds.size > 0 && <span className="text-sm text-primary font-normal ml-1">({selectedSectionIds.size}{t("lectureBuilder.jsxText106")}</span>}</h3>
            </div>
            <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            onClick={handleImproveAll}
            disabled={batchImproving || sections.filter((s) => s.text.trim()).length === 0}>
            
              {batchImproving ?
            <><Loader2 className="w-4 h-4 animate-spin" />{t("lectureBuilder.jsxText107")}{Math.round(batchProgress)}%)</> :
            selectedSectionIds.size > 0 ?
            <><Wand2 className="w-4 h-4" />{t("lectureBuilder.jsxText108")}{selectedSectionIds.size}{t("lectureBuilder.jsxText109")}</> :

            <><Wand2 className="w-4 h-4" />{t("lectureBuilder.jsxText110")}</>
            }
            </Button>
          </div>
          {batchImproving &&
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500" style={{ width: `${batchProgress}%` }} />
            </div>
        }
          {sections.map((sec, idx) =>
        <Card key={sec.id} className={`group transition-colors ${selectedSectionIds.has(sec.id) ? "border-primary/40 bg-primary/5" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  checked={selectedSectionIds.has(sec.id)}
                  onChange={() => toggleSectionSelect(sec.id)} />
                
                    <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                  </div>
                  <div className="flex-1 space-y-2">
                    <ScriptAutocomplete
                  value={sec.text}
                  onChange={(val) => updateSection(idx, val)}
                  placeholder={t("lectureBuilder.hardcoded.sectionPlaceholder", { idx: String(idx + 1) })}
                  rows={3}
                  language={language}
                  lectureTitle={undefined}
                  sectionContext={`Section ${idx + 1} of ${sections.length}`} />
                
                    <div className="flex items-center gap-2 flex-wrap">
                      {avatars.length > 0 &&
                  <Select value={sec.avatarId?.toString() || "default"} onValueChange={(v) => updateSectionAvatar(idx, v === "default" ? undefined : parseInt(v))}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder={t("lectureBuilder.stringLiteral111")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{t("lectureBuilder.jsxText112")}</SelectItem>
                            {avatars.map((av) =>
                      <SelectItem key={av.id} value={av.id.toString()}>{av.name} ({AVATAR_ROLES.find((r: any) => r.value === av.role)?.label})</SelectItem>
                      )}
                          </SelectContent>
                        </Select>
                  }
                      <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-cyan-500 border-cyan-500/30 hover:bg-cyan-500/10"
                    onClick={() => handleProofread(idx)}
                    disabled={proofreadingIdx === idx || !sec.text.trim()}>
                    
                        {proofreadingIdx === idx ?
                    <><Loader2 className="w-3 h-3 animate-spin" />{t("lectureBuilder.jsxText113")}</> :

                    <><Sparkles className="w-3 h-3" />{t("lectureBuilder.jsxText114")}</>
                    }
                      </Button>
                      <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => handleImproveScript(idx)}
                    disabled={improvingIdx === idx || !sec.text.trim()}>
                    
                        {improvingIdx === idx ?
                    <><Loader2 className="w-3 h-3 animate-spin" />{t("lectureBuilder.jsxText115")}</> :

                    <><Wand2 className="w-3 h-3" />{t("lectureBuilder.jsxText116")}</>
                    }
                      </Button>
                      <span className="text-xs text-muted-foreground ml-auto">{sec.text.length}{t("lectureBuilder.jsxText117")}{Math.ceil(sec.text.length / 5)}{t("lectureBuilder.jsxText118")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => removeSection(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
        )}
          {mode === "manual" &&
        <Button variant="outline" onClick={addSection} className="w-full gap-2">
              <Plus className="w-4 h-4" />{t("lectureBuilder.jsxText119")}
        </Button>
        }

          {/* AI Proofread Filter Selector */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText120")}</span>
            {(["smooth", "news", "presentation", "conversational", "dramatic", "concise"] as const).map((f) =>
          <button key={f}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
          proofreadFilter === f ? "bg-cyan-500 text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`
          }
          onClick={() => setProofreadFilter(f)}>
            
                {f === "smooth" ? t("lectureBuilder.stringLiteral121") : f === "news" ? t("lectureBuilder.stringLiteral122") : f === "presentation" ? t("lectureBuilder.stringLiteral123") : f === "conversational" ? t("lectureBuilder.stringLiteral124") : f === "dramatic" ? t("lectureBuilder.stringLiteral125") : t("lectureBuilder.stringLiteral126")}
              </button>
          )}
          </div>
          {/* AI Improvement Style Selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText127")}</span>
            {(["educational", "formal", "casual", "storytelling"] as const).map((s) =>
          <button key={s}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
          improveStyle === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`
          }
          onClick={() => setImproveStyle(s)}>
            
                {s === "educational" ? t("lectureBuilder.stringLiteral128") : s === "formal" ? t("lectureBuilder.stringLiteral129") : s === "casual" ? t("lectureBuilder.stringLiteral130") : t("lectureBuilder.stringLiteral131")}
              </button>
          )}
          </div>
        </div>
      }

      {/* AI Proofread Preview Dialog */}
      {proofreadPreview &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />{t("lectureBuilder.jsxText132")}

              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                  {proofreadPreview.filter === "smooth" ? t("lectureBuilder.stringLiteral133") : proofreadPreview.filter === "news" ? t("lectureBuilder.stringLiteral134") : proofreadPreview.filter === "presentation" ? t("lectureBuilder.stringLiteral135") : proofreadPreview.filter === "conversational" ? t("lectureBuilder.stringLiteral136") : proofreadPreview.filter === "dramatic" ? t("lectureBuilder.stringLiteral137") : t("lectureBuilder.stringLiteral138")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("lectureBuilder.jsxText139")}</h4>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {proofreadPreview.original}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-cyan-500 mb-2">{t("lectureBuilder.jsxText140")}</h4>
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {proofreadPreview.proofread}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setProofreadPreview(null)}>{t("lectureBuilder.jsxText141")}

              </Button>
                <Button onClick={applyProofread} className="gap-1 bg-cyan-600 hover:bg-cyan-700">
                  <Check className="w-4 h-4" />{t("lectureBuilder.jsxText142")}
              </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* AI Improvement Preview Dialog */}
      {improvedPreview &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />{t("lectureBuilder.jsxText143")}

            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t("lectureBuilder.jsxText144")}</h4>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {improvedPreview.original}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">{t("lectureBuilder.jsxText145")}</h4>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {improvedPreview.improved}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImprovedPreview(null)}>{t("lectureBuilder.jsxText146")}

              </Button>
                <Button onClick={applyImprovement} className="gap-1">
                  <Check className="w-4 h-4" />{t("lectureBuilder.jsxText147")}
              </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* Batch AI Improvement Results Dialog */}
      {batchResults &&
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />{t("lectureBuilder.jsxText148")}

              <Badge variant="outline" className="ml-2">
                  {batchResults.filter((r) => r.improved !== r.original).length}/{batchResults.length}{t("lectureBuilder.jsxText149")}
              </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                {batchResults.map((result, idx) => {
                const changed = result.improved !== result.original;
                return (
                  <div key={result.id} className={`p-3 rounded-lg border ${changed ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{t("lectureBuilder.jsxText150")}{idx + 1}</Badge>
                        {changed ?
                      <Badge className="bg-green-500/20 text-green-400 text-xs">{t("lectureBuilder.jsxText151")}</Badge> :

                      <Badge className="bg-muted text-muted-foreground text-xs">{t("lectureBuilder.jsxText152")}</Badge>
                      }
                      </div>
                      {changed ?
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">{t("lectureBuilder.jsxText153")}</span>
                            <div className="p-2 bg-muted/50 rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">{result.original}</div>
                          </div>
                          <div>
                            <span className="text-xs text-primary mb-1 block">{t("lectureBuilder.jsxText154")}</span>
                            <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">{result.improved}</div>
                          </div>
                        </div> :

                    <div className="text-xs text-muted-foreground line-clamp-2">{result.original}</div>
                    }
                    </div>);

              })}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => {setBatchResults(null);setBatchProgress(0);}}>{t("lectureBuilder.jsxText155")}

              </Button>
                <Button onClick={applyAllImprovements} className="gap-1">
                  <Check className="w-4 h-4" />{t("lectureBuilder.jsxText156")}{batchResults.filter((r) => r.improved !== r.original).length}{t("lectureBuilder.jsxText157")}
              </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }

      {/* AI Improvement History */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-4">
          <ImprovementHistoryPanel projectId={projectId} sections={sections} setSections={setSections} />
        </CardContent>
      </Card>

      {/* Script Version History Panel */}
      {showVersionPanel &&
      <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                {t("lectureBuilder.hardcoded.scriptVersionHistory")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowVersionPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>{t("lectureBuilder.hardcoded.versionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {versionsQuery.isLoading ?
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          !versionsQuery.data?.length ?
          <p className="text-center text-muted-foreground py-6">{t("lectureBuilder.hardcoded.noVersions")}</p> :

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {versionsQuery.data.map((v: any) =>
            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-500">v{v.versionNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.changeType === "manual" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {v.changeType === "manual" ? t("lectureBuilder.stringLiteral158") : t("lectureBuilder.stringLiteral159")}
                        </span>
                        <span className="text-xs text-muted-foreground">{t("lectureBuilder.hardcoded.nSections", { count: String(v.sectionCount) })}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{v.changeDescription}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(v.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                variant="outline"
                size="sm"
                className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                disabled={restoreVersionMut.isPending}
                onClick={() => {
                  if (confirm(t("lectureBuilder.hardcoded.restoreVersionConfirm", { version: String(v.versionNumber) }))) {
                    restoreVersionMut.mutate({ projectId, versionId: v.id });
                  }
                }}>
                
                      <Undo2 className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.restore")}
                    </Button>
                  </div>
            )}
              </div>
          }
          </CardContent>
        </Card>
      }
      {/* Overwrite / Append Selection Dialog */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lectureBuilder.hardcoded.overwriteTitle") || "기존 스크립트가 있습니다"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lectureBuilder.hardcoded.overwriteDesc2") || `현재 ${sections.length}개의 스크립트 섹션이 있습니다. 어떻게 진행할까요?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 px-4 border-blue-500/30 hover:bg-blue-500/10"
              onClick={() => {
                if (pendingGenerateAction) pendingGenerateAction();
                setPendingGenerateAction(null);
                setShowOverwriteConfirm(false);
              }}>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("lectureBuilder.hardcoded.appendOption") || "이어서 추가"}</p>
                <p className="text-xs text-muted-foreground">{t("lectureBuilder.hardcoded.appendDesc") || "기존 스크립트 뒤에 새 내용을 추가합니다"}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 px-4 border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                setSections([]);
                setTimeout(() => {
                  if (pendingGenerateAction) pendingGenerateAction();
                  setPendingGenerateAction(null);
                }, 100);
                setShowOverwriteConfirm(false);
              }}>
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("lectureBuilder.hardcoded.overwriteOption") || "새로 작성"}</p>
                <p className="text-xs text-muted-foreground">{t("lectureBuilder.hardcoded.overwriteOptionDesc") || "기존 내용을 모두 삭제하고 새로 생성합니다"}</p>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingGenerateAction(null); }}>
              {t("lectureBuilder.hardcoded.cancel") || "취소"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Saved Summary Banner with total duration + Go to Step 4 */}
      {showSavedSummary &&
      <div className="p-4 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("lectureBuilder.hardcoded.savedComplete") || "스크립트 저장 완료!"}</p>
              <p className="text-xs text-muted-foreground">
                {sections.length}{t("lectureBuilder.hardcoded.sectionsSaved") || "개 섹션"} · {t("lectureBuilder.hardcoded.totalDuration") || "총 예상 발표 시간"}: {Math.floor(savedTotalDuration / 60)}{t("lectureBuilder.hardcoded.minutes") || "분"} {savedTotalDuration % 60}{t("lectureBuilder.hardcoded.seconds") || "초"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSavedSummary(false)}>
              {t("lectureBuilder.hardcoded.dismiss") || "닫기"}
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => {
              setShowSavedSummary(false);
              onGoToStep4?.();
            }}>
              <ArrowRight className="w-4 h-4" />
              {t("lectureBuilder.hardcoded.goToMatching") || "매칭 에디터로 이동"}
            </Button>
          </div>
        </div>
      }
    </div>);

}

// --- Improvement History Sub-component ---
