import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type SupportedLang = "ko" | "en" | "zh" | "ja";

export interface LangInfo {
  code: SupportedLang;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LangInfo[] = [
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
];

interface LanguageContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
  langInfo: LangInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
type TranslationDict = Record<string, string>;
type Translations = Record<SupportedLang, TranslationDict>;

const translations: Translations = {
  ko: {},
  en: {},
  zh: {},
  ja: {},
};

// Register translations from external files
export function registerTranslations(lang: SupportedLang, dict: TranslationDict) {
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
    if (stored && ["ko", "en", "zh", "ja"].includes(stored)) {
      return stored as SupportedLang;
    }
    // Detect browser language
    const browserLang = navigator.language.slice(0, 2);
    if (["ko", "en", "zh", "ja"].includes(browserLang)) {
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
    (key: string): string => {
      // Try current language first, fallback to Korean, then key itself
      return translations[lang]?.[key] || translations["ko"]?.[key] || key;
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
