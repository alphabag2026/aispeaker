
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  BookTemplate, Plus, Search, Trash2, Edit3, Copy, ArrowLeft, Layers, Clock,
  Loader2, Sparkles, BookOpen, FileText, Tag, BarChart3, Wand2
} from "lucide-react";

export default function ScriptTemplateLibrary() {
  const { t } = useTranslation();

  const CATEGORIES = [
    { value: "all", label: t("stl.category.all") },
    { value: "web3", label: "Web3" },
    { value: "ai", label: t("stl.category.ai") },
    { value: "blockchain", label: t("stl.category.blockchain") },
    { value: "defi", label: "DeFi" },
    { value: "nft", label: "NFT" },
    { value: "metaverse", label: t("stl.category.metaverse") },
    { value: "general", label: t("stl.category.general") },
  ];

  const DIFFICULTIES = [
    { value: "beginner", label: t("stl.difficulty.beginner"), color: "bg-green-500/20 text-green-400" },
    { value: "intermediate", label: t("stl.difficulty.intermediate"), color: "bg-yellow-500/20 text-yellow-400" },
    { value: "advanced", label: t("stl.difficulty.advanced"), color: "bg-red-500/20 text-red-400" },
  ];

  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formDifficulty, setFormDifficulty] = useState("beginner");
  const [formDurationMin, setFormDurationMin] = useState(10);
  const [formTags, setFormTags] = useState("");
  const [formSections, setFormSections] = useState<{ title: string; description: string; durationPercent: number; slideNotes: string }[]>([
    { title: t("stl.section.introduction"), description: t("stl.section.introduction.desc"), durationPercent: 15, slideNotes: "" },
    { title: t("stl.section.main"), description: t("stl.section.main.desc"), durationPercent: 60, slideNotes: "" },
    { title: t("stl.section.conclusion"), description: t("stl.section.conclusion.desc"), durationPercent: 25, slideNotes: "" },
  ]);

  // Queries
  const templatesQuery = trpc.scriptTemplate.list.useQuery(
    filterCategory !== "all" ? { category: filterCategory } : undefined,
    { enabled: !!user }
  );

  // Mutations
  const createTemplate = trpc.scriptTemplate.create.useMutation({
    onSuccess: () => {
      toast.success(t("stl.toast.templateCreated"));
      templatesQuery.refetch();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTemplate = trpc.scriptTemplate.update.useMutation({
    onSuccess: () => {
      toast.success(t("stl.toast.templateUpdated"));
      templatesQuery.refetch();
      setShowEditDialog(false);
      setEditingTemplate(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTemplate = trpc.scriptTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success(t("stl.toast.templateDeleted"));
      templatesQuery.refetch();
    },
  });

  const seedBuiltIn = trpc.scriptTemplate.seedBuiltIn.useMutation({
    onSuccess: (data) => {
      toast.success(t("stl.toast.builtInTemplatesAdded", { created: data.created, total: data.total }));
      templatesQuery.refetch();
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCategory("general");
    setFormDifficulty("beginner");
    setFormDurationMin(10);
    setFormTags("");
    setFormSections([
      { title: t("stl.section.introduction"), description: t("stl.section.introduction.desc"), durationPercent: 15, slideNotes: "" },
      { title: t("stl.section.main"), description: t("stl.section.main.desc"), durationPercent: 60, slideNotes: "" },
      { title: t("stl.section.conclusion"), description: t("stl.section.conclusion.desc"), durationPercent: 25, slideNotes: "" },
    ]);
  };

  const handleCreate = () => {
    if (!formName.trim()) { toast.error(t("stl.toast.enterTemplateName")); return; }
    if (formSections.length === 0) { toast.error(t("stl.toast.atLeastOneSection")); return; }
    createTemplate.mutate({
      name: formName,
      description: formDescription,
      category: formCategory as any,
      difficulty: formDifficulty as any,
      structure: JSON.stringify(formSections),
      sectionCount: formSections.length,
      targetDurationMin: formDurationMin,
      tags: formTags,
    });
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormCategory(template.category || "general");
    setFormDifficulty(template.difficulty || "beginner");
    setFormDurationMin(template.targetDurationMin || 10);
    setFormTags(template.tags || "");
    try {
      setFormSections(JSON.parse(template.structure));
    } catch {
      setFormSections([]);
    }
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate({
      id: editingTemplate.id,
      name: formName,
      description: formDescription,
      category: formCategory as any,
      difficulty: formDifficulty as any,
      structure: JSON.stringify(formSections),
      sectionCount: formSections.length,
      targetDurationMin: formDurationMin,
      tags: formTags,
    });
  };

  const handleDuplicate = (template: any) => {
    setFormName(`${template.name} ${t("stl.copySuffix")}`);
    setFormDescription(template.description || "");
    setFormCategory(template.category || "general");
    setFormDifficulty(template.difficulty || "beginner");
    setFormDurationMin(template.targetDurationMin || 10);
    setFormTags(template.tags || "");
    try {
      setFormSections(JSON.parse(template.structure));
    } catch {
      setFormSections([]);
    }
    setShowCreateDialog(true);
  };

  const addSection = () => {
    const remaining = 100 - formSections.reduce((s, sec) => s + sec.durationPercent, 0);
    setFormSections([...formSections, { title: t("stl.section.newTitle", { number: formSections.length + 1 }), description: "", durationPercent: Math.max(5, remaining), slideNotes: "" }]);
  };

  const removeSection = (index: number) => {
    setFormSections(formSections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updated = [...formSections];
    (updated[index] as any)[field] = value;
    setFormSections(updated);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templatesQuery.data) return [];
    return templatesQuery.data.filter((t) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || (t.tags || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [templatesQuery.data, searchQuery]);

  const TemplateFormContent = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <Label>{t("stl.form.templateName")}</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("stl.form.templateName.placeholder")} className="mt-1" />
      </div>
      <div>
        <Label>{t("stl.form.description")}</Label>
        <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t("stl.form.description.placeholder")} className="mt-1" rows={2} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>{t("stl.form.category")}</Label>
          <Select value={formCategory} onValueChange={setFormCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter(c => c.value !== "all").map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("stl.form.difficulty")}</Label>
          <Select value={formDifficulty} onValueChange={setFormDifficulty}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("stl.form.targetDuration")}</Label>
          <Input type="number" min={1} max={120} value={formDurationMin} onChange={(e) => setFormDurationMin(parseInt(e.target.value) || 10)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label>{t("stl.form.tags")}</Label>
        <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder={t("stl.form.tags.placeholder")} className="mt-1" />
      </div>

      {/* Section Editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">{t("stl.form.sectionStructure", { count: formSections.length })}</Label>
          <Button size="sm" variant="outline" onClick={addSection}><Plus className="w-3 h-3 mr-1" />{t("stl.button.addSection")}</Button>
        </div>
        <div className="space-y-3">
          {formSections.map((section, i) => (
            <div key={i} className="p-3 bg-card/80 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                <Input value={section.title} onChange={(e) => updateSection(i, "title", e.target.value)} placeholder={t("stl.form.sectionTitle")} className="flex-1" />
                <Input type="number" min={1} max={100} value={section.durationPercent} onChange={(e) => updateSection(i, "durationPercent", parseInt(e.target.value) || 0)} className="w-20" />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeSection(i)} disabled={formSections.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input value={section.description} onChange={(e) => updateSection(i, "description", e.target.value)} placeholder={t("stl.form.sectionDescription.placeholder")} className="mt-1" />
              <Textarea value={section.slideNotes} onChange={(e) => updateSection(i, "slideNotes", e.target.value)} placeholder={t("stl.form.slideNotes.placeholder")} className="mt-1" rows={3} />
            </div>
          ))}
        </div>
        {formSections.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground text-right">
            {t("stl.form.totalRatio", { ratio: formSections.reduce((s, sec) => s + sec.durationPercent, 0) })} {formSections.reduce((s, sec) => s + sec.durationPercent, 0) !== 100 && <span className="text-yellow-400">({t("stl.form.not100percent")})</span>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-script-R59hKy4f2UyZt7RXjFfw6Y.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-3">
              <Link href="/studio">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"><ArrowLeft className="w-4 h-4 mr-1" /> {t("stl.button.studio")}</Button>
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <BookTemplate className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{t("stl.title")}</h1>
                  <p className="text-white/70 mt-1">{t("stl.description")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => seedBuiltIn.mutate()} disabled={seedBuiltIn.isPending}>
                  {seedBuiltIn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {t("stl.button.addBuiltIn")}
                </Button>
                <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />{t("stl.button.newTemplate")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Search & Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("stl.search.placeholder")} className="pl-10" />
          </div>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <Button key={c.value} variant={filterCategory === c.value ? "default" : "outline"} size="sm" onClick={() => setFilterCategory(c.value)}>
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        {templatesQuery.isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
        )}

        {filteredTemplates.length === 0 && !templatesQuery.isLoading && (
          <div>
            <EmptyState
              type="scripts"
              title={t("stl.empty.title")}
              description={t("stl.empty.description")}
            />
            <div className="flex gap-2 justify-center -mt-4">
              <Button variant="outline" onClick={() => seedBuiltIn.mutate()}>
                <Sparkles className="w-4 h-4 mr-2" />{t("stl.button.addBuiltIn")}
              </Button>
              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />{t("stl.button.createNewTemplate")}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            let sections: any[] = [];
            try { sections = JSON.parse(template.structure); } catch {}
            const diffInfo = DIFFICULTIES.find(d => d.value === template.difficulty);
            const catInfo = CATEGORIES.find(c => c.value === template.category);

            return (
              <Card key={template.id} className="hover:border-amber-500/30 transition-colors group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.isBuiltIn && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className={diffInfo?.color || ""}>{diffInfo?.label || template.difficulty}</Badge>
                    <Badge variant="outline">{catInfo?.label || template.category}</Badge>
                    <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{t("stl.card.duration", { min: template.targetDurationMin ?? 0 })}</Badge>
                    <Badge variant="outline" className="text-xs"><Layers className="w-3 h-3 mr-1" />{t("stl.card.sections", { count: template.sectionCount ?? 0 })}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Section preview */}
                  <div className="space-y-1.5 mb-4">
                    {sections.slice(0, 5).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-400 shrink-0">{i + 1}</div>
                        <span className="truncate flex-1">{s.title}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{s.durationPercent}%</span>
                      </div>
                    ))}
                    {sections.length > 5 && <p className="text-xs text-muted-foreground pl-7">{t("stl.card.moreSections", { count: sections.length - 5 })}</p>}
                  </div>

                  {/* Tags */}
                  {template.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.split(",").map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{tag.trim()}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{t("stl.card.usageCount", { count: template.usageCount || 0 })}</span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/studio?templateId=${template.id}`}>
                        <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700">
                          <Wand2 className="w-3 h-3 mr-1" />{t("stl.button.use")}
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(template)}><Copy className="w-3 h-3" /></Button>
                      {!template.isBuiltIn && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(template)}><Edit3 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplate.mutate({ id: template.id })}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("stl.dialog.create.title")}</DialogTitle>
            <DialogDescription>{t("stl.dialog.create.description")}</DialogDescription>
          </DialogHeader>
          <TemplateFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("stl.button.cancel")}</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createTemplate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t("stl.button.createTemplate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("stl.dialog.edit.title")}</DialogTitle>
            <DialogDescription>{t("stl.dialog.edit.description")}</DialogDescription>
          </DialogHeader>
          <TemplateFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t("stl.button.cancel")}</Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending} className="bg-amber-600 hover:bg-amber-700">
              {updateTemplate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-2" />}
              {t("stl.button.updateComplete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
