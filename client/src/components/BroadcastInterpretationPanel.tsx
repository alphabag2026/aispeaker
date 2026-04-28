
import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Languages, Volume2, VolumeX, Loader2, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/lib/broadcastInterpretationPanel.ts";

// Supported languages for broadcast interpretation
const BROADCAST_LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
];

interface TranslatedSlide {
  slideIndex: number;
  translatedTitle: string;
  translatedContent: string;
  targetLanguage: string;
}

interface BroadcastInterpretationPanelProps {
  broadcastId: number;
  currentSlideIndex: number;
  sourceLanguage?: string;
  isAuthenticated: boolean;
}

export default function BroadcastInterpretationPanel({
  broadcastId,
  currentSlideIndex,
  sourceLanguage = "ko",
  isAuthenticated,
}: BroadcastInterpretationPanelProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isEnabled, setIsEnabled] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [translatedSlide, setTranslatedSlide] = useState<TranslatedSlide | null>(null);
  const [translationHistory, setTranslationHistory] = useState<TranslatedSlide[]>([]);
  const lastTranslatedRef = useRef<string>("");
  const isSpeakingRef = useRef(false);

  const translateSlide = trpc.broadcast.translateSlide.useMutation({
    onSuccess: (data) => {
      const newSlide: TranslatedSlide = {
        slideIndex: data.slideIndex,
        translatedTitle: data.translatedTitle,
        translatedContent: data.translatedContent,
        targetLanguage: data.targetLanguage,
      };
      setTranslatedSlide(newSlide);
      setTranslationHistory((prev) => [newSlide, ...prev.slice(0, 19)]);

      // TTS
      if (ttsEnabled && data.translatedContent) {
        speakText(data.translatedContent, data.targetLanguage);
      }
    },
    onError: () => {
      toast.error(t("broadcastInterpretationPanel.translationError"));
    },
  });

  // Auto-translate when slide changes
  useEffect(() => {
    if (!isEnabled || !isAuthenticated || broadcastId <= 0) return;
    const key = `${currentSlideIndex}-${targetLanguage}`;
    if (lastTranslatedRef.current === key) return;
    lastTranslatedRef.current = key;

    translateSlide.mutate({
      broadcastId,
      slideIndex: currentSlideIndex,
      targetLanguage,
      sourceLanguage,
    });
  }, [currentSlideIndex, isEnabled, targetLanguage, broadcastId, isAuthenticated, sourceLanguage]);

  // Reset when language changes
  useEffect(() => {
    if (isEnabled) {
      lastTranslatedRef.current = "";
      setTranslatedSlide(null);
    }
  }, [targetLanguage]);

  // TTS function using Web Speech Synthesis
  const speakText = useCallback((text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => { isSpeakingRef.current = false; };
    utterance.onerror = () => { isSpeakingRef.current = false; };
    window.speechSynthesis.speak(utterance);
  }, []);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedLang = BROADCAST_LANGUAGES.find((l) => l.code === targetLanguage);

  if (!isAuthenticated) return null;

  return (
    <div className="border-t border-gray-800 bg-gray-900/80">
      {/* Toggle Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-medium text-gray-300">{t("broadcastInterpretationPanel.title")}</span>
          {isEnabled && (
            <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0">
              ON
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t("broadcastInterpretationPanel.enableInterpretation")}</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                setIsEnabled(checked);
                if (!checked) {
                  setTranslatedSlide(null);
                  lastTranslatedRef.current = "";
                  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                }
              }}
            />
          </div>

          {isEnabled && (
            <>
              {/* Language Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">{t("broadcastInterpretationPanel.translationLanguage")}</label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BROADCAST_LANGUAGES.filter((l) => l.code !== sourceLanguage).map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-1.5">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TTS Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> {t("broadcastInterpretationPanel.readAloud")}
                </span>
                <Switch
                  checked={ttsEnabled}
                  onCheckedChange={setTtsEnabled}
                />
              </div>

              {/* Translation Result */}
              <div className="rounded-lg bg-gray-800/60 border border-gray-700/50">
                {translateSlide.isPending ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">{t("broadcastInterpretationPanel.translating")}</span>
                  </div>
                ) : translatedSlide && translatedSlide.slideIndex === currentSlideIndex ? (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Globe className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] text-violet-400 font-medium">
                        {selectedLang?.flag} {selectedLang?.name}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white leading-snug">
                      {translatedSlide.translatedTitle}
                    </h4>
                    <ScrollArea className="max-h-[120px]">
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {translatedSlide.translatedContent}
                      </p>
                    </ScrollArea>
                    {ttsEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-violet-400 hover:text-violet-300 h-6 px-2"
                        onClick={() => {
                          if (translatedSlide.translatedContent) {
                            speakText(translatedSlide.translatedContent, translatedSlide.targetLanguage);
                          }
                        }}
                      >
                        <Volume2 className="w-3 h-3 mr-1" /> {t("broadcastInterpretationPanel.listenAgain")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6 text-gray-500">
                    <span className="text-xs">{t("broadcastInterpretationPanel.autoTranslateOnSlideChange")}</span>
                  </div>
                )}
              </div>

              {/* Translation History */}
              {translationHistory.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">{t("broadcastInterpretationPanel.previousTranslations")}</span>
                  <ScrollArea className="max-h-[100px]">
                    <div className="space-y-1">
                      {translationHistory.slice(0, 5).map((item, idx) => (
                        <div
                          key={`${item.slideIndex}-${idx}`}
                          className="text-[11px] text-gray-400 bg-gray-800/40 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-800/60"
                          onClick={() => {
                            if (ttsEnabled) speakText(item.translatedContent, item.targetLanguage);
                          }}
                        >
                          <span className="text-gray-500 mr-1">#{item.slideIndex + 1}</span>
                          {item.translatedTitle}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
