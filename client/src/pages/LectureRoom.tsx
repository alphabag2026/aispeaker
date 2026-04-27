import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useParams } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Palette,
  Send,
  Volume2,
  Loader2,
  StopCircle,
  Eraser,
  PenTool,
  Undo2,
  MessageSquare,
  Globe,
  Video,
  User,
  Bot,
  Save,
} from "lucide-react";

const LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
];

export default function LectureRoom() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const lectureId = Number(params.id);
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("slides");
  const [question, setQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState<"pen" | "eraser">("pen");
  const [drawColor, setDrawColor] = useState("#3b82f6");
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Translation state
  const [selectedLang, setSelectedLang] = useState("ko");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

  // Avatar state
  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [isAvatarMode, setIsAvatarMode] = useState(false);

  // Bookmark state
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const { data: lecture } = trpc.lecture.getById.useQuery({ id: lectureId });
  const { data: materials } = trpc.material.list.useQuery({ lectureId });
  const { data: messages, refetch: refetchMessages } = trpc.qa.messages.useQuery({ lectureId });
  const { data: isEnrolled } = trpc.enrollment.isEnrolled.useQuery(
    { lectureId },
    { enabled: isAuthenticated }
  );

  const enrollMutation = trpc.enrollment.enroll.useMutation({
    onSuccess: () => window.location.reload(),
  });

  const askMutation = trpc.qa.ask.useMutation({
    onSuccess: () => {
      setQuestion("");
      refetchMessages();
    },
  });

  const ttsMutation = trpc.tts.generate.useMutation();
  const translateMutation = trpc.translation.translate.useMutation();
  const avatarMutation = trpc.avatar.generate.useMutation();
  const bookmarkAddMutation = trpc.bookmark.add.useMutation({
    onSuccess: () => toast.success(t("lr.bookmarkAdded")),
  });
  const bookmarkRemoveMutation = trpc.bookmark.remove.useMutation({
    onSuccess: () => toast.success(t("lr.bookmarkRemoved")),
  });
  const progressMutation = trpc.progress.update.useMutation();
  const createVodMutation = trpc.vod.createFromLecture.useMutation({
    onSuccess: (data) => {
      toast.success(t("lr.vodCreated", { vodId: data.vodId ?? 0 }));
    },
    onError: (err) => toast.error(err.message),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track time spent in lecture
  useEffect(() => {
    if (!isAuthenticated || !lectureId) return;
    const interval = setInterval(() => {
      progressMutation.mutate({
        lectureId,
        timeSpentSeconds: 30,
        lastSlideIndex: currentSlide,
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, lectureId, currentSlide]);

  const handleToggleBookmark = (messageId: number) => {
    if (bookmarkedIds.has(messageId)) {
      bookmarkRemoveMutation.mutate({ messageId });
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    } else {
      bookmarkAddMutation.mutate({ messageId, lectureId });
      setBookmarkedIds(prev => new Set(prev).add(messageId));
    }
  };

  // Canvas setup
  useEffect(() => {
    if (activeTab === "whiteboard" && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight - 60;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [activeTab]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    lastPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current || !lastPosRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = drawTool === "eraser" ? "#1a1a2e" : drawColor;
      ctx.lineWidth = drawTool === "eraser" ? 20 : 3;
      ctx.stroke();
      lastPosRef.current = { x, y };
    },
    [isDrawing, drawTool, drawColor]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
    lastPosRef.current = null;
  }, []);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleAsk = () => {
    if (!question.trim()) return;
    askMutation.mutate({ lectureId, content: question, inputMethod: "text" });
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      // Use Web Speech API for real-time STT
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = selectedLang === "ko" ? "ko-KR" : selectedLang === "en" ? "en-US" : selectedLang === "ja" ? "ja-JP" : "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuestion(transcript);
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error(t("lr.micAccessDenied"));
    }
  };

  const handlePlayTTS = async (text: string) => {
    setIsGeneratingTTS(true);
    setAvatarSpeaking(true);
    try {
      const result = await ttsMutation.mutateAsync({
        text,
        voiceId: "Kore",
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.onended = () => setAvatarSpeaking(false);
        audio.play();
      } else {
        setAvatarSpeaking(false);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setAvatarSpeaking(false);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handleTranslateMessage = async (messageId: number, content: string) => {
    if (translatedMessages[messageId] || selectedLang === "ko") return;
    try {
      const result = await translateMutation.mutateAsync({
        text: content,
        targetLang: selectedLang,
        sourceLang: "ko",
        sourceType: "qa_message",
      });
      setTranslatedMessages(prev => ({ ...prev, [messageId]: result.translatedText }));
    } catch (err) {
      console.error("Translation error:", err);
    }
  };

  const handleAvatarGeneration = async (text: string) => {
    if (!lecture) return;
    setAvatarVideoUrl(null);
    try {
      const result = await avatarMutation.mutateAsync({
        text,
        voiceProfileId: lecture.voiceProfileId,
        faceSwapProfileId: lecture.faceSwapProfileId,
        voiceModProfileId: lecture.voiceModProfileId,
      });
      setAvatarVideoUrl(result.videoUrl);
    } catch (err) {
      console.error("Avatar generation error:", err);
    }
  };

  useEffect(() => {
    if (isAvatarMode && messages) {
      const lastAnswer = [...messages].reverse().find(m => m.message.messageType === "answer");
      if (lastAnswer) {
        handleAvatarGeneration(lastAnswer.message.content);
      }
    }
  }, [isAvatarMode, messages]);

  if (!lecture) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isEnrolled) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-[380px] text-center p-8">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">{t("lr.enrollToJoin")}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t("lr.enrollToJoinDescription")}</p>
              <Button onClick={() => enrollMutation.mutate({ lectureId })}>{t("lr.enrollNow")}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Lecture Info & Controls */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border p-4 space-y-6 bg-card/50">
          <div>
            <h2 className="text-2xl font-bold">{lecture?.title}</h2>
            <Badge variant="secondary" className="mt-2">{lecture.category}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="text-lg font-semibold mb-2">{t("lr.lectureOutline")}</h3>
            <p className="text-sm text-muted-foreground">{lecture?.description}</p>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t("lr.instructor")}</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground">ID: {lecture.instructorId}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t("lr.totalLearningTime")}</span>
              <span>{t("lr.minutes", { minutes: 60 })}</span>
            </div>
          </div>

          <Separator />

          {/* VOD & Settings */}
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="font-semibold">{t("lr.createVod")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("lr.createVodDescription")}</p>
              <Button size="sm" onClick={() => createVodMutation.mutate({ lectureId })} disabled={createVodMutation.isPending} className="mt-3 w-full">
                {createVodMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2"/>}
                {t("lr.create")}
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="font-semibold">{t("lr.selectLanguage")}</p>
              <div className="relative mt-2">
                <Button variant="outline" className="w-full justify-between" onClick={() => setShowLangPicker(!showLangPicker)}>
                  <span>{LANGUAGES.find(l => l.code === selectedLang)?.name}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showLangPicker ? 'transform rotate-90' : ''}`} />
                </Button>
                {showLangPicker && (
                  <Card className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto z-10">
                    <ScrollArea className="h-full">
                      {LANGUAGES.map(lang => (
                        <div key={lang.code} onClick={() => { setSelectedLang(lang.code); setShowLangPicker(false); }} className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer text-sm">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
              <div>
                <p className="font-semibold">{t("lr.avatarMode")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("lr.avatarModeDescription")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isAvatarMode} onChange={(e) => setIsAvatarMode(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Center: Content Panel (Slides/Whiteboard) */}
        <div className="flex-1 flex flex-col bg-card/80">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex justify-between items-center border-b border-border px-4">
              <TabsList>
                <TabsTrigger value="slides">{t("lr.slides")}</TabsTrigger>
                <TabsTrigger value="whiteboard">{t("lr.whiteboard")}</TabsTrigger>
              </TabsList>
              {isAvatarMode && (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
                  {avatarVideoUrl ? (
                    <video src={avatarVideoUrl} autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src="" alt="AI Avatar" className="w-full h-full object-cover" />
                  )}
                  {avatarSpeaking && <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-pulse"></div>}
                </div>
              )}
            </div>

            <TabsContent value="slides" className="flex-1 m-0">
              {materials && materials.length > 0 ? (
                <div className="h-full flex flex-col justify-between p-4">
                  <div className="flex-1 flex items-center justify-center bg-secondary/20 rounded-lg overflow-hidden min-h-[400px]">
                    {materials[currentSlide] ? (
                      materials[currentSlide].fileType === "image" ? (
                        <img
                          src={materials[currentSlide].fileUrl}
                          alt={materials[currentSlide].title}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={materials[currentSlide].fileUrl}
                          className="w-full h-full"
                          title={materials[currentSlide].title}
                        />
                      )
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">{(materials[currentSlide] as any)?.title || t("lr.slide")}</p>
                        <p className="text-sm">{t("lr.slideProgress", { current: currentSlide + 1, total: materials.length })}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentSlide + 1} / {materials.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setCurrentSlide(Math.min(materials.length - 1, currentSlide + 1))
                      }
                      disabled={currentSlide === materials.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center min-h-[400px]\">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">{t("lr.noMaterials")}</p>
                    <p className="text-sm">{t("lr.materialsWillBeHere")}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="whiteboard" className="flex-1 m-0 flex flex-col">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Button
                  variant={drawTool === "pen" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setDrawTool("pen")}
                >
                  <PenTool className="h-4 w-4" />
                </Button>
                <Button
                  variant={drawTool === "eraser" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setDrawTool("eraser")}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                {['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#ffffff'].map((color) => (
                  <button
                    key={color}
                    className={`h-6 w-6 rounded-full border-2 ${
                      drawColor === color ? "border-primary" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setDrawColor(color);
                      setDrawTool("pen");
                    }}
                  />
                ))}
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="icon" onClick={clearCanvas}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 relative">
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Q&A Chat Panel */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex flex-col bg-card/30">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t("lr.aiQa")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("lr.askByTextOrVoice")}
              {selectedLang !== "ko" && (
                <span className="ml-1">
                  · {t("lr.translationEnabled", { flag: LANGUAGES.find((l) => l.code === selectedLang)?.flag || "" })}
                </span>
              )}
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 max-h-[400px] lg:max-h-none">
            <div className="space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.message.messageType === "question" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {msg.message.messageType === "question"
                          ? msg.user?.name || t("lr.student")
                          : isAvatarMode ? t("lr.aiAvatar") : t("lr.aiInstructor")}
                      </span>
                      {msg.message.inputMethod === "voice" && (
                        <Mic className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2.5 max-w-[85%] ${
                        msg.message.messageType === "question"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.message.messageType === "answer" ? (
                        <div className="text-sm">
                          <Streamdown>{msg.message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.message.content}</p>
                      )}
                    </div>

                    {/* Answer actions: TTS + Translation + Bookmark */}
                    {msg.message.messageType === "answer" && (
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1 h-7"
                          onClick={() => handlePlayTTS(msg.message.content)}
                          disabled={isGeneratingTTS}
                        >
                          {isGeneratingTTS ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                          {t("lr.voice")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs gap-1 h-7 ${bookmarkedIds.has(msg.message.id) ? "text-yellow-400" : ""}`}
                          onClick={() => handleToggleBookmark(msg.message.id)}
                        >
                          {bookmarkedIds.has(msg.message.id) ? (
                            <BookmarkCheck className="h-3 w-3" />
                          ) : (
                            <Bookmark className="h-3 w-3" />
                          )}
                          {t("lr.bookmark")}
                        </Button>
                        {selectedLang !== "ko" && (
                          <>
                            {translatedMessages[msg.message.id] ? (
                              <div className="ml-2 p-2 rounded bg-accent/20 text-xs max-w-[85%]">
                                <span className="text-muted-foreground">
                                  {LANGUAGES.find((l) => l.code === selectedLang)?.flag}{" "}
                                </span>
                                <Streamdown>{translatedMessages[msg.message.id]}</Streamdown>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1 h-7"
                                onClick={() =>
                                  handleTranslateMessage(msg.message.id, msg.message.content)
                                }
                                disabled={translateMutation.isPending}
                              >
                                {translateMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Globe className="h-3 w-3" />
                                )}
                                {t("lr.translate")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("lr.noQuestionsYet")}</p>
                  <p className="text-xs">{t("lr.askFirstQuestion")}</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={handleVoiceRecord}
                title={isRecording ? t("lr.stopRecording") : t("lr.askWithVoice")}
              >
                {isRecording ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                placeholder={t("lr.enterQuestion")}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                disabled={askMutation.isPending}
              />
              <Button
                size="icon"
                onClick={handleAsk}
                disabled={!question.trim() || askMutation.isPending}
              >
                {askMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
