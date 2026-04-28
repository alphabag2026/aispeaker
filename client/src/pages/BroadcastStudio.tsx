import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Radio, Play, Pause, Square, SkipBack, SkipForward, Users, Copy,
  MessageSquare, Send, ChevronLeft, ChevronRight, Volume2, VolumeX,
  ArrowLeft, Pin, Maximize2, Minimize2
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

interface Section {
  title: string;
  content: string;
  slideNotes?: string;
  durationSec?: number;
}

export default function BroadcastStudio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const broadcastId = parseInt(params.id || "0");

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [lastChatId, setLastChatId] = useState(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const broadcast = trpc.broadcast.get.useQuery({ id: broadcastId }, { enabled: broadcastId > 0 });
  const viewers = trpc.broadcast.viewers.useQuery({ broadcastId }, {
    enabled: broadcastId > 0,
    refetchInterval: 3000,
  });

  const startBroadcast = trpc.broadcast.start.useMutation({
    onSuccess: () => { toast.success(t("bs.toast.broadcastStarted")); broadcast.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const pauseBroadcast = trpc.broadcast.pause.useMutation({
    onSuccess: () => { broadcast.refetch(); },
  });
  const resumeBroadcast = trpc.broadcast.resume.useMutation({
    onSuccess: () => { broadcast.refetch(); },
  });
  const endBroadcast = trpc.broadcast.end.useMutation({
    onSuccess: () => { toast.success(t("bs.toast.broadcastEnded")); navigate("/broadcasts"); },
    onError: (err) => toast.error(err.message),
  });
  const updateSlide = trpc.broadcast.updateSlide.useMutation();
  const sendChat = trpc.broadcast.chat.useMutation({
    onSuccess: () => setChatMessage(""),
  });
  const pinChat = trpc.broadcast.pinChat.useMutation();

  // Chat polling
  const chatHistory = trpc.broadcast.chatHistory.useQuery(
    { broadcastId, afterId: lastChatId, limit: 50 },
    { enabled: broadcastId > 0, refetchInterval: 500 }
  );

  useEffect(() => {
    if (chatHistory.data && chatHistory.data.length > 0) {
      setChatMessages((prev) => {
        const newMsgs = chatHistory.data.filter(
          (m: any) => !prev.some((p) => p.id === m.id)
        );
        return [...prev, ...newMsgs];
      });
      const maxId = Math.max(...chatHistory.data.map((m: any) => m.id));
      if (maxId > lastChatId) setLastChatId(maxId);
    }
  }, [chatHistory.data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sections: Section[] = (() => {
    try {
      if (broadcast.data?.script?.sections) {
        return JSON.parse(broadcast.data.script.sections as string);
      }
    } catch {}
    return [];
  })();

  const audioUrls: string[] = (() => {
    try {
      if (broadcast.data?.audioUrls) {
        return JSON.parse(broadcast.data.audioUrls as string);
      }
    } catch {}
    return [];
  })();

  const isLive = broadcast.data?.status === "live";
  const isPaused = broadcast.data?.status === "paused";

  const syncSlideState = useCallback((slideIdx: number, playing: boolean) => {
    if (broadcastId > 0) {
      updateSlide.mutate({
        broadcastId,
        slideIndex: slideIdx,
        isAudioPlaying: playing,
        audioPosition: 0,
      });
    }
  }, [broadcastId]);

  const goToSlide = (idx: number) => {
    if (idx < 0 || idx >= sections.length) return;
    setCurrentSlide(idx);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    syncSlideState(idx, false);
  };

  const playCurrentAudio = () => {
    const url = audioUrls[currentSlide];
    if (!url) {
      toast.error(t("bs.toast.noAudioForSection"));
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.muted = isMuted;
      audioRef.current.play();
      setIsPlaying(true);
      syncSlideState(currentSlide, true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      syncSlideState(currentSlide, false);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    // Auto-advance to next slide
    if (currentSlide < sections.length - 1) {
      const nextIdx = currentSlide + 1;
      setCurrentSlide(nextIdx);
      syncSlideState(nextIdx, false);
      // Auto-play next section after brief delay
      setTimeout(() => {
        const nextUrl = audioUrls[nextIdx];
        if (nextUrl && audioRef.current) {
          audioRef.current.src = nextUrl;
          audioRef.current.muted = isMuted;
          audioRef.current.play();
          setIsPlaying(true);
          syncSlideState(nextIdx, true);
        }
      }, 1000);
    } else {
      syncSlideState(currentSlide, false);
    }
  };

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendChat.mutate({ broadcastId, message: chatMessage.trim(), messageType: "chat" });
  };

  const toggleFullscreen = () => {
    if (!slideContainerRef.current) return;
    if (!document.fullscreenElement) {
      slideContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (!broadcast.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("bs.loadingBroadcastInfo")}</p>
      </div>
    );
  }

  const currentSection = sections[currentSlide];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <audio ref={audioRef} onEnded={handleAudioEnd} />

      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/broadcasts")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {isLive && <Badge className="bg-red-500 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" />LIVE</Badge>}
            {isPaused && <Badge className="bg-yellow-500 text-black"><Pause className="w-3 h-3 mr-1" />{t("bs.status.paused")}</Badge>}
            {!isLive && !isPaused && <Badge variant="outline" className="text-gray-400">{t("bs.status.waiting")}</Badge>}
            <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[300px]">{broadcast.data.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <Users className="w-4 h-4" />
            {t("bs.viewersCount", { count: viewers.data?.length || 0 })}
          </span>
          <Button variant="ghost" size="sm" className="text-gray-400 gap-1" onClick={() => {
            navigator.clipboard.writeText(broadcast.data!.roomCode);
            toast.success(t("bs.toast.roomCodeCopied"));
          }}>
            <Copy className="w-3 h-3" />
            {broadcast.data.roomCode}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        {/* Slide Area */}
        <div className="flex-1 flex flex-col">
          {/* Slide Display */}
          <div ref={slideContainerRef} className="flex-1 flex items-center justify-center p-3 sm:p-8 bg-gray-950 relative">
            {currentSection ? (
              <div className="w-full max-w-4xl">
                {/* Slide Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-12 shadow-2xl border border-gray-700 min-h-[200px] sm:min-h-[400px] flex flex-col">
                  {/* Section Number */}
                  <div className="flex items-center justify-between mb-6">
                    <Badge variant="outline" className="text-violet-400 border-violet-400">
                      {t("bs.slide.sectionProgress", { current: currentSlide + 1, total: sections.length })}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {currentSection.durationSec ? `${Math.round(currentSection.durationSec / 60)}${t("bs.slide.minutes")}` : ""}
                    </span>
                  </div>
                  {/* Section Title */}
                  <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-6 text-white">{currentSection.title}</h2>
                  {/* Section Content */}
                  <div className="flex-1 text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {currentSection.content}
                  </div>
                  {/* Slide Notes */}
                  {currentSection.slideNotes && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-500 italic">{currentSection.slideNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-xl mb-2">{t("bs.slide.noSlides")}</p>
                <p className="text-sm">{t("bs.slide.noSlidesDesc")}</p>
              </div>
            )}
            {/* Fullscreen Toggle */}
            <Button
              variant="ghost" size="icon"
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
          </div>

          {/* Controls Bar */}
          <div className="h-auto sm:h-20 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center justify-center sm:justify-between gap-2 px-3 sm:px-6 py-2 sm:py-0">
            {/* Slide Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => goToSlide(currentSlide - 1)} disabled={currentSlide === 0}>
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => goToSlide(currentSlide - 1)} disabled={currentSlide === 0}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-mono px-3">
                {currentSlide + 1} / {sections.length}
              </span>
              <Button variant="ghost" size="icon" onClick={() => goToSlide(currentSlide + 1)} disabled={currentSlide >= sections.length - 1}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => goToSlide(currentSlide + 1)} disabled={currentSlide >= sections.length - 1}>
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-3">
              {isPlaying ? (
                <Button onClick={pauseAudio} variant="outline" size="lg" className="gap-2 border-yellow-500 text-yellow-500">
                  <Pause className="w-5 h-5" />
                  {t("bs.controls.pause")}
                </Button>
              ) : (
                <Button onClick={playCurrentAudio} variant="outline" size="lg" className="gap-2 border-green-500 text-green-500">
                  <Play className="w-5 h-5" />
                  {t("bs.controls.play")}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => {
                setIsMuted(!isMuted);
                if (audioRef.current) audioRef.current.muted = !isMuted;
              }}>
                {isMuted ? <VolumeX className="w-5 h-5 text-gray-500" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>

            {/* Broadcast Controls */}
            <div className="flex items-center gap-2">
              {!isLive && !isPaused && (
                <Button onClick={() => startBroadcast.mutate({ broadcastId })} className="gap-2 bg-red-600 hover:bg-red-700">
                  <Radio className="w-4 h-4" />
                  {t("bs.controls.startBroadcast")}
                </Button>
              )}
              {isLive && (
                <>
                  <Button onClick={() => pauseBroadcast.mutate({ broadcastId })} variant="outline" className="gap-2 border-yellow-500 text-yellow-500">
                    <Pause className="w-4 h-4" />
                    {t("bs.controls.pause")}
                  </Button>
                  <Button onClick={() => {
                    if (confirm(t("bs.confirm.endBroadcast"))) {
                      endBroadcast.mutate({ broadcastId });
                    }
                  }} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" />
                    {t("bs.controls.endBroadcast")}
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button onClick={() => resumeBroadcast.mutate({ broadcastId })} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4" />
                    {t("bs.controls.resume")}
                  </Button>
                  <Button onClick={() => {
                    if (confirm(t("bs.confirm.endBroadcast"))) {
                      endBroadcast.mutate({ broadcastId });
                    }
                  }} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" />
                    {t("bs.controls.end")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-80 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col max-h-[35vh] lg:max-h-none">
          <div className="h-12 flex items-center px-4 border-b border-gray-800">
            <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm font-medium">{t("bs.chat.title")}</span>
            <Badge variant="secondary" className="ml-auto text-xs">{chatMessages.length}</Badge>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`text-sm ${msg.isPinned ? "bg-yellow-500/10 border border-yellow-500/30 rounded p-2" : ""}`}>
                  {msg.isPinned && <Pin className="w-3 h-3 text-yellow-500 inline mr-1" />}
                  <span className={`font-medium ${msg.messageType === "question" ? "text-blue-400" : "text-violet-400"}`}>
                    {msg.displayName}
                  </span>
                  {msg.messageType === "question" && <Badge variant="outline" className="text-blue-400 border-blue-400 text-[10px] ml-1 py-0">Q</Badge>}
                  <span className="text-gray-300 ml-1">{msg.message}</span>
                  {!msg.isPinned && (
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100"
                      onClick={() => pinChat.mutate({ chatId: msg.id, isPinned: true })}>
                      <Pin className="w-2 h-2" />
                    </Button>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <Input
                placeholder={t("bs.chat.placeholder")}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="bg-gray-800 border-gray-700 text-sm"
              />
              <Button size="icon" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Viewers List */}
          <div className="border-t border-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t("bs.chat.viewersTitle", { count: viewers.data?.length || 0 })}
            </p>
            <div className="flex flex-wrap gap-1">
              {viewers.data?.slice(0, 20).map((v: any) => (
                <Badge key={v.id} variant="secondary" className="text-[10px]">
                  {v.displayName || t("bs.chat.viewer")}
                </Badge>
              ))}
              {(viewers.data?.length || 0) > 20 && (
                <Badge variant="outline" className="text-[10px]">
                  +{(viewers.data?.length || 0) - 20}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Thumbnails Bar */}
      <div className="h-20 sm:h-24 bg-gray-900 border-t border-gray-800 flex items-center px-2 sm:px-4 gap-2 overflow-x-auto">
        {sections.map((sec, idx) => (
          <button
            key={idx}
            onClick={() => goToSlide(idx)}
            className={`flex-shrink-0 w-36 h-16 rounded-lg border-2 p-2 text-left transition-all ${
              idx === currentSlide
                ? "border-violet-500 bg-violet-500/10"
                : "border-gray-700 bg-gray-800 hover:border-gray-600"
            }`}
          >
            <p className="text-[10px] text-gray-500">{t("bs.thumbnail.section", { index: idx + 1 })}</p>
            <p className="text-xs truncate text-gray-300">{sec.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
