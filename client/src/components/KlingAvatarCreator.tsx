import { useState, useRef, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import {
  Upload, Video, Wand2, Loader2, Play, Pause, RefreshCw,
  Image as ImageIcon, Sparkles, Clock, CheckCircle2, XCircle,
  Download, Trash2, Eye
} from "lucide-react";

interface KlingAvatarCreatorProps {
  onVideoCreated?: (videoUrl: string, sourceImageUrl: string) => void;
  className?: string;
}

export default function KlingAvatarCreator({ onVideoCreated, className = "" }: KlingAvatarCreatorProps) {
  const [tab, setTab] = useState<string>("image2video");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [mode, setMode] = useState<"std" | "pro">("std");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const klingConfigured = trpc.kling.isConfigured.useQuery();
  const uploadImage = trpc.kling.uploadImage.useMutation();
  const createI2V = trpc.kling.createImageToVideo.useMutation();
  const createT2V = trpc.kling.createTextToVideo.useMutation();
  const taskStatus = trpc.kling.checkStatus.useQuery(
    { id: activeTaskId! },
    { enabled: !!activeTaskId, refetchInterval: activeTaskId ? 5000 : false }
  );
  const taskList = trpc.kling.list.useQuery({ purpose: "avatar_preview" });
  const deleteTask = trpc.kling.delete.useMutation({
    onSuccess: () => { taskList.refetch(); toast.success("삭제되었습니다"); },
  });

  // Stop polling when task is done
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
      // 1. Upload image to S3
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(",")[1]); // Remove data:image/...;base64, prefix
        };
        reader.readAsDataURL(imageFile);
      });
      const { url: imageUrl } = await uploadImage.mutateAsync({
        imageData: base64,
        fileName: imageFile.name,
        mimeType: imageFile.type,
      });
      // 2. Create KLING task
      const result = await createI2V.mutateAsync({
        imageUrl,
        prompt: prompt || undefined,
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
    if (!prompt.trim()) { toast.error("프롬프트를 입력해주세요"); return; }
    setIsSubmitting(true);
    try {
      const result = await createT2V.mutateAsync({
        prompt: prompt.trim(),
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
      <Card className={`border-dashed ${className}`}>
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">KLING AI 영상 생성</h3>
          <p className="text-muted-foreground text-sm mb-4">
            KLING API 키가 설정되지 않았습니다.<br />
            관리자에게 KLING_ACCESS_KEY와 KLING_SECRET_KEY 설정을 요청하세요.
          </p>
        </CardContent>
      </Card>
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
        <CardContent>
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
              {/* Image Upload */}
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

              {/* Prompt */}
              <div>
                <Label className="text-sm font-medium mb-2 block">프롬프트 (선택)</Label>
                <Textarea
                  placeholder="예: A professional instructor speaking naturally with gentle hand gestures, looking at the camera"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">영상 생성 방향을 안내하는 텍스트입니다. 비워두면 자동으로 자연스러운 움직임이 적용됩니다.</p>
              </div>
            </TabsContent>

            <TabsContent value="text2video" className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">프롬프트</Label>
                <Textarea
                  placeholder="예: A professional Korean female instructor in her 30s, wearing a navy blazer, speaking to camera with confident gestures, in a modern studio with soft lighting"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">AI가 텍스트 설명을 기반으로 영상을 생성합니다. 구체적으로 작성할수록 좋은 결과를 얻을 수 있습니다.</p>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label className="text-sm mb-1 block">비율</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (가로)</SelectItem>
                  <SelectItem value="9:16">9:16 (세로)</SelectItem>
                  <SelectItem value="1:1">1:1 (정사각)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full mt-4 gap-2"
            disabled={isSubmitting || !!activeTaskId || (tab === "image2video" && !imageFile) || (tab === "text2video" && !prompt.trim())}
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

      {/* Previous Generations */}
      {taskList.data && taskList.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5" /> 생성 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taskList.data.map((task: any) => (
                <div key={task.id} className="rounded-xl border border-border overflow-hidden group">
                  {task.status === "succeed" && task.videoUrl ? (
                    <video
                      src={task.videoUrl}
                      className="w-full aspect-video object-cover bg-black"
                      controls
                      preload="metadata"
                    />
                  ) : task.sourceImageUrl ? (
                    <div className="relative w-full aspect-video bg-muted">
                      <img src={task.sourceImageUrl} alt="" className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {getStatusBadge(task.status)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-muted flex items-center justify-center">
                      {getStatusBadge(task.status)}
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {task.taskType === "image2video" ? "이미지→영상" : "텍스트→영상"} | {task.mode} | {task.durationSetting}초
                      </p>
                      {task.prompt && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{task.prompt}</p>
                      )}
                      <p className="text-xs text-muted-foreground/50 mt-0.5">
                        {new Date(task.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {task.status === "succeed" && task.videoUrl && onVideoCreated && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                          onClick={() => onVideoCreated(task.videoUrl!, task.sourceImageUrl || "")}>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {task.status === "succeed" && task.videoUrl && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                          <a href={task.videoUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
    </div>
  );
}
