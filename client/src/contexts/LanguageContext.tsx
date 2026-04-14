import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type SupportedLang = "ko" | "en" | "zh" | "ja" | "vi" | "th" | "es" | "fr" | "de" | "pt" | "ru" | "ar" | "hi" | "id" | "ms" | "tr" | "it" | "pl" | "nl" | "sv";

export interface LangInfo {
  code: SupportedLang;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LangInfo[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ภาษาไทย", flag: "🇹🇭" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪" },
];

const ALL_LANG_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

interface LanguageContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  langInfo: LangInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
type TranslationDict = Record<string, string>;
type Translations = Record<string, TranslationDict>;

const translations: Translations = {};
ALL_LANG_CODES.forEach(code => { translations[code] = {}; });

// Register translations from external files
export function registerTranslations(lang: string, dict: TranslationDict) {
  if (!translations[lang]) translations[lang] = {};
  translations[lang] = { ...translations[lang], ...dict };
}

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLang?: SupportedLang;
}

export function LanguageProvider({
  children,
  defaultLang = "ko",
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    const stored = localStorage.getItem("preferredLang");
    if (stored && ALL_LANG_CODES.includes(stored as SupportedLang)) {
      return stored as SupportedLang;
    }
    // Detect browser language
    const browserLang = navigator.language.slice(0, 2);
    if (ALL_LANG_CODES.includes(browserLang as SupportedLang)) {
      return browserLang as SupportedLang;
    }
    return defaultLang;
  });

  const setLang = useCallback((newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem("preferredLang", newLang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Try current language first, fallback to English, then Korean, then key itself
      let text = translations[lang]?.[key] || translations["en"]?.[key] || translations["ko"]?.[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [lang]
  );

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, langInfo }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

// Alias for convenience - both useLanguage and useTranslation return the same context
export const useTranslation = useLanguage;
