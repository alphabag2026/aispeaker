import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Users, Volume2, Loader2, Check, Mic, User, Sparkles, Wand2, RefreshCw, MicVocal, Play, Square, Trash2, AudioLines, Brain, CheckCircle2, FileAudio } from "lucide-react";
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

  // Voice mode: "preset" or "clone"
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
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      setIsPlayingClone(true);
      audio.play();
      audio.onended = () => setIsPlayingClone(false);
    },
    onError: (e) => toast.error(e.message),
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

  // Parse voice analysis from clone
  const getCloneAnalysis = (clone: any) => {
    try {
      return clone.voiceAnalysis ? JSON.parse(clone.voiceAnalysis) : null;
    } catch { return null; }
  };

  const currentFace = faces.find((f) => f.id === selectedFaceId);
  const displayFaceUrl = faceTab === "ai" ? aiGeneratedUrl : faceTab === "custom" ? customFaceUrl : currentFace?.imageUrl;

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
              <TabsContent value="gallery" className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 max-h-[240px] overflow-y-auto p-1">
                  {faces.filter((f) => f.isActive).map((face) => (
                    <button
                      key={face.id}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                        selectedFaceId === face.id
                          ? "border-primary ring-2 ring-primary/30 scale-105"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setSelectedFaceId(face.id)}
                    >
                      <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                      {selectedFaceId === face.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary-foreground bg-primary rounded-full p-0.5" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                        <span className="text-[9px] text-white truncate block">{face.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {faces.filter((f) => f.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("avatarSettingsDialog.noSampleFaces")}</p>
                )}
              </TabsContent>

              {/* Custom Upload Tab */}
              <TabsContent value="custom" className="mt-3">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 relative">
                    {customFaceUrl ? (
                      <img src={customFaceUrl} alt={t("avatarSettingsDialog.myFace")} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                        <User className="w-10 h-10 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground mt-1">{t("avatarSettingsDialog.gallery")}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {customFaceUrl ? t("avatarSettingsDialog.changePhoto") : t("avatarSettingsDialog.uploadMyFace")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("avatarSettingsDialog.jpgPngMax5mb")}</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
              </TabsContent>

              {/* AI Generation Tab */}
              <TabsContent value="ai" className="mt-3">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-primary/30 relative">
                      {generateFace.isPending ? (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <span className="text-[10px] text-muted-foreground mt-2">{t("avatarSettingsDialog.generating")}</span>
                        </div>
                      ) : aiGeneratedUrl ? (
                        <img src={aiGeneratedUrl} alt="AI" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                          <Wand2 className="w-8 h-8 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground mt-1">{t("avatarSettingsDialog.aiGenerated")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
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

          {/* Voice Selection - 2 modes: preset & clone */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Mic className="w-4 h-4" /> {t("avatarSettingsDialog.voiceSettings")}
            </Label>
            <Tabs value={voiceMode} onValueChange={setVoiceMode}>
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="preset" className="gap-1 text-xs">
                  <Volume2 className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.defaultVoice")}
                </TabsTrigger>
                <TabsTrigger value="clone" className="gap-1 text-xs">
                  <MicVocal className="w-3.5 h-3.5" /> {t("avatarSettingsDialog.myVoiceClone")}
                </TabsTrigger>
              </TabsList>

              {/* Preset Voice Tab */}
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
                                      previewClone.mutate({ id: clone.id, text: previewText });
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
