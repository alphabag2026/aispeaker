import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Radio, Play, Pause, Square, SkipBack, SkipForward, Users, Copy,
  MessageSquare, Send, ChevronLeft, ChevronRight, Volume2, VolumeX,
  ArrowLeft, Pin, Maximize2, Minimize2, Shield, Loader2
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

interface Section {
  title: string;
  content: string;
  slideNotes?: string;
  durationSec?: number;
}

export default function PresenterStudio() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ roomCode: string }>();
  const roomCode = params.roomCode || "";

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

  // Fetch broadcast by room code
  const broadcastByRoom = trpc.broadcast.getByRoom.useQuery(
    { roomCode },
    { enabled: !!roomCode }
  );

  const broadcastId = broadcastByRoom.data?.id || 0;

  // Check presenter permission
  const myCollabs = trpc.collaboration.myCollaborations.useQuery(undefined, {
    enabled: !!user,
  });

  const viewers = trpc.broadcast.viewers.useQuery({ broadcastId }, {
    enabled: broadcastId > 0,
    refetchInterval: 3000,
  });

  const startBroadcast = trpc.broadcast.start.useMutation({
    onSuccess: () => { toast.success("방송이 시작되었습니다!"); broadcastByRoom.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const pauseBroadcast = trpc.broadcast.pause.useMutation({
    onSuccess: () => { broadcastByRoom.refetch(); },
  });
  const resumeBroadcast = trpc.broadcast.resume.useMutation({
    onSuccess: () => { broadcastByRoom.refetch(); },
  });
  const endBroadcast = trpc.broadcast.end.useMutation({
    onSuccess: () => { toast.success("방송이 종료되었습니다"); navigate("/"); },
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
      if (broadcastByRoom.data?.script?.sections) {
        return JSON.parse(broadcastByRoom.data.script.sections as string);
      }
    } catch {}
    return [];
  })();

  const audioUrls: string[] = (() => {
    try {
      if (broadcastByRoom.data?.audioUrls) {
        return JSON.parse(broadcastByRoom.data.audioUrls as string);
      }
    } catch {}
    return [];
  })();

  const isLive = broadcastByRoom.data?.status === "live";
  const isPaused = broadcastByRoom.data?.status === "paused";

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
    if (!url) { toast.error("이 섹션에 오디오가 없습니다"); return; }
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
    if (currentSlide < sections.length - 1) {
      const nextIdx = currentSlide + 1;
      setCurrentSlide(nextIdx);
      syncSlideState(nextIdx, false);
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

  // Loading state
  if (broadcastByRoom.isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-400">방송 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!broadcastByRoom.data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">방송을 찾을 수 없습니다</p>
          <Button variant="outline" onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  // Permission check - must be owner or presenter collaborator
  const isOwner = broadcastByRoom.data.instructorId === user?.id;
  const isPresenter = myCollabs.data?.some(
    (c: any) => c.projectId === broadcastByRoom.data?.projectId && c.role === "presenter" && c.status === "accepted"
  );

  if (!isOwner && !isPresenter) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-400 mb-6">
            이 방송의 발표자(Presenter) 권한이 필요합니다.
            프로젝트 소유자에게 발표자 역할로 초대를 요청하세요.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentSlide];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <audio ref={audioRef} onEnded={handleAudioEnd} />

      {/* Top Bar - Presenter indicator */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {isLive && <Badge className="bg-red-500 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" />LIVE</Badge>}
            {isPaused && <Badge className="bg-yellow-500 text-black"><Pause className="w-3 h-3 mr-1" />일시정지</Badge>}
            {!isLive && !isPaused && <Badge variant="outline" className="text-gray-400">대기 중</Badge>}
            <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[300px]">{broadcastByRoom.data.title}</span>
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs gap-1">
              <Shield className="w-3 h-3" /> Presenter
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <Users className="w-4 h-4" />
            시청자 {viewers.data?.length || 0}명
          </span>
          <Button variant="ghost" size="sm" className="text-gray-400 gap-1" onClick={() => {
            navigator.clipboard.writeText(roomCode);
            toast.success("방 코드가 복사되었습니다");
          }}>
            <Copy className="w-3 h-3" />
            {roomCode}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        {/* Slide Area */}
        <div className="flex-1 flex flex-col">
          <div ref={slideContainerRef} className="flex-1 flex items-center justify-center p-3 sm:p-8 bg-gray-950 relative">
            {currentSection ? (
              <div className="w-full max-w-4xl">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-12 shadow-2xl border border-gray-700 min-h-[200px] sm:min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <Badge variant="outline" className="text-violet-400 border-violet-400">
                      섹션 {currentSlide + 1} / {sections.length}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {currentSection.durationSec ? `${Math.round(currentSection.durationSec / 60)}분` : ""}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-6 text-white">{currentSection.title}</h2>
                  <div className="flex-1 text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {currentSection.content}
                  </div>
                  {currentSection.slideNotes && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-500 italic">{currentSection.slideNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-sm">슬라이드가 없습니다</p>
              </div>
            )}
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
              <span className="text-sm font-mono px-3">{currentSlide + 1} / {sections.length}</span>
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
                  <Pause className="w-5 h-5" /> 일시정지
                </Button>
              ) : (
                <Button onClick={playCurrentAudio} variant="outline" size="lg" className="gap-2 border-green-500 text-green-500">
                  <Play className="w-5 h-5" /> 재생
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
                  <Radio className="w-4 h-4" /> 방송 시작
                </Button>
              )}
              {isLive && (
                <>
                  <Button onClick={() => pauseBroadcast.mutate({ broadcastId })} variant="outline" className="gap-2 border-yellow-500 text-yellow-500">
                    <Pause className="w-4 h-4" /> 일시정지
                  </Button>
                  <Button onClick={() => {
                    if (confirm("방송을 종료하시겠습니까?")) endBroadcast.mutate({ broadcastId });
                  }} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" /> 방송 종료
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button onClick={() => resumeBroadcast.mutate({ broadcastId })} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4" /> 재개
                  </Button>
                  <Button onClick={() => {
                    if (confirm("방송을 종료하시겠습니까?")) endBroadcast.mutate({ broadcastId });
                  }} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" /> 종료
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
            <span className="text-sm font-medium">채팅</span>
            <Badge variant="secondary" className="ml-auto text-xs">{chatMessages.length}</Badge>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`text-sm group ${msg.isPinned ? "bg-yellow-500/10 border border-yellow-500/30 rounded p-2" : ""}`}>
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

          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <Input
                placeholder="메시지를 입력하세요..."
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

          <div className="border-t border-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> 시청자 {viewers.data?.length || 0}명
            </p>
            <div className="flex flex-wrap gap-1">
              {viewers.data?.slice(0, 20).map((v: any) => (
                <Badge key={v.id} variant="secondary" className="text-[10px]">
                  {v.displayName || "시청자"}
                </Badge>
              ))}
              {(viewers.data?.length || 0) > 20 && (
                <Badge variant="outline" className="text-[10px]">+{(viewers.data?.length || 0) - 20}</Badge>
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
            <p className="text-[10px] text-gray-500">섹션 {idx + 1}</p>
            <p className="text-xs truncate text-gray-300">{sec.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
