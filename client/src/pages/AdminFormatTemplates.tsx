import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Users, Presentation, Puzzle,
  ArrowUpDown, Loader2, LayoutTemplate, Eye, EyeOff,
  Shield, ChevronLeft, Save, Copy
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const CATEGORY_MAP = {
  personnel: { label: "인원 구성", icon: Users, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  style: { label: "강의 스타일", icon: Presentation, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  insert: { label: "삽입 요소", icon: Puzzle, color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

const COLOR_OPTIONS = [
  { value: "blue", label: "블루", class: "bg-blue-500" },
  { value: "purple", label: "퍼플", class: "bg-purple-500" },
  { value: "green", label: "그린", class: "bg-green-500" },
  { value: "amber", label: "앰버", class: "bg-amber-500" },
  { value: "rose", label: "로즈", class: "bg-rose-500" },
  { value: "cyan", label: "시안", class: "bg-cyan-500" },
  { value: "orange", label: "오렌지", class: "bg-orange-500" },
  { value: "teal", label: "틸", class: "bg-teal-500" },
];

interface TemplateForm {
  name: string;
  description: string;
  category: "personnel" | "style" | "insert";
  icon: string;
  colorTheme: string;
  personnelConfig: string;
  styleConfig: string;
  insertElements: string;
  defaultScriptTemplate: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

const emptyForm: TemplateForm = {
  name: "",
  description: "",
  category: "personnel",
  icon: "Users",
  colorTheme: "blue",
  personnelConfig: "[]",
  styleConfig: "{}",
  insertElements: "[]",
  defaultScriptTemplate: "",
  sortOrder: 0,
  isActive: true,
  isSystem: false,
};

export default function AdminFormatTemplates() {
  const { user } = useAuth();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>({ ...emptyForm });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const templates = trpc.admin.listFormatTemplates.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const createMut = trpc.admin.createFormatTemplate.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 생성되었습니다");
      setDialogOpen(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.admin.updateFormatTemplate.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 수정되었습니다");
      setDialogOpen(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.admin.deleteFormatTemplate.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 삭제되었습니다");
      setDeleteConfirmId(null);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
          <p className="text-muted-foreground">관리자만 접근할 수 있는 페이지입니다.</p>
        </div>
      </div>
    );
  }

  const filteredTemplates = templates.data?.filter(
    (t: any) => filterCategory === "all" || t.category === filterCategory
  ) || [];

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEditDialog = (template: any) => {
    setEditingId(template.id);
    setForm({
      name: template.name || "",
      description: template.description || "",
      category: template.category,
      icon: template.icon || "Users",
      colorTheme: template.colorTheme || "blue",
      personnelConfig: template.personnelConfig ? JSON.stringify(template.personnelConfig, null, 2) : "[]",
      styleConfig: template.styleConfig ? JSON.stringify(template.styleConfig, null, 2) : "{}",
      insertElements: template.insertElements ? JSON.stringify(template.insertElements, null, 2) : "[]",
      defaultScriptTemplate: template.defaultScriptTemplate || "",
      sortOrder: template.sortOrder || 0,
      isActive: template.isActive ?? true,
      isSystem: template.isSystem ?? false,
    });
    setDialogOpen(true);
  };

  const duplicateTemplate = (template: any) => {
    setEditingId(null);
    setForm({
      name: `${template.name} (복사)`,
      description: template.description || "",
      category: template.category,
      icon: template.icon || "Users",
      colorTheme: template.colorTheme || "blue",
      personnelConfig: template.personnelConfig ? JSON.stringify(template.personnelConfig, null, 2) : "[]",
      styleConfig: template.styleConfig ? JSON.stringify(template.styleConfig, null, 2) : "{}",
      insertElements: template.insertElements ? JSON.stringify(template.insertElements, null, 2) : "[]",
      defaultScriptTemplate: template.defaultScriptTemplate || "",
      sortOrder: (template.sortOrder || 0) + 1,
      isActive: true,
      isSystem: false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    // Validate JSON fields
    let personnelConfig, styleConfig, insertElements;
    try {
      personnelConfig = JSON.parse(form.personnelConfig);
    } catch { toast.error("인원 구성 JSON이 올바르지 않습니다"); return; }
    try {
      styleConfig = JSON.parse(form.styleConfig);
    } catch { toast.error("스타일 설정 JSON이 올바르지 않습니다"); return; }
    try {
      insertElements = JSON.parse(form.insertElements);
    } catch { toast.error("삽입 요소 JSON이 올바르지 않습니다"); return; }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      icon: form.icon || undefined,
      colorTheme: form.colorTheme,
      personnelConfig,
      styleConfig,
      insertElements,
      defaultScriptTemplate: form.defaultScriptTemplate || undefined,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      isSystem: form.isSystem,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const getCategoryInfo = (cat: string) => CATEGORY_MAP[cat as keyof typeof CATEGORY_MAP] || CATEGORY_MAP.personnel;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" /> 관리자 대시보드
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutTemplate className="w-8 h-8 text-primary" />
              강의 포맷 템플릿 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              강의 포맷 템플릿을 추가, 수정, 삭제할 수 있습니다. 카테고리별로 관리하세요.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" /> 새 템플릿
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            size="sm"
            variant={filterCategory === "all" ? "default" : "outline"}
            onClick={() => setFilterCategory("all")}
          >
            전체 ({templates.data?.length || 0})
          </Button>
          {(Object.entries(CATEGORY_MAP) as [string, any][]).map(([key, val]) => {
            const count = templates.data?.filter((t: any) => t.category === key).length || 0;
            const Icon = val.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={filterCategory === key ? "default" : "outline"}
                onClick={() => setFilterCategory(key)}
                className="gap-1.5"
              >
                <Icon className="w-4 h-4" /> {val.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Template List */}
        {templates.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <LayoutTemplate className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">템플릿이 없습니다</h3>
              <p className="text-muted-foreground text-sm mb-4">새 템플릿을 추가해보세요.</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" /> 새 템플릿 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template: any) => {
              const catInfo = getCategoryInfo(template.category);
              const CatIcon = catInfo.icon;
              return (
                <Card key={template.id} className={`relative overflow-hidden transition-all hover:shadow-lg ${!template.isActive ? "opacity-60" : ""}`}>
                  {/* Category badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {template.isSystem && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="w-3 h-3" /> 시스템
                      </Badge>
                    )}
                    {!template.isActive && (
                      <Badge variant="outline" className="text-xs gap-1 border-red-500/30 text-red-400">
                        <EyeOff className="w-3 h-3" /> 비활성
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${catInfo.color}`}>
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {catInfo.label} | 순서: {template.sortOrder}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                    )}

                    {/* Config Preview */}
                    <div className="space-y-1.5">
                      {template.category === "personnel" && template.personnelConfig && (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(template.personnelConfig) ? template.personnelConfig : []).map((p: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {p.label || p.role} x{p.count || 1}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {template.category === "style" && template.styleConfig && (
                        <div className="flex flex-wrap gap-1">
                          {template.styleConfig.hasSlides && <Badge variant="secondary" className="text-xs">PPT</Badge>}
                          {template.styleConfig.hasWhiteboard && <Badge variant="secondary" className="text-xs">화이트보드</Badge>}
                          {template.styleConfig.hasPIP && <Badge variant="secondary" className="text-xs">PIP</Badge>}
                          <Badge variant="secondary" className="text-xs">{template.styleConfig.layoutType || "기본"}</Badge>
                        </div>
                      )}
                      {template.category === "insert" && template.insertElements && (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(template.insertElements) ? template.insertElements : []).map((el: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {el.label || el.type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8"
                        onClick={() => openEditDialog(template)}>
                        <Pencil className="w-3.5 h-3.5" /> 수정
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                        onClick={() => duplicateTemplate(template)}>
                        <Copy className="w-3.5 h-3.5" /> 복제
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(template.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                {editingId ? "템플릿 수정" : "새 템플릿 만들기"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm mb-1.5 block">템플릿 이름 *</Label>
                  <Input
                    placeholder="예: 강사+MC+통역 3인 구성"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm mb-1.5 block">설명</Label>
                  <Textarea
                    placeholder="템플릿에 대한 설명을 입력하세요"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">카테고리 *</Label>
                  <Select value={form.category} onValueChange={(v: any) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personnel">인원 구성</SelectItem>
                      <SelectItem value="style">강의 스타일</SelectItem>
                      <SelectItem value="insert">삽입 요소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">색상 테마</Label>
                  <Select value={form.colorTheme} onValueChange={(v) => setForm(f => ({ ...f, colorTheme: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${c.class}`} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">아이콘 (Lucide)</Label>
                  <Input
                    placeholder="Users, Presentation, Puzzle..."
                    value={form.icon}
                    onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">정렬 순서</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <Separator />

              {/* JSON Config Fields */}
              {form.category === "personnel" && (
                <div>
                  <Label className="text-sm mb-1.5 block">인원 구성 (JSON)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    형식: [{"{"}"role": "instructor", "label": "강사", "count": 1, "required": true{"}"}]
                  </p>
                  <Textarea
                    className="font-mono text-xs"
                    rows={6}
                    value={form.personnelConfig}
                    onChange={(e) => setForm(f => ({ ...f, personnelConfig: e.target.value }))}
                  />
                </div>
              )}

              {form.category === "style" && (
                <div>
                  <Label className="text-sm mb-1.5 block">스타일 설정 (JSON)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    형식: {"{"}"layoutType": "ppt_overlay", "hasSlides": true, "hasWhiteboard": false, "hasPIP": true{"}"}
                  </p>
                  <Textarea
                    className="font-mono text-xs"
                    rows={6}
                    value={form.styleConfig}
                    onChange={(e) => setForm(f => ({ ...f, styleConfig: e.target.value }))}
                  />
                </div>
              )}

              {form.category === "insert" && (
                <div>
                  <Label className="text-sm mb-1.5 block">삽입 요소 (JSON)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    형식: [{"{"}"type": "qa", "label": "질문자 삽입", "defaultDuration": 60, "position": "middle"{"}"}]
                  </p>
                  <Textarea
                    className="font-mono text-xs"
                    rows={6}
                    value={form.insertElements}
                    onChange={(e) => setForm(f => ({ ...f, insertElements: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <Label className="text-sm mb-1.5 block">기본 스크립트 템플릿</Label>
                <Textarea
                  placeholder="이 포맷에 맞는 기본 스크립트 템플릿을 입력하세요..."
                  rows={3}
                  value={form.defaultScriptTemplate}
                  onChange={(e) => setForm(f => ({ ...f, defaultScriptTemplate: e.target.value }))}
                />
              </div>

              <Separator />

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                    />
                    <Label className="text-sm">활성화</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isSystem}
                      onCheckedChange={(v) => setForm(f => ({ ...f, isSystem: v }))}
                    />
                    <Label className="text-sm">시스템 템플릿</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
                className="gap-2"
              >
                {(createMut.isPending || updateMut.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
                ) : (
                  <><Save className="w-4 h-4" /> {editingId ? "수정" : "생성"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" /> 템플릿 삭제
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              이 템플릿을 삭제하시겠습니까? 비활성화 처리되며, 기존 프로젝트에는 영향을 주지 않습니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>취소</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && deleteMut.mutate({ id: deleteConfirmId })}
                disabled={deleteMut.isPending}
                className="gap-2"
              >
                {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
