import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Check, ArrowRight, Pencil, Volume2, X, Languages } from "lucide-react";

export default function PronunciationGuideButton({ projectId }: { projectId: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [word, setWord] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [language, setLanguage] = useState("ko");
  const [description, setDescription] = useState("");
  const [previewingId, setPreviewingId] = useState<number | null>(null);

  const guidesQuery = trpc.lectureBuilder.getPronunciationGuides.useQuery(
    { projectId },
    { enabled: open }
  );
  const addMut = trpc.lectureBuilder.addPronunciationGuide.useMutation({
    onSuccess: () => {
      toast.success(t("lectureBuilder.pronunciation.guideAdded"));
      resetForm();
      guidesQuery.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = trpc.lectureBuilder.updatePronunciationGuide.useMutation({
    onSuccess: () => {
      toast.success(t("lectureBuilder.pronunciation.guideUpdated"));
      resetForm();
      guidesQuery.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = trpc.lectureBuilder.deletePronunciationGuide.useMutation({
    onSuccess: () => {
      toast.success(t("lectureBuilder.pronunciation.guideDeleted"));
      guidesQuery.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const previewMut = trpc.lectureBuilder.previewPronunciation.useMutation({
    onSuccess: (data) => {
      const audio = new Audio(data.audioUrl);
      audio.play();
      setPreviewingId(null);
    },
    onError: (e: any) => {
      toast.error(t("lectureBuilder.pronunciation.previewFailed") + ": " + e.message);
      setPreviewingId(null);
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setWord("");
    setPhonetic("");
    setLanguage("ko");
    setDescription("");
  };

  const handleSubmit = () => {
    if (!word.trim() || !phonetic.trim()) {
      toast.error(t("lectureBuilder.pronunciation.inputRequired"));
      return;
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, word: word.trim(), phonetic: phonetic.trim(), language, description: description.trim() || undefined });
    } else {
      addMut.mutate({ projectId, word: word.trim(), phonetic: phonetic.trim(), language, description: description.trim() || undefined });
    }
  };

  const handleEdit = (guide: any) => {
    setEditingId(guide.id);
    setWord(guide.word);
    setPhonetic(guide.phonetic);
    setLanguage(guide.language || "ko");
    setDescription(guide.description || "");
  };

  const handlePreview = (guide: any) => {
    setPreviewingId(guide.id);
    previewMut.mutate({ projectId, word: guide.word, phonetic: guide.phonetic });
  };

  const LANG_OPTIONS = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
    { value: "zh", label: "中文" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
  ];

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Languages className="w-3 h-3" />
        {t("lectureBuilder.pronunciation.btnTitle")}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Languages className="w-4 h-4 text-purple-500" />
                {t("lectureBuilder.pronunciation.dialogTitle")}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Add/Edit Form */}
            <div className="p-4 border-b bg-muted/30">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("lectureBuilder.pronunciation.originalWord")}</Label>
                  <Input
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder={t("lectureBuilder.pronunciation.wordPlaceholder")}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center pb-1">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("lectureBuilder.pronunciation.phoneticLabel")}</Label>
                  <Input
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder={t("lectureBuilder.pronunciation.phoneticPlaceholder")}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("lectureBuilder.pronunciation.languageLabel")}</Label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                  >
                    {LANG_OPTIONS.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 flex gap-1">
                  <Button
                    size="sm"
                    className="h-8 gap-1 flex-1"
                    onClick={handleSubmit}
                    disabled={addMut.isPending || updateMut.isPending}
                  >
                    {(addMut.isPending || updateMut.isPending) ? <Loader2 className="w-3 h-3 animate-spin" /> : editingId ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {editingId ? t("lectureBuilder.pronunciation.editBtn") : t("lectureBuilder.pronunciation.addBtn")}
                  </Button>
                  {editingId && (
                    <Button variant="ghost" size="sm" className="h-8" onClick={resetForm}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Optional description */}
              <div className="mt-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("lectureBuilder.pronunciation.descPlaceholder")}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Guide List */}
            <div className="p-4 overflow-y-auto max-h-[45vh]">
              {guidesQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !guidesQuery.data?.length ? (
                <div className="text-center py-8">
                  <Languages className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">{t("lectureBuilder.pronunciation.emptyTitle")}</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    {t("lectureBuilder.pronunciation.emptyDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t("lectureBuilder.pronunciation.totalGuides", { count: String(guidesQuery.data.length) })}
                  </div>
                  {guidesQuery.data.map((guide: any) => (
                    <div
                      key={guide.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-accent/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{guide.word}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-sm text-purple-500 font-medium">{guide.phonetic}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{guide.language || "ko"}</Badge>
                        </div>
                        {guide.description && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{guide.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handlePreview(guide)}
                          disabled={previewingId === guide.id}
                        >
                          {previewingId === guide.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5 text-blue-500" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(guide)}
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (confirm(t("lectureBuilder.pronunciation.deleteConfirm", { word: guide.word }))) {
                              deleteMut.mutate({ id: guide.id });
                            }
                          }}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="p-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                {t("lectureBuilder.pronunciation.footerInfo")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// --- Pronunciation Highlight: shows which words in the script have pronunciation guides ---
