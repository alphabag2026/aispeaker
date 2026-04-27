import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, Sparkles, Loader2, Download,
  Wand2, Image as ImageIcon, Film, X, RefreshCw
} from "lucide-react";

const CATEGORY_TABS = [
  { key: "style", label: "스타일 변환", icon: "🎨" },
  { key: "fun", label: "재미 효과", icon: "✨" },
  { key: "transform", label: "변신", icon: "🦋" },
  { key: "dance", label: "댄스", icon: "💃" },
  { key: "dual", label: "듀얼 (2인)", icon: "👫" },
];

export default function VideoEffectsStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("style");
  const [selectedEffect, setSelectedEffect] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);

  const { data: categories } = trpc.videoEffects.categories.useQuery();
  const createMut = trpc.videoEffects.create.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      toast.success("효과 적용이 시작되었습니다!");
    },
    onError: (err) => toast.error(err.message),
  });
  const uploadMut = trpc.videoEffects.upload.useMutation();

  // Polling for status
  const statusQuery = trpc.videoEffects.status.useQuery(
    { taskId: taskId || "" },
    {
      enabled: !!taskId && !resultUrl,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.taskStatus === "succeed" || data?.taskStatus === "failed") return false;
        return 3000;
      },
    }
  );

  // Handle status updates
  if (statusQuery.data?.taskStatus === "succeed" && statusQuery.data.videoUrl && !resultUrl) {
    setResultUrl(statusQuery.data.videoUrl);
  }
  if (statusQuery.data?.taskStatus === "failed" && taskId) {
    toast.error(statusQuery.data.taskStatusMsg || "효과 적용에 실패했습니다");
    setTaskId(null);
  }

  const currentEffects = categories?.[activeTab as keyof typeof categories] || [];
  const isDual = activeTab === "dual";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMut.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        if (target === 1) setImageUrl(result.url);
        else setImageUrl2(result.url);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("업로드 실패");
      setIsUploading(false);
    }
  };

  const handleGenerate = () => {
    if (!selectedEffect) {
      toast.error("효과를 선택해주세요");
      return;
    }
    if (!imageUrl) {
      toast.error("이미지를 업로드해주세요");
      return;
    }
    if (isDual && !imageUrl2) {
      toast.error("두 번째 이미지도 업로드해주세요");
      return;
    }
    setResultUrl(null);
    createMut.mutate({
      effectScene: selectedEffect,
      imageUrl: isDual ? undefined : imageUrl,
      imageUrls: isDual ? [imageUrl, imageUrl2] : undefined,
    });
  };

  const handleReset = () => {
    setTaskId(null);
    setResultUrl(null);
    setSelectedEffect("");
    setImageUrl("");
    setImageUrl2("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/ai-studio">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                Video Effects Studio
              </h1>
              <p className="text-xs text-muted-foreground">263가지 AI 비디오 이펙트 • Kling AI</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Effect Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORY_TABS.map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setActiveTab(tab.key); setSelectedEffect(""); }}
                  className="shrink-0 gap-1.5"
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Effects Grid */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-violet-400" />
                  효과 선택
                  {selectedEffect && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {(currentEffects as any[]).find((e: any) => e.id === selectedEffect)?.label || selectedEffect}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(currentEffects as any[]).map((effect: any) => (
                    <button
                      key={effect.id}
                      onClick={() => setSelectedEffect(effect.id)}
                      className={`p-3 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02] ${
                        selectedEffect === effect.id
                          ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20"
                          : "border-border/50 bg-background/50 hover:border-violet-500/30"
                      }`}
                    >
                      <div className="text-xl mb-1">{effect.emoji}</div>
                      <div className="text-xs font-medium truncate">{effect.label}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Upload & Generate */}
          <div className="space-y-4">
            {/* Image Upload */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-teal-400" />
                  {isDual ? "이미지 2장 업로드" : "이미지 업로드"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Image 1 */}
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={imageUrl} alt="Source" className="w-full h-40 object-cover" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => setImageUrl("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {isDual && <Badge className="absolute bottom-2 left-2 text-[10px]">이미지 1 (왼쪽)</Badge>}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-violet-500/50 transition-colors">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">{isDual ? "이미지 1 업로드" : "이미지 업로드"}</span>
                      </>
                    )}
                    <input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png" onChange={(e) => handleFileUpload(e, 1)} />
                  </label>
                )}

                {/* Image 2 (dual only) */}
                {isDual && (
                  <>
                    {imageUrl2 ? (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img src={imageUrl2} alt="Source 2" className="w-full h-40 object-cover" />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => setImageUrl2("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge className="absolute bottom-2 left-2 text-[10px]">이미지 2 (오른쪽)</Badge>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-violet-500/50 transition-colors">
                        {isUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground">이미지 2 업로드</span>
                          </>
                        )}
                        <input ref={fileRef2} type="file" className="hidden" accept="image/jpeg,image/png" onChange={(e) => handleFileUpload(e, 2)} />
                      </label>
                    )}
                  </>
                )}

                {/* URL input fallback */}
                <div>
                  <Label className="text-xs text-muted-foreground">또는 이미지 URL 입력</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="mt-1 text-xs h-8"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full glow-button gap-2"
                  disabled={!selectedEffect || !imageUrl || (isDual && !imageUrl2) || createMut.isPending || (!!taskId && !resultUrl)}
                  onClick={handleGenerate}
                >
                  {createMut.isPending || (taskId && !resultUrl) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {taskId && !resultUrl ? "처리 중..." : "효과 적용"}
                </Button>
              </CardContent>
            </Card>

            {/* Result */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Film className="h-4 w-4 text-pink-400" />
                  결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resultUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-border">
                      <video src={resultUrl} controls autoPlay loop className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => window.open(resultUrl, "_blank")}
                      >
                        <Download className="h-3.5 w-3.5" />
                        다운로드
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={handleReset}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        새로 만들기
                      </Button>
                    </div>
                  </div>
                ) : taskId ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-violet-400/50 mb-3" />
                    <p className="text-sm text-muted-foreground">AI가 비디오를 생성하고 있습니다...</p>
                    <p className="text-xs text-muted-foreground mt-1">보통 30초~2분 소요됩니다</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Film className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">효과를 선택하고 이미지를 업로드하세요</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
