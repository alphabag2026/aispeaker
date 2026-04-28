
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
  Presentation, Video, Filter, ArrowUpDown
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";

/* ─── Interactive Before/After Slider with Auto Animation ─── */
function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel: defaultBeforeLabel,
  afterLabel: defaultAfterLabel,
  autoAnimate = false,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  autoAnimate?: boolean;
}) {
  const { t } = useTranslation();
  const beforeLabel = defaultBeforeLabel || t("ifs.beforeLabel");
  const afterLabel = defaultAfterLabel || t("ifs.afterLabel");
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
        {t("ifs.dragToCompare")}
      </div>
    </div>
  );
}

/* ─── Technology Comparison Table ─── */
function TechComparisonTable() {
  const { t } = useTranslation();
  return (
    <Card className="mb-8 border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          {t("ifs.techComparisonTitle")}
        </CardTitle>
        <CardDescription>{t("ifs.techComparisonDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("ifs.tableHeaderItem")}</th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{t("ifs.tableHeaderBuiltIn")}</span>
                    <span className="text-xs text-muted-foreground">Built-in</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs">D-ID</span>
                    <span className="text-xs text-muted-foreground">{t("ifs.apiIntegration")}</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs">HeyGen</span>
                    <span className="text-xs text-muted-foreground">{t("ifs.apiIntegration")}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: t("ifs.quality"), builtin: "⭐⭐⭐", did: "⭐⭐⭐⭐", heygen: "⭐⭐⭐⭐⭐", desc: t("ifs.qualityDesc") },
                { label: t("ifs.speed"), builtin: "⚡⚡⚡⚡⚡", did: "⚡⚡⚡", heygen: "⚡⚡", desc: t("ifs.speedDesc") },
                { label: t("ifs.cost"), builtin: t("ifs.costBuiltIn"), did: t("ifs.costDid"), heygen: t("ifs.costHeygen"), desc: t("ifs.costDesc") },
                { label: t("ifs.realtimeSupport"), builtin: "✅", did: "✅", heygen: "❌", desc: t("ifs.realtimeSupportDesc") },
                { label: t("ifs.lipSync"), builtin: t("ifs.lipSyncBuiltIn"), did: t("ifs.lipSyncDid"), heygen: t("ifs.lipSyncHeygen"), desc: t("ifs.lipSyncDesc") },
                { label: t("ifs.emotionExpression"), builtin: t("ifs.emotionExpressionBuiltIn"), did: t("ifs.emotionExpressionDid"), heygen: t("ifs.emotionExpressionHeygen"), desc: t("ifs.emotionExpressionDesc") },
                { label: t("ifs.apiKeyRequired"), builtin: "❌", did: "✅", heygen: "✅", desc: t("ifs.apiKeyRequiredDesc") },
                { label: t("ifs.recommendedUse"), builtin: t("ifs.recommendedUseBuiltIn"), did: t("ifs.recommendedUseDid"), heygen: t("ifs.recommendedUseHeygen"), desc: "" },
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pipPosition, setPipPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom">("bottom-right");
  const [pipSize, setPipSize] = useState<"small" | "medium" | "large">("medium");
  const [pipShape, setPipShape] = useState<"circle" | "rounded" | "rectangle">("rounded");
  const [pipOpacity, setPipOpacity] = useState(100);
  const [customX, setCustomX] = useState(75); // percentage 0-100
  const [customY, setCustomY] = useState(75);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const pipSettings = trpc.pip.get.useQuery(undefined, { enabled: !!user });
  const updatePip = trpc.pip.update.useMutation({
    onSuccess: () => toast.success(t("ifs.pipSettingsSaved")),
  });

  // Load saved settings
  useEffect(() => {
    if (pipSettings.data) {
      setPipPosition(pipSettings.data.position as any);
      setPipSize(pipSettings.data.size as any);
      setPipShape(pipSettings.data.shape as any);
      setPipOpacity(pipSettings.data.opacity);
      setCustomX(pipSettings.data.customX ?? 75);
      setCustomY(pipSettings.data.customY ?? 75);
    }
  }, [pipSettings.data]);

  const handleSave = () => {
    updatePip.mutate({ position: pipPosition, size: pipSize, shape: pipShape, opacity: pipOpacity, customX, customY });
  };

  const handleReset = () => {
    setPipPosition("bottom-right");
    setPipSize("medium");
    setPipShape("rounded");
    setPipOpacity(100);
    setCustomX(75);
    setCustomY(75);
    updatePip.mutate({ position: "bottom-right", size: "medium", shape: "rounded", opacity: 100, customX: 75, customY: 75 });
    toast.info(t("ifs.pipSettingsReset"));
  };

  const handlePipDrag = (e: React.PointerEvent) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const pctY = Math.max(0, Math.min(100, (y / rect.height) * 100));
    setCustomX(pctX);
    setCustomY(pctY);
  };

  const pipStyle: React.CSSProperties = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      opacity: pipOpacity / 100,
      transition: isDragging ? 'none' : 'all 0.2s ease-out',
    };
    if (pipShape === 'circle') baseStyle.borderRadius = '50%';
    if (pipShape === 'rounded') baseStyle.borderRadius = '1rem';
    if (pipShape === 'rectangle') baseStyle.borderRadius = '0';

    const sizeMap = { small: '15%', medium: '20%', large: '25%' };
    baseStyle.width = sizeMap[pipSize];
    baseStyle.paddingBottom = sizeMap[pipSize];

    if (pipPosition === 'custom') {
      return { ...baseStyle, position: 'absolute', left: `${customX}%`, top: `${customY}%`, transform: 'translate(-50%, -50%)' };
    }

    const posMap = {
      'bottom-right': { bottom: '1rem', right: '1rem' },
      'bottom-left': { bottom: '1rem', left: '1rem' },
      'top-right': { top: '1rem', right: '1rem' },
      'top-left': { top: '1rem', left: '1rem' },
    };
    return { ...baseStyle, position: 'absolute', ...posMap[pipPosition] };
  }, [pipPosition, pipSize, pipShape, pipOpacity, customX, customY, isDragging]);

  return (
    <Card className="mb-8 border-primary/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" />
          {t("ifs.pipLectureModeTitle")}
        </CardTitle>
        <CardDescription>{t("ifs.pipLectureModeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview */}
          <div ref={previewRef} className="relative aspect-video rounded-xl bg-muted/30 overflow-hidden select-none">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/slide-sample-U9tJqXp9YdZfV2aRzYh8h.webp" alt="PPT Background" className="w-full h-full object-cover" />
            <div
              style={pipStyle}
              className="bg-primary/20 border-2 border-primary/50 shadow-lg cursor-move"
              onPointerDown={(e) => { if (pipPosition === 'custom') { setIsDragging(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}}
              onPointerMove={handlePipDrag}
              onPointerUp={() => setIsDragging(false)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <User2 className="h-1/3 w-1/3 text-primary/70" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("ifs.pipPositionLabel")}</Label>
                <Select value={pipPosition} onValueChange={(v: any) => setPipPosition(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">{t("ifs.pipPositionBottomRight")}</SelectItem>
                    <SelectItem value="bottom-left">{t("ifs.pipPositionBottomLeft")}</SelectItem>
                    <SelectItem value="top-right">{t("ifs.pipPositionTopRight")}</SelectItem>
                    <SelectItem value="top-left">{t("ifs.pipPositionTopLeft")}</SelectItem>
                    <SelectItem value="custom">{t("ifs.pipPositionCustom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("ifs.pipSizeLabel")}</Label>
                <Select value={pipSize} onValueChange={(v: any) => setPipSize(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t("ifs.pipSizeSmall")}</SelectItem>
                    <SelectItem value="medium">{t("ifs.pipSizeMedium")}</SelectItem>
                    <SelectItem value="large">{t("ifs.pipSizeLarge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("ifs.pipShapeLabel")}</Label>
              <Select value={pipShape} onValueChange={(v: any) => setPipShape(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">{t("ifs.pipShapeRounded")}</SelectItem>
                  <SelectItem value="circle">{t("ifs.pipShapeCircle")}</SelectItem>
                  <SelectItem value="rectangle">{t("ifs.pipShapeRectangle")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("ifs.pipOpacityLabel")} ({pipOpacity}%)</Label>
              <input type="range" min="20" max="100" value={pipOpacity} onChange={e => setPipOpacity(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updatePip.isPending}>{t("ifs.saveSettingsButton")}</Button>
              <Button size="sm" variant="outline" onClick={handleReset}>{t("ifs.resetSettingsButton")}</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── PPT Editor Section ─── */
function PptEditorSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPpt, setSelectedPpt] = useState<any>(null);
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ppts = trpc.ppt.list.useQuery(undefined, { enabled: !!user });
  const uploadPpt = trpc.ppt.upload.useMutation({
    onSuccess: () => { ppts.refetch(); toast.success(t("ifs.pptUploadSuccess")); },
    onError: () => toast.error(t("ifs.pptUploadError")),
  });
  const deletePpt = trpc.ppt.delete.useMutation({
    onSuccess: () => { ppts.refetch(); toast.success(t("ifs.pptDeleteSuccess")); setSelectedPpt(null); setSlideImages([]); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error(t("ifs.pptSizeError"));
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      uploadPpt.mutate({ title: file.name, fileName: file.name, fileData: base64, mimeType: file.type || "application/pdf" });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (selectedPpt?.slideUrls) {
      setSlideImages(JSON.parse(selectedPpt.slideUrls));
    }
  }, [selectedPpt]);

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Video className="h-5 w-5 text-primary" />
        {t("ifs.pptEditorTitle")}
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {/* PPT List */}
        <div className="md:col-span-1 space-y-3">
          <Button onClick={() => fileInputRef.current?.click()} className="w-full" disabled={uploadPpt.isPending}>
            {uploadPpt.isPending ? t("ifs.uploadingPpt") : <><Upload className="h-4 w-4 mr-2" />{t("ifs.uploadNewPpt")}</>}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".ppt, .pptx" className="hidden" />
          <Card className="max-h-96 overflow-y-auto">
            <CardContent className="p-2">
              {ppts.data?.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">{t("ifs.noPptFound")}</p>}
              {ppts.data?.map((ppt: any) => (
                <div
                  key={ppt.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
                    selectedPpt?.id === ppt.id ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => setSelectedPpt(ppt)}
                >
                  <span className="text-sm flex-1 truncate pr-2">{ppt.fileName}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deletePpt.mutate({ id: ppt.id }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Slide Preview */}
        <div className="md:col-span-2 aspect-video rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden">
          {selectedPpt && slideImages.length > 0 ? (
            <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-1 p-1">
              {slideImages.slice(0, 6).map((url, i) => (
                <img key={i} src={url} alt={`Slide ${i+1}`} className="w-full h-full object-contain rounded-sm bg-black" />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Presentation className="h-12 w-12 mx-auto mb-2" />
              <p>{t("ifs.selectPptToPreview")}</p>
            </div>
          )}
        </div>
      </div>

      {selectedPpt && slideImages.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("ifs.noSlides")}</p>
      )}
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
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelected(file);
    } else {
      toast.error(t("ifs.imageOnlyError"));
    }
  }, [onImageSelected, t]);

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
                {t("ifs.changeImage")}
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex items-center gap-2 text-white text-sm">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("ifs.uploading")}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm">{t("ifs.uploading")}</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-primary/50" />
                <span className="text-sm font-medium">{t("ifs.dragOrClick")}</span>
                <span className="text-xs">{t("ifs.imageFormats")}</span>
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [galleryMethod, setGalleryMethod] = useState<"all" | "builtin" | "did" | "heygen">("all");
  const [gallerySort, setGallerySort] = useState<"latest" | "likes">("latest");
  const PAGE_SIZE = 12;
  const [allItems, setAllItems] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const galleryQuery = trpc.gallery.list.useQuery({ limit: PAGE_SIZE, offset, method: galleryMethod, sort: gallerySort });
  const myLikesQuery = trpc.gallery.myLikes.useQuery(undefined, { enabled: !!user });
  const likeMutation = trpc.gallery.like.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      myLikesQuery.refetch();
    },
  });
  const addCommentMutation = trpc.gallery.addComment.useMutation({
    onSuccess: () => toast.success(t("ifs.commentSuccess")),
  });
  const uploadImageMutation = trpc.gallery.uploadImage.useMutation();
  const createMutation = trpc.gallery.create.useMutation({
    onSuccess: () => {
      galleryQuery.refetch();
      toast.success(t("ifs.gallerySuccess"));
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

  // Reset when filter/sort changes
  useEffect(() => {
    setAllItems([]);
    setOffset(0);
    setHasMore(true);
  }, [galleryMethod, gallerySort]);

  // Accumulate items as pages load
  useEffect(() => {
    if (galleryQuery.data) {
      if (offset === 0) {
        setAllItems(galleryQuery.data);
      } else {
        setAllItems(prev => {
          const existingIds = new Set(prev.map((i: any) => i.id));
          const newItems = galleryQuery.data.filter((i: any) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
      if (galleryQuery.data.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setLoadingMore(false);
    }
  }, [galleryQuery.data, offset]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !galleryQuery.isFetching) {
          setLoadingMore(true);
          setOffset(prev => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, galleryQuery.isFetching]);

  // Fallback sample data when DB is empty
  const SAMPLE_GALLERY = [
    {
      id: -1, userId: 0, title: t("ifs.sampleTitle1"), description: t("ifs.sampleDesc1"),
      beforeImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
      afterImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
      method: "builtin", likesCount: 24, commentsCount: 5, isPublic: true, createdAt: new Date("2025-12-15"),
    },
    {
      id: -2, userId: 0, title: t("ifs.sampleTitle2"), description: t("ifs.sampleDesc2"),
      beforeImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
      afterImageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
      method: "did", likesCount: 18, commentsCount: 3, isPublic: true, createdAt: new Date("2026-01-08"),
    },
  ];

  const items = (allItems.length > 0) ? allItems : SAMPLE_GALLERY;

  const handleImageUpload = useCallback(async (file: File, type: "before" | "after") => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("ifs.fileSizeError"));
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
      toast.success(t("ifs.imageUploadSuccess", { type: type === "before" ? t("ifs.beforeLabel") : t("ifs.afterLabel") }));
    } catch (err) {
      console.error(err);
      toast.error(t("ifs.imageUploadError"));
    } finally {
      setUploading(false);
    }
  }, [uploadImageMutation, t]);

  const handleLike = (id: number) => {
    if (!user) { toast.error(t("ifs.loginRequired")); return; }
    if (id < 0) { toast.info(t("ifs.sampleDataLikeError")); return; }
    likeMutation.mutate({ galleryItemId: id });
  };

  const handleComment = (id: number) => {
    if (!user) { toast.error(t("ifs.loginRequired")); return; }
    if (id < 0) { toast.info(t("ifs.sampleDataCommentError")); return; }
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
          {t("ifs.galleryTitle")}
        </h2>
        {user && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-4 w-4 mr-1" /> {t("ifs.shareMyWork")}
          </Button>
        )}
      </div>

      {/* Upload form with drag & drop */}
      {showUpload && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("ifs.shareWorkTitle")}</CardTitle>
            <CardDescription>{t("ifs.shareWorkDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("ifs.formTitle")}</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder={t("ifs.formTitlePlaceholder")} />
            </div>
            <div>
              <Label>{t("ifs.formDescription")}</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder={t("ifs.formDescriptionPlaceholder")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImageDropZone
                label={t("ifs.formBeforeImage")}
                imageUrl={uploadForm.beforeImageUrl}
                onImageSelected={(file) => handleImageUpload(file, "before")}
                uploading={uploadingBefore}
              />
              <ImageDropZone
                label={t("ifs.formAfterImage")}
                imageUrl={uploadForm.afterImageUrl}
                onImageSelected={(file) => handleImageUpload(file, "after")}
                uploading={uploadingAfter}
              />
            </div>
            <div>
              <Label>{t("ifs.formTechUsed")}</Label>
              <Select value={uploadForm.method} onValueChange={(v: any) => setUploadForm({ ...uploadForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">{t("ifs.techBuiltIn")}</SelectItem>
                  <SelectItem value="did">D-ID</SelectItem>
                  <SelectItem value="heygen">HeyGen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(uploadForm)} disabled={!canSubmit}>
                {createMutation.isPending ? t("ifs.sharing") : t("ifs.share")}
              </Button>
              <Button variant="outline" onClick={() => { setShowUpload(false); setUploadForm({ title: "", description: "", beforeImageUrl: "", afterImageUrl: "", method: "builtin" }); }}>{t("ifs.cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("ifs.filterTech")}:</span>
          {(["all", "builtin", "did", "heygen"] as const).map(m => (
            <Button
              key={m}
              size="sm"
              variant={galleryMethod === m ? "default" : "outline"}
              className={`h-7 text-xs ${galleryMethod === m ? "" : "bg-transparent"}`}
              onClick={() => setGalleryMethod(m)}
            >
              {m === "all" ? t("ifs.filterAll") : m === "builtin" ? t("ifs.techBuiltIn") : m === "did" ? "D-ID" : "HeyGen"}
            </Button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("ifs.sortBy")}:</span>
          <Button
            size="sm"
            variant={gallerySort === "latest" ? "default" : "outline"}
            className={`h-7 text-xs ${gallerySort === "latest" ? "" : "bg-transparent"}`}
            onClick={() => setGallerySort("latest")}
          >
            {t("ifs.sortLatest")}
          </Button>
          <Button
            size="sm"
            variant={gallerySort === "likes" ? "default" : "outline"}
            className={`h-7 text-xs ${gallerySort === "likes" ? "" : "bg-transparent"}`}
            onClick={() => setGallerySort("likes")}
          >
            <Heart className="h-3 w-3 mr-1" />{t("ifs.sortLikes")}
          </Button>
        </div>
      </div>

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
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")} · {item.method === "did" ? "D-ID" : item.method === "heygen" ? "HeyGen" : t("ifs.techBuiltIn")}
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
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success(t("ifs.linkCopied")); }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{t("ifs.share")}</span>
                  </button>
                </div>

                {/* Comments section */}
                {expandedComments.has(item.id) && item.id > 0 && (
                  <CommentsSection galleryItemId={item.id} />
                )}
                {expandedComments.has(item.id) && item.id < 0 && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground text-center">
                    {t("ifs.sampleDataCommentInfo")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && allItems.length > 0 && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-6">
          {loadingMore || galleryQuery.isFetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              {t("ifs.loadingMore")}
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}
      {!hasMore && allItems.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {t("ifs.allLoaded")}
        </div>
      )}
    </div>
  );
}

/* ─── Comments Sub-component ─── */
function CommentsSection({ galleryItemId }: { galleryItemId: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const commentsQuery = trpc.gallery.comments.useQuery({ galleryItemId });
  const addComment = trpc.gallery.addComment.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      setNewComment("");
      toast.success(t("ifs.commentSuccess"));
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
            <span className="text-xs font-medium">{c.userName || t("ifs.user")}</span>
            <p className="text-sm text-muted-foreground">{c.content}</p>
          </div>
        </div>
      ))}
      {user && (
        <div className="flex gap-2 mt-2">
          <Input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={t("ifs.commentPlaceholder")}
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const profiles = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });
  const createProfile = trpc.faceSwap.create.useMutation({ onSuccess: () => { profiles.refetch(); toast.success(t("ifs.profileCreated")); } });
  const updateProfile = trpc.faceSwap.update.useMutation({ onSuccess: () => { profiles.refetch(); toast.success(t("ifs.profileUpdated")); } });
  const deleteProfile = trpc.faceSwap.delete.useMutation({ onSuccess: () => { profiles.refetch(); toast.success(t("ifs.profileDeleted")); } });
  const uploadFace = trpc.faceSwap.uploadFace.useMutation();
  const generatePreview = trpc.faceSwap.generatePreview.useMutation({ onSuccess: () => { profiles.refetch(); toast.success(t("ifs.previewGenerated")); } });

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
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><User2 className="h-6 w-6" /> {t("ifs.pageTitle")}</h1>
            <p className="text-white/70 mt-1">{t("ifs.pageDescription")}</p>
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
                <p className="font-medium">{t("ifs.infoBannerTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("ifs.infoBannerDescription1")}
                  {t("ifs.infoBannerDescription2")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Gallery with Auto-Animated Slider */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {t("ifs.exampleTitle")}
          </h2>
          <div className="grid gap-4">
            <BeforeAfterSlider
              beforeSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp"
              afterSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp"
              autoAnimate
            />
          </div>
        </div>

        <TechComparisonTable />

        <PipLectureModeSection />

        <PptEditorSection />

        {/* Face Swap Profiles */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Presentation className="h-5 w-5 text-primary" />
              {t("ifs.profilesTitle")}
            </h2>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-1" /> {t("ifs.addProfile")}
            </Button>
          </div>

          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("ifs.newProfileTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder={t("ifs.profileNamePlaceholder")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Select value={form.method} onValueChange={method => setForm({ ...form, method })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">{t("ifs.techBuiltIn")}</SelectItem>
                    <SelectItem value="did">D-ID</SelectItem>
                    <SelectItem value="heygen">HeyGen</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder={t("ifs.settingsPlaceholder")} value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} rows={5} />
                <Button onClick={handleCreate} disabled={createProfile.isPending}>{t("ifs.createButton")}</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {profiles.data?.map((p: any) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{p.name}</CardTitle>
                      <CardDescription>{p.method === "did" ? "D-ID" : p.method === "heygen" ? "HeyGen" : t("ifs.techBuiltIn")}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteProfile.mutate({ id: p.id })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ImageDropZone label={t("ifs.sourceFaceLabel")} imageUrl={p.sourceFaceUrl} onImageSelected={file => handleUploadFace(p.id, "source", file)} uploading={uploadFace.isPending && uploadFace.variables?.type === "source"} />
                    <ImageDropZone label={t("ifs.targetFaceLabel")} imageUrl={p.targetFaceUrl} onImageSelected={file => handleUploadFace(p.id, "target", file)} uploading={uploadFace.isPending && uploadFace.variables?.type === "target"} />
                    <div className="relative aspect-video border rounded-xl bg-muted/30 flex items-center justify-center">
                      {p.previewUrl ? <img src={p.previewUrl} alt={t("ifs.previewAlt")} className="w-full h-full object-cover rounded-xl" /> : <p className="text-sm text-muted-foreground">{t("ifs.noPreview")}</p>}
                    </div>
                  </div>
                  <Button onClick={() => generatePreview.mutate({ profileId: p.id })} disabled={generatePreview.isPending}>{t("ifs.generatePreviewButton")}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <GallerySection />

      </div>
    </div>
  );
}
