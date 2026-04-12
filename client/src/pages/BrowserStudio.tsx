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

type LayoutMode = "pip-bottom-right" | "pip-bottom-left" | "pip-top-right" | "pip-top-left" | "side-by-side" | "camera-only" | "slides-only";

export default function BrowserStudio() {
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
        toast.error("카메라 접근 권한이 필요합니다.");
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
          toast.error("마이크 접근 권한이 필요합니다.");
        }
      }
    } else {
      toast.info("먼저 카메라를 켜주세요.");
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
        toast.error("화면 공유가 취소되었습니다.");
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
        drawPlaceholder(ctx, W, H, "카메라를 켜주세요");
      }
    } else if (layoutMode === "slides-only") {
      if (hasSlide) {
        drawImageFit(ctx, slideImageRef.current!, 0, 0, W, H);
      } else if (hasScreen) {
        drawVideoFit(ctx, screenRef.current!, 0, 0, W, H);
      } else {
        drawPlaceholder(ctx, W, H, "PPT를 선택하거나 화면을 공유하세요");
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
        drawPlaceholderAt(ctx, halfW / 2, H / 2, "슬라이드");
      }
      // Right: camera
      if (hasCamera) {
        drawVideoFill(ctx, videoRef.current!, halfW, 0, halfW, H);
      } else {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(halfW, 0, halfW, H);
        drawPlaceholderAt(ctx, halfW + halfW / 2, H / 2, "카메라");
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
        drawPlaceholder(ctx, W, H, "PPT를 선택하거나 화면을 공유하세요");
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
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
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
        ctx.stroke();
        ctx.restore();
      }
    }

    // Overlay text
    if (showOverlay && isStreaming) {
      ctx.save();
      ctx.fillStyle = "rgba(255,0,0,0.8)";
      ctx.beginPath();
      roundRect(ctx, 16, 16, 80, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("● LIVE", 56, 35);
      ctx.restore();
    }

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [cameraEnabled, screenShareEnabled, layoutMode, pipSize, pipOpacity, pipShape, pipPosition, showOverlay, isStreaming, currentSlideIndex]);

  // Start/stop canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
    }
    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawFrame]);

  // Create canvas stream for output
  useEffect(() => {
    if (canvasRef.current) {
      canvasStreamRef.current = canvasRef.current.captureStream(30);
      if (outputRef.current) {
        outputRef.current.srcObject = canvasStreamRef.current;
        outputRef.current.play().catch(() => {});
      }
    }
  }, []);

  // Start streaming (capture canvas as virtual camera)
  const startStreaming = () => {
    if (!canvasRef.current) return;
    setIsStreaming(true);
    toast.success("스트리밍이 시작되었습니다! 이 화면을 Zoom/Meet에서 '화면 공유'로 선택하세요.");
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    toast.info("스트리밍이 중지되었습니다.");
  };

  // PIP drag handlers
  const handlePipDragStart = (e: React.MouseEvent) => {
    if (layoutMode.startsWith("pip-") || !layoutMode.includes("pip")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pipX: pipPosition.x,
      pipY: pipPosition.y,
    };
  };

  // Slide navigation
  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  };
  const goToNextSlide = () => {
    if (currentSlideIndex < slideImages.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
  };

  // Canvas mouse events for PIP dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !layoutMode.startsWith("pip-")) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const pipW = canvas.width * (pipSize / 100);
    const pipH = pipW * (9 / 16);
    const pipX = (canvas.width - pipW) * (pipPosition.x / 100);
    const pipY = (canvas.height - pipH) * (pipPosition.y / 100);

    if (mouseX >= pipX && mouseX <= pipX + pipW && mouseY >= pipY && mouseY <= pipY + pipH) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        pipX: pipPosition.x,
        pipY: pipPosition.y,
      };
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    const percentDx = (dx / rect.width) * 100;
    const percentDy = (dy / rect.height) * 100;
    
    const newX = Math.max(0, Math.min(100, dragStartRef.current.pipX + percentDx));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.pipY + percentDy));
    
    setPipPosition({ x: newX, y: newY });
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      // Persist custom position to backend
      updatePipMutation.mutate({
        position: "custom" as any,
        customX: Math.round(pipPosition.x),
        customY: Math.round(pipPosition.y),
      });
    }
    setIsDragging(false);
  };

  // Preset PIP positions
  const setPipPreset = (preset: string) => {
    const presetPositions: Record<string, { x: number; y: number }> = {
      "bottom-right": { x: 85, y: 85 },
      "bottom-left": { x: 5, y: 85 },
      "top-right": { x: 85, y: 5 },
      "top-left": { x: 5, y: 5 },
    };
    const pos = presetPositions[preset];
    if (pos) {
      setPipPosition(pos);
      setLayoutMode("pip-bottom-right");
      // Persist preset position
      updatePipMutation.mutate({
        position: preset as any,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hidden video elements */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <video ref={screenRef} className="hidden" muted playsInline />

      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/broadcasts")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-sm">브라우저 라이브 스튜디오</span>
            {isStreaming && (
              <Badge className="bg-red-500 text-white animate-pulse ml-2">● LIVE</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-gray-400 text-xs">
            OBS 불필요 · 브라우저에서 직접 송출
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Preview */}
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-950 relative">
            <div className="relative w-full max-w-5xl aspect-video">
              <canvas
                ref={canvasRef}
                className={`w-full h-full rounded-lg border border-gray-800 ${isDragging ? "cursor-grabbing" : layoutMode.startsWith("pip-") ? "cursor-grab" : ""}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {layoutMode.startsWith("pip-") && cameraEnabled && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-xs text-gray-300 px-2 py-1 rounded flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  PIP를 드래그하여 위치 조정
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-6">
            {/* Media Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant={cameraEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleCamera}
                className={`gap-2 ${cameraEnabled ? "bg-violet-600 hover:bg-violet-700" : "border-gray-600 text-gray-400"}`}
              >
                {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                카메라
              </Button>
              <Button
                variant={micEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleMic}
                className={`gap-2 ${micEnabled ? "bg-green-600 hover:bg-green-700" : "border-gray-600 text-gray-400"}`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                마이크
              </Button>
              <Button
                variant={screenShareEnabled ? "default" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className={`gap-2 ${screenShareEnabled ? "bg-blue-600 hover:bg-blue-700" : "border-gray-600 text-gray-400"}`}
              >
                {screenShareEnabled ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
                화면 공유
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
                  방송 시작
                </Button>
              ) : (
                <Button onClick={stopStreaming} variant="destructive" className="gap-2" size="lg">
                  <Square className="w-5 h-5" />
                  방송 중지
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
              스튜디오 설정
            </h3>
          </div>

          {/* Layout Selection */}
          <div className="p-4 space-y-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">레이아웃</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "pip-bottom-right", label: "PIP 우하", icon: "◻️" },
                { id: "pip-top-left", label: "PIP 좌상", icon: "◻️" },
                { id: "side-by-side", label: "좌우 분할", icon: "▣" },
                { id: "camera-only", label: "카메라만", icon: "📷" },
                { id: "slides-only", label: "슬라이드만", icon: "📊" },
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
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">PIP 설정</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">크기</span>
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
                  <span className="text-gray-400">투명도</span>
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
                <span className="text-xs text-gray-400">모양</span>
                <div className="flex gap-2">
                  {[
                    { id: "rounded", label: "둥근 사각" },
                    { id: "circle", label: "원형" },
                    { id: "square", label: "사각" },
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
                <span className="text-xs text-gray-400">빠른 위치</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "top-left", label: "↖ 좌상" },
                    { id: "top-right", label: "↗ 우상" },
                    { id: "bottom-left", label: "↙ 좌하" },
                    { id: "bottom-right", label: "↘ 우하" },
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
                  미리보기 화면에서 PIP를 드래그하여 자유롭게 위치 조정 가능
                </p>
              </div>
            </div>
          )}

          {/* PPT Selection */}
          <div className="p-4 space-y-3 border-b border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Presentation className="w-3 h-3" />
              PPT 슬라이드
            </h4>
            <Select value={selectedPptId} onValueChange={(v) => { setSelectedPptId(v); setCurrentSlideIndex(0); }}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-sm">
                <SelectValue placeholder="PPT 파일 선택..." />
              </SelectTrigger>
              <SelectContent>
                {pptList.data?.map((ppt: any) => (
                  <SelectItem key={ppt.id} value={ppt.id.toString()}>
                    {ppt.title} ({ppt.totalSlides}장)
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
                    <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
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
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">오버레이</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">LIVE 배지 표시</span>
              <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
            </div>
          </div>

          {/* Usage Guide */}
          <div className="p-4 space-y-2">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">사용 방법</h4>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">1</Badge>
                <span>카메라와 마이크를 켭니다</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">2</Badge>
                <span>PPT를 선택하거나 화면을 공유합니다</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">3</Badge>
                <span>레이아웃과 PIP 설정을 조정합니다</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">4</Badge>
                <span>방송 시작 후 Zoom/Meet에서 이 브라우저 탭을 화면 공유하세요</span>
              </div>
            </div>
            <Separator className="bg-gray-800" />
            <p className="text-[10px] text-gray-600 leading-relaxed">
              이 스튜디오는 OBS 없이 브라우저에서 직접 PPT + 카메라를 합성합니다.
              Zoom이나 Google Meet에서 "브라우저 탭 공유"를 선택하면 합성된 화면이 전달됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas drawing helpers
function drawVideoFill(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.max(w / vw, h / vh);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
}

function drawVideoFit(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(video, dx, dy, dw, dh);
}

function drawImageFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, w, h);
  drawPlaceholderAt(ctx, w / 2, h / 2, text);
}

function drawPlaceholderAt(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.fillStyle = "#555";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
