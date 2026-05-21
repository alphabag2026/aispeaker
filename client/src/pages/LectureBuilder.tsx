import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Users, FileText, Image, Layers, Eye, ChevronLeft, ChevronRight, Plus, Trash2,
  Upload, Wand2, Loader2, GripVertical, Check, ArrowRight, Pencil, Circle,
  ArrowUpRight, CheckSquare, PenTool, MousePointer, Volume2, Play, Pause,
  Move, Settings2, Video, Download, X, Eraser, Palette, History, Undo2, Sparkles, Link2,
  Copy, Save, Globe, Languages, Headphones, Camera, UserCircle2, ImagePlus, Star, ArrowUpDown, Rocket, Presentation, Mic, CreditCard, Coins, StopCircle, Pin, Clock } from
"lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import KlingAvatarCreator from "@/components/KlingAvatarCreator";
import { LectureFormatSelector } from "@/components/LectureFormatSelector";
import { ProjectCollaborationPanel, PendingInvitationsPanel } from "@/components/ProjectCollaborationPanel";
import AvatarSettingsDialog from "@/components/AvatarSettingsDialog";
import StepGuideTooltip from "@/components/StepGuideTooltip";
import AvatarCustomizePanel from "@/components/AvatarCustomizePanel";
import OnboardingTour from "@/components/OnboardingTour";
import ScriptAutocomplete from "@/components/ScriptAutocomplete";
import AvatarPresetPackages from "@/components/AvatarPresetPackages";

// ============ TYPES ============
interface ScriptSection {
  id: string;
  section: number;
  text: string;
  avatarId?: number;
}

interface AnnotationData {
  type: "circle" | "arrow" | "check" | "underline" | "freehand";
  color: string;
  thickness: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: {x: number;y: number;}[];
}

// ============ STEP DEFINITIONS ============
const getSTEPS = (t: (k: string) => string) => [
{ id: 1, title: t("lectureBuilder.stringLiteral0"), icon: Users, desc: t("lectureBuilder.stringLiteral1") },
{ id: 2, title: t("lectureBuilder.stringLiteral2"), icon: FileText, desc: t("lectureBuilder.stringLiteral3") },
{ id: 3, title: t("lectureBuilder.stringLiteral4"), icon: Image, desc: t("lectureBuilder.stringLiteral5") },
{ id: 4, title: t("lectureBuilder.stringLiteral6"), icon: Layers, desc: t("lectureBuilder.stringLiteral7") },
{ id: 5, title: t("lectureBuilder.stringLiteral8"), icon: Eye, desc: t("lectureBuilder.stringLiteral9") }];

const getAVATAR_ROLES = (t: (k: string) => string) => [
{ value: "instructor", label: t("lectureBuilder.stringLiteral10"), color: "bg-blue-500/20 text-blue-400" },
{ value: "host", label: t("lectureBuilder.stringLiteral11"), color: "bg-purple-500/20 text-purple-400" },
{ value: "guest", label: t("lectureBuilder.stringLiteral12"), color: "bg-green-500/20 text-green-400" },
{ value: "narrator", label: t("lectureBuilder.stringLiteral13"), color: "bg-orange-500/20 text-orange-400" }];

const getANNOTATION_TOOLS = (t: (k: string) => string) => [
{ type: "circle" as const, icon: Circle, label: t("lectureBuilder.stringLiteral14") },
{ type: "arrow" as const, icon: ArrowUpRight, label: t("lectureBuilder.stringLiteral15") },
{ type: "check" as const, icon: CheckSquare, label: t("lectureBuilder.stringLiteral16") },
{ type: "underline" as const, icon: PenTool, label: t("lectureBuilder.stringLiteral17") },
{ type: "freehand" as const, icon: Pencil, label: t("lectureBuilder.stringLiteral18") },
{ type: "eraser" as const, icon: Eraser, label: t("lectureBuilder.stringLiteral19") }];


const PEN_COLORS = ["#FF0000", "#00FF00", "#0066FF", "#FFFF00", "#FF6600", "#FF00FF", "#FFFFFF"];

// ============ MAIN COMPONENT ============
export default function LectureBuilder() {
  const { t } = useLanguage();
  const STEPS = getSTEPS(t);
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const ANNOTATION_TOOLS = getANNOTATION_TOOLS(t);
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/lecture-builder/:id");
  const projectId = matched ? parseInt(params!.id) : null;

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  // Project creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createStep, setCreateStep] = useState<"info" | "format">("info");
  const [selectedFormats, setSelectedFormats] = useState<any>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [user, authLoading]);

  // Queries
  const projectsQuery = trpc.lectureBuilder.listProjects.useQuery(undefined, { enabled: !!user });
  const fullProjectQuery = trpc.lectureBuilder.getFullProject.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const facesQuery = trpc.sampleFace.list.useQuery({}, { enabled: !!projectId });
  const voicesQuery = trpc.tts.voices.useQuery(undefined, { enabled: !!projectId });

  // Mutations
  const createProject = trpc.lectureBuilder.createProject.useMutation({
    onSuccess: (data) => {
      toast.success(t("lectureBuilder.stringLiteral20"));
      setShowCreateDialog(false);
      setLocation(`/lecture-builder/${data.id}`);
    },
    onError: (e) => toast.error(e.message || t("lectureBuilder.stringLiteral21"))
  });

  // Only set step from DB on initial load
  const [stepInitialized, setStepInitialized] = useState(false);
  useEffect(() => {
    if (fullProjectQuery.data?.project && !stepInitialized) {
      setCurrentStep(fullProjectQuery.data.project.currentStep);
      setStepInitialized(true);
    }
  }, [fullProjectQuery.data?.project?.currentStep, stepInitialized]);

  // Mutation to persist step changes
  const updateProject = trpc.lectureBuilder.updateProject.useMutation();

  // Clone project mutation
  const cloneProjectMut = trpc.lectureBuilder.cloneProject.useMutation({
    onSuccess: (data) => {
      toast.success(t("lectureBuilder.stringLiteral22"));
      projectsQuery.refetch();
      setLocation(`/lecture-builder/${data.newProjectId}`);
    },
    onError: () => toast.error(t("lectureBuilder.stringLiteral23"))
  });

  const handleCloneProject = (id: number, title: string) => {
    if (confirm(t("lectureBuilder.hardcoded.cloneConfirm", { title }))) {
      cloneProjectMut.mutate({ sourceProjectId: id, newTitle: `${title} ${t("lectureBuilder.hardcoded.cloneSuffix")}` });
    }
  };

  // Toggle pin mutation
  const togglePinMut = trpc.lectureBuilder.togglePin.useMutation({
    onSuccess: (data) => {
      toast.success(data.isPinned ? t("lectureBuilder.hardcoded.pinned") : t("lectureBuilder.hardcoded.unpinned"));
      projectsQuery.refetch();
    },
    onError: () => toast.error("Failed to toggle pin")
  });

  // Save last working project to localStorage
  useEffect(() => {
    if (projectId) {
      localStorage.setItem('aispeaker-last-project', String(projectId));
    }
  }, [projectId]);

  // Auto-redirect to last project on list view
  const [autoRedirectDone, setAutoRedirectDone] = useState(false);
  useEffect(() => {
    if (!projectId && !autoRedirectDone && user && projectsQuery.data) {
      const lastId = localStorage.getItem('aispeaker-last-project');
      if (lastId) {
        const exists = projectsQuery.data.some((p: any) => p.id === parseInt(lastId));
        if (exists) {
          setAutoRedirectDone(true);
          setLocation(`/lecture-builder/${lastId}`);
          toast.info(t("lectureBuilder.resumeLastProject") || "\ub9c8\uc9c0\ub9c9 \uc791\uc5c5\uc73c\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4.");
          return;
        }
      }
      setAutoRedirectDone(true);
    }
  }, [projectId, autoRedirectDone, user, projectsQuery.data]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  // ============ PROJECT LIST VIEW ============
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("lectureBuilder.jsxText24")}</h1>
              <p className="text-muted-foreground mt-1">{t("lectureBuilder.jsxText25")}</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={(open) => {setShowCreateDialog(open);if (!open) {setCreateStep("info");setNewTitle("");setNewDesc("");setSelectedFormats(null);}}}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2"><Plus className="w-5 h-5" />{t("lectureBuilder.jsxText26")}</Button>
              </DialogTrigger>
              <DialogContent className={createStep === "format" ? "sm:max-w-4xl max-h-[85vh] overflow-y-auto" : ""}>
                <DialogHeader>
                  <DialogTitle>
                    {createStep === "info" ? t("lectureBuilder.stringLiteral27") : t("lectureBuilder.stringLiteral28")}
                  </DialogTitle>
                </DialogHeader>
                {createStep === "info" ?
                <div className="space-y-4 pt-4">
                    <div>
                      <Label>{t("lectureBuilder.jsxText29")}</Label>
                      <Input placeholder={t("lectureBuilder.stringLiteral30")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t("lectureBuilder.jsxText31")}</Label>
                      <Textarea placeholder={t("lectureBuilder.stringLiteral32")} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" disabled={!newTitle.trim()}
                    onClick={() => setCreateStep("format")}>
                        <Sparkles className="w-4 h-4" />{t("lectureBuilder.jsxText33")}
                    </Button>
                      <Button className="flex-1" disabled={!newTitle.trim() || createProject.isPending}
                    onClick={() => createProject.mutate({ title: newTitle.trim(), description: newDesc.trim() || undefined })}>
                        {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{t("lectureBuilder.jsxText34")}

                    </Button>
                    </div>
                  </div> :

                <div className="pt-2">
                    <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setCreateStep("info")}>
                      <ChevronLeft className="w-4 h-4" />{t("lectureBuilder.jsxText35")}
                  </Button>
                    <LectureFormatSelector
                    onApply={(formats, templates) => {
                      setSelectedFormats({ formats, templates });
                      toast.success(t("lectureBuilder.hardcoded.formatsSelected", { count: String(templates.length) }));
                      createProject.mutate({
                        title: newTitle.trim(),
                        description: newDesc.trim() || undefined,
                        formatSelection: {
                          personnelId: formats.personnel,
                          styleId: formats.style,
                          insertIds: formats.inserts
                        }
                      });
                    }} />
                  
                  </div>
                }
              </DialogContent>
            </Dialog>
          </div>

          <PendingInvitationsPanel />

          {projectsQuery.isLoading ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div> :
          !projectsQuery.data?.length ?
          <Card className="border-dashed border-2 py-20">
              <CardContent className="flex flex-col items-center text-center">
                <Video className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("lectureBuilder.jsxText36")}</h3>
                <p className="text-muted-foreground mb-6">{t("lectureBuilder.jsxText37")}</p>
                <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" />{t("lectureBuilder.jsxText38")}</Button>
              </CardContent>
            </Card> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectsQuery.data.map((p) =>
            <Card key={p.id} className={`group cursor-pointer hover:border-primary/50 transition-colors relative ${p.isPinned ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
            onClick={() => setLocation(`/lecture-builder/${p.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate flex items-center gap-1.5">
                        {p.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {p.title}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className={`h-7 w-7 transition-opacity ${p.isPinned ? 'opacity-100 text-amber-500' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => {e.stopPropagation();togglePinMut.mutate({ projectId: p.id });}}>
                          <Pin className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {e.stopPropagation();handleCloneProject(p.id, p.title);}}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Badge variant={p.status === "completed" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                          {p.status === "draft" ? t("lectureBuilder.stringLiteral39") : p.status === "in_progress" ? t("lectureBuilder.stringLiteral40") : p.status === "ready" ? t("lectureBuilder.stringLiteral41") : p.status === "completed" ? t("lectureBuilder.stringLiteral42") : p.status}
                        </Badge>
                      </div>
                    </div>
                    {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Step {p.currentStep}/5</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.currentStep / 5 * 100}%` }} />
                      </div>
                      <span className="text-xs">{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </div>
      </div>);

  }

  // ============ BUILDER VIEW ============
  const project = fullProjectQuery.data?.project;
  const avatars = fullProjectQuery.data?.avatars || [];
  const slides = fullProjectQuery.data?.slides || [];
  const scripts = fullProjectQuery.data?.scripts || [];
  const annotations = fullProjectQuery.data?.annotations || [];
  const avatarOverrides = fullProjectQuery.data?.avatarOverrides || [];
  const insertContent = fullProjectQuery.data?.insertContent || [];
  const transitions = fullProjectQuery.data?.transitions || [];
  const faces = facesQuery.data || [];
  const voices = voicesQuery.data || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Onboarding Tour for first-time visitors */}
      {projectId && (
        <OnboardingTour
          onComplete={() => { setShowOnboarding(false); setForceOnboarding(false); }}
          forceShow={forceOnboarding}
        />
      )}

      {/* Step Progress Bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/lecture-builder")} className="gap-1">
              <ChevronLeft className="w-4 h-4" />{t("lectureBuilder.jsxText43")}
            </Button>
            <h2 className="font-semibold text-foreground truncate max-w-md">{project?.title || t("lectureBuilder.stringLiteral44")}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Step {currentStep}/5</span>
              <StepGuideTooltip currentStep={currentStep} />
              <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-primary" onClick={() => setForceOnboarding(true)} title={t("onboarding.welcome")}>
                <Rocket className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isClickable = !isActive; // All steps are clickable except current
              return (
                <button key={step.id}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                "bg-muted/50 text-muted-foreground cursor-pointer hover:bg-muted"}`
                }
                onClick={() => {
                  if (isClickable) {
                    setCurrentStep(step.id);
                    if (projectId) updateProject.mutate({ id: projectId, currentStep: step.id });
                  }
                }}>
                  
                  <StepIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{step.title}</span>
                  {isCompleted && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>);

            })}
          </div>
        </div>
      </div>

      {/* Collaboration Panel - Right Side */}
      {projectId &&
      <div className="max-w-7xl mx-auto px-4 pt-4">
          <ProjectCollaborationPanel projectId={String(projectId)} />
        </div>
      }

      {/* Step Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {fullProjectQuery.isLoading ?
        <div className="space-y-6 animate-pulse">
          <div className="flex gap-4">
            <div className="w-32 h-32 bg-muted rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-xl" />)}
          </div>
        </div> :

        <>
            {currentStep === 1 &&
          <Step1Avatars
            projectId={projectId}
            avatars={avatars}
            faces={faces}
            voices={voices}
            project={project}
            slides={slides}
            scripts={scripts}
            onRefresh={() => fullProjectQuery.refetch()} />

          }
            {currentStep === 2 &&
          <Step2Scripts
            projectId={projectId}
            slides={slides}
            scripts={scripts}
            avatars={avatars}
            onRefresh={() => fullProjectQuery.refetch()}
            onGoToStep4={() => { setCurrentStep(4); updateProject.mutate({ id: projectId, currentStep: 4 }); }} />

          }
            {currentStep === 3 &&
          <Step3Slides
            projectId={projectId}
            slides={slides}
            onRefresh={() => fullProjectQuery.refetch()} />

          }
            {currentStep === 4 &&
          <Step4Matching
            projectId={projectId}
            slides={slides}
            scripts={scripts}
            avatars={avatars}
            annotations={annotations}
            avatarOverrides={avatarOverrides}
            insertContent={insertContent}
            transitions={transitions}
            onRefresh={() => fullProjectQuery.refetch()} />

          }
            {currentStep === 5 && project &&
          <Step5Preview
            projectId={projectId}
            project={project}
            slides={slides}
            scripts={scripts}
            avatars={avatars}
            annotations={annotations}
            avatarOverrides={avatarOverrides}
            insertContent={insertContent}
            transitions={transitions}
            onRefresh={() => fullProjectQuery.refetch()} />

          }
          </>
        }
      </div>

      {/* Navigation Buttons */}
      <div className="border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" disabled={currentStep <= 1}
          onClick={() => {
            const newStep = Math.max(1, currentStep - 1);
            setCurrentStep(newStep);
            if (projectId) updateProject.mutate({ id: projectId, currentStep: newStep });
          }}>
            <ChevronLeft className="w-4 h-4 mr-1" />{t("lectureBuilder.jsxText45")}
          </Button>
          <div className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1]?.desc}
          </div>
          {currentStep < 5 ?
          <Button onClick={() => {
            const newStep = Math.min(5, currentStep + 1);
            setCurrentStep(newStep);
            if (projectId) updateProject.mutate({ id: projectId, currentStep: newStep });
          }}>{t("lectureBuilder.jsxText46")}
            <ChevronRight className="w-4 h-4 ml-1" />
            </Button> :

          <Button className="gap-2" id="nav-generate-video-btn" onClick={() => {const el = document.getElementById('step5-generate-video-btn');if (el) el.click();else toast.info(t("lectureBuilder.stringLiteral47"));}}>
              <Video className="w-4 h-4" />{t("lectureBuilder.jsxText48")}
          </Button>
          }
        </div>
      </div>
    </div>);

}

// ============ STEP 1: AVATAR SELECTION ============
function Step1Avatars({ projectId, avatars, faces, voices, onRefresh, project, slides, scripts
}: {projectId: number;avatars: any[];faces: any[];voices: any[];onRefresh: () => void; project?: any; slides?: any[]; scripts?: any[];}) {const { t } = useLanguage();
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [showFormatWarning, setShowFormatWarning] = useState(false);
  const [pendingFormatChange, setPendingFormatChange] = useState<{personnelId: number|null; styleId: number|null; insertIds: number[]} | null>(null);
  const hasExistingContent = (slides && slides.length > 0) || (scripts && scripts.length > 0);
  const updateProjectFormat = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => { toast.success(t("lectureBuilder.formatChangeSuccess")); onRefresh(); setShowFormatDialog(false); setShowFormatWarning(false); setPendingFormatChange(null); },
    onError: (e) => toast.error(e.message)
  });
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [avatarRole, setAvatarRole] = useState<string>("instructor");
  const [avatarVoice, setAvatarVoice] = useState("Kore");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addTab, setAddTab] = useState<"preset" | "my" | "upload" | "ai" | "did">("preset");
  const [didText, setDidText] = useState("");
  const [didTalkId, setDidTalkId] = useState<string | null>(null);
  const [didVideoUrl, setDidVideoUrl] = useState<string | null>(null);
  const [didGenerating, setDidGenerating] = useState(false);
  const [didVoiceId, setDidVoiceId] = useState("en-US-JennyNeural");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSortBy, setAvatarSortBy] = useState<"favorite" | "recent" | "name" | "created">("favorite");
  const myAvatarsQuery = trpc.userAvatar.list.useQuery({ sortBy: avatarSortBy }, { enabled: showAddDialog });
  const toggleFavorite = trpc.userAvatar.toggleFavorite.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); },
    onError: (e) => toast.error(e.message)
  });
  const recordUsage = trpc.userAvatar.recordUsage.useMutation();
  const createUserAvatar = trpc.userAvatar.create.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.uploaded")); },
    onError: (e) => toast.error(e.message)
  });
  const deleteUserAvatar = trpc.userAvatar.delete.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.deleted")); }
  });
  const generateFace = trpc.userAvatar.generateFace.useMutation({
    onSuccess: (data) => {
      myAvatarsQuery.refetch();
      setAiPreview(data.imageUrl);
      setSelectedMyAvatarUrl(data.imageUrl);
      setSelectedFaceId(null);
      setAiGenerating(false);
      toast.success(t("lectureBuilder.avatar.aiGenerated"));
    },
    onError: (e) => { setAiGenerating(false); toast.error(e.message); }
  });
  const updateUserAvatar = trpc.userAvatar.update.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.updated")); },
    onError: (e) => toast.error(e.message)
  });
  const [selectedMyAvatarUrl, setSelectedMyAvatarUrl] = useState<string | null>(null);
  const createDidPreview = trpc.userAvatar.createDidPreview.useMutation();
  const [showKlingDialog, setShowKlingDialog] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any | null>(null);
  const [customizingAvatar, setCustomizingAvatar] = useState<any | null>(null);
  const [editingUserAvatar, setEditingUserAvatar] = useState<any | null>(null);
  const [editUserAvatarName, setEditUserAvatarName] = useState("");
  const [editUserAvatarDesc, setEditUserAvatarDesc] = useState("");

  // Fetch user's personal voice clones
  const voiceClonesQuery = trpc.voiceClone.list.useQuery(undefined, { enabled: showAddDialog });
  const myVoiceClones = voiceClonesQuery.data?.filter((c: any) => c.status === "ready") || [];

  const addAvatar = trpc.lectureBuilder.addAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("lectureBuilder.stringLiteral49"));
      setShowAddDialog(false);
      setSelectedFaceId(null);
      setAvatarName("");
      onRefresh();
    },
    onError: (e) => toast.error(e.message)
  });

  const deleteAvatar = trpc.lectureBuilder.deleteAvatar.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral50"));onRefresh();}
  });

  const selectedFace = faces.find((f) => f.id === selectedFaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText51")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText52")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Format Change Button */}
          <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                <Settings2 className="w-4 h-4" />{t("lectureBuilder.changeFormat")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-amber-500" />{t("lectureBuilder.changeFormatTitle")}</DialogTitle></DialogHeader>
              {project?.formatSelection && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">{t("lectureBuilder.currentFormatInfo")}</p>
                </div>
              )}
              <LectureFormatSelector
                initialSelection={project?.formatSelection ? {
                  personnelId: project.formatSelection.personnelId ?? null,
                  styleId: project.formatSelection.styleId ?? null,
                  insertIds: project.formatSelection.insertIds ?? []
                } : undefined}
                onApply={(formats, templates) => {
                  const newFormat = {
                    personnelId: formats.personnel,
                    styleId: formats.style,
                    insertIds: formats.inserts
                  };
                  if (hasExistingContent) {
                    setPendingFormatChange(newFormat);
                    setShowFormatWarning(true);
                  } else {
                    updateProjectFormat.mutate({ id: projectId, formatSelection: newFormat });
                  }
                }} />
            </DialogContent>
          </Dialog>
          {/* Format change warning dialog */}
          <Dialog open={showFormatWarning} onOpenChange={setShowFormatWarning}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-500">
                  <Settings2 className="w-5 h-5" />{t("lectureBuilder.formatWarningTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("lectureBuilder.formatWarningDesc")}</p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-600">{t("lectureBuilder.formatWarningImpact")}</p>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                    {slides && slides.length > 0 && <li>• {t("lectureBuilder.formatWarningSlides", { count: String(slides.length) })}</li>}
                    {scripts && scripts.length > 0 && <li>• {t("lectureBuilder.formatWarningScripts", { count: String(scripts.length) })}</li>}
                  </ul>
                </div>
                {scripts && scripts.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-400">{t("lectureBuilder.formatMigrateOption")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("lectureBuilder.formatMigrateDesc")}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowFormatWarning(false); setPendingFormatChange(null); }}>
                    {t("lectureBuilder.formatWarningCancel")}
                  </Button>
                  {scripts && scripts.length > 0 && (
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={updateProjectFormat.isPending} onClick={() => {
                      if (pendingFormatChange) {
                        updateProjectFormat.mutate({ id: projectId, formatSelection: pendingFormatChange, migrateScripts: true });
                      }
                    }}>
                      {updateProjectFormat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {t("lectureBuilder.formatMigrateBtn")}
                    </Button>
                  )}
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={updateProjectFormat.isPending} onClick={() => {
                    if (pendingFormatChange) {
                      updateProjectFormat.mutate({ id: projectId, formatSelection: pendingFormatChange });
                    }
                  }}>
                    {updateProjectFormat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t("lectureBuilder.formatWarningConfirm")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showKlingDialog} onOpenChange={setShowKlingDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" />{t("lectureBuilder.jsxText53")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{t("lectureBuilder.jsxText54")}</DialogTitle></DialogHeader>
              <KlingAvatarCreator
                onVideoCreated={(videoUrl) => {
                  toast.success(t("lectureBuilder.stringLiteral55"));
                }} />
              
            </DialogContent>
          </Dialog>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button disabled={avatars.length >= 3} className="gap-2"><Plus className="w-4 h-4" />{t("lectureBuilder.jsxText56")}</Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("lectureBuilder.jsxText57")}</DialogTitle></DialogHeader>
            <Tabs value={addTab} onValueChange={(v) => { setAddTab(v as any); setSelectedFaceId(null); setSelectedMyAvatarUrl(null); setUploadPreview(null); setUploadFile(null); setAiPreview(null); setAiPrompt(""); }} className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="preset" className="gap-1.5"><Users className="w-4 h-4" />{t("lectureBuilder.avatarTab.preset")}</TabsTrigger>
                <TabsTrigger value="my" className="gap-1.5"><UserCircle2 className="w-4 h-4" />{t("lectureBuilder.avatarTab.myAvatars")}</TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5"><Camera className="w-4 h-4" />{t("lectureBuilder.avatarTab.upload")}</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="w-4 h-4" />{t("lectureBuilder.avatarTab.aiGenerate")}</TabsTrigger>
                <TabsTrigger value="did" className="gap-1.5"><Video className="w-4 h-4" />{t("lectureBuilder.avatarTab.didPreview")}</TabsTrigger>
              </TabsList>

              {/* Tab 1: Preset Faces */}
              <TabsContent value="preset" className="space-y-4 pt-2">
                {/* Preset Packages */}
                <AvatarPresetPackages onApply={(preset) => {
                  setAvatarName(preset.name);
                  setAvatarRole(preset.role);
                  setAvatarVoice(preset.voiceId);
                }} />
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground font-medium">{t("lectureBuilder.avatarTab.preset")}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {faces.filter((f) => f.isActive).map((face) =>
                    <button key={face.id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                    selectedFaceId === face.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/30"}`}
                    onClick={() => {setSelectedFaceId(face.id); setSelectedMyAvatarUrl(null); if (!avatarName) setAvatarName(face.name);}}>
                      <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                      {selectedFaceId === face.id &&
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary-foreground bg-primary rounded-full p-1" />
                        </div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                        <span className="text-[10px] text-white truncate block">{face.name}</span>
                      </div>
                    </button>)}
                </div>
              </TabsContent>

              {/* Tab 2: My Avatars */}
              <TabsContent value="my" className="space-y-4 pt-2">
                {myAvatarsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : !myAvatarsQuery.data?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCircle2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-muted-foreground">{t("lectureBuilder.avatar.myAvatarsEmpty")}</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">{t("lectureBuilder.avatar.myAvatarsEmptyDesc")}</p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={() => setAddTab("upload")}>
                      <Upload className="w-4 h-4" />{t("lectureBuilder.avatarTab.upload")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Sort dropdown */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{myAvatarsQuery.data.length} {t("lectureBuilder.avatar.avatarCount")}</span>
                      <Select value={avatarSortBy} onValueChange={(v) => setAvatarSortBy(v as any)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <ArrowUpDown className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="favorite">{t("lectureBuilder.avatar.sortFavorite")}</SelectItem>
                          <SelectItem value="recent">{t("lectureBuilder.avatar.sortRecent")}</SelectItem>
                          <SelectItem value="name">{t("lectureBuilder.avatar.sortName")}</SelectItem>
                          <SelectItem value="created">{t("lectureBuilder.avatar.sortCreated")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                      {myAvatarsQuery.data.map((av) =>
                        <div key={av.id} className="relative group">
                          <button
                            className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square w-full ${
                            selectedMyAvatarUrl === av.imageUrl ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/30"}`}
                            onClick={() => {
                              setSelectedMyAvatarUrl(av.imageUrl); setSelectedFaceId(null);
                              if (!avatarName) setAvatarName(av.name);
                              recordUsage.mutate({ id: av.id });
                            }}>
                            <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                            {selectedMyAvatarUrl === av.imageUrl &&
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary-foreground bg-primary rounded-full p-1" />
                            </div>}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                              <span className="text-[10px] text-white truncate block">{av.name}</span>
                            </div>
                            {/* Favorite star badge */}
                            {av.isFavorite && (
                              <div className="absolute top-0.5 left-0.5">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 drop-shadow" />
                              </div>
                            )}
                          </button>
                          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10">
                            <button className={`rounded-full p-0.5 transition-colors ${av.isFavorite ? "bg-yellow-400 text-yellow-900" : "bg-muted text-muted-foreground hover:bg-yellow-400 hover:text-yellow-900"}`}
                              onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate({ id: av.id }); }}>
                              <Star className={`w-3 h-3 ${av.isFavorite ? "fill-current" : ""}`} />
                            </button>
                            <button className="bg-primary text-primary-foreground rounded-full p-0.5"
                              onClick={(e) => { e.stopPropagation(); setEditingUserAvatar(av); setEditUserAvatarName(av.name); setEditUserAvatarDesc(av.description || ""); }}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button className="bg-destructive text-destructive-foreground rounded-full p-0.5"
                              onClick={(e) => { e.stopPropagation(); if (confirm(t("lectureBuilder.avatar.deleteConfirm"))) deleteUserAvatar.mutate({ id: av.id }); }}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>)}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab 3: Upload Photo */}
              <TabsContent value="upload" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.uploadTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.uploadDesc")}</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { toast.error(t("lectureBuilder.avatar.fileTooLarge")); return; }
                  setUploadFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
                {uploadPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
                      <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setUploadPreview(null); setUploadFile(null); }}>
                        <X className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.changePhoto")}
                      </Button>
                      <Button size="sm" disabled={isUploading || !avatarName.trim()} onClick={async () => {
                        if (!uploadFile) return;
                        setIsUploading(true);
                        try {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = (ev.target?.result as string).split(",")[1];
                            const result = await createUserAvatar.mutateAsync({
                              name: avatarName.trim() || uploadFile.name.replace(/\.[^.]+$/, ""),
                              imageData: base64,
                              fileName: uploadFile.name,
                              mimeType: uploadFile.type,
                              type: "photo",
                            });
                            setSelectedMyAvatarUrl(result.imageUrl);
                            setSelectedFaceId(null);
                            setUploadPreview(null);
                            setUploadFile(null);
                            setAddTab("my");
                          };
                          reader.readAsDataURL(uploadFile);
                        } catch (err) { /* handled by mutation */ }
                        finally { setIsUploading(false); }
                      }}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                        {t("lectureBuilder.avatar.saveAndRegister")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t("lectureBuilder.avatar.clickToUpload")}</span>
                    <span className="text-xs text-muted-foreground">{t("lectureBuilder.avatar.uploadHint")}</span>
                  </button>
                )}
              </TabsContent>
              {/* Tab 4: AI Face Generation */}
              <TabsContent value="ai" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.aiTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.aiDesc")}</p>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                    placeholder={t("lectureBuilder.avatar.aiPlaceholder")}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{aiPrompt.length}/500</span>
                  </div>
                </div>
                {aiPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg">
                      <img src={aiPreview} alt="AI generated" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAiPreview(null); setSelectedMyAvatarUrl(null); }}>
                        <Wand2 className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.aiRegenerate")}
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 font-medium">{t("lectureBuilder.avatar.aiSavedToMyAvatars")}</p>
                  </div>
                ) : (
                  <Button
                    className="w-full gap-2"
                    disabled={!aiPrompt.trim() || aiGenerating || !avatarName.trim()}
                    onClick={() => {
                      setAiGenerating(true);
                      generateFace.mutate({ prompt: aiPrompt.trim(), name: avatarName.trim() || "AI Avatar" });
                    }}
                  >
                    {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiGenerating ? t("lectureBuilder.avatar.aiGenerating") : t("lectureBuilder.avatar.aiGenerateBtn")}
                  </Button>
                )}
                {/* Example prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("lectureBuilder.avatar.aiExamples")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: t("lectureBuilder.avatar.aiEx1"), prompt: "a young Korean female professor in her 30s with glasses" },
                      { label: t("lectureBuilder.avatar.aiEx2"), prompt: "a middle-aged Caucasian male business executive with gray hair" },
                      { label: t("lectureBuilder.avatar.aiEx3"), prompt: "a young Indian female tech entrepreneur with confident smile" },
                      { label: t("lectureBuilder.avatar.aiEx4"), prompt: "a friendly Japanese male teacher in his 40s" },
                    ].map((ex) => (
                      <button key={ex.prompt} className="text-xs px-2.5 py-1 rounded-full border hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        onClick={() => setAiPrompt(ex.prompt)}>{ex.label}</button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              {/* Tab 5: D-ID Preview */}
              <TabsContent value="did" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.didTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.didDesc")}</p>
                </div>
                {/* Step 1: Select avatar image */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep1")}</Label>
                  {(selectedMyAvatarUrl || selectedFaceId) ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <img src={selectedMyAvatarUrl || faces.find(f => f.id === selectedFaceId)?.imageUrl || ""} alt="selected" className="w-12 h-12 rounded-full object-cover border-2 border-primary/30" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{avatarName || t("lectureBuilder.avatar.didSelectedAvatar")}</p>
                        <p className="text-xs text-muted-foreground">{t("lectureBuilder.avatar.didAvatarReady")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setAddTab("my")}>{t("lectureBuilder.avatar.didChangeAvatar")}</Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center">
                      <p className="text-sm text-muted-foreground mb-2">{t("lectureBuilder.avatar.didNoAvatar")}</p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => setAddTab("my")}>{t("lectureBuilder.avatarTab.myAvatars")}</Button>
                        <Button variant="outline" size="sm" onClick={() => setAddTab("preset")}>{t("lectureBuilder.avatarTab.preset")}</Button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Step 2: Voice selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep2")}</Label>
                  <Select value={didVoiceId} onValueChange={setDidVoiceId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US-JennyNeural">Jenny (English, Female)</SelectItem>
                      <SelectItem value="en-US-GuyNeural">Guy (English, Male)</SelectItem>
                      <SelectItem value="ko-KR-SunHiNeural">SunHi (Korean, Female)</SelectItem>
                      <SelectItem value="ko-KR-InJoonNeural">InJoon (Korean, Male)</SelectItem>
                      <SelectItem value="ja-JP-NanamiNeural">Nanami (Japanese, Female)</SelectItem>
                      <SelectItem value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Chinese, Female)</SelectItem>
                      <SelectItem value="es-ES-ElviraNeural">Elvira (Spanish, Female)</SelectItem>
                      <SelectItem value="fr-FR-DeniseNeural">Denise (French, Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Step 3: Text input */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep3")}</Label>
                  <textarea
                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                    placeholder={t("lectureBuilder.avatar.didPlaceholder")}
                    value={didText}
                    onChange={(e) => setDidText(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{didText.length}/1000</span>
                  </div>
                </div>
                {/* Generate button or video result */}
                {didVideoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-full max-w-sm rounded-xl overflow-hidden border shadow-lg">
                      <video src={didVideoUrl} controls autoPlay className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDidVideoUrl(null); setDidTalkId(null); }}>
                        <Wand2 className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.didRegenerate")}
                      </Button>
                      <a href={didVideoUrl} download target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.didDownload")}</Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full gap-2"
                    disabled={!(selectedMyAvatarUrl || selectedFaceId) || !didText.trim() || didGenerating}
                    onClick={async () => {
                      const imageUrl = selectedMyAvatarUrl || faces.find(f => f.id === selectedFaceId)?.imageUrl;
                      if (!imageUrl) return;
                      setDidGenerating(true);
                      setDidVideoUrl(null);
                      try {
                        const result = await createDidPreview.mutateAsync({
                          imageUrl,
                          text: didText.trim(),
                          voiceId: didVoiceId,
                        });
                        setDidTalkId(result.talkId);
                        // Poll for completion
                        let attempts = 0;
                        const poll = async () => {
                          if (attempts >= 30) { setDidGenerating(false); toast.error(t("lectureBuilder.avatar.didTimeout")); return; }
                          attempts++;
                          try {
                            const statusRes = await fetch(`/api/trpc/userAvatar.getDidPreviewStatus?input=${encodeURIComponent(JSON.stringify({ talkId: result.talkId }))}`, { credentials: "include" });
                            const statusJson = await statusRes.json() as any;
                            const statusData = statusJson?.result?.data;
                            if (statusData?.status === "done" && statusData?.videoUrl) {
                              setDidVideoUrl(statusData.videoUrl);
                              setDidGenerating(false);
                              toast.success(t("lectureBuilder.avatar.didSuccess"));
                            } else if (statusData?.status === "error") {
                              setDidGenerating(false);
                              toast.error(statusData.error || t("lectureBuilder.avatar.didError"));
                            } else {
                              setTimeout(poll, 2000);
                            }
                          } catch { setTimeout(poll, 2000); }
                        };
                        setTimeout(poll, 3000);
                      } catch (err: any) {
                        setDidGenerating(false);
                        toast.error(err.message || t("lectureBuilder.avatar.didError"));
                      }
                    }}
                  >
                    {didGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("lectureBuilder.avatar.didGenerating")}</>
                    ) : (
                      <><Video className="w-4 h-4" />{t("lectureBuilder.avatar.didGenerateBtn")}</>
                    )}
                  </Button>
                )}
              </TabsContent>
            </Tabs>

            <Separator className="my-2" />
            {/* Avatar Settings - shared across all tabs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("lectureBuilder.jsxText59")}</Label>
                  <Input placeholder={t("lectureBuilder.stringLiteral60")} value={avatarName} onChange={(e) => setAvatarName(e.target.value)} />
                </div>
                <div>
                  <Label>{t("lectureBuilder.jsxText61")}</Label>
                  <Select value={avatarRole} onValueChange={setAvatarRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVATAR_ROLES.map((r: any) =>
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("lectureBuilder.jsxText62")}</Label>
                <div className="flex items-center gap-2">
                  <Select value={avatarVoice} onValueChange={setAvatarVoice}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* Personal clone voices first */}
                      {myVoiceClones.length === 0 && (
                        <div className="px-3 py-2 border-b bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">{t("lectureBuilder.noCloneVoiceYet") || "아직 개인 클론 음성이 없습니다."}</p>
                          <a href="/ai-studio/voice-clone" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                            <Mic className="w-3 h-3" /> {t("lectureBuilder.createCloneVoice") || "음성 클론 만들기"}
                          </a>
                        </div>
                      )}
                      {myVoiceClones.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider border-b">
                            🎤 {t("lectureBuilder.myCloneVoices") || "내 클론 음성"}
                          </div>
                          {myVoiceClones.map((clone: any) => (
                            <SelectItem key={`clone-${clone.id}`} value={clone.matchedVoiceId || `clone-${clone.id}`}>
                              <span className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  🎤
                                </span>
                                <span>{clone.name}</span>
                                <span className="text-muted-foreground text-xs">({t("lectureBuilder.personalVoice") || "개인 음성"})</span>
                              </span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-t mt-1">
                            🌐 {t("lectureBuilder.presetVoices") || "프리셋 음성"}
                          </div>
                        </>
                      )}
                      {voices.map((v: any) =>
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${v.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                              {v.gender === 'female' ? '♀' : '♂'}
                            </span>
                            <span>{v.name}</span>
                            <span className="text-muted-foreground text-xs">({v.desc})</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">🌐 {(v.languages || []).length}+</span>
                          </span>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <VoicePreviewButton voiceId={avatarVoice} size="default" variant="outline" />
                </div>
                {(() => {
                  const cloneMatch = myVoiceClones.find((c: any) => (c.matchedVoiceId || `clone-${c.id}`) === avatarVoice);
                  if (cloneMatch) {
                    const analysis = cloneMatch.voiceAnalysis ? JSON.parse(cloneMatch.voiceAnalysis) : null;
                    return (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                        🎤 {t("lectureBuilder.personalVoice") || "개인 음성"} · {analysis?.gender || ""} · {cloneMatch.language || "ko"}
                      </p>
                    );
                  }
                  const sel = voices.find((v: any) => v.id === avatarVoice) as any;
                  return sel ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {sel.gender === 'female' ? '👩 여성' : '👨 남성'} · {sel.style} · 지원: 한/영/일/중/스/프/독/포 외 {(sel.languages || []).length}개 언어
                    </p>
                  ) : null;
                })()}
              </div>
              <Button className="w-full" disabled={(!selectedFaceId && !selectedMyAvatarUrl) || !avatarName.trim() || addAvatar.isPending}
                onClick={() => {
                  if (selectedMyAvatarUrl) {
                    addAvatar.mutate({ projectId, customFaceUrl: selectedMyAvatarUrl, name: avatarName.trim(), role: avatarRole as any, ttsVoiceId: avatarVoice, sortOrder: avatars.length });
                  } else {
                    addAvatar.mutate({ projectId, sampleFaceId: selectedFaceId!, name: avatarName.trim(), role: avatarRole as any, ttsVoiceId: avatarVoice, sortOrder: avatars.length });
                  }
                }}>
                {addAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{t("lectureBuilder.jsxText63")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Selected Avatars */}
      {avatars.length === 0 ?
      <Card className="border-dashed border-2 py-16">
          <CardContent className="flex flex-col items-center text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">{t("lectureBuilder.jsxText64")}</h3>
            <p className="text-muted-foreground text-sm">{t("lectureBuilder.jsxText65")}</p>
          </CardContent>
        </Card> :

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {avatars.map((av, i) => {
          const face = faces.find((f) => f.id === av.sampleFaceId);
          const roleInfo = AVATAR_ROLES.find((r: any) => r.value === av.role);
          const isCustomizing = customizingAvatar?.id === av.id;
          return (
            <Card key={av.id} className={`relative group cursor-pointer transition-all ${isCustomizing ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/30"}`}
            onClick={() => { setCustomizingAvatar(av); setEditingAvatar(null); setTimeout(() => { document.getElementById('avatar-customize-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }}>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button className="p-1 rounded-md hover:bg-primary/10 transition-colors" title="설정"
                    onClick={(e) => { e.stopPropagation(); setCustomizingAvatar(av); setEditingAvatar(null); setTimeout(() => { document.getElementById('avatar-customize-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }}>
                    <Settings2 className="w-4 h-4 text-primary" />
                  </button>
                  <button className="p-1 rounded-md hover:bg-destructive/10 transition-colors" title="삭제"
                    onClick={(e) => {e.stopPropagation();deleteAvatar.mutate({ id: av.id });}}>
                    <X className="w-5 h-5 text-destructive hover:text-destructive/80" />
                  </button>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      {av.customFaceUrl ?
                    <img src={av.customFaceUrl} alt={av.name} className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-in-out]" key={av.customFaceUrl} /> :
                    face?.imageUrl ?
                    <img src={face.imageUrl} alt={av.name} className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-in-out]" key={face.imageUrl} /> :

                    <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                    }
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{av.name}</h3>
                      <Badge className={`${roleInfo?.color || ""} text-xs`}>{roleInfo?.label || av.role}</Badge>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> {av.ttsVoiceId}
                        <VoicePreviewButton voiceId={av.ttsVoiceId || ""} size="sm" variant="ghost" className="ml-1 h-6 w-6 p-0" />
                      </p>
                      <p className="text-[11px] text-primary/70 mt-1 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />
                        {isCustomizing ? t("lectureBuilder.jsxText66") : "클릭하여 얼굴/목소리 설정"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>);

        })}
        </div>
      }

      {/* Inline Customize Panel */}
      {avatars.length > 0 && (
        <div id="avatar-customize-panel">
        <AvatarCustomizePanel
          avatar={customizingAvatar}
          faces={faces}
          voices={voices}
          onUpdated={() => { onRefresh(); setCustomizingAvatar(null); }}
          onClose={() => setCustomizingAvatar(null)}
        />
        </div>
      )}

      {/* User Avatar Edit Dialog */}
      <Dialog open={!!editingUserAvatar} onOpenChange={(open) => { if (!open) setEditingUserAvatar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("lectureBuilder.avatar.editTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {editingUserAvatar?.imageUrl && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30">
                  <img src={editingUserAvatar.imageUrl} alt={editUserAvatarName} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("lectureBuilder.avatar.editName")}</Label>
              <Input value={editUserAvatarName} onChange={(e) => setEditUserAvatarName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>{t("lectureBuilder.avatar.editDesc")}</Label>
              <Textarea value={editUserAvatarDesc} onChange={(e) => setEditUserAvatarDesc(e.target.value)} maxLength={500} rows={3} />
            </div>
            <Button className="w-full" disabled={!editUserAvatarName.trim() || updateUserAvatar.isPending}
              onClick={() => {
                updateUserAvatar.mutate({ id: editingUserAvatar.id, name: editUserAvatarName.trim(), description: editUserAvatarDesc.trim() || undefined },
                  { onSuccess: () => setEditingUserAvatar(null) });
              }}>
              {updateUserAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {t("lectureBuilder.avatar.editSave")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Settings Dialog */}
      {editingAvatar &&
      <AvatarSettingsDialog
        open={!!editingAvatar}
        onOpenChange={(open) => {if (!open) setEditingAvatar(null);}}
        avatar={editingAvatar}
        faces={faces}
        voices={voices}
        onUpdated={onRefresh} />

      }
    </div>);

}

// ============ STEP 2: SCRIPTS ============
function Step2Scripts({ projectId, slides, scripts, avatars, onRefresh, onGoToStep4





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
            slideId: 0,
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
      // Save new sections
      for (let i = 0; i < sections.length; i++) {
        await setScriptMut.mutateAsync({
          projectId,
          slideId: 0, // Will be assigned in Step 4
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
function ImprovementHistoryPanel({ projectId, sections, setSections



}: {projectId: number;sections: any[];setSections: (s: any[]) => void;}) {const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [detailGroup, setDetailGroup] = useState<{batchId: string;style: string;count: number;createdAt: Date;sections: any[];} | null>(null);
  const historyQuery = trpc.lectureBuilder.getImprovementHistory.useQuery(
    { projectId },
    { enabled: showHistory }
  );
  const revertMut = trpc.lectureBuilder.revertImprovement.useMutation({
    onSuccess: (data) => {
      const newSections = sections.map((sec) => {
        const reverted = data.sections.find((s: any) => s.sectionId === sec.id);
        return reverted ? { ...sec, text: reverted.originalText } : sec;
      });
      setSections(newSections);
      toast.success(t("lectureBuilder.hardcoded.sectionsReverted", { count: String(data.sections.length) }));
      historyQuery.refetch();
      setDetailGroup(null);
    },
    onError: (e: any) => toast.error(t("lectureBuilder.hardcoded.revertFailed", { error: e.message }))
  });

  const groupedHistory = useMemo(() => {
    if (!historyQuery.data) return [];
    const groups = new Map<string, {batchId: string;style: string;count: number;createdAt: Date;sections: typeof historyQuery.data;}>();
    for (const item of historyQuery.data) {
      const key = item.batchId || `single-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, { batchId: key, style: item.style, count: 0, createdAt: item.createdAt, sections: [] });
      }
      const g = groups.get(key)!;
      g.count++;
      g.sections.push(item);
    }
    return Array.from(groups.values());
  }, [historyQuery.data]);

  const styleLabels: Record<string, string> = { formal: t("lectureBuilder.stringLiteral160"), casual: t("lectureBuilder.stringLiteral161"), educational: t("lectureBuilder.stringLiteral162"), storytelling: t("lectureBuilder.stringLiteral163") };

  return (
    <div className="space-y-3">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        onClick={() => setShowHistory(!showHistory)}>
        
        <History className="w-4 h-4" />
        {t("lectureBuilder.hardcoded.aiImprovementHistory")} {showHistory ? "\u25b2" : "\u25bc"}
      </button>
      {showHistory &&
      <div className="space-y-2">
          {historyQuery.isLoading && <p className="text-sm text-muted-foreground">{t("lectureBuilder.hardcoded.loading")}</p>}
          {groupedHistory.length === 0 && !historyQuery.isLoading &&
        <p className="text-sm text-muted-foreground">{t("lectureBuilder.hardcoded.noImprovementHistory")}</p>
        }
          {groupedHistory.map((group) =>
        <div
          key={group.batchId}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => setDetailGroup(group)}>
          
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{styleLabels[group.style] || group.style}</Badge>
                  <span className="text-sm font-medium">{t("lectureBuilder.hardcoded.sectionsImproved", { count: String(group.count) })}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(group.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={(e) => {e.stopPropagation();setDetailGroup(group);}}>
              
                  <Eye className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.detail")}
                </Button>
                <Button
              variant="outline"
              size="sm"
              className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
              onClick={(e) => {
                e.stopPropagation();
                if (group.batchId.startsWith("single-")) {
                  toast.error(t("lectureBuilder.stringLiteral164"));
                  return;
                }
                revertMut.mutate({ batchId: group.batchId });
              }}
              disabled={revertMut.isPending}>
              
                  <Undo2 className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.revert")}
                </Button>
              </div>
            </div>
        )}
        </div>
      }

      {/* Detail Comparison Modal */}
      {detailGroup &&
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetailGroup(null)}>
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{t("lectureBuilder.hardcoded.aiImprovementDetailComparison")}</h3>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs mr-2">{styleLabels[detailGroup.style] || detailGroup.style}</Badge>
                    {t("lectureBuilder.hardcoded.sectionsImproved", { count: String(detailGroup.count) })} \u00b7 {new Date(detailGroup.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!detailGroup.batchId.startsWith("single-") &&
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                onClick={() => revertMut.mutate({ batchId: detailGroup.batchId })}
                disabled={revertMut.isPending}>
                
                    <Undo2 className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.revert")}
                  </Button>
              }
                <Button variant="ghost" size="sm" onClick={() => setDetailGroup(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 space-y-4">
              {detailGroup.sections.map((item: any, idx: number) => {
              const hasChange = item.originalText !== item.improvedText;
              return (
                <div key={item.id || idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b flex items-center gap-2">
                      <span className="text-sm font-medium">{t("lectureBuilder.hardcoded.section", { idx: String(idx + 1) })}</span>
                      {hasChange ?
                    <Badge className="bg-green-500/10 text-green-500 text-xs">{t("lectureBuilder.hardcoded.improved")}</Badge> :

                    <Badge variant="outline" className="text-xs text-muted-foreground">{t("lectureBuilder.hardcoded.noChange")}</Badge>
                    }
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{t("lectureBuilder.hardcoded.original")}</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{item.originalText || t("lectureBuilder.stringLiteral165")}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">{t("lectureBuilder.hardcoded.improvementResult")}</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.improvedText || t("lectureBuilder.stringLiteral166")}</p>
                      </div>
                    </div>
                  </div>);

            })}
            </div>
          </div>
        </div>
      }
    </div>);

}

// ============ STEP 3: SLIDES ============
function Step3Slides({ projectId, slides, onRefresh



}: {projectId: number;slides: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState("");
  const [extractedTexts, setExtractedTexts] = useState<{pageIndex: number;text: string;}[]>([]);
  const [applyingScripts, setApplyingScripts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteSlide = trpc.lectureBuilder.deleteSlide.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral167"));onRefresh();}
  });
  const reorderSlides = trpc.lectureBuilder.reorderSlides.useMutation({
    onSuccess: () => onRefresh()
  });
  const uploadImageSlide = trpc.lectureBuilder.uploadImageSlide.useMutation();
  const convertFileMut = trpc.lectureBuilder.convertFile.useMutation();
  const applyTextsMut = trpc.lectureBuilder.applyExtractedTextsAsScripts.useMutation();

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const isPptOrPdf = (file: File) => {
    const ext = file.name.toLowerCase();
    return ext.endsWith(".pptx") || ext.endsWith(".ppt") || ext.endsWith(".pdf");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let currentOrder = slides.length;
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(t("lectureBuilder.hardcoded.fileSizeExceeded", { name: file.name }));
          continue;
        }

        const base64 = await readFileAsBase64(file);

        if (isPptOrPdf(file)) {
          // PPT/PDF → 서버에서 이미지로 변환
          setConverting(true);
          setConversionStatus(t("lectureBuilder.hardcoded.converting", { name: file.name }));
          try {
            const result = await convertFileMut.mutateAsync({
              projectId,
              fileData: base64,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream"
            });
            // Store extracted texts for script draft creation
            if (result.extractedTexts && result.extractedTexts.length > 0) {
              setExtractedTexts(result.extractedTexts);
            }
            toast.success(t("lectureBuilder.hardcoded.slidesConverted", { name: file.name, count: String(result.count) }) + (result.extractedTexts?.length ? t("lectureBuilder.stringLiteral168") : ""));
          } catch (err: any) {
            toast.error(t("lectureBuilder.hardcoded.conversionFailed", { name: file.name, error: err.message }));
          } finally {
            setConverting(false);
            setConversionStatus("");
          }
        } else {
          // 이미지 파일 직접 업로드
          await uploadImageSlide.mutateAsync({
            projectId,
            fileData: base64,
            fileName: file.name,
            mimeType: file.type || "image/png",
            slideOrder: currentOrder++
          });
          toast.success(t("lectureBuilder.hardcoded.uploadComplete", { name: file.name }));
        }
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral169"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slides.length) return;
    const newOrder = [...slides];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    reorderSlides.mutate({ projectId, slideIds: newOrder.map((s: any) => s.id) });
  };

  const isProcessing = uploading || converting;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText170")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText171")}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept=".pptx,.ppt,.pdf,.png,.jpg,.jpeg,.webp" className="hidden"
          onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {converting ? t("lectureBuilder.stringLiteral172") : t("lectureBuilder.stringLiteral173")}
          </Button>
        </div>
      </div>

      {/* Conversion Status */}
      {converting &&
      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <div>
            <p className="text-sm font-medium">{conversionStatus}</p>
            <p className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText174")}</p>
          </div>
        </div>
      }

      {/* Drop Zone */}
      {slides.length === 0 && !converting &&
      <div className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => {e.preventDefault();e.currentTarget.classList.add("border-primary");}}
      onDragLeave={(e) => {e.preventDefault();e.currentTarget.classList.remove("border-primary");}}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("border-primary");
        if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
          const dt = new DataTransfer();
          for (const f of Array.from(e.dataTransfer.files)) dt.items.add(f);
          fileInputRef.current.files = dt.files;
          fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }}>
        
          <Image className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t("lectureBuilder.jsxText175")}</h3>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText176")}</p>
          <p className="text-xs text-muted-foreground mt-2">{t("lectureBuilder.jsxText177")}</p>
        </div>
      }

      {/* Extracted Text → Script Draft Banner */}
      {extractedTexts.length > 0 && slides.length > 0 &&
      <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />{t("lectureBuilder.jsxText178")}
                {extractedTexts.filter((t) => t.text && !t.text.startsWith("[Page")).length}{t("lectureBuilder.jsxText179")}
              </CardTitle>
                <CardDescription className="text-xs">{t("lectureBuilder.jsxText180")}

              </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 border-green-500/30 hover:bg-green-500/10"
                disabled={applyingScripts}
                onClick={async () => {
                  setApplyingScripts(true);
                  try {
                    const pairs = extractedTexts.
                    filter((t) => t.text && !t.text.startsWith("[Page")).
                    map((t, idx) => ({
                      slideId: slides[t.pageIndex]?.id || slides[idx]?.id,
                      text: t.text
                    })).
                    filter((p) => p.slideId);
                    const result = await applyTextsMut.mutateAsync({
                      projectId,
                      slideTextPairs: pairs
                    });
                    toast.success(t("lectureBuilder.hardcoded.scriptDraftsCreated", { count: String(result.created) }));
                    setExtractedTexts([]);
                    onRefresh();
                  } catch (err: any) {
                    toast.error(err.message || t("lectureBuilder.stringLiteral181"));
                  } finally {
                    setApplyingScripts(false);
                  }
                }}>
                
                  {applyingScripts ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}{t("lectureBuilder.jsxText182")}

              </Button>
                <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setExtractedTexts([])}>
                
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
               {extractedTexts.slice(0, 10).map((txt, i) =>
              <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="shrink-0 text-[10px]">{txt.pageIndex + 1}</Badge>
                    <span className="text-muted-foreground line-clamp-2">{txt.text || t("lectureBuilder.stringLiteral183")}</span>
                  </div>
              )}
                {extractedTexts.length > 10 &&
              <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText184")}{extractedTexts.length - 10}{t("lectureBuilder.jsxText185")}</p>
              }
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      }

      {/* Slide Grid */}
      {slides.length > 0 &&
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {slides.map((slide: any, idx: number) =>
        <div key={slide.id} className="group relative">
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                <img src={slide.imageUrl} alt={t("lectureBuilder.hardcoded.slideAlt", { idx: String(idx + 1) })} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-1 left-1">
                <Badge className="text-xs bg-black/60 text-white">{idx + 1}</Badge>
              </div>
              {slide.originalFileName &&
          <div className="absolute bottom-1 left-1">
                  <Badge variant="outline" className="text-[9px] bg-black/40 text-white border-white/20 max-w-[100px] truncate">
                    {slide.originalFileName}
                  </Badge>
                </div>
          }
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 &&
            <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
            onClick={() => moveSlide(idx, idx - 1)}>&#8592;</button>
            }
                {idx < slides.length - 1 &&
            <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
            onClick={() => moveSlide(idx, idx + 1)}>&#8594;</button>
            }
                <button className="w-6 h-6 rounded bg-red-500/80 text-white flex items-center justify-center"
            onClick={() => deleteSlide.mutate({ id: slide.id })}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
        )}
          {/* Add more button */}
          <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      }
    </div>);

}

// ============ STEP 4: MATCHING EDITOR ============
function Step4Matching({ projectId, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh









}: {projectId: number;slides: any[];scripts: any[];avatars: any[];annotations: any[];avatarOverrides: any[];insertContent: any[];transitions: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const ANNOTATION_TOOLS = getANNOTATION_TOOLS(t);
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [annotationTool, setAnnotationTool] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#FF0000");
  const [penThickness, setPenThickness] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number;y: number;}[]>([]);
  // Undo/Redo stacks (store annotation IDs)
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  // Script assignments per slide
  const [slideScriptMap, setSlideScriptMap] = useState<Record<number, {text: string;avatarId?: number;}>>({});

  // ── Interpreter state ──
  const [interpreterEnabled, setInterpreterEnabled] = useState(false);
  const [interpreterLanguage, setInterpreterLanguage] = useState("en");
  const [interpreterVoiceId, setInterpreterVoiceId] = useState("");
  const [interpreterTexts, setInterpreterTexts] = useState<Record<number, string>>({});
  const [showInterpreterPanel, setShowInterpreterPanel] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    const map: Record<number, {text: string;avatarId?: number;}> = {};
    const iTexts: Record<number, string> = {};
    scripts.forEach((s: any) => {
      if (s.slideId && s.slideId > 0) {
        map[s.slideId] = { text: s.scriptText, avatarId: s.avatarId || undefined };
        if (s.interpreterText) iTexts[s.slideId] = s.interpreterText;
      }
    });
    setSlideScriptMap(map);
    setInterpreterTexts(iTexts);
  }, [scripts]);

  // Load interpreter settings from project (passed via parent)
  const projectQuery = trpc.lectureBuilder.getProject.useQuery({ id: projectId });
  useEffect(() => {
    if (projectQuery.data) {
      setInterpreterEnabled(projectQuery.data.interpreterEnabled || false);
      setInterpreterLanguage(projectQuery.data.interpreterLanguage || "en");
      setInterpreterVoiceId(projectQuery.data.interpreterVoiceId || "");
    }
  }, [projectQuery.data]);

  const unassignedScripts = scripts.filter((s: any) => !s.slideId || s.slideId === 0);
  const currentSlide = slides[selectedSlideIdx];
  const currentScript = currentSlide ? slideScriptMap[currentSlide.id] : null;
  const currentAnnotations = currentSlide ? annotations.filter((a: any) => a.slideId === currentSlide.id) : [];

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const saveDrawingMut = trpc.lectureBuilder.saveCanvasDrawing.useMutation();
  const deleteAnnotationMut = trpc.lectureBuilder.deleteAnnotation.useMutation();

  // ── Auto-save / Manual save ──
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveScriptsMut = trpc.lectureBuilder.saveSlideScripts.useMutation({
    onSuccess: (data) => {
      setLastSavedAt(data.savedAt);
      setHasUnsavedChanges(false);
      setIsSaving(false);
    },
    onError: () => setIsSaving(false),
  });

  const doSave = useCallback(() => {
    if (!slides.length) return;
    const scriptsToSave = slides
      .filter((s: any) => slideScriptMap[s.id])
      .map((s: any) => ({
        slideId: s.id,
        scriptText: slideScriptMap[s.id]?.text || "",
      }));
    if (scriptsToSave.length === 0) return;
    setIsSaving(true);
    saveScriptsMut.mutate({ projectId, scripts: scriptsToSave });
  }, [slides, slideScriptMap, projectId]);

  // Auto-save every 30 seconds when there are unsaved changes
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => {
        doSave();
      }, 30000);
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [hasUnsavedChanges, doSave]);

  // Track changes
  const handleScriptChange = (slideId: number, text: string) => {
    setSlideScriptMap((prev) => ({ ...prev, [slideId]: { ...prev[slideId], text } }));
    setHasUnsavedChanges(true);
  };

  // Interpreter mutations
  const updateInterpreterSettingsMut = trpc.lectureBuilder.updateInterpreterSettings.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral186"));projectQuery.refetch();},
    onError: (e: any) => toast.error(e.message)
  });
  const autoTranslateSlidesMut = trpc.lectureBuilder.autoTranslateSlides.useMutation({
    onSuccess: (data) => {
      toast.success(t("lectureBuilder.hardcoded.slidesTranslated", { count: String(data.count) }));
      const newTexts: Record<number, string> = {};
      data.translations.forEach((t: any) => {newTexts[t.slideId] = t.text;});
      setInterpreterTexts((prev) => ({ ...prev, ...newTexts }));
      onRefresh();
    },
    onError: (e: any) => toast.error(e.message)
  });
  const updateSlideInterpreterTextMut = trpc.lectureBuilder.updateSlideInterpreterText.useMutation({
    onError: (e: any) => toast.error(e.message)
  });

  const voicesQuery = trpc.tts.voices.useQuery(undefined, { enabled: !!projectId });
  const generateAllTtsMut = trpc.lectureBuilder.generateAllInterpreterTts.useMutation({
    onSuccess: (data) => toast.success(t("lectureBuilder.hardcoded.interpreterTtsGenerated", { generated: String(data.generated), total: String(data.total) })),
    onError: (e: any) => toast.error(e.message)
  });
  const exportSrtMut = trpc.lectureBuilder.exportInterpreterSrt.useMutation({
    onSuccess: (data) => {
      window.open(data.srtUrl, "_blank");
      toast.success(t("lectureBuilder.hardcoded.srtDownload", { count: String(data.subtitleCount) }));
    },
    onError: (e: any) => toast.error(e.message)
  });

  const INTERPRETER_LANGUAGES = [
  { code: "ko", name: t("lectureBuilder.stringLiteral187"), flag: "🇰🇷" }, { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" }, { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "es", name: "Español", flag: "🇪🇸" }, { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" }, { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" }, { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" }, { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" }, { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" }, { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" }, { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" }, { code: "ms", name: "Melayu", flag: "🇲🇾" }];


  // Avatar overlay per-slide
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  const [avatarSize, setAvatarSize] = useState(25); // percentage
  const [avatarPosX, setAvatarPosX] = useState(75); // percentage from left
  const [avatarPosY, setAvatarPosY] = useState(75); // percentage from top
  const [avatarShape, setAvatarShape] = useState<"circle" | "rounded" | "rectangle">("circle");
  const [avatarOpacity, setAvatarOpacity] = useState(100);
  const saveAvatarOverrideMut = trpc.lectureBuilder.upsertAvatarOverride.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral188"));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });

  // Load avatar override for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const override = avatarOverrides.find((o: any) => o.slideId === currentSlide.id);
    if (override) {
      setAvatarSize(override.avatarSizePercent || 25);
      setAvatarPosX(override.offsetX || 75);
      setAvatarPosY(override.offsetY || 75);
      setAvatarShape(override.avatarShape || "circle");
      setAvatarOpacity(override.avatarOpacity ?? 100);
    } else {
      setAvatarSize(25);setAvatarPosX(75);setAvatarPosY(75);setAvatarShape("circle");setAvatarOpacity(100);
    }
  }, [currentSlide?.id, avatarOverrides]);

  const saveAvatarOverride = () => {
    if (!currentSlide) return;
    saveAvatarOverrideMut.mutate({
      projectId,
      slideId: currentSlide.id,
      avatarSizePercent: avatarSize,
      offsetX: avatarPosX,
      offsetY: avatarPosY,
      avatarShape: avatarShape,
      avatarOpacity: avatarOpacity
    });
  };

  // Insert content between slides
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  const [insertType, setInsertType] = useState<"whiteboard" | "video" | "image" | "design">("whiteboard");
  const [insertAfterSlideId, setInsertAfterSlideId] = useState<number | null>(null);
  const saveInsertMut = trpc.lectureBuilder.createInsertContent.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral189"));onRefresh();setShowInsertPanel(false);},
    onError: (e: any) => toast.error(e.message)
  });
  const deleteInsertMut = trpc.lectureBuilder.deleteInsertContent.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral190"));onRefresh();}
  });

  // Slide transitions
  const [showTransitionPanel, setShowTransitionPanel] = useState(false);
  const [transitionType, setTransitionType] = useState<string>("none");
  const [transitionDuration, setTransitionDuration] = useState(500);
  const [transitionEasing, setTransitionEasing] = useState<string>("ease_in_out");

  const upsertTransitionMut = trpc.lectureBuilder.upsertSlideTransition.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral191"));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });
  const setAllTransitionsMut = trpc.lectureBuilder.setAllTransitions.useMutation({
    onSuccess: (data) => {toast.success(t("lectureBuilder.hardcoded.transitionsApplied", { count: String(data.count) }));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });

  // Load transition for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const tr = transitions.find((t: any) => t.slideId === currentSlide.id);
    if (tr) {
      setTransitionType(tr.transitionType || "none");
      setTransitionDuration(tr.durationMs || 500);
      setTransitionEasing(tr.easing || "ease_in_out");
    } else {
      setTransitionType("none");setTransitionDuration(500);setTransitionEasing("ease_in_out");
    }
  }, [currentSlide?.id, transitions]);

  // Whiteboard AI generation
  const [wbPrompt, setWbPrompt] = useState("");
  const [wbGenerating, setWbGenerating] = useState(false);
  const generateWhiteboardMut = trpc.lectureBuilder.generateWhiteboardContent.useMutation({
    onSuccess: (data) => {
      setWbGenerating(false);
      toast.success(t("lectureBuilder.stringLiteral192"));
    },
    onError: (e: any) => {setWbGenerating(false);toast.error(e.message);}
  });

  const assignScript = async (slideId: number, text: string, avatarId?: number) => {
    setSlideScriptMap((prev) => ({ ...prev, [slideId]: { text, avatarId } }));
    try {
      await setScriptMut.mutateAsync({ projectId, slideId, scriptText: text, avatarId, sortOrder: 0 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // --- Canvas drawing logic ---
  const getRelativePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * 100,
      y: (e.clientY - rect.top) / rect.height * 100
    };
  };

  const getTouchRelativePos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) / rect.width * 100,
      y: (touch.clientY - rect.top) / rect.height * 100
    };
  };

  // Draw existing annotations + current path on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // Draw saved annotations
    currentAnnotations.forEach((ann: any) => {
      const pd = ann.pathData as any;
      if (!pd) return;
      const color = ann.penColor || "#FF0000";
      const thickness = ann.penThickness || 3;
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.annotationType === "freehand" && pd.points) {
        ctx.beginPath();
        pd.points.forEach((pt: any, i: number) => {
          const px = pt.x / 100 * w;
          const py = pt.y / 100 * h;
          if (i === 0) ctx.moveTo(px, py);else
          ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (ann.annotationType === "circle") {
        const cx = pd.x / 100 * w;
        const cy = pd.y / 100 * h;
        const r = (pd.width || 8) / 100 * Math.min(w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotationType === "arrow") {
        const sx = pd.x / 100 * w;
        const sy = pd.y / 100 * h;
        const ex = (pd.endX ?? pd.x + 8) / 100 * w;
        const ey = (pd.endY ?? pd.y - 8) / 100 * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (ann.annotationType === "check") {
        const cx = pd.x / 100 * w;
        const cy = pd.y / 100 * h;
        ctx.fillStyle = color;
        ctx.font = `${thickness * 6}px sans-serif`;
        ctx.fillText("\u2713", cx - thickness * 2, cy + thickness * 2);
      } else if (ann.annotationType === "underline") {
        const sx = pd.x / 100 * w;
        const sy = pd.y / 100 * h;
        const lineW = (pd.width || 15) / 100 * w;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + lineW, sy);
        ctx.stroke();
      }
    });

    // Draw current path (live drawing)
    if (currentPath.length > 1) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => {
        const px = pt.x / 100 * w;
        const py = pt.y / 100 * h;
        if (i === 0) ctx.moveTo(px, py);else
        ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [currentAnnotations, currentPath, penColor, penThickness]);

  useEffect(() => {renderCanvas();}, [renderCanvas]);

  // --- Touch handlers for mobile/tablet ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    // Eraser via touch
    if (annotationTool === "eraser") {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;
      const rect = canvas.getBoundingClientRect();
      const pos = {
        x: (touch.clientX - rect.left) / rect.width * 100,
        y: (touch.clientY - rect.top) / rect.height * 100
      };
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack((prev) => prev.filter((id) => id !== target.id));
            onRefresh();
            toast.success(t("lectureBuilder.stringLiteral193"));
          }
        });
      }
      return;
    }
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    if (annotationTool === "freehand" || annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    setCurrentPath((prev) => [...prev, pos]);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSlide) return;
    e.preventDefault();
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
    setCurrentPath([]);
  };

  // Find nearest annotation to a point (for eraser)
  const findNearestAnnotation = (pos: {x: number;y: number;}, threshold = 5) => {
    let nearest: any = null;
    let minDist = threshold;
    for (const ann of currentAnnotations) {
      const pd = ann.pathData as any;
      if (!pd) continue;
      let dist = Infinity;
      if (pd.points && Array.isArray(pd.points)) {
        for (const pt of pd.points) {
          const d = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
          if (d < dist) dist = d;
        }
      } else if (pd.x !== undefined && pd.y !== undefined) {
        dist = Math.sqrt((pd.x - pos.x) ** 2 + (pd.y - pos.y) ** 2);
      }
      if (dist < minDist) {
        minDist = dist;
        nearest = ann;
      }
    }
    return nearest;
  };

  // Mouse handlers for freehand drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    const pos = getRelativePos(e);

    // Eraser tool: delete nearest annotation
    if (annotationTool === "eraser") {
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack((prev) => prev.filter((id) => id !== target.id));
            onRefresh();
            toast.success(t("lectureBuilder.stringLiteral194"));
          }
        });
      }
      return;
    }

    if (annotationTool === "freehand") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      // Single-click tools: circle, check, underline
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getRelativePos(e);
    setCurrentPath((prev) => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentSlide) return;
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
    setCurrentPath([]);
  };

  // Undo: delete last annotation
  const handleUndo = () => {
    if (undoStack.length === 0 && currentAnnotations.length === 0) return;
    const lastId = undoStack.length > 0 ? undoStack[undoStack.length - 1] : currentAnnotations[currentAnnotations.length - 1]?.id;
    if (!lastId) return;
    deleteAnnotationMut.mutate({ id: lastId }, {
      onSuccess: () => {
        setUndoStack((prev) => prev.slice(0, -1));
        setRedoStack((prev) => [...prev, lastId]);
        onRefresh();
      }
    });
  };

  // Clear all annotations on current slide
  const handleClearAll = () => {
    if (currentAnnotations.length === 0) return;
    currentAnnotations.forEach((ann: any) => {
      deleteAnnotationMut.mutate({ id: ann.id });
    });
    setUndoStack([]);
    setRedoStack([]);
    setTimeout(() => onRefresh(), 500);
    toast.success(t("lectureBuilder.stringLiteral195"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText196")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText197")}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              마지막 저장: {new Date(lastSavedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              저장되지 않은 변경사항
            </Badge>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={doSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            저장하기
          </Button>
          <PronunciationGuideButton projectId={projectId} />
          <BatchCloneVoiceButton projectId={projectId} slides={slides} slideScriptMap={slideScriptMap} onComplete={() => projectQuery.refetch()} />
          <VersionHistoryButton projectId={projectId} onRestore={() => projectQuery.refetch()} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 overflow-hidden" style={{ minHeight: "60vh" }}>
        {/* Left: Slide Thumbnails */}
        <div className="col-span-2">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-2">
              {slides.map((slide: any, idx: number) => {
                const hasScript = !!slideScriptMap[slide.id];
                const annCount = annotations.filter((a: any) => a.slideId === slide.id).length;
                return (
                  <button key={slide.id}
                  className={`w-full rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedSlideIdx === idx ? "border-primary ring-2 ring-primary/30" : hasScript ? "border-green-500/50" : "border-muted"}`
                  }
                  onClick={() => {if (hasUnsavedChanges) doSave(); setSelectedSlideIdx(idx);setUndoStack([]);setRedoStack([]);}}>
                    
                    <div className="aspect-video">
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute top-0.5 left-0.5">
                      <Badge className="text-[10px] px-1 py-0 bg-black/60 text-white">{idx + 1}</Badge>
                    </div>
                    {hasScript &&
                    <div className="absolute bottom-0.5 right-0.5">
                        <Check className="w-3 h-3 text-green-400 bg-green-900/60 rounded-full p-0.5" />
                      </div>
                    }
                    {annCount > 0 &&
                    <div className="absolute bottom-0.5 left-0.5">
                        <Badge className="text-[9px] px-1 py-0 bg-orange-500/80 text-white">{annCount}</Badge>
                      </div>
                    }
                  </button>);

              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Slide Preview + Canvas Drawing */}
        <div className="col-span-6 min-w-0 overflow-hidden">
          {currentSlide ?
          <div className="space-y-3">
              <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden">
                <img src={currentSlide.imageUrl} alt={t("lectureBuilder.stringLiteral198")} className="w-full aspect-video object-contain" />
                {/* Avatar overlay preview */}
                {showAvatarPanel && avatars.length > 0 &&
              <div
                className={`absolute pointer-events-none border-2 border-cyan-400/60 ${
                avatarShape === "circle" ? "rounded-full" : avatarShape === "rounded" ? "rounded-xl" : ""}`
                }
                style={{
                  width: `${avatarSize}%`,
                  height: `${avatarSize * 0.75}%`,
                  left: `${avatarPosX - avatarSize / 2}%`,
                  top: `${avatarPosY - avatarSize * 0.75 / 2}%`,
                  opacity: avatarOpacity / 100,
                  background: "rgba(0,180,255,0.15)",
                  backdropFilter: "blur(1px)"
                }}>
                
                    <div className="flex items-center justify-center h-full text-cyan-300 text-xs font-medium">
                      <Users className="w-4 h-4 mr-1" />{t("lectureBuilder.jsxText199")}
                </div>
                  </div>
              }
                {/* Real HTML5 Canvas overlay for drawing */}
                <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${annotationTool ? "cursor-crosshair" : "cursor-default"}`}
                style={{ touchAction: annotationTool ? "none" : "auto" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd} />
              
              </div>

              {/* Annotation Toolbar */}
              <div className="flex items-center gap-2 p-2 bg-card rounded-lg border flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText200")}</span>
                {ANNOTATION_TOOLS.map((tool: any) =>
              <button key={tool.type}
              className={`p-2 rounded-lg transition-colors ${annotationTool === tool.type ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setAnnotationTool(annotationTool === tool.type ? null : tool.type)}
              title={tool.label}>
                
                    <tool.icon className="w-4 h-4" />
                  </button>
              )}
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText201")}</span>
                {PEN_COLORS.map((color) =>
              <button key={color}
              className={`w-5 h-5 rounded-full border-2 transition-all ${penColor === color ? "border-foreground scale-125" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => setPenColor(color)} />

              )}
                <div className="relative">
                  <button
                  className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${!PEN_COLORS.includes(penColor) ? "border-foreground scale-125" : "border-muted-foreground/30"}`}
                  style={{ background: !PEN_COLORS.includes(penColor) ? penColor : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                  title={t("lectureBuilder.stringLiteral202")}
                  onClick={() => {
                    const input = document.getElementById("custom-color-picker") as HTMLInputElement;
                    input?.click();
                  }} />
                
                  <input
                  id="custom-color-picker"
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText203")}</span>
                <div className="w-20">
                  <Slider value={[penThickness]} min={1} max={10} step={1} onValueChange={(v) => setPenThickness(v[0])} />
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                {/* Undo / Clear */}
                <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0 && currentAnnotations.length === 0} className="text-xs gap-1" title={t("lectureBuilder.stringLiteral204")}>
                  ↩ Undo
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={currentAnnotations.length === 0} className="text-xs gap-1 text-red-400" title={t("lectureBuilder.stringLiteral205")}>
                  <Trash2 className="w-3 h-3" />{t("lectureBuilder.jsxText206")}
              </Button>
                {annotationTool &&
              <Button variant="ghost" size="sm" onClick={() => setAnnotationTool(null)} className="ml-auto text-xs">
                    <MousePointer className="w-3 h-3 mr-1" />{t("lectureBuilder.jsxText207")}
              </Button>
              }
              </div>

              {/* Extra tools: Avatar overlay + Insert content */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                variant={showAvatarPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowAvatarPanel(!showAvatarPanel);setShowInsertPanel(false);}}>
                
                  <Users className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText208")}
              </Button>
                <Button
                variant={showInsertPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowInsertPanel(!showInsertPanel);setShowAvatarPanel(false);setShowTransitionPanel(false);setInsertAfterSlideId(currentSlide?.id || null);}}>
                
                  <Plus className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText209")}
              </Button>
                <Button
                variant={showTransitionPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowTransitionPanel(!showTransitionPanel);setShowAvatarPanel(false);setShowInsertPanel(false);}}>
                
                  <Sparkles className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText210")}
              </Button>
                {/* Show insert indicators */}
                {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 &&
              <Badge className="bg-purple-500/20 text-purple-400 text-xs">{t("lectureBuilder.jsxText211")}
                {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length}{t("lectureBuilder.jsxText212")}
              </Badge>
              }
                {transitionType !== "none" &&
              <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                    {transitionType.replace("_", " ")}
                  </Badge>
              }
              </div>

              {/* Avatar Overlay Panel */}
              {showAvatarPanel &&
            <Card className="mt-2 border-cyan-500/30 bg-cyan-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-500" />{t("lectureBuilder.jsxText213")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText214")}
                </CardTitle>
                    <CardDescription className="text-xs">{t("lectureBuilder.jsxText215")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText216")}{avatarSize}%)</Label>
                      <Slider value={[avatarSize]} min={10} max={60} step={1} onValueChange={(v) => setAvatarSize(v[0])} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText217")}{avatarPosX}%)</Label>
                        <Slider value={[avatarPosX]} min={10} max={90} step={1} onValueChange={(v) => setAvatarPosX(v[0])} />
                      </div>
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText218")}{avatarPosY}%)</Label>
                        <Slider value={[avatarPosY]} min={10} max={90} step={1} onValueChange={(v) => setAvatarPosY(v[0])} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText219")}</Label>
                        <Select value={avatarShape} onValueChange={(v: any) => setAvatarShape(v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">{t("lectureBuilder.jsxText220")}</SelectItem>
                            <SelectItem value="rounded">{t("lectureBuilder.jsxText221")}</SelectItem>
                            <SelectItem value="rectangle">{t("lectureBuilder.jsxText222")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText223")}{avatarOpacity}%)</Label>
                        <Slider value={[avatarOpacity]} min={20} max={100} step={5} onValueChange={(v) => setAvatarOpacity(v[0])} />
                      </div>
                    </div>
                    <Button size="sm" className="w-full gap-1" onClick={saveAvatarOverride} disabled={saveAvatarOverrideMut.isPending}>
                      {saveAvatarOverrideMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{t("lectureBuilder.jsxText224")}

                </Button>
                  </CardContent>
                </Card>
            }

              {/* Insert Content Panel */}
              {showInsertPanel &&
            <Card className="mt-2 border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-500" />{t("lectureBuilder.jsxText225")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText226")}
                </CardTitle>
                    <CardDescription className="text-xs">{t("lectureBuilder.jsxText227")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      {(["whiteboard", "video", "image", "design"] as const).map((iType) =>
                  <button key={iType}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  insertType === iType ? "bg-purple-500 text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`
                  }
                  onClick={() => setInsertType(iType)}>
                    
                          {iType === "whiteboard" ? t("lectureBuilder.stringLiteral228") : iType === "video" ? t("lectureBuilder.stringLiteral229") : iType === "image" ? t("lectureBuilder.stringLiteral230") : t("lectureBuilder.stringLiteral231")}
                        </button>
                  )}
                    </div>

                    {insertType === "whiteboard" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText232")}</Label>
                        <Textarea
                    value={wbPrompt}
                    onChange={(e) => setWbPrompt(e.target.value)}
                    placeholder={t("lectureBuilder.stringLiteral233")}
                    rows={2}
                    className="text-xs" />
                  
                        <div className="flex gap-2">
                          <Button
                      size="sm"
                      className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        if (!wbPrompt.trim() || !currentSlide) return;
                        setWbGenerating(true);
                        generateWhiteboardMut.mutate({
                          prompt: wbPrompt,
                          contentType: "text"
                        });
                      }}
                      disabled={wbGenerating || !wbPrompt.trim()}>
                      
                            {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText234")}

                    </Button>
                          <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        if (!currentSlide) return;
                        saveInsertMut.mutate({
                          projectId,
                          afterSlideId: currentSlide.id,
                          contentType: "whiteboard",
                          title: t("lectureBuilder.stringLiteral235"),
                          drawingData: { elements: [], background: "#ffffff" }
                        });
                      }}>
                      
                            <Pencil className="w-3 h-3" />{t("lectureBuilder.jsxText236")}
                    </Button>
                        </div>
                      </div>
                }

                    {insertType === "video" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText237")}</Label>
                        <Input
                    placeholder={t("lectureBuilder.stringLiteral238")}
                    className="text-xs h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && currentSlide) {
                        const url = (e.target as HTMLInputElement).value;
                        if (url.trim()) {
                          saveInsertMut.mutate({
                            projectId,
                            afterSlideId: currentSlide.id,
                            contentType: "video",
                            title: t("lectureBuilder.stringLiteral239"),
                            contentUrl: url
                          });
                        }
                      }
                    }} />
                  
                        <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText240")}</p>
                      </div>
                }

                    {insertType === "image" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText241")}</Label>
                        <Input
                    placeholder={t("lectureBuilder.stringLiteral242")}
                    className="text-xs h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && currentSlide) {
                        const url = (e.target as HTMLInputElement).value;
                        if (url.trim()) {
                          saveInsertMut.mutate({
                            projectId,
                            afterSlideId: currentSlide.id,
                            contentType: "image",
                            title: t("lectureBuilder.stringLiteral243"),
                            contentUrl: url
                          });
                        }
                      }
                    }} />
                  
                        <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText244")}</p>
                      </div>
                }

                    {insertType === "design" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText245")}</Label>
                        <Textarea
                    value={wbPrompt}
                    onChange={(e) => setWbPrompt(e.target.value)}
                    placeholder={t("lectureBuilder.stringLiteral246")}
                    rows={2}
                    className="text-xs" />
                  
                        <Button
                    size="sm"
                    className="w-full gap-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      if (!wbPrompt.trim() || !currentSlide) return;
                      setWbGenerating(true);
                      generateWhiteboardMut.mutate({
                        prompt: wbPrompt,
                        contentType: "diagram"
                      });
                    }}
                    disabled={wbGenerating || !wbPrompt.trim()}>
                    
                          {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText247")}

                  </Button>
                      </div>
                }

                    {/* Existing insert content for this slide */}
                    {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 &&
                <div className="space-y-1 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText248")}</span>
                        {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).map((ic: any) =>
                  <div key={ic.id} className="flex items-center justify-between p-1.5 rounded bg-muted/50 text-xs">
                            <span className="flex items-center gap-1">
                              {ic.contentType === "whiteboard" ? "📝" : ic.contentType === "video" ? "🎬" : ic.contentType === "image" ? "🖼️" : "🎨"}
                              {ic.title || ic.contentType}
                            </span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive"
                    onClick={() => deleteInsertMut.mutate({ id: ic.id })}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                  )}
                      </div>
                }
                  </CardContent>
                </Card>
            }

              {/* Transition Effect Panel */}
              {showTransitionPanel &&
            <Card className="mt-2 border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />{t("lectureBuilder.jsxText249")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText250")}
                </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText251")}</Label>
                      <Select value={transitionType} onValueChange={setTransitionType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("lectureBuilder.jsxText252")}</SelectItem>
                          <SelectItem value="fade">{t("lectureBuilder.jsxText253")}</SelectItem>
                          <SelectItem value="slide_left">{t("lectureBuilder.jsxText254")}</SelectItem>
                          <SelectItem value="slide_right">{t("lectureBuilder.jsxText255")}</SelectItem>
                          <SelectItem value="slide_up">{t("lectureBuilder.jsxText256")}</SelectItem>
                          <SelectItem value="zoom_in">{t("lectureBuilder.jsxText257")}</SelectItem>
                          <SelectItem value="zoom_out">{t("lectureBuilder.jsxText258")}</SelectItem>
                          <SelectItem value="wipe_left">{t("lectureBuilder.jsxText259")}</SelectItem>
                          <SelectItem value="wipe_right">{t("lectureBuilder.jsxText260")}</SelectItem>
                          <SelectItem value="dissolve">{t("lectureBuilder.jsxText261")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText262")}{transitionDuration}ms</Label>
                      <Slider
                    value={[transitionDuration]}
                    onValueChange={([v]) => setTransitionDuration(v)}
                    min={100} max={3000} step={100}
                    className="mt-1" />
                  
                    </div>
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText263")}</Label>
                      <Select value={transitionEasing} onValueChange={setTransitionEasing}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">{t("lectureBuilder.jsxText264")}</SelectItem>
                          <SelectItem value="ease_in">{t("lectureBuilder.jsxText265")}</SelectItem>
                          <SelectItem value="ease_out">{t("lectureBuilder.jsxText266")}</SelectItem>
                          <SelectItem value="ease_in_out">{t("lectureBuilder.jsxText267")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1"
                  disabled={upsertTransitionMut.isPending}
                  onClick={() => {
                    if (!currentSlide) return;
                    upsertTransitionMut.mutate({
                      projectId,
                      slideId: currentSlide.id,
                      transitionType: transitionType as any,
                      durationMs: transitionDuration,
                      easing: transitionEasing as any
                    });
                  }}>
                        {upsertTransitionMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{t("lectureBuilder.jsxText268")}

                  </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1"
                  disabled={setAllTransitionsMut.isPending}
                  onClick={() => {
                    setAllTransitionsMut.mutate({
                      projectId,
                      transitionType: transitionType as any,
                      durationMs: transitionDuration,
                      easing: transitionEasing as any
                    });
                  }}>
                        {setAllTransitionsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText269")}

                  </Button>
                    </div>
                    {/* Transition preview hint */}
                    {transitionType !== "none" &&
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{t("lectureBuilder.jsxText270")}
                  <span className="font-semibold text-amber-400">{transitionType.replace("_", " ")}</span>{t("lectureBuilder.jsxText271")}{transitionDuration}{t("lectureBuilder.jsxText272")}

                </div>
                }
                  </CardContent>
                </Card>
            }
            </div> :

          <div className="flex items-center justify-center h-full text-muted-foreground">{t("lectureBuilder.jsxText273")}

          </div>
          }
        </div>

        {/* Right: Script Assignment */}
        <div className="col-span-4">
          <div className="space-y-4">
            {/* Current slide script */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText274")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText275")}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSlide ?
                <div className="space-y-3">
                    <Textarea
                    value={currentScript?.text || ""}
                    onChange={(e) => {
                      if (currentSlide) {
                        handleScriptChange(currentSlide.id, e.target.value);
                      }
                    }}
                    onBlur={() => {
                      if (currentSlide && slideScriptMap[currentSlide.id]?.text) {
                        assignScript(currentSlide.id, slideScriptMap[currentSlide.id].text, slideScriptMap[currentSlide.id].avatarId);
                      }
                    }}
                    placeholder={t("lectureBuilder.stringLiteral276")}
                    rows={5} />
                    <PronunciationHighlight text={currentScript?.text || ""} projectId={projectId} />
                  
                    {avatars.length > 0 &&
                  <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText277")}</Label>
                        <Select
                      value={currentScript?.avatarId?.toString() || "default"}
                      onValueChange={(v) => {
                        if (currentSlide) {
                          const avatarId = v === "default" ? undefined : parseInt(v);
                          const text = slideScriptMap[currentSlide.id]?.text || "";
                          assignScript(currentSlide.id, text, avatarId);
                        }
                      }}>
                      
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{t("lectureBuilder.jsxText278")}</SelectItem>
                            {avatars.map((av: any) =>
                        <SelectItem key={av.id} value={av.id.toString()}>{av.name}</SelectItem>
                        )}
                          </SelectContent>
                        </Select>
                      </div>
                  }
                  </div> :

                <p className="text-sm text-muted-foreground">{t("lectureBuilder.jsxText279")}</p>
                }
              </CardContent>
            </Card>

            {/* Voice Mode Selection per Slide */}
            {currentSlide && <SlideVoiceModePanel projectId={projectId} slideId={currentSlide.id} slideIdx={selectedSlideIdx} scripts={scripts} onRefresh={onRefresh} />}

            {/* Interpreter Panel */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />{t("lectureBuilder.jsxText280")}
                  </CardTitle>
                  <Switch
                    checked={interpreterEnabled}
                    onCheckedChange={(checked) => {
                      setInterpreterEnabled(checked);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: checked,
                        interpreterLanguage,
                        interpreterVoiceId: interpreterVoiceId || undefined
                      });
                    }} />
                  
                </div>
              </CardHeader>
              {interpreterEnabled &&
              <CardContent className="space-y-3">
                  {/* Language selector */}
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText281")}</Label>
                    <Select
                    value={interpreterLanguage}
                    onValueChange={(v) => {
                      setInterpreterLanguage(v);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: true,
                        interpreterLanguage: v,
                        interpreterVoiceId: interpreterVoiceId || undefined
                      });
                    }}>
                    
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTERPRETER_LANGUAGES.map((lang) =>
                      <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Voice selector */}
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText282")}</Label>
                    <Select
                    value={interpreterVoiceId || "Kore"}
                    onValueChange={(v) => {
                      setInterpreterVoiceId(v);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: true,
                        interpreterLanguage,
                        interpreterVoiceId: v
                      });
                    }}>
                    
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {voicesQuery.data?.map((voice: any) =>
                      <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender})
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto translate button */}
                  <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  disabled={autoTranslateSlidesMut.isPending}
                  onClick={() => {
                    autoTranslateSlidesMut.mutate({ projectId, targetLanguage: interpreterLanguage });
                  }}>
                  
                    {autoTranslateSlidesMut.isPending ?
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t("lectureBuilder.jsxText283")}</> :

                  <><Languages className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText284")}</>
                  }
                  </Button>

                  {/* Generate all interpreter TTS */}
                  <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  disabled={generateAllTtsMut.isPending}
                  onClick={() => {
                    generateAllTtsMut.mutate({ projectId, voiceId: interpreterVoiceId || undefined });
                  }}>
                  
                    {generateAllTtsMut.isPending ?
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t("lectureBuilder.jsxText285")}</> :

                  <><Headphones className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText286")}</>
                  }
                  </Button>

                  {/* SRT Export */}
                  <div className="flex gap-1">
                    <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    disabled={exportSrtMut.isPending}
                    onClick={() => exportSrtMut.mutate({ projectId, mode: "interpreter_only" })}>
                    
                      <FileText className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText287")}
                  </Button>
                    <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    disabled={exportSrtMut.isPending}
                    onClick={() => exportSrtMut.mutate({ projectId, mode: "dual" })}>
                    
                      <FileText className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText288")}
                  </Button>
                  </div>

                  {/* Current slide interpreter text */}
                  {currentSlide &&
                <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText289")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText290")}</Label>
                      <Textarea
                    value={interpreterTexts[currentSlide.id] || ""}
                    onChange={(e) => {
                      setInterpreterTexts((prev) => ({ ...prev, [currentSlide.id]: e.target.value }));
                    }}
                    onBlur={() => {
                      if (currentSlide) {
                        const script = scripts.find((s: any) => s.slideId === currentSlide.id);
                        if (script) {
                          updateSlideInterpreterTextMut.mutate({
                            scriptId: script.id,
                            interpreterText: interpreterTexts[currentSlide.id] || ""
                          });
                        }
                      }
                    }}
                    placeholder={t("lectureBuilder.stringLiteral291")}
                    rows={3}
                    className="text-xs" />
                  
                    </div>
                }

                  {/* Translation progress */}
                  {Object.keys(interpreterTexts).length > 0 &&
                <div className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText292")}
                  {Object.keys(interpreterTexts).filter((k) => interpreterTexts[parseInt(k)]).length} / {slides.length}{t("lectureBuilder.jsxText293")}
                </div>
                }
                </CardContent>
              }
            </Card>

            {/* Unassigned scripts pool */}
            {unassignedScripts.length > 0 &&
            <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("lectureBuilder.jsxText294")}{unassignedScripts.length}{t("lectureBuilder.jsxText295")}</CardTitle>
                  <CardDescription className="text-xs">{t("lectureBuilder.jsxText296")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {unassignedScripts.map((s: any, i: number) =>
                    <button key={s.id}
                    className="w-full text-left p-2 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      if (currentSlide) {
                        assignScript(currentSlide.id, s.scriptText, s.avatarId || undefined);
                      }
                    }}>
                      
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0">{s.sortOrder + 1}</Badge>
                            <span className="text-xs line-clamp-2">{s.scriptText}</span>
                          </div>
                        </button>
                    )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            }
          </div>
        </div>
      </div>
    </div>);

}

// ============ STEP 5: PREVIEW & SETTINGS ============
function Step5Preview({ projectId, project, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh










}: {projectId: number;project: any;slides: any[];scripts: any[];avatars: any[];annotations: any[];avatarOverrides: any[];insertContent: any[];transitions: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [prevSlideIdx, setPrevSlideIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<number>>(() => new Set(slides.map((s: any) => s.id)));
  const [bgmUrl, setBgmUrl] = useState("");
  const [bgmVolume, setBgmVolume] = useState(30);
  const [bgmUploading, setBgmUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(project?.finalVideoUrl || "");
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [exportResolution, setExportResolution] = useState<"720p" | "1080p" | "1440p">("1080p");
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState("");

  // AI Layout Recommendation
  const layoutsQuery = trpc.slideLayout.list.useQuery({ projectId });
  const recommendLayoutMut = trpc.slideLayout.recommend.useMutation({
    onSuccess: (data) => {
      layoutsQuery.refetch();
      toast.success(t("lectureBuilder.hardcoded.layoutsRecommended", { count: String(data.count) }));
    },
    onError: (err) => toast.error(err.message || t("lectureBuilder.stringLiteral297"))
  });
  const applyLayoutMut = trpc.slideLayout.applyLayout.useMutation({
    onSuccess: () => {layoutsQuery.refetch();toast.success(t("lectureBuilder.stringLiteral298"));}
  });
  const clearLayoutsMut = trpc.slideLayout.clear.useMutation({
    onSuccess: () => {layoutsQuery.refetch();toast.info(t("lectureBuilder.stringLiteral299"));}
  });

  // Watermark Settings
  const watermarkQuery = trpc.watermark.get.useQuery({ projectId });
  const saveWatermarkMut = trpc.watermark.upsert.useMutation({
    onSuccess: () => {watermarkQuery.refetch();toast.success(t("lectureBuilder.stringLiteral300"));},
    onError: (err) => toast.error(err.message || t("lectureBuilder.stringLiteral301"))
  });
  const uploadLogoMut = trpc.watermark.uploadLogo.useMutation();

  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmType, setWmType] = useState<"text" | "logo" | "both">("text");
  const [wmText, setWmText] = useState("");
  const [wmLogoUrl, setWmLogoUrl] = useState("");
  const [wmLogoFileKey, setWmLogoFileKey] = useState("");
  const [wmPosition, setWmPosition] = useState<"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right">("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(70);
  const [wmFontSize, setWmFontSize] = useState(24);
  const [wmFontColor, setWmFontColor] = useState("#FFFFFF");
  const [wmSizePercent, setWmSizePercent] = useState(15);

  // Load existing watermark
  useEffect(() => {
    if (watermarkQuery.data) {
      const wm = watermarkQuery.data;
      setWmEnabled(wm.isEnabled ?? false);
      setWmType(wm.watermarkType as any || "text");
      setWmText(wm.textContent || "");
      setWmLogoUrl(wm.logoUrl || "");
      setWmLogoFileKey(wm.logoFileKey || "");
      setWmPosition(wm.position as any || "bottom-right");
      setWmOpacity(wm.opacity ?? 70);
      setWmFontSize(wm.fontSize ?? 24);
      setWmFontColor(wm.fontColor || "#FFFFFF");
      setWmSizePercent(wm.sizePercent ?? 15);
    }
  }, [watermarkQuery.data]);

  const handleSaveWatermark = () => {
    saveWatermarkMut.mutate({
      projectId,
      watermarkType: wmType,
      logoUrl: wmLogoUrl || undefined,
      logoFileKey: wmLogoFileKey || undefined,
      textContent: wmText || undefined,
      fontSize: wmFontSize,
      fontColor: wmFontColor,
      position: wmPosition,
      opacity: wmOpacity,
      sizePercent: wmSizePercent,
      isEnabled: wmEnabled
    });
  };

  const updateProject = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral302"));onRefresh();}
  });
  const uploadBgmMut = trpc.lectureBuilder.uploadBgm.useMutation();
  const generateVideoMut = trpc.lectureBuilder.generateVideo.useMutation();
  const exportVideoMut = trpc.lectureBuilder.exportVideo.useMutation();
  const progressQuery = trpc.lectureBuilder.getVideoProgress.useQuery(
    { projectId },
    { enabled: generating, refetchInterval: generating ? 3000 : false }
  );

  // Poll progress while generating
  useEffect(() => {
    if (!generating || !progressQuery.data) return;
    const d = progressQuery.data;
    setGenProgress(d.progress);
    setGenStep(d.step);
    if (d.status === "completed" && d.videoUrl) {
      setGenerating(false);
      setGeneratedVideoUrl(d.videoUrl);
      setGenProgress(100);
      setGenStep(t("lectureBuilder.stringLiteral303"));
      toast.success(t("lectureBuilder.stringLiteral304"));
      onRefresh();
    } else if (d.status === "failed") {
      setGenerating(false);
      setGenProgress(0);
      setGenStep("");
      toast.error(d.errorMessage || t("lectureBuilder.stringLiteral305"));
    }
  }, [generating, progressQuery.data]);

  const assignedSlides = slides.filter((s: any) => scripts.some((sc: any) => sc.slideId === s.id));
  const totalDuration = scripts.reduce((acc: number, s: any) => acc + (s.estimatedDurationSec || 30), 0);

  // Filter slides for preview based on selection
  const previewSlides = useMemo(() => {
    return slides.filter((s: any) => selectedSlideIds.has(s.id));
  }, [slides, selectedSlideIds]);

  // Get transition for current slide
  const getTransition = (slideId: number) => {
    return transitions.find((t: any) => t.slideId === slideId) || { type: 'none', durationMs: 500, easing: 'ease' };
  };

  // Handle slide change with transition
  const changeSlide = useCallback((newIdx: number) => {
    if (newIdx === previewSlideIdx || isTransitioning) return;
    const targetSlide = previewSlides[newIdx];
    if (!targetSlide) return;
    const trans = getTransition(targetSlide.id);
    if (trans.type !== 'none') {
      setPrevSlideIdx(previewSlideIdx);
      setIsTransitioning(true);
      setPreviewSlideIdx(newIdx);
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevSlideIdx(null);
      }, trans.durationMs || 500);
    } else {
      setPreviewSlideIdx(newIdx);
    }
  }, [previewSlideIdx, previewSlides, transitions, isTransitioning]);

  // Auto-play preview with transition
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (previewSlideIdx >= previewSlides.length - 1) {setIsPlaying(false);return;}
      changeSlide(previewSlideIdx + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, previewSlideIdx, previewSlides.length, changeSlide]);

  // Update selection when slides change
  useEffect(() => {
    setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  }, [slides]);

  const currentSlide = previewSlides[previewSlideIdx];
  const currentSlideScript = currentSlide ? scripts.find((s: any) => s.slideId === currentSlide.id) : null;
  const currentAvatar = currentSlideScript?.avatarId ? avatars.find((a: any) => a.id === currentSlideScript.avatarId) : avatars[0];

  // === Interpreter Audio Playback ===
  const [interpreterMode, setInterpreterMode] = useState(false);
  const [interpreterPlaying, setInterpreterPlaying] = useState(false);
  const [interpreterPhase, setInterpreterPhase] = useState<"original" | "interpreter">("original");
  const [interpreterAudioUrls, setInterpreterAudioUrls] = useState<Record<number, string>>({});
  const interpreterAudioRef = useRef<HTMLAudioElement | null>(null);
  const interpreterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateInterpreterTtsMut = trpc.lectureBuilder.generateInterpreterTts.useMutation({
    onSuccess: (data) => {
      setInterpreterAudioUrls((prev) => ({ ...prev, [data.scriptId]: data.audioUrl }));
    },
    onError: (e: any) => toast.error(e.message)
  });
  const generateAllInterpreterTtsMut = trpc.lectureBuilder.generateAllInterpreterTts.useMutation({
    onSuccess: (data) => {
      data.results.forEach((r: any) => {
        setInterpreterAudioUrls((prev) => ({ ...prev, [r.scriptId]: r.audioUrl }));
      });
      toast.success(t("lectureBuilder.hardcoded.interpreterTtsGenerated", { generated: String(data.generated), total: String(data.total) }));
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Interpreter sequential playback: original script (timer) -> interpreter audio -> next slide
  useEffect(() => {
    if (!interpreterMode || !interpreterPlaying) return;
    const script = currentSlideScript;
    if (!script) {setInterpreterPlaying(false);return;}

    if (interpreterPhase === "original") {
      // Show original script for estimated duration, then switch to interpreter
      const dur = (script.estimatedDurationSec || 5) * 1000;
      interpreterTimerRef.current = setTimeout(() => {
        const audioUrl = interpreterAudioUrls[script.id];
        if (audioUrl && script.interpreterText) {
          setInterpreterPhase("interpreter");
        } else {
          // No interpreter audio, advance to next slide
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        }
      }, dur);
    } else {
      // Play interpreter audio
      const audioUrl = interpreterAudioUrls[currentSlideScript?.id || 0];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        interpreterAudioRef.current = audio;
        audio.onended = () => {
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        };
        audio.onerror = () => {
          if (previewSlideIdx < previewSlides.length - 1) {
            changeSlide(previewSlideIdx + 1);
            setInterpreterPhase("original");
          } else {
            setInterpreterPlaying(false);
          }
        };
        audio.play().catch(() => {});
      }
    }

    return () => {
      if (interpreterTimerRef.current) clearTimeout(interpreterTimerRef.current);
      if (interpreterAudioRef.current) {
        interpreterAudioRef.current.pause();
        interpreterAudioRef.current = null;
      }
    };
  }, [interpreterMode, interpreterPlaying, interpreterPhase, previewSlideIdx, currentSlideScript, interpreterAudioUrls]);

  const toggleSlideSelection = (slideId: number) => {
    setSelectedSlideIds((prev) => {
      const next = new Set(prev);
      if (next.has(slideId)) next.delete(slideId);else
      next.add(slideId);
      return next;
    });
  };

  const selectAll = () => setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  const deselectAll = () => setSelectedSlideIds(new Set());

  // BGM upload
  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("lectureBuilder.stringLiteral306"));
      return;
    }
    setBgmUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadBgmMut.mutateAsync({
        projectId,
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "audio/mpeg"
      });
      setBgmUrl(result.url);
      toast.success(t("lectureBuilder.stringLiteral307"));
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral308"));
    } finally {
      setBgmUploading(false);
      if (bgmInputRef.current) bgmInputRef.current.value = "";
    }
  };

  // Generate video (fire-and-forget, progress via polling)
  const handleGenerateVideo = async () => {
    if (selectedSlideIds.size === 0) {
      toast.error(t("lectureBuilder.stringLiteral309"));
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenStep(t("lectureBuilder.stringLiteral310"));
    try {
      const result = await generateVideoMut.mutateAsync({
        projectId,
        avatarPosition: project?.avatarPosition,
        avatarSize: project?.avatarSize === "small" ? 15 : project?.avatarSize === "large" ? 35 : 25,
        avatarShape: project?.avatarShape,
        avatarOpacity: project?.avatarOpacity,
        bgmUrl: bgmUrl || undefined,
        bgmVolume,
        noiseReduction: false,
        resolution: "1080p",
        selectedSlideIds: Array.from(selectedSlideIds)
      });
      setGeneratedVideoUrl(result.videoUrl);
      setGenProgress(100);
      setGenStep(t("lectureBuilder.stringLiteral311"));
      toast.success(t("lectureBuilder.stringLiteral312"));
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral313"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText314")}</h2>

      <div className="grid grid-cols-12 gap-6 overflow-hidden">
        {/* Preview Area */}
        <div className="col-span-8 min-w-0">
          <Card>
            <CardContent className="pt-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                {/* Previous slide (for transition) */}
                {isTransitioning && prevSlideIdx !== null && previewSlides[prevSlideIdx] &&
                <img src={previewSlides[prevSlideIdx].imageUrl} alt={t("lectureBuilder.stringLiteral315")} className="absolute inset-0 w-full h-full object-contain z-0" />
                }
                {currentSlide ?
                <>
                    <img
                    src={currentSlide.imageUrl}
                    alt={t("lectureBuilder.stringLiteral316")}
                    className="w-full h-full object-contain"
                    style={isTransitioning ? (() => {
                      const trans = getTransition(currentSlide.id);
                      const dur = `${trans.durationMs || 500}ms`;
                      const ease = trans.easing || 'ease';
                      const base: React.CSSProperties = { position: 'relative', zIndex: 1, transition: `all ${dur} ${ease}` };
                      switch (trans.type) {
                        case 'fade':return { ...base, animation: `fadeIn ${dur} ${ease} forwards` };
                        case 'slide-left':return { ...base, animation: `slideFromRight ${dur} ${ease} forwards` };
                        case 'slide-right':return { ...base, animation: `slideFromLeft ${dur} ${ease} forwards` };
                        case 'slide-up':return { ...base, animation: `slideFromBottom ${dur} ${ease} forwards` };
                        case 'slide-down':return { ...base, animation: `slideFromTop ${dur} ${ease} forwards` };
                        case 'zoom-in':return { ...base, animation: `zoomIn ${dur} ${ease} forwards` };
                        case 'zoom-out':return { ...base, animation: `zoomOut ${dur} ${ease} forwards` };
                        case 'wipe':return { ...base, animation: `wipeRight ${dur} ${ease} forwards` };
                        case 'dissolve':return { ...base, animation: `dissolve ${dur} ${ease} forwards` };
                        default:return base;
                      }
                    })() : undefined} />
                  
                    {/* Avatar PIP overlay */}
                    {project?.avatarPosition !== "none" && currentAvatar &&
                  <div className={`absolute ${
                  project?.avatarPosition === "bottom-right" ? "bottom-4 right-4" :
                  project?.avatarPosition === "bottom-left" ? "bottom-4 left-4" :
                  project?.avatarPosition === "top-right" ? "top-4 right-4" :
                  "top-4 left-4"}`
                  }>
                        <div className={`${
                    project?.avatarSize === "small" ? "w-20 h-20" :
                    project?.avatarSize === "medium" ? "w-28 h-28" :
                    "w-36 h-36"} ${

                    project?.avatarShape === "circle" ? "rounded-full" :
                    project?.avatarShape === "rounded" ? "rounded-xl" :
                    "rounded-none"} overflow-hidden border-2 border-white/30 shadow-lg`
                    }
                    style={{ opacity: (project?.avatarOpacity || 100) / 100 }}>
                      
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Users className="w-8 h-8 text-white/70" />
                          </div>
                        </div>
                      </div>
                  }
                    {/* Script overlay */}
                    {currentSlideScript &&
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
                        {interpreterMode && interpreterPhase === "interpreter" && currentSlideScript.interpreterText ?
                    <>
                            <p className="text-yellow-300 text-xs mb-1 flex items-center gap-1">
                              <Globe className="w-3 h-3" />{t("lectureBuilder.jsxText317")}
                      </p>
                            <p className="text-white text-sm line-clamp-2">{currentSlideScript.interpreterText}</p>
                          </> :

                    <p className="text-white text-sm line-clamp-2">{currentSlideScript.scriptText}</p>
                    }
                      </div>
                  }
                  </> :

                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {selectedSlideIds.size === 0 ? t("lectureBuilder.stringLiteral318") : t("lectureBuilder.stringLiteral319")}
                  </div>
                }
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3 mt-4">
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.max(0, previewSlideIdx - 1))} disabled={isTransitioning}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={isTransitioning}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.min(previewSlides.length - 1, previewSlideIdx + 1))} disabled={isTransitioning}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: previewSlides.length > 0 ? `${(previewSlideIdx + 1) / previewSlides.length * 100}%` : "0%" }} />
                </div>
                <span className="text-sm text-muted-foreground">{previewSlides.length > 0 ? previewSlideIdx + 1 : 0}/{previewSlides.length}</span>
                {/* Interpreter mode toggle */}
                <Button
                  variant={interpreterMode ? "default" : "outline"}
                  size="icon"
                  className="ml-2"
                  onClick={() => {
                    setInterpreterMode(!interpreterMode);
                    if (interpreterPlaying) {
                      setInterpreterPlaying(false);
                      setInterpreterPhase("original");
                    }
                  }}
                  title={t("lectureBuilder.stringLiteral320")}>
                  
                  <Globe className="w-4 h-4" />
                </Button>
              </div>
              {/* Interpreter playback controls */}
              {interpreterMode &&
              <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Globe className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 shrink-0">{t("lectureBuilder.jsxText321")}</span>
                  <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    if (interpreterPlaying) {
                      setInterpreterPlaying(false);
                      setInterpreterPhase("original");
                      if (interpreterAudioRef.current) {interpreterAudioRef.current.pause();interpreterAudioRef.current = null;}
                    } else {
                      setInterpreterPlaying(true);
                      setInterpreterPhase("original");
                      setIsPlaying(false);
                    }
                  }}>
                  
                    {interpreterPlaying ? <><Pause className="w-3 h-3" />{t("lectureBuilder.jsxText322")}</> : <><Play className="w-3 h-3" />{t("lectureBuilder.jsxText323")}</>}
                  </Button>
                  {interpreterPlaying &&
                <Badge variant="outline" className="text-xs">
                      {interpreterPhase === "original" ? t("lectureBuilder.stringLiteral324") : t("lectureBuilder.stringLiteral325")}
                    </Badge>
                }
                  <div className="flex-1" />
                  <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={generateAllInterpreterTtsMut.isPending}
                  onClick={() => generateAllInterpreterTtsMut.mutate({ projectId })}>
                  
                    {generateAllInterpreterTtsMut.isPending ?
                  <><Loader2 className="w-3 h-3 animate-spin" />{t("lectureBuilder.jsxText326")}</> :

                  <><Headphones className="w-3 h-3" />{t("lectureBuilder.jsxText327")}</>
                  }
                  </Button>
                </div>
              }
            </CardContent>
          </Card>

          {/* AI Slide Layout Recommendation */}
          <Card className="mt-4 border-purple-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />{t("lectureBuilder.jsxText328")}
                </CardTitle>
                <Button variant="outline" size="sm" className="text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={() => recommendLayoutMut.mutate({ projectId })}
                disabled={recommendLayoutMut.isPending || slides.length === 0}>
                  {recommendLayoutMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}{t("lectureBuilder.jsxText329")}

                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layoutsQuery.data && layoutsQuery.data.length > 0 ?
              <div className="space-y-1.5">
                  {layoutsQuery.data.map((layout: any) => {
                  const slideIdx = slides.findIndex((s: any) => s.id === layout.slideId);
                  return (
                    <div key={layout.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">{t("lectureBuilder.jsxText330")}{slideIdx + 1}</Badge>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">{layout.layoutType}</Badge>
                        <span className="text-muted-foreground truncate flex-1">{layout.aiReasoning}</span>
                        {!layout.isApplied &&
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600"
                      onClick={() => applyLayoutMut.mutate({ layoutId: layout.id })}>{t("lectureBuilder.jsxText331")}

                      </Button>
                      }
                        {layout.isApplied && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                      </div>);

                })}
                  <Button variant="ghost" size="sm" className="text-xs text-red-400 w-full"
                onClick={() => clearLayoutsMut.mutate({ projectId })}>{t("lectureBuilder.jsxText332")}

                </Button>
                </div> :

              <p className="text-xs text-muted-foreground text-center py-2">{t("lectureBuilder.jsxText333")}

              </p>
              }
            </CardContent>
          </Card>

          {/* Slide Selection for Preview */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText334")}{selectedSlideIds.size}/{slides.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={selectAll}>{t("lectureBuilder.jsxText335")}</Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={deselectAll}>{t("lectureBuilder.jsxText336")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {slides.map((slide: any, idx: number) => {
                  const isSelected = selectedSlideIds.has(slide.id);
                  return (
                    <button key={slide.id}
                    className={`relative w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    isSelected ? "border-primary ring-1 ring-primary/30" : "border-muted opacity-50"}`
                    }
                    onClick={() => toggleSlideSelection(slide.id)}>
                      
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                      <div className="absolute top-0 left-0 text-[8px] bg-black/60 text-white px-0.5 rounded-br">{idx + 1}</div>
                      {isSelected && <Check className="absolute bottom-0 right-0 w-3 h-3 text-green-400" />}
                    </button>);

                })}
              </div>
            </CardContent>
          </Card>

          {/* Generated Video & Export */}
          {generatedVideoUrl &&
          <Card className="mt-4 border-green-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />{t("lectureBuilder.jsxText337")}
                </CardTitle>
                  <Badge variant="outline" className="text-green-500 border-green-500/30">{t("lectureBuilder.jsxText338")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <video src={generatedVideoUrl} controls className="w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-2">
                  <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm" className="gap-1 w-full">
                      <Download className="w-3 h-3" />{t("lectureBuilder.jsxText339")}
                  </Button>
                  </a>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                  navigator.clipboard.writeText(generatedVideoUrl);
                  toast.success(t("lectureBuilder.stringLiteral340"));
                }}>
                    <Link2 className="w-3 h-3" />{t("lectureBuilder.jsxText341")}
                </Button>
                </div>
              </CardContent>
            </Card>
          }
        </div>

        {/* Settings Panel */}
        <div className="col-span-4 space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText342")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText343")}</span><span>{avatars.length}{t("lectureBuilder.jsxText344")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText345")}</span><span>{slides.length}{t("lectureBuilder.jsxText346")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText347")}</span><span>{assignedSlides.length}/{slides.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText348")}</span><span>~{Math.ceil(totalDuration / 60)}{t("lectureBuilder.jsxText349")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText350")}</span><span>{selectedSlideIds.size}{t("lectureBuilder.jsxText351")}</span></div>
              {project.status && project.status !== "draft" &&
              <div className="flex justify-between"><span className="text-muted-foreground">{t("lectureBuilder.jsxText352")}</span>
                  <Badge variant={project.status === "completed" ? "default" : project.status === "generating" ? "secondary" : "destructive"}>
                    {project.status === "completed" ? t("lectureBuilder.stringLiteral353") : project.status === "generating" ? t("lectureBuilder.stringLiteral354") : project.status === "error" ? t("lectureBuilder.stringLiteral355") : project.status}
                  </Badge>
                </div>
              }
            </CardContent>
          </Card>

          {/* Avatar Position */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText356")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={project.avatarPosition} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarPosition: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">{t("lectureBuilder.jsxText357")}</SelectItem>
                  <SelectItem value="bottom-left">{t("lectureBuilder.jsxText358")}</SelectItem>
                  <SelectItem value="top-right">{t("lectureBuilder.jsxText359")}</SelectItem>
                  <SelectItem value="top-left">{t("lectureBuilder.jsxText360")}</SelectItem>
                  <SelectItem value="none">{t("lectureBuilder.jsxText361")}</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText362")}</Label>
                <Select value={project.avatarSize} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarSize: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t("lectureBuilder.jsxText363")}</SelectItem>
                    <SelectItem value="medium">{t("lectureBuilder.jsxText364")}</SelectItem>
                    <SelectItem value="large">{t("lectureBuilder.jsxText365")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText366")}</Label>
                <Select value={project.avatarShape} onValueChange={(v) => updateProject.mutate({ id: projectId, avatarShape: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">{t("lectureBuilder.jsxText367")}</SelectItem>
                    <SelectItem value="rounded">{t("lectureBuilder.jsxText368")}</SelectItem>
                    <SelectItem value="rectangle">{t("lectureBuilder.jsxText369")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText370")}{project.avatarOpacity}%</Label>
                <Slider value={[project.avatarOpacity]} min={20} max={100} step={5}
                onValueChange={(v) => updateProject.mutate({ id: projectId, avatarOpacity: v[0] })} />
              </div>
            </CardContent>
          </Card>

          {/* BGM Upload */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText371")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input ref={bgmInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a" className="hidden" onChange={handleBgmUpload} />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => bgmInputRef.current?.click()} disabled={bgmUploading}>
                {bgmUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                {bgmUrl ? t("lectureBuilder.stringLiteral372") : t("lectureBuilder.stringLiteral373")}
              </Button>
              {bgmUrl &&
              <>
                  <audio src={bgmUrl} controls className="w-full h-8" />
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText374")}{bgmVolume}%</Label>
                    <Slider value={[bgmVolume]} min={0} max={100} step={5} onValueChange={(v) => setBgmVolume(v[0])} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-red-400" onClick={() => setBgmUrl("")}>
                    <X className="w-3 h-3 mr-1" />{t("lectureBuilder.jsxText375")}
                </Button>
                </>
              }
            </CardContent>
          </Card>

          {/* MP4 Export Settings */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lectureBuilder.jsxText376")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t("lectureBuilder.jsxText377")}</Label>
                <Select value={exportResolution} onValueChange={(v) => setExportResolution(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subtitles" checked={includeSubtitles} onChange={(e) => setIncludeSubtitles(e.target.checked)} className="rounded" />
                <Label htmlFor="subtitles" className="text-xs cursor-pointer">{t("lectureBuilder.jsxText378")}</Label>
              </div>
              <Button
                className="w-full gap-2"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (slides.length === 0) {toast.error(t("lectureBuilder.stringLiteral379"));return;}
                  setExporting(true);
                  setExportProgress(0);
                  setExportStep(t("lectureBuilder.stringLiteral380"));
                  try {
                    const result = await exportVideoMut.mutateAsync({
                      projectId,
                      resolution: exportResolution,
                      includeSubtitles
                    });
                    setGeneratedVideoUrl(result.videoUrl);
                    setExportProgress(100);
                    setExportStep(t("lectureBuilder.stringLiteral381"));
                    toast.success(t("lectureBuilder.hardcoded.mp4ExportComplete", { size: (result.fileSize / 1024 / 1024).toFixed(1) }));
                    onRefresh();
                  } catch (err: any) {
                    toast.error(err.message || t("lectureBuilder.stringLiteral382"));
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting || slides.length === 0}>
                
                {exporting ?
                <><Loader2 className="w-4 h-4 animate-spin" />{t("lectureBuilder.jsxText383")}</> :

                <><Download className="w-4 h-4" />{t("lectureBuilder.jsxText384")}</>
                }
              </Button>
              {exporting &&
              <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{exportStep}</span>
                    <span className="font-mono text-primary">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${exportProgress}%` }} />
                  </div>
                </div>
              }
            </CardContent>
          </Card>

          {/* Watermark Settings */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText385")}</CardTitle>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="wm-enabled" checked={wmEnabled}
                  onChange={(e) => setWmEnabled(e.target.checked)} className="rounded" />
                  <Label htmlFor="wm-enabled" className="text-xs cursor-pointer">{t("lectureBuilder.jsxText386")}</Label>
                </div>
              </div>
            </CardHeader>
            {wmEnabled &&
            <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t("lectureBuilder.jsxText387")}</Label>
                  <Select value={wmType} onValueChange={(v) => setWmType(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t("lectureBuilder.jsxText388")}</SelectItem>
                      <SelectItem value="logo">{t("lectureBuilder.jsxText389")}</SelectItem>
                      <SelectItem value="both">{t("lectureBuilder.jsxText390")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(wmType === "text" || wmType === "both") &&
              <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText391")}</Label>
                    <Input value={wmText} onChange={(e) => setWmText(e.target.value)}
                placeholder={t("lectureBuilder.stringLiteral392")} className="h-8 text-xs" />
                  </div>
              }
                {(wmType === "logo" || wmType === "both") &&
              <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText393")}</Label>
                    <div className="flex gap-2">
                      <Input type="file" accept="image/*" className="h-8 text-xs flex-1"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = (reader.result as string).split(",")[1];
                      try {
                        const result = await uploadLogoMut.mutateAsync({
                          projectId,
                          fileName: file.name,
                          fileBase64: base64,
                          mimeType: file.type
                        });
                        setWmLogoUrl(result.url);
                        setWmLogoFileKey(result.fileKey);
                        toast.success(t("lectureBuilder.stringLiteral394"));
                      } catch (err: any) {
                        toast.error(err.message || t("lectureBuilder.stringLiteral395"));
                      }
                    };
                    reader.readAsDataURL(file);
                  }} />
                  
                      {wmLogoUrl && <img src={wmLogoUrl} alt="logo" className="w-8 h-8 rounded border object-contain" />}
                    </div>
                  </div>
              }
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText396")}</Label>
                    <Select value={wmPosition} onValueChange={(v) => setWmPosition(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">{t("lectureBuilder.jsxText397")}</SelectItem>
                        <SelectItem value="top-center">{t("lectureBuilder.jsxText398")}</SelectItem>
                        <SelectItem value="top-right">{t("lectureBuilder.jsxText399")}</SelectItem>
                        <SelectItem value="bottom-left">{t("lectureBuilder.jsxText400")}</SelectItem>
                        <SelectItem value="bottom-center">{t("lectureBuilder.jsxText401")}</SelectItem>
                        <SelectItem value="bottom-right">{t("lectureBuilder.jsxText402")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText403")}{wmOpacity}%</Label>
                    <Slider value={[wmOpacity]} min={10} max={100} step={5}
                  onValueChange={(v) => setWmOpacity(v[0])} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText404")}{wmFontSize}px</Label>
                    <Slider value={[wmFontSize]} min={12} max={48} step={2}
                  onValueChange={(v) => setWmFontSize(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText405")}{wmSizePercent}%</Label>
                    <Slider value={[wmSizePercent]} min={5} max={40} step={1}
                  onValueChange={(v) => setWmSizePercent(v[0])} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("lectureBuilder.jsxText406")}</Label>
                  <div className="flex gap-1">
                    {["#FFFFFF", "#000000", "#FF0000", "#0066FF", "#00AA00", "#FFAA00"].map((c) =>
                  <button key={c}
                  className={`w-6 h-6 rounded-full border-2 ${wmFontColor === c ? "border-primary scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c, boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #ccc" : undefined }}
                  onClick={() => setWmFontColor(c)} />

                  )}
                  </div>
                </div>
                <Button variant="default" size="sm" className="w-full gap-1"
              onClick={handleSaveWatermark}
              disabled={saveWatermarkMut.isPending}>
                  {saveWatermarkMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{t("lectureBuilder.jsxText407")}

              </Button>
                {/* Preview */}
                <div className="relative w-full aspect-video bg-muted rounded-lg border overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">{t("lectureBuilder.jsxText408")}

                </div>
                  <div className={`absolute flex items-center gap-1 ${
                wmPosition.includes("top") ? "top-2" : "bottom-2"} ${

                wmPosition.includes("left") ? "left-2" : wmPosition.includes("center") ? "left-1/2 -translate-x-1/2" : "right-2"}`
                } style={{ opacity: wmOpacity / 100 }}>
                    {wmLogoUrl && (wmType === "logo" || wmType === "both") &&
                  <img src={wmLogoUrl} alt="wm" className="rounded" style={{ height: `${wmSizePercent * 1.5}px` }} />
                  }
                    {(wmType === "text" || wmType === "both") && wmText &&
                  <span style={{ fontSize: `${Math.max(8, wmFontSize * 0.5)}px`, color: wmFontColor }} className="font-bold drop-shadow-md">
                        {wmText}
                      </span>
                  }
                  </div>
                </div>
              </CardContent>
            }
          </Card>

          {/* Generate Button */}
          <Button id="step5-generate-video-btn" className="w-full gap-2" size="lg" onClick={handleGenerateVideo} disabled={generating || exporting || selectedSlideIds.size === 0}>
            {generating ?
            <><Loader2 className="w-5 h-5 animate-spin" />{t("lectureBuilder.jsxText409")}</> :

            <><Video className="w-5 h-5" />{t("lectureBuilder.jsxText410")}</>
            }
          </Button>
          {generating &&
          <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("lectureBuilder.jsxText411")}</span>
                  <span className="font-mono font-bold text-primary">{genProgress}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${genProgress}%` }} />
                
                </div>
                {genStep &&
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {genStep}
                  </p>
              }
                <p className="text-[10px] text-muted-foreground/60 text-center">{t("lectureBuilder.jsxText412")}</p>
              </CardContent>
            </Card>
          }
        </div>
      </div>
    </div>);

}
// ============ PPT AI Script Generation Panel ============
function PPTAIScriptPanel({ projectId, slides, sections, setSections, language, setLanguage, onRefresh, onGenerated }: {
  projectId: number;
  slides: any[];
  sections: any[];
  setSections: (s: any[]) => void;
  language: string;
  setLanguage: (l: string) => void;
  onRefresh: () => void;
  onGenerated?: () => void;
}) {
  const { t } = useLanguage();
  const [style, setStyle] = useState<"professional" | "casual" | "academic" | "storytelling">("professional");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [generatedScripts, setGeneratedScripts] = useState<Array<{slideId: number; text: string; estimatedDurationSec: number}>>([]);

  const creditsQuery = trpc.lectureBuilder.getPPTScriptCredits.useQuery();
  const applyMut = trpc.lectureBuilder.applyPPTScripts.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.applied}개 슬라이드 스크립트가 저장되었습니다.`);
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const generateMut = trpc.lectureBuilder.generateScriptFromPPT.useMutation({
    onSuccess: (data) => {
      const newSections = data.scripts.map((s: any, i: number) => ({
        id: `ppt-ai-${Date.now()}-${i}`,
        section: i + 1,
        text: s.text,
      }));
      setSections(newSections);
      setGeneratedScripts(data.scripts);
      onGenerated?.();
      toast.success(`AI 스크립트 생성 완료! ${data.scripts.length}개 슬라이드, ${data.creditsUsed} 크레딧 사용`);
      setGenerating(false);
      creditsQuery.refetch();
    },
    onError: (e) => {
      if (e.message.startsWith("INSUFFICIENT_CREDITS:")) {
        const [, cost, current] = e.message.split(":");
        toast.error(`크레딧 부족! 필요: ${cost}, 보유: ${current}. 크레딧을 충전해주세요.`);
      } else {
        toast.error(`스크립트 생성 실패: ${e.message}`);
      }
      setGenerating(false);
    },
  });

  // Auto-select all slides
  useEffect(() => {
    if (slides.length > 0 && selectedSlideIds.size === 0) {
      setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
    }
  }, [slides]);

  const toggleSlide = (id: number) => {
    setSelectedSlideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    if (selectedSlideIds.size === 0) {
      toast.error("슬라이드를 선택해주세요.");
      return;
    }
    if (!creditsQuery.data?.canGenerate) {
      toast.error("크레딧이 부족합니다. 크레딧을 충전해주세요.");
      return;
    }
    setGenerating(true);
    generateMut.mutate({
      projectId,
      slideIds: Array.from(selectedSlideIds),
      language,
      style,
      additionalContext: additionalContext.trim() || undefined,
    });
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg">PPT AI 스크립트 생성</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <Coins className="w-3 h-3 mr-1" />Premium
            </Badge>
          </div>
          {creditsQuery.data && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">잔여:</span>
              <span className={`font-bold ${creditsQuery.data.canGenerate ? 'text-green-600' : 'text-red-500'}`}>
                {creditsQuery.data.creditsRemaining} 크레딧
              </span>
              <span className="text-muted-foreground">(1회 {creditsQuery.data.costPerGeneration} 크레딧)</span>
            </div>
          )}
        </div>
        <CardDescription>업로드된 PPT 슬라이드 이미지를 AI가 분석하여 각 슬라이드에 맞는 강의 스크립트를 자동으로 생성합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {slides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">슬라이드가 없습니다</p>
            <p className="text-sm">Step 3에서 PPT/PDF 파일을 먼저 업로드해주세요.</p>
          </div>
        ) : (
          <>
            {/* Slide Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">분석할 슬라이드 선택</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSlideIds(new Set(slides.map((s: any) => s.id)))}>
                    전체 선택
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSlideIds(new Set())}>
                    전체 해제
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-background">
                {slides.map((slide: any, idx: number) => (
                  <button
                    key={slide.id}
                    onClick={() => toggleSlide(slide.id)}
                    className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all ${
                      selectedSlideIds.has(slide.id) ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img src={slide.imageUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
                      {idx + 1}
                    </div>
                    {selectedSlideIds.has(slide.id) && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedSlideIds.size}/{slides.length}개 슬라이드 선택됨</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">언어</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="th">ภาษาไทย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">스타일</Label>
                <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적 (Professional)</SelectItem>
                    <SelectItem value="casual">캐주얼 (Casual)</SelectItem>
                    <SelectItem value="academic">학술적 (Academic)</SelectItem>
                    <SelectItem value="storytelling">스토리텔링 (Storytelling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <Label className="text-sm">추가 컨텍스트 (선택사항)</Label>
              <Textarea
                placeholder="강의 주제, 대상 청중, 특별 요구사항 등을 입력하세요..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              size="lg"
              disabled={generating || selectedSlideIds.size === 0 || !creditsQuery.data?.canGenerate}
              onClick={handleGenerate}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />AI 분석 중... (약 30초 소요)</>
              ) : (
                <><Sparkles className="w-4 h-4" />PPT 분석 후 스크립트 생성 ({creditsQuery.data?.costPerGeneration || 10} 크레딧)</>
              )}
            </Button>

            {!creditsQuery.data?.canGenerate && creditsQuery.data && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">
                  크레딧이 부족합니다.
                </p>
                <Button variant="outline" size="sm" onClick={() => window.open('/credits', '_blank')} className="gap-1">
                  <CreditCard className="w-3 h-3" />크레딧 충전하기
                </Button>
              </div>
            )}

            {/* Apply Generated Scripts */}
            {generatedScripts.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{generatedScripts.length}개 스크립트 생성 완료</span>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => applyMut.mutate({ projectId, scripts: generatedScripts })}
                    disabled={applyMut.isPending}
                  >
                    {applyMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    전체 적용 (슬라이드 스크립트에 저장)
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {generatedScripts.map((s, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                      <span className="font-medium text-amber-600">슬라이드 {i + 1}:</span> {s.text.slice(0, 80)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Slide Voice Mode Panel ============
function SlideVoiceModePanel({ projectId, slideId, slideIdx, scripts, onRefresh }: {
  projectId: number;
  slideId: number;
  slideIdx: number;
  scripts: any[];
  onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const [voiceMode, setVoiceMode] = useState<"ai_tts" | "direct_record" | "ai_clone">("ai_tts");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing voice mode from scripts
  useEffect(() => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (script) {
      setVoiceMode(script.voiceMode || "ai_tts");
      setRecordedUrl(script.recordedAudioUrl || null);
    } else {
      setVoiceMode("ai_tts");
      setRecordedUrl(null);
    }
  }, [slideId, scripts]);

  const setVoiceModeMut = trpc.lectureBuilder.setSlideVoiceMode.useMutation({
    onSuccess: () => {
      toast.success("음성 모드가 변경되었습니다.");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadRecordingMut = trpc.lectureBuilder.uploadSlideRecording.useMutation({
    onSuccess: (data) => {
      setRecordedUrl(data.url);
      toast.success("녹음이 저장되었습니다.");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleVoiceModeChange = (mode: "ai_tts" | "direct_record" | "ai_clone") => {
    setVoiceMode(mode);
    setVoiceModeMut.mutate({ projectId, slideId, voiceMode: mode });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadRecordingMut.mutate({
            projectId,
            slideId,
            audioData: base64,
            fileName: `slide-${slideIdx + 1}-recording-${Date.now()}.webm`,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("마이크 접근이 거부되었습니다.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("파일 크기가 16MB를 초과합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadRecordingMut.mutate({
        projectId,
        slideId,
        audioData: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Headphones className="h-4 w-4 text-blue-500" />
          슬라이드 {slideIdx + 1} 음성 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Voice Mode Selection */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "ai_tts" as const, label: "AI 음성", icon: Volume2, desc: "AI TTS로 자동 생성" },
            { id: "direct_record" as const, label: "직접 녹음", icon: Mic, desc: "본인 목소리 녹음" },
            { id: "ai_clone" as const, label: "AI 클론", icon: Sparkles, desc: "AI가 본인 목소리로 읽기" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleVoiceModeChange(m.id)}
              className={`p-2.5 rounded-lg border-2 transition-all text-center ${
                voiceMode === m.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <m.icon className={`w-4 h-4 mx-auto mb-1 ${voiceMode === m.id ? "text-blue-500" : "text-muted-foreground"}`} />
              <div className="text-xs font-medium">{m.label}</div>
              <div className="text-[10px] text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* AI TTS Mode Info */}
        {voiceMode === "ai_tts" && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-muted-foreground">
              <Volume2 className="w-3 h-3 inline mr-1" />
              스크립트를 기반으로 AI가 자동으로 음성을 생성합니다. 프로필에서 설정한 TTS 음성이 사용됩니다.
            </p>
          </div>
        )}

        {/* AI Clone Mode - Generate Clone TTS */}
        {voiceMode === "ai_clone" && (
          <AICloneVoiceSection projectId={projectId} slideId={slideId} scripts={scripts} onRefresh={onRefresh} />
        )}

        {/* Direct Record Mode - Recording UI */}
        {voiceMode === "direct_record" && (
          <div className="space-y-3">
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={stopRecording}
                >
                  <StopCircle className="w-4 h-4" />
                  녹음 중지 ({formatTime(recordingTime)})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={startRecording}
                  disabled={uploadRecordingMut.isPending}
                >
                  <Mic className="w-4 h-4" />
                  직접 녹음하기
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadRecordingMut.isPending || isRecording}
              >
                <Upload className="w-4 h-4" />
                파일 업로드
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {uploadRecordingMut.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                업로드 중...
              </div>
            )}

            {/* Recorded Audio Preview */}
            {recordedUrl && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-600">녹음 완료</span>
                </div>
                <audio controls src={recordedUrl} className="w-full h-8" />
              </div>
            )}

            <div className="p-2 rounded bg-muted/50">
              <p className="text-[10px] text-muted-foreground">
                직접 녹음: 마이크로 스크립트를 읽어 녹음합니다.<br/>
                파일 업로드: 미리 녹음한 음성 파일(mp3, wav, webm 등)을 업로드합니다.
              </p>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}


// ── AI Clone Voice Section ──
function AICloneVoiceSection({ projectId, slideId, scripts, onRefresh }: {
  projectId: number;
  slideId: number;
  scripts: any[];
  onRefresh: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generateCloneMut = trpc.lectureBuilder.generateCloneVoice.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.audioUrl);
      toast.success("AI 클론 음성이 생성되었습니다.");
      setIsGenerating(false);
      onRefresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setIsGenerating(false);
    },
  });

  // Load existing generated audio
  useEffect(() => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (script?.recordedAudioUrl && script?.voiceMode === "ai_clone") {
      setGeneratedUrl(script.recordedAudioUrl);
    } else {
      setGeneratedUrl(null);
    }
  }, [slideId, scripts]);

  const handleGenerate = () => {
    const script = scripts.find((s: any) => s.slideId === slideId);
    if (!script?.scriptText) {
      toast.error("이 슬라이드에 스크립트가 없습니다. 먼저 스크립트를 작성해주세요.");
      return;
    }
    setIsGenerating(true);
    generateCloneMut.mutate({ projectId, slideId, text: script.scriptText, speed: 1.0, pitch: 0 });
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <p className="text-xs text-muted-foreground mb-2">
          <Sparkles className="w-3 h-3 inline mr-1" />
          프로필에 등록된 본인 음성 샘플을 기반으로 AI가 스크립트를 본인 목소리로 읽어줍니다.
        </p>
        <Button
          size="sm"
          className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-3 h-3 animate-spin" />생성 중...</>
          ) : (
            <><Sparkles className="w-3 h-3" />AI 클론 음성 생성</>
          )}
        </Button>
      </div>

      {generatedUrl && (
        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
          <p className="text-xs text-green-600 mb-2 font-medium">AI 클론 음성 생성 완료</p>
          <audio controls src={generatedUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}


// --- Batch Clone Voice Button Component with Preview Modal ---
function BatchCloneVoiceButton({ projectId, slides, slideScriptMap, onComplete }: {
  projectId: number;
  slides: any[];
  slideScriptMap: Record<number, any>;
  onComplete: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<"confirm" | "preview" | "generating">("confirm");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVoiceName, setPreviewVoiceName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);

  const previewMut = trpc.lectureBuilder.generateCloneVoice.useMutation({
    onSuccess: (data) => {
      setPreviewUrl(data.audioUrl);
      setPreviewVoiceName(data.voiceName);
      setStep("preview");
    },
    onError: (e) => {
      if (e.message.includes("NO_VOICE_CLONE")) {
        toast.error("음성 프로필에서 음성 샘플을 먼저 등록해주세요.");
      } else {
        toast.error(e.message);
      }
      setShowModal(false);
    },
  });

  const batchMut = trpc.lectureBuilder.batchGenerateCloneVoice.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      setShowModal(false);
      if (data.success === data.total) {
        toast.success(`전체 ${data.total}개 슬라이드 AI 클론 음성 생성 완료! (${data.voiceName})`);
      } else {
        toast.info(`${data.success}/${data.total}개 슬라이드 생성 완료 (${data.total - data.success}개 실패)`);
      }
      onComplete();
    },
    onError: (e) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  const scriptsWithText = slides.filter(s => slideScriptMap[s.id]?.text?.trim());

  const handleOpenModal = () => {
    if (scriptsWithText.length === 0) {
      toast.error("스크립트가 있는 슬라이드가 없습니다.");
      return;
    }
    setStep("confirm");
    setPreviewUrl(null);
    setSpeed(1.0);
    setPitch(0);
    setShowModal(true);
  };

  const handlePreviewTest = () => {
    const firstSlide = scriptsWithText[0];
    const text = slideScriptMap[firstSlide.id]?.text || "";
    previewMut.mutate({ projectId, slideId: firstSlide.id, text, speed, pitch });
  };

  const handleRegenPreview = () => {
    setPreviewUrl(null);
    handlePreviewTest();
  };

  const handleBatchGenerate = () => {
    setIsGenerating(true);
    setStep("generating");
    batchMut.mutate({ projectId, speed, pitch });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        onClick={handleOpenModal}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            AI 클론 생성중...
          </>
        ) : (
          <>
            <Headphones className="w-3 h-3" />
            전체 AI 클론 음성 생성
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={(open) => { if (!isGenerating) setShowModal(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-purple-400" />
              AI 클론 음성 일괄 생성
            </DialogTitle>
          </DialogHeader>

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm">총 <span className="font-bold text-primary">{scriptsWithText.length}개</span> 슬라이드의 스크립트를 AI 클론 음성으로 생성합니다.</p>
                <p className="text-xs text-muted-foreground">속도와 피치를 조절한 뒤, 첫 번째 슬라이드로 음성 품질을 테스트해보세요.</p>
              </div>

              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">속도</label>
                  <span className="text-xs font-mono text-primary">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.5x (느리게)</span>
                  <span>1.0x</span>
                  <span>2.0x (빠르게)</span>
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">피치</label>
                  <span className="text-xs font-mono text-primary">{pitch > 0 ? `+${pitch}` : pitch}</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>-12 (낮게)</span>
                  <span>0</span>
                  <span>+12 (높게)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={handlePreviewTest}
                  disabled={previewMut.isPending}
                >
                  {previewMut.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />테스트 생성중...</>
                  ) : (
                    <><Mic className="w-4 h-4" />미리 테스트 (1개 슬라이드)</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-400">테스트 생성 완료</span>
                </div>
                <p className="text-xs text-muted-foreground">음성: {previewVoiceName} | 속도: {speed.toFixed(1)}x | 피치: {pitch > 0 ? `+${pitch}` : pitch}</p>
                {previewUrl && (
                  <audio controls className="w-full h-8" src={previewUrl}>
                    Your browser does not support audio.
                  </audio>
                )}
              </div>

              {/* Speed/Pitch adjustment in preview */}
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">설정 변경 후 다시 테스트할 수 있습니다</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted-foreground">속도</label>
                      <span className="text-[10px] font-mono text-primary">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.0" step="0.1" value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted-foreground">피치</label>
                      <span className="text-[10px] font-mono text-primary">{pitch > 0 ? `+${pitch}` : pitch}</span>
                    </div>
                    <input
                      type="range" min="-12" max="12" step="1" value={pitch}
                      onChange={(e) => setPitch(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleRegenPreview}
                  disabled={previewMut.isPending}
                >
                  {previewMut.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />재생성 중...</>
                  ) : (
                    <><Mic className="w-3 h-3" />설정 변경 후 다시 테스트</>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">음성 품질이 만족스러우면 전체 생성을 진행하세요.</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700"
                  onClick={handleBatchGenerate}
                >
                  <Headphones className="w-4 h-4" />
                  전체 {scriptsWithText.length}개 생성하기
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                <p className="text-sm font-medium">AI 클론 음성 일괄 생성 중...</p>
                <p className="text-xs text-muted-foreground">{scriptsWithText.length}개 슬라이드 처리 중 (잠시 기다려주세요)</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


// --- Version History Button for Step4 Matching Editor ---
function VersionHistoryButton({ projectId, onRestore }: { projectId: number; onRestore: () => void }) {
  const [open, setOpen] = useState(false);
  const versionsQuery = trpc.lectureBuilder.listScriptVersions.useQuery(
    { projectId },
    { enabled: open }
  );
  const restoreMut = trpc.lectureBuilder.restoreScriptVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`버전 ${data.restoredVersion}으로 복원됨 (${data.sectionCount}개 섹션)`);
      setOpen(false);
      onRestore();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <History className="w-3 h-3" />
        버전 이력
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                스크립트 버전 이력
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2">
              {versionsQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !versionsQuery.data?.length ? (
                <p className="text-center text-muted-foreground py-6">저장된 버전이 없습니다</p>
              ) : (
                versionsQuery.data.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-500">v{v.versionNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.changeType === "manual" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {v.changeType === "manual" ? "수동" : "자동"}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.sectionCount}개 섹션</span>
                      </div>
                      {v.changeDescription && <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.changeDescription}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(v.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 flex-shrink-0"
                      disabled={restoreMut.isPending}
                      onClick={() => {
                        if (confirm(`버전 ${v.versionNumber}으로 복원하시겠습니까?`)) {
                          restoreMut.mutate({ projectId, versionId: v.id });
                        }
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" /> 복원
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// --- Pronunciation Guide Button & Panel for Step4 Matching Editor ---
function PronunciationGuideButton({ projectId }: { projectId: number }) {
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
function PronunciationHighlight({ text, projectId }: { text: string; projectId: number }) {
  const { t } = useLanguage();
  const guidesQuery = trpc.lectureBuilder.getPronunciationGuides.useQuery({ projectId });
  
  if (!text || !guidesQuery.data?.length) return null;

  const guides = guidesQuery.data;
  const matchedWords: { word: string; phonetic: string }[] = [];
  
  for (const guide of guides) {
    const regex = new RegExp(guide.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) {
      matchedWords.push({ word: guide.word, phonetic: guide.phonetic });
    }
  }

  if (matchedWords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <span className="text-[10px] text-muted-foreground/60 mr-1">{t("lectureBuilder.pronunciation.applied")}:</span>
      {matchedWords.map((m, i) => (
        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-[10px]">
          <span className="font-medium text-purple-700 dark:text-purple-300">{m.word}</span>
          <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
          <span className="text-purple-500 dark:text-purple-400">{m.phonetic}</span>
        </span>
      ))}
    </div>
  );
}
