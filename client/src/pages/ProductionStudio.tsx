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
  Presentation, Video, Zap, Film, Languages, Globe, StopCircle, CircleDot, RotateCcw, Eye, Palette
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
  const [avatarEngine, setAvatarEngine] = useState<"d-id" | "heygen">("d-id");
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

  // Interpreter mode state
  const [interpreterEnabled, setInterpreterEnabled] = useState(false);
  const [interpreterLanguage, setInterpreterLanguage] = useState("en");
  const [interpreterVoiceId, setInterpreterVoiceId] = useState("");
  const [interpreterSections, setInterpreterSections] = useState<Array<{originalContent: string; interpretedContent: string; durationSec: number}>>([]);

  // Direct recording state
  const [useDirectRecording, setUseDirectRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Subtitle segments for direct recording
  const [subtitleSegments, setSubtitleSegments] = useState<Array<{start: number; end: number; text: string}>>([]);

  // Draggable PiP avatar position & size
  const [pipPosition, setPipPosition] = useState({ x: 75, y: 75 });
  const [pipSizePercent, setPipSizePercent] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pipX: 0, pipY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, size: 25 });
  const slideContainerRef = useRef<HTMLDivElement>(null);
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
  const updatePipMutation = trpc.pip.update.useMutation();

  // Hydrate PiP position from saved settings
  useEffect(() => {
    if (pipSettingsQuery.data) {
      const s = pipSettingsQuery.data;
      if (s.position === "custom" && s.customX != null && s.customY != null) {
        setPipPosition({ x: s.customX, y: s.customY });
      } else {
        const posMap: Record<string, { x: number; y: number }> = {
          "bottom-right": { x: 80, y: 80 },
          "bottom-left": { x: 20, y: 80 },
          "top-right": { x: 80, y: 20 },
          "top-left": { x: 20, y: 20 },
        };
        setPipPosition(posMap[s.position] || { x: 75, y: 75 });
      }
      if (s.size === "small") setPipSizePercent(15);
      else if (s.size === "large") setPipSizePercent(40);
      else setPipSizePercent(25);
    }
  }, [pipSettingsQuery.data]);

  // Drag handlers for PiP avatar
  const onPipDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!slideContainerRef.current) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, pipX: pipPosition.x, pipY: pipPosition.y };
    e.preventDefault();
    e.stopPropagation();
  };

  const onPipDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !slideContainerRef.current) return;
    const rect = slideContainerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const newX = dragStartRef.current.pipX + (deltaX / rect.width) * 100;
    const newY = dragStartRef.current.pipY + (deltaY / rect.height) * 100;
    setPipPosition({ x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) });
  }, [isDragging]);

  const onPipDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save position
      updatePipMutation.mutate({
        position: "custom",
        customX: Math.round(pipPosition.x),
        customY: Math.round(pipPosition.y),
        size: pipSizePercent < 20 ? "small" : pipSizePercent > 35 ? "large" : "medium",
      });
    }
  }, [isDragging, pipPosition, pipSizePercent]);

  // Resize handlers
  const onResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, size: pipSizePercent };
    e.preventDefault();
    e.stopPropagation();
  };

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !slideContainerRef.current) return;
    const rect = slideContainerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaPercent = (deltaX / rect.width) * 100;
    const newSize = resizeStartRef.current.size + deltaPercent;
    setPipSizePercent(Math.max(10, Math.min(60, newSize)));
  }, [isResizing]);

  const onResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      updatePipMutation.mutate({
        position: "custom",
        customX: Math.round(pipPosition.x),
        customY: Math.round(pipPosition.y),
        size: pipSizePercent < 20 ? "small" : pipSizePercent > 35 ? "large" : "medium",
      });
    }
  }, [isResizing, pipPosition, pipSizePercent]);

  // Window event listeners for drag/resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onPipDragMove);
      window.addEventListener("mouseup", onPipDragEnd);
    } else {
      window.removeEventListener("mousemove", onPipDragMove);
      window.removeEventListener("mouseup", onPipDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onPipDragMove);
      window.removeEventListener("mouseup", onPipDragEnd);
    };
  }, [isDragging, onPipDragMove, onPipDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", onResizeMove);
      window.addEventListener("mouseup", onResizeEnd);
    } else {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeEnd);
    };
  }, [isResizing, onResizeMove, onResizeEnd]);

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

  const createDirectScript = trpc.script.createDirect.useMutation({
    onSuccess: (data) => {
      toast.success(t("ps.directScriptSuccess", { sectionCount: data.sectionCount, minutes: Math.round((data.estimatedDurationSec || 0) / 60) }));
      scriptsQuery.refetch();
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

  // Auto-translate interpreter script
  const autoTranslateMut = trpc.script.autoTranslate.useMutation({
    onSuccess: (data) => {
      setInterpreterSections(data.sections.map((s: any) => ({ originalContent: '', interpretedContent: s.content, durationSec: 60 })));
      toast.success(t("ps.autoTranslateSuccess"));
    },
    onError: (err) => toast.error(err.message),
  });

  // Generate subtitles from recording via STT
  const generateSubtitlesMut = trpc.script.generateSubtitles.useMutation({
    onSuccess: (data) => {
      setSubtitleSegments(data.segments);
      toast.success(t("ps.subtitlesGenerated"));
    },
    onError: (err) => toast.error(err.message),
  });

  // Format time helper
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // SRT export helper
  const formatSrtTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')},${ms.toString().padStart(3,'0')}`;
  };

  const exportSrt = () => {
    if (subtitleSegments.length === 0) return;
    const srt = subtitleSegments.map((seg, i) => 
      `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n`
    ).join('\n');
    const blob = new Blob([srt], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('ps.srtExported'));
  };

  // Interpreter preview player state
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewSectionIdx, setPreviewSectionIdx] = useState(0);
  const [previewIsOriginal, setPreviewIsOriginal] = useState(true);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopPreview = useCallback(() => {
    setPreviewPlaying(false);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    window.speechSynthesis.cancel();
  }, []);

  const playPreviewSection = useCallback((sections: any[], interpSections: any[], idx: number, isOrig: boolean) => {
    if (idx >= sections.length) { stopPreview(); return; }
    setPreviewSectionIdx(idx);
    setPreviewIsOriginal(isOrig);
    const text = isOrig ? sections[idx]?.content : (interpSections[idx]?.interpretedContent || sections[idx]?.content);
    if (!text) { stopPreview(); return; }
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 200));
    utterance.lang = isOrig ? language : interpreterLanguage;
    utterance.rate = 1.0;
    speechSynthRef.current = utterance;
    utterance.onend = () => {
      if (isOrig && interpSections.length > 0) {
        playPreviewSection(sections, interpSections, idx, false);
      } else {
        playPreviewSection(sections, interpSections, idx + 1, true);
      }
    };
    utterance.onerror = () => {
      if (isOrig && interpSections.length > 0) {
        previewTimerRef.current = setTimeout(() => playPreviewSection(sections, interpSections, idx, false), 500);
      } else {
        previewTimerRef.current = setTimeout(() => playPreviewSection(sections, interpSections, idx + 1, true), 500);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, [language, interpreterLanguage, stopPreview]);

  // Preset share helpers
  const exportPresetCode = (preset: any) => {
    const data = { n: preset.name, x: preset.customX, y: preset.customY, w: preset.customWidth, h: preset.customHeight, o: preset.opacity, s: preset.shape, p: preset.position };
    const code = btoa(JSON.stringify(data));
    navigator.clipboard.writeText(code);
    toast.success(t('ps.presetCodeCopied'));
  };

  const importPresetCode = () => {
    const code = window.prompt(t('ps.enterPresetCode'));
    if (!code) return;
    try {
      const data = JSON.parse(atob(code));
      savePipPreset.mutate({ name: data.n || 'Imported', customX: data.x ?? 75, customY: data.y ?? 75, customWidth: data.w ?? 25, customHeight: data.h ?? 25, opacity: data.o ?? 100, shape: data.s || 'rounded', position: data.p || 'custom' });
    } catch {
      toast.error(t('ps.invalidPresetCode'));
    }
  };

  // PiP Presets
  const pipPresetsQuery = trpc.pip.presets.useQuery(undefined, { enabled: !!user });
  const savePipPreset = trpc.pip.savePreset.useMutation({
    onSuccess: () => { pipPresetsQuery.refetch(); toast.success(t("ps.presetSaved")); },
    onError: (err) => toast.error(err.message),
  });
  const deletePipPreset = trpc.pip.deletePreset.useMutation({
    onSuccess: () => { pipPresetsQuery.refetch(); toast.success(t("ps.presetDeleted")); },
    onError: (err) => toast.error(err.message),
  });

  // Gallery state (v8.8)
  const [gallerySortBy, setGallerySortBy] = useState<"latest" | "popular">("popular");
  const [subtitleGallerySortBy, setSubtitleGallerySortBy] = useState<"latest" | "popular">("popular");
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
  const [subtitleSelectedTagId, setSubtitleSelectedTagId] = useState<number | undefined>(undefined);

  // Community shared presets (v8.7)
  const sharedPresetsQuery = trpc.sharedPreset.list.useQuery({ sortBy: gallerySortBy });
  const sharePresetMut = trpc.sharedPreset.share.useMutation({
    onSuccess: () => { sharedPresetsQuery.refetch(); toast.success(t("ps.presetSharedToGallery")); },
    onError: (err: any) => toast.error(err.message),
  });
  const likePresetMut = trpc.sharedPreset.like.useMutation({
    onSuccess: () => { sharedPresetsQuery.refetch(); myLikesQuery.refetch(); },
  });
  const downloadPresetMut = trpc.sharedPreset.download.useMutation();
  const deleteSharedPresetMut = trpc.sharedPreset.delete.useMutation({
    onSuccess: () => { sharedPresetsQuery.refetch(); toast.success(t("ps.presetDeleted")); },
  });
  const myLikesQuery = trpc.sharedPreset.myLikes.useQuery();

  // Subtitle style (v8.7)
  const subtitleStyleQuery = trpc.subtitleStyle.get.useQuery();
  const updateSubtitleStyleMut = trpc.subtitleStyle.update.useMutation({
    onSuccess: () => { subtitleStyleQuery.refetch(); toast.success(t("ps.subtitleStyleSaved")); },
  });
  const [subtitleFontSize, setSubtitleFontSize] = useState(16);
  const [subtitleFontColor, setSubtitleFontColor] = useState("#FFFFFF");
  const [subtitleBgColor, setSubtitleBgColor] = useState("rgba(0,0,0,0.7)");
  const [subtitlePosition, setSubtitlePosition] = useState<"top" | "bottom" | "custom">("bottom");
  const [subtitleFontFamily, setSubtitleFontFamily] = useState("sans-serif");
  const [subtitleBold, setSubtitleBold] = useState(false);
  const [subtitleItalic, setSubtitleItalic] = useState(false);
  const [subtitleOutline, setSubtitleOutline] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [showSubtitleGallery, setShowSubtitleGallery] = useState(false);

  // Shared subtitle presets (v8.8)
  const sharedSubtitlePresetsQuery = trpc.sharedSubtitlePreset.list.useQuery({ sortBy: subtitleGallerySortBy, tagId: subtitleSelectedTagId });
  const shareSubtitlePresetMut = trpc.sharedSubtitlePreset.share.useMutation({
    onSuccess: () => { sharedSubtitlePresetsQuery.refetch(); toast.success(t("ps.presetSharedToGallery")); },
    onError: (err: any) => toast.error(err.message),
  });
  const likeSubtitlePresetMut = trpc.sharedSubtitlePreset.like.useMutation({
    onSuccess: () => { sharedSubtitlePresetsQuery.refetch(); mySubtitleLikesQuery.refetch(); },
  });
  const downloadSubtitlePresetMut = trpc.sharedSubtitlePreset.download.useMutation();
  const deleteSharedSubtitlePresetMut = trpc.sharedSubtitlePreset.delete.useMutation({
    onSuccess: () => { sharedSubtitlePresetsQuery.refetch(); toast.success(t("ps.presetDeleted")); },
  });
  const mySubtitleLikesQuery = trpc.sharedSubtitlePreset.myLikes.useQuery();

  // Preset tags (v8.8)
  const avatarTagsQuery = trpc.presetTag.popular.useQuery({ category: "avatar", limit: 15 });
  const subtitleTagsQuery = trpc.presetTag.popular.useQuery({ category: "subtitle", limit: 15 });
  const allTagsQuery = trpc.presetTag.popular.useQuery({ limit: 30 });

  // Hydrate subtitle style from DB
  useEffect(() => {
    if (subtitleStyleQuery.data) {
      const s = subtitleStyleQuery.data;
      if (s.fontSize) setSubtitleFontSize(s.fontSize);
      if (s.fontColor) setSubtitleFontColor(s.fontColor);
      if (s.bgColor) setSubtitleBgColor(s.bgColor);
      if (s.position) setSubtitlePosition(s.position as any);
      if (s.fontFamily) setSubtitleFontFamily(s.fontFamily);
      if (s.bold !== null) setSubtitleBold(!!s.bold);
      if (s.italic !== null) setSubtitleItalic(!!s.italic);
      if (s.outline !== null) setSubtitleOutline(!!s.outline);
    }
  }, [subtitleStyleQuery.data]);

  // Apply template if coming from template library
  useEffect(() => {
    if (selectedTemplateQuery.data) {
      const t = selectedTemplateQuery.data;
      setTitle(t.name);
      setPrompt(t.name);
      setCategory(t.category);
      setDifficulty(t.difficulty);
      setLanguage("ko");
      setDurationMin(t.targetDurationMin || 10);
    }
  }, [selectedTemplateQuery.data]);

  const handleGenerateScript = () => {
    const cost = templateId ? 1 : 5; // Template-based is cheaper
    if (!checkCredits("script_generate", currentCredits, cost)) return;
    if (templateId) {
      generateFromTemplate.mutate({ templateId, title, prompt });
    } else {
      generateScript.mutate({ title, prompt, category: category as any, difficulty: difficulty as any, language, targetDurationMin: durationMin });
    }
  };

  const handleCreateDirectScript = () => {
    if (!title.trim()) { toast.error(t("ps.lectureTitle")); return; }
    if (!prompt.trim() || prompt.trim().length < 10) { toast.error(t("ps.directScriptMinLength")); return; }
    createDirectScript.mutate({
      title,
      content: prompt,
      category: category as any,
      difficulty: difficulty as any,
      language,
      targetDurationMin: durationMin,
    });
  };

  const handleStartPipeline = () => {
    if (!selectedScriptId) { toast.error(t("ps.noScriptSelected")); return; }
    if (selectedVoiceModId !== "none" && !voiceModsQuery.data?.find(v => String(v.id) === selectedVoiceModId)) { toast.error(t("ps.selectVoiceModProfile")); return; }
    if (selectedFaceSwapId !== "none" && !faceSwapsQuery.data?.find(f => String(f.id) === selectedFaceSwapId)) { toast.error(t("ps.selectFaceSwapProfile")); return; }
    if (pipEnabled && selectedPptId === "none") { toast.error(t("ps.selectPpt")); return; }

    const cost = 10; // TODO: more granular cost calculation
    if (!checkCredits("pipeline_start", currentCredits, cost)) return;
    toast.info(t("ps.startingVideoProduction"));
    startPipeline.mutate({
        scriptId: selectedScriptId!,
        title: pipelineTitle,
        ttsVoiceId,
        voiceModProfileId: selectedVoiceModId === "none" ? undefined : parseInt(selectedVoiceModId),
        faceSwapProfileId: selectedFaceSwapId === "none" ? undefined : parseInt(selectedFaceSwapId),
        avatarEngine,
        seedanceIntro: seedanceIntro,
        seedanceOutro: seedanceOutro,
        seedanceIntroPrompt: seedanceIntro ? seedanceIntroPrompt : undefined,
        seedanceOutroPrompt: seedanceOutro ? seedanceOutroPrompt : undefined,
        pipEnabled,
        pptUploadId: pipEnabled && selectedPptId !== "none" ? parseInt(selectedPptId) : undefined,
    }, {
      onSuccess: (data: any) => {
        setActivePipelineId(data.id);
      }
    });
  };

  const handleBatchStart = () => {
    if (batchSelectedIds.size === 0) { toast.error(t("ps.noScriptsSelectedForBatch")); return; }
    if (batchVoiceModId !== "none" && !voiceModsQuery.data?.find(v => String(v.id) === batchVoiceModId)) { toast.error(t("ps.selectVoiceModProfile")); return; }
    if (batchFaceSwapId !== "none" && !faceSwapsQuery.data?.find(f => String(f.id) === batchFaceSwapId)) { toast.error(t("ps.selectFaceSwapProfile")); return; }
    if (batchPipEnabled && batchSelectedPptId === "none") { toast.error(t("ps.selectPpt")); return; }

    const cost = 10 * batchSelectedIds.size;
    if (!checkCredits("pipeline_start", currentCredits, cost)) return;
    toast.info(t("ps.startingBatchJob"));
    const batchItems = Array.from(batchSelectedIds).map(scriptId => {
      const s = scriptsQuery.data?.find(sc => sc.id === scriptId);
      return {
        scriptId,
        title: s?.title || "Untitled",
        ttsVoiceId: batchTtsVoiceId,
        voiceModProfileId: batchVoiceModId === "none" ? undefined : parseInt(batchVoiceModId),
        faceSwapProfileId: batchFaceSwapId === "none" ? undefined : parseInt(batchFaceSwapId),
      };
    });
    batchStart.mutate({
        items: batchItems,
        pipEnabled: batchPipEnabled,
        pptUploadId: batchPipEnabled && batchSelectedPptId !== "none" ? parseInt(batchSelectedPptId) : undefined,
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
        const fileName = file.name || 'upload.pptx';
        const mimeType = file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        await pptUploadMutation.mutateAsync({ title: pptUploadTitle, fileName, fileData: base64.split(',')[1] || base64, mimeType });
        toast.success(t("ps.fileUploadSuccess"));
      };
    } catch (error) {
      toast.error(t("ps.fileUploadFailed"));
    }
    setPptUploading(false);
  };

  const handleQuickAvatar = async (file: File) => {
    if (!file) { toast.error(t("ps.uploadFacePhoto")); return; }
    const profileName = window.prompt(t("ps.enterProfileName"));
    if (!profileName) return;

    toast.info(t("ps.creatingFaceProfile"));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const { url } = await uploadFaceMutation.mutateAsync({ imageData: base64, fileName: `face-${Date.now()}.png`, type: "target" as const });
        await createFaceProfile.mutateAsync({ name: profileName, targetFaceUrl: url });
        toast.success(t("ps.faceProfileCreated"));
      };
    } catch (error) {
      toast.error(t("ps.faceProfileFailed"));
    }
  };

  // Direct Recording handlers
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      webcamStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        webcamStreamRef.current = null;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') toast.error(t("ps.webcamPermissionDenied"));
      else toast.error(t("ps.noWebcamFound"));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleDeleteRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingDuration(0);
  };

  const handleUploadRecording = async () => {
    if (!recordedBlob) return;
    toast.info(t("ps.uploadingFile"));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(recordedBlob);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const { url } = await uploadFaceMutation.mutateAsync({ imageData: base64, fileName: `recording-${Date.now()}.webm`, type: "target" as const });
        toast.success(t("ps.recordingUploaded"));
        // Store the URL for pipeline use
        setRecordedUrl(url);
      };
    } catch (error) {
      toast.error(t("ps.recordingUploadFailed"));
    }
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => t.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordedUrl && recordedUrl.startsWith('blob:')) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

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
      <CreditGuardModal open={modalState.open} onClose={closeModal} featureKey={modalState.featureKey} currentCredits={modalState.currentCredits} requiredCredits={modalState.requiredCredits} />
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
                  {/* Interpreter Mode Toggle */}
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <Languages className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">{t("ps.interpreterMode")}</span>
                        </Label>
                        <Switch checked={interpreterEnabled} onCheckedChange={setInterpreterEnabled} />
                      </div>
                      {interpreterEnabled && (
                        <div className="space-y-3 pt-2 border-t border-blue-500/10">
                          <p className="text-xs text-muted-foreground">{t("ps.interpreterModeDesc")}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">{t("ps.interpreterLanguage")}</Label>
                              <Select value={interpreterLanguage} onValueChange={setInterpreterLanguage}>
                                <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="ko">한국어</SelectItem>
                                  <SelectItem value="ja">日本語</SelectItem>
                                  <SelectItem value="zh">中文</SelectItem>
                                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                                  <SelectItem value="th">ไทย</SelectItem>
                                  <SelectItem value="es">Español</SelectItem>
                                  <SelectItem value="fr">Français</SelectItem>
                                  <SelectItem value="de">Deutsch</SelectItem>
                                  <SelectItem value="pt">Português</SelectItem>
                                  <SelectItem value="ru">Русский</SelectItem>
                                  <SelectItem value="ar">العربية</SelectItem>
                                  <SelectItem value="hi">हिन्दी</SelectItem>
                                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">{t("ps.interpreterVoice")}</Label>
                              <Select value={interpreterVoiceId} onValueChange={setInterpreterVoiceId}>
                                <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Select voice" /></SelectTrigger>
                                <SelectContent>
                                  {VOICES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Template indicator */}
                  {templateId && selectedTemplateQuery.data && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-2">
                          <BookTemplate className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-300">{t("ps.templateApplied")} {selectedTemplateQuery.data.name}</span>
                          <Badge variant="outline" className="text-xs">{t("ps.sectionCountBadge", { count: selectedTemplateQuery.data.sectionCount || 0 })}</Badge>
                          <Link href="/studio">
                            <Button size="sm" variant="ghost" className="text-xs ml-auto">{t("ps.removeTemplate")}</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Button onClick={handleGenerateScript} disabled={generateScript.isPending || generateFromTemplate.isPending || createDirectScript.isPending} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    {(generateScript.isPending || generateFromTemplate.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("ps.generatingScript")}</> : <><Sparkles className="w-4 h-4 mr-2" />{templateId ? t("ps.generateFromTemplate") : t("ps.generateAIScript")}</>}
                  </Button>
                  <div className="flex items-center gap-3 my-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground font-medium">{t("ps.orDivider")}</span>
                    <Separator className="flex-1" />
                  </div>
                  <Button onClick={handleCreateDirectScript} disabled={createDirectScript.isPending || generateScript.isPending} variant="outline" className="w-full border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50">
                    {createDirectScript.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("ps.savingDirectScript")}</> : <><FileText className="w-4 h-4 mr-2 text-emerald-400" />{t("ps.useMyScript")}</>}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 text-center">{t("ps.directScriptDesc")}</p>
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
                          <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{t("ps.sectionCount", { count: script.sectionCount || 0 })}</span>
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
                          <SelectItem key={s.id} value={s.id.toString()}>{s.title} ({t("ps.sectionCountDuration", { count: s.sectionCount || 0, minutes: Math.round((s.estimatedDurationSec || 0) / 60) })})</SelectItem>
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
                            {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
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
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">{t("ps.faceSwapProfile")}</Label>
                        <Select value={selectedFaceSwapId} onValueChange={setSelectedFaceSwapId}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("ps.none")}</SelectItem>
                            {faceSwapsQuery.data?.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
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
                        <Select onValueChange={(val) => createFaceProfile.mutate({ name: val, targetFaceUrl: sampleFacesQuery.data?.find(f => f.name === val)?.imageUrl || "" })}>
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

                  {/* Direct Recording Mode */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="flex items-center gap-2"><Camera className="w-4 h-4 text-orange-400" />{t("ps.directRecording")}</Label>
                      <Switch checked={useDirectRecording} onCheckedChange={setUseDirectRecording} />
                    </div>
                    {useDirectRecording && (
                      <Card className="bg-orange-500/5 border-orange-500/20">
                        <CardContent className="py-4 space-y-4">
                          <p className="text-xs text-muted-foreground">{t("ps.directRecordingDesc")}</p>
                          {!recordedUrl ? (
                            <div className="space-y-3">
                              {!isRecording ? (
                                <Button onClick={handleStartRecording} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                                  <CircleDot className="w-4 h-4 mr-2" />{t("ps.startRecording")}
                                </Button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm font-medium text-red-400">{t("ps.recordingInProgress")} - {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                                  </div>
                                  <Button onClick={handleStopRecording} variant="destructive" className="w-full">
                                    <StopCircle className="w-4 h-4 mr-2" />{t("ps.stopRecording")}
                                  </Button>
                                </div>
                              )}
                              <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full rounded-lg border border-border aspect-video bg-black" />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <video src={recordedUrl} controls className="w-full rounded-lg border border-border aspect-video bg-black" />
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{t("ps.recordingDuration")}: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleDeleteRecording} variant="outline" size="sm" className="flex-1">
                                  <RotateCcw className="w-4 h-4 mr-1" />{t("ps.reRecord")}
                                </Button>
                                <Button onClick={handleUploadRecording} size="sm" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                                  <Upload className="w-4 h-4 mr-1" />{t("ps.uploadRecording")}
                                </Button>
                              </div>
                              {/* Subtitle generation */}
                              {recordedUrl && !recordedUrl.startsWith('blob:') && (
                                <div className="mt-3 p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs flex items-center gap-1">
                                      <FileText className="w-3 h-3" />{t("ps.subtitleOverlay")}
                                    </Label>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-6"
                                      onClick={() => {
                                        generateSubtitlesMut.mutate({ videoUrl: recordedUrl!, language: language });
                                      }}
                                      disabled={generateSubtitlesMut.isPending}
                                    >
                                      {generateSubtitlesMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                                      {t("ps.generateSubtitles")}
                                    </Button>
                                  </div>
                                  {subtitleSegments.length > 0 && (
                                    <>
                                      <ScrollArea className="h-[120px]">
                                        <div className="space-y-1">
                                          {subtitleSegments.map((seg, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                              <span className="text-muted-foreground w-16 shrink-0">{formatTime(seg.start)}</span>
                                              <Input
                                                value={seg.text}
                                                onChange={(e) => {
                                                  const updated = [...subtitleSegments];
                                                  updated[i] = { ...updated[i], text: e.target.value };
                                                  setSubtitleSegments(updated);
                                                }}
                                                className="h-6 text-xs"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                      <div className="mt-2 flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs h-6" onClick={exportSrt}>
                                          <Download className="w-3 h-3 mr-1" />{t("ps.exportSrt")}
                                        </Button>
                                      </div>

                                      {/* Subtitle Style Customization */}
                                      <div className="mt-3 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
                                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                                          <Palette className="w-3 h-3 text-amber-400" />
                                          {t("ps.subtitleStyle")}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[10px] text-muted-foreground">{t("ps.fontSize")}</label>
                                            <Input
                                              type="number"
                                              min={8}
                                              max={48}
                                              value={subtitleFontSize}
                                              onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                                              className="h-6 text-xs"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-muted-foreground">{t("ps.fontFamily")}</label>
                                            <select
                                              value={subtitleFontFamily}
                                              onChange={(e) => setSubtitleFontFamily(e.target.value)}
                                              className="w-full h-6 text-xs rounded border border-border bg-background px-1"
                                            >
                                              <option value="sans-serif">Sans-serif</option>
                                              <option value="serif">Serif</option>
                                              <option value="monospace">Monospace</option>
                                              <option value="'Noto Sans KR'">Noto Sans KR</option>
                                              <option value="'Noto Sans JP'">Noto Sans JP</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-muted-foreground">{t("ps.fontColor")}</label>
                                            <div className="flex gap-1">
                                              <input
                                                type="color"
                                                value={subtitleFontColor}
                                                onChange={(e) => setSubtitleFontColor(e.target.value)}
                                                className="w-6 h-6 rounded border border-border cursor-pointer"
                                              />
                                              <Input value={subtitleFontColor} onChange={(e) => setSubtitleFontColor(e.target.value)} className="h-6 text-xs flex-1" />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-muted-foreground">{t("ps.bgColor")}</label>
                                            <div className="flex gap-1">
                                              <input
                                                type="color"
                                                value={subtitleBgColor.startsWith("rgba") ? "#000000" : subtitleBgColor}
                                                onChange={(e) => setSubtitleBgColor(e.target.value)}
                                                className="w-6 h-6 rounded border border-border cursor-pointer"
                                              />
                                              <Input value={subtitleBgColor} onChange={(e) => setSubtitleBgColor(e.target.value)} className="h-6 text-xs flex-1" />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-muted-foreground">{t("ps.subtitlePos")}</label>
                                            <select
                                              value={subtitlePosition}
                                              onChange={(e) => setSubtitlePosition(e.target.value as any)}
                                              className="w-full h-6 text-xs rounded border border-border bg-background px-1"
                                            >
                                              <option value="top">{t("ps.posTop")}</option>
                                              <option value="bottom">{t("ps.posBottom")}</option>
                                            </select>
                                          </div>
                                          <div className="flex items-end gap-2">
                                            <label className="flex items-center gap-1 text-[10px]">
                                              <input type="checkbox" checked={subtitleBold} onChange={(e) => setSubtitleBold(e.target.checked)} className="w-3 h-3" />
                                              <span className="font-bold">B</span>
                                            </label>
                                            <label className="flex items-center gap-1 text-[10px]">
                                              <input type="checkbox" checked={subtitleItalic} onChange={(e) => setSubtitleItalic(e.target.checked)} className="w-3 h-3" />
                                              <span className="italic">I</span>
                                            </label>
                                            <label className="flex items-center gap-1 text-[10px]">
                                              <input type="checkbox" checked={subtitleOutline} onChange={(e) => setSubtitleOutline(e.target.checked)} className="w-3 h-3" />
                                              {t("ps.outline")}
                                            </label>
                                          </div>
                                        </div>
                                        {/* Preview */}
                                        <div className="mt-2 p-2 rounded bg-black/80 text-center">
                                          <span style={{
                                            fontSize: `${subtitleFontSize}px`,
                                            fontFamily: subtitleFontFamily,
                                            color: subtitleFontColor,
                                            backgroundColor: subtitleBgColor,
                                            fontWeight: subtitleBold ? 'bold' : 'normal',
                                            fontStyle: subtitleItalic ? 'italic' : 'normal',
                                            textShadow: subtitleOutline ? '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)' : 'none',
                                            padding: '2px 6px',
                                            borderRadius: '2px',
                                          }}>
                                            {t("ps.subtitlePreviewText")}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs h-6 mt-2 w-full border-amber-500/50 text-amber-400"
                                          onClick={() => updateSubtitleStyleMut.mutate({
                                            fontSize: subtitleFontSize,
                                            fontColor: subtitleFontColor,
                                            bgColor: subtitleBgColor,
                                            position: subtitlePosition,
                                            fontFamily: subtitleFontFamily,
                                            bold: subtitleBold,
                                            italic: subtitleItalic,
                                            outline: subtitleOutline,
                                          })}
                                          disabled={updateSubtitleStyleMut.isPending}
                                        >
                                          {t("ps.saveSubtitleStyle")}
                                        </Button>

                                        {/* Share subtitle style to gallery + Gallery toggle */}
                                        <div className="flex gap-1 mt-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 flex-1 border-emerald-500/50 text-emerald-400"
                                            onClick={() => setShowSubtitleGallery(!showSubtitleGallery)}
                                          >
                                            <Globe className="w-3 h-3 mr-1" />{t("ps.subtitlePresetGallery")}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-6 flex-1 border-blue-500/50 text-blue-400"
                                            onClick={() => {
                                              const name = window.prompt(t("ps.presetNamePrompt"));
                                              if (!name) return;
                                              const desc = window.prompt(t("ps.presetDescPrompt")) || "";
                                              shareSubtitlePresetMut.mutate({
                                                name,
                                                description: desc,
                                                fontSize: subtitleFontSize,
                                                fontColor: subtitleFontColor,
                                                bgColor: subtitleBgColor,
                                                position: subtitlePosition === "custom" ? "bottom" : subtitlePosition as "top" | "bottom",
                                                fontFamily: subtitleFontFamily,
                                                bold: subtitleBold,
                                                italic: subtitleItalic,
                                                outline: subtitleOutline,
                                              });
                                            }}
                                            disabled={shareSubtitlePresetMut.isPending}
                                          >
                                            <Upload className="w-3 h-3 mr-1" />{t("ps.shareToGallery")}
                                          </Button>
                                        </div>

                                        {/* Subtitle Preset Gallery */}
                                        {showSubtitleGallery && (
                                          <div className="mt-2 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="text-[10px] font-medium flex items-center gap-1">
                                                <Globe className="w-3 h-3 text-emerald-400" />
                                                {t("ps.communitySubtitlePresets")}
                                              </p>
                                              <div className="flex gap-1">
                                                <button className={`text-[10px] px-1.5 py-0.5 rounded ${subtitleGallerySortBy === 'popular' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setSubtitleGallerySortBy('popular')}>{t("ps.sortPopular")}</button>
                                                <button className={`text-[10px] px-1.5 py-0.5 rounded ${subtitleGallerySortBy === 'latest' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setSubtitleGallerySortBy('latest')}>{t("ps.sortLatest")}</button>
                                              </div>
                                            </div>
                                            {subtitleTagsQuery.data && subtitleTagsQuery.data.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                <button className={`text-[10px] px-1.5 py-0.5 rounded-full border ${!subtitleSelectedTagId ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-border text-muted-foreground'}`} onClick={() => setSubtitleSelectedTagId(undefined)}>{t("ps.allTags")}</button>
                                                {subtitleTagsQuery.data.map((tag: any) => (
                                                  <button key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${subtitleSelectedTagId === tag.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-border text-muted-foreground hover:border-emerald-500/30'}`} onClick={() => setSubtitleSelectedTagId(tag.id)}>#{tag.name}</button>
                                                ))}
                                              </div>
                                            )}
                                            {sharedSubtitlePresetsQuery.isLoading ? (
                                              <p className="text-[10px] text-muted-foreground">{t("ps.loading")}</p>
                                            ) : !sharedSubtitlePresetsQuery.data?.length ? (
                                              <p className="text-[10px] text-muted-foreground">{t("ps.noSharedPresets")}</p>
                                            ) : (
                                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                {sharedSubtitlePresetsQuery.data.map((sp: any) => (
                                                  <div key={sp.id} className="p-1.5 rounded bg-background/50 border border-border/50">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-medium truncate">{sp.name}</p>
                                                        <p className="text-[9px] text-muted-foreground">
                                                          {sp.userName} · {sp.fontFamily} · {sp.fontSize}px
                                                        </p>
                                                      </div>
                                                      <div className="flex items-center gap-1 ml-1 shrink-0">
                                                        <button
                                                          className={`text-[10px] px-1 ${(mySubtitleLikesQuery.data || []).includes(sp.id) ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                                                          onClick={() => likeSubtitlePresetMut.mutate({ id: sp.id })}
                                                        >
                                                          ♥ {sp.likes || 0}
                                                        </button>
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          className="text-[10px] h-5 px-1.5"
                                                          onClick={() => {
                                                            setSubtitleFontSize(sp.fontSize);
                                                            setSubtitleFontColor(sp.fontColor);
                                                            setSubtitleBgColor(sp.bgColor);
                                                            setSubtitlePosition(sp.position);
                                                            setSubtitleFontFamily(sp.fontFamily);
                                                            setSubtitleBold(sp.bold);
                                                            setSubtitleItalic(sp.italic);
                                                            setSubtitleOutline(sp.outline);
                                                            downloadSubtitlePresetMut.mutate({ id: sp.id });
                                                            toast.success(t("ps.presetApplied"));
                                                          }}
                                                        >
                                                          {t("ps.applyPreset")}
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    {/* Mini preview */}
                                                    <div className="mt-1 p-1 rounded bg-black/60 text-center">
                                                      <span style={{
                                                        fontSize: `${Math.min(sp.fontSize, 14)}px`,
                                                        fontFamily: sp.fontFamily,
                                                        color: sp.fontColor,
                                                        backgroundColor: sp.bgColor,
                                                        fontWeight: sp.bold ? 'bold' : 'normal',
                                                        fontStyle: sp.italic ? 'italic' : 'normal',
                                                        textShadow: sp.outline ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                                                        padding: '1px 4px',
                                                        borderRadius: '2px',
                                                      }}>
                                                        {t("ps.subtitlePreviewText")}
                                                      </span>
                                                    </div>
                                                    {sp.tags && sp.tags.length > 0 && (
                                                      <div className="flex flex-wrap gap-0.5 mt-1">
                                                        {sp.tags.map((tag: any) => (
                                                          <span key={tag.id} className="text-[9px] px-1 py-0 rounded-full bg-emerald-500/10 text-emerald-400/80">#{tag.name}</span>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
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
                          const slides = ppt.slideImages || [];
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
                                    <div ref={slideContainerRef} className="aspect-video bg-black rounded-lg overflow-hidden relative select-none">
                                      <img src={slides[previewSlideIdx]} className="w-full h-full object-contain" alt={`Slide ${previewSlideIdx + 1}`} draggable={false} />
                                      {/* Draggable Avatar PiP Overlay */}
                                      <div
                                        className={`absolute border-2 transition-colors cursor-move ${
                                          isDragging ? 'border-violet-500 shadow-lg shadow-violet-500/30' : 'border-dashed border-violet-500/50 hover:border-violet-500'
                                        }`}
                                        style={{
                                          width: `${pipSizePercent}%`,
                                          aspectRatio: '1 / 1',
                                          left: `${pipPosition.x}%`,
                                          top: `${pipPosition.y}%`,
                                          transform: `translate(-50%, -50%)`,
                                          opacity: pipOp / 100,
                                          borderRadius: pipSh === 'circle' ? '50%' : pipSh === 'rounded' ? '12px' : '4px',
                                          background: 'rgba(139, 92, 246, 0.15)',
                                          backdropFilter: 'blur(2px)',
                                        }}
                                        onMouseDown={onPipDragStart}
                                      >
                                        <div className="w-full h-full flex items-center justify-center">
                                          <div className="text-center">
                                            <User2 className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                                            <span className="text-[10px] text-violet-300 font-medium">{t("ps.avatarDragHint")}</span>
                                          </div>
                                        </div>
                                        {/* Resize handle */}
                                        <div
                                          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-violet-500 rounded-full cursor-se-resize border-2 border-white shadow-md hover:scale-125 transition-transform"
                                          onMouseDown={onResizeStart}
                                        />
                                      </div>
                                      {/* Slide navigation */}
                                      <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10">
                                        <button
                                          onClick={() => setPreviewSlideIdx(Math.max(0, previewSlideIdx - 1))}
                                          disabled={previewSlideIdx === 0}
                                          className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                                        >←</button>
                                      </div>
                                      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-10">
                                        <button
                                          onClick={() => setPreviewSlideIdx(Math.min(slides.length - 1, previewSlideIdx + 1))}
                                          disabled={previewSlideIdx === slides.length - 1}
                                          className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-30"
                                        >→</button>
                                      </div>
                                    </div>
                                    {/* PIP info bar */}
                                    <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                                      <span>{t("ps.pipPositionLabel")} {Math.round(pipPosition.x)}%, {Math.round(pipPosition.y)}%</span>
                                      <span>·</span>
                                      <span>{t("ps.pipSizeLabel")} {Math.round(pipSizePercent)}%</span>
                                      <span>·</span>
                                      <span>{t("ps.pipShapeLabel")} {t(`ps.pipShape${pipSh.charAt(0).toUpperCase() + pipSh.slice(1)}`)}</span>
                                      <span>·</span>
                                      <span>{t("ps.pipOpacityLabel")} {pipOp}%</span>
                                    </div>
                                    {/* Preset buttons */}
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7"
                                        onClick={() => {
                                          const name = window.prompt(t("ps.presetNamePrompt"));
                                          if (name) savePipPreset.mutate({ name, customX: Math.round(pipPosition.x), customY: Math.round(pipPosition.y), customWidth: Math.round(pipSizePercent), customHeight: Math.round(pipSizePercent), opacity: pipOp, shape: pipSh, position: "custom" });
                                        }}
                                      >
                                        <Download className="w-3 h-3 mr-1" />{t("ps.savePreset")}
                                      </Button>
                                      {pipPresetsQuery.data?.map((preset) => (
                                        <div key={preset.id} className="flex items-center gap-0.5">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs h-7 border border-border/50 pr-1"
                                            onClick={() => {
                                              setPipPosition({ x: preset.customX ?? 75, y: preset.customY ?? 75 });
                                              setPipSizePercent(preset.customWidth ?? 25);
                                              updatePipMutation.mutate({ customX: preset.customX ?? 75, customY: preset.customY ?? 75, size: preset.size, opacity: preset.opacity, shape: preset.shape, position: "custom" });
                                              pipSettingsQuery.refetch();
                                            }}
                                            title={`${preset.customX}%, ${preset.customY}% / ${preset.customWidth}%`}
                                          >
                                            {preset.name}
                                          </Button>
                                          {!preset.isBuiltIn && (
                                            <>
                                              <button className="text-xs text-blue-400 hover:text-blue-300 px-1" onClick={() => exportPresetCode(preset)} title={t("ps.sharePreset")}>↗</button>
                                              <button className="text-xs text-destructive hover:text-destructive/80 px-1" onClick={() => deletePipPreset.mutate({ id: preset.id })} title={t("ps.deletePreset")}>×</button>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 border-dashed"
                                        onClick={importPresetCode}
                                      >
                                        <Upload className="w-3 h-3 mr-1" />{t("ps.importPreset")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 border-dashed border-emerald-500/50 text-emerald-400"
                                        onClick={() => setShowGallery(!showGallery)}
                                      >
                                        <Globe className="w-3 h-3 mr-1" />{t("ps.presetGallery")}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Community Preset Gallery */}
                              {showGallery && (
                                <div className="mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                      {t("ps.communityPresets")}
                                    </p>
                                    <div className="flex gap-1">
                                      <button className={`text-[10px] px-2 py-0.5 rounded ${gallerySortBy === 'popular' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setGallerySortBy('popular')}>{t("ps.sortPopular")}</button>
                                      <button className={`text-[10px] px-2 py-0.5 rounded ${gallerySortBy === 'latest' ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setGallerySortBy('latest')}>{t("ps.sortLatest")}</button>
                                    </div>
                                  </div>
                                  {avatarTagsQuery.data && avatarTagsQuery.data.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      <button className={`text-[10px] px-1.5 py-0.5 rounded-full border ${!selectedTagId ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-border text-muted-foreground'}`} onClick={() => setSelectedTagId(undefined)}>{t("ps.allTags")}</button>
                                      {avatarTagsQuery.data.map((tag: any) => (
                                        <button key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${selectedTagId === tag.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-border text-muted-foreground hover:border-emerald-500/30'}`} onClick={() => setSelectedTagId(tag.id)}>#{tag.name}</button>
                                      ))}
                                    </div>
                                  )}
                                  {sharedPresetsQuery.isLoading ? (
                                    <p className="text-xs text-muted-foreground">{t("ps.loading")}</p>
                                  ) : !sharedPresetsQuery.data?.length ? (
                                    <p className="text-xs text-muted-foreground">{t("ps.noSharedPresets")}</p>
                                  ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {sharedPresetsQuery.data.map((sp: any) => (
                                        <div key={sp.id} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/50">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{sp.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {sp.userName} · {sp.position} · {sp.size}
                                              {sp.description && ` · ${sp.description}`}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1 ml-2 shrink-0">
                                            <button
                                              className={`text-xs px-1 ${(myLikesQuery.data || []).includes(sp.id) ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                                              onClick={() => likePresetMut.mutate({ id: sp.id })}
                                            >
                                              ♥ {sp.likes || 0}
                                            </button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-xs h-6 px-2"
                                              onClick={() => {
                                                setPipPosition({ x: sp.customX ?? 75, y: sp.customY ?? 75 });
                                                setPipSizePercent(sp.customWidth ?? 25);
                                                updatePipMutation.mutate({ customX: sp.customX ?? 75, customY: sp.customY ?? 75, size: sp.size, opacity: sp.opacity, shape: sp.shape, position: "custom" });
                                                downloadPresetMut.mutate({ id: sp.id });
                                                toast.success(t("ps.presetApplied"));
                                              }}
                                            >
                                              {t("ps.applyPreset")}
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 border-emerald-500/50 text-emerald-400"
                                      onClick={() => {
                                        const name = window.prompt(t("ps.presetNamePrompt"));
                                        if (!name) return;
                                        const desc = window.prompt(t("ps.presetDescPrompt")) || "";
                                        sharePresetMut.mutate({
                                          name,
                                          description: desc,
                                          position: pipSettingsQuery.data?.position as any || "custom",
                                          size: pipSettingsQuery.data?.size as any || "medium",
                                          opacity: pipSettingsQuery.data?.opacity ?? 100,
                                          shape: pipSettingsQuery.data?.shape as any || "rounded",
                                          customX: pipPosition.x,
                                          customY: pipPosition.y,
                                          customWidth: pipSizePercent,
                                          customHeight: pipSizePercent,
                                        });
                                      }}
                                    >
                                      {t("ps.shareToGallery")}
                                    </Button>
                                  </div>
                                </div>
                              )}
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
                  <>
                  <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                    <CardHeader>
                      <CardTitle className="text-lg">{t("ps.scriptPreview")}</CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>{script.title}</span>
                        {interpreterEnabled && sections.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => {
                              autoTranslateMut.mutate({
                                scriptId: script.id,
                                targetLanguage: interpreterLanguage,
                                sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
                              });
                            }}
                            disabled={autoTranslateMut.isPending}
                          >
                            {autoTranslateMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
                            {t("ps.autoTranslate")}
                          </Button>
                        )}
                      </CardDescription>
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

                  {/* Interpreter Preview Player */}
                  {interpreterEnabled && interpreterSections.length > 0 && (() => {
                    const sections = script.sections ? JSON.parse(script.sections) : [];
                    return (
                      <Card className="mt-4 bg-gradient-to-b from-blue-500/5 to-transparent border-blue-500/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Play className="w-4 h-4 text-blue-400" />
                            {t("ps.interpreterPreview")}
                          </CardTitle>
                          <CardDescription className="text-xs">{t("ps.interpreterPreviewDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Player controls */}
                          <div className="flex items-center gap-2 mb-4">
                            <Button
                              size="sm"
                              variant={previewPlaying ? "destructive" : "default"}
                              className="text-xs h-8"
                              onClick={() => {
                                if (previewPlaying) {
                                  stopPreview();
                                } else {
                                  setPreviewPlaying(true);
                                  playPreviewSection(sections, interpreterSections, 0, true);
                                }
                              }}
                            >
                              {previewPlaying ? <><StopCircle className="w-3 h-3 mr-1" />{t("ps.stopPreview")}</> : <><Play className="w-3 h-3 mr-1" />{t("ps.playPreview")}</>}
                            </Button>
                            {previewPlaying && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => {
                                  stopPreview();
                                  const prevIdx = Math.max(0, previewSectionIdx - 1);
                                  setPreviewPlaying(true);
                                  playPreviewSection(sections, interpreterSections, prevIdx, true);
                                }}>
                                  <SkipForward className="w-3 h-3 rotate-180" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => {
                                  stopPreview();
                                  const nextIdx = Math.min(sections.length - 1, previewSectionIdx + 1);
                                  setPreviewPlaying(true);
                                  playPreviewSection(sections, interpreterSections, nextIdx, true);
                                }}>
                                  <SkipForward className="w-3 h-3" />
                                </Button>
                                <Badge variant="outline" className="text-xs">
                                  {previewSectionIdx + 1}/{sections.length} · {previewIsOriginal ? t("ps.originalLabel") : t("ps.interpretedLabel")}
                                </Badge>
                              </>
                            )}
                          </div>
                          {/* Section timeline */}
                          <div className="space-y-2">
                            {sections.map((s: any, i: number) => (
                              <div key={i} className={`p-2 rounded-lg border text-xs transition-all ${
                                previewPlaying && previewSectionIdx === i
                                  ? (previewIsOriginal ? 'border-violet-500/50 bg-violet-500/10' : 'border-blue-500/50 bg-blue-500/10')
                                  : 'border-border/30 bg-card/30'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{i + 1}.</span>
                                  <span className="flex-1 truncate">{s.title}</span>
                                  {previewPlaying && previewSectionIdx === i && (
                                    <Badge variant="secondary" className="text-[10px] h-5">
                                      {previewIsOriginal ? `🎤 ${language.toUpperCase()}` : `🌐 ${interpreterLanguage.toUpperCase()}`}
                                    </Badge>
                                  )}
                                </div>
                                {interpreterSections[i]?.interpretedContent && (
                                  <p className="text-[10px] text-blue-400/70 mt-1 line-clamp-1">
                                    🌐 {interpreterSections[i].interpretedContent.substring(0, 80)}...
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                  </>
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
                type="pipeline"
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
                          <Badge variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}>
                            {t(`ps.pipelineStatus${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                          </Badge>
                          {pipeline.avatarEngine && <Badge variant="outline">{pipeline.avatarEngine}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{t("ps.originalScript")}: {script.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{t("ps.sections", { count: script.sectionCount || 0 })}</span>
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
                              <a href={pipeline.finalVideoUrl!} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-1" />{t("ps.downloadVideo")}</a>
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
                    {pipeline.status === 'failed' && pipeline.errorMessage && (
                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-foreground">
                        <p className="font-semibold mb-1">{t("ps.failureReason")}</p>
                        <p className="text-xs">{pipeline.errorMessage}</p>
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
                            <p className="text-xs text-muted-foreground">{t("ps.sectionCountDuration", { count: script.sectionCount || 0, minutes: Math.round((script.estimatedDurationSec || 0) / 60) })}</p>
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
                        {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">{t("ps.faceSwapProfile")}</Label>
                    <Select value={batchFaceSwapId} onValueChange={setBatchFaceSwapId}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("ps.none")}</SelectItem>
                        {faceSwapsQuery.data?.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
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
