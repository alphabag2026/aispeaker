
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  style: { label: "스타일", icon: Presentation, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  insert: { label: "삽입 요소", icon: Puzzle, color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "cyan", label: "Cyan" },
  { value: "orange", label: "Orange" },
  { value: "teal", label: "Teal" },
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
  const { t } = useLanguage();
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
      toast.success(t("adminFormatTemplates.templateCreated"));
      setDialogOpen(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.admin.updateFormatTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("adminFormatTemplates.templateUpdated"));
      setDialogOpen(false);
      templates.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.admin.deleteFormatTemplate.useMutation({
    onSuccess: () => {
      toast.success(t("adminFormatTemplates.templateDeleted"));
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
          <h2 className="text-2xl font-bold mb-2">{t("adminFormatTemplates.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("adminFormatTemplates.adminOnly")}</p>
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
      name: `${template.name}${t("adminFormatTemplates.copySuffix")}`,
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
    let personnelConfig, styleConfig, insertElements;
    try {
      personnelConfig = JSON.parse(form.personnelConfig);
    } catch { toast.error(t("adminFormatTemplates.invalidPersonnelJson")); return; }
    try {
      styleConfig = JSON.parse(form.styleConfig);
    } catch { toast.error(t("adminFormatTemplates.invalidStyleJson")); return; }
    try {
      insertElements = JSON.parse(form.insertElements);
    } catch { toast.error(t("adminFormatTemplates.invalidInsertJson")); return; }

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

  const getCategoryInfo = (cat: string) => {
    const map: { [key: string]: { label: string; icon: any; color: string } } = {
      personnel: { label: t("adminFormatTemplates.personnel"), icon: Users, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
      style: { label: t("adminFormatTemplates.style"), icon: Presentation, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
      insert: { label: t("adminFormatTemplates.insert"), icon: Puzzle, color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    };
    return map[cat] || map.personnel;
  };

  const colorOptions = COLOR_OPTIONS.map(opt => ({ ...opt, label: t(`adminFormatTemplates.${opt.value}`) }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" /> {t("adminFormatTemplates.adminDashboard")}
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutTemplate className="w-8 h-8 text-primary" />
              {t("adminFormatTemplates.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("adminFormatTemplates.description")}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" /> {t("adminFormatTemplates.newTemplate")}
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Button
            size="sm"
            variant={filterCategory === "all" ? "default" : "outline"}
            onClick={() => setFilterCategory("all")}
          >
            {t("adminFormatTemplates.all")} ({templates.data?.length || 0})
          </Button>
          {Object.entries(CATEGORY_MAP).map(([key, val]) => {
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
                <Icon className="w-4 h-4" /> {t(`adminFormatTemplates.${key}`)} ({count})
              </Button>
            );
          })}
        </div>

        {templates.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <LayoutTemplate className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">{t("adminFormatTemplates.noTemplates")}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t("adminFormatTemplates.addFirstTemplate")}</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" /> {t("adminFormatTemplates.createNewTemplate")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template: any) => {
              const catInfo = getCategoryInfo(template.category);
              const CatIcon = catInfo.icon;
              return (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${catInfo.color.replace("bg-", "bg-").split(" ")[0]}`} />
                          {template.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs line-clamp-2">{template.description || "-"}</CardDescription>
                      </div>
                      <div className={`p-2 rounded-md ${catInfo.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {template.isSystem && <Badge variant="secondary" className="text-xs font-mono">{t("adminFormatTemplates.systemTemplateLabel")}</Badge>}
                        {template.isActive ? <Badge variant="outline" className="text-green-500 border-green-500/50">{t("adminFormatTemplates.hardcoded12")}</Badge> : <Badge variant="outline">{t("adminFormatTemplates.hardcoded13")}</Badge>}
                      </div>
                      <div className="text-muted-foreground">ID: {template.id}</div>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => duplicateTemplate(template)}>
                        <Copy className="w-3 h-3" /> {t("adminFormatTemplates.duplicate")}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditDialog(template)}>
                        <Pencil className="w-3 h-3" /> {t("adminFormatTemplates.edit")}
                      </Button>
                      {!template.isSystem && (
                        <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(template.id)}>
                          <Trash2 className="w-3 h-3" /> {t("adminFormatTemplates.delete")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? t("adminFormatTemplates.editTemplate") : t("adminFormatTemplates.createTemplate")}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">{t("adminFormatTemplates.templateName")}</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">{t("adminFormatTemplates.templateDescriptionPlaceholder")}</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("adminFormatTemplates.templateDescriptionPlaceholder")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("adminFormatTemplates.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{t(`adminFormatTemplates.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">{t("adminFormatTemplates.icon")}</Label>
                <Input id="icon" value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>{t("adminFormatTemplates.colorTheme")}</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(opt => (
                    <Button
                      key={opt.value}
                      variant={form.colorTheme === opt.value ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => setForm(f => ({ ...f, colorTheme: opt.value }))}
                    >
                      <div className={`w-3 h-3 rounded-full ${(opt as any).class}`} />
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="personnelConfig">{t("adminFormatTemplates.personnelConfigJson")}</Label>
                <Textarea id="personnelConfig" value={form.personnelConfig} onChange={(e) => setForm(f => ({ ...f, personnelConfig: e.target.value }))} rows={6} className="font-mono text-sm" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="styleConfig">{t("adminFormatTemplates.styleConfigJson")}</Label>
                <Textarea id="styleConfig" value={form.styleConfig} onChange={(e) => setForm(f => ({ ...f, styleConfig: e.target.value }))} rows={6} className="font-mono text-sm" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="insertElements">{t("adminFormatTemplates.insertElementsJson")}</Label>
                <Textarea id="insertElements" value={form.insertElements} onChange={(e) => setForm(f => ({ ...f, insertElements: e.target.value }))} rows={6} className="font-mono text-sm" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="defaultScriptTemplate">{t("adminFormatTemplates.defaultScriptTemplate")}</Label>
                <Textarea id="defaultScriptTemplate" value={form.defaultScriptTemplate} onChange={(e) => setForm(f => ({ ...f, defaultScriptTemplate: e.target.value }))} rows={6} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">{t("adminFormatTemplates.sortOrder")}</Label>
                <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                    />
                    <Label className="text-sm">{t("adminFormatTemplates.active")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isSystem}
                      onCheckedChange={(v) => setForm(f => ({ ...f, isSystem: v }))}
                    />
                    <Label className="text-sm">{t("adminFormatTemplates.systemTemplateLabel")}</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("adminFormatTemplates.cancel")}</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
                className="gap-2"
              >
                {(createMut.isPending || updateMut.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("adminFormatTemplates.saving")}</>
                ) : (
                  <><Save className="w-4 h-4" /> {editingId ? t("adminFormatTemplates.saveChanges") : t("adminFormatTemplates.create")}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" /> {t("adminFormatTemplates.deleteTemplate")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("adminFormatTemplates.deleteConfirmation")}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t("adminFormatTemplates.cancel")}</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && deleteMut.mutate({ id: deleteConfirmId })}
                disabled={deleteMut.isPending}
                className="gap-2"
              >
                {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t("adminFormatTemplates.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
