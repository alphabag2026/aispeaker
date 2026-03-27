import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useParams } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Streamdown } from "streamdown";
import {
  BookOpen,
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
  Square,
  Circle,
  Type,
  Undo2,
  Download,
  MessageSquare,
} from "lucide-react";

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
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawTool, setDrawTool] = useState<"pen" | "eraser">("pen");
  const [drawColor, setDrawColor] = useState("#3b82f6");
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const { data: lecture } = trpc.lecture.getById.useQuery({ id: lectureId });
  const { data: materials } = trpc.material.list.useQuery({ lectureId });
  const { data: messages, refetch: refetchMessages } = trpc.qa.messages.useQuery({ lectureId });
  const { data: isEnrolled } = trpc.enrollment.isEnrolled.useQuery(
    { lectureId },
    { enabled: isAuthenticated }
  );

  const enrollMutation = trpc.enrollment.enroll.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const askMutation = trpc.qa.ask.useMutation({
    onSuccess: () => {
      setQuestion("");
      refetchMessages();
    },
  });

  const ttsMutation = trpc.tts.generate.useMutation();

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Use Web Speech API for STT as a fallback
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          // Already handled via SpeechRecognition below
        }
      };

      // Use Web Speech API for real-time STT
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuestion(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const handlePlayTTS = async (text: string) => {
    setIsGeneratingTTS(true);
    try {
      const result = await ttsMutation.mutateAsync({
        text,
        voiceId: "alloy",
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

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
        <div className="container py-4 flex items-center justify-between">
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
            </div>
          </div>
          {!isEnrolled && (
            <Button
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Content Area */}
        <div className="flex-1 flex flex-col">
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
                  {/* Slide Viewer */}
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

                  {/* Slide Controls */}
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
              {/* Whiteboard Toolbar */}
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

              {/* Canvas */}
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
                          : "AI 강사"}
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
                    {msg.message.messageType === "answer" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-xs gap-1"
                        onClick={() => handlePlayTTS(msg.message.content)}
                        disabled={isGeneratingTTS}
                      >
                        {isGeneratingTTS ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        음성으로 듣기
                      </Button>
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
