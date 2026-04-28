import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Palette,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Globe,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";




const LANGUAGES = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

export default function VodPlayer() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const vodId = Number(params.id);
  const [selectedLang, setSelectedLang] = useState("ko");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [currentSnapshotIdx, setCurrentSnapshotIdx] = useState(0);

  const { data: vodDetail, isLoading } = trpc.vod.getById.useQuery({ id: vodId });
  const { data: timeline } = trpc.vod.timeline.useQuery({ vodId }, { enabled: !!vodId });

  // Translate Q&A
  const translateMutation = trpc.translation.translate.useMutation();
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});

  const handleTranslateMessage = async (eventId: number, content: string) => {
    if (translatedMessages[eventId]) return;
    try {
      const result = await translateMutation.mutateAsync({
        text: content,
        targetLang: selectedLang,
        sourceLang: "ko",
      });
      setTranslatedMessages((prev) => ({
        ...prev,
        [eventId]: result.translatedText,
      }));
    } catch {
      // ignore
    }
  };

  if (isLoading || !vodDetail) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">{t("vod.loading")}</p>
        </div>
      </div>
    );
  }

  const { vod, lecture } = vodDetail;

  // Separate timeline events by type
  const qaEvents = timeline?.filter(
    (e) => e.event.eventType === "qa_question" || e.event.eventType === "qa_answer"
  ) || [];
  const snapshotEvents = timeline?.filter(
    (e) => e.event.eventType === "whiteboard_snapshot"
  ) || [];

  const formatOffset = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/vod">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{vod.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{lecture.title}</span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {vod.viewCount || 0}{t("vod.viewsUnit")}
              </span>
              <span>
                {vod.createdAt
                  ? new Date(vod.createdAt).toLocaleDateString("ko-KR")
                  : ""}
              </span>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowLangPicker(!showLangPicker)}
            >
              <Globe className="h-4 w-4" />
              {LANGUAGES.find((l) => l.code === selectedLang)?.flag}{" "}
              {t(`vod.lang.${selectedLang}`)}
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
                      <span className="truncate">{t(`vod.lang.${lang.code}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Content Area */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="snapshots">
              <TabsList className="mb-4">
                <TabsTrigger value="snapshots" className="gap-2">
                  <Palette className="h-4 w-4" />
                  {t("vod.whiteboardSnapshots")} ({snapshotEvents.length})
                </TabsTrigger>
                <TabsTrigger value="info" className="gap-2">
                  <Clock className="h-4 w-4" />
                  {t("vod.lectureInfo")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="snapshots">
                {snapshotEvents.length > 0 ? (
                  <div>
                    {/* Main snapshot view */}
                    <Card className="bg-card overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center relative">
                        <div className="text-center text-muted-foreground">
                          <Palette className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t("vod.snapshot")} {currentSnapshotIdx + 1}</p>
                          <p className="text-xs mt-1">
                            {t("vod.atTime", { time: formatOffset(snapshotEvents[currentSnapshotIdx]?.event.offsetSeconds || 0) })}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Snapshot navigation */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentSnapshotIdx(Math.max(0, currentSnapshotIdx - 1))
                        }
                        disabled={currentSnapshotIdx === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentSnapshotIdx + 1} / {snapshotEvents.length}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentSnapshotIdx(
                            Math.min(snapshotEvents.length - 1, currentSnapshotIdx + 1)
                          )
                        }
                        disabled={currentSnapshotIdx === snapshotEvents.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {snapshotEvents.map((snap, idx) => (
                        <button
                          key={snap.event.id}
                          className={`flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                            idx === currentSnapshotIdx
                              ? "border-primary"
                              : "border-transparent hover:border-primary/30"
                          }`}
                          onClick={() => setCurrentSnapshotIdx(idx)}
                        >
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">{t("vod.noSnapshots")}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="info">
                <Card className="bg-card">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">{t("vod.lectureInfo")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {lecture.description || t("vod.noDescription")}
                      </p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("vod.category")}</p>
                        <Badge variant="outline" className="mt-1">
                          {lecture.category}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("vod.aiMode")}</p>
                        <Badge variant="outline" className="mt-1">
                          {lecture.aiMode}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("vod.qaCount")}</p>
                        <p className="font-medium mt-1">{qaEvents.length}{t("vod.itemUnit")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("vod.snapshotCount")}</p>
                        <p className="font-medium mt-1">{snapshotEvents.length}{t("vod.itemUnit")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Q&A History */}
          <div className="lg:col-span-1">
            <Card className="bg-card h-full">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t("vod.qaHistory")} ({qaEvents.length})
                </h3>
                {selectedLang !== "ko" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("vod.translationNotice", { lang: t(`vod.lang.${selectedLang}`) })}
                  </p>
                )}
              </div>
              <ScrollArea className="h-[500px] lg:h-[600px]">
                <div className="p-4 space-y-4">
                  {qaEvents.length > 0 ? (
                    qaEvents.map((item) => (
                      <div key={item.event.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={item.event.eventType === "qa_question" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.event.eventType === "qa_question" ? "Q" : "A"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatOffset(item.event.offsetSeconds || 0)}
                          </span>
                          {item.user?.name && (
                            <span className="text-xs text-muted-foreground">
                              {item.user.name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm pl-2 border-l-2 border-border ml-3">
                          {item.event.eventType === "qa_answer" ? (
                            <div>
                              <Streamdown>{item.event.content || ""}</Streamdown>
                              {/* Translation */}
                              {selectedLang !== "ko" && (
                                <div className="mt-2">
                                  {translatedMessages[item.event.id] ? (
                                    <div className="p-2 rounded bg-accent/30 text-xs">
                                      <span className="text-muted-foreground block mb-1">
                                        {LANGUAGES.find((l) => l.code === selectedLang)?.flag}{" "}
                                        {t("vod.translationLabel")}
                                      </span>
                                      <Streamdown>{translatedMessages[item.event.id]}</Streamdown>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs gap-1 h-7"
                                      onClick={() =>
                                        handleTranslateMessage(item.event.id, item.event.content || "")
                                      }
                                      disabled={translateMutation.isPending}
                                    >
                                      {translateMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Globe className="h-3 w-3" />
                                      )}
                                      {t("vod.translate")}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p>{item.event.content}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t("vod.noQA")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
