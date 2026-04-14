import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Camera, CameraOff, Mic, MicOff, Monitor, MonitorOff,
  Play, Square, Settings, Maximize2, Minimize2,
  ArrowLeft, Presentation, User2, Eye, EyeOff,
  RotateCcw, Download, Layers, Video, Tv,
  ChevronLeft, ChevronRight, Move, GripVertical
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

type LayoutMode = "pip-bottom-right" | "pip-bottom-left" | "pip-top-right" | "pip-top-left" | "side-by-side" | "camera-only" | "slides-only";

export default function BrowserStudio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Media state
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Layout state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("pip-bottom-right");
  const [pipSize, setPipSize] = useState(25); // percentage
  const [pipOpacity, setPipOpacity] = useState(100);
  const [pipShape, setPipShape] = useState<"circle" | "rounded" | "square">("rounded");
  const [showOverlay, setShowOverlay] = useState(true);

  // PPT state
  const [selectedPptId, setSelectedPptId] = useState<string>("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Canvas / stream refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const outputRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const slideImageRef = useRef<HTMLImageElement | null>(null);

  // Draggable PIP state
  const [pipPosition, setPipPosition] = useState({ x: 75, y: 75 }); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pipX: 0, pipY: 0 });

  // Queries
  const pptList = trpc.ppt.list.useQuery(undefined, { enabled: !!user });
  const faceProfiles = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });
  const pipSettings = trpc.pip.get.useQuery(undefined, { enabled: !!user });
  const updatePipMutation = trpc.pip.update.useMutation();

  // Hydrate from saved PIP settings
  useEffect(() => {
    if (pipSettings.data) {
      const s = pipSettings.data;
      if (s.opacity != null) setPipOpacity(s.opacity);
      if (s.shape) setPipShape(s.shape === "rectangle" ? "square" : s.shape as any);
      if (s.size === "small") setPipSize(15);
      else if (s.size === "large") setPipSize(40);
      else setPipSize(25);
      if (s.position === "custom" && s.customX != null && s.customY != null) {
        setPipPosition({ x: s.customX, y: s.customY });
        setLayoutMode("pip-bottom-right");
      } else if (s.position) {
        const presetMap: Record<string, { x: number; y: number }> = {
          "bottom-right": { x: 85, y: 85 },
          "bottom-left": { x: 5, y: 85 },
          "top-right": { x: 85, y: 5 },
          "top-left": { x: 5, y: 5 },
        };
        const pos = presetMap[s.position];
        if (pos) setPipPosition(pos);
      }
    }
  }, [pipSettings.data]);

  const selectedPpt = pptList.data?.find((p: any) => p.id.toString() === selectedPptId);
  const slideImages: string[] = selectedPpt?.slideImages ? (typeof selectedPpt.slideImages === 'string' ? JSON.parse(selectedPpt.slideImages) : selectedPpt.slideImages as unknown as string[]) : [];

  // Load slide image when changed
  useEffect(() => {
    if (slideImages[currentSlideIndex]) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slideImages[currentSlideIndex];
      img.onload = () => { slideImageRef.current = img; };
    } else {
      slideImageRef.current = null;
    }
  }, [currentSlideIndex, selectedPptId, slideImages.length]);

  // Camera toggle
  const toggleCamera = async () => {
    if (cameraEnabled) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: micEnabled,
        });
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraEnabled(true);
        if (!micEnabled) {
          stream.getAudioTracks().forEach(t => t.enabled = false);
        }
      } catch (err) {
        toast.error(t("bs.camAccessError"));
      }
    }
  };

  // Mic toggle
  const toggleMic = async () => {
    if (cameraStreamRef.current) {
      const audioTracks = cameraStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(t => t.enabled = !micEnabled);
        setMicEnabled(!micEnabled);
      } else if (!micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(t => cameraStreamRef.current!.addTrack(t));
          setMicEnabled(true);
        } catch {
          toast.error(t("bs.micAccessError"));
        }
      }
    } else {
      toast.info(t("bs.camFirst"));
    }
  };

  // Screen share toggle
  const toggleScreenShare = async () => {
    if (screenShareEnabled) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      if (screenRef.current) screenRef.current.srcObject = null;
      setScreenShareEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
        });
        screenStreamRef.current = stream;
        if (screenRef.current) {
          screenRef.current.srcObject = stream;
          screenRef.current.play();
        }
        setScreenShareEnabled(true);
        stream.getVideoTracks()[0].onended = () => {
          setScreenShareEnabled(false);
          screenStreamRef.current = null;
        };
      } catch {
        toast.error(t("bs.screenShareCancelled"));
      }
    }
  };

  // Canvas compositing loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, W, H);

    const hasSlide = slideImageRef.current;
    const hasCamera = cameraEnabled && videoRef.current && videoRef.current.readyState >= 2;
    const hasScreen = screenShareEnabled && screenRef.current && screenRef.current.readyState >= 2;

    if (layoutMode === "camera-only") {
      if (hasCamera) {
        drawVideoFill(ctx, videoRef.current!, 0, 0, W, H);
      } else {
        drawPlaceholder(ctx, W, H, t("bs.turnOnCam"));
      }
    } else if (layoutMode === "slides-only") {
      if (hasSlide) {
        drawImageFit(ctx, slideImageRef.current!, 0, 0, W, H);
      } else if (hasScreen) {
        drawVideoFit(ctx, screenRef.current!, 0, 0, W, H);
      } else {
        drawPlaceholder(ctx, W, H, t("bs.selectPptOrShareScreen"));
      }
    } else if (layoutMode === "side-by-side") {
      const halfW = W / 2;
      // Left: slides/screen
      if (hasSlide) {
        drawImageFit(ctx, slideImageRef.current!, 0, 0, halfW, H);
      } else if (hasScreen) {
        drawVideoFit(ctx, screenRef.current!, 0, 0, halfW, H);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, halfW, H);
        drawPlaceholderAt(ctx, halfW / 2, H / 2, t("bs.slides"));
      }
      // Right: camera
      if (hasCamera) {
        drawVideoFill(ctx, videoRef.current!, halfW, 0, halfW, H);
      } else {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(halfW, 0, halfW, H);
        drawPlaceholderAt(ctx, halfW + halfW / 2, H / 2, t("bs.camera"));
      }
      // Divider
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, H);
      ctx.stroke();
    } else {
      // PIP modes
      // Main content: slides or screen
      if (hasSlide) {
        drawImageFit(ctx, slideImageRef.current!, 0, 0, W, H);
      } else if (hasScreen) {
        drawVideoFit(ctx, screenRef.current!, 0, 0, W, H);
      } else {
        drawPlaceholder(ctx, W, H, t("bs.selectPptOrShareScreen"));
      }

      // PIP overlay: camera
      if (hasCamera) {
        const pipW = W * (pipSize / 100);
        const pipH = pipW * (9 / 16);
        const pipX = (W - pipW) * (pipPosition.x / 100);
        const pipY = (H - pipH) * (pipPosition.y / 100);

        ctx.save();
        ctx.globalAlpha = pipOpacity / 100;

        // Shape clipping
        ctx.beginPath();
        if (pipShape === "circle") {
          const cx = pipX + pipW / 2;
          const cy = pipY + pipH / 2;
          const r = Math.min(pipW, pipH) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else if (pipShape === "rounded") {
          roundRect(ctx, pipX, pipY, pipW, pipH, 16);
        } else {
          ctx.rect(pipX, pipY, pipW, pipH);
        }
        ctx.clip();

        drawVideoFill(ctx, videoRef.current!, pipX, pipY, pipW, pipH);

        ctx.restore();

        // Border
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        if (pipShape === "circle") {
          const cx = pipX + pipW / 2;
          const cy = pipY + pipH / 2;
          const r = Math.min(pipW, pipH) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pipShape === "rounded") {
          ctx.beginPath();
          roundRect(ctx, pipX, pipY, pipW, pipH, 16);
          ctx.stroke();
        } else {
          ctx.strokeRect(pipX, pipY, pipW, pipH);
        }
        ctx.restore();
      }
    }

    // Overlay
    if (showOverlay && isStreaming) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(25, 25, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText("LIVE", 40, 30);
    }

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [cameraEnabled, screenShareEnabled, layoutMode, pipSize, pipOpacity, pipShape, pipPosition, currentSlideIndex, selectedPptId, showOverlay, isStreaming]);

  // Start/stop canvas loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawFrame]);

  // Start/stop streaming
  const startStreaming = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvasStreamRef.current = canvas.captureStream(30); // 30 FPS

    if (outputRef.current) {
      outputRef.current.srcObject = canvasStreamRef.current;
      outputRef.current.play();
    }
    setIsStreaming(true);
  };

  const stopStreaming = () => {
    canvasStreamRef.current?.getTracks().forEach(t => t.stop());
    canvasStreamRef.current = null;
    if (outputRef.current) outputRef.current.srcObject = null;
    setIsStreaming(false);
  };

  // Helper to draw placeholder text
  const drawPlaceholder = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2);
  };

  const drawPlaceholderAt = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  };

  // Fullscreen handler
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!mainRef.current) return;
    if (!document.fullscreenElement) {
      mainRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // PIP Drag handlers
  const onPipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    setIsDragging(true);
    const canvasRect = canvasRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pipX: pipPosition.x,
      pipY: pipPosition.y,
    };
    e.preventDefault();
  };

  const onPipMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newPipX = dragStartRef.current.pipX + (deltaX / canvasRect.width) * 100;
    const newPipY = dragStartRef.current.pipY + (deltaY / canvasRect.height) * 100;

    setPipPosition({
      x: Math.max(0, Math.min(100, newPipX)),
      y: Math.max(0, Math.min(100, newPipY)),
    });
  }, [isDragging]);

  const onPipMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onPipMouseMove);
      window.addEventListener("mouseup", onPipMouseUp);
    } else {
      window.removeEventListener("mousemove", onPipMouseMove);
      window.removeEventListener("mouseup", onPipMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onPipMouseMove);
      window.removeEventListener("mouseup", onPipMouseUp);
    };
  }, [isDragging, onPipMouseMove, onPipMouseUp]);

  const savePipSettings = async () => {
    try {
      await updatePipMutation.mutateAsync({
        shape: pipShape,
        size: pipSize < 20 ? "small" : pipSize > 35 ? "large" : "medium",
        opacity: pipOpacity,
        position: "custom",
        customX: pipPosition.x,
        customY: pipPosition.y,
      });
      toast.success(t("bs.pipSettingsSaved"));
    } catch (err: any) {
      toast.error(`${t("bs.pipSettingsSaveError")}: ${err.message}`);
    }
  };

  const setPipPreset = (pos: string) => {
    const presetMap: Record<string, { x: number; y: number }> = {
      "bottom-right": { x: 85, y: 85 },
      "bottom-left": { x: 5, y: 85 },
      "top-right": { x: 85, y: 5 },
      "top-left": { x: 5, y: 5 },
    };
    if (presetMap[pos]) {
      setPipPosition(presetMap[pos]);
    }
  };

  const goToPrevSlide = () => setCurrentSlideIndex(i => Math.max(0, i - 1));
  const goToNextSlide = () => setCurrentSlideIndex(i => Math.min(slideImages.length - 1, i + 1));

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col p-4 sm:p-6 lg:p-8" ref={mainRef}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("bs.title")}</h2>
            <p className="text-sm text-gray-400">{t("bs.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/')} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
            {t("bs.exit")}
          </Button>
          <Button variant="outline" onClick={toggleFullscreen} className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? t("bs.exitFullscreen") : t("bs.fullscreen")}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <Card className="flex-1 bg-gray-900 border-gray-800 flex flex-col min-h-0 relative">
            <CardHeader className="border-b border-gray-800 py-3 px-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Tv className="w-5 h-5 text-green-400" />
                {t("bs.liveOutput")}
              </CardTitle>
              <p className="text-xs text-gray-500">{t("bs.shareTabHint")}</p>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative">
              <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
              {layoutMode.startsWith("pip-") && cameraEnabled && (
                <div
                  className="absolute border-2 border-dashed border-transparent hover:border-violet-500 cursor-move transition-colors"
                  style={{
                    width: `${pipSize}%`,
                    height: `${pipSize * (9/16)}%`,
                    left: `${pipPosition.x}%`,
                    top: `${pipPosition.y}%`,
                    transform: `translate(-${pipPosition.x}%, -${pipPosition.y}%)`,
                    aspectRatio: '16 / 9'
                  }}
                  onMouseDown={onPipMouseDown}
                >
                  <div className="w-full h-full relative">
                    <GripVertical className="absolute top-1/2 -right-5 -translate-y-1/2 text-gray-500" />
                    <GripVertical className="absolute top-1/2 -left-5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            {/* Media Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant={cameraEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleCamera}
                className={`gap-2 ${cameraEnabled ? "bg-violet-600 hover:bg-violet-700" : "border-gray-600 text-gray-400"}`}
              >
                {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                {t("bs.camera")}
              </Button>
              <Button
                variant={micEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleMic}
                className={`gap-2 ${micEnabled ? "bg-green-600 hover:bg-green-700" : "border-gray-600 text-gray-400"}`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                {t("bs.mic")}
              </Button>
              <Button
                variant={screenShareEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className={`gap-2 ${screenShareEnabled ? "bg-blue-600 hover:bg-blue-700" : "border-gray-600 text-gray-400"}`}
              >
                {screenShareEnabled ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
                {t("bs.screenShare")}
              </Button>
            </div>

            {/* Slide Navigation */}
            {slideImages.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToPrevSlide} disabled={currentSlideIndex === 0}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm font-mono px-2">
                  {currentSlideIndex + 1} / {slideImages.length}
                </span>
                <Button variant="ghost" size="icon" onClick={goToNextSlide} disabled={currentSlideIndex >= slideImages.length - 1}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Stream Controls */}
            <div className="flex items-center gap-2">
              {!isStreaming ? (
                <Button onClick={startStreaming} className="gap-2 bg-red-600 hover:bg-red-700" size="lg">
                  <Play className="w-5 h-5" />
                  {t("bs.startBroadcast")}
                </Button>
              ) : (
                <Button onClick={stopStreaming} variant="destructive" className="gap-2" size="lg">
                  <Square className="w-5 h-5" />
                  {t("bs.stopBroadcast")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-400" />
              {t("bs.studioSettings")}
            </h3>
          </div>

          {/* Layout Selection */}
          <div className="p-4 space-y-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("bs.layout")}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "pip-bottom-right", label: t("bs.pipBottomRight") },
                { id: "pip-top-left", label: t("bs.pipTopLeft") },
                { id: "side-by-side", label: t("bs.sideBySide") },
                { id: "camera-only", label: t("bs.cameraOnly") },
                { id: "slides-only", label: t("bs.slidesOnly") },
              ].map((layout) => (
                <Button
                  key={layout.id}
                  variant={layoutMode === layout.id ? "default" : "outline"}
                  size="sm"
                  className={`text-xs ${layoutMode === layout.id ? "bg-violet-600" : "border-gray-700 text-gray-400"}`}
                  onClick={() => {
                    setLayoutMode(layout.id as LayoutMode);
                    if (layout.id === "pip-bottom-right") setPipPosition({ x: 85, y: 85 });
                    else if (layout.id === "pip-top-left") setPipPosition({ x: 5, y: 5 });
                  }}
                >
                  {layout.label}
                </Button>
              ))}
            </div>
          </div>

          {/* PIP Settings */}
          {layoutMode.startsWith("pip-") && (
            <div className="p-4 space-y-4 border-b border-gray-800">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("bs.pipSettings")}</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{t("bs.size")}</span>
                  <span className="text-gray-300">{pipSize}%</span>
                </div>
                <Slider
                  value={[pipSize]}
                  onValueChange={([v]) => setPipSize(v)}
                  min={10}
                  max={50}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{t("bs.opacity")}</span>
                  <span className="text-gray-300">{pipOpacity}%</span>
                </div>
                <Slider
                  value={[pipOpacity]}
                  onValueChange={([v]) => setPipOpacity(v)}
                  min={30}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-400">{t("bs.shape")}</span>
                <div className="flex gap-2">
                  {[
                    { id: "rounded", label: t("bs.roundedSquare") },
                    { id: "circle", label: t("bs.circle") },
                    { id: "square", label: t("bs.square") },
                  ].map((shape) => (
                    <Button
                      key={shape.id}
                      variant={pipShape === shape.id ? "default" : "outline"}
                      size="sm"
                      className={`text-xs flex-1 ${pipShape === shape.id ? "bg-violet-600" : "border-gray-700 text-gray-400"}`}
                      onClick={() => setPipShape(shape.id as any)}
                    >
                      {shape.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-400">{t("bs.quickPosition")}</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "top-left", label: t("bs.topLeft") },
                    { id: "top-right", label: t("bs.topRight") },
                    { id: "bottom-left", label: t("bs.bottomLeft") },
                    { id: "bottom-right", label: t("bs.bottomRight") },
                  ].map((pos) => (
                    <Button
                      key={pos.id}
                      variant="outline"
                      size="sm"
                      className="text-xs border-gray-700 text-gray-400 hover:text-white"
                      onClick={() => setPipPreset(pos.id)}
                    >
                      {pos.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  {t("bs.dragPipHint")}
                </p>
              </div>
            </div>
          )}

          {/* PPT Selection */}
          <div className="p-4 space-y-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Presentation className="w-3 h-3" />
              {t("bs.pptSlides")}
            </h4>
            <Select value={selectedPptId} onValueChange={(v) => { setSelectedPptId(v); setCurrentSlideIndex(0); }}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-sm">
                <SelectValue placeholder={t("bs.selectPptFile")} />
              </SelectTrigger>
              <SelectContent>
                {pptList.data?.map((ppt: any) => (
                  <SelectItem key={ppt.id} value={ppt.id.toString()}>
                    {t("bs.slideCount", { title: ppt.title, count: ppt.totalSlides })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Slide thumbnails */}
            {slideImages.length > 0 && (
              <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                {slideImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                      idx === currentSlideIndex ? "border-violet-500 ring-1 ring-violet-500/50" : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <img src={url} alt={`${t("bs.slide")} ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] px-1 text-gray-300">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Overlay Settings */}
          <div className="p-4 space-y-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("bs.overlay")}</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{t("bs.showLiveBadge")}</span>
              <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
            </div>
          </div>

          {/* Usage Guide */}
          <div className="p-4 space-y-2">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("bs.usageGuide")}</h4>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">1</Badge>
                <span>{t("bs.guide1")}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">2</Badge>
                <span>{t("bs.guide2")}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">3</Badge>
                <span>{t("bs.guide3")}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">4</Badge>
                <span>{t("bs.guide4")}</span>
              </div>
            </div>
            <Separator className="bg-gray-800" />
            <p className="text-[10px] text-gray-600 leading-relaxed">
              {t("bs.studioDescription")}
            </p>
          </div>
        </div>
      </div>
      <video ref={videoRef} playsInline muted className="hidden" />
      <video ref={screenRef} playsInline muted className="hidden" />
      <video ref={outputRef} playsInline controls muted className="hidden" />
    </div>
  );
}

// Canvas drawing helpers
function drawVideoFill(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const vRatio = vw / vh;
  const cRatio = w / h;

  let sx, sy, sw, sh;

  if (vRatio > cRatio) { // Video is wider than container
    sh = vh;
    sw = vh * cRatio;
    sx = (vw - sw) / 2;
    sy = 0;
  } else { // Video is taller or same ratio
    sw = vw;
    sh = vw / cRatio;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
}

function drawVideoFit(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const vRatio = vw / vh;
  const cRatio = w / h;

  let dw, dh, dx, dy;

  if (vRatio > cRatio) { // Video is wider than container
    dw = w;
    dh = w / vRatio;
    dx = x;
    dy = y + (h - dh) / 2;
  } else { // Video is taller or same ratio
    dh = h;
    dw = h * vRatio;
    dy = y;
    dx = x + (w - dw) / 2;
  }

  ctx.drawImage(video, dx, dy, dw, dh);
}

function drawImageFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const iRatio = iw / ih;
  const cRatio = w / h;

  let dw, dh, dx, dy;

  if (iRatio > cRatio) {
    dw = w;
    dh = w / iRatio;
    dx = x;
    dy = y + (h - dh) / 2;
  } else {
    dh = h;
    dw = h * iRatio;
    dy = y;
    dx = x + (w - dw) / 2;
  }

  ctx.drawImage(img, dx, dy, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
