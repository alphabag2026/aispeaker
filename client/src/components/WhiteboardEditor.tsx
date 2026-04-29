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
  Palette, Save, RotateCcw, LayoutTemplate, Table2, GitBranch, Brain, Calculator,
  FileText, BarChart3, ChevronDown, ChevronUp,
  Users, Link2, Wifi, WifiOff, Copy
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useWhiteboardCollab } from "@/hooks/useWhiteboardCollab";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onExportMp4?: (videoUrl: string) => void;
  width?: number;
  height?: number;
  language?: string;
  projectId?: number;
  insertContentId?: number;
}

const COLORS = ["#000000", "#FF0000", "#0066FF", "#00AA00", "#FF6600", "#9933CC", "#FFFFFF"];
const FONT_SIZES = [16, 20, 24, 32, 40, 48, 64];
const BG_COLORS = ["#ffffff", "#1a1a2e", "#0f3460", "#16213e", "#f5f5dc", "#2d2d2d", "#f0f8ff"];

// --- Whiteboard Templates ---
interface WbTemplate {
  id: string;
  name: string;
  desc: string;
  icon: any;
  bgColor: string;
  texts: TextElement[];
  shapes: ShapeElement[];
}

const WHITEBOARD_TEMPLATES: WbTemplate[] = [
  {
    id: "blank", name: "whiteboardEditor.blankBoard", desc: "whiteboardEditor.blankBoardDesc", icon: FileText,
    bgColor: "#ffffff", texts: [], shapes: [],
  },
  {
    id: "blackboard", name: "whiteboardEditor.blackboard", desc: "whiteboardEditor.blackboardDesc", icon: Calculator,
    bgColor: "#1a1a2e", texts: [
      { id: "t1", x: 40, y: 30, text: "whiteboardEditor.enterTitle", fontSize: 48, color: "#FFFFFF", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "line", x: 40, y: 90, width: 880, height: 0, color: "#FFFFFF", strokeWidth: 2, fill: false },
    ],
  },
  {
    id: "comparison", name: "whiteboardEditor.comparisonTable", desc: "whiteboardEditor.comparisonTableDesc", icon: Table2,
    bgColor: "#ffffff", texts: [
      { id: "t1", x: 160, y: 30, text: "whiteboardEditor.itemA", fontSize: 36, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t2", x: 600, y: 30, text: "whiteboardEditor.itemB", fontSize: 36, color: "#FF0000", fontFamily: "sans-serif" },
      { id: "t3", x: 60, y: 110, text: "whiteboardEditor.feature1", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t4", x: 60, y: 160, text: "whiteboardEditor.feature2", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t5", x: 60, y: 210, text: "whiteboardEditor.feature3", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t6", x: 510, y: 110, text: "whiteboardEditor.feature1", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t7", x: 510, y: 160, text: "whiteboardEditor.feature2", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t8", x: 510, y: 210, text: "whiteboardEditor.feature3", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "line", x: 480, y: 20, width: 0, height: 500, color: "#CCCCCC", strokeWidth: 2, fill: false },
      { id: "s2", type: "line", x: 40, y: 90, width: 880, height: 0, color: "#CCCCCC", strokeWidth: 1, fill: false },
    ],
  },
  {
    id: "timeline", name: "whiteboardEditor.timeline", desc: "whiteboardEditor.timelineDesc", icon: GitBranch,
    bgColor: "#f0f8ff", texts: [
      { id: "t1", x: 100, y: 240, text: "Step 1", fontSize: 20, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t2", x: 300, y: 240, text: "Step 2", fontSize: 20, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t3", x: 500, y: 240, text: "Step 3", fontSize: 20, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t4", x: 700, y: 240, text: "Step 4", fontSize: 20, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t5", x: 100, y: 280, text: "whiteboardEditor.description", fontSize: 16, color: "#666666", fontFamily: "sans-serif" },
      { id: "t6", x: 300, y: 280, text: "whiteboardEditor.description", fontSize: 16, color: "#666666", fontFamily: "sans-serif" },
      { id: "t7", x: 500, y: 280, text: "whiteboardEditor.description", fontSize: 16, color: "#666666", fontFamily: "sans-serif" },
      { id: "t8", x: 700, y: 280, text: "whiteboardEditor.description", fontSize: 16, color: "#666666", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "line", x: 80, y: 220, width: 800, height: 0, color: "#0066FF", strokeWidth: 3, fill: false },
      { id: "s2", type: "circle", x: 115, y: 210, width: 20, height: 20, color: "#0066FF", strokeWidth: 2, fill: true },
      { id: "s3", type: "circle", x: 315, y: 210, width: 20, height: 20, color: "#0066FF", strokeWidth: 2, fill: true },
      { id: "s4", type: "circle", x: 515, y: 210, width: 20, height: 20, color: "#0066FF", strokeWidth: 2, fill: true },
      { id: "s5", type: "circle", x: 715, y: 210, width: 20, height: 20, color: "#0066FF", strokeWidth: 2, fill: true },
    ],
  },
  {
    id: "mindmap", name: "whiteboardEditor.mindmap", desc: "whiteboardEditor.mindmapDesc", icon: Brain,
    bgColor: "#ffffff", texts: [
      { id: "t1", x: 400, y: 240, text: "whiteboardEditor.topic", fontSize: 36, color: "#0066FF", fontFamily: "sans-serif" },
      { id: "t2", x: 140, y: 100, text: "whiteboardEditor.item1", fontSize: 24, color: "#FF6600", fontFamily: "sans-serif" },
      { id: "t3", x: 660, y: 100, text: "whiteboardEditor.item2", fontSize: 24, color: "#00AA00", fontFamily: "sans-serif" },
      { id: "t4", x: 140, y: 380, text: "whiteboardEditor.item3", fontSize: 24, color: "#9933CC", fontFamily: "sans-serif" },
      { id: "t5", x: 660, y: 380, text: "whiteboardEditor.item4", fontSize: 24, color: "#FF0000", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "circle", x: 370, y: 220, width: 140, height: 70, color: "#0066FF", strokeWidth: 3, fill: false },
      { id: "s2", type: "rect", x: 100, y: 85, width: 140, height: 50, color: "#FF6600", strokeWidth: 2, fill: false },
      { id: "s3", type: "rect", x: 620, y: 85, width: 140, height: 50, color: "#00AA00", strokeWidth: 2, fill: false },
      { id: "s4", type: "rect", x: 100, y: 365, width: 140, height: 50, color: "#9933CC", strokeWidth: 2, fill: false },
      { id: "s5", type: "rect", x: 620, y: 365, width: 140, height: 50, color: "#FF0000", strokeWidth: 2, fill: false },
    ],
  },
  {
    id: "bullet", name: "whiteboardEditor.bulletPoints", desc: "whiteboardEditor.bulletPointsDesc", icon: FileText,
    bgColor: "#ffffff", texts: [
      { id: "t1", x: 60, y: 30, text: "whiteboardEditor.title", fontSize: 40, color: "#1a1a2e", fontFamily: "sans-serif" },
      { id: "t2", x: 80, y: 120, text: "whiteboardEditor.firstPoint", fontSize: 28, color: "#333333", fontFamily: "sans-serif" },
      { id: "t3", x: 80, y: 180, text: "whiteboardEditor.secondPoint", fontSize: 28, color: "#333333", fontFamily: "sans-serif" },
      { id: "t4", x: 80, y: 240, text: "whiteboardEditor.thirdPoint", fontSize: 28, color: "#333333", fontFamily: "sans-serif" },
      { id: "t5", x: 80, y: 300, text: "whiteboardEditor.fourthPoint", fontSize: 28, color: "#333333", fontFamily: "sans-serif" },
      { id: "t6", x: 80, y: 360, text: "whiteboardEditor.fifthPoint", fontSize: 28, color: "#333333", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "line", x: 60, y: 85, width: 840, height: 0, color: "#0066FF", strokeWidth: 3, fill: false },
    ],
  },
  {
    id: "chart_area", name: "whiteboardEditor.chartArea", desc: "whiteboardEditor.chartAreaDesc", icon: BarChart3,
    bgColor: "#ffffff", texts: [
      { id: "t1", x: 60, y: 20, text: "whiteboardEditor.dataAnalysis", fontSize: 36, color: "#1a1a2e", fontFamily: "sans-serif" },
      { id: "t2", x: 580, y: 100, text: "whiteboardEditor.keyInsights", fontSize: 24, color: "#333333", fontFamily: "sans-serif" },
      { id: "t3", x: 580, y: 150, text: "whiteboardEditor.point1", fontSize: 20, color: "#666666", fontFamily: "sans-serif" },
      { id: "t4", x: 580, y: 190, text: "whiteboardEditor.point2", fontSize: 20, color: "#666666", fontFamily: "sans-serif" },
      { id: "t5", x: 580, y: 230, text: "whiteboardEditor.point3", fontSize: 20, color: "#666666", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "rect", x: 60, y: 80, width: 480, height: 400, color: "#E0E0E0", strokeWidth: 2, fill: false },
      { id: "s2", type: "line", x: 60, y: 70, width: 880, height: 0, color: "#CCCCCC", strokeWidth: 1, fill: false },
    ],
  },
  {
    id: "dark_modern", name: "whiteboardEditor.darkModern", desc: "whiteboardEditor.darkModernDesc", icon: LayoutTemplate,
    bgColor: "#16213e", texts: [
      { id: "t1", x: 60, y: 40, text: "whiteboardEditor.presentationTitle", fontSize: 44, color: "#FFFFFF", fontFamily: "sans-serif" },
      { id: "t2", x: 60, y: 120, text: "whiteboardEditor.subtitleOrDescription", fontSize: 24, color: "#88AACC", fontFamily: "sans-serif" },
      { id: "t3", x: 60, y: 200, text: "whiteboardEditor.coreContent1", fontSize: 28, color: "#00DDFF", fontFamily: "sans-serif" },
      { id: "t4", x: 60, y: 260, text: "whiteboardEditor.coreContent2", fontSize: 28, color: "#00DDFF", fontFamily: "sans-serif" },
      { id: "t5", x: 60, y: 320, text: "whiteboardEditor.coreContent3", fontSize: 28, color: "#00DDFF", fontFamily: "sans-serif" },
    ], shapes: [
      { id: "s1", type: "line", x: 60, y: 105, width: 400, height: 0, color: "#00DDFF", strokeWidth: 2, fill: false },
    ],
  },
];

export default function WhiteboardEditor({ initialData, onSave, onExportMp4, width = 960, height = 540, language = "ko", projectId, insertContentId }: WhiteboardEditorProps) {
  const { t } = useLanguage();
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

  // Template library
  const [showTemplates, setShowTemplates] = useState(false);

  // Collaboration
  const { user } = useAuth();
  const [collabMode, setCollabMode] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const createSessionMut = trpc.wbCollab.createSession.useMutation();

  const collab = useWhiteboardCollab({
    onRemoteDraw: (stroke) => {
      setStrokes(prev => [...prev, stroke as any]);
    },
    onRemoteAddText: (textEl) => {
      setTexts(prev => [...prev, textEl as any]);
    },
    onRemoteAddShape: (shapeEl) => {
      setShapes(prev => [...prev, shapeEl as any]);
    },
    onRemoteErase: (elementId) => {
      setStrokes(prev => prev.filter(s => s.id !== elementId));
      setTexts(prev => prev.filter(t => t.id !== elementId));
      setShapes(prev => prev.filter(s => s.id !== elementId));
      setImages(prev => prev.filter(i => i.id !== elementId));
    },
    onRemoteUndo: () => { undo(); },
    onRemoteClearAll: () => {
      setStrokes([]); setTexts([]); setImages([]); setShapes([]);
    },
    onSyncState: (data) => {
      if (data) {
        setStrokes(data.strokes || []);
        setTexts(data.texts || []);
        setImages(data.images || []);
        setShapes(data.shapes || []);
        if (data.backgroundColor) setBgColor(data.backgroundColor);
      }
    },
  });

  const handleCreateSession = async () => {
    if (!projectId || !user) return;
    try {
      const result = await createSessionMut.mutateAsync({
        projectId,
        insertContentId: insertContentId,
        title: `화이트보드 협업`,
      });
      setSessionCode(result.sessionCode);
      setCollabMode(true);
      collab.connect(result.sessionCode, user.id, user.name || `User ${user.id}`);
      toast.success("협업 세션이 생성되었습니다");
    } catch (err: any) {
      toast.error(err.message || "세션 생성 실패");
    }
  };

  const handleJoinSession = () => {
    if (!joinCode.trim() || !user) return;
    setSessionCode(joinCode.trim());
    setCollabMode(true);
    collab.connect(joinCode.trim(), user.id, user.name || `User ${user.id}`);
    toast.success("세션에 참여합니다...");
  };

  const handleLeaveSession = () => {
    collab.disconnect();
    setCollabMode(false);
    setSessionCode("");
    toast.info("협업 세션에서 나갔습니다");
  };

  // AI Image generation
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageStyle, setAiImageStyle] = useState<"illustration" | "diagram" | "infographic" | "sketch" | "realistic" | "cartoon" | "minimalist">("illustration");
  const [isExportingMp4, setIsExportingMp4] = useState(false);

  const generateAiImage = trpc.lectureBuilder.generateWhiteboardImage.useMutation({
    onSuccess: (data) => {
      // Add generated image to whiteboard
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const maxW = width * 0.6;
        const scale = Math.min(maxW / img.width, 1);
        setImages(prev => [...prev, {
          id: `img-${Date.now()}`,
          x: (width - img.width * scale) / 2,
          y: (height - img.height * scale) / 2,
          width: img.width * scale,
          height: img.height * scale,
          src: data.imageUrl || "",
          naturalWidth: img.width,
          naturalHeight: img.height,
        }]);
        toast.success("AI 이미지가 화이트보드에 추가되었습니다");
      };
      img.onerror = () => {
        // Even if image fails to load in browser, still add it
        setImages(prev => [...prev, {
          id: `img-${Date.now()}`,
          x: 40, y: 40,
          width: width * 0.5, height: height * 0.5,
          src: data.imageUrl || "",
          naturalWidth: 512, naturalHeight: 512,
        }]);
        toast.success("AI 이미지가 추가되었습니다 (프리뷰 로딩 실패)");
      };
      img.src = data.imageUrl || "";
    },
    onError: (e) => toast.error(`이미지 생성 실패: ${e.message}`),
  });

  const renderWhiteboardMp4 = trpc.lectureBuilder.renderWhiteboardMp4.useMutation({
    onSuccess: (data) => {
      setIsExportingMp4(false);
      toast.success(`화이트보드 MP4 생성 완료! (${data.duration.toFixed(1)}초, ${data.frames}프레임)`);
      onExportMp4?.(data.videoUrl);
    },
    onError: (e) => {
      setIsExportingMp4(false);
      toast.error(`MP4 생성 실패: ${e.message}`);
    },
  });

  const handleExportMp4 = () => {
    if (!projectId || !insertContentId) {
      toast.error("프로젝트 정보가 필요합니다");
      return;
    }
    if (recordedStrokes.current.length === 0) {
      toast.error("녹화된 애니메이션이 없습니다. 먼저 펜 애니메이션을 녹화하세요.");
      return;
    }
    setIsExportingMp4(true);
    renderWhiteboardMp4.mutate({
      projectId,
      insertContentId,
      whiteboardData: {
        strokes: recordedStrokes.current,
        backgroundColor: bgColor,
        width,
        height,
      },
      resolution: "1080p",
    });
  };

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
    toast.info(t("whiteboardEditor.recordingStart"));
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
      toast.error(t("whiteboardEditor.noAnimation"));
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
    toast.success(t("whiteboardEditor.playbackComplete"));
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

  // --- Apply template ---
  const applyTemplate = (tmpl: WbTemplate) => {
    if (strokes.length > 0 || texts.length > 0 || shapes.length > 0 || images.length > 0) {
      if (!confirm(t("whiteboardEditor.confirmApplyTemplate"))) return;
    }
    const ts = Date.now();
    setStrokes([]);
    setImages([]);
    setTexts(tmpl.texts.map((t, i) => ({ ...t, id: `tmpl-t-${ts}-${i}` })));
    setShapes(tmpl.shapes.map((s, i) => ({ ...s, id: `tmpl-s-${ts}-${i}` })));
    setBgColor(tmpl.bgColor);
    setSelectedElement(null);
    setShowTemplates(false);
    toast.success(`"${tmpl.name}" 템플릿이 적용되었습니다`);
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
    toast.success(t("whiteboardEditor.saved"));
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
    { id: "select", icon: MousePointer, label: t("whiteboardEditor.toolSelect") },
    { id: "pen", icon: Pen, label: "펜" },
    { id: "eraser", icon: Eraser, label: t("whiteboardEditor.toolEraser") },
    { id: "text", icon: Type, label: t("whiteboardEditor.toolText") },
    { id: "image", icon: ImageIcon, label: t("whiteboardEditor.toolImage") },
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
            <span className="text-xs text-muted-foreground">{tool === "pen" ? t("whiteboardEditor.width") : t("whiteboardEditor.size")}</span>
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
            <span className="text-xs text-muted-foreground">{t("whiteboardEditor.size")}</span>
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={undo} title={t("whiteboardEditor.undo")}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearAll} title={t("whiteboardEditor.clearAll")}>
            <Trash2 className="w-4 h-4" />
          </Button>
          {selectedElement && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={deleteSelected}>
              {t("whiteboardEditor.deleteSelected")}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={exportImage} title={t("whiteboardEditor.saveImage")}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1" onClick={handleSave}>
            <Save className="w-3 h-3" /> {t("whiteboardEditor.save")}
          </Button>
        </div>
      </div>

      {/* Collaboration Bar */}
      {projectId && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <Users className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{t("whiteboardEditor.realtimeCollab")}</span>
          {!collabMode ? (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={handleCreateSession}
                disabled={createSessionMut.isPending}>
                {createSessionMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                {t("whiteboardEditor.createSession")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("whiteboardEditor.or")}</span>
              <Input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder={t("whiteboardEditor.enterSessionCode")}
                className="h-7 text-xs w-32"
                onKeyDown={e => { if (e.key === "Enter") handleJoinSession(); }}
              />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleJoinSession}
                disabled={!joinCode.trim()}>
                {t("whiteboardEditor.join")}
              </Button>
            </>
          ) : (
            <>
              {collab.isConnected ? (
                <Badge className="bg-green-500 text-white text-xs gap-1"><Wifi className="w-3 h-3" /> {t("whiteboardEditor.connected")}</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs gap-1"><WifiOff className="w-3 h-3" /> {t("whiteboardEditor.connecting")}</Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {collab.participants.length}명 참여 중
              </Badge>
              {/* Participant avatars */}
              <div className="flex -space-x-1">
                {collab.participants.slice(0, 5).map(p => (
                  <div key={p.id} className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: p.color }}
                    title={p.name}>
                    {(p.name || "?").charAt(0).toUpperCase()}
                  </div>
                ))}
                {collab.participants.length > 5 && (
                  <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px]">
                    +{collab.participants.length - 5}
                  </div>
                )}
              </div>
              {/* Session code */}
              <div className="flex items-center gap-1 ml-auto">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{sessionCode}</code>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                  navigator.clipboard.writeText(sessionCode);
                  toast.success(t("whiteboardEditor.sessionCodeCopied"));
                }}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleLeaveSession}>
                {t("whiteboardEditor.leave")}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Recording toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-dashed">
        <span className="text-xs font-medium text-muted-foreground">{t("whiteboardEditor.penAnimation")}</span>
        {!isRecording ? (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 border-red-300" onClick={startRecording}>
            <Circle className="w-3 h-3 fill-red-500" /> {t("whiteboardEditor.startRecording")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 border-red-500 animate-pulse" onClick={stopRecording}>
            <Square className="w-3 h-3 fill-red-500" /> {t("whiteboardEditor.stopRecording")}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={playAnimation}
          disabled={isPlaying || recordedStrokes.current.length === 0}>
          {isPlaying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {t("whiteboardEditor.play")}
        </Button>
        {recordedStrokes.current.length > 0 && (
          <Badge variant="outline" className="text-xs">{recordedStrokes.current.length}개 스트로크</Badge>
        )}
        {recordedStrokes.current.length > 0 && projectId && insertContentId && (
          <div className="ml-auto">
            <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
              disabled={isExportingMp4}
              onClick={handleExportMp4}>
              {isExportingMp4 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {t("whiteboardEditor.exportMp4")}
            </Button>
          </div>
        )}
      </div>

      {/* Template Library */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 justify-between"
          onClick={() => setShowTemplates(!showTemplates)}>
          <span className="flex items-center gap-1"><LayoutTemplate className="w-3.5 h-3.5" /> {t("whiteboardEditor.templateLibrary")}</span>
          {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
        {showTemplates && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 bg-muted/30 rounded-lg border">
            {WHITEBOARD_TEMPLATES.map(tmpl => (
              <button key={tmpl.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors text-center group"
                onClick={() => applyTemplate(tmpl)}>
                <div className="w-full aspect-video rounded border bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <tmpl.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">{tmpl.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{tmpl.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Generation */}
      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
        <Wand2 className="w-4 h-4 text-primary shrink-0" />
        <Select value={aiContentType} onValueChange={v => setAiContentType(v as any)}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">{t("whiteboardEditor.toolText")}</SelectItem>
            <SelectItem value="bullet_points">{t("whiteboardEditor.bulletPoints")}</SelectItem>
            <SelectItem value="diagram">다이어그램</SelectItem>
            <SelectItem value="equation">수식</SelectItem>
            <SelectItem value="timeline">{t("whiteboardEditor.timeline")}</SelectItem>
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
          {t("whiteboardEditor.aiGenerate")}
        </Button>
      </div>

      {/* AI Image Generation */}
      <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg border border-green-500/20">
        <ImageIcon className="w-4 h-4 text-green-600 shrink-0" />
        <Select value={aiImageStyle} onValueChange={v => setAiImageStyle(v as any)}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="illustration">일러스트</SelectItem>
            <SelectItem value="diagram">다이어그램</SelectItem>
            <SelectItem value="infographic">인포그래픽</SelectItem>
            <SelectItem value="sketch">스케치</SelectItem>
            <SelectItem value="realistic">사실적</SelectItem>
            <SelectItem value="cartoon">카툰</SelectItem>
            <SelectItem value="minimalist">미니말</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={aiImagePrompt}
          onChange={e => setAiImagePrompt(e.target.value)}
          placeholder="AI로 배경/일러스트 생성..."
          className="h-7 text-xs flex-1"
          onKeyDown={e => {
            if (e.key === "Enter" && aiImagePrompt.trim()) {
              generateAiImage.mutate({ prompt: aiImagePrompt.trim(), style: aiImageStyle, language });
            }
          }}
        />
        <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
          disabled={!aiImagePrompt.trim() || generateAiImage.isPending}
          onClick={() => generateAiImage.mutate({ prompt: aiImagePrompt.trim(), style: aiImageStyle, language })}>
          {generateAiImage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
          {t("whiteboardEditor.toolImage")} 생성
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
                <Button size="sm" className="h-7 text-xs" onClick={confirmText}>{t("whiteboardEditor.confirmText")}</Button>
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
