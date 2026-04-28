import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Languages, Mic, MicOff, Volume2, VolumeX, Play, Square,
  Globe, Clock, MessageSquare, History, Loader2, ArrowLeft,
  Zap, Radio, ChevronDown, ChevronUp, Trash2, Server, Monitor
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/contexts/LanguageContext";

interface TranslationResult {
  targetLanguage: string;
  translatedText: string;
  timestamp: Date;
  sourceText: string;
}

export default function LiveInterpretation() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("ko");
  const [selectedTargetLanguages, setSelectedTargetLanguages] = useState<string[]>(["en", "zh"]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Translation state
  const [inputText, setInputText] = useState("");
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // STT mode: "server" = Whisper API, "browser" = Web Speech API
  const [sttMode, setSttMode] = useState<"server" | "browser">("server");

  // Browser STT refs
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  // Server STT (MediaRecorder) refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // TTS
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsLang, setTtsLang] = useState("en");

  // Auto-translate after STT
  const [autoTranslate, setAutoTranslate] = useState(true);

  // Queries
  const languagesQuery = trpc.interpretation.getSupportedLanguages.useQuery();
  const sessionsQuery = trpc.interpretation.mySessions.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  // Mutations
  const startSession = trpc.interpretation.startSession.useMutation({
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      toast.success("통역 세션이 시작되었습니다.");
    },
    onError: () => toast.error("세션 시작에 실패했습니다."),
  });

  const batchTranslate = trpc.interpretation.batchTranslate.useMutation({
    onSuccess: (data) => {
      const newTranslations: TranslationResult[] = data.results
        .filter((r) => r.success)
        .map((r) => ({
          targetLanguage: r.targetLanguage,
          translatedText: r.translatedText,
          timestamp: new Date(),
          sourceText: inputText || data.results[0]?.translatedText || "",
        }));
      setTranslations((prev) => [...newTranslations, ...prev]);
      setIsTranslating(false);

      // TTS for the selected language
      if (ttsEnabled) {
        const ttsResult = data.results.find((r) => r.targetLanguage === ttsLang && r.success);
        if (ttsResult) speakText(ttsResult.translatedText, ttsResult.targetLanguage);
      }
    },
    onError: () => {
      setIsTranslating(false);
      toast.error("번역에 실패했습니다.");
    },
  });

  const endSession = trpc.interpretation.endSession.useMutation({
    onSuccess: () => {
      setActiveSessionId(null);
      setTranslations([]);
      toast.success("통역 세션이 종료되었습니다.");
      sessionsQuery.refetch();
    },
  });

  const translateChat = trpc.interpretation.translateChat.useMutation();

  // Server-side STT + translate mutation
  const transcribeAndTranslate = trpc.interpretation.transcribeAndTranslate.useMutation({
    onSuccess: (data) => {
      if (!data.sourceText) {
        toast.info("음성이 감지되지 않았습니다. 다시 시도해주세요.");
        setIsTranscribing(false);
        return;
      }

      setInputText(data.sourceText);

      const newTranslations: TranslationResult[] = data.translations
        .filter((r) => r.success)
        .map((r) => ({
          targetLanguage: r.language,
          translatedText: r.text,
          timestamp: new Date(),
          sourceText: data.sourceText,
        }));
      setTranslations((prev) => [...newTranslations, ...prev]);
      setIsTranscribing(false);

      // TTS
      if (ttsEnabled) {
        const ttsResult = data.translations.find((r) => r.language === ttsLang && r.success);
        if (ttsResult) speakText(ttsResult.text, ttsResult.language);
      }

      toast.success(`음성 인식 완료 (${data.detectedLanguage || sourceLanguage})`);
    },
    onError: (err) => {
      setIsTranscribing(false);
      toast.error(`음성 인식 실패: ${err.message}`);
    },
  });

  // Server-side STT only mutation
  const transcribeOnly = trpc.interpretation.transcribeAudioUpload.useMutation({
    onSuccess: (data) => {
      if (!data.text) {
        toast.info("음성이 감지되지 않았습니다.");
        setIsTranscribing(false);
        return;
      }
      setInputText((prev) => (prev ? prev + " " + data.text : data.text));
      setIsTranscribing(false);
      toast.success("음성 인식 완료");
    },
    onError: (err) => {
      setIsTranscribing(false);
      toast.error(`음성 인식 실패: ${err.message}`);
    },
  });

  // Languages data
  const languages = languagesQuery.data || [];

  // Get language info
  const getLangInfo = useCallback(
    (code: string) => languages.find((l) => l.code === code) || { code, name: code, nativeName: code, flag: "🌐" },
    [languages]
  );

  // Toggle target language
  const toggleTargetLang = (code: string) => {
    setSelectedTargetLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Start interpretation session
  const handleStartSession = () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (selectedTargetLanguages.length === 0) {
      toast.error("최소 1개의 대상 언어를 선택해주세요.");
      return;
    }
    startSession.mutate({
      sourceLanguage,
      targetLanguages: selectedTargetLanguages,
    });
  };

  // Handle translation (text input)
  const handleTranslate = () => {
    if (!activeSessionId || !inputText.trim()) return;
    setIsTranslating(true);
    batchTranslate.mutate({
      sessionId: activeSessionId,
      sourceText: inputText.trim(),
      sourceLanguage,
      targetLanguages: selectedTargetLanguages,
    });
    setInputText("");
  };

  // ========== Server-side STT (Whisper API via MediaRecorder) ==========
  const startServerRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Choose supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const sizeMB = blob.size / (1024 * 1024);

        if (sizeMB > 16) {
          toast.error("녹음 파일이 16MB를 초과합니다. 더 짧게 녹음해주세요.");
          return;
        }

        if (blob.size < 1000) {
          toast.info("녹음이 너무 짧습니다. 다시 시도해주세요.");
          return;
        }

        // Convert to base64
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          const actualMime = mimeType.split(";")[0]; // "audio/webm"

          if (autoTranslate && activeSessionId) {
            // Transcribe + translate in one call
            transcribeAndTranslate.mutate({
              audioData: base64,
              fileName: `recording-${Date.now()}.webm`,
              mimeType: actualMime,
              sourceLanguage,
              targetLanguages: selectedTargetLanguages,
              sessionId: activeSessionId,
            });
          } else {
            // Transcribe only
            transcribeOnly.mutate({
              audioData: base64,
              fileName: `recording-${Date.now()}.webm`,
              mimeType: actualMime,
              language: sourceLanguage,
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast.info("녹음을 시작합니다. 말씀하세요...");
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("마이크 접근 권한이 필요합니다.");
    }
  }, [sourceLanguage, selectedTargetLanguages, activeSessionId, autoTranslate]);

  const stopServerRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  // ========== Browser-side STT (Web Speech API) ==========
  const startBrowserRecording = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("이 브라우저에서는 음성 인식을 지원하지 않습니다. 서버 모드를 사용해주세요.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLanguage === "ko" ? "ko-KR" : sourceLanguage === "zh" ? "zh-CN" : sourceLanguage === "ja" ? "ja-JP" : "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setInputText((prev) => (prev ? prev + " " + final : final));
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        toast.error("음성 인식 오류: " + event.error);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [sourceLanguage]);

  const stopBrowserRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  // Unified start/stop recording
  const startRecording = sttMode === "server" ? startServerRecording : startBrowserRecording;
  const stopRecording = sttMode === "server" ? stopServerRecording : stopBrowserRecording;

  // TTS (Web Speech Synthesis)
  const speakText = useCallback((text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP",
      vi: "vi-VN", th: "th-TH", es: "es-ES", fr: "fr-FR",
      de: "de-DE", ar: "ar-SA", hi: "hi-IN", pt: "pt-BR",
      ru: "ru-RU", id: "id-ID", tr: "tr-TR",
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Format duration
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Languages className="w-6 h-6 text-primary" />
                  실시간 AI 통역
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI가 실시간으로 강의를 다국어로 통역합니다
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSessionId && (
                <Badge variant="default" className="bg-green-600 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" /> LIVE
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* STT Mode Selector */}
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  음성 인식 모드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSttMode("server")}
                    disabled={isRecording}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      sttMode === "server"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Server className="w-5 h-5 mb-1.5 text-primary" />
                    <div className="text-sm font-medium">서버 (Whisper)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      높은 정확도, 모든 브라우저
                    </div>
                  </button>
                  <button
                    onClick={() => setSttMode("browser")}
                    disabled={isRecording}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      sttMode === "browser"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Monitor className="w-5 h-5 mb-1.5 text-primary" />
                    <div className="text-sm font-medium">브라우저 (Web API)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      실시간 표시, Chrome 권장
                    </div>
                  </button>
                </div>
                {sttMode === "server" && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="text-xs">
                      <span className="font-medium">자동 번역</span>
                      <span className="text-muted-foreground ml-1">(녹음 후 즉시)</span>
                    </div>
                    <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Language Settings */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  언어 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Language */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">원본 언어</label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage} disabled={!!activeSessionId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Languages */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    대상 언어 ({selectedTargetLanguages.length}개 선택)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {languages
                      .filter((l) => l.code !== sourceLanguage)
                      .map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => toggleTargetLang(lang.code)}
                          disabled={!!activeSessionId}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            selectedTargetLanguages.includes(lang.code)
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          } ${activeSessionId ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {lang.flag} {lang.nativeName}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Session Controls */}
                <div className="pt-2 border-t border-border/50">
                  {!activeSessionId ? (
                    <Button
                      onClick={handleStartSession}
                      className="w-full"
                      disabled={startSession.isPending || !user}
                    >
                      {startSession.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      통역 세션 시작
                    </Button>
                  ) : (
                    <Button
                      onClick={() => endSession.mutate({ sessionId: activeSessionId })}
                      variant="destructive"
                      className="w-full"
                      disabled={endSession.isPending}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      세션 종료
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* TTS Settings */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  음성 출력 (TTS)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">자동 음성 출력</span>
                  <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
                </div>
                {ttsEnabled && selectedTargetLanguages.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">출력 언어</label>
                    <Select value={ttsLang} onValueChange={setTtsLang}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTargetLanguages.map((code) => {
                          const info = getLangInfo(code);
                          return (
                            <SelectItem key={code} value={code}>
                              {info.flag} {info.nativeName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    음성 출력 중...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session History */}
            {user && (
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center justify-between w-full"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      세션 기록
                    </CardTitle>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </CardHeader>
                {showHistory && (
                  <CardContent className="pt-0">
                    {sessionsQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sessionsQuery.data?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        아직 세션 기록이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sessionsQuery.data?.map((session) => (
                          <div
                            key={session.id}
                            className="p-2.5 rounded-lg bg-muted/50 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {getLangInfo(session.sourceLanguage).flag}{" "}
                                {getLangInfo(session.sourceLanguage).nativeName}
                              </span>
                              <Badge
                                variant={session.status === "active" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {session.status === "active" ? "진행중" : "종료"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                              <span className="mx-1">|</span>
                              {session.totalSegments || 0}개 세그먼트
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Right Panel: Translation Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Input Area */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    입력 ({getLangInfo(sourceLanguage).flag} {getLangInfo(sourceLanguage).nativeName})
                  </CardTitle>
                  {sttMode === "server" && (
                    <Badge variant="outline" className="text-xs">
                      <Server className="w-3 h-3 mr-1" />
                      Whisper STT
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeSessionId
                        ? sttMode === "server"
                          ? "마이크 버튼을 눌러 녹음하면 Whisper AI가 음성을 인식합니다. 텍스트 직접 입력도 가능합니다."
                          : "번역할 텍스트를 입력하거나 마이크 버튼을 눌러 음성으로 입력하세요..."
                        : "세션을 먼저 시작해주세요..."
                    }
                    disabled={!activeSessionId}
                    className="min-h-[100px] pr-12 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTranslate();
                      }
                    }}
                  />
                  {interimTranscript && sttMode === "browser" && (
                    <div className="absolute bottom-2 left-3 text-sm text-muted-foreground italic">
                      {interimTranscript}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    disabled={!activeSessionId || isTranscribing}
                    className="shrink-0"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-1" />
                        {sttMode === "server" ? (
                          <span className="animate-pulse">
                            녹음 중 {formatDuration(recordingDuration)}
                          </span>
                        ) : (
                          <span className="animate-pulse">녹음 중...</span>
                        )}
                      </>
                    ) : isTranscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        <span>인식 중...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-1" />
                        음성 입력
                      </>
                    )}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onClick={() => setInputText("")}
                    variant="ghost"
                    size="sm"
                    disabled={!inputText}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleTranslate}
                    disabled={!activeSessionId || !inputText.trim() || isTranslating}
                    size="sm"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Languages className="w-4 h-4 mr-1" />
                    )}
                    번역
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Translation Results */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" />
                  번역 결과
                  {translations.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {translations.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {translations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Languages className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {activeSessionId
                        ? "텍스트를 입력하면 실시간으로 번역됩니다."
                        : "세션을 시작하고 텍스트를 입력해보세요."}
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      15개 언어 동시 통역 지원
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] lg:h-[500px]">
                    <div className="space-y-3">
                      {/* Group translations by source text */}
                      {(() => {
                        const groups: { sourceText: string; items: TranslationResult[]; timestamp: Date }[] = [];
                        translations.forEach((tr) => {
                          const existing = groups.find((g) => g.sourceText === tr.sourceText && g.timestamp.getTime() === tr.timestamp.getTime());
                          if (existing) {
                            existing.items.push(tr);
                          } else {
                            groups.push({ sourceText: tr.sourceText, items: [tr], timestamp: tr.timestamp });
                          }
                        });
                        return groups.map((group, gi) => (
                          <div key={gi} className="rounded-lg border border-border/50 overflow-hidden">
                            {/* Source text */}
                            <div className="bg-muted/30 px-4 py-2.5 border-b border-border/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getLangInfo(sourceLanguage).flag}</span>
                                  <span className="text-sm font-medium">{group.sourceText}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {group.timestamp.toLocaleTimeString("ko-KR")}
                                </span>
                              </div>
                            </div>
                            {/* Translations */}
                            <div className="divide-y divide-border/20">
                              {group.items.map((item, ti) => {
                                const langInfo = getLangInfo(item.targetLanguage);
                                return (
                                  <div
                                    key={ti}
                                    className="px-4 py-2.5 flex items-start gap-3 hover:bg-muted/20 transition-colors"
                                  >
                                    <span className="text-lg shrink-0 mt-0.5">{langInfo.flag}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm">{item.translatedText}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {langInfo.nativeName}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="shrink-0 h-7 w-7 p-0"
                                      onClick={() => speakText(item.translatedText, item.targetLanguage)}
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Feature Info */}
            {!activeSessionId && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="glass-card">
                  <CardContent className="pt-5 text-center">
                    <Server className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium text-sm">Whisper STT</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      OpenAI Whisper API로 높은 정확도의 음성 인식
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-5 text-center">
                    <Languages className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium text-sm">AI 번역</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      LLM 기반 고품질 실시간 다국어 번역
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="pt-5 text-center">
                    <Volume2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium text-sm">음성 출력 (TTS)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      번역된 텍스트를 자연스러운 음성으로 출력
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
