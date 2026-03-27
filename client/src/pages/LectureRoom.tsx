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
    onSuccess: () => toast.success("북마크에 추가되었습니다!"),
  });
  const bookmarkRemoveMutation = trpc.bookmark.remove.useMutation({
    onSuccess: () => toast.success("북마크가 제거되었습니다."),
  });
  const progressMutation = trpc.progress.update.useMutation();
  const createVodMutation = trpc.vod.createFromLecture.useMutation({
    onSuccess: (data) => {
      toast.success(`VOD가 생성되었습니다! (ID: ${data.vodId})`);
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
      toast.error("마이크 접근이 거부되었습니다.");
    }
  };

  const handlePlayTTS = async (text: string) => {
    setIsGeneratingTTS(true);
    setAvatarSpeaking(true);
    try {
      const result = await ttsMutation.mutateAsync({
        text,
        voiceId: "alloy",
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
        sourceId: messageId,
      });
      setTranslatedMessages((prev) => ({
        ...prev,
        [messageId]: result.translatedText,
      }));
    } catch {
      // ignore
    }
  };

  const isAvatarMode = lecture?.aiMode === "avatar";

  if (!lecture) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">강의를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
          <p className="text-muted-foreground mb-6">강의에 참여하려면 먼저 로그인해주세요.</p>
          <Button asChild>
            <a href={getLoginUrl()}>로그인</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Lecture Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{lecture.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {lecture.category}
              </Badge>
              <Badge
                variant="outline"
                className={
                  lecture.status === "live"
                    ? "bg-green-500/20 text-green-400 border-0"
                    : "text-muted-foreground"
                }
              >
                {lecture.status === "live" ? "LIVE" : lecture.status}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                {lecture.aiMode === "avatar" ? (
                  <><User className="h-3 w-3" /> 아바타</>
                ) : lecture.aiMode === "voice" ? (
                  <><Volume2 className="h-3 w-3" /> 음성</>
                ) : (
                  <><MessageSquare className="h-3 w-3" /> 텍스트</>
                )}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowLangPicker(!showLangPicker)}
              >
                <Globe className="h-3.5 w-3.5" />
                {LANGUAGES.find((l) => l.code === selectedLang)?.flag}
              </Button>
              {showLangPicker && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-2 w-64 max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                          selectedLang === lang.code ? "bg-accent text-accent-foreground" : ""
                        }`}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setShowLangPicker(false);
                          setTranslatedMessages({});
                        }}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="truncate">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Save as VOD button (instructor only) */}
            {(user?.platformRole === "instructor" || user?.role === "admin") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => createVodMutation.mutate({ lectureId })}
                disabled={createVodMutation.isPending}
              >
                {createVodMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                VOD 저장
              </Button>
            )}

            {!isEnrolled && (
              <Button
                size="sm"
                onClick={() => enrollMutation.mutate({ lectureId })}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "수강 신청"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Avatar Panel (shown in avatar mode) */}
          {isAvatarMode && (
            <div className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 p-4">
              <div className="flex items-center gap-4">
                <div className={`relative h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ${avatarSpeaking ? "ring-4 ring-primary/50 ring-offset-2 ring-offset-background" : ""} transition-all`}>
                  <Bot className="h-10 w-10 text-white" />
                  {avatarSpeaking && (
                    <div className="absolute -bottom-1 -right-1">
                      <div className="flex gap-0.5">
                        <div className="w-1.5 h-3 bg-primary rounded-full animate-pulse" />
                        <div className="w-1.5 h-4 bg-primary rounded-full animate-pulse delay-75" />
                        <div className="w-1.5 h-2 bg-primary rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    AI 강사 아바타
                    {avatarSpeaking && (
                      <Badge className="bg-green-500/20 text-green-400 border-0 text-xs animate-pulse">
                        말하는 중...
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lecture.title} - AI가 실시간으로 답변합니다
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="slides" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  슬라이드
                </TabsTrigger>
                <TabsTrigger value="whiteboard" className="gap-2">
                  <Palette className="h-4 w-4" />
                  화이트보드
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slides" className="flex-1 m-0 p-4">
              {materials && materials.length > 0 ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden min-h-[400px]">
                    {materials[currentSlide]?.fileUrl ? (
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
                        <p className="text-lg font-medium">{materials[currentSlide]?.title || "슬라이드"}</p>
                        <p className="text-sm">슬라이드 {currentSlide + 1} / {materials.length}</p>
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
                <div className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">강의 자료가 없습니다</p>
                    <p className="text-sm">강사가 자료를 업로드하면 여기에 표시됩니다.</p>
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
                {["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#ffffff"].map((color) => (
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
              AI Q&A
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              텍스트 또는 음성으로 질문하세요
              {selectedLang !== "ko" && (
                <span className="ml-1">
                  · {LANGUAGES.find((l) => l.code === selectedLang)?.flag} 번역 활성화
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
                          ? msg.user?.name || "수강생"
                          : isAvatarMode ? "AI 아바타" : "AI 강사"}
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
                          음성
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
                          북마크
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
                                번역
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
                  <p className="text-sm">아직 질문이 없습니다</p>
                  <p className="text-xs">첫 번째 질문을 해보세요!</p>
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
                title={isRecording ? "녹음 중지" : "음성으로 질문"}
              >
                {isRecording ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                placeholder="질문을 입력하세요..."
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
