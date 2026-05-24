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
import { useRoute, useLocation, Link } from "wouter";
import {
  Users, FileText, Image, Layers, Eye, ChevronLeft, ChevronRight, Plus, Trash2,
  Upload, Wand2, Loader2, GripVertical, Check, ArrowRight, Pencil, Circle,
  ArrowUpRight, CheckSquare, PenTool, MousePointer, Volume2, Play, Pause,
  Move, Settings2, Video, Download, X, Eraser, Palette, History, Undo2, Sparkles, Link2,
  Copy, Save, Globe, Languages, Headphones, Camera, UserCircle2, ImagePlus, Star, ArrowUpDown, Rocket, Presentation, Mic, CreditCard, Coins, StopCircle, Pin, Clock, Share2, ExternalLink, MessageCircle } from
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
import { useVideoProgress } from "@/hooks/useVideoProgress";
import ScriptAutocomplete from "@/components/ScriptAutocomplete";
import AvatarPresetPackages from "@/components/AvatarPresetPackages";
import { getSTEPS, getAVATAR_ROLES, getANNOTATION_TOOLS, PEN_COLORS } from "./lecture-builder/types";
import Step1Avatars from "./lecture-builder/Step1Avatars";
import Step2Scripts from "./lecture-builder/Step2Scripts";
import ImprovementHistoryPanel from "./lecture-builder/ImprovementHistoryPanel";
import Step3Slides from "./lecture-builder/Step3Slides";
import Step4Matching from "./lecture-builder/Step4Matching";
import Step5Preview from "./lecture-builder/Step5Preview";
import PPTAIScriptPanel from "./lecture-builder/PPTAIScriptPanel";
import SlideVoiceModePanel from "./lecture-builder/SlideVoiceModePanel";
import AICloneVoiceSection from "./lecture-builder/AICloneVoiceSection";
import BatchCloneVoiceButton from "./lecture-builder/BatchCloneVoiceButton";
import VersionHistoryButton from "./lecture-builder/VersionHistoryButton";
import PronunciationGuideButton from "./lecture-builder/PronunciationGuideButton";
import PronunciationHighlight from "./lecture-builder/PronunciationHighlight";



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
            <div className="flex items-center gap-2">
              <Link href="/video-history">
                <Button variant="outline" className="gap-2"><History className="w-4 h-4" />{t("lectureBuilder.videoHistoryBtn")}</Button>
              </Link>
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
