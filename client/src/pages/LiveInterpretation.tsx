// @ts-ignore - SpeechRecognition API
declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }

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
import { useLanguage } from "@/contexts/LanguageContext";

interface TranslationResult {
  targetLanguage: string;
  translatedText: string;
  timestamp: Date;
  sourceText: string;
}

export default function LiveInterpretation() {
  const { t } = useLanguage();
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
      toast.success(t("liveInterpretation.toastSessionStarted"));
    },
    onError: () => toast.error(t("liveInterpretation.toastSessionStartFailed")),
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
      toast.error(t("liveInterpretation.toastTranslationFailed"));
    },
  });

  const endSession = trpc.interpretation.endSession.useMutation({
    onSuccess: () => {
      setActiveSessionId(null);
      setTranslations([]);
      toast.success(t("liveInterpretation.toastSessionEnded"));
      sessionsQuery.refetch();
    },
  });

  const translateChat = trpc.interpretation.translateChat.useMutation();

  // Server-side STT + translate mutation
  const transcribeAndTranslate = trpc.interpretation.transcribeAndTranslate.useMutation({
    onSuccess: (data) => {
      if (!data.sourceText) {
        toast.info(t("liveInterpretation.toastNoSoundDetected"));
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

      toast.success(`${t("liveInterpretation.toastSttComplete")} (${data.detectedLanguage || sourceLanguage})`);
    },
    onError: (err) => {
      setIsTranscribing(false);
      toast.error(`${t("liveInterpretation.toastSttFailed")} ${err.message}`);
    },
  });

  // Server-side STT only mutation
  const transcribeOnly = trpc.interpretation.transcribeAudioUpload.useMutation({
    onSuccess: (data) => {
      if (!data.text) {
        toast.info(t("liveInterpretation.toastNoSoundDetected"));
        setIsTranscribing(false);
        return;
      }
      setInputText((prev) => (prev ? prev + " " + data.text : data.text));
      setIsTranscribing(false);
      toast.success(t("liveInterpretation.toastSttComplete"));
    },
    onError: (err) => {
      setIsTranscribing(false);
      toast.error(`${t("liveInterpretation.toastSttFailed")} ${err.message}`);
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
      toast.error(t("liveInterpretation.toastLoginRequired"));
      return;
    }
    if (selectedTargetLanguages.length === 0) {
      toast.error(t("liveInterpretation.toastSelectTargetLang"));
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
          toast.error(t("liveInterpretation.toastFileTooLarge"));
          return;
        }

        if (blob.size < 1000) {
          toast.info(t("liveInterpretation.toastRecordingTooShort"));
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

      toast.info(t("liveInterpretation.toastRecordingStarted"));
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error(t("liveInterpretation.toastMicAccessRequired"));
    }
  }, [sourceLanguage, selectedTargetLanguages, activeSessionId, autoTranslate, transcribeAndTranslate, transcribeOnly]);

  const stopServerRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success(t("liveInterpretation.toastRecordingStopped"));
    }
  }, []);

  // ========== Browser-side STT (Web Speech API) ==========
  const startBrowserRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = sourceLanguage === "ko" ? "ko-KR" : sourceLanguage === "zh" ? "zh-CN" : sourceLanguage === "ja" ? "ja-JP" : "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info(t("liveInterpretation.toastBrowserSttStarted"));
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
        if (finalTranscript) {
          setInputText((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        toast.error(`${t("liveInterpretation.toastSttFailed")} ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript("");
        if (autoTranslate && inputText) {
          handleTranslate();
        }
      };

      recognition.start();
    } else {
      toast.error(t("liveInterpretation.toastBrowserSttNotSupported"));
    }
  }, [sourceLanguage, autoTranslate, inputText, handleTranslate]);

  const stopBrowserRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success(t("liveInterpretation.toastSttStopped"));
    }
  }, []);

  // Generic recording controls
  const startRecording = sttMode === "server" ? startServerRecording : startBrowserRecording;
  const stopRecording = sttMode === "server" ? stopServerRecording : stopBrowserRecording;

  // Text-to-Speech
  const speakText = useCallback((text: string, lang: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("TTS is not supported in this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP",
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error("TTS failed to play.");
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(recordingDuration / 60).toString().padStart(2, "0");
    const seconds = (recordingDuration % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [recordingDuration]);

  useEffect(() => {
    // Make sure TTS language is one of the selected target languages
    if (!selectedTargetLanguages.includes(ttsLang) && selectedTargetLanguages.length > 0) {
      setTtsLang(selectedTargetLanguages[0]);
    }
    if (selectedTargetLanguages.length === 0 && ttsLang !== "en") {
      setTtsLang("en");
    }
  }, [selectedTargetLanguages, ttsLang]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              {t("liveInterpretation.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("liveInterpretation.description")}
            </p>
          </div>
        </div>
        {!user && (
          <Button asChild variant="secondary">
            <Link href="/login">{t("liveInterpretation.loginToViewHistory")}</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Settings */}
        <div className="lg:col-span-1 space-y-4">

          {/* STT Engine Settings */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                {t("liveInterpretation.sttEngineSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("liveInterpretation.speechRecognitionTechnology")}
              </p>
              <Select value={sttMode} onValueChange={(v) => setSttMode(v as any)} disabled={isRecording}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      <div>
                        <p>{t("liveInterpretation.sttServer")}</p>
                        <p className="text-xs text-muted-foreground">{t("liveInterpretation.sttServerDescription")}</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="browser">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <div>
                        <p>{t("liveInterpretation.sttBrowser")}</p>
                        <p className="text-xs text-muted-foreground">{t("liveInterpretation.sttBrowserDescription")}</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t("liveInterpretation.autoTranslate")}</span>
                  <span className="text-xs text-muted-foreground">{t("liveInterpretation.autoTranslateDescription")}</span>
                </div>
                <Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} disabled={isRecording} />
              </div>
              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-blue-500 pt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("liveInterpretation.recording")}...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                {t("liveInterpretation.languageSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source Language */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("liveInterpretation.sourceLanguage")}</label>
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
                  {t("liveInterpretation.targetLanguage")} ({selectedTargetLanguages.length}{t("liveInterpretation.itemsSelected")})
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
                    {t("liveInterpretation.startSession")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => endSession.mutate({ sessionId: activeSessionId })}
                    variant="destructive"
                    className="w-full"
                    disabled={endSession.isPending}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    {t("liveInterpretation.endSession")}
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
                {t("liveInterpretation.tts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("liveInterpretation.autoTts")}</span>
                <Switch checked={ttsEnabled} onCheckedChange={setTtsEnabled} />
              </div>
              {ttsEnabled && selectedTargetLanguages.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("liveInterpretation.outputLanguage")}</label>
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
                  {t("liveInterpretation.ttsSpeaking")}
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
                    {t("liveInterpretation.sessionHistory")}
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
                      {t("liveInterpretation.noHistory")}
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
                              {session.status === "active" ? t("liveInterpretation.statusActive") : t("liveInterpretation.statusEnded")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                            <span className="mx-1">|</span>
                            {session.totalSegments || 0}{t("liveInterpretation.segments")}
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
                  {t("liveInterpretation.input")} ({getLangInfo(sourceLanguage).flag} {getLangInfo(sourceLanguage).nativeName})
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
                        ? t("liveInterpretation.placeholderWhisper")
                        : t("liveInterpretation.placeholderBrowser")
                      : t("liveInterpretation.placeholderStartSession")
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
                          {t("liveInterpretation.recordingDuration")} ({formattedDuration})
                        </span>
                      ) : (
                        t("liveInterpretation.recording")
                      )}
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={handleTranslate}
                  size="sm"
                  disabled={!activeSessionId || isTranslating || !inputText.trim()}
                  className="w-full"
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4 mr-2" />
                  )}
                  {t("liveInterpretation.translate")}
                </Button>
                <Button
                  onClick={() => setInputText("")}
                  variant="ghost"
                  size="icon"
                  disabled={!inputText.trim()}
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Area */}
          <Card className="glass-card min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="w-4 h-4 text-primary" />
                {t("liveInterpretation.translationResults")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px] pr-3">
                {translations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Languages className="w-12 h-12 mb-4 text-border" />
                    <p>{t("liveInterpretation.waitingForTranslation")}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {translations.map((result, index) => (
                      <div key={index} className="space-y-2">
                        {index === 0 && result.sourceText && (
                          <div className="p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                                  {getLangInfo(sourceLanguage).flag}
                                </div>
                                {getLangInfo(sourceLanguage).nativeName}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {result.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{result.sourceText}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-muted/60">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                                {getLangInfo(result.targetLanguage).flag}
                              </div>
                              {getLangInfo(result.targetLanguage).nativeName}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => speakText(result.translatedText, result.targetLanguage)} disabled={isSpeaking}>
                                {isSpeaking && ttsLang === result.targetLanguage ? (
                                  <Volume2 className="w-4 h-4 text-primary" />
                                ) : (
                                  <VolumeX className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">{result.translatedText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
