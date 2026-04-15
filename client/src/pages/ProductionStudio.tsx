import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useSearch } from "wouter";
import {
  Wand2, Play, FileText, Clock, Layers, Volume2, Trash2, ChevronRight,
  Loader2, Sparkles, Download, ArrowLeft, RefreshCw, Mic, UserCircle2, User2, Settings2, Edit3, History,
  BookTemplate, Image, CheckCircle2, XCircle, SkipForward, ListChecks, CheckSquare, Square, Upload, Camera,
  Presentation, Video, Zap, Film
} from "lucide-react";
import CreditGuardModal, { useCreditGuard } from "@/components/CreditGuardModal";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import { useTranslation } from "@/contexts/LanguageContext";

const CATEGORIES = [
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

// Voices loaded from server API (Gemini TTS voices)

export default function ProductionStudio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");

  // Script generation form
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("web3");
  const [difficulty, setDifficulty] = useState("beginner");
  const [language, setLanguage] = useState("ko");
  const [durationMin, setDurationMin] = useState(10);

  // Pipeline form
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [pipelineTitle, setPipelineTitle] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState("");
  const [selectedVoiceModId, setSelectedVoiceModId] = useState<string>("none");
  const [selectedFaceSwapId, setSelectedFaceSwapId] = useState<string>("none");

  // Avatar engine selection
  const [avatarEngine, setAvatarEngine] = useState<"d-id" | "heygen" | "kling" | "veo">("d-id");
  // Seedance 2.0 intro/outro
  const [seedanceIntro, setSeedanceIntro] = useState(false);
  const [seedanceOutro, setSeedanceOutro] = useState(false);
  const [seedanceIntroPrompt, setSeedanceIntroPrompt] = useState("");
  const [seedanceOutroPrompt, setSeedanceOutroPrompt] = useState("");

  // PIP mode + PPT upload
  const [pipEnabled, setPipEnabled] = useState(false);
  const [selectedPptId, setSelectedPptId] = useState<string>("none");
  const [pptUploadTitle, setPptUploadTitle] = useState("");
  const [pptUploading, setPptUploading] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number | null>(null);
  // Batch PIP state
  const [batchPipEnabled, setBatchPipEnabled] = useState(false);
  const [batchSelectedPptId, setBatchSelectedPptId] = useState<string>("none");

  // Batch processing state
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set());
  const [batchTtsVoiceId, setBatchTtsVoiceId] = useState("");

  // Load voices from server
  const { data: voicesData } = trpc.tts.voices.useQuery();
  const VOICES = useMemo(() => 
    (voicesData || []).map(v => ({ value: v.id, label: `${v.name} (${v.desc})` })),
    [voicesData]
  );

  // Set default voice when loaded
  useEffect(() => {
    if (VOICES.length > 0 && !ttsVoiceId) setTtsVoiceId(VOICES[0].value);
    if (VOICES.length > 0 && !batchTtsVoiceId) setBatchTtsVoiceId(VOICES[0].value);
  }, [VOICES]);
  const [batchVoiceModId, setBatchVoiceModId] = useState<string>("none");
  const [batchFaceSwapId, setBatchFaceSwapId] = useState<string>("none");
  const [batchResults, setBatchResults] = useState<any>(null);

  // Template from URL
  const searchString = useSearch();
  const templateId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("templateId") ? parseInt(params.get("templateId")!) : null;
  }, [searchString]);
  const selectedTemplateQuery = trpc.scriptTemplate.getById.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // Inline audio player for pipeline sections
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const sectionAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopSectionAudio = useCallback(() => {
    if (sectionAudioRef.current) {
      sectionAudioRef.current.pause();
      sectionAudioRef.current.currentTime = 0;
      sectionAudioRef.current = null;
    }
    setPlayingUrl(null);
  }, []);

  const playSectionAudio = useCallback((url: string) => {
    if (playingUrl === url) {
      stopSectionAudio();
      return;
    }
    stopSectionAudio();
    const audio = new Audio(url);
    sectionAudioRef.current = audio;
    setPlayingUrl(url);
    audio.onended = () => { setPlayingUrl(null); sectionAudioRef.current = null; };
    audio.onerror = () => { setPlayingUrl(null); sectionAudioRef.current = null; toast.error(t("ps.audioPlayFailed")); };
    audio.play().catch(() => { setPlayingUrl(null); toast.error(t("ps.audioPlayFailed")); });
  }, [playingUrl, stopSectionAudio, t]);

  // Credit guard
  const { modalState, checkCredits, closeModal } = useCreditGuard();
  const subscriptionQuery = trpc.subscription.my.useQuery(undefined, { enabled: !!user });
  const currentCredits = subscriptionQuery.data?.subscription?.creditsRemaining ?? 0;

  // Data queries
  const scriptsQuery = trpc.script.list.useQuery(undefined, { enabled: !!user });
  const [activePipelineId, setActivePipelineId] = useState<number | null>(null);
  const pipelinesQuery = trpc.pipeline.list.useQuery(undefined, { enabled: !!user });
  const hasRunningPipeline = pipelinesQuery.data?.some((item: any) => {
    const s = item.pipeline.status;
    return s !== "completed" && s !== "failed" && s !== "cancelled";
  }) ?? false;

  // Auto-refetch when pipeline is running
  useEffect(() => {
    if (!hasRunningPipeline && !activePipelineId) return;
    const interval = setInterval(() => { pipelinesQuery.refetch(); }, 2000);
    return () => clearInterval(interval);
  }, [hasRunningPipeline, activePipelineId]);
  const voiceModsQuery = trpc.voiceMod.list.useQuery(undefined, { enabled: !!user });
  const faceSwapsQuery = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });
  const sampleFacesQuery = trpc.sampleFace.list.useQuery(undefined, { enabled: true });
  const pptListQuery = trpc.ppt.list.useQuery(undefined, { enabled: !!user });
  const pptUploadMutation = trpc.ppt.upload.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.pptUploadSuccess"));
      pptListQuery.refetch();
      setSelectedPptId(data.id.toString());
      setPptUploadTitle("");
    },
    onError: (err) => toast.error(`${t("ps.pptUploadFailed")}: ${err.message}`),
  });
  const pipSettingsQuery = trpc.pip.get.useQuery(undefined, { enabled: !!user });

  // Mutations
  const generateScript = trpc.script.generate.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.scriptGenerationSuccess", { sectionCount: data.sectionCount, minutes: Math.round((data.estimatedDurationSec || 0) / 60) }));
      scriptsQuery.refetch();
      subscriptionQuery.refetch();
      setActiveTab("scripts");
    },
    onError: (err) => toast.error(err.message),
  });

  const startPipeline = trpc.pipeline.start.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.pipelineSuccess"));
      setActivePipelineId(null);
      pipelinesQuery.refetch();
      subscriptionQuery.refetch();
      setActiveTab("pipelines");
    },
    onError: (err) => {
      setActivePipelineId(null);
      toast.error(err.message);
    },
  });

  const deleteScript = trpc.script.delete.useMutation({
    onSuccess: () => { toast.success(t("ps.scriptDeleted")); scriptsQuery.refetch(); },
  });

  const deletePipeline = trpc.pipeline.delete.useMutation({
    onSuccess: () => { toast.success(t("ps.pipelineDeleted")); pipelinesQuery.refetch(); },
  });

  const cancelPipeline = trpc.pipeline.cancel.useMutation({
    onSuccess: () => {
      toast.success(t("ps.jobCancelled"), {
        description: t("ps.jobCancelledDesc"),
        duration: 5000,
      });
      pipelinesQuery.refetch();
    },
    onError: (err) => toast.error(`${t("ps.cancelFailed")}: ${err.message}`),
  });

  // Template-based script generation
  const generateFromTemplate = trpc.scriptTemplate.generateFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.templateScriptSuccess", { sectionCount: data.sectionCount }));
      scriptsQuery.refetch();
      setActiveTab("scripts");
    },
    onError: (err) => toast.error(err.message),
  });

  // Batch pipeline
  const batchStart = trpc.pipeline.batchStart.useMutation({
    onSuccess: (data) => {
      setBatchResults(data);
      toast.success(t("ps.batchComplete", { completed: data.summary.completed, failed: data.summary.failed }));
      pipelinesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Thumbnail generation
  const generateThumbnail = trpc.pipeline.generateThumbnail.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.thumbnailGenerated"));
      pipelinesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Face upload & profile creation for quick avatar
  const uploadFaceMutation = trpc.faceSwap.uploadFace.useMutation();
  const createFaceProfile = trpc.faceSwap.create.useMutation({
    onSuccess: () => faceSwapsQuery.refetch(),
    onError: (err) => toast.error(err.message),
  });

  // Apply template if coming from template library
  useEffect(() => {
    if (selectedTemplateQuery.data) {
      const t = selectedTemplateQuery.data;
      setTitle(t.name);
      setPrompt(t.prompt);
      setCategory(t.category);
      setDifficulty(t.difficulty);
      setLanguage(t.language);
      setDurationMin(t.durationMin);
    }
  }, [selectedTemplateQuery.data]);

  const handleGenerateScript = () => {
    const cost = templateId ? 1 : 5; // Template-based is cheaper
    checkCredits(cost, () => {
      if (templateId) {
        generateFromTemplate.mutate({ templateId });
      } else {
        generateScript.mutate({ title, prompt, category, difficulty, language, durationMin });
      }
    });
  };

  const handleStartPipeline = () => {
    if (!selectedScriptId) { toast.error(t("ps.noScriptSelected")); return; }
    if (selectedVoiceModId !== "none" && !voiceModsQuery.data?.find(v => v.id === selectedVoiceModId)) { toast.error(t("ps.selectVoiceModProfile")); return; }
    if (selectedFaceSwapId !== "none" && !faceSwapsQuery.data?.find(f => f.id === selectedFaceSwapId)) { toast.error(t("ps.selectFaceSwapProfile")); return; }
    if (pipEnabled && selectedPptId === "none") { toast.error(t("ps.selectPpt")); return; }

    const cost = 10; // TODO: more granular cost calculation
    checkCredits(cost, () => {
      toast.info(t("ps.startingVideoProduction"));
      startPipeline.mutate({
        scriptId: selectedScriptId!,
        title: pipelineTitle,
        ttsVoiceId,
        voiceModId: selectedVoiceModId === "none" ? null : selectedVoiceModId,
        faceSwapId: selectedFaceSwapId === "none" ? null : selectedFaceSwapId,
        avatarEngine,
        useSeedanceIntro: seedanceIntro,
        useSeedanceOutro: seedanceOutro,
        seedanceIntroPrompt: seedanceIntro ? seedanceIntroPrompt : null,
        seedanceOutroPrompt: seedanceOutro ? seedanceOutroPrompt : null,
        pipEnabled,
        pptId: pipEnabled && selectedPptId !== "none" ? parseInt(selectedPptId) : null,
      }, {
        onSuccess: (data: any) => {
          setActivePipelineId(data.id);
        }
      });
    });
  };

  const handleBatchStart = () => {
    if (batchSelectedIds.size === 0) { toast.error(t("ps.noScriptsSelectedForBatch")); return; }
    if (batchVoiceModId !== "none" && !voiceModsQuery.data?.find(v => v.id === batchVoiceModId)) { toast.error(t("ps.selectVoiceModProfile")); return; }
    if (batchFaceSwapId !== "none" && !faceSwapsQuery.data?.find(f => f.id === batchFaceSwapId)) { toast.error(t("ps.selectFaceSwapProfile")); return; }
    if (batchPipEnabled && batchSelectedPptId === "none") { toast.error(t("ps.selectPpt")); return; }

    const cost = 10 * batchSelectedIds.size;
    checkCredits(cost, () => {
      toast.info(t("ps.startingBatchJob"));
      batchStart.mutate({
        scriptIds: Array.from(batchSelectedIds),
        ttsVoiceId: batchTtsVoiceId,
        voiceModId: batchVoiceModId === "none" ? null : batchVoiceModId,
        faceSwapId: batchFaceSwapId === "none" ? null : batchFaceSwapId,
        pipEnabled: batchPipEnabled,
        pptId: batchPipEnabled && batchSelectedPptId !== "none" ? parseInt(batchSelectedPptId) : null,
      });
    });
  };

  const handlePptUpload = async (file: File) => {
    if (!file) { toast.error(t("ps.selectPptFile")); return; }
    if (!pptUploadTitle) { toast.error(t("ps.enterPptTitle")); return; }

    setPptUploading(true);
    toast.info(t("ps.uploadingFile"));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        await pptUploadMutation.mutateAsync({ title: pptUploadTitle, file: base64 });
        toast.success(t("ps.fileUploadSuccess"));
      };
    } catch (error) {
      toast.error(t("ps.fileUploadFailed"));
    }
    setPptUploading(false);
  };

  const handleQuickAvatar = async (file: File) => {
    if (!file) { toast.error(t("ps.uploadFacePhoto")); return; }
    const profileName = prompt(t("ps.enterProfileName"));
    if (!profileName) return;

    toast.info(t("ps.creatingFaceProfile"));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const { url } = await uploadFaceMutation.mutateAsync({ file: base64 });
        await createFaceProfile.mutateAsync({ name: profileName, imageUrl: url });
        toast.success(t("ps.faceProfileCreated"));
      };
    } catch (error) {
      toast.error(t("ps.faceProfileFailed"));
    }
  };

  const toggleBatchSelection = (id: number) => {
    const newSet = new Set(batchSelectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setBatchSelectedIds(newSet);
  };

  const selectAllForBatch = () => {
    const allReadyIds = scriptsQuery.data?.filter(s => s.status === "ready").map(s => s.id) || [];
    setBatchSelectedIds(new Set(allReadyIds));
  };

  const deselectAllForBatch = () => {
    setBatchSelectedIds(new Set());
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <CreditGuardModal {...modalState} subscription={subscriptionQuery.data?.subscription} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("ps.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("ps.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/studio/history"><History className="w-4 h-4 mr-2" />{t("ps.viewHistory")}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/deepfake"><UserCircle2 className="w-4 h-4 mr-2" />{t("ps.manageAvatars")}</Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="create"><Wand2 className="w-4 h-4 mr-2" />{t("ps.tabCreate")}</TabsTrigger>
          <TabsTrigger value="scripts"><FileText className="w-4 h-4 mr-2" />{t("ps.tabMyScripts")} ({scriptsQuery.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="produce"><Play className="w-4 h-4 mr-2" />{t("ps.tabProduceVideo")}</TabsTrigger>
          <TabsTrigger value="pipelines"><Layers className="w-4 h-4 mr-2" />{t("ps.tabPipelines")} ({pipelinesQuery.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="batch"><ListChecks className="w-4 h-4 mr-2" />{t("ps.tabBatchProcessing")}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Create Script */}
        <TabsContent value="create">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-violet-400" />{t("ps.createScriptTitle")}</CardTitle>
                  <CardDescription>{t("ps.createScriptDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">{t("ps.lectureTitle")}</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("ps.lectureTitlePlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="prompt">{t("ps.promptLabel")}</Label>
                    <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("ps.promptPlaceholder")} className="mt-1 min-h-[150px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("ps.categoryLabel")}</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label.includes("/") ? c.label : t(`ps.cat${c.value.charAt(0).toUpperCase() + c.value.slice(1)}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("ps.difficultyLabel")}</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{t(`ps.diff${d.value.charAt(0).toUpperCase() + d.value.slice(1)}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("ps.languageLabel")}</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ko">{t("ps.langKo")}</SelectItem>
                          <SelectItem value="en">{t("ps.langEn")}</SelectItem>
                          <SelectItem value="ja">{t("ps.langJa")}</SelectItem>
                          <SelectItem value="zh">{t("ps.langZh")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("ps.targetDurationLabel")}</Label>
                      <Input type="number" min={1} max={120} value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value) || 10)} className="mt-1" />
                    </div>
                  </div>
                  {/* Template indicator */}
                  {templateId && selectedTemplateQuery.data && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-2">
                          <BookTemplate className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-300">{t("ps.templateApplied")} {selectedTemplateQuery.data.name}</span>
                          <Badge variant="outline" className="text-xs">{t("ps.sectionCountBadge", { count: selectedTemplateQuery.data.sectionCount })}</Badge>
                          <Link href="/studio">
                            <Button size="sm" variant="ghost" className="text-xs ml-auto">{t("ps.removeTemplate")}</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Button onClick={handleGenerateScript} disabled={generateScript.isPending || generateFromTemplate.isPending} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    {(generateScript.isPending || generateFromTemplate.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("ps.generatingScript")}</> : <><Sparkles className="w-4 h-4 mr-2" />{templateId ? t("ps.generateFromTemplate") : t("ps.generateAIScript")}</>}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tips sidebar */}
            <div>
              <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                <CardHeader>
                  <CardTitle className="text-lg">{t("ps.promptTipsTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="p-3 bg-violet-500/10 rounded-lg">
                    <p className="font-medium text-violet-300 mb-1">{t("ps.tip1Title")}</p>
                    <p>{t("ps.tip1Desc")}</p>
                  </div>
                  <div className="p-3 bg-violet-500/10 rounded-lg">
                    <p className="font-medium text-violet-300 mb-1">{t("ps.tip2Title")}</p>
                    <p>{t("ps.tip2Desc")}</p>
                  </div>
                  <div className="p-3 bg-violet-500/10 rounded-lg">
                    <p className="font-medium text-violet-300 mb-1">{t("ps.tip3Title")}</p>
                    <p>{t("ps.tip3Desc")}</p>
                  </div>
                  <div className="p-3 bg-violet-500/10 rounded-lg">
                    <p className="font-medium text-violet-300 mb-1">{t("ps.tip4Title")}</p>
                    <p>{t("ps.tip4Desc")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: My Scripts */}
        <TabsContent value="scripts">
          <div className="space-y-4">
            {scriptsQuery.isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>}
            {scriptsQuery.data?.length === 0 && (
              <EmptyState
                type="scripts"
                title={t("ps.noScriptsTitle")}
                description={t("ps.noScriptsDesc")}
                actionLabel={t("ps.createScriptAction")}
                onAction={() => setActiveTab("create")}
              />
            )}
            {scriptsQuery.data?.map((script) => {
              const sections = script.sections ? JSON.parse(script.sections) : [];
              return (
                <Card key={script.id} className="hover:border-violet-500/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{script.title}</h3>
                          <Badge variant="outline" className={DIFFICULTIES.find(d => d.value === script.difficulty)?.color || ""}>
                            {t(`ps.diff${(script.difficulty || 'beginner').charAt(0).toUpperCase() + (script.difficulty || 'beginner').slice(1)}`)}
                          </Badge>
                          <Badge variant="outline">{CATEGORIES.find(c => c.value === script.category)?.label.includes("/") ? CATEGORIES.find(c => c.value === script.category)?.label : t(`ps.cat${(script.category || 'general').charAt(0).toUpperCase() + (script.category || 'general').slice(1)}`)}</Badge>
                          <Badge variant={script.status === "ready" ? "default" : script.status === "generating" ? "secondary" : "destructive"}>
                            {script.status === "ready" ? t("ps.statusReady") : script.status === "generating" ? t("ps.statusGenerating") : t("ps.statusError")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{script.prompt}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{t("ps.sectionCount", { count: script.sectionCount })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{t("ps.durationMinutes", { minutes: Math.round((script.estimatedDurationSec || 0) / 60) })}</span>
                          <span>{new Date(script.createdAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                        {sections.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {sections.slice(0, 5).map((s: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{i + 1}. {s.title}</Badge>
                            ))}
                            {sections.length > 5 && <Badge variant="outline" className="text-xs">+{sections.length - 5}{t("ps.moreItems")}</Badge>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Link href={`/script/${script.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit3 className="w-4 h-4 mr-1" />{t("ps.edit")}
                          </Button>
                        </Link>
                        <Button size="sm" variant="default" onClick={() => { setSelectedScriptId(script.id); setPipelineTitle(script.title); setActiveTab("produce"); }} disabled={script.status !== "ready"}>
                          <Play className="w-4 h-4 mr-1" />{t("ps.produceVideo")}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteScript.mutate({ id: script.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Produce Video */}
        <TabsContent value="produce">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-violet-400" /> {t("ps.oneClickVideoTitle")}</CardTitle>
                  <CardDescription>{t("ps.oneClickVideoDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>{t("ps.selectScript")}</Label>
                    <Select value={selectedScriptId?.toString() || ""} onValueChange={(v) => { setSelectedScriptId(parseInt(v)); const s = scriptsQuery.data?.find(s => s.id === parseInt(v)); if (s) setPipelineTitle(s.title); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("ps.selectScriptPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {scriptsQuery.data?.filter(s => s.status === "ready").map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.title} ({t("ps.sectionCountDuration", { count: s.sectionCount, minutes: Math.round((s.estimatedDurationSec || 0) / 60) })})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("ps.productionTitle")}</Label>
                    <Input value={pipelineTitle} onChange={(e) => setPipelineTitle(e.target.value)} placeholder={t("ps.videoTitlePlaceholder")} className="mt-1" />
                  </div>

                  <Separator />

                  <div>
                    <Label className="flex items-center gap-2 mb-3"><Volume2 className="w-4 h-4 text-violet-400" />{t("ps.audioSettings")}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">{t("ps.ttsVoice")}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VOICES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <VoicePreviewButton voiceId={ttsVoiceId} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">{t("ps.voiceCloning")}</Label>
                        <Select value={selectedVoiceModId} onValueChange={setSelectedVoiceModId}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("ps.none")}</SelectItem>
                            {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="flex items-center gap-2 mb-3"><User2 className="w-4 h-4 text-violet-400" />{t("ps.avatarSettings")}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">{t("ps.avatarEngine")}</Label>
                        <Select value={avatarEngine} onValueChange={(v) => setAvatarEngine(v as any)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="d-id">D-ID</SelectItem>
                            <SelectItem value="heygen">HeyGen</SelectItem>
                            <SelectItem value="kling">Kling AI</SelectItem>
                            <SelectItem value="veo">Google Veo 3.1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">{t("ps.faceSwapProfile")}</Label>
                        <Select value={selectedFaceSwapId} onValueChange={setSelectedFaceSwapId}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("ps.none")}</SelectItem>
                            {faceSwapsQuery.data?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5">
                      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-violet-400" />
                        {t("ps.quickAvatarTitle")}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleQuickAvatar(e.target.files[0])} />
                          <div className="flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-dashed border-border hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors">
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t("ps.uploadFacePhotoAction")}</span>
                          </div>
                        </label>
                        <Select onValueChange={(val) => createFaceProfile.mutate({ name: val, imageUrl: sampleFacesQuery.data?.find(f => f.name === val)?.url || "" })}>
                          <SelectTrigger className="text-xs h-auto py-2.5">
                            <SelectValue placeholder={t("ps.selectSampleFace")} />
                          </SelectTrigger>
                          <SelectContent>
                            {sampleFacesQuery.data?.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="flex items-center gap-2"><Film className="w-4 h-4 text-violet-400" />{t("ps.introOutroTitle")}</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch id="seedance-intro" checked={seedanceIntro} onCheckedChange={setSeedanceIntro} />
                          <Label htmlFor="seedance-intro" className="text-sm">{t("ps.intro")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch id="seedance-outro" checked={seedanceOutro} onCheckedChange={setSeedanceOutro} />
                          <Label htmlFor="seedance-outro" className="text-sm">{t("ps.outro")}</Label>
                        </div>
                      </div>
                    </div>
                    {(seedanceIntro || seedanceOutro) && (
                      <div className="space-y-3">
                        {seedanceIntro && <Input value={seedanceIntroPrompt} onChange={e => setSeedanceIntroPrompt(e.target.value)} placeholder={t("ps.introPromptPlaceholder")} />}
                        {seedanceOutro && <Input value={seedanceOutroPrompt} onChange={e => setSeedanceOutroPrompt(e.target.value)} placeholder={t("ps.outroPromptPlaceholder")} />}
                        <p className="text-xs text-muted-foreground">{t("ps.introOutroDesc")}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="flex items-center gap-2"><Presentation className="w-4 h-4 text-violet-400" />{t("ps.pipModeTitle")}</Label>
                      <Switch checked={pipEnabled} onCheckedChange={setPipEnabled} />
                    </div>
                    {pipEnabled && (
                      <div className="space-y-4">
                        <Select value={selectedPptId} onValueChange={setSelectedPptId}>
                          <SelectTrigger><SelectValue placeholder={t("ps.selectPptPlaceholder")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("ps.none")}</SelectItem>
                            {pptListQuery.data?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        {(() => {
                          if (!selectedPptId || selectedPptId === "none") return null;
                          const ppt = pptListQuery.data?.find(p => p.id.toString() === selectedPptId);
                          if (!ppt) return null;
                          const slides = ppt.slideUrls ? JSON.parse(ppt.slideUrls) as string[] : [];
                          if (slides.length === 0) return <p className="text-sm text-center text-muted-foreground py-4">{t("ps.noSlidesPreview")}</p>;

                          const pipPos = pipSettingsQuery.data?.position || "bottom-right";
                          const pipSz = pipSettingsQuery.data?.size || "medium";
                          const pipSh = pipSettingsQuery.data?.shape || "rounded";
                          const pipOp = pipSettingsQuery.data?.opacity || 80;

                          return (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">{t("ps.slidePreviewCount", { count: slides.length })}</p>
                              {(() => {
                                if (previewSlideIdx === null) {
                                  return (
                                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                      <Button onClick={() => setPreviewSlideIdx(0)}>{t("ps.showSlidePreview")}</Button>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="relative">
                                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                      <img src={slides[previewSlideIdx]} className="w-full h-full object-contain" alt={`Slide ${previewSlideIdx + 1}`} />
                                      <div className="absolute top-1/2 -translate-y-1/2 left-2">
                                        <button
                                          onClick={() => setPreviewSlideIdx(Math.max(0, previewSlideIdx - 1))}
                                          disabled={previewSlideIdx === 0}
                                          className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                                        >←</button>
                                      </div>
                                      <div className="absolute top-1/2 -translate-y-1/2 right-2">
                                        <button
                                          onClick={() => setPreviewSlideIdx(Math.min(slides.length - 1, previewSlideIdx + 1))}
                                          disabled={previewSlideIdx === slides.length - 1}
                                          className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                                        >→</button>
                                      </div>
                                      {/* PIP settings info bar */}
                                      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-white/60">
                                        <span>{t("ps.pipPositionLabel")} {t(`ps.pipPos${pipPos.replace(/-/g, "").split("").map(c => c.toUpperCase()).join("")}`)}</span>
                                        <span>·</span>
                                        <span>{t("ps.pipSizeLabel")} {t(`ps.pipSize${pipSz.charAt(0).toUpperCase() + pipSz.slice(1)}`)}</span>
                                        <span>·</span>
                                        <span>{t("ps.pipShapeLabel")} {t(`ps.pipShape${pipSh.charAt(0).toUpperCase() + pipSh.slice(1)}`)}</span>
                                        <span>·</span>
                                        <span>{t("ps.pipOpacityLabel")} {pipOp}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}

                        {/* Upload new PPT */}
                        <div className="p-3 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-violet-400" />
                            {t("ps.uploadNewPpt")}
                          </p>
                          <div className="space-y-2">
                            <Input
                              value={pptUploadTitle}
                              onChange={(e) => setPptUploadTitle(e.target.value)}
                              placeholder={t("ps.pptTitlePlaceholder")}
                              className="text-sm"
                            />
                            <label className="cursor-pointer block">
                              <input
                                type="file"
                                accept=".pptx,.pdf,.ppt"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePptUpload(file);
                                  e.target.value = "";
                                }}
                              />
                              <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed transition-colors ${
                                pptUploading ? "border-violet-500/50 bg-violet-500/10" : "border-border hover:border-violet-500/50 hover:bg-violet-500/5"
                              }`}>
                                {pptUploading || pptUploadMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 animate-spin text-violet-400" /><span className="text-sm">{t("ps.uploading")}</span></>
                                ) : (
                                  <><Upload className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{t("ps.selectPptFileAction")}</span></>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {t("ps.pipSettingsNote")}
                          {pipSettingsQuery.data && (
                            <span className="ml-1 text-violet-400">
                              ({t("ps.currentPipSettings")}: {t(`ps.pipPos${(pipSettingsQuery.data.position || 'bottom-right').replace(/-/g, "").split("").map(c => c.toUpperCase()).join("")}`)}, {t(`ps.pipSize${(pipSettingsQuery.data.size || 'medium').charAt(0).toUpperCase() + (pipSettingsQuery.data.size || 'medium').slice(1)}`)})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {startPipeline.isPending ? (() => {
                    // Find the active pipeline for real-time progress
                    const activePipeline = activePipelineId
                      ? pipelinesQuery.data?.find((item: any) => item.pipeline.id === activePipelineId)?.pipeline
                      : pipelinesQuery.data?.[0]?.pipeline;
                    const progress = activePipeline?.progressPercent || 0;
                    const step = activePipeline?.currentStep || t("ps.preparingTts");
                    return (
                    <div className="space-y-2">
                      <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                          <span className="text-sm font-medium">{t("ps.producingLectureVideo")}</span>
                        </div>
                        <Progress value={progress} className="h-2.5" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{step}</p>
                          <p className="text-xs font-semibold text-violet-400">{progress}%</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={cancelPipeline.isPending}
                        onClick={() => {
                          // If we have a pipeline ID from the response, cancel it server-side
                          const pipelineId = (startPipeline.data as any)?.id;
                          if (pipelineId) {
                            cancelPipeline.mutate({ id: pipelineId });
                          }
                          toast.info(t("ps.cancellingProduction"));
                          startPipeline.reset();
                        }}
                      >
                        {cancelPipeline.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4 mr-2" />
                        )}
                        {t("ps.stopProduction")}
                      </Button>
                    </div>
                    );
                  })() : (
                    <Button onClick={handleStartPipeline} disabled={!selectedScriptId} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                      <Sparkles className="w-4 h-4 mr-2" />{t("ps.startOneClickProduction")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Selected script preview */}
            <div>
              {selectedScriptId && scriptsQuery.data?.find(s => s.id === selectedScriptId) ? (() => {
                const script = scriptsQuery.data!.find(s => s.id === selectedScriptId)!;
                const sections = script.sections ? JSON.parse(script.sections) : [];
                return (
                  <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                    <CardHeader>
                      <CardTitle className="text-lg">{t("ps.scriptPreview")}</CardTitle>
                      <CardDescription>{script.title}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {sections.map((s: any, i: number) => (
                            <div key={i} className="p-3 bg-card/50 rounded-lg border border-border/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{i + 1}. {s.title}</span>
                                <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{t("ps.durationMinutesShort", { minutes: Math.round(s.durationSec / 60) })}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3">{s.content}</p>
                              {s.slideNotes && <p className="text-xs text-violet-400 mt-2">📝 {s.slideNotes}</p>}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })() : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium">{t("ps.noScriptPreviewTitle")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t("ps.noScriptPreviewDesc")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Pipelines */}
        <TabsContent value="pipelines">
          <div className="space-y-4">
            {pipelinesQuery.isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>}
            {pipelinesQuery.data?.length === 0 && (
              <EmptyState
                type="pipelines"
                title={t("ps.noPipelinesTitle")}
                description={t("ps.noPipelinesDesc")}
                actionLabel={t("ps.produceVideoAction")}
                onAction={() => setActiveTab("produce")}
              />
            )}
            {pipelinesQuery.data?.map(({ pipeline, script }) => {
              const status = pipeline.status;
              const isRunning = status !== 'completed' && status !== 'failed' && status !== 'cancelled';
              const isSuccess = status === 'completed';
              const isFailed = status === 'failed' || status === 'cancelled';

              return (
                <Card key={pipeline.id} className={`${isRunning ? "border-violet-500/50 bg-violet-500/5" : ""} transition-all`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{pipeline.title}</h3>
                          <Badge variant={isSuccess ? "success" : isFailed ? "destructive" : "secondary"}>
                            {t(`ps.pipelineStatus${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                          </Badge>
                          {pipeline.avatarEngine && <Badge variant="outline">{({"d-id":"D-ID","heygen":"HeyGen","kling":"Kling AI","veo":"Google Veo"} as Record<string,string>)[pipeline.avatarEngine] || pipeline.avatarEngine}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{t("ps.originalScript")}: {script.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{t("ps.sections", { count: script.sectionCount })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{t("ps.durationMinutes", { minutes: Math.round((script.estimatedDurationSec || 0) / 60) })}</span>
                          <span>{new Date(pipeline.createdAt).toLocaleString("ko-KR")}</span>
                        </div>
                        {isRunning && (
                          <div className="mt-3 space-y-2">
                            <Progress value={pipeline.progressPercent || 0} className="h-2" />
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">{pipeline.currentStep}</p>
                              <p className="text-xs font-semibold text-violet-400">{pipeline.progressPercent || 0}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {isSuccess && (
                          <>
                            <Button size="sm" variant="outline" asChild>
                              <a href={pipeline.videoUrl!} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-1" />{t("ps.downloadVideo")}</a>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateThumbnail.mutate({ pipelineId: pipeline.id })} disabled={generateThumbnail.isPending && generateThumbnail.variables?.pipelineId === pipeline.id}>
                              {generateThumbnail.isPending && generateThumbnail.variables?.pipelineId === pipeline.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4 mr-1" />}
                              {t("ps.generateThumbnail")}
                            </Button>
                          </>
                        )}
                        {isRunning && (
                          <Button size="sm" variant="destructive" onClick={() => cancelPipeline.mutate({ id: pipeline.id })} disabled={cancelPipeline.isPending}>
                            {cancelPipeline.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePipeline.mutate({ id: pipeline.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {pipeline.status === 'failed' && pipeline.failReason && (
                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-foreground">
                        <p className="font-semibold mb-1">{t("ps.failureReason")}</p>
                        <p className="text-xs">{pipeline.failReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 5: Batch Processing */}
        <TabsContent value="batch">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-violet-400" />{t("ps.batchProcessingTitle")}</CardTitle>
                  <CardDescription>{t("ps.batchProcessingDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Button size="sm" onClick={selectAllForBatch}>{t("ps.selectAll")}</Button>
                    <Button size="sm" variant="secondary" onClick={deselectAllForBatch}>{t("ps.deselectAll")}</Button>
                    <span className="ml-auto text-sm font-medium">{t("ps.selectedCount", { count: batchSelectedIds.size })}</span>
                  </div>
                  <ScrollArea className="h-[400px] pr-4 -mr-4">
                    <div className="space-y-2">
                      {scriptsQuery.data?.filter(s => s.status === 'ready').map(script => (
                        <div
                          key={script.id}
                          onClick={() => toggleBatchSelection(script.id)}
                          className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                            batchSelectedIds.has(script.id)
                              ? "bg-violet-500/10 border-violet-500/30"
                              : "hover:bg-muted/50"
                          }`}>
                          {batchSelectedIds.has(script.id) ? <CheckSquare className="w-5 h-5 text-violet-400" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                          <div className="flex-1">
                            <p className="font-medium">{script.title}</p>
                            <p className="text-xs text-muted-foreground">{t("ps.sectionCountDuration", { count: script.sectionCount, minutes: Math.round((script.estimatedDurationSec || 0) / 60) })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              {batchResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("ps.batchResultsTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>{t("ps.batchSummary", { completed: batchResults.summary.completed, failed: batchResults.summary.failed, total: batchResults.summary.total })}</p>
                      {batchResults.failedJobs.length > 0 && (
                        <div>
                          <p className="font-semibold mt-2">{t("ps.failedJobs")}:</p>
                          <ul className="list-disc list-inside text-sm text-destructive">
                            {batchResults.failedJobs.map((job: any) => (
                              <li key={job.scriptId}>{t("ps.failedJobItem", { title: job.scriptTitle, reason: job.reason })}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button onClick={() => setBatchResults(null)} variant="outline" size="sm" className="mt-2">{t("ps.closeResults")}</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div>
              <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20 sticky top-20">
                <CardHeader>
                  <CardTitle>{t("ps.batchSettings")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">{t("ps.ttsVoice")}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Select value={batchTtsVoiceId} onValueChange={setBatchTtsVoiceId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VOICES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <VoicePreviewButton voiceId={batchTtsVoiceId} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">{t("ps.voiceCloning")}</Label>
                    <Select value={batchVoiceModId} onValueChange={setBatchVoiceModId}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("ps.none")}</SelectItem>
                        {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">{t("ps.faceSwapProfile")}</Label>
                    <Select value={batchFaceSwapId} onValueChange={setBatchFaceSwapId}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("ps.none")}</SelectItem>
                        {faceSwapsQuery.data?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">{t("ps.pipModeTitle")}</Label>
                      <Switch checked={batchPipEnabled} onCheckedChange={setBatchPipEnabled} />
                    </div>
                    {batchPipEnabled && (
                      <Select value={batchSelectedPptId} onValueChange={setBatchSelectedPptId}>
                        <SelectTrigger><SelectValue placeholder={t("ps.selectPptPlaceholder")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("ps.none")}</SelectItem>
                          {pptListQuery.data?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={handleBatchStart} disabled={batchStart.isPending || batchSelectedIds.size === 0} className="w-full">
                    {batchStart.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("ps.batchInProgress")}</> : <><Zap className="w-4 h-4 mr-2" />{t("ps.startBatchJobAction", { count: batchSelectedIds.size })}</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
