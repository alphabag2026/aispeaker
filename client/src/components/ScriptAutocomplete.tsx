import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CornerDownLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage, registerTranslations } from "@/contexts/LanguageContext";

// ============ i18n ============
registerTranslations("ko", {
  "autocomplete.suggestion": "AI 제안",
  "autocomplete.accept": "Tab으로 수락",
  "autocomplete.dismiss": "Esc로 닫기",
  "autocomplete.loading": "AI가 다음 문장을 생각하고 있습니다...",
  "autocomplete.toggle": "AI 자동 완성",
  "autocomplete.enabled": "켜짐",
  "autocomplete.disabled": "꺼짐",
});

registerTranslations("en", {
  "autocomplete.suggestion": "AI Suggestion",
  "autocomplete.accept": "Press Tab to accept",
  "autocomplete.dismiss": "Press Esc to dismiss",
  "autocomplete.loading": "AI is thinking of the next sentence...",
  "autocomplete.toggle": "AI Autocomplete",
  "autocomplete.enabled": "On",
  "autocomplete.disabled": "Off",
});

registerTranslations("ja", {
  "autocomplete.suggestion": "AI提案",
  "autocomplete.accept": "Tabで受け入れ",
  "autocomplete.dismiss": "Escで閉じる",
  "autocomplete.loading": "AIが次の文を考えています...",
  "autocomplete.toggle": "AI自動補完",
  "autocomplete.enabled": "オン",
  "autocomplete.disabled": "オフ",
});

registerTranslations("zh", {
  "autocomplete.suggestion": "AI建议",
  "autocomplete.accept": "按Tab接受",
  "autocomplete.dismiss": "按Esc关闭",
  "autocomplete.loading": "AI正在思考下一句...",
  "autocomplete.toggle": "AI自动补全",
  "autocomplete.enabled": "开",
  "autocomplete.disabled": "关",
});

const STORAGE_KEY = "aispeaker-autocomplete-enabled";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  lectureTitle?: string;
  sectionContext?: string;
  language?: string;
}

export default function ScriptAutocomplete({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
  lectureTitle,
  sectionContext,
  language = "ko",
}: Props) {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false"; // default true
  });
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTextRef = useRef(value);

  const autocompleteMut = trpc.lectureBuilder.scriptAutocomplete.useMutation();

  // Toggle persistence
  const handleToggle = useCallback((checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem(STORAGE_KEY, String(checked));
    if (!checked) {
      setSuggestion("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, []);

  // Debounced autocomplete request
  useEffect(() => {
    if (!enabled || !value || value.length < 10) {
      setSuggestion("");
      return;
    }

    // Only trigger when text is added (not deleted)
    if (value.length <= lastTextRef.current.length) {
      lastTextRef.current = value;
      return;
    }
    lastTextRef.current = value;

    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Wait 1.5 seconds after user stops typing
    debounceRef.current = setTimeout(async () => {
      // Only suggest after sentence endings or pauses
      const trimmed = value.trim();
      const lastChar = trimmed[trimmed.length - 1];
      const shouldSuggest = ['.', '。', '!', '?', '다', '요', '죠', '까'].includes(lastChar) || trimmed.endsWith('\n');
      
      if (!shouldSuggest) return;

      setIsLoading(true);
      try {
        const result = await autocompleteMut.mutateAsync({
          currentText: value.slice(-2000), // Last 2000 chars for context
          lectureTitle,
          sectionContext,
          language,
        });
        if (result.suggestion) {
          setSuggestion(result.suggestion);
        }
      } catch {
        // Silently fail - autocomplete is a nice-to-have
      } finally {
        setIsLoading(false);
      }
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, enabled]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestion) {
        if (e.key === "Tab") {
          e.preventDefault();
          // Accept suggestion
          const newValue = value.endsWith(" ") ? value + suggestion : value + " " + suggestion;
          onChange(newValue);
          setSuggestion("");
        } else if (e.key === "Escape") {
          e.preventDefault();
          setSuggestion("");
        }
      }
    },
    [suggestion, value, onChange]
  );

  // Clear suggestion when value changes externally
  useEffect(() => {
    if (suggestion && !value.endsWith(value.slice(-10))) {
      setSuggestion("");
    }
  }, [value]);

  return (
    <div className="space-y-1">
      {/* Toggle */}
      <div className="flex items-center justify-end gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <Label className="text-[10px] text-muted-foreground cursor-pointer" htmlFor="autocomplete-toggle">
            {t("autocomplete.toggle")}
          </Label>
          <Switch
            id="autocomplete-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            className="scale-75"
          />
        </div>
      </div>

      {/* Textarea with suggestion overlay */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`resize-none ${className}`}
        />

        {/* Suggestion overlay */}
        {suggestion && (
          <div className="mt-1 p-2 rounded-md bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 italic">{suggestion}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Tab</kbd>
                    {t("autocomplete.accept")}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Esc</kbd>
                    {t("autocomplete.dismiss")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !suggestion && (
          <div className="mt-1 p-1.5 rounded-md bg-muted/50 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-[10px] text-muted-foreground">{t("autocomplete.loading")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
