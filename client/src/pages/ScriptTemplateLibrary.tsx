import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import {
  BookTemplate, Plus, Search, Trash2, Edit3, Copy, ArrowLeft, Layers, Clock,
  Loader2, Sparkles, BookOpen, FileText, Tag, BarChart3, Wand2
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "web3", label: "Web3" },
  { value: "ai", label: "AI / 인공지능" },
  { value: "blockchain", label: "블록체인" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "metaverse", label: "메타버스" },
  { value: "general", label: "일반" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "초급", color: "bg-green-500/20 text-green-400" },
  { value: "intermediate", label: "중급", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "advanced", label: "고급", color: "bg-red-500/20 text-red-400" },
];

export default function ScriptTemplateLibrary() {
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
    { title: "도입", description: "주제 소개 및 학습 목표", durationPercent: 15, slideNotes: "" },
    { title: "본론", description: "핵심 내용 전달", durationPercent: 60, slideNotes: "" },
    { title: "결론", description: "요약 및 정리", durationPercent: 25, slideNotes: "" },
  ]);

  // Queries
  const templatesQuery = trpc.scriptTemplate.list.useQuery(
    filterCategory !== "all" ? { category: filterCategory } : undefined,
    { enabled: !!user }
  );

  // Mutations
  const createTemplate = trpc.scriptTemplate.create.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 생성되었습니다.");
      templatesQuery.refetch();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTemplate = trpc.scriptTemplate.update.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 수정되었습니다.");
      templatesQuery.refetch();
      setShowEditDialog(false);
      setEditingTemplate(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTemplate = trpc.scriptTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 삭제되었습니다.");
      templatesQuery.refetch();
    },
  });

  const seedBuiltIn = trpc.scriptTemplate.seedBuiltIn.useMutation({
    onSuccess: (data) => {
      toast.success(`기본 템플릿 ${data.created}개 추가됨 (총 ${data.total}개)`);
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
      { title: "도입", description: "주제 소개 및 학습 목표", durationPercent: 15, slideNotes: "" },
      { title: "본론", description: "핵심 내용 전달", durationPercent: 60, slideNotes: "" },
      { title: "결론", description: "요약 및 정리", durationPercent: 25, slideNotes: "" },
    ]);
  };

  const handleCreate = () => {
    if (!formName.trim()) { toast.error("템플릿 이름을 입력하세요."); return; }
    if (formSections.length === 0) { toast.error("최소 1개 섹션이 필요합니다."); return; }
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
    setFormName(`${template.name} (복사)`);
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
    setFormSections([...formSections, { title: `섹션 ${formSections.length + 1}`, description: "", durationPercent: Math.max(5, remaining), slideNotes: "" }]);
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
        <Label>템플릿 이름</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 기본 강의 (도입-본론-결론)" className="mt-1" />
      </div>
      <div>
        <Label>설명</Label>
        <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="이 템플릿의 용도와 특징을 설명하세요." className="mt-1" rows={2} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>카테고리</Label>
          <Select value={formCategory} onValueChange={setFormCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter(c => c.value !== "all").map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>난이도</Label>
          <Select value={formDifficulty} onValueChange={setFormDifficulty}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>목표 시간 (분)</Label>
          <Input type="number" min={1} max={120} value={formDurationMin} onChange={(e) => setFormDurationMin(parseInt(e.target.value) || 10)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label>태그 (쉼표로 구분)</Label>
        <Input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="예: 기본, 입문, 3단계" className="mt-1" />
      </div>

      {/* Section Editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">섹션 구조 ({formSections.length}개)</Label>
          <Button size="sm" variant="outline" onClick={addSection}><Plus className="w-3 h-3 mr-1" />섹션 추가</Button>
        </div>
        <div className="space-y-3">
          {formSections.map((section, i) => (
            <div key={i} className="p-3 bg-card/80 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                <Input value={section.title} onChange={(e) => updateSection(i, "title", e.target.value)} placeholder="섹션 제목" className="flex-1" />
                <Input type="number" min={1} max={100} value={section.durationPercent} onChange={(e) => updateSection(i, "durationPercent", parseInt(e.target.value) || 0)} className="w-20" />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeSection(i)} disabled={formSections.length <= 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input value={section.description} onChange={(e) => updateSection(i, "description", e.target.value)} placeholder="이 섹션에서 다룰 내용 설명" className="text-sm" />
            </div>
          ))}
        </div>
        {formSections.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground text-right">
            총 비율: {formSections.reduce((s, sec) => s + sec.durationPercent, 0)}% {formSections.reduce((s, sec) => s + sec.durationPercent, 0) !== 100 && <span className="text-yellow-400">(100%가 아닙니다)</span>}
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
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"><ArrowLeft className="w-4 h-4 mr-1" /> 스튜디오</Button>
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <BookTemplate className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">스크립트 템플릿 라이브러리</h1>
                  <p className="text-white/70 mt-1">자주 사용하는 강의 구조를 템플릿으로 저장하고 재사용하세요.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => seedBuiltIn.mutate()} disabled={seedBuiltIn.isPending}>
                  {seedBuiltIn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  기본 템플릿 추가
                </Button>
                <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />새 템플릿
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
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="템플릿 검색..." className="pl-10" />
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
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <BookTemplate className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">아직 템플릿이 없습니다.</p>
              <p className="text-sm text-muted-foreground mb-4">"기본 템플릿 추가" 버튼을 클릭하여 내장 템플릿을 불러오거나, 직접 새 템플릿을 만들어보세요.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => seedBuiltIn.mutate()}>
                  <Sparkles className="w-4 h-4 mr-2" />기본 템플릿 추가
                </Button>
                <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />새 템플릿 만들기
                </Button>
              </div>
            </CardContent>
          </Card>
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
                    <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{template.targetDurationMin}분</Badge>
                    <Badge variant="outline" className="text-xs"><Layers className="w-3 h-3 mr-1" />{template.sectionCount}섹션</Badge>
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
                    {sections.length > 5 && <p className="text-xs text-muted-foreground pl-7">+{sections.length - 5}개 더</p>}
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
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{template.usageCount || 0}회 사용</span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/studio?templateId=${template.id}`}>
                        <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700">
                          <Wand2 className="w-3 h-3 mr-1" />사용
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
            <DialogTitle>새 스크립트 템플릿</DialogTitle>
            <DialogDescription>강의 구조를 정의하여 재사용 가능한 템플릿을 만드세요.</DialogDescription>
          </DialogHeader>
          <TemplateFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createTemplate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              템플릿 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 수정</DialogTitle>
            <DialogDescription>템플릿의 구조와 설정을 수정합니다.</DialogDescription>
          </DialogHeader>
          <TemplateFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>취소</Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending} className="bg-amber-600 hover:bg-amber-700">
              {updateTemplate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-2" />}
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
