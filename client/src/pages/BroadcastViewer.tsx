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
  Radio, Users, MessageSquare, Send, ArrowLeft, Volume2, VolumeX,
  Pin, Maximize2, Minimize2, LogIn
} from "lucide-react";
import { getLoginUrl } from "@/const";

interface Section {
  title: string;
  content: string;
  slideNotes?: string;
  durationSec?: number;
}

export default function BroadcastViewer() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ roomCode: string }>();
  const roomCode = params.roomCode || "";

  const [chatMessage, setChatMessage] = useState("");
  const [lastChatId, setLastChatId] = useState(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [prevSlideIndex, setPrevSlideIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // Get broadcast by room code
  const broadcast = trpc.broadcast.getByRoom.useQuery(
    { roomCode },
    { enabled: !!roomCode }
  );

  const broadcastId = broadcast.data?.id || 0;

  // Sync state polling - 200ms for responsiveness
  const syncState = trpc.broadcast.syncState.useQuery(
    { broadcastId },
    { enabled: broadcastId > 0, refetchInterval: 200 }
  );

  // Join/leave mutations
  const joinBroadcast = trpc.broadcast.join.useMutation({
    onSuccess: () => setHasJoined(true),
  });
  const leaveBroadcast = trpc.broadcast.leave.useMutation();
  const heartbeat = trpc.broadcast.heartbeat.useMutation();
  const sendChat = trpc.broadcast.chat.useMutation({
    onSuccess: () => setChatMessage(""),
  });

  // Chat polling
  const chatHistory = trpc.broadcast.chatHistory.useQuery(
    { broadcastId, afterId: lastChatId, limit: 50 },
    { enabled: broadcastId > 0, refetchInterval: 500 }
  );

  // Auto-join on load
  useEffect(() => {
    if (broadcastId > 0 && isAuthenticated && !hasJoined) {
      joinBroadcast.mutate({ broadcastId });
    }
  }, [broadcastId, isAuthenticated]);

  // Heartbeat every 10s
  useEffect(() => {
    if (!broadcastId || !hasJoined) return;
    const interval = setInterval(() => {
      heartbeat.mutate({ broadcastId });
    }, 10000);
    return () => clearInterval(interval);
  }, [broadcastId, hasJoined]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (broadcastId > 0 && hasJoined) {
        leaveBroadcast.mutate({ broadcastId });
      }
    };
  }, [broadcastId, hasJoined]);

  // Chat messages accumulation
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

  // Parse sections from script
  const sections: Section[] = (() => {
    try {
      if (broadcast.data?.script?.sections) {
        return JSON.parse(broadcast.data.script.sections as string);
      }
    } catch {}
    return [];
  })();

  // Parse audio URLs
  const audioUrls: string[] = (() => {
    try {
      if (broadcast.data?.audioUrls) {
        return JSON.parse(broadcast.data.audioUrls as string);
      }
    } catch {}
    return [];
  })();

  const currentSlideIndex = syncState.data?.currentSlideIndex ?? 0;
  const isAudioPlaying = syncState.data?.isAudioPlaying ?? false;
  const broadcastStatus = syncState.data?.status || broadcast.data?.status || "scheduled";
  const viewerCount = syncState.data?.currentViewers ?? 0;

  // Auto-play audio when slide changes or audio state changes
  useEffect(() => {
    if (!audioRef.current) return;
    const audioUrl = audioUrls[currentSlideIndex];

    if (currentSlideIndex !== prevSlideIndex) {
      // Slide changed - load new audio
      setPrevSlideIndex(currentSlideIndex);
      if (audioUrl && isAudioPlaying) {
        audioRef.current.src = audioUrl;
        audioRef.current.muted = isMuted;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    } else if (isAudioPlaying && audioRef.current.paused && audioUrl) {
      // Audio should be playing but is paused
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.muted = isMuted;
      audioRef.current.play().catch(() => {});
    } else if (!isAudioPlaying && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [currentSlideIndex, isAudioPlaying, prevSlideIndex, audioUrls, isMuted]);

  const handleSendChat = () => {
    if (!chatMessage.trim() || !isAuthenticated) return;
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

  const currentSection = sections[currentSlideIndex];

  // Broadcast ended screen
  if (broadcastStatus === "ended") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">방송이 종료되었습니다</h1>
          <p className="text-gray-400 mb-6">{broadcast.data?.title}</p>
          <Button onClick={() => navigate("/")} variant="outline">홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (broadcastStatus === "scheduled" || broadcastStatus === "paused") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Radio className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{broadcast.data?.title || "방송 대기 중"}</h1>
          <p className="text-gray-400 mb-2">
            {broadcastStatus === "paused" ? "방송이 일시 정지되었습니다. 곧 재개됩니다." : "방송이 곧 시작됩니다. 잠시만 기다려주세요."}
          </p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <Users className="w-4 h-4" />
            {viewerCount}명 대기 중
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <audio ref={audioRef} />

      {/* Top Bar */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-gray-400 hover:text-white h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge className="bg-red-500 text-white animate-pulse text-xs">
            <Radio className="w-3 h-3 mr-1" />LIVE
          </Badge>
          <span className="font-medium text-sm truncate max-w-[400px]">{broadcast.data?.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Users className="w-3 h-3" />{viewerCount}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            setIsMuted(!isMuted);
            if (audioRef.current) audioRef.current.muted = !isMuted;
          }}>
            {isMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3rem)]">
        {/* Slide Area */}
        <div ref={slideContainerRef} className="flex-1 flex items-center justify-center p-6 bg-gray-950 relative">
          {currentSection ? (
            <div className="w-full max-w-4xl">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-10 shadow-2xl border border-gray-700 min-h-[350px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-violet-400 border-violet-400">
                    섹션 {currentSlideIndex + 1} / {sections.length}
                  </Badge>
                  {isAudioPlaying && (
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <Volume2 className="w-3 h-3 animate-pulse" />
                      재생 중
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-4 text-white">{currentSection.title}</h2>
                <div className="flex-1 text-base text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {currentSection.content}
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 flex gap-1">
                {sections.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      idx === currentSlideIndex ? "bg-violet-500" : idx < currentSlideIndex ? "bg-violet-500/40" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">슬라이드를 불러오는 중...</p>
          )}
          <Button
            variant="ghost" size="icon"
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>

        {/* Chat Sidebar */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="h-10 flex items-center px-3 border-b border-gray-800">
            <MessageSquare className="w-3 h-3 mr-2 text-gray-400" />
            <span className="text-xs font-medium">실시간 채팅</span>
          </div>

          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`text-xs ${msg.isPinned ? "bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5" : ""}`}>
                  {msg.isPinned && <Pin className="w-2.5 h-2.5 text-yellow-500 inline mr-0.5" />}
                  <span className={`font-medium ${msg.messageType === "question" ? "text-blue-400" : "text-violet-400"}`}>
                    {msg.displayName}
                  </span>
                  {msg.messageType === "question" && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400 text-[8px] ml-0.5 py-0 px-0.5">Q</Badge>
                  )}
                  <span className="text-gray-300 ml-1">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-2 border-t border-gray-800">
            {isAuthenticated ? (
              <div className="flex gap-1.5">
                <Input
                  placeholder="메시지 입력..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  className="bg-gray-800 border-gray-700 text-xs h-8"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <LogIn className="w-3 h-3" />
                로그인하여 채팅 참여
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
