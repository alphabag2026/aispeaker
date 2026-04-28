
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, Video, Wand2, Loader2, Play, Pause, RefreshCw,
  Image as ImageIcon, Sparkles, Clock, CheckCircle2, XCircle,
  Download, Trash2, Eye, UserPlus, Palette, RatioIcon, Crop
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/i18n/components/KlingAvatarCreator";

interface KlingAvatarCreatorProps {
  onVideoCreated?: (videoUrl: string, sourceImageUrl: string) => void;
  onAvatarRegistered?: () => void;
  className?: string;
}

export default function KlingAvatarCreator({ onVideoCreated, onAvatarRegistered, className = "" }: KlingAvatarCreatorProps) {
  const { t } = useLanguage();
  const VIDEO_STYLES = [
    { id: "natural", label: t("klingAvatarCreator.styleNatural"), desc: t("klingAvatarCreator.styleNaturalDesc"), prompt: "natural movement, smooth motion" },
    { id: "professional", label: t("klingAvatarCreator.styleProfessional"), desc: t("klingAvatarCreator.styleProfessionalDesc"), prompt: "professional presentation style, confident posture" },
    { id: "casual", label: t("klingAvatarCreator.styleCasual"), desc: t("klingAvatarCreator.styleCasualDesc"), prompt: "casual relaxed movement, friendly gesture" },
    { id: "energetic", label: t("klingAvatarCreator.styleEnergetic"), desc: t("klingAvatarCreator.styleEnergeticDesc"), prompt: "dynamic energetic movement, expressive gestures" },
    { id: "academic", label: t("klingAvatarCreator.styleAcademic"), desc: t("klingAvatarCreator.styleAcademicDesc"), prompt: "academic lecture style, thoughtful gestures" },
    { id: "storyteller", label: t("klingAvatarCreator.styleStoryteller"), desc: t("klingAvatarCreator.styleStorytellerDesc"), prompt: "storytelling style, engaging narrative gestures" },
    { id: "custom", label: t("klingAvatarCreator.styleCustom"), desc: t("klingAvatarCreator.styleCustomDesc"), prompt: "" },
  ];
  const ASPECT_RATIOS = [
    { value: "16:9", label: "16:9", desc: t("klingAvatarCreator.ratioLandscape") },
    { value: "9:16", label: "9:16", desc: t("klingAvatarCreator.ratioPortrait") },
    { value: "1:1", label: "1:1", desc: t("klingAvatarCreator.ratioSquare") },
  ];

  const [tab, setTab] = useState<string>("image2video");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("natural");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [mode, setMode] = useState<"std" | "pro">("std");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewTaskInfo, setPreviewTaskInfo] = useState<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Avatar registration dialog state
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registeringTaskId, setRegisteringTaskId] = useState<number | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [avatarCategory, setAvatarCategory] = useState("professional");
  const [avatarGender, setAvatarGender] = useState("neutral");

  // Track all pending task IDs for auto-polling
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const prevPendingRef = useRef<Set<number>>(new Set());

  const klingConfigured = trpc.kling.isConfigured.useQuery();
  const uploadImage = trpc.kling.uploadImage.useMutation();
  const createI2V = trpc.kling.createImageToVideo.useMutation();
  const createT2V = trpc.kling.createTextToVideo.useMutation();
  const taskStatus = trpc.kling.checkStatus.useQuery(
    { id: activeTaskId! },
    { enabled: !!activeTaskId, refetchInterval: activeTaskId ? 5000 : false }
  );
  // Auto-poll task list when there are pending tasks
  const hasPendingTasks = pendingTaskIds.size > 0 || !!activeTaskId;
  const taskList = trpc.kling.list.useQuery(
    { purpose: "avatar_preview" },
    { refetchInterval: hasPendingTasks ? 8000 : false }
  );
  const deleteTask = trpc.kling.delete.useMutation({
    onSuccess: () => { taskList.refetch(); toast.success(t("klingAvatarCreator.deleteSuccess")); },
  });
  const registerAsAvatar = trpc.kling.registerAsAvatar.useMutation({
    onSuccess: (data) => {
      toast.success(t("klingAvatarCreator.avatarRegisterSuccess", { name: data.name }));
      setRegisterDialogOpen(false);
      setAvatarName("");
      taskList.refetch();
      onAvatarRegistered?.();
    },
    onError: (err) => toast.error(err.message),
  });

  // Build final prompt from style + custom text
  const buildFinalPrompt = useCallback(() => {
    const style = VIDEO_STYLES.find(s => s.id === selectedStyle);
    if (!style || selectedStyle === "custom") return prompt;
    return prompt ? `${style.prompt}, ${prompt}` : style.prompt;
  }, [selectedStyle, prompt, VIDEO_STYLES]);

  // Stop polling when active task is done
  useEffect(() => {
    if (taskStatus.data) {
      const status = taskStatus.data.status;
      if (status === "succeed") {
        setActiveTaskId(null);
        taskList.refetch();
        if (taskStatus.data.videoUrl && onVideoCreated) {
          onVideoCreated(taskStatus.data.videoUrl, taskStatus.data.sourceImageUrl || "");
        }
        toast.success(t("klingAvatarCreator.videoCreateSuccess"));
      } else if (status === "failed") {
        setActiveTaskId(null);
        toast.error(t("klingAvatarCreator.videoCreateFail", { error: taskStatus.data.statusMsg || t("klingAvatarCreator.unknownError") }));
      }
    }
  }, [taskStatus.data?.status, t, onVideoCreated]);

  // Auto-detect pending tasks from task list and notify on completion
  useEffect(() => {
    if (!taskList.data) return;
    const currentPending = new Set<number>();
    taskList.data.forEach((task: any) => {
      if (task.status === "submitted" || task.status === "processing") {
        currentPending.add(task.id);
      }
    });
    // Check if any previously pending task has completed
    prevPendingRef.current.forEach((prevId) => {
      if (!currentPending.has(prevId) && prevId !== activeTaskId) {
        const completedTask = taskList.data.find((t: any) => t.id === prevId);
        if (completedTask?.status === "succeed") {
          toast.success(t("klingAvatarCreator.videoCreateDone", { id: prevId }), {
            description: t("klingAvatarCreator.checkHistory"),
            duration: 6000,
          });
        } else if (completedTask?.status === "failed") {
          toast.error(t("klingAvatarCreator.videoCreateFailWithId", { id: prevId }), {
            description: completedTask.statusMsg || t("klingAvatarCreator.unknownError"),
            duration: 6000,
          });
        }
      }
    });
    prevPendingRef.current = currentPending;
    setPendingTaskIds(currentPending);
  }, [taskList.data, activeTaskId, t]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("klingAvatarCreator.imageOnlyError"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("klingAvatarCreator.imageSizeError"));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, [t]);

  const handleSubmitImage2Video = async () => {
    if (!imageFile) { toast.error(t("klingAvatarCreator.selectImageError")); return; }
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(imageFile);
      });
      const { url: imageUrl } = await uploadImage.mutateAsync({
        imageData: base64,
        fileName: imageFile.name,
        mimeType: imageFile.type,
      });
      const finalPrompt = buildFinalPrompt();
      const result = await createI2V.mutateAsync({
        imageUrl,
        prompt: finalPrompt || undefined,
        duration,
        mode,
        aspectRatio,
        purpose: "avatar_preview",
      });
      setActiveTaskId(result.id);
      toast.success(t("klingAvatarCreator.videoCreateStart"));
    } catch (err: any) {
      toast.error(err.message || t("klingAvatarCreator.videoRequestFail"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitText2Video = async () => {
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt.trim()) { toast.error(t("klingAvatarCreator.promptRequired")); return; }
    setIsSubmitting(true);
    try {
      const result = await createT2V.mutateAsync({
        prompt: finalPrompt.trim(),
        duration,
        mode,
        aspectRatio,
        purpose: "avatar_preview",
      });
      setActiveTaskId(result.id);
      toast.success(t("klingAvatarCreator.videoCreateStart"));
    } catch (err: any) {
      toast.error(err.message || t("klingAvatarCreator.videoRequestFail"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge variant="outline" className="gap-1.5"><Clock className="w-3 h-3" />{t("klingAvatarCreator.statusSubmitted")}</Badge>;
      case "processing": return <Badge variant="outline" className="gap-1.5 text-blue-500 border-blue-500/30"><Loader2 className="w-3 h-3 animate-spin" />{t("klingAvatarCreator.statusProcessing")}</Badge>;
      case "succeed": return <Badge className="bg-green-500/10 text-green-400 gap-1.5"><CheckCircle2 className="w-3 h-3" />{t("klingAvatarCreator.statusSucceed")}</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1.5"><XCircle className="w-3 h-3" />{t("klingAvatarCreator.statusFailed")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!klingConfigured.data) {
    return <KlingSetupCard className={className} />;
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            {t("klingAvatarCreator.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="image2video">{t("klingAvatarCreator.imageToVideoTab")}</TabsTrigger>
              <TabsTrigger value="text2video">{t("klingAvatarCreator.textToVideoTab")}</TabsTrigger>
              <TabsTrigger value="history">{t("klingAvatarCreator.historyTab")}</TabsTrigger>
            </TabsList>

            {/* Image to Video Tab */}
            <TabsContent value="image2video" className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="relative border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[200px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-48 w-auto object-contain rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="font-semibold text-foreground">{t("klingAvatarCreator.selectImage")}</span>
                      <p className="text-xs">{t("klingAvatarCreator.dragAndDrop")}</p>
                      <p className="text-xs text-muted-foreground/70">{t("klingAvatarCreator.imageRequirement")}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">{t("klingAvatarCreator.addPrompt")}</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t("klingAvatarCreator.promptPlaceholder")}
                      className="h-24"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{t("klingAvatarCreator.videoStyle")}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {VIDEO_STYLES.map(style => (
                        <Badge
                          key={style.id}
                          variant={selectedStyle === style.id ? "default" : "outline"}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`cursor-pointer transition-all ${selectedStyle === style.id ? "" : "hover:bg-muted/50"}`}
                        >
                          {style.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.videoDuration")}</Label>
                  <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 {t("klingAvatarCreator.seconds")}</SelectItem>
                      <SelectItem value="10">10 {t("klingAvatarCreator.seconds")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.videoMode")}</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="std">{t("klingAvatarCreator.stdMode")}</SelectItem>
                      <SelectItem value="pro">{t("klingAvatarCreator.proMode")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.aspectRatio")}</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(ratio => (
                        <SelectItem key={ratio.value} value={ratio.value}>{ratio.label} <span className="text-muted-foreground ml-2">{ratio.desc}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmitImage2Video} disabled={isSubmitting || !imageFile || !!activeTaskId} className="gap-2">
                  {isSubmitting || activeTaskId ? <><Loader2 className="w-4 h-4 animate-spin" />{t("klingAvatarCreator.statusProcessing")}</> : <><Video className="w-4 h-4" />{t("klingAvatarCreator.createVideo")}</>}
                </Button>
              </div>
            </TabsContent>

            {/* Text to Video Tab */}
            <TabsContent value="text2video" className="pt-4 space-y-4">
              <div>
                <Label className="text-sm">{t("klingAvatarCreator.addPrompt")}</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("klingAvatarCreator.promptForT2V")}
                  className="h-28"
                />
              </div>
              <div>
                <Label className="text-sm">{t("klingAvatarCreator.videoStyle")}</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {VIDEO_STYLES.map(style => (
                    <Badge
                      key={style.id}
                      variant={selectedStyle === style.id ? "default" : "outline"}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`cursor-pointer transition-all ${selectedStyle === style.id ? "" : "hover:bg-muted/50"}`}
                    >
                      {style.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.videoDuration")}</Label>
                  <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 {t("klingAvatarCreator.seconds")}</SelectItem>
                      <SelectItem value="10">10 {t("klingAvatarCreator.seconds")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.videoMode")}</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="std">{t("klingAvatarCreator.stdMode")}</SelectItem>
                      <SelectItem value="pro">{t("klingAvatarCreator.proMode")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">{t("klingAvatarCreator.aspectRatio")}</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(ratio => (
                        <SelectItem key={ratio.value} value={ratio.value}>{ratio.label} <span className="text-muted-foreground ml-2">{ratio.desc}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmitText2Video} disabled={isSubmitting || !!activeTaskId} className="gap-2">
                  {isSubmitting || activeTaskId ? <><Loader2 className="w-4 h-4 animate-spin" />{t("klingAvatarCreator.statusProcessing")}</> : <><Sparkles className="w-4 h-4" />{t("klingAvatarCreator.createTextToVideo")}</>}
                </Button>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="pt-4">
              <VideoHistoryList
                tasks={taskList.data || []}
                isLoading={taskList.isLoading}
                onVideoCreated={onVideoCreated}
                onAvatarRegistered={onAvatarRegistered}
                deleteTask={deleteTask}
                setRegisteringTaskId={setRegisteringTaskId}
                setAvatarName={setAvatarName}
                setRegisterDialogOpen={setRegisterDialogOpen}
                setPreviewTaskInfo={setPreviewTaskInfo}
                setPreviewVideoUrl={setPreviewVideoUrl}
                setPreviewDialogOpen={setPreviewDialogOpen}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ============ VIDEO PREVIEW DIALOG ============ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-border">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("klingAvatarCreator.previewVideo")}</DialogTitle>
          </DialogHeader>
          {previewVideoUrl && (
            <div className="flex flex-col">
              <video
                ref={videoPreviewRef}
                src={previewVideoUrl}
                className="w-full max-h-[70vh] object-contain bg-black"
                controls
                autoPlay
                playsInline
              />
              <div className="bg-card p-4 space-y-3">
                {previewTaskInfo && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {previewTaskInfo.taskType === "image2video" ? t("klingAvatarCreator.taskTypeI2V") : t("klingAvatarCreator.taskTypeT2V")} | {previewTaskInfo.mode === "pro" ? t("klingAvatarCreator.modePro") : t("klingAvatarCreator.modeStd")} | {previewTaskInfo.durationSetting}{t("klingAvatarCreator.seconds")}
                      </p>
                      {previewTaskInfo.prompt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{previewTaskInfo.prompt}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(previewTaskInfo.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!previewTaskInfo.sampleFaceId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => {
                            setRegisteringTaskId(previewTaskInfo.id);
                            setAvatarName("");
                            setPreviewDialogOpen(false);
                            setRegisterDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4" /> {t("klingAvatarCreator.registerAvatar")}
                        </Button>
                      )}
                      {previewTaskInfo.sampleFaceId && (
                        <Badge className="bg-green-500/10 text-green-400 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {t("klingAvatarCreator.avatarRegistered")}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = previewVideoUrl;
                          a.download = `kling-${previewTaskInfo.id}-${previewTaskInfo.aspectRatio || "16-9"}.mp4`;
                          a.target = "_blank";
                          a.rel = "noopener noreferrer";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          toast.success(t("klingAvatarCreator.downloadStart"));
                        }}
                      >
                        <Download className="w-4 h-4" /> {t("klingAvatarCreator.download")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ AVATAR REGISTRATION DIALOG ============ */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t("klingAvatarCreator.registerAsAiAvatar")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("klingAvatarCreator.registerDescription1")}<br />
              {t("klingAvatarCreator.registerDescription2")}
            </p>
            <div>
              <Label className="text-sm mb-1 block">{t("klingAvatarCreator.avatarName")}</Label>
              <Input
                placeholder={t("klingAvatarCreator.avatarNamePlaceholder")}
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1 block">{t("klingAvatarCreator.category")}</Label>
                <Select value={avatarCategory} onValueChange={setAvatarCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">{t("klingAvatarCreator.categoryProfessional")}</SelectItem>
                    <SelectItem value="casual">{t("klingAvatarCreator.categoryCasual")}</SelectItem>
                    <SelectItem value="academic">{t("klingAvatarCreator.categoryAcademic")}</SelectItem>
                    <SelectItem value="creative">{t("klingAvatarCreator.categoryCreative")}</SelectItem>
                    <SelectItem value="corporate">{t("klingAvatarCreator.categoryCorporate")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">{t("klingAvatarCreator.gender")}</Label>
                <Select value={avatarGender} onValueChange={setAvatarGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("klingAvatarCreator.genderMale")}</SelectItem>
                    <SelectItem value="female">{t("klingAvatarCreator.genderFemale")}</SelectItem>
                    <SelectItem value="neutral">{t("klingAvatarCreator.genderNeutral")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!avatarName.trim() || registerAsAvatar.isPending}
              onClick={() => {
                if (!registeringTaskId) return;
                registerAsAvatar.mutate({
                  klingTaskId: registeringTaskId,
                  name: avatarName.trim(),
                  category: avatarCategory,
                  gender: avatarGender,
                });
              }}
            >
              {registerAsAvatar.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("klingAvatarCreator.registering")}</>
              ) : (
                <><UserPlus className="w-4 h-4" /> {t("klingAvatarCreator.registerAvatar")}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoHistoryList({ tasks, isLoading, onVideoCreated, deleteTask, setRegisteringTaskId, setAvatarName, setRegisterDialogOpen, setPreviewTaskInfo, setPreviewVideoUrl, setPreviewDialogOpen }: any) {
  const { t } = useLanguage();
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge variant="outline" className="gap-1.5"><Clock className="w-3 h-3" />{t("klingAvatarCreator.statusSubmitted")}</Badge>;
      case "processing": return <Badge variant="outline" className="gap-1.5 text-blue-500 border-blue-500/30"><Loader2 className="w-3 h-3 animate-spin" />{t("klingAvatarCreator.statusProcessing")}</Badge>;
      case "succeed": return <Badge className="bg-green-500/10 text-green-400 gap-1.5"><CheckCircle2 className="w-3 h-3" />{t("klingAvatarCreator.statusSucceed")}</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1.5"><XCircle className="w-3 h-3" />{t("klingAvatarCreator.statusFailed")}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Video className="w-12 h-12 mx-auto mb-3" />
        <p>{t("klingAvatarCreator.noHistory")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tasks.map((task: any) => (
        <div key={task.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
          {task.status === "succeed" && task.videoUrl ? (
            <div className="w-full aspect-video bg-black relative group">
              <video src={task.videoUrl} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="w-12 h-12 text-white" onClick={() => { setPreviewTaskInfo(task); setPreviewVideoUrl(task.videoUrl); setPreviewDialogOpen(true); }}>
                  <Play className="w-8 h-8" />
                </Button>
              </div>
              {task.sourceImageUrl && (
                <div className="absolute top-2 left-2 w-10 h-10 rounded-md overflow-hidden border-2 border-white/50">
                  <img src={task.sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video bg-muted flex flex-col items-center justify-center gap-2">
              {getStatusBadge(task.status)}
              {(task.status === "submitted" || task.status === "processing") && (
                <div className="w-32">
                  <Progress value={task.status === "submitted" ? 20 : 60} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    {task.status === "submitted" ? t("klingAvatarCreator.statusWaiting") : t("klingAvatarCreator.statusProcessing")}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {task.taskType === "image2video" ? t("klingAvatarCreator.taskTypeI2V") : t("klingAvatarCreator.taskTypeT2V")} | {task.mode} | {task.durationSetting}{t("klingAvatarCreator.seconds")} | {task.aspectRatio || "16:9"}
                </p>
                {task.prompt && (
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{task.prompt}</p>
                )}
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {new Date(task.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Register as Avatar Button */}
              {task.status === "succeed" && task.videoUrl && !task.sampleFaceId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => {
                    setRegisteringTaskId(task.id);
                    setAvatarName("");
                    setRegisterDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" /> {t("klingAvatarCreator.registerAvatar")}
                </Button>
              )}
              {task.status === "succeed" && task.sampleFaceId && (
                <Badge className="bg-green-500/10 text-green-400 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t("klingAvatarCreator.avatarRegistered")}
                </Badge>
              )}
              {task.status === "succeed" && task.videoUrl && onVideoCreated && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0"
                  onClick={() => onVideoCreated(task.videoUrl!, task.sourceImageUrl || "")}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {task.status === "succeed" && task.videoUrl && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" asChild>
                  <a href={task.videoUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
                onClick={() => deleteTask.mutate({ id: task.id })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ KLING Setup Card (Admin can set API keys) ============
function KlingSetupCard({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const isAdmin = user?.role === "admin";

  const saveKeys = trpc.system.setKlingKeys.useMutation({
    onSuccess: () => {
      toast.success(t("klingAvatarCreator.setupSuccess"));
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="py-12 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">{t("klingAvatarCreator.setupTitle")}</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {t("klingAvatarCreator.setupDescription")}
        </p>

        {isAdmin && !showSetup && (
          <Button onClick={() => setShowSetup(true)} className="gap-2">
            <Wand2 className="w-4 h-4" /> {t("klingAvatarCreator.setupNow")}
          </Button>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            {t("klingAvatarCreator.setupAdminRequest")}
          </p>
        )}

        {isAdmin && showSetup && (
          <div className="mt-4 space-y-3 max-w-sm mx-auto text-left">
            <div>
              <Label className="text-xs">KLING Access Key</Label>
              <Input
                type="password"
                placeholder={t("klingAvatarCreator.setupAccessKeyPlaceholder")}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">KLING Secret Key</Label>
              <Input
                type="password"
                placeholder={t("klingAvatarCreator.setupSecretKeyPlaceholder")}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <a href="https://klingai.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                {t("klingAvatarCreator.setupApiLink")}
              </a>{t("klingAvatarCreator.setupApiLinkDesc")}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => saveKeys.mutate({ accessKey, secretKey })}
                disabled={!accessKey || !secretKey || saveKeys.isPending}
                className="flex-1"
              >
                {saveKeys.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("klingAvatarCreator.save")}
              </Button>
              <Button variant="outline" onClick={() => setShowSetup(false)}>
                {t("klingAvatarCreator.cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
