import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Pen, Eraser, Type, Image as ImageIcon, Undo2, Redo2, Trash2, Play, Square,
  Wand2, Download, Loader2, MousePointer, Circle, RectangleHorizontal, Minus,
  Palette, Save, RotateCcw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// --- Types ---
type Tool = "select" | "pen" | "eraser" | "text" | "image" | "shape";
type ShapeType = "rect" | "circle" | "line";

interface Stroke {
  id: string;
  tool: "pen" | "eraser";
  points: { x: number; y: number; t: number }[];
  color: string;
  width: number;
}

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  width?: number;
}

interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

interface ShapeElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill: boolean;
}

export interface WhiteboardData {
  strokes: Stroke[];
  texts: TextElement[];
  images: ImageElement[];
  shapes: ShapeElement[];
  backgroundColor: string;
  recordedAnimation?: { strokes: Stroke[]; duration: number };
}

interface WhiteboardEditorProps {
  initialData?: WhiteboardData;
  onSave?: (data: WhiteboardData) => void;
  width?: number;
  height?: number;
  language?: string;
}

const COLORS = ["#000000", "#FF0000", "#0066FF", "#00AA00", "#FF6600", "#9933CC", "#FFFFFF"];
const FONT_SIZES = [16, 20, 24, 32, 40, 48, 64];
const BG_COLORS = ["#ffffff", "#1a1a2e", "#0f3460", "#16213e", "#f5f5dc", "#2d2d2d", "#f0f8ff"];

export default function WhiteboardEditor({ initialData, onSave, width = 960, height = 540, language = "ko" }: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [bgColor, setBgColor] = useState(initialData?.backgroundColor || "#ffffff");

  // Elements
  const [strokes, setStrokes] = useState<Stroke[]>(initialData?.strokes || []);
  const [texts, setTexts] = useState<TextElement[]>(initialData?.texts || []);
  const [images, setImages] = useState<ImageElement[]>(initialData?.images || []);
  const [shapes, setShapes] = useState<ShapeElement[]>(initialData?.shapes || []);

  // Undo/redo
  const [history, setHistory] = useState<WhiteboardData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Drawing
  const isDrawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const startTime = useRef(0);

  // Text editing
  const [editingText, setEditingText] = useState<TextElement | null>(null);
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(32);

  // Shape
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [shapeFill, setShapeFill] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordedStrokes = useRef<Stroke[]>([]);
  const recordStartTime = useRef(0);

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiContentType, setAiContentType] = useState<"text" | "diagram" | "bullet_points" | "equation" | "timeline">("text");

  // Selected element
  const [selectedElement, setSelectedElement] = useState<{ type: string; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const generateWb = trpc.lectureBuilder.generateWhiteboardContent.useMutation({
    onSuccess: (data) => {
      // Add generated text to whiteboard
      const newText: TextElement = {
        id: `text-${Date.now()}`,
        x: 40,
        y: 80,
        text: data.content,
        fontSize: 28,
        color: bgColor === "#ffffff" || bgColor === "#f5f5dc" || bgColor === "#f0f8ff" ? "#000000" : "#ffffff",
        fontFamily: "sans-serif",
      };
      setTexts(prev => [...prev, newText]);
      toast.success("AI 콘텐츠가 화이트보드에 추가되었습니다");
    },
    onError: (e) => toast.error(e.message),
  });

  // --- Canvas rendering ---
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw strokes
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? bgColor : stroke.color;
      ctx.lineWidth = stroke.tool === "eraser" ? eraserWidth : stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Draw shapes
    for (const shape of shapes) {
      ctx.beginPath();
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      if (shape.type === "rect") {
        if (shape.fill) {
          ctx.fillStyle = shape.color + "33";
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === "circle") {
        const rx = shape.width / 2;
        const ry = shape.height / 2;
        ctx.ellipse(shape.x + rx, shape.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        if (shape.fill) {
          ctx.fillStyle = shape.color + "33";
          ctx.fill();
        }
        ctx.stroke();
      } else if (shape.type === "line") {
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
      }
    }

    // Draw images
    for (const img of images) {
      const imgEl = new window.Image();
      imgEl.crossOrigin = "anonymous";
      imgEl.onload = () => {
        ctx.drawImage(imgEl, img.x, img.y, img.width, img.height);
      };
      imgEl.src = img.src;
    }

    // Draw texts
    for (const t of texts) {
      ctx.fillStyle = t.color;
      ctx.font = `${t.fontSize}px ${t.fontFamily}`;
      const lines = t.text.split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, t.x, t.y + t.fontSize + i * (t.fontSize * 1.3));
      });

      // Selection indicator
      if (selectedElement?.type === "text" && selectedElement.id === t.id) {
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        ctx.strokeStyle = "#0066FF";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(t.x - 4, t.y - 4, maxWidth + 8, lines.length * t.fontSize * 1.3 + 8);
        ctx.setLineDash([]);
      }
    }
  }, [strokes, texts, images, shapes, bgColor, width, height, selectedElement, eraserWidth]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // --- Mouse handlers ---
  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);

    if (tool === "select") {
      // Check text hit
      for (const t of [...texts].reverse()) {
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.font = `${t.fontSize}px ${t.fontFamily}`;
        const lines = t.text.split("\n");
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const h = lines.length * t.fontSize * 1.3;
        if (pos.x >= t.x && pos.x <= t.x + maxW && pos.y >= t.y && pos.y <= t.y + h) {
          setSelectedElement({ type: "text", id: t.id });
          setDragOffset({ x: pos.x - t.x, y: pos.y - t.y });
          isDragging.current = true;
          return;
        }
      }
      // Check image hit
      for (const img of [...images].reverse()) {
        if (pos.x >= img.x && pos.x <= img.x + img.width && pos.y >= img.y && pos.y <= img.y + img.height) {
          setSelectedElement({ type: "image", id: img.id });
          setDragOffset({ x: pos.x - img.x, y: pos.y - img.y });
          isDragging.current = true;
          return;
        }
      }
      setSelectedElement(null);
      return;
    }

    if (tool === "text") {
      setEditingText({ id: `text-${Date.now()}`, x: pos.x, y: pos.y, text: "", fontSize, color: penColor, fontFamily: "sans-serif" });
      setTextInput("");
      return;
    }

    if (tool === "pen" || tool === "eraser") {
      isDrawing.current = true;
      const t = isRecording ? Date.now() - recordStartTime.current : 0;
      currentStroke.current = {
        id: `stroke-${Date.now()}`,
        tool: tool === "eraser" ? "eraser" : "pen",
        points: [{ x: pos.x, y: pos.y, t }],
        color: penColor,
        width: tool === "eraser" ? eraserWidth : penWidth,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);

    if (tool === "select" && isDragging.current && selectedElement) {
      if (selectedElement.type === "text") {
        setTexts(prev => prev.map(t => t.id === selectedElement.id ? { ...t, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : t));
      } else if (selectedElement.type === "image") {
        setImages(prev => prev.map(img => img.id === selectedElement.id ? { ...img, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : img));
      }
      return;
    }

    if (!isDrawing.current || !currentStroke.current) return;
    const t = isRecording ? Date.now() - recordStartTime.current : 0;
    currentStroke.current.points.push({ x: pos.x, y: pos.y, t });

    // Live preview on overlay canvas
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const s = currentStroke.current;
    if (s.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = s.tool === "eraser" ? bgColor : s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (tool === "select") {
      isDragging.current = false;
      return;
    }
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;
    const newStroke = currentStroke.current;
    currentStroke.current = null;

    if (newStroke.points.length >= 2) {
      setStrokes(prev => [...prev, newStroke]);
      if (isRecording) {
        recordedStrokes.current.push(newStroke);
      }
    }

    // Clear overlay
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, width, height);
    }
  };

  // --- Text confirm ---
  const confirmText = () => {
    if (!editingText || !textInput.trim()) {
      setEditingText(null);
      return;
    }
    const newText: TextElement = { ...editingText, text: textInput };
    setTexts(prev => [...prev, newText]);
    setEditingText(null);
    setTextInput("");
  };

  // --- Image upload ---
  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const maxW = width * 0.4;
          const scale = Math.min(maxW / img.width, 1);
          setImages(prev => [...prev, {
            id: `img-${Date.now()}`,
            x: 40, y: 40,
            width: img.width * scale,
            height: img.height * scale,
            src, naturalWidth: img.width, naturalHeight: img.height,
          }]);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // --- Recording ---
  const startRecording = () => {
    setIsRecording(true);
    recordedStrokes.current = [];
    recordStartTime.current = Date.now();
    toast.info("펜 애니메이션 녹화 시작! 그리기를 시작하세요.");
  };

  const stopRecording = () => {
    setIsRecording(false);
    const duration = Date.now() - recordStartTime.current;
    toast.success(`녹화 완료! ${(duration / 1000).toFixed(1)}초, ${recordedStrokes.current.length}개 스트로크`);
  };

  // --- Playback ---
  const playAnimation = async () => {
    const recorded = recordedStrokes.current;
    if (recorded.length === 0) {
      toast.error("녹화된 애니메이션이 없습니다");
      return;
    }
    setIsPlaying(true);

    // Clear and redraw background
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current state, clear for playback
    const savedStrokes = [...strokes];
    setStrokes([]);

    // Animate each stroke
    for (const stroke of recorded) {
      if (stroke.points.length < 2) continue;
      for (let i = 1; i < stroke.points.length; i++) {
        const delay = stroke.points[i].t - stroke.points[i - 1].t;
        if (delay > 0) await new Promise(r => setTimeout(r, Math.min(delay, 50)));

        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === "eraser" ? bgColor : stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[i - 1].x, stroke.points[i - 1].y);
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        ctx.stroke();
      }
    }

    // Restore
    setStrokes(savedStrokes);
    setIsPlaying(false);
    toast.success("애니메이션 재생 완료");
  };

  // --- Undo/Redo ---
  const undo = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
    } else if (texts.length > 0) {
      setTexts(prev => prev.slice(0, -1));
    }
  };

  const clearAll = () => {
    setStrokes([]);
    setTexts([]);
    setImages([]);
    setShapes([]);
    setSelectedElement(null);
  };

  // --- Save ---
  const handleSave = () => {
    const data: WhiteboardData = {
      strokes, texts, images, shapes, backgroundColor: bgColor,
      recordedAnimation: recordedStrokes.current.length > 0
        ? { strokes: recordedStrokes.current, duration: Date.now() - recordStartTime.current }
        : undefined,
    };
    onSave?.(data);
    toast.success("화이트보드가 저장되었습니다");
  };

  // --- Delete selected ---
  const deleteSelected = () => {
    if (!selectedElement) return;
    if (selectedElement.type === "text") {
      setTexts(prev => prev.filter(t => t.id !== selectedElement.id));
    } else if (selectedElement.type === "image") {
      setImages(prev => prev.filter(i => i.id !== selectedElement.id));
    }
    setSelectedElement(null);
  };

  // --- Export as image ---
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCanvas();
    setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
    }, 200);
  };

  const toolButtons: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer, label: "선택" },
    { id: "pen", icon: Pen, label: "펜" },
    { id: "eraser", icon: Eraser, label: "지우개" },
    { id: "text", icon: Type, label: "텍스트" },
    { id: "image", icon: ImageIcon, label: "이미지" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg border">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          {toolButtons.map(tb => (
            <Button key={tb.id} variant={tool === tb.id ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0"
              onClick={() => { setTool(tb.id); if (tb.id === "image") handleImageUpload(); }}
              title={tb.label}>
              <tb.icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          {COLORS.map(c => (
            <button key={c}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === c ? "border-primary scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c, boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #ccc" : undefined }}
              onClick={() => setPenColor(c)}
            />
          ))}
        </div>

        {/* Pen width */}
        {(tool === "pen" || tool === "eraser") && (
          <div className="flex items-center gap-2 border-r pr-2 mr-1">
            <span className="text-xs text-muted-foreground">{tool === "pen" ? "굵기" : "크기"}</span>
            <Slider
              value={[tool === "pen" ? penWidth : eraserWidth]}
              onValueChange={v => tool === "pen" ? setPenWidth(v[0]) : setEraserWidth(v[0])}
              min={1} max={tool === "pen" ? 20 : 50} step={1}
              className="w-20"
            />
            <span className="text-xs w-6">{tool === "pen" ? penWidth : eraserWidth}</span>
          </div>
        )}

        {/* Text size */}
        {tool === "text" && (
          <div className="flex items-center gap-2 border-r pr-2 mr-1">
            <span className="text-xs text-muted-foreground">크기</span>
            <Select value={fontSize.toString()} onValueChange={v => setFontSize(parseInt(v))}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map(s => <SelectItem key={s} value={s.toString()}>{s}px</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Background */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          <Palette className="w-3 h-3 text-muted-foreground" />
          {BG_COLORS.map(c => (
            <button key={c}
              className={`w-5 h-5 rounded border transition-transform ${bgColor === c ? "border-primary scale-110" : "border-muted-foreground/30"}`}
              style={{ backgroundColor: c }}
              onClick={() => setBgColor(c)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} title="실행 취소">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearAll} title="전체 삭제">
            <Trash2 className="w-4 h-4" />
          </Button>
          {selectedElement && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={deleteSelected}>
              선택 삭제
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={exportImage} title="이미지 저장">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1" onClick={handleSave}>
            <Save className="w-3 h-3" /> 저장
          </Button>
        </div>
      </div>

      {/* Recording toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed">
        <span className="text-xs font-medium text-muted-foreground">펜 애니메이션:</span>
        {!isRecording ? (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 border-red-300" onClick={startRecording}>
            <Circle className="w-3 h-3 fill-red-500" /> 녹화 시작
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 border-red-500 animate-pulse" onClick={stopRecording}>
            <Square className="w-3 h-3 fill-red-500" /> 녹화 중지
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={playAnimation}
          disabled={isPlaying || recordedStrokes.current.length === 0}>
          {isPlaying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          재생
        </Button>
        {recordedStrokes.current.length > 0 && (
          <Badge variant="outline" className="text-xs">{recordedStrokes.current.length}개 스트로크</Badge>
        )}
      </div>

      {/* AI Generation */}
      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
        <Wand2 className="w-4 h-4 text-primary shrink-0" />
        <Select value={aiContentType} onValueChange={v => setAiContentType(v as any)}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">텍스트</SelectItem>
            <SelectItem value="bullet_points">핵심 포인트</SelectItem>
            <SelectItem value="diagram">다이어그램</SelectItem>
            <SelectItem value="equation">수식</SelectItem>
            <SelectItem value="timeline">타임라인</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder="AI에게 화이트보드 내용을 요청하세요..."
          className="h-7 text-xs flex-1"
          onKeyDown={e => {
            if (e.key === "Enter" && aiPrompt.trim()) {
              generateWb.mutate({ prompt: aiPrompt.trim(), contentType: aiContentType, language });
            }
          }}
        />
        <Button variant="default" size="sm" className="h-7 text-xs gap-1"
          disabled={!aiPrompt.trim() || generateWb.isPending}
          onClick={() => generateWb.mutate({ prompt: aiPrompt.trim(), contentType: aiContentType, language })}>
          {generateWb.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          생성
        </Button>
      </div>

      {/* Canvas area */}
      <div className="relative border rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full"
          style={{ cursor: tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : "default" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        <canvas
          ref={overlayCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Text input overlay */}
        {editingText && (
          <div className="absolute" style={{
            left: `${(editingText.x / width) * 100}%`,
            top: `${(editingText.y / height) * 100}%`,
          }}>
            <div className="bg-background border rounded-lg shadow-lg p-2 space-y-2 min-w-[200px]">
              <Textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="텍스트를 입력하세요..."
                className="text-sm min-h-[60px]"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={confirmText}>확인</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingText(null)}>취소</Button>
              </div>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs animate-pulse">
            <Circle className="w-2 h-2 fill-white" /> REC
          </div>
        )}
      </div>
    </div>
  );
}
