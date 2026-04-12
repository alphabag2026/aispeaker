import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, Trash2, Upload, Wand2, Eye, User2, Sparkles,
  GripVertical, Heart, MessageCircle, Share2, Image as ImageIcon,
  Monitor, Layout, Settings2, Check, X, Send, ChevronDown, ChevronUp,
  Presentation, Video
} from "lucide-react";

/* ─── Interactive Before/After Slider with Auto Animation ─── */
function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "원본",
  afterLabel = "AI 변환",
  autoAnimate = false,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  autoAnimate?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);
  const hasInteracted = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Auto animation on mount
  useEffect(() => {
    if (!autoAnimate) return;
    let startTime: number | null = null;
    let cancelled = false;

    const animate = (timestamp: number) => {
      if (cancelled || hasInteracted.current) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Smooth sine wave: 3 full cycles over 4 seconds, then stop
      const duration = 4000;
      if (elapsed > duration) {
        setSliderPos(50);
        return;
      }
      const progress = elapsed / duration;
      const cycles = 2.5;
      const pos = 50 + 35 * Math.sin(progress * cycles * 2 * Math.PI);
      setSliderPos(pos);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation after a short delay
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [autoAnimate]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    hasInteracted.current = true;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  }, [handleMove]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  }, [handleMove]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden cursor-col-resize select-none group"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100vw', maxWidth: 'none' }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-primary/30 group-hover:scale-110 transition-transform">
          <GripVertical className="h-5 w-5 text-primary/70" />
        </div>
      </div>
      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium z-20">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur-sm text-white text-sm font-medium z-20">
        {afterLabel}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-xs z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
        ← 드래그하여 비교 →
      </div>
    </div>
  );
}

/* ─── Technology Comparison Table ─── */
function TechComparisonTable() {
  return (
    <Card className="mb-8 border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          변환 기술 비교
        </CardTitle>
        <CardDescription>각 기술의 예상 품질, 속도, 비용을 비교하여 최적의 방식을 선택하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">항목</th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">내장 AI</span>
                    <span className="text-xs text-muted-foreground">Built-in</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs">D-ID</span>
                    <span className="text-xs text-muted-foreground">API 연동</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs">HeyGen</span>
                    <span className="text-xs text-muted-foreground">API 연동</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "품질", builtin: "⭐⭐⭐", did: "⭐⭐⭐⭐", heygen: "⭐⭐⭐⭐⭐", desc: "변환 자연스러움" },
                { label: "속도", builtin: "⚡⚡⚡⚡⚡", did: "⚡⚡⚡", heygen: "⚡⚡", desc: "처리 시간" },
                { label: "비용", builtin: "무료 (크레딧)", did: "월 $5.9~", heygen: "월 $24~", desc: "예상 비용" },
                { label: "실시간 지원", builtin: "✅", did: "✅", heygen: "❌", desc: "라이브 강의" },
                { label: "립싱크", builtin: "기본", did: "고급", heygen: "최고급", desc: "입 움직임 동기화" },
                { label: "감정 표현", builtin: "제한적", did: "보통", heygen: "우수", desc: "표정 다양성" },
                { label: "API 키 필요", builtin: "❌", did: "✅", heygen: "✅", desc: "별도 가입 필요" },
                { label: "추천 용도", builtin: "빠른 테스트\n간단한 강의", did: "일반 강의\n프라이버시", heygen: "고품질 콘텐츠\n마케팅 영상", desc: "" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-medium">{row.label}</div>
                    {row.desc && <div className="text-xs text-muted-foreground">{row.desc}</div>}
                  </td>
                  <td className="text-center py-3 px-2 whitespace-pre-line">{row.builtin}</td>
                  <td className="text-center py-3 px-2 whitespace-pre-line">{row.did}</td>
                  <td className="text-center py-3 px-2 whitespace-pre-line">{row.heygen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── PPT + PIP Lecture Mode Preview ─── */
function PipLectureModeSection() {
  const { user } = useAuth();
  const [pipPosition, setPipPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [pipSize, setPipSize] = useState<"small" | "medium" | "large">("medium");
  const [pipShape, setPipShape] = useState<"circle" | "rounded" | "rectangle">("rounded");
  const [pipOpacity, setPipOpacity] = useState(100);

  const pipSettings = trpc.pip.get.useQuery(undefined, { enabled: !!user });
  const updatePip = trpc.pip.update.useMutation({
    onSuccess: () => toast.success("PIP 설정이 저장되었습니다."),
  });

  // Load saved settings
  useEffect(() => {
    if (pipSettings.data) {
      setPipPosition(pipSettings.data.position as any);
      setPipSize(pipSettings.data.size as any);
      setPipShape(pipSettings.data.shape as any);
      setPipOpacity(pipSettings.data.opacity);
    }
  }, [pipSettings.data]);

  const sizeMap = { small: "w-20 h-20 md:w-24 md:h-24", medium: "w-28 h-28 md:w-36 md:h-36", large: "w-36 h-36 md:w-48 md:h-48" };
  const posMap = {
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
  };
  const shapeMap = { circle: "rounded-full", rounded: "rounded-2xl", rectangle: "rounded-md" };

  const handleSave = () => {
    updatePip.mutate({ position: pipPosition, size: pipSize, shape: pipShape, opacity: pipOpacity });
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Presentation className="h-5 w-5 text-primary" />
        PPT + 얼굴 노출 강의 모드 (PIP)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        PPT 슬라이드를 메인 화면에 표시하면서 강사 얼굴을 작은 창으로 함께 보여주는 PIP(Picture-in-Picture) 모드입니다.
        Zoom, Google Meet 등에서 화면 공유 시 활용할 수 있습니다.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview */}
        <Card className="overflow-hidden border-primary/10">
          <CardContent className="p-0">
            <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
              {/* Simulated PPT slide */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white">
                <div className="w-full max-w-md">
                  <div className="text-xs text-primary/80 mb-2 font-medium">SLIDE 3 / 12</div>
                  <h3 className="text-lg md:text-xl font-bold mb-3">블록체인 기술의 핵심 원리</h3>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>분산 원장 기술 (DLT)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>합의 알고리즘 (PoW, PoS)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>스마트 컨트랙트</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>암호화 해시 함수</span>
                    </div>
                  </div>
                  <div className="mt-4 h-1 bg-white/10 rounded-full">
                    <div className="h-full w-1/4 bg-primary rounded-full" />
                  </div>
                </div>
              </div>

              {/* PIP face overlay */}
              <div
                className={`absolute ${posMap[pipPosition]} ${sizeMap[pipSize]} ${shapeMap[pipShape]} overflow-hidden border-2 border-white/30 shadow-2xl transition-all duration-300`}
                style={{ opacity: pipOpacity / 100 }}
              >
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/avatar-sujin-5gLEWECpKGLiVXyqTcBK7u.webp"
                  alt="강사"
                  className="w-full h-full object-cover"
                />
                {/* Live indicator */}
                <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/80 text-white text-[10px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              </div>

              {/* Zoom-like controls bar */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-4 text-white/60 text-xs">
                <span>🎤 음소거 해제</span>
                <span>📹 비디오 켜짐</span>
                <span>🖥 화면 공유 중</span>
              </div>
            </div>
            <div className="p-3 text-center">
              <p className="text-sm font-medium">PPT + 강사 얼굴 PIP 미리보기</p>
              <p className="text-xs text-muted-foreground">설정을 변경하면 실시간으로 미리보기가 업데이트됩니다</p>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">PIP 설정</CardTitle>
            <CardDescription>강사 얼굴 창의 위치, 크기, 모양을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">위치</Label>
              <Select value={pipPosition} onValueChange={(v: any) => setPipPosition(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">우측 하단</SelectItem>
                  <SelectItem value="bottom-left">좌측 하단</SelectItem>
                  <SelectItem value="top-right">우측 상단</SelectItem>
                  <SelectItem value="top-left">좌측 상단</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">크기</Label>
              <Select value={pipSize} onValueChange={(v: any) => setPipSize(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">작게</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="large">크게</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">모양</Label>
              <Select value={pipShape} onValueChange={(v: any) => setPipShape(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">원형</SelectItem>
                  <SelectItem value="rounded">둥근 사각형</SelectItem>
                  <SelectItem value="rectangle">사각형</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">투명도: {pipOpacity}%</Label>
              <input
                type="range"
                min={30}
                max={100}
                value={pipOpacity}
                onChange={e => setPipOpacity(Number(e.target.value))}
                className="w-full mt-1 accent-primary"
              />
            </div>
            <Button onClick={handleSave} disabled={updatePip.isPending} className="w-full">
              {updatePip.isPending ? "저장 중..." : "설정 저장"}
            </Button>
            <p className="text-xs text-muted-foreground">
              이 설정은 영상 제작 시 PPT 강의 모드에 적용됩니다. 실시간 강의(Zoom/Meet)에서는 OBS Studio 등의 도구와 함께 사용하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Drag & Drop Image Upload Zone ─── */
function ImageDropZone({
  label,
  imageUrl,
  onImageSelected,
  uploading,
}: {
  label: string;
  imageUrl: string;
  onImageSelected: (file: File) => void;
  uploading: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelected(file);
    } else {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
    }
  }, [onImageSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageSelected(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [onImageSelected]);

  return (
    <div>
      <Label className="text-sm mb-1.5 block">{label}</Label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
          isDragOver
            ? "border-primary bg-primary/10 scale-[1.02]"
            : imageUrl
            ? "border-primary/30 bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        {imageUrl ? (
          <div className="relative aspect-video">
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-sm font-medium flex items-center gap-1.5">
                <Upload className="h-4 w-4" />
                이미지 변경
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex items-center gap-2 text-white text-sm">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  업로드 중...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm">업로드 중...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-primary/50" />
                <span className="text-sm font-medium">이미지를 드래그하거나 클릭하여 선택</span>
                <span className="text-xs">JPG, PNG, WebP (최대 10MB)</span>
              </>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

/* ─── DB-Connected Gallery Section ─── */
function GallerySection() {
  const { user } = useAuth();
  const galleryQuery = trpc.gallery.list.useQuery({ limit: 20 });
  const myLikesQuery = trpc.gallery.myLikes.useQuery(undefined, { enabled: !!user });
  const likeMutation = trpc.gallery.like.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      myLikesQuery.refetch();
    },
  });
  const addCommentMutation = trpc.gallery.addComment.useMutation({
    onSuccess: () => toast.success("댓글이 등록되었습니다."),
  });
  const uploadImageMutation = trpc.gallery.uploadImage.useMutation();
  const createMutation = trpc.gallery.create.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      toast.success("갤러리에 등록되었습니다!");
      setShowUpload(false);
      setUploadForm({ title: "", description: "", beforeImageUrl: "", afterImageUrl: "", method: "builtin" });
    },
  });

  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", beforeImageUrl: "", afterImageUrl: "", method: "builtin" as "builtin" | "did" | "heygen" });
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState<Record<number, string>>({});

  const myLikes = useMemo(() => new Set(myLikesQuery.data ?? []), [myLikesQuery.data]);

  // Fallback sample data when DB is empty
  const SAMPLE_GALLERY = [
    {
      id: -1, userId: 0, title: "블록체인 강의 AI 변환", description: "블록체인 강의에 AI 얼굴 변환을 적용했습니다. 학생들이 더 집중하는 효과가 있었어요!",
      beforeImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
      afterImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
      method: "builtin", likesCount: 24, commentsCount: 5, isPublic: true, createdAt: new Date("2025-12-15"),
    },
    {
      id: -2, userId: 0, title: "영어 강의 외국인 강사", description: "D-ID API를 사용하여 영어 강의에 외국인 강사 얼굴을 적용했습니다.",
      beforeImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
      afterImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
      method: "did", likesCount: 18, commentsCount: 3, isPublic: true, createdAt: new Date("2026-01-08"),
    },
  ];

  const items = (galleryQuery.data && galleryQuery.data.length > 0) ? galleryQuery.data : SAMPLE_GALLERY;

  const handleImageUpload = useCallback(async (file: File, type: "before" | "after") => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    const setUploading = type === "before" ? setUploadingBefore : setUploadingAfter;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadImageMutation.mutateAsync({
        imageData: base64,
        fileName: file.name,
        mimeType: file.type,
      });
      if (type === "before") {
        setUploadForm(prev => ({ ...prev, beforeImageUrl: result.url }));
      } else {
        setUploadForm(prev => ({ ...prev, afterImageUrl: result.url }));
      }
      toast.success(`${type === "before" ? "원본" : "변환"} 이미지가 업로드되었습니다.`);
    } catch (err) {
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }, [uploadImageMutation]);

  const handleLike = (id: number) => {
    if (!user) { toast.error("로그인이 필요합니다."); return; }
    if (id < 0) { toast.info("샘플 데이터에는 좋아요를 누를 수 없습니다."); return; }
    likeMutation.mutate({ galleryItemId: id });
  };

  const handleComment = (id: number) => {
    if (!user) { toast.error("로그인이 필요합니다."); return; }
    if (id < 0) { toast.info("샘플 데이터에는 댓글을 달 수 없습니다."); return; }
    const text = commentText[id]?.trim();
    if (!text) return;
    addCommentMutation.mutate({ galleryItemId: id, content: text });
    setCommentText(prev => ({ ...prev, [id]: "" }));
  };

  const canSubmit = uploadForm.title && uploadForm.beforeImageUrl && uploadForm.afterImageUrl && !createMutation.isPending && !uploadingBefore && !uploadingAfter;

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          사용자 변환 갤러리
        </h2>
        {user && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-4 w-4 mr-1" /> 내 결과물 공유
          </Button>
        )}
      </div>

      {/* Upload form with drag & drop */}
      {showUpload && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">결과물 공유하기</CardTitle>
            <CardDescription>AI 얼굴 변환 전/후 이미지를 드래그하거나 클릭하여 업로드하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>제목</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="예: 블록체인 강의 AI 변환" />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="변환 결과에 대한 설명을 작성해주세요" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImageDropZone
                label="원본 이미지 (Before)"
                imageUrl={uploadForm.beforeImageUrl}
                onImageSelected={(file) => handleImageUpload(file, "before")}
                uploading={uploadingBefore}
              />
              <ImageDropZone
                label="변환 이미지 (After)"
                imageUrl={uploadForm.afterImageUrl}
                onImageSelected={(file) => handleImageUpload(file, "after")}
                uploading={uploadingAfter}
              />
            </div>
            <div>
              <Label>사용 기술</Label>
              <Select value={uploadForm.method} onValueChange={(v: any) => setUploadForm({ ...uploadForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">내장 AI</SelectItem>
                  <SelectItem value="did">D-ID</SelectItem>
                  <SelectItem value="heygen">HeyGen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(uploadForm)} disabled={!canSubmit}>
                {createMutation.isPending ? "등록 중..." : "공유하기"}
              </Button>
              <Button variant="outline" onClick={() => { setShowUpload(false); setUploadForm({ title: "", description: "", beforeImageUrl: "", afterImageUrl: "", method: "builtin" }); }}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery items */}
      <div className="grid gap-6">
        {items.map((item: any) => (
          <Card key={item.id} className="overflow-hidden border-border/50 hover:border-primary/20 transition-colors">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")} · {item.method === "did" ? "D-ID" : item.method === "heygen" ? "HeyGen" : "내장 AI"}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-2">
                <BeforeAfterSlider beforeSrc={item.beforeImageUrl} afterSrc={item.afterImageUrl} />
              </div>

              <div className="p-4 pt-2">
                {item.description && <p className="text-sm mb-3">{item.description}</p>}
                <div className="flex items-center gap-4">
                  <button onClick={() => handleLike(item.id)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Heart className={`h-4 w-4 ${myLikes.has(item.id) ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{item.likesCount}</span>
                  </button>
                  <button
                    onClick={() => setExpandedComments(prev => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{item.commentsCount}</span>
                    {expandedComments.has(item.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>공유</span>
                  </button>
                </div>

                {/* Comments section */}
                {expandedComments.has(item.id) && item.id > 0 && (
                  <CommentsSection galleryItemId={item.id} />
                )}
                {expandedComments.has(item.id) && item.id < 0 && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground text-center">
                    샘플 데이터입니다. 실제 결과물을 공유하면 댓글을 달 수 있습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Comments Sub-component ─── */
function CommentsSection({ galleryItemId }: { galleryItemId: number }) {
  const { user } = useAuth();
  const commentsQuery = trpc.gallery.comments.useQuery({ galleryItemId });
  const addComment = trpc.gallery.addComment.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      setNewComment("");
      toast.success("댓글이 등록되었습니다.");
    },
  });
  const [newComment, setNewComment] = useState("");

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {commentsQuery.data?.map((c: any) => (
        <div key={c.id} className="flex gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User2 className="h-3 w-3 text-muted-foreground" />
          </div>
          <div>
            <span className="text-xs font-medium">{c.userName || "사용자"}</span>
            <p className="text-sm text-muted-foreground">{c.content}</p>
          </div>
        </div>
      ))}
      {user && (
        <div className="flex gap-2 mt-2">
          <Input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="text-sm"
            onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) addComment.mutate({ galleryItemId, content: newComment.trim() }); }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { if (newComment.trim()) addComment.mutate({ galleryItemId, content: newComment.trim() }); }}
            disabled={!newComment.trim() || addComment.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function InstructorFaceSwap() {
  const { user } = useAuth();
  const profiles = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });
  const createProfile = trpc.faceSwap.create.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 생성되었습니다."); } });
  const updateProfile = trpc.faceSwap.update.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 업데이트되었습니다."); } });
  const deleteProfile = trpc.faceSwap.delete.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 삭제되었습니다."); } });
  const uploadFace = trpc.faceSwap.uploadFace.useMutation();
  const generatePreview = trpc.faceSwap.generatePreview.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("AI 프리뷰가 생성되었습니다."); } });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", method: "builtin" as string, settings: JSON.stringify({ gender: "male", age: "30s", ethnicity: "asian" }, null, 2) });

  const handleCreate = () => {
    createProfile.mutate({ name: form.name, method: form.method as any, settings: form.settings });
    setShowForm(false);
    setForm({ name: "", method: "builtin", settings: JSON.stringify({ gender: "male", age: "30s", ethnicity: "asian" }, null, 2) });
  };

  const handleUploadFace = async (profileId: number, type: "source" | "target", file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const result = await uploadFace.mutateAsync({ imageData: base64, fileName: file.name, type });
      const updateData = type === "source" ? { sourceFaceUrl: result.url } : { targetFaceUrl: result.url };
      await updateProfile.mutateAsync({ id: profileId, ...updateData });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-studio-HS5V7dEHhBG4GbPuHinSnZ.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor"><Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></Button></Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><User2 className="h-6 w-6" /> 딥페이크 얼굴 변환</h1>
            <p className="text-white/70 mt-1">강의 시 사용할 대체 얼굴 프로필을 관리합니다</p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">

        {/* Info Banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">AI 얼굴 변환 시스템</p>
                <p className="text-sm text-muted-foreground mt-1">
                  강의 시 자신의 얼굴을 완전히 다른 사람으로 변환할 수 있습니다. 내장 AI 생성, D-ID, HeyGen 방식을 지원합니다.
                  대상 얼굴 이미지를 업로드하거나 AI로 자동 생성할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Gallery with Auto-Animated Slider */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            AI 얼굴 변환 예시
          </h2>
          <div className="grid gap-4">
            <BeforeAfterSlider
              beforeSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp"
              afterSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp"
              beforeLabel="원본"
              afterLabel="AI 변환"
              autoAnimate={true}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp"
                    alt="라이브 강의 얼굴 변환"
                    className="w-full h-auto"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium">라이브 강의 얼굴 변환</p>
                    <p className="text-xs text-muted-foreground">실시간 강의 중 자연스러운 얼굴 변환</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-3-TnoHqpD27qF7kUo8gZ9gGj.webp"
                    alt="AI 얼굴 변환 3단계 프로세스"
                    className="w-full h-auto"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium">3단계 변환 프로세스</p>
                    <p className="text-xs text-muted-foreground">얼굴 업로드 → AI 변환 → 강의 시작</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              위 이미지를 드래그하여 원본과 AI 변환 결과를 비교해보세요. 원본 강사의 얼굴을 AI가 자연스럽게 다른 얼굴로 변환합니다.
            </p>
          </div>
        </div>

        {/* Technology Comparison Table */}
        <TechComparisonTable />

        {/* PPT + PIP Lecture Mode */}
        <PipLectureModeSection />

        {/* Create New */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> 새 프로필 생성</Button>
        ) : (
          <Card className="mb-6">
            <CardHeader><CardTitle>새 딥페이크 프로필</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>프로필 이름</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 비즈니스 남성 A" />
              </div>
              <div>
                <Label>변환 방식</Label>
                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">내장 AI 생성</SelectItem>
                    <SelectItem value="did">D-ID API</SelectItem>
                    <SelectItem value="heygen">HeyGen API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>설정 (JSON)</Label>
                <Textarea value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} rows={4} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground mt-1">gender: male/female, age: 20s/30s/40s/50s, ethnicity: asian/caucasian/african 등</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!form.name || createProfile.isPending}>
                  {createProfile.isPending ? "생성 중..." : "생성"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile List */}
        <div className="grid gap-4">
          {profiles.data?.map((profile: any) => (
            <Card key={profile.id} className="overflow-hidden">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {profile.previewUrl ? (
                      <img src={profile.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : profile.targetFaceUrl ? (
                      <img src={profile.targetFaceUrl} alt="Target" className="w-full h-full object-cover" />
                    ) : (
                      <User2 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{profile.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {profile.method === "did" ? "D-ID" : profile.method === "heygen" ? "HeyGen" : "내장 AI"}
                      </span>
                      {profile.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">기본값</span>}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      <span>원본: {profile.sourceFaceUrl ? "업로드됨" : "미설정"}</span>
                      <span>대상: {profile.targetFaceUrl ? "업로드됨" : "미설정"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadFace(profile.id, "source", e.target.files[0])} />
                        <Button variant="outline" size="sm" asChild><span><Upload className="h-3 w-3 mr-1" /> 원본 얼굴</span></Button>
                      </label>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadFace(profile.id, "target", e.target.files[0])} />
                        <Button variant="outline" size="sm" asChild><span><Upload className="h-3 w-3 mr-1" /> 대상 얼굴</span></Button>
                      </label>
                      <Button variant="outline" size="sm" onClick={() => generatePreview.mutate({ profileId: profile.id })} disabled={generatePreview.isPending}>
                        <Wand2 className="h-3 w-3 mr-1" /> {generatePreview.isPending ? "생성 중..." : "AI 프리뷰"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateProfile.mutate({ id: profile.id, isDefault: true })}>
                        <Eye className="h-3 w-3 mr-1" /> 기본값 설정
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProfile.mutate({ id: profile.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {profiles.data?.length === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              <p>아직 딥페이크 프로필이 없습니다.</p>
              <p className="text-sm mt-1">위의 "새 프로필 생성" 버튼을 클릭하여 시작하세요.</p>
            </Card>
          )}
        </div>

        {/* DB-Connected Gallery */}
        <GallerySection />
      </div>
    </div>
  );
}
