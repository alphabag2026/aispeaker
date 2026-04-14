
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, BookOpen, Brain, Sparkles, Trash2, Edit, Copy,
  GraduationCap, Loader2, Zap, Search, Filter
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

const CATEGORIES = [
  { value: "web3", label: "Web3", icon: "🌐" },
  { value: "ai", label: "AI", icon: "🤖" },
  { value: "blockchain", label: "Blockchain", icon: "⛓️" },
  { value: "defi", label: "DeFi", icon: "💰" },
  { value: "nft", label: "NFT", icon: "🎨" },
  { value: "metaverse", label: "Metaverse", icon: "🌍" },
  { value: "general", label: "General", icon: "📚" },
];

export default function InstructorTemplates() {
  const { t } = useTranslation();

  const DIFFICULTIES = [
    { value: "beginner", label: t("it.difficulty.beginner"), color: "bg-green-500/20 text-green-400" },
    { value: "intermediate", label: t("it.difficulty.intermediate"), color: "bg-yellow-500/20 text-yellow-400" },
    { value: "advanced", label: t("it.difficulty.advanced"), color: "bg-red-500/20 text-red-400" },
  ];

  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("web3");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [topics, setTopics] = useState("");
  const [difficulty, setDifficulty] = useState<string>("beginner");

  const { data: templates, isLoading } = trpc.template.list.useQuery(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const seedMutation = trpc.template.seed.useMutation({
    onSuccess: () => {
      toast.success(t("it.toast.seedSuccess"));
      utils.template.list.invalidate();
    },
  });

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success(t("it.toast.createSuccess"));
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.template.update.useMutation({
    onSuccess: () => {
      toast.success(t("it.toast.updateSuccess"));
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success(t("it.toast.deleteSuccess"));
      utils.template.list.invalidate();
    },
  });

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setCategory("web3");
    setSystemPrompt("");
    setTopics("");
    setDifficulty("beginner");
  };

  const handleEdit = (template: any) => {
    setEditId(template.id);
    setName(template.name);
    setDescription(template.description || "");
    setCategory(template.category);
    setSystemPrompt(template.systemPrompt);
    setTopics(template.topics || "");
    setDifficulty(template.difficulty);
    setDialogOpen(true);
  };

  const handleDuplicate = (template: any) => {
    setEditId(null);
    setName(`${template.name} ${t("it.duplicateSuffix")}`);
    setDescription(template.description || "");
    setCategory(template.category);
    setSystemPrompt(template.systemPrompt);
    setTopics(template.topics || "");
    setDifficulty(template.difficulty);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error(t("it.toast.requiredFields"));
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, name, description, systemPrompt, topics, difficulty: difficulty as any });
    } else {
      createMutation.mutate({
        name, description, category: category as any,
        systemPrompt, topics, difficulty: difficulty as any,
      });
    }
  };

  const filteredTemplates = templates?.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-script-R59hKy4f2UyZt7RXjFfw6Y.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Brain className="h-6 w-6" />
              {t("it.title")}
            </h1>
            <p className="text-white/70 mt-1">{t("it.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-end">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {t("it.button.seedTemplates")}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t("it.button.newTemplate")}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editId ? t("it.dialog.title.edit") : t("it.dialog.title.create")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t("it.form.label.templateName")}</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("it.form.placeholder.templateName")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t("it.form.label.category")}</label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("it.form.label.difficulty")}</label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map(d => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("it.form.label.description")}</label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)}
                        placeholder={t("it.form.placeholder.description")} rows={2} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("it.form.label.systemPrompt")}</label>
                      <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                        placeholder={t("it.form.placeholder.systemPrompt")} rows={6}
                        className="font-mono text-sm" />
                      <p className="text-xs text-muted-foreground mt-1">{t("it.form.help.systemPrompt")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t("it.form.label.topics")}</label>
                      <Input value={topics} onChange={e => setTopics(e.target.value)}
                        placeholder={t("it.form.placeholder.topics")} />
                    </div>
                    <Button onClick={handleSubmit} className="w-full"
                      disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editId ? t("it.button.update") : t("it.button.create")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("it.searchPlaceholder")} className="pl-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button variant={selectedCategory === "" ? "default" : "outline"} size="sm"
              onClick={() => setSelectedCategory("")}>{t("it.filter.all")}</Button>
            {CATEGORIES.map(c => (
              <Button key={c.value} variant={selectedCategory === c.value ? "default" : "outline"} size="sm"
                onClick={() => setSelectedCategory(c.value)}>
                {c.icon} {c.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("it.empty.title")}</h3>
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-1" /> {t("it.button.seedTemplates")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const cat = CATEGORIES.find(c => c.value === template.category);
              const diff = DIFFICULTIES.find(d => d.value === template.difficulty);
              return (
                <Card key={template.id} className="group hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat?.icon}</span>
                        <Badge variant="outline" className="text-xs">{cat?.label}</Badge>
                        <Badge className={`text-xs ${diff?.color}`}>{diff?.label}</Badge>
                      </div>
                      {template.isBuiltIn && (
                        <Badge variant="secondary" className="text-xs"><Zap className="h-3 w-3 mr-1" />{t("it.badge.builtIn")}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-xs line-clamp-2">{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {template.topics && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.topics.split(",").slice(0, 4).map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">{topic.trim()}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="bg-muted/50 rounded-md p-2 mb-3">
                      <p className="text-xs text-muted-foreground line-clamp-3 font-mono">{template.systemPrompt}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {t("it.usageCount", { count: template.usageCount || 0 })}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleDuplicate(template)} title={t("it.tooltip.duplicate")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {!template.isBuiltIn && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleEdit(template)} title={t("it.tooltip.edit")}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => { if (confirm(t("it.confirm.delete"))) deleteMutation.mutate({ id: template.id }); }}
                              title={t("it.tooltip.delete")}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
