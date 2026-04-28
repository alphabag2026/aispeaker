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

// ============ VIDEO STYLE PRESETS ============
const VIDEO_STYLES = [
  { id: "natural", label: "자연스러운", desc: "자연스러운 움직임과 표정", prompt: "natural movement, gentle gestures, looking at camera, professional lighting", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "professional", label: "프로페셔널", desc: "전문적인 강사 스타일", prompt: "professional instructor speaking confidently, formal posture, studio lighting, clean background", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { id: "casual", label: "캐주얼", desc: "편안하고 친근한 스타일", prompt: "casual friendly speaker, relaxed posture, warm smile, comfortable setting", color: "bg-green-500/10 border-green-500/30 text-green-400" },
  { id: "energetic", label: "에너지틱", desc: "활기차고 역동적인 스타일", prompt: "energetic presenter, dynamic hand gestures, enthusiastic expression, vibrant atmosphere", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { id: "academic", label: "학술적", desc: "학술 강의 스타일", prompt: "academic lecturer, thoughtful expression, measured gestures, scholarly environment, bookshelf background", color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
  { id: "storyteller", label: "스토리텔러", desc: "이야기를 들려주는 스타일", prompt: "engaging storyteller, expressive face, dramatic pauses, warm cinematic lighting", color: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
  { id: "custom", label: "커스텀", desc: "직접 프롬프트 작성", prompt: "", color: "bg-muted border-border text-foreground" },
];

// ============ ASPECT RATIO OPTIONS ============
const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", desc: "가로 (유튜브)", icon: "▬", preview: "w-16 h-9" },
  { value: "9:16", label: "9:16", desc: "세로 (릴스/숏츠)", icon: "▮", preview: "w-9 h-16" },
  { value: "1:1", label: "1:1", desc: "정사각 (인스타)", icon: "■", preview: "w-12 h-12" },
  { value: "4:3", label: "4:3", desc: "클래식", icon: "▭", preview: "w-14 h-10" },
  { value: "3:4", label: "3:4", desc: "세로 클래식", icon: "▯", preview: "w-10 h-14" },
  { value: "2:3", label: "2:3", desc: "포트레이트", icon: "▯", preview: "w-10 h-15" },
];

interface KlingAvatarCreatorProps {
  onVideoCreated?: (videoUrl: string, sourceImageUrl: string) => void;
  onAvatarRegistered?: () => void;
  className?: string;
}

export default function KlingAvatarCreator({ onVideoCreated, onAvatarRegistered, className = "" }: KlingAvatarCreatorProps) {
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
    onSuccess: () => { taskList.refetch(); toast.success("삭제되었습니다"); },
  });
  const registerAsAvatar = trpc.kling.registerAsAvatar.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" 아바타가 등록되었습니다!`);
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
  }, [selectedStyle, prompt]);

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
        toast.success("AI 영상이 생성되었습니다!");
      } else if (status === "failed") {
        setActiveTaskId(null);
        toast.error(`영상 생성 실패: ${taskStatus.data.statusMsg || "알 수 없는 오류"}`);
      }
    }
  }, [taskStatus.data?.status]);

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
          toast.success(`영상 생성 완료! (ID: ${prevId})`, {
            description: "생성 기록에서 확인하세요",
            duration: 6000,
          });
        } else if (completedTask?.status === "failed") {
          toast.error(`영상 생성 실패 (ID: ${prevId})`, {
            description: completedTask.statusMsg || "알 수 없는 오류",
            duration: 6000,
          });
        }
      }
    });
    prevPendingRef.current = currentPending;
    setPendingTaskIds(currentPending);
  }, [taskList.data]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("10MB 이하의 이미지만 업로드 가능합니다");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSubmitImage2Video = async () => {
    if (!imageFile) { toast.error("이미지를 선택해주세요"); return; }
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
      toast.success("AI 영상 생성이 시작되었습니다. 완료까지 1~3분 소요됩니다.");
    } catch (err: any) {
      toast.error(err.message || "영상 생성 요청에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitText2Video = async () => {
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt.trim()) { toast.error("프롬프트를 입력해주세요"); return; }
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
      toast.success("AI 영상 생성이 시작되었습니다. 완료까지 1~3분 소요됩니다.");
    } catch (err: any) {
      toast.error(err.message || "영상 생성 요청에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted": return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> 대기 중</Badge>;
      case "processing": return <Badge className="bg-blue-500/20 text-blue-400 gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 생성 중</Badge>;
      case "succeed": return <Badge className="bg-green-500/20 text-green-400 gap-1"><CheckCircle2 className="w-3 h-3" /> 완료</Badge>;
      case "failed": return <Badge className="bg-red-500/20 text-red-400 gap-1"><XCircle className="w-3 h-3" /> 실패</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!klingConfigured.data?.configured) {
    return (
      <KlingSetupCard className={className} />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Active Task Progress */}
      {activeTaskId && taskStatus.data && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <h4 className="font-semibold">AI 영상 생성 중...</h4>
                <p className="text-sm text-muted-foreground">
                  {taskStatus.data.status === "submitted" ? "대기열에서 처리를 기다리고 있습니다..." :
                   taskStatus.data.status === "processing" ? "AI가 영상을 생성하고 있습니다..." :
                   taskStatus.data.statusMsg || "처리 중..."}
                </p>
              </div>
              {getStatusBadge(taskStatus.data.status)}
            </div>
            <Progress value={
              taskStatus.data.status === "submitted" ? 20 :
              taskStatus.data.status === "processing" ? 60 :
              taskStatus.data.status === "succeed" ? 100 : 0
            } className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            KLING AI 영상 생성
          </CardTitle>
          <CardDescription>
            이미지 또는 텍스트 프롬프트로 AI 아바타 영상을 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image2video" className="gap-2">
                <ImageIcon className="w-4 h-4" /> 이미지 → 영상
              </TabsTrigger>
              <TabsTrigger value="text2video" className="gap-2">
                <Wand2 className="w-4 h-4" /> 텍스트 → 영상
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image2video" className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">소스 이미지</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className="relative group rounded-xl overflow-hidden border border-border max-w-sm">
                    <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <RefreshCw className="w-4 h-4 mr-1" /> 변경
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setImagePreview(null); setImageFile(null); }}>
                        <Trash2 className="w-4 h-4 mr-1" /> 삭제
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">이미지를 업로드하세요</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WebP (최대 10MB)</span>
                  </button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="text2video" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                아래에서 영상 스타일을 선택하고, 추가 설명을 입력하세요.
              </p>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* ============ VIDEO STYLE SELECTION ============ */}
          <div>
            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" /> 영상 스타일
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {VIDEO_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedStyle === style.id
                      ? `${style.color} ring-2 ring-primary/50`
                      : "border-border hover:border-muted-foreground/50 bg-card"
                  }`}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  <span className="text-sm font-medium block">{style.label}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt or additional instructions */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {selectedStyle === "custom" ? "프롬프트" : "추가 설명 (선택)"}
            </Label>
            <Textarea
              placeholder={selectedStyle === "custom"
                ? "예: A professional Korean female instructor in her 30s, wearing a navy blazer, speaking to camera with confident gestures"
                : "예: 안경을 쓴 30대 남성, 파란색 셔츠"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={selectedStyle === "custom" ? 4 : 2}
            />
            {selectedStyle !== "custom" && (
              <p className="text-xs text-muted-foreground mt-1">
                선택한 스타일에 추가로 원하는 설명을 입력하세요. 비워두면 기본 스타일이 적용됩니다.
              </p>
            )}
          </div>

          <Separator />

          {/* ============ ASPECT RATIO VISUAL SELECTION ============ */}
          <div>
            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Crop className="w-4 h-4" /> 화면 비율
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                    aspectRatio === ratio.value
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:border-muted-foreground/50 bg-card"
                  }`}
                  onClick={() => setAspectRatio(ratio.value)}
                >
                  <div className={`${ratio.preview} bg-primary/20 rounded-sm border border-primary/30 max-h-10`} style={{ minWidth: "12px", minHeight: "12px" }} />
                  <span className="text-xs font-medium">{ratio.label}</span>
                  <span className="text-[10px] text-muted-foreground">{ratio.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1 block">영상 길이</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v as "5" | "10")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5초</SelectItem>
                  <SelectItem value="10">10초</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">품질</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "std" | "pro")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="std">Standard</SelectItem>
                  <SelectItem value="pro">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            disabled={isSubmitting || !!activeTaskId || (tab === "image2video" && !imageFile) || (tab === "text2video" && selectedStyle === "custom" && !prompt.trim())}
            onClick={tab === "image2video" ? handleSubmitImage2Video : handleSubmitText2Video}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...</>
            ) : activeTaskId ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> AI 영상 생성 시작</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ============ PREVIOUS GENERATIONS WITH AVATAR REGISTER ============ */}
      {taskList.data && taskList.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5" /> 생성 기록
            </CardTitle>
            <CardDescription>완료된 영상을 강의 아바타로 바로 등록할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taskList.data.map((task: any) => (
                <div key={task.id} className="rounded-xl border border-border overflow-hidden group">
                  {task.status === "succeed" && task.videoUrl ? (
                    <div className="relative w-full aspect-video bg-black cursor-pointer group/video"
                      onClick={() => {
                        setPreviewVideoUrl(task.videoUrl!);
                        setPreviewTaskInfo(task);
                        setPreviewDialogOpen(true);
                      }}>
                      <video
                        src={task.videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/video:opacity-100 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        {task.durationSetting}초 | {task.aspectRatio || "16:9"}
                      </div>
                    </div>
                  ) : task.sourceImageUrl ? (
                    <div className="relative w-full aspect-video bg-muted">
                      <img src={task.sourceImageUrl} alt="" className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        {getStatusBadge(task.status)}
                        {(task.status === "submitted" || task.status === "processing") && (
                          <div className="w-32">
                            <Progress value={task.status === "submitted" ? 20 : 60} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground text-center mt-1">
                              {task.status === "submitted" ? "대기열에서 처리 대기 중..." : "AI가 영상을 생성 중..."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-muted flex flex-col items-center justify-center gap-2">
                      {getStatusBadge(task.status)}
                      {(task.status === "submitted" || task.status === "processing") && (
                        <div className="w-32">
                          <Progress value={task.status === "submitted" ? 20 : 60} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-center mt-1">
                            {task.status === "submitted" ? "대기열에서 처리 대기 중..." : "AI가 영상을 생성 중..."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {task.taskType === "image2video" ? "이미지→영상" : "텍스트→영상"} | {task.mode} | {task.durationSetting}초 | {task.aspectRatio || "16:9"}
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
                          <UserPlus className="w-3.5 h-3.5" /> 아바타로 등록
                        </Button>
                      )}
                      {task.status === "succeed" && task.sampleFaceId && (
                        <Badge className="bg-green-500/10 text-green-400 text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 아바타 등록됨
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
          </CardContent>
        </Card>
      )}

      {/* ============ VIDEO PREVIEW DIALOG ============ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-border">
          <DialogHeader className="sr-only">
            <DialogTitle>영상 미리보기</DialogTitle>
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
                        {previewTaskInfo.taskType === "image2video" ? "이미지→영상" : "텍스트→영상"} | {previewTaskInfo.mode === "pro" ? "프로" : "표준"} | {previewTaskInfo.durationSetting}초
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
                          <UserPlus className="w-4 h-4" /> 아바타 등록
                        </Button>
                      )}
                      {previewTaskInfo.sampleFaceId && (
                        <Badge className="bg-green-500/10 text-green-400 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 아바타 등록됨
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
                          toast.success("다운로드가 시작됩니다");
                        }}
                      >
                        <Download className="w-4 h-4" /> 다운로드
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
              AI 아바타로 등록
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              생성된 영상을 강의에 사용할 수 있는 아바타로 등록합니다.
              등록 후 아바타 선택 목록에서 바로 사용할 수 있습니다.
            </p>
            <div>
              <Label className="text-sm mb-1 block">아바타 이름 *</Label>
              <Input
                placeholder="예: 김교수 (전문 강사)"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1 block">카테고리</Label>
                <Select value={avatarCategory} onValueChange={setAvatarCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적</SelectItem>
                    <SelectItem value="casual">캐주얼</SelectItem>
                    <SelectItem value="academic">학술적</SelectItem>
                    <SelectItem value="creative">크리에이티브</SelectItem>
                    <SelectItem value="corporate">기업</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">성별</Label>
                <Select value={avatarGender} onValueChange={setAvatarGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남성</SelectItem>
                    <SelectItem value="female">여성</SelectItem>
                    <SelectItem value="neutral">기타</SelectItem>
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
                <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> 아바타 등록</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============ KLING Setup Card (Admin can set API keys) ============
function KlingSetupCard({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const isAdmin = user?.role === "admin";

  const saveKeys = trpc.system.setKlingKeys.useMutation({
    onSuccess: () => {
      toast.success("KLING API 키가 설정되었습니다. 페이지를 새로고침합니다.");
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="py-12 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">KLING AI 영상 생성</h3>
        <p className="text-muted-foreground text-sm mb-4">
          KLING API 키가 설정되지 않았습니다.
        </p>

        {isAdmin && !showSetup && (
          <Button onClick={() => setShowSetup(true)} className="gap-2">
            <Wand2 className="w-4 h-4" /> 바로 설정하기
          </Button>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            관리자에게 KLING_ACCESS_KEY와 KLING_SECRET_KEY 설정을 요청하세요.
          </p>
        )}

        {isAdmin && showSetup && (
          <div className="mt-4 space-y-3 max-w-sm mx-auto text-left">
            <div>
              <Label className="text-xs">KLING Access Key</Label>
              <Input
                type="password"
                placeholder="Access Key 입력"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">KLING Secret Key</Label>
              <Input
                type="password"
                placeholder="Secret Key 입력"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <a href="https://klingai.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                KLING AI 공식 사이트
              </a>에서 API 키를 발급받을 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => saveKeys.mutate({ accessKey, secretKey })}
                disabled={!accessKey || !secretKey || saveKeys.isPending}
                className="flex-1"
              >
                {saveKeys.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
              </Button>
              <Button variant="outline" onClick={() => setShowSetup(false)}>
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
