import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Clock, FileText, Loader2, Maximize2, Minimize2, ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export default function PreviewPlayer() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const pipelineId = Number(params.id);

  const { data, isLoading } = trpc.pipeline.preview.useQuery(
    { pipelineId },
    { enabled: !!pipelineId }
  );

  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sections = data?.sections || [];
  const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);

  // Calculate cumulative time offsets
  const sectionOffsets = sections.reduce((acc: number[], s: any, i: number) => {
    const prev = i > 0 ? acc[i - 1] + (sections[i - 1]?.durationSec || 0) : 0;
    acc.push(prev);
    return acc;
  }, [] as number[]);

  const globalTime = (sectionOffsets[currentSection] || 0) + currentTime;
  const globalProgress = totalDuration > 0 ? (globalTime / totalDuration) * 100 : 0;

  // Audio playback
  const playSection = useCallback((idx: number) => {
    if (idx < 0 || idx >= sections.length) return;
    setCurrentSection(idx);
    setCurrentTime(0);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);

    const section = sections[idx];
    if (section?.audioUrl) {
      const audio = new Audio(section.audioUrl);
      audio.muted = isMuted;
      audioRef.current = audio;

      audio.play().catch(() => {
        // Autoplay blocked - use timer fallback
      });

      audio.onended = () => {
        if (idx < sections.length - 1) {
          playSection(idx + 1);
        } else {
          setIsPlaying(false);
        }
      };

      // Track time
      timerRef.current = setInterval(() => {
        if (audio && !audio.paused) {
          setCurrentTime(Math.floor(audio.currentTime));
        }
      }, 200);
    } else {
      // No audio - use timer based on estimated duration
      const dur = section?.durationSec || 30;
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setCurrentTime(elapsed);
        if (elapsed >= dur) {
          if (idx < sections.length - 1) {
            playSection(idx + 1);
          } else {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      }, 1000);
    }
  }, [sections, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) audioRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      playSection(currentSection);
    }
  };

  const goToPrevSection = () => {
    if (currentSection > 0) playSection(currentSection - 1);
  };

  const goToNextSection = () => {
    if (currentSection < sections.length - 1) playSection(currentSection + 1);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) audioRef.current.muted = !isMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Seek to section via progress bar
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const targetTime = ratio * totalDuration;

    // Find which section this time falls into
    let cumulative = 0;
    for (let i = 0; i < sections.length; i++) {
      const dur = sections[i]?.durationSec || 0;
      if (cumulative + dur > targetTime) {
        playSection(i);
        break;
      }
      cumulative += dur;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">로그인이 필요합니다.</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">미리보기 데이터를 찾을 수 없습니다.</div>;

  const currentSec = sections[currentSection];

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{data.pipeline.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {data.script && (
                <>
                  <Badge variant="outline" className="text-xs">{data.script.category}</Badge>
                  <Badge variant="outline" className="text-xs">{data.script.difficulty}</Badge>
                </>
              )}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(totalDuration)}</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {sections.length}개 섹션</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Slide Area */}
        <div className="flex-1 flex flex-col">
          {/* Slide Display */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800 relative">
            {currentSec ? (
              <div className="max-w-3xl w-full text-center">
                <Badge className="mb-6 text-sm" variant="secondary">
                  섹션 {currentSection + 1} / {sections.length}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  {currentSec.title}
                </h2>
                {currentSec.slideNotes && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left">
                    <p className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap">
                      {currentSec.slideNotes}
                    </p>
                  </div>
                )}
                <div className="mt-6 text-white/50 text-sm">
                  {formatTime(currentTime)} / {formatTime(currentSec.durationSec || 0)}
                </div>
              </div>
            ) : (
              <div className="text-white/50 text-center">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>재생 버튼을 눌러 미리보기를 시작하세요</p>
              </div>
            )}

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white/50 hover:text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>

          {/* Player Controls */}
          <div className="border-t bg-card p-4">
            {/* Progress Bar */}
            <div
              className="w-full h-2 bg-muted rounded-full cursor-pointer mb-4 relative group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-200"
                style={{ width: `${globalProgress}%` }}
              />
              {/* Section markers */}
              {sectionOffsets.map((offset: number, i: number) => (
                i > 0 && (
                  <div
                    key={i}
                    className="absolute top-0 w-0.5 h-full bg-muted-foreground/30"
                    style={{ left: `${(offset / totalDuration) * 100}%` }}
                  />
                )
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground w-20">{formatTime(globalTime)}</span>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={goToPrevSection} disabled={currentSection === 0}>
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextSection} disabled={currentSection === sections.length - 1}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 w-20 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section Sidebar */}
        <div className="w-80 border-l bg-card hidden lg:flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">강의 구성</h3>
            <p className="text-xs text-muted-foreground mt-1">{sections.length}개 섹션 · {formatTime(totalDuration)}</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {sections.map((sec: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => playSection(idx)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                    currentSection === idx
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono ${currentSection === idx ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {currentSection === idx && isPlaying && (
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" />
                        <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                        <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{formatTime(sec.durationSec || 0)}</span>
                  </div>
                  <p className={`text-sm font-medium truncate ${currentSection === idx ? "text-primary" : ""}`}>
                    {sec.title}
                  </p>
                  {currentSection === idx && (
                    <Progress
                      value={sec.durationSec > 0 ? (currentTime / sec.durationSec) * 100 : 0}
                      className="h-1 mt-2"
                    />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Script Teleprompter (bottom panel) */}
      {currentSec && (
        <div className="border-t bg-card/80 backdrop-blur-sm">
          <details className="group">
            <summary className="container py-2 cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              강사 스크립트 보기
            </summary>
            <div className="container pb-4">
              <div className="bg-muted/30 rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentSec.content}</p>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
