import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Users, Volume2, Loader2, Check, Mic, User, Sparkles, Wand2, RefreshCw, MicVocal, Play, Square, Trash2, AudioLines, Brain, CheckCircle2, FileAudio, SlidersHorizontal, RotateCcw, TestTube, Save, BookmarkPlus, Headphones, Plus, Heart, Copy, Globe, Search, Zap, BarChart3, Layers } from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import { useLanguage } from "@/contexts/LanguageContext";

interface AvatarData {
  id: number;
  name: string;
  role: string;
  ttsVoiceId: string | null;
  sampleFaceId: number | null;
  customFaceUrl: string | null;
  voiceCloneId: number | null;
  voiceSpeed: number | null;
  voicePitch: number | null;
  sortOrder: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: AvatarData;
  faces: any[];
  voices: any[];
  onUpdated: () => void;
}

const AVATAR_ROLES = [
  { value: "instructor", label: "avatarSettingsDialog.instructor", color: "bg-blue-500/20 text-blue-400", desc: "avatarSettingsDialog.mainLecture" },
  { value: "host", label: "avatarSettingsDialog.host", color: "bg-purple-500/20 text-purple-400", desc: "avatarSettingsDialog.mcRole" },
  { value: "guest", label: "avatarSettingsDialog.guest", color: "bg-green-500/20 text-green-400", desc: "avatarSettingsDialog.guestAppearance" },
  { value: "narrator", label: "avatarSettingsDialog.narrator", color: "bg-orange-500/20 text-orange-400", desc: "avatarSettingsDialog.narrationRole" },
];

const AI_STYLES = [
  { value: "realistic", label: "avatarSettingsDialog.realistic", desc: "avatarSettingsDialog.realisticPhoto" },
  { value: "anime", label: "avatarSettingsDialog.animation", desc: "avatarSettingsDialog.animationStyle" },
  { value: "3d", label: "avatarSettingsDialog.3dRendering", desc: "avatarSettingsDialog.pixarStyle3d" },
  { value: "illustration", label: "avatarSettingsDialog.illustration", desc: "avatarSettingsDialog.digitalIllustration" },
];

// Preset voice color mappings
const PRESET_COLORS: Record<string, string> = {
  blue: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 hover:border-blue-400/50",
  slate: "from-slate-500/20 to-gray-500/20 border-slate-500/30 hover:border-slate-400/50",
  emerald: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-400/50",
  violet: "from-violet-500/20 to-purple-500/20 border-violet-500/30 hover:border-violet-400/50",
  rose: "from-rose-500/20 to-pink-500/20 border-rose-500/30 hover:border-rose-400/50",
};

export default function AvatarSettingsDialog({ open, onOpenChange, avatar, faces, voices, onUpdated }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState(avatar.name);
  const [role, setRole] = useState(avatar.role);
  const [ttsVoiceId, setTtsVoiceId] = useState(avatar.ttsVoiceId || "Kore");
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(avatar.sampleFaceId);
  const [customFaceUrl, setCustomFaceUrl] = useState<string | null>(avatar.customFaceUrl);
  const [faceTab, setFaceTab] = useState<string>(avatar.customFaceUrl ? "custom" : "gallery");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);

  // AI Face Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState<string>("realistic");
  const [aiGender, setAiGender] = useState<string>("neutral");
  const [aiAge, setAiAge] = useState<string>("middle");
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);

  // Voice mode: "preset" | "clone" | "presetVoices"
  const [voiceMode, setVoiceMode] = useState<string>(avatar.voiceCloneId ? "clone" : "preset");

  // Voice clone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [cloneName, setCloneName] = useState("");
  const [cloneDesc, setCloneDesc] = useState("");
  const [isPlayingClone, setIsPlayingClone] = useState(false);
  const [selectedCloneId, setSelectedCloneId] = useState<number | null>(avatar.voiceCloneId || null);
  const [previewText, setPreviewText] = useState(t("avatarSettingsDialog.welcomeMessage"));

  // Speed/Pitch controls
  const [speed, setSpeed] = useState(avatar.voiceSpeed ?? 1.0);
  const [pitch, setPitch] = useState(avatar.voicePitch ?? 0);

  // A/B Test state
  const [abPlaying, setAbPlaying] = useState<"original" | "clone" | null>(null);

  // Custom preset state
  const [newPresetName, setNewPresetName] = useState("");
  const [showPresetForm, setShowPresetForm] = useState(false);

  // Multi-sample state
  const [showAddSample, setShowAddSample] = useState(false);
  const multiSampleInputRef = useRef<HTMLInputElement>(null);

  // Community preset state
  const [showCommunity, setShowCommunity] = useState(false);
  const [communitySort, setCommunitySort] = useState<"popular" | "newest" | "mostUsed">("popular");
  const [communitySearch, setCommunitySearch] = useState("");

  // Real-time analysis state
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<Record<string, any> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setName(avatar.name);
    setRole(avatar.role);
    setTtsVoiceId(avatar.ttsVoiceId || "Kore");
    setSelectedFaceId(avatar.sampleFaceId);
    setCustomFaceUrl(avatar.customFaceUrl);
    setFaceTab(avatar.customFaceUrl ? "custom" : "gallery");
    setAiGeneratedUrl(null);
    setAiPrompt("");
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordDuration(0);
    setCloneName("");
    setCloneDesc("");
    setSelectedCloneId(avatar.voiceCloneId || null);
    setVoiceMode(avatar.voiceCloneId ? "clone" : "preset");
    setSpeed(avatar.voiceSpeed ?? 1.0);
    setPitch(avatar.voicePitch ?? 0);
    setAbPlaying(null);
    setNewPresetName("");
    setShowPresetForm(false);
    setShowAddSample(false);
    setShowCommunity(false);
    setRealtimeAnalysis(null);
    setIsAnalyzing(false);
    setCommunitySearch("");
  }, [avatar]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const updateMut = trpc.lectureBuilder.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.settingsSaved"));
      onUpdated();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFace = trpc.gallery.uploadImage.useMutation();

  const generateFace = trpc.lectureBuilder.generateAvatarFace.useMutation({
    onSuccess: (data) => {
      setAiGeneratedUrl(data.imageUrl);
      setCustomFaceUrl(data.imageUrl);
      setFaceTab("ai");
      toast.success(t("avatarSettingsDialog.aiFaceGenerated"));
    },
    onError: (e) => toast.error(e.message),
  });

  // Voice clone mutations
  const voiceClones = trpc.voiceClone.list.useQuery(undefined, { enabled: open });
  const voicePresets = trpc.voiceClone.presets.useQuery(undefined, { enabled: open });
  const createClone = trpc.voiceClone.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("avatarSettingsDialog.voiceCloneCreated"));
      voiceClones.refetch();
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordDuration(0);
      setCloneName("");
      setCloneDesc("");
      // Auto-select the newly created clone
      if (data.id) {
        setSelectedCloneId(data.id);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteClone = trpc.voiceClone.delete.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.voiceCloneDeleted"));
      voiceClones.refetch();
      if (selectedCloneId) setSelectedCloneId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const previewClone = trpc.voiceClone.preview.useMutation({
    onSuccess: (data) => {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      setIsPlayingClone(true);
      audio.play();
      audio.onended = () => setIsPlayingClone(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const testVoice = trpc.voiceClone.testVoice.useMutation({
    onSuccess: (data) => {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => { audioRef.current = null; };
    },
    onError: (e) => toast.error(e.message),
  });

  // Voice effect presets
  const effectPresets = trpc.voiceEffectPreset.list.useQuery(undefined, { enabled: open });
  const createEffectPreset = trpc.voiceEffectPreset.create.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.presetSaved"));
      effectPresets.refetch();
      setNewPresetName("");
      setShowPresetForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteEffectPreset = trpc.voiceEffectPreset.delete.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.presetDeleted"));
      effectPresets.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Multi-sample mutations
  const cloneSamples = trpc.voiceCloneSample.list.useQuery(
    { voiceCloneId: selectedCloneId! },
    { enabled: open && !!selectedCloneId }
  );
  const addSample = trpc.voiceCloneSample.add.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.sampleAdded"));
      cloneSamples.refetch();
      setShowAddSample(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteSample = trpc.voiceCloneSample.delete.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.sampleDeleted"));
      cloneSamples.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const analyzeCombined = trpc.voiceCloneSample.analyzeCombined.useMutation({
    onSuccess: (data) => {
      toast.success(t("avatarSettingsDialog.combinedAnalysisComplete"));
      voiceClones.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const analyzeRealtime = trpc.voiceCloneSample.analyzeRealtime.useMutation({
    onSuccess: (data) => {
      setRealtimeAnalysis(data.analysis as any);
      setIsAnalyzing(false);
      toast.success(t("avatarSettingsDialog.realtimeAnalysisComplete"));
    },
    onError: (e: any) => { setIsAnalyzing(false); toast.error(e.message); },
  });

  // Community preset queries/mutations
  const communityPresets = trpc.voiceEffectPreset.community.useQuery(
    { sortBy: communitySort, search: communitySearch || undefined },
    { enabled: open && showCommunity }
  );
  const publishPreset = trpc.voiceEffectPreset.publish.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.presetPublished"));
      effectPresets.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const likePreset = trpc.voiceEffectPreset.like.useMutation({
    onSuccess: () => communityPresets.refetch(),
    onError: (e: any) => toast.error(e.message),
  });
  const copyPreset = trpc.voiceEffectPreset.copy.useMutation({
    onSuccess: () => {
      toast.success(t("avatarSettingsDialog.presetCopied"));
      effectPresets.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    const faceUrl = faceTab === "ai" ? aiGeneratedUrl : faceTab === "custom" ? customFaceUrl : null;
    const cloneId = voiceMode === "clone" && selectedCloneId ? selectedCloneId : null;
    // If using clone voice, get the matched voice ID from the clone data
    const selectedClone = voiceClones.data?.find(c => c.id === cloneId);
    const finalVoiceId = cloneId && selectedClone?.matchedVoiceId ? selectedClone.matchedVoiceId : ttsVoiceId;

    updateMut.mutate({
      id: avatar.id,
      name: name.trim() || avatar.name,
      role: role as any,
      ttsVoiceId: finalVoiceId,
      sampleFaceId: faceTab === "gallery" ? selectedFaceId : null,
      customFaceUrl: faceUrl,
      voiceCloneId: cloneId,
      voiceSpeed: speed !== 1.0 ? speed : undefined,
      voicePitch: pitch !== 0 ? pitch : undefined,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(t("avatarSettingsDialog.imageOnly")); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t("avatarSettingsDialog.max5mb")); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadFace.mutateAsync({
          fileName: `avatar-face-${avatar.id}-${Date.now()}.${file.name.split(".").pop()}`,
          imageData: base64,
          mimeType: file.type,
        });
        setCustomFaceUrl(result.url);
        setFaceTab("custom");
        toast.success(t("avatarSettingsDialog.faceImageUploaded"));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t("avatarSettingsDialog.uploadFailed"));
      setUploading(false);
    }
  };

  const handleGenerateAiFace = () => {
    if (!aiPrompt.trim()) { toast.error(t("avatarSettingsDialog.pleaseDescribeFace")); return; }
    generateFace.mutate({
      prompt: aiPrompt.trim(),
      style: aiStyle as any,
      gender: aiGender as any,
      ageRange: aiAge as any,
    });
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordDuration((d) => {
          if (d >= 30) { stopRecording(); return d; }
          return d + 1;
        });
      }, 1000);
    } catch {
      toast.error(t("avatarSettingsDialog.micAccessDenied"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const playRecordedAudio = () => {
    if (!recordedUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(recordedUrl);
    audioRef.current = audio;
    audio.play();
    audio.onended = () => { audioRef.current = null; };
  };

  const handleCreateClone = async () => {
    if (!recordedBlob) { toast.error(t("avatarSettingsDialog.recordFirst")); return; }
    if (!cloneName.trim()) { toast.error(t("avatarSettingsDialog.enterCloneName")); return; }
    if (recordDuration < 3 && recordDuration !== 0) { toast.error(t("avatarSettingsDialog.recordAtLeast3Seconds")); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      createClone.mutate({
        name: cloneName.trim(),
        audioData: base64,
        fileName: `voice-clone-${Date.now()}.${recordedBlob.type.includes("webm") ? "webm" : recordedBlob.type.includes("mp3") || recordedBlob.type.includes("mpeg") ? "mp3" : recordedBlob.type.includes("wav") ? "wav" : recordedBlob.type.includes("m4a") || recordedBlob.type.includes("mp4") ? "m4a" : "webm"}`,
        language: "ko",
        description: cloneDesc || undefined,
      });
    };
    reader.readAsDataURL(recordedBlob);
  };

  // Real-time analysis handler
  const handleRealtimeAnalysis = () => {
    if (!recordedBlob) { toast.error(t("avatarSettingsDialog.recordFirst")); return; }
    setIsAnalyzing(true);
    setRealtimeAnalysis(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      analyzeRealtime.mutate({
        audioData: base64,
        fileName: `realtime-${Date.now()}.webm`,
      });
    };
    reader.readAsDataURL(recordedBlob);
  };

  // Multi-sample upload handler
  const handleAddSample = async (file: File) => {
    if (!selectedCloneId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      addSample.mutate({
        voiceCloneId: selectedCloneId,
        audioData: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Parse voice analysis from clone
  const getCloneAnalysis = (clone: any) => {
    try {
      return clone.voiceAnalysis ? JSON.parse(clone.voiceAnalysis) : null;
    } catch { return null; }
  };

  // Format speed label
  const formatSpeed = (val: number) => {
    if (val < 0.8) return t("avatarSettingsDialog.speedSlow");
    if (val > 1.3) return t("avatarSettingsDialog.speedFast");
    return t("avatarSettingsDialog.speedNormal");
  };

  // Format pitch label
  const formatPitch = (val: number) => {
    if (val === 0) return t("avatarSettingsDialog.pitchNormal");
    return `${val > 0 ? "+" : ""}${val} ${t("avatarSettingsDialog.semitones")}`;
  };

  const currentFace = faces.find((f) => f.id === selectedFaceId);
  const displayFaceUrl = faceTab === "ai" ? aiGeneratedUrl : faceTab === "custom" ? customFaceUrl : currentFace?.imageUrl;

  // Memoize preset text for stable reference
  const stablePreviewText = useMemo(() => previewText, [previewText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2Icon className="w-5 h-5 text-primary" />
            {t("avatarSettingsDialog.hardcoded1")} - {avatar.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Current Avatar Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-primary/30 shrink-0 relative">
              {displayFaceUrl ? (
                <img src={displayFaceUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">{name}</h3>
              <Badge className={`${AVATAR_ROLES.find((r) => r.value === role)?.color || ""} text-xs mt-1`}>
                {AVATAR_ROLES.find((r) => r.value === role)?.label || role}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                {voiceMode === "clone" && selectedCloneId
                  ? `🎤 ${t("avatarSettingsDialog.myVoiceClone")}: ${voiceClones.data?.find(c => c.id === selectedCloneId)?.name || ""}`
                  : ttsVoiceId}
              </p>
              {(speed !== 1.0 || pitch !== 0) && (
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  {speed !== 1.0 && `${t("avatarSettingsDialog.speed")}: ${speed.toFixed(1)}x`}
                  {speed !== 1.0 && pitch !== 0 && " · "}
                  {pitch !== 0 && `${t("avatarSettingsDialog.pitch")}: ${pitch > 0 ? "+" : ""}${pitch}`}
                </p>
              )}
            </div>
          </div>

          {/* Face Selection - 3 Tabs */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Camera className="w-4 h-4" /> {t("avatarSettingsDialog.faceAppearance")}
            </Label>
            <Tabs value={faceTab} onValueChange={setFaceTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gallery" className="gap-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.gallery")}
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-1 text-xs">
                  <Upload className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.myFace")}
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-1 text-xs">
                  <Wand2 className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.aiGenerated")}
                </TabsTrigger>
              </TabsList>

              {/* Gallery Tab */}
              <TabsContent value="gallery">
                {faces.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("avatarSettingsDialog.noSampleFaces")}</p>
                ) : (
                  <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {faces.map((face) => (
                      <div
                        key={face.id}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedFaceId === face.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setSelectedFaceId(face.id)}
                      >
                        <img src={face.imageUrl} alt={face.name || ""} className="w-full aspect-square object-cover" />
                        {selectedFaceId === face.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Custom Face Tab */}
              <TabsContent value="custom">
                <div className="space-y-3">
                  {customFaceUrl ? (
                    <div className="flex items-center gap-4">
                      <img src={customFaceUrl} alt="Custom" className="w-20 h-20 rounded-lg object-cover border" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t("avatarSettingsDialog.myFace")}</p>
                        <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => fileInputRef.current?.click()}>
                          <RefreshCw className="w-3 h-3" /> {t("avatarSettingsDialog.changePhoto")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">{t("avatarSettingsDialog.uploadMyFace")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("avatarSettingsDialog.jpgPngMax5mb")}</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
              </TabsContent>

              {/* AI Generated Tab */}
              <TabsContent value="ai">
                <div className="space-y-3">
                  {aiGeneratedUrl && (
                    <div className="flex justify-center">
                      <img src={aiGeneratedUrl} alt="AI Generated" className="w-28 h-28 rounded-xl object-cover border-2 border-primary/30" />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs mb-1 block">{t("avatarSettingsDialog.style")}</Label>
                      <Select value={aiStyle} onValueChange={setAiStyle}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AI_STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}><span className="text-xs">{t(s.label)}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">{t("avatarSettingsDialog.gender")}</Label>
                      <Select value={aiGender} onValueChange={setAiGender}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male"><span className="text-xs">{t("avatarSettingsDialog.male")}</span></SelectItem>
                          <SelectItem value="female"><span className="text-xs">{t("avatarSettingsDialog.female")}</span></SelectItem>
                          <SelectItem value="neutral"><span className="text-xs">{t("avatarSettingsDialog.neutral")}</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">{t("avatarSettingsDialog.ageRange")}</Label>
                      <Select value={aiAge} onValueChange={setAiAge}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="young"><span className="text-xs">{t("avatarSettingsDialog.twenties")}</span></SelectItem>
                          <SelectItem value="middle"><span className="text-xs">{t("avatarSettingsDialog.thirtiesForties")}</span></SelectItem>
                          <SelectItem value="senior"><span className="text-xs">{t("avatarSettingsDialog.fiftiesSixties")}</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">{t("avatarSettingsDialog.faceFeaturesPrompt")}</Label>
                    <Textarea
                      placeholder={t("avatarSettingsDialog.facePromptPlaceholder")}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="h-20 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleGenerateAiFace} disabled={generateFace.isPending || !aiPrompt.trim()} className="flex-1 gap-2">
                      {generateFace.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      {generateFace.isPending ? t("avatarSettingsDialog.generating") : t("avatarSettingsDialog.generateAiFace")}
                    </Button>
                    {aiGeneratedUrl && (
                      <Button variant="outline" onClick={handleGenerateAiFace} disabled={generateFace.isPending} className="gap-1">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Name & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{t("avatarSettingsDialog.name")}</Label>
              <Input placeholder={avatar.name} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("avatarSettingsDialog.role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AVATAR_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${r.color} text-[10px] px-1.5 py-0`}>{t(r.label)}</Badge>
                        <span className="text-xs text-muted-foreground">{t(r.desc)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Voice Selection - 3 modes: preset, presetVoices, clone */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Mic className="w-4 h-4" /> {t("avatarSettingsDialog.voiceSettings")}
            </Label>
            <Tabs value={voiceMode} onValueChange={setVoiceMode}>
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="preset" className="gap-1 text-xs">
                  <Volume2 className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.defaultVoice")}
                </TabsTrigger>
                <TabsTrigger value="presetVoices" className="gap-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.presetVoices")}
                </TabsTrigger>
                <TabsTrigger value="clone" className="gap-1 text-xs">
                  <MicVocal className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.myVoiceClone")}
                </TabsTrigger>
              </TabsList>

              {/* Preset Voice Tab (full list) */}
              <TabsContent value="preset">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {voices.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${v.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                {v.gender === 'female' ? '♀' : '♂'}
                              </span>
                              <span>{v.name}</span>
                              <span className="text-muted-foreground text-xs">({v.desc})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <VoicePreviewButton voiceId={ttsVoiceId} size="default" variant="outline" />
                  </div>
                  {(() => { const sel = voices.find((v: any) => v.id === ttsVoiceId); return sel ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {sel.gender === 'female' ? '👩' : '👨'} {sel.gender} · {sel.style} · {(sel.languages || []).length}+ languages
                    </p>
                  ) : null; })()}
                  <p className="text-xs text-muted-foreground">
                    {t("avatarSettingsDialog.voicePreviewDescription")}
                  </p>
                </div>
              </TabsContent>

              {/* 5 Preset Voices Tab */}
              <TabsContent value="presetVoices">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{t("avatarSettingsDialog.presetVoicesDesc")}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(voicePresets.data || []).map((preset) => {
                      const isSelected = ttsVoiceId === preset.id && voiceMode === "presetVoices";
                      const colorClass = PRESET_COLORS[preset.color] || PRESET_COLORS.blue;
                      return (
                        <div
                          key={preset.id}
                          className={`relative rounded-lg border p-3 cursor-pointer transition-all bg-gradient-to-r ${colorClass} ${
                            isSelected ? "ring-2 ring-primary/40 border-primary/50" : ""
                          }`}
                          onClick={() => {
                            setTtsVoiceId(preset.id);
                            setSelectedCloneId(null);
                            toast.success(t("avatarSettingsDialog.presetSelected"));
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{preset.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{preset.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {preset.gender === "female" ? "♀" : "♂"} {preset.style}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{preset.desc}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <VoicePreviewButton voiceId={preset.id} size="sm" variant="ghost" />
                              {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* Voice Clone Tab */}
              <TabsContent value="clone">
                <div className="space-y-4">
                  {/* Existing Clones List with Analysis Results */}
                  {voiceClones.data && voiceClones.data.length > 0 && (
                    <div>
                      <Label className="text-xs mb-2 block text-muted-foreground">{t("avatarSettingsDialog.myVoiceCloneList")}</Label>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {voiceClones.data.map((clone) => {
                          const analysis = getCloneAnalysis(clone);
                          const isSelected = selectedCloneId === clone.id;
                          return (
                            <div
                              key={clone.id}
                              className={`rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                  : "border-border hover:border-muted-foreground/30"
                              }`}
                              onClick={() => {
                                setSelectedCloneId(clone.id === selectedCloneId ? null : clone.id);
                                if (clone.id !== selectedCloneId) {
                                  toast.success(t("avatarSettingsDialog.cloneSelected"));
                                }
                              }}
                            >
                              {/* Clone Header */}
                              <div className="flex items-center gap-3 p-2.5">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-primary/20" : "bg-muted"
                                }`}>
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                  ) : (
                                    <AudioLines className={`w-4 h-4 text-muted-foreground`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{clone.name}</span>
                                    <Badge variant={clone.status === "ready" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
                                      {clone.status === "ready" ? t("avatarSettingsDialog.available") : clone.status === "processing" ? t("avatarSettingsDialog.processing") : t("avatarSettingsDialog.pending")}
                                    </Badge>
                                    {(clone as any).matchedVoiceId && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-primary/30 text-primary">
                                        🎯 {(clone as any).matchedVoiceId}
                                      </Badge>
                                    )}
                                  </div>
                                  {clone.description && (
                                    <p className="text-xs text-muted-foreground truncate">{clone.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Listen to original sample */}
                                  {clone.sampleUrl && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      title={t("avatarSettingsDialog.listenSample")}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (audioRef.current) audioRef.current.pause();
                                        const audio = new Audio(clone.sampleUrl);
                                        audioRef.current = audio;
                                        audio.play();
                                        audio.onended = () => { audioRef.current = null; };
                                      }}
                                    >
                                      <FileAudio className="w-3.5 h-3.5 text-orange-500" />
                                    </Button>
                                  )}
                                  {/* Preview clone TTS */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title={t("avatarSettingsDialog.listenClone")}
                                    disabled={clone.status !== "ready" || previewClone.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      previewClone.mutate({
                                        id: clone.id,
                                        text: stablePreviewText,
                                        speed: speed !== 1.0 ? speed : undefined,
                                        pitch: pitch !== 0 ? pitch : undefined,
                                      });
                                    }}
                                  >
                                    {previewClone.isPending && previewClone.variables?.id === clone.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : isPlayingClone ? (
                                      <Square className="w-3.5 h-3.5" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(t("avatarSettingsDialog.confirmDeleteClone"))) {
                                        deleteClone.mutate({ id: clone.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Analysis Result (shown when selected) */}
                              {isSelected && analysis && (
                                <div className="px-3 pb-3 pt-0">
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                                      <Brain className="w-3.5 h-3.5" />
                                      {t("avatarSettingsDialog.analysisResult")}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t("avatarSettingsDialog.matchedVoice")}:</span>
                                        <span className="font-medium">{analysis.matchedVoiceId || "-"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t("avatarSettingsDialog.confidence")}:</span>
                                        <span className="font-medium">{analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : "-"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t("avatarSettingsDialog.voiceGender")}:</span>
                                        <span className="font-medium">{analysis.gender || "-"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t("avatarSettingsDialog.voiceTone")}:</span>
                                        <span className="font-medium">{analysis.tone || "-"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t("avatarSettingsDialog.voiceStyle")}:</span>
                                        <span className="font-medium">{analysis.style || "-"}</span>
                                      </div>
                                    </div>
                                    {analysis.reason && (
                                      <p className="text-[11px] text-muted-foreground mt-1 italic">
                                        💡 {analysis.reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload Voice File */}
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" /> {t("avatarSettingsDialog.uploadVoiceFile")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("avatarSettingsDialog.uploadVoiceDesc")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => voiceFileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" /> {t("avatarSettingsDialog.selectVoiceFile")}
                      </Button>
                      <input
                        ref={voiceFileInputRef}
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/webm,audio/ogg,.mp3,.wav,.m4a,.webm,.ogg"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 100 * 1024 * 1024) {
                            toast.error(t("avatarSettingsDialog.fileSizeLimit"));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const arrayBuffer = reader.result as ArrayBuffer;
                            const blob = new Blob([arrayBuffer], { type: file.type });
                            setRecordedBlob(blob);
                            setRecordedUrl(URL.createObjectURL(blob));
                            setRecordDuration(0);
                            toast.success(t("avatarSettingsDialog.fileLoaded"));
                          };
                          reader.readAsArrayBuffer(file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>

                  {/* Record New Clone */}
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MicVocal className="w-4 h-4 text-primary" /> {t("avatarSettingsDialog.createNewClone")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("avatarSettingsDialog.recordCloneDescription")}
                    </p>

                    {/* Recording Controls */}
                    <div className="flex items-center gap-3">
                      {!isRecording && !recordedBlob && (
                        <Button onClick={startRecording} variant="outline" className="gap-2 flex-1">
                          <Mic className="w-4 h-4 text-red-500" /> {t("avatarSettingsDialog.startRecording")}
                        </Button>
                      )}
                      {isRecording && (
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm font-mono">{recordDuration}s / 30s</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 transition-all duration-1000"
                                style={{ width: `${(recordDuration / 30) * 100}%` }}
                              />
                            </div>
                          </div>
                          <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-1">
                            <Square className="w-3 h-3" /> {t("avatarSettingsDialog.stop")}
                          </Button>
                        </div>
                      )}
                      {recordedBlob && !isRecording && (
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="secondary" className="text-xs">{recordDuration > 0 ? `${recordDuration}s` : "file"}</Badge>
                          <Button onClick={playRecordedAudio} variant="ghost" size="sm" className="gap-1">
                            <Play className="w-3 h-3" /> {t("avatarSettingsDialog.play")}
                          </Button>
                          <Button onClick={() => { setRecordedBlob(null); setRecordedUrl(null); setRecordDuration(0); }} variant="ghost" size="sm" className="gap-1 text-destructive">
                            <Trash2 className="w-3 h-3" /> {t("avatarSettingsDialog.delete")}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Clone metadata */}
                    {recordedBlob && (
                      <div className="space-y-2 pt-2">
                        <Input
                          placeholder={t("avatarSettingsDialog.cloneNamePlaceholder")}
                          value={cloneName}
                          onChange={(e) => setCloneName(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder={t("avatarSettingsDialog.descriptionOptional")}
                          value={cloneDesc}
                          onChange={(e) => setCloneDesc(e.target.value)}
                          className="text-sm"
                        />
                        <Button
                          onClick={handleCreateClone}
                          disabled={createClone.isPending || !cloneName.trim()}
                          className="w-full gap-2"
                        >
                          {createClone.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="flex flex-col items-start">
                                <span>{t("avatarSettingsDialog.voiceCloneAnalyzing")}</span>
                                <span className="text-[10px] opacity-70">{t("avatarSettingsDialog.voiceCloneAnalyzingDesc")}</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4" />
                              {t("avatarSettingsDialog.createVoiceClone")}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Preview text for clone */}
                  {voiceClones.data && voiceClones.data.length > 0 && (
                    <div>
                      <Label className="text-xs mb-1 block text-muted-foreground">{t("avatarSettingsDialog.previewText")}</Label>
                      <Input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        placeholder={t("avatarSettingsDialog.previewTextPlaceholder")}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Voice Effects: Speed & Pitch Sliders */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> {t("avatarSettingsDialog.voiceEffects")}
            </Label>
            <p className="text-xs text-muted-foreground mb-4">{t("avatarSettingsDialog.voiceEffectsDesc")}</p>

            <div className="space-y-5">
              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5">
                    {t("avatarSettingsDialog.speed")}
                    <span className="text-xs text-muted-foreground">({speed.toFixed(1)}x)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">{formatSpeed(speed)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-8">0.5x</span>
                  <Slider
                    value={[speed]}
                    onValueChange={([v]) => setSpeed(Math.round(v * 10) / 10)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">2.0x</span>
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1.5">
                    {t("avatarSettingsDialog.pitch")}
                    <span className="text-xs text-muted-foreground">({formatPitch(pitch)})</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {pitch < -4 ? t("avatarSettingsDialog.pitchLow") : pitch > 4 ? t("avatarSettingsDialog.pitchHigh") : t("avatarSettingsDialog.pitchNormal")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-8">-12</span>
                  <Slider
                    value={[pitch]}
                    onValueChange={([v]) => setPitch(Math.round(v))}
                    min={-12}
                    max={12}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">+12</span>
                </div>
              </div>

              {/* Reset & Test Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setSpeed(1.0); setPitch(0); }}
                  disabled={speed === 1.0 && pitch === 0}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("avatarSettingsDialog.resetDefaults")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={testVoice.isPending}
                  onClick={() => {
                    const voiceId = voiceMode === "clone" && selectedCloneId
                      ? voiceClones.data?.find(c => c.id === selectedCloneId)?.matchedVoiceId || ttsVoiceId
                      : ttsVoiceId;
                    testVoice.mutate({
                      voiceId,
                      text: previewText,
                      speed: speed !== 1.0 ? speed : undefined,
                      pitch: pitch !== 0 ? pitch : undefined,
                    });
                  }}
                >
                  {testVoice.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <TestTube className="w-3.5 h-3.5" />
                  )}
                  {testVoice.isPending ? t("avatarSettingsDialog.testingVoice") : t("avatarSettingsDialog.previewWithEffects")}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* A/B Comparison Test */}
          {voiceMode === "clone" && selectedCloneId && (() => {
            const selectedClone = voiceClones.data?.find(c => c.id === selectedCloneId);
            if (!selectedClone || !selectedClone.sampleUrl) return null;
            return (
              <div>
                <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                  <Headphones className="w-4 h-4" /> {t("avatarSettingsDialog.abTestSection")}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">{t("avatarSettingsDialog.abTestDesc")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Original Sample */}
                  <div className={`rounded-lg border p-3 text-center transition-all ${
                    abPlaying === "original" ? "border-orange-500 bg-orange-500/5" : "border-border"
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                      <FileAudio className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-xs font-medium mb-2">{t("avatarSettingsDialog.originalSample")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={() => {
                        if (audioRef.current) { audioRef.current.pause(); }
                        setAbPlaying("original");
                        const audio = new Audio(selectedClone.sampleUrl);
                        audioRef.current = audio;
                        audio.play();
                        audio.onended = () => { setAbPlaying(null); audioRef.current = null; };
                      }}
                    >
                      {abPlaying === "original" ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {t("avatarSettingsDialog.playOriginal")}
                    </Button>
                  </div>
                  {/* Cloned Voice */}
                  <div className={`rounded-lg border p-3 text-center transition-all ${
                    abPlaying === "clone" ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <MicVocal className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium mb-2">{t("avatarSettingsDialog.clonedVoice")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={previewClone.isPending}
                      onClick={() => {
                        if (audioRef.current) { audioRef.current.pause(); }
                        setAbPlaying("clone");
                        previewClone.mutate({
                          id: selectedCloneId,
                          text: stablePreviewText,
                          speed: speed !== 1.0 ? speed : undefined,
                          pitch: pitch !== 0 ? pitch : undefined,
                        });
                      }}
                    >
                      {previewClone.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : abPlaying === "clone" ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {t("avatarSettingsDialog.playClone")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Multi-Sample Analysis */}
          {voiceMode === "clone" && selectedCloneId && (
            <div>
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <Layers className="w-4 h-4" /> {t("avatarSettingsDialog.multiSampleSection")}
              </Label>
              <p className="text-xs text-muted-foreground mb-3">{t("avatarSettingsDialog.multiSampleDesc")}</p>

              {/* Existing samples list */}
              {cloneSamples.data && cloneSamples.data.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {cloneSamples.data.map((sample: any, idx: number) => (
                    <div key={sample.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                      <FileAudio className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{t("avatarSettingsDialog.sampleNumber").replace("{n}", String(idx + 1))}</span>
                      {sample.durationSec && <span className="text-muted-foreground">{sample.durationSec}s</span>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const audio = new Audio(sample.sampleUrl);
                          audio.play();
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => deleteSample.mutate({ id: sample.id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add sample + Analyze combined */}
              <div className="flex items-center gap-2">
                <input
                  ref={multiSampleInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAddSample(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  disabled={addSample.isPending}
                  onClick={() => multiSampleInputRef.current?.click()}
                >
                  {addSample.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {t("avatarSettingsDialog.addMoreSamples")}
                </Button>
                {cloneSamples.data && cloneSamples.data.length >= 1 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 flex-1"
                    disabled={analyzeCombined.isPending}
                    onClick={() => analyzeCombined.mutate({ voiceCloneId: selectedCloneId })}
                  >
                    {analyzeCombined.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    {t("avatarSettingsDialog.analyzeCombined")} ({(cloneSamples.data?.length || 0) + 1})
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Real-time Voice Analysis */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Zap className="w-4 h-4" /> {t("avatarSettingsDialog.realtimeAnalysis")}
            </Label>
            <p className="text-xs text-muted-foreground mb-3">{t("avatarSettingsDialog.realtimeAnalysisDesc")}</p>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 w-full mb-3"
              disabled={!recordedBlob || isAnalyzing}
              onClick={handleRealtimeAnalysis}
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {isAnalyzing ? t("avatarSettingsDialog.analyzing") : t("avatarSettingsDialog.analyzeRecording")}
            </Button>

            {!recordedBlob && (
              <p className="text-xs text-muted-foreground text-center">{t("avatarSettingsDialog.recordFirst")}</p>
            )}

            {realtimeAnalysis && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {realtimeAnalysis.gender && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.gender")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.gender}</span>
                    </div>
                  )}
                  {realtimeAnalysis.ageRange && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.ageRange")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.ageRange}</span>
                    </div>
                  )}
                  {realtimeAnalysis.tone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.tone")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.tone}</span>
                    </div>
                  )}
                  {realtimeAnalysis.pitch && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.pitchLevel")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.pitch}</span>
                    </div>
                  )}
                  {realtimeAnalysis.speed && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.speedLevel")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.speed}</span>
                    </div>
                  )}
                  {realtimeAnalysis.style && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.style")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.style}</span>
                    </div>
                  )}
                  {realtimeAnalysis.clarity && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.clarity")}:</span>
                      <span className="font-medium">{realtimeAnalysis.clarity}/10</span>
                    </div>
                  )}
                  {realtimeAnalysis.emotion && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t("avatarSettingsDialog.emotion")}:</span>
                      <span className="font-medium capitalize">{realtimeAnalysis.emotion}</span>
                    </div>
                  )}
                </div>
                {realtimeAnalysis.bestMatchVoice && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs">{t("avatarSettingsDialog.bestMatch")}:</span>
                    <span className="text-sm font-semibold text-primary">{realtimeAnalysis.bestMatchVoice}</span>
                    {realtimeAnalysis.matchConfidence && (
                      <span className="text-xs text-muted-foreground">({realtimeAnalysis.matchConfidence}%)</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto gap-1 text-xs h-7"
                      onClick={() => {
                        setTtsVoiceId(realtimeAnalysis.bestMatchVoice);
                        toast.success(t("avatarSettingsDialog.voiceApplied"));
                      }}
                    >
                      <Check className="w-3 h-3" /> {t("avatarSettingsDialog.applyVoice")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Saved Voice Effect Presets */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4" /> {t("avatarSettingsDialog.savedPresets")}
            </Label>

            {/* Existing presets list */}
            {effectPresets.data && effectPresets.data.length > 0 ? (
              <div className="space-y-2 mb-3">
                {effectPresets.data.map((preset: any) => (
                  <div key={preset.id} className="flex items-center gap-2 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t("avatarSettingsDialog.speed")}: {(preset.speed || 1.0).toFixed(1)}x · {t("avatarSettingsDialog.pitch")}: {preset.pitch > 0 ? "+" : ""}{preset.pitch || 0}
                        {preset.voiceId && ` · ${preset.voiceId}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => {
                        setSpeed(preset.speed || 1.0);
                        setPitch(preset.pitch || 0);
                        if (preset.voiceId) setTtsVoiceId(preset.voiceId);
                        toast.success(t("avatarSettingsDialog.presetLoaded"));
                      }}
                    >
                      <Play className="w-3 h-3" /> {t("avatarSettingsDialog.presetLoaded").split(" ")[0]}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${preset.isPublic ? "text-green-500" : "text-muted-foreground"}`}
                      title={preset.isPublic ? t("avatarSettingsDialog.unpublishPreset") : t("avatarSettingsDialog.publishPreset")}
                      onClick={() => publishPreset.mutate({ id: preset.id, isPublic: !preset.isPublic })}
                    >
                      <Globe className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(t("avatarSettingsDialog.confirmDeletePreset"))) {
                          deleteEffectPreset.mutate({ id: preset.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">{t("avatarSettingsDialog.noSavedPresets")}</p>
            )}

            {/* Save new preset */}
            {!showPresetForm ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 w-full"
                onClick={() => setShowPresetForm(true)}
              >
                <Save className="w-3.5 h-3.5" />
                {t("avatarSettingsDialog.saveAsPreset")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("avatarSettingsDialog.enterPresetName")}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="text-sm flex-1"
                />
                <Button
                  size="sm"
                  className="gap-1 shrink-0"
                  disabled={!newPresetName.trim() || createEffectPreset.isPending}
                  onClick={() => {
                    const voiceId = voiceMode === "clone" && selectedCloneId
                      ? voiceClones.data?.find(c => c.id === selectedCloneId)?.matchedVoiceId || ttsVoiceId
                      : ttsVoiceId;
                    createEffectPreset.mutate({
                      name: newPresetName.trim(),
                      speed,
                      pitch,
                      voiceId,
                    });
                  }}
                >
                  {createEffectPreset.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {t("avatarSettingsDialog.savePreset")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowPresetForm(false); setNewPresetName(""); }}>
                  {t("avatarSettingsDialog.cancel")}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Community Preset Library */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" /> {t("avatarSettingsDialog.communityLibrary")}
              </Label>
              <Button
                variant={showCommunity ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowCommunity(!showCommunity)}
              >
                <Globe className="w-3.5 h-3.5" />
                {showCommunity ? t("avatarSettingsDialog.hideLibrary") : t("avatarSettingsDialog.browseLibrary")}
              </Button>
            </div>

            {showCommunity && (
              <div className="space-y-3">
                {/* Search & Sort */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("avatarSettingsDialog.searchPresets")}
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="pl-8 text-xs h-8"
                    />
                  </div>
                  <Select value={communitySort} onValueChange={(v: any) => setCommunitySort(v)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">{t("avatarSettingsDialog.sortPopular")}</SelectItem>
                      <SelectItem value="newest">{t("avatarSettingsDialog.sortNewest")}</SelectItem>
                      <SelectItem value="mostUsed">{t("avatarSettingsDialog.sortMostUsed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Community presets list */}
                {communityPresets.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : communityPresets.data && communityPresets.data.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {communityPresets.data.map((preset: any) => (
                      <div key={preset.id} className="flex items-center gap-2 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{preset.name}</span>
                            <span className="text-[10px] text-muted-foreground">by {preset.userName || "Anonymous"}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {t("avatarSettingsDialog.speed")}: {(preset.speed || 1.0).toFixed(1)}x · {t("avatarSettingsDialog.pitch")}: {preset.pitch > 0 ? "+" : ""}{preset.pitch || 0}
                            {preset.voiceId && ` · ${preset.voiceId}`}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${preset.isLiked ? "text-red-500" : "text-muted-foreground"}`}
                          onClick={() => likePreset.mutate({ presetId: preset.id })}
                        >
                          <Heart className={`w-3.5 h-3.5 ${preset.isLiked ? "fill-current" : ""}`} />
                        </Button>
                        <span className="text-[10px] text-muted-foreground w-6 text-center">{preset.likes || 0}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs h-7"
                          disabled={copyPreset.isPending}
                          onClick={() => copyPreset.mutate({ presetId: preset.id })}
                        >
                          <Copy className="w-3 h-3" /> {t("avatarSettingsDialog.copyPreset")}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("avatarSettingsDialog.noCommunityPresets")}</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("avatarSettingsDialog.cancel")}</Button>
            <Button onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {t("avatarSettingsDialog.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Settings2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  );
}
