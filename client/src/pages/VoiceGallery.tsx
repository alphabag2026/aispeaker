import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Crown, Mic, Play, Pause, Volume2, Globe, Sparkles, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "all", label: "전체 언어" },
  { value: "ko", label: "🇰🇷 한국어" },
  { value: "en", label: "🇺🇸 English" },
  { value: "ja", label: "🇯🇵 日本語" },
  { value: "zh", label: "🇨🇳 中文" },
];

const TONES = [
  { value: "all", label: "전체 톤" },
  { value: "warm", label: "따뜻한" },
  { value: "professional", label: "전문적인" },
  { value: "energetic", label: "에너지 넘치는" },
  { value: "authoritative", label: "권위 있는" },
  { value: "calm", label: "차분한" },
];

const GENDERS = [
  { value: "all", label: "전체" },
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

const TONE_COLORS: Record<string, string> = {
  warm: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  professional: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  energetic: "bg-green-500/10 text-green-600 dark:text-green-400",
  authoritative: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  calm: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

const LANG_FLAGS: Record<string, string> = {
  ko: "🇰🇷", en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳", es: "🇪🇸", fr: "🇫🇷",
};

export default function VoiceGallery() {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedTone, setSelectedTone] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: voices = [], isLoading } = trpc.sampleVoice.list.useQuery({
    language: selectedLanguage === "all" ? undefined : selectedLanguage,
    gender: selectedGender === "all" ? undefined : selectedGender,
    tone: selectedTone === "all" ? undefined : selectedTone,
  });

  const filteredVoices = voices.filter((voice: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      voice.name.toLowerCase().includes(q) ||
      voice.description?.toLowerCase().includes(q)
    );
  });

  const handlePlay = (voice: any) => {
    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    // Since we don't have actual audio files, show a demo toast
    if (!voice.sampleAudioUrl) {
      toast.info(`${voice.name} 음성 미리듣기 (데모: ${voice.ttsVoiceId} 엔진)`);
      setPlayingId(voice.id);
      setTimeout(() => setPlayingId(null), 2000);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(voice.sampleAudioUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingId(voice.id);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTEydjRoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">AI 목소리 갤러리</h1>
              <p className="text-emerald-100 mt-1">강의에 사용할 AI 음성을 선택하세요</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> {voices.length}+ 음성
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Globe className="w-3 h-3 mr-1" /> 다국어 지원
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Mic className="w-3 h-3 mr-1" /> OpenAI TTS
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 설명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="언어" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTone} onValueChange={setSelectedTone}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="톤" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="성별" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-12 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVoices.length === 0 ? (
          <div className="text-center py-20">
            <Volume2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">검색 결과가 없습니다</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">다른 필터를 시도해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVoices.map((voice: any) => (
              <Card
                key={voice.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/50 overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Voice Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          voice.gender === "female" 
                            ? "bg-pink-500/10 text-pink-600 dark:text-pink-400" 
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>
                          <Mic className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{voice.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-lg">{LANG_FLAGS[voice.language] || "🌐"}</span>
                            <span className="text-xs text-muted-foreground">{voice.language.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      {voice.isPremium && (
                        <Badge className="bg-amber-500/90 text-white border-0 text-[10px]">
                          <Crown className="w-3 h-3 mr-0.5" /> PRO
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{voice.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-[10px] border-0 ${TONE_COLORS[voice.tone] || ""}`}>
                        {voice.tone}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        속도: {voice.speed}x
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        엔진: {voice.ttsVoiceId}
                      </Badge>
                    </div>
                  </div>

                  {/* Play Bar */}
                  <div className="border-t border-border/50 bg-muted/30 px-5 py-3 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => handlePlay(voice)}
                    >
                      {playingId === voice.id ? (
                        <><Pause className="w-4 h-4" /> 정지</>
                      ) : (
                        <><Play className="w-4 h-4" /> 미리듣기</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        if (!user) {
                          toast.error("로그인이 필요합니다.");
                          return;
                        }
                        if (voice.isPremium) {
                          toast.info("Pro 플랜 이상에서 사용 가능합니다.");
                          return;
                        }
                        toast.success(`${voice.name} 음성이 선택되었습니다.`);
                      }}
                    >
                      선택 <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
