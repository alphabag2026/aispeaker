import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Users, FileText, Plus, Trash2, Loader2, Check, Pencil, MousePointer, Move, X, Eraser, Sparkles, Save, Globe, Languages, Headphones } from "lucide-react";
import { PEN_COLORS, getAVATAR_ROLES, getANNOTATION_TOOLS } from "./types";

export default function Step4Matching({ projectId, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh









}: {projectId: number;slides: any[];scripts: any[];avatars: any[];annotations: any[];avatarOverrides: any[];insertContent: any[];transitions: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const ANNOTATION_TOOLS = getANNOTATION_TOOLS(t);
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [annotationTool, setAnnotationTool] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#FF0000");
  const [penThickness, setPenThickness] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number;y: number;}[]>([]);
  // Undo/Redo stacks (store annotation IDs)
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  // Script assignments per slide
  const [slideScriptMap, setSlideScriptMap] = useState<Record<number, {text: string;avatarId?: number;}>>({});

  // ── Interpreter state ──
  const [interpreterEnabled, setInterpreterEnabled] = useState(false);
  const [interpreterLanguage, setInterpreterLanguage] = useState("en");
  const [interpreterVoiceId, setInterpreterVoiceId] = useState("");
  const [interpreterTexts, setInterpreterTexts] = useState<Record<number, string>>({});
  const [showInterpreterPanel, setShowInterpreterPanel] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    const map: Record<number, {text: string;avatarId?: number;}> = {};
    const iTexts: Record<number, string> = {};
    scripts.forEach((s: any) => {
      if (s.slideId && s.slideId > 0) {
        map[s.slideId] = { text: s.scriptText, avatarId: s.avatarId || undefined };
        if (s.interpreterText) iTexts[s.slideId] = s.interpreterText;
      }
    });
    setSlideScriptMap(map);
    setInterpreterTexts(iTexts);
  }, [scripts]);

  // Load interpreter settings from project (passed via parent)
  const projectQuery = trpc.lectureBuilder.getProject.useQuery({ id: projectId });
  useEffect(() => {
    if (projectQuery.data) {
      setInterpreterEnabled(projectQuery.data.interpreterEnabled || false);
      setInterpreterLanguage(projectQuery.data.interpreterLanguage || "en");
      setInterpreterVoiceId(projectQuery.data.interpreterVoiceId || "");
    }
  }, [projectQuery.data]);

  const unassignedScripts = scripts.filter((s: any) => !s.slideId || s.slideId === 0);
  const currentSlide = slides[selectedSlideIdx];
  const currentScript = currentSlide ? slideScriptMap[currentSlide.id] : null;
  const currentAnnotations = currentSlide ? annotations.filter((a: any) => a.slideId === currentSlide.id) : [];

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const saveDrawingMut = trpc.lectureBuilder.saveCanvasDrawing.useMutation();
  const deleteAnnotationMut = trpc.lectureBuilder.deleteAnnotation.useMutation();

  // ── Auto-save / Manual save ──
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveScriptsMut = trpc.lectureBuilder.saveSlideScripts.useMutation({
    onSuccess: (data) => {
      setLastSavedAt(data.savedAt);
      setHasUnsavedChanges(false);
      setIsSaving(false);
    },
    onError: () => setIsSaving(false),
  });

  const doSave = useCallback(() => {
    if (!slides.length) return;
    const scriptsToSave = slides
      .filter((s: any) => slideScriptMap[s.id])
      .map((s: any) => ({
        slideId: s.id,
        scriptText: slideScriptMap[s.id]?.text || "",
      }));
    if (scriptsToSave.length === 0) return;
    setIsSaving(true);
    saveScriptsMut.mutate({ projectId, scripts: scriptsToSave });
  }, [slides, slideScriptMap, projectId]);

  // Auto-save every 30 seconds when there are unsaved changes
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => {
        doSave();
      }, 30000);
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [hasUnsavedChanges, doSave]);

  // Track changes
  const handleScriptChange = (slideId: number, text: string) => {
    setSlideScriptMap((prev) => ({ ...prev, [slideId]: { ...prev[slideId], text } }));
    setHasUnsavedChanges(true);
  };

  // Interpreter mutations
  const updateInterpreterSettingsMut = trpc.lectureBuilder.updateInterpreterSettings.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral186"));projectQuery.refetch();},
    onError: (e: any) => toast.error(e.message)
  });
  const autoTranslateSlidesMut = trpc.lectureBuilder.autoTranslateSlides.useMutation({
    onSuccess: (data) => {
      toast.success(t("lectureBuilder.hardcoded.slidesTranslated", { count: String(data.count) }));
      const newTexts: Record<number, string> = {};
      data.translations.forEach((t: any) => {newTexts[t.slideId] = t.text;});
      setInterpreterTexts((prev) => ({ ...prev, ...newTexts }));
      onRefresh();
    },
    onError: (e: any) => toast.error(e.message)
  });
  const updateSlideInterpreterTextMut = trpc.lectureBuilder.updateSlideInterpreterText.useMutation({
    onError: (e: any) => toast.error(e.message)
  });

  const voicesQuery = trpc.tts.voices.useQuery(undefined, { enabled: !!projectId });
  const generateAllTtsMut = trpc.lectureBuilder.generateAllInterpreterTts.useMutation({
    onSuccess: (data) => toast.success(t("lectureBuilder.hardcoded.interpreterTtsGenerated", { generated: String(data.generated), total: String(data.total) })),
    onError: (e: any) => toast.error(e.message)
  });
  const exportSrtMut = trpc.lectureBuilder.exportInterpreterSrt.useMutation({
    onSuccess: (data) => {
      window.open(data.srtUrl, "_blank");
      toast.success(t("lectureBuilder.hardcoded.srtDownload", { count: String(data.subtitleCount) }));
    },
    onError: (e: any) => toast.error(e.message)
  });

  const INTERPRETER_LANGUAGES = [
  { code: "ko", name: t("lectureBuilder.stringLiteral187"), flag: "🇰🇷" }, { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" }, { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "es", name: "Español", flag: "🇪🇸" }, { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" }, { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" }, { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" }, { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" }, { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" }, { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" }, { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" }, { code: "ms", name: "Melayu", flag: "🇲🇾" }];


  // Avatar overlay per-slide
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  const [avatarSize, setAvatarSize] = useState(25); // percentage
  const [avatarPosX, setAvatarPosX] = useState(75); // percentage from left
  const [avatarPosY, setAvatarPosY] = useState(75); // percentage from top
  const [avatarShape, setAvatarShape] = useState<"circle" | "rounded" | "rectangle">("circle");
  const [avatarOpacity, setAvatarOpacity] = useState(100);
  const saveAvatarOverrideMut = trpc.lectureBuilder.upsertAvatarOverride.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral188"));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });

  // Load avatar override for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const override = avatarOverrides.find((o: any) => o.slideId === currentSlide.id);
    if (override) {
      setAvatarSize(override.avatarSizePercent || 25);
      setAvatarPosX(override.offsetX || 75);
      setAvatarPosY(override.offsetY || 75);
      setAvatarShape(override.avatarShape || "circle");
      setAvatarOpacity(override.avatarOpacity ?? 100);
    } else {
      setAvatarSize(25);setAvatarPosX(75);setAvatarPosY(75);setAvatarShape("circle");setAvatarOpacity(100);
    }
  }, [currentSlide?.id, avatarOverrides]);

  const saveAvatarOverride = () => {
    if (!currentSlide) return;
    saveAvatarOverrideMut.mutate({
      projectId,
      slideId: currentSlide.id,
      avatarSizePercent: avatarSize,
      offsetX: avatarPosX,
      offsetY: avatarPosY,
      avatarShape: avatarShape,
      avatarOpacity: avatarOpacity
    });
  };

  // Insert content between slides
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  const [insertType, setInsertType] = useState<"whiteboard" | "video" | "image" | "design">("whiteboard");
  const [insertAfterSlideId, setInsertAfterSlideId] = useState<number | null>(null);
  const saveInsertMut = trpc.lectureBuilder.createInsertContent.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral189"));onRefresh();setShowInsertPanel(false);},
    onError: (e: any) => toast.error(e.message)
  });
  const deleteInsertMut = trpc.lectureBuilder.deleteInsertContent.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral190"));onRefresh();}
  });

  // Slide transitions
  const [showTransitionPanel, setShowTransitionPanel] = useState(false);
  const [transitionType, setTransitionType] = useState<string>("none");
  const [transitionDuration, setTransitionDuration] = useState(500);
  const [transitionEasing, setTransitionEasing] = useState<string>("ease_in_out");

  const upsertTransitionMut = trpc.lectureBuilder.upsertSlideTransition.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral191"));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });
  const setAllTransitionsMut = trpc.lectureBuilder.setAllTransitions.useMutation({
    onSuccess: (data) => {toast.success(t("lectureBuilder.hardcoded.transitionsApplied", { count: String(data.count) }));onRefresh();},
    onError: (e: any) => toast.error(e.message)
  });

  // Load transition for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const tr = transitions.find((t: any) => t.slideId === currentSlide.id);
    if (tr) {
      setTransitionType(tr.transitionType || "none");
      setTransitionDuration(tr.durationMs || 500);
      setTransitionEasing(tr.easing || "ease_in_out");
    } else {
      setTransitionType("none");setTransitionDuration(500);setTransitionEasing("ease_in_out");
    }
  }, [currentSlide?.id, transitions]);

  // Whiteboard AI generation
  const [wbPrompt, setWbPrompt] = useState("");
  const [wbGenerating, setWbGenerating] = useState(false);
  const generateWhiteboardMut = trpc.lectureBuilder.generateWhiteboardContent.useMutation({
    onSuccess: (data) => {
      setWbGenerating(false);
      toast.success(t("lectureBuilder.stringLiteral192"));
    },
    onError: (e: any) => {setWbGenerating(false);toast.error(e.message);}
  });

  const assignScript = async (slideId: number, text: string, avatarId?: number) => {
    setSlideScriptMap((prev) => ({ ...prev, [slideId]: { text, avatarId } }));
    try {
      await setScriptMut.mutateAsync({ projectId, slideId, scriptText: text, avatarId, sortOrder: 0 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // --- Canvas drawing logic ---
  const getRelativePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * 100,
      y: (e.clientY - rect.top) / rect.height * 100
    };
  };

  const getTouchRelativePos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) / rect.width * 100,
      y: (touch.clientY - rect.top) / rect.height * 100
    };
  };

  // Draw existing annotations + current path on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // Draw saved annotations
    currentAnnotations.forEach((ann: any) => {
      const pd = ann.pathData as any;
      if (!pd) return;
      const color = ann.penColor || "#FF0000";
      const thickness = ann.penThickness || 3;
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.annotationType === "freehand" && pd.points) {
        ctx.beginPath();
        pd.points.forEach((pt: any, i: number) => {
          const px = pt.x / 100 * w;
          const py = pt.y / 100 * h;
          if (i === 0) ctx.moveTo(px, py);else
          ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (ann.annotationType === "circle") {
        const cx = pd.x / 100 * w;
        const cy = pd.y / 100 * h;
        const r = (pd.width || 8) / 100 * Math.min(w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotationType === "arrow") {
        const sx = pd.x / 100 * w;
        const sy = pd.y / 100 * h;
        const ex = (pd.endX ?? pd.x + 8) / 100 * w;
        const ey = (pd.endY ?? pd.y - 8) / 100 * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (ann.annotationType === "check") {
        const cx = pd.x / 100 * w;
        const cy = pd.y / 100 * h;
        ctx.fillStyle = color;
        ctx.font = `${thickness * 6}px sans-serif`;
        ctx.fillText("\u2713", cx - thickness * 2, cy + thickness * 2);
      } else if (ann.annotationType === "underline") {
        const sx = pd.x / 100 * w;
        const sy = pd.y / 100 * h;
        const lineW = (pd.width || 15) / 100 * w;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + lineW, sy);
        ctx.stroke();
      }
    });

    // Draw current path (live drawing)
    if (currentPath.length > 1) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => {
        const px = pt.x / 100 * w;
        const py = pt.y / 100 * h;
        if (i === 0) ctx.moveTo(px, py);else
        ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [currentAnnotations, currentPath, penColor, penThickness]);

  useEffect(() => {renderCanvas();}, [renderCanvas]);

  // --- Touch handlers for mobile/tablet ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    // Eraser via touch
    if (annotationTool === "eraser") {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;
      const rect = canvas.getBoundingClientRect();
      const pos = {
        x: (touch.clientX - rect.left) / rect.width * 100,
        y: (touch.clientY - rect.top) / rect.height * 100
      };
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack((prev) => prev.filter((id) => id !== target.id));
            onRefresh();
            toast.success(t("lectureBuilder.stringLiteral193"));
          }
        });
      }
      return;
    }
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    if (annotationTool === "freehand" || annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    setCurrentPath((prev) => [...prev, pos]);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSlide) return;
    e.preventDefault();
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
    setCurrentPath([]);
  };

  // Find nearest annotation to a point (for eraser)
  const findNearestAnnotation = (pos: {x: number;y: number;}, threshold = 5) => {
    let nearest: any = null;
    let minDist = threshold;
    for (const ann of currentAnnotations) {
      const pd = ann.pathData as any;
      if (!pd) continue;
      let dist = Infinity;
      if (pd.points && Array.isArray(pd.points)) {
        for (const pt of pd.points) {
          const d = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
          if (d < dist) dist = d;
        }
      } else if (pd.x !== undefined && pd.y !== undefined) {
        dist = Math.sqrt((pd.x - pos.x) ** 2 + (pd.y - pos.y) ** 2);
      }
      if (dist < minDist) {
        minDist = dist;
        nearest = ann;
      }
    }
    return nearest;
  };

  // Mouse handlers for freehand drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    const pos = getRelativePos(e);

    // Eraser tool: delete nearest annotation
    if (annotationTool === "eraser") {
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack((prev) => prev.filter((id) => id !== target.id));
            onRefresh();
            toast.success(t("lectureBuilder.stringLiteral194"));
          }
        });
      }
      return;
    }

    if (annotationTool === "freehand") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      // Single-click tools: circle, check, underline
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getRelativePos(e);
    setCurrentPath((prev) => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentSlide) return;
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y }
      }, {
        onSuccess: (data) => {
          setUndoStack((prev) => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        }
      });
    }
    setCurrentPath([]);
  };

  // Undo: delete last annotation
  const handleUndo = () => {
    if (undoStack.length === 0 && currentAnnotations.length === 0) return;
    const lastId = undoStack.length > 0 ? undoStack[undoStack.length - 1] : currentAnnotations[currentAnnotations.length - 1]?.id;
    if (!lastId) return;
    deleteAnnotationMut.mutate({ id: lastId }, {
      onSuccess: () => {
        setUndoStack((prev) => prev.slice(0, -1));
        setRedoStack((prev) => [...prev, lastId]);
        onRefresh();
      }
    });
  };

  // Clear all annotations on current slide
  const handleClearAll = () => {
    if (currentAnnotations.length === 0) return;
    currentAnnotations.forEach((ann: any) => {
      deleteAnnotationMut.mutate({ id: ann.id });
    });
    setUndoStack([]);
    setRedoStack([]);
    setTimeout(() => onRefresh(), 500);
    toast.success(t("lectureBuilder.stringLiteral195"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText196")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText197")}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              마지막 저장: {new Date(lastSavedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {hasUnsavedChanges && !isSaving && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
              저장되지 않은 변경사항
            </Badge>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={doSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            저장하기
          </Button>
          <PronunciationGuideButton projectId={projectId} />
          <BatchCloneVoiceButton projectId={projectId} slides={slides} slideScriptMap={slideScriptMap} onComplete={() => projectQuery.refetch()} />
          <VersionHistoryButton projectId={projectId} onRestore={() => projectQuery.refetch()} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 overflow-hidden" style={{ minHeight: "60vh" }}>
        {/* Left: Slide Thumbnails */}
        <div className="col-span-2">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-2">
              {slides.map((slide: any, idx: number) => {
                const hasScript = !!slideScriptMap[slide.id];
                const annCount = annotations.filter((a: any) => a.slideId === slide.id).length;
                return (
                  <button key={slide.id}
                  className={`w-full rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedSlideIdx === idx ? "border-primary ring-2 ring-primary/30" : hasScript ? "border-green-500/50" : "border-muted"}`
                  }
                  onClick={() => {if (hasUnsavedChanges) doSave(); setSelectedSlideIdx(idx);setUndoStack([]);setRedoStack([]);}}>
                    
                    <div className="aspect-video">
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute top-0.5 left-0.5">
                      <Badge className="text-[10px] px-1 py-0 bg-black/60 text-white">{idx + 1}</Badge>
                    </div>
                    {hasScript &&
                    <div className="absolute bottom-0.5 right-0.5">
                        <Check className="w-3 h-3 text-green-400 bg-green-900/60 rounded-full p-0.5" />
                      </div>
                    }
                    {annCount > 0 &&
                    <div className="absolute bottom-0.5 left-0.5">
                        <Badge className="text-[9px] px-1 py-0 bg-orange-500/80 text-white">{annCount}</Badge>
                      </div>
                    }
                  </button>);

              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Slide Preview + Canvas Drawing */}
        <div className="col-span-6 min-w-0 overflow-hidden">
          {currentSlide ?
          <div className="space-y-3">
              <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden">
                <img src={currentSlide.imageUrl} alt={t("lectureBuilder.stringLiteral198")} className="w-full aspect-video object-contain" />
                {/* Avatar overlay preview */}
                {showAvatarPanel && avatars.length > 0 &&
              <div
                className={`absolute pointer-events-none border-2 border-cyan-400/60 ${
                avatarShape === "circle" ? "rounded-full" : avatarShape === "rounded" ? "rounded-xl" : ""}`
                }
                style={{
                  width: `${avatarSize}%`,
                  height: `${avatarSize * 0.75}%`,
                  left: `${avatarPosX - avatarSize / 2}%`,
                  top: `${avatarPosY - avatarSize * 0.75 / 2}%`,
                  opacity: avatarOpacity / 100,
                  background: "rgba(0,180,255,0.15)",
                  backdropFilter: "blur(1px)"
                }}>
                
                    <div className="flex items-center justify-center h-full text-cyan-300 text-xs font-medium">
                      <Users className="w-4 h-4 mr-1" />{t("lectureBuilder.jsxText199")}
                </div>
                  </div>
              }
                {/* Real HTML5 Canvas overlay for drawing */}
                <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${annotationTool ? "cursor-crosshair" : "cursor-default"}`}
                style={{ touchAction: annotationTool ? "none" : "auto" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd} />
              
              </div>

              {/* Annotation Toolbar */}
              <div className="flex items-center gap-2 p-2 bg-card rounded-lg border flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText200")}</span>
                {ANNOTATION_TOOLS.map((tool: any) =>
              <button key={tool.type}
              className={`p-2 rounded-lg transition-colors ${annotationTool === tool.type ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setAnnotationTool(annotationTool === tool.type ? null : tool.type)}
              title={tool.label}>
                
                    <tool.icon className="w-4 h-4" />
                  </button>
              )}
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText201")}</span>
                {PEN_COLORS.map((color) =>
              <button key={color}
              className={`w-5 h-5 rounded-full border-2 transition-all ${penColor === color ? "border-foreground scale-125" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => setPenColor(color)} />

              )}
                <div className="relative">
                  <button
                  className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${!PEN_COLORS.includes(penColor) ? "border-foreground scale-125" : "border-muted-foreground/30"}`}
                  style={{ background: !PEN_COLORS.includes(penColor) ? penColor : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                  title={t("lectureBuilder.stringLiteral202")}
                  onClick={() => {
                    const input = document.getElementById("custom-color-picker") as HTMLInputElement;
                    input?.click();
                  }} />
                
                  <input
                  id="custom-color-picker"
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">{t("lectureBuilder.jsxText203")}</span>
                <div className="w-20">
                  <Slider value={[penThickness]} min={1} max={10} step={1} onValueChange={(v) => setPenThickness(v[0])} />
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                {/* Undo / Clear */}
                <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0 && currentAnnotations.length === 0} className="text-xs gap-1" title={t("lectureBuilder.stringLiteral204")}>
                  ↩ Undo
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={currentAnnotations.length === 0} className="text-xs gap-1 text-red-400" title={t("lectureBuilder.stringLiteral205")}>
                  <Trash2 className="w-3 h-3" />{t("lectureBuilder.jsxText206")}
              </Button>
                {annotationTool &&
              <Button variant="ghost" size="sm" onClick={() => setAnnotationTool(null)} className="ml-auto text-xs">
                    <MousePointer className="w-3 h-3 mr-1" />{t("lectureBuilder.jsxText207")}
              </Button>
              }
              </div>

              {/* Extra tools: Avatar overlay + Insert content */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                variant={showAvatarPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowAvatarPanel(!showAvatarPanel);setShowInsertPanel(false);}}>
                
                  <Users className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText208")}
              </Button>
                <Button
                variant={showInsertPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowInsertPanel(!showInsertPanel);setShowAvatarPanel(false);setShowTransitionPanel(false);setInsertAfterSlideId(currentSlide?.id || null);}}>
                
                  <Plus className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText209")}
              </Button>
                <Button
                variant={showTransitionPanel ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => {setShowTransitionPanel(!showTransitionPanel);setShowAvatarPanel(false);setShowInsertPanel(false);}}>
                
                  <Sparkles className="w-3.5 h-3.5" />{t("lectureBuilder.jsxText210")}
              </Button>
                {/* Show insert indicators */}
                {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 &&
              <Badge className="bg-purple-500/20 text-purple-400 text-xs">{t("lectureBuilder.jsxText211")}
                {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length}{t("lectureBuilder.jsxText212")}
              </Badge>
              }
                {transitionType !== "none" &&
              <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                    {transitionType.replace("_", " ")}
                  </Badge>
              }
              </div>

              {/* Avatar Overlay Panel */}
              {showAvatarPanel &&
            <Card className="mt-2 border-cyan-500/30 bg-cyan-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-500" />{t("lectureBuilder.jsxText213")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText214")}
                </CardTitle>
                    <CardDescription className="text-xs">{t("lectureBuilder.jsxText215")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText216")}{avatarSize}%)</Label>
                      <Slider value={[avatarSize]} min={10} max={60} step={1} onValueChange={(v) => setAvatarSize(v[0])} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText217")}{avatarPosX}%)</Label>
                        <Slider value={[avatarPosX]} min={10} max={90} step={1} onValueChange={(v) => setAvatarPosX(v[0])} />
                      </div>
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText218")}{avatarPosY}%)</Label>
                        <Slider value={[avatarPosY]} min={10} max={90} step={1} onValueChange={(v) => setAvatarPosY(v[0])} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText219")}</Label>
                        <Select value={avatarShape} onValueChange={(v: any) => setAvatarShape(v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">{t("lectureBuilder.jsxText220")}</SelectItem>
                            <SelectItem value="rounded">{t("lectureBuilder.jsxText221")}</SelectItem>
                            <SelectItem value="rectangle">{t("lectureBuilder.jsxText222")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText223")}{avatarOpacity}%)</Label>
                        <Slider value={[avatarOpacity]} min={20} max={100} step={5} onValueChange={(v) => setAvatarOpacity(v[0])} />
                      </div>
                    </div>
                    <Button size="sm" className="w-full gap-1" onClick={saveAvatarOverride} disabled={saveAvatarOverrideMut.isPending}>
                      {saveAvatarOverrideMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{t("lectureBuilder.jsxText224")}

                </Button>
                  </CardContent>
                </Card>
            }

              {/* Insert Content Panel */}
              {showInsertPanel &&
            <Card className="mt-2 border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-500" />{t("lectureBuilder.jsxText225")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText226")}
                </CardTitle>
                    <CardDescription className="text-xs">{t("lectureBuilder.jsxText227")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      {(["whiteboard", "video", "image", "design"] as const).map((iType) =>
                  <button key={iType}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  insertType === iType ? "bg-purple-500 text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`
                  }
                  onClick={() => setInsertType(iType)}>
                    
                          {iType === "whiteboard" ? t("lectureBuilder.stringLiteral228") : iType === "video" ? t("lectureBuilder.stringLiteral229") : iType === "image" ? t("lectureBuilder.stringLiteral230") : t("lectureBuilder.stringLiteral231")}
                        </button>
                  )}
                    </div>

                    {insertType === "whiteboard" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText232")}</Label>
                        <Textarea
                    value={wbPrompt}
                    onChange={(e) => setWbPrompt(e.target.value)}
                    placeholder={t("lectureBuilder.stringLiteral233")}
                    rows={2}
                    className="text-xs" />
                  
                        <div className="flex gap-2">
                          <Button
                      size="sm"
                      className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        if (!wbPrompt.trim() || !currentSlide) return;
                        setWbGenerating(true);
                        generateWhiteboardMut.mutate({
                          prompt: wbPrompt,
                          contentType: "text"
                        });
                      }}
                      disabled={wbGenerating || !wbPrompt.trim()}>
                      
                            {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText234")}

                    </Button>
                          <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        if (!currentSlide) return;
                        saveInsertMut.mutate({
                          projectId,
                          afterSlideId: currentSlide.id,
                          contentType: "whiteboard",
                          title: t("lectureBuilder.stringLiteral235"),
                          drawingData: { elements: [], background: "#ffffff" }
                        });
                      }}>
                      
                            <Pencil className="w-3 h-3" />{t("lectureBuilder.jsxText236")}
                    </Button>
                        </div>
                      </div>
                }

                    {insertType === "video" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText237")}</Label>
                        <Input
                    placeholder={t("lectureBuilder.stringLiteral238")}
                    className="text-xs h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && currentSlide) {
                        const url = (e.target as HTMLInputElement).value;
                        if (url.trim()) {
                          saveInsertMut.mutate({
                            projectId,
                            afterSlideId: currentSlide.id,
                            contentType: "video",
                            title: t("lectureBuilder.stringLiteral239"),
                            contentUrl: url
                          });
                        }
                      }
                    }} />
                  
                        <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText240")}</p>
                      </div>
                }

                    {insertType === "image" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText241")}</Label>
                        <Input
                    placeholder={t("lectureBuilder.stringLiteral242")}
                    className="text-xs h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && currentSlide) {
                        const url = (e.target as HTMLInputElement).value;
                        if (url.trim()) {
                          saveInsertMut.mutate({
                            projectId,
                            afterSlideId: currentSlide.id,
                            contentType: "image",
                            title: t("lectureBuilder.stringLiteral243"),
                            contentUrl: url
                          });
                        }
                      }
                    }} />
                  
                        <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText244")}</p>
                      </div>
                }

                    {insertType === "design" &&
                <div className="space-y-2">
                        <Label className="text-xs">{t("lectureBuilder.jsxText245")}</Label>
                        <Textarea
                    value={wbPrompt}
                    onChange={(e) => setWbPrompt(e.target.value)}
                    placeholder={t("lectureBuilder.stringLiteral246")}
                    rows={2}
                    className="text-xs" />
                  
                        <Button
                    size="sm"
                    className="w-full gap-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      if (!wbPrompt.trim() || !currentSlide) return;
                      setWbGenerating(true);
                      generateWhiteboardMut.mutate({
                        prompt: wbPrompt,
                        contentType: "diagram"
                      });
                    }}
                    disabled={wbGenerating || !wbPrompt.trim()}>
                    
                          {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText247")}

                  </Button>
                      </div>
                }

                    {/* Existing insert content for this slide */}
                    {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 &&
                <div className="space-y-1 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText248")}</span>
                        {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).map((ic: any) =>
                  <div key={ic.id} className="flex items-center justify-between p-1.5 rounded bg-muted/50 text-xs">
                            <span className="flex items-center gap-1">
                              {ic.contentType === "whiteboard" ? "📝" : ic.contentType === "video" ? "🎬" : ic.contentType === "image" ? "🖼️" : "🎨"}
                              {ic.title || ic.contentType}
                            </span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive"
                    onClick={() => deleteInsertMut.mutate({ id: ic.id })}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                  )}
                      </div>
                }
                  </CardContent>
                </Card>
            }

              {/* Transition Effect Panel */}
              {showTransitionPanel &&
            <Card className="mt-2 border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />{t("lectureBuilder.jsxText249")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText250")}
                </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText251")}</Label>
                      <Select value={transitionType} onValueChange={setTransitionType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("lectureBuilder.jsxText252")}</SelectItem>
                          <SelectItem value="fade">{t("lectureBuilder.jsxText253")}</SelectItem>
                          <SelectItem value="slide_left">{t("lectureBuilder.jsxText254")}</SelectItem>
                          <SelectItem value="slide_right">{t("lectureBuilder.jsxText255")}</SelectItem>
                          <SelectItem value="slide_up">{t("lectureBuilder.jsxText256")}</SelectItem>
                          <SelectItem value="zoom_in">{t("lectureBuilder.jsxText257")}</SelectItem>
                          <SelectItem value="zoom_out">{t("lectureBuilder.jsxText258")}</SelectItem>
                          <SelectItem value="wipe_left">{t("lectureBuilder.jsxText259")}</SelectItem>
                          <SelectItem value="wipe_right">{t("lectureBuilder.jsxText260")}</SelectItem>
                          <SelectItem value="dissolve">{t("lectureBuilder.jsxText261")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText262")}{transitionDuration}ms</Label>
                      <Slider
                    value={[transitionDuration]}
                    onValueChange={([v]) => setTransitionDuration(v)}
                    min={100} max={3000} step={100}
                    className="mt-1" />
                  
                    </div>
                    <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText263")}</Label>
                      <Select value={transitionEasing} onValueChange={setTransitionEasing}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">{t("lectureBuilder.jsxText264")}</SelectItem>
                          <SelectItem value="ease_in">{t("lectureBuilder.jsxText265")}</SelectItem>
                          <SelectItem value="ease_out">{t("lectureBuilder.jsxText266")}</SelectItem>
                          <SelectItem value="ease_in_out">{t("lectureBuilder.jsxText267")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1"
                  disabled={upsertTransitionMut.isPending}
                  onClick={() => {
                    if (!currentSlide) return;
                    upsertTransitionMut.mutate({
                      projectId,
                      slideId: currentSlide.id,
                      transitionType: transitionType as any,
                      durationMs: transitionDuration,
                      easing: transitionEasing as any
                    });
                  }}>
                        {upsertTransitionMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}{t("lectureBuilder.jsxText268")}

                  </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1"
                  disabled={setAllTransitionsMut.isPending}
                  onClick={() => {
                    setAllTransitionsMut.mutate({
                      projectId,
                      transitionType: transitionType as any,
                      durationMs: transitionDuration,
                      easing: transitionEasing as any
                    });
                  }}>
                        {setAllTransitionsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{t("lectureBuilder.jsxText269")}

                  </Button>
                    </div>
                    {/* Transition preview hint */}
                    {transitionType !== "none" &&
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{t("lectureBuilder.jsxText270")}
                  <span className="font-semibold text-amber-400">{transitionType.replace("_", " ")}</span>{t("lectureBuilder.jsxText271")}{transitionDuration}{t("lectureBuilder.jsxText272")}

                </div>
                }
                  </CardContent>
                </Card>
            }
            </div> :

          <div className="flex items-center justify-center h-full text-muted-foreground">{t("lectureBuilder.jsxText273")}

          </div>
          }
        </div>

        {/* Right: Script Assignment */}
        <div className="col-span-4">
          <div className="space-y-4">
            {/* Current slide script */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("lectureBuilder.jsxText274")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText275")}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSlide ?
                <div className="space-y-3">
                    <Textarea
                    value={currentScript?.text || ""}
                    onChange={(e) => {
                      if (currentSlide) {
                        handleScriptChange(currentSlide.id, e.target.value);
                      }
                    }}
                    onBlur={() => {
                      if (currentSlide && slideScriptMap[currentSlide.id]?.text) {
                        assignScript(currentSlide.id, slideScriptMap[currentSlide.id].text, slideScriptMap[currentSlide.id].avatarId);
                      }
                    }}
                    placeholder={t("lectureBuilder.stringLiteral276")}
                    rows={5} />
                    <PronunciationHighlight text={currentScript?.text || ""} projectId={projectId} />
                  
                    {avatars.length > 0 &&
                  <div>
                        <Label className="text-xs">{t("lectureBuilder.jsxText277")}</Label>
                        <Select
                      value={currentScript?.avatarId?.toString() || "default"}
                      onValueChange={(v) => {
                        if (currentSlide) {
                          const avatarId = v === "default" ? undefined : parseInt(v);
                          const text = slideScriptMap[currentSlide.id]?.text || "";
                          assignScript(currentSlide.id, text, avatarId);
                        }
                      }}>
                      
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{t("lectureBuilder.jsxText278")}</SelectItem>
                            {avatars.map((av: any) =>
                        <SelectItem key={av.id} value={av.id.toString()}>{av.name}</SelectItem>
                        )}
                          </SelectContent>
                        </Select>
                      </div>
                  }
                  </div> :

                <p className="text-sm text-muted-foreground">{t("lectureBuilder.jsxText279")}</p>
                }
              </CardContent>
            </Card>

            {/* Voice Mode Selection per Slide */}
            {currentSlide && <SlideVoiceModePanel projectId={projectId} slideId={currentSlide.id} slideIdx={selectedSlideIdx} scripts={scripts} onRefresh={onRefresh} />}

            {/* Interpreter Panel */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />{t("lectureBuilder.jsxText280")}
                  </CardTitle>
                  <Switch
                    checked={interpreterEnabled}
                    onCheckedChange={(checked) => {
                      setInterpreterEnabled(checked);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: checked,
                        interpreterLanguage,
                        interpreterVoiceId: interpreterVoiceId || undefined
                      });
                    }} />
                  
                </div>
              </CardHeader>
              {interpreterEnabled &&
              <CardContent className="space-y-3">
                  {/* Language selector */}
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText281")}</Label>
                    <Select
                    value={interpreterLanguage}
                    onValueChange={(v) => {
                      setInterpreterLanguage(v);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: true,
                        interpreterLanguage: v,
                        interpreterVoiceId: interpreterVoiceId || undefined
                      });
                    }}>
                    
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTERPRETER_LANGUAGES.map((lang) =>
                      <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Voice selector */}
                  <div>
                    <Label className="text-xs">{t("lectureBuilder.jsxText282")}</Label>
                    <Select
                    value={interpreterVoiceId || "Kore"}
                    onValueChange={(v) => {
                      setInterpreterVoiceId(v);
                      updateInterpreterSettingsMut.mutate({
                        projectId,
                        interpreterEnabled: true,
                        interpreterLanguage,
                        interpreterVoiceId: v
                      });
                    }}>
                    
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {voicesQuery.data?.map((voice: any) =>
                      <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender})
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto translate button */}
                  <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  disabled={autoTranslateSlidesMut.isPending}
                  onClick={() => {
                    autoTranslateSlidesMut.mutate({ projectId, targetLanguage: interpreterLanguage });
                  }}>
                  
                    {autoTranslateSlidesMut.isPending ?
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t("lectureBuilder.jsxText283")}</> :

                  <><Languages className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText284")}</>
                  }
                  </Button>

                  {/* Generate all interpreter TTS */}
                  <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  disabled={generateAllTtsMut.isPending}
                  onClick={() => {
                    generateAllTtsMut.mutate({ projectId, voiceId: interpreterVoiceId || undefined });
                  }}>
                  
                    {generateAllTtsMut.isPending ?
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t("lectureBuilder.jsxText285")}</> :

                  <><Headphones className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText286")}</>
                  }
                  </Button>

                  {/* SRT Export */}
                  <div className="flex gap-1">
                    <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    disabled={exportSrtMut.isPending}
                    onClick={() => exportSrtMut.mutate({ projectId, mode: "interpreter_only" })}>
                    
                      <FileText className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText287")}
                  </Button>
                    <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs"
                    disabled={exportSrtMut.isPending}
                    onClick={() => exportSrtMut.mutate({ projectId, mode: "dual" })}>
                    
                      <FileText className="h-3 w-3 mr-1" />{t("lectureBuilder.jsxText288")}
                  </Button>
                  </div>

                  {/* Current slide interpreter text */}
                  {currentSlide &&
                <div>
                      <Label className="text-xs">{t("lectureBuilder.jsxText289")}{selectedSlideIdx + 1}{t("lectureBuilder.jsxText290")}</Label>
                      <Textarea
                    value={interpreterTexts[currentSlide.id] || ""}
                    onChange={(e) => {
                      setInterpreterTexts((prev) => ({ ...prev, [currentSlide.id]: e.target.value }));
                    }}
                    onBlur={() => {
                      if (currentSlide) {
                        const script = scripts.find((s: any) => s.slideId === currentSlide.id);
                        if (script) {
                          updateSlideInterpreterTextMut.mutate({
                            scriptId: script.id,
                            interpreterText: interpreterTexts[currentSlide.id] || ""
                          });
                        }
                      }
                    }}
                    placeholder={t("lectureBuilder.stringLiteral291")}
                    rows={3}
                    className="text-xs" />
                  
                    </div>
                }

                  {/* Translation progress */}
                  {Object.keys(interpreterTexts).length > 0 &&
                <div className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText292")}
                  {Object.keys(interpreterTexts).filter((k) => interpreterTexts[parseInt(k)]).length} / {slides.length}{t("lectureBuilder.jsxText293")}
                </div>
                }
                </CardContent>
              }
            </Card>

            {/* Unassigned scripts pool */}
            {unassignedScripts.length > 0 &&
            <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("lectureBuilder.jsxText294")}{unassignedScripts.length}{t("lectureBuilder.jsxText295")}</CardTitle>
                  <CardDescription className="text-xs">{t("lectureBuilder.jsxText296")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {unassignedScripts.map((s: any, i: number) =>
                    <button key={s.id}
                    className="w-full text-left p-2 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      if (currentSlide) {
                        assignScript(currentSlide.id, s.scriptText, s.avatarId || undefined);
                      }
                    }}>
                      
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0">{s.sortOrder + 1}</Badge>
                            <span className="text-xs line-clamp-2">{s.scriptText}</span>
                          </div>
                        </button>
                    )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            }
          </div>
        </div>
      </div>
    </div>);

}

// ============ STEP 5: PREVIEW & SETTINGS ============
