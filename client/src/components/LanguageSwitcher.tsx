import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, langInfo } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-1.5 ${className}`}>
          <Globe className="w-4 h-4" />
          <span className="text-sm">{langInfo.flag} {langInfo.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`gap-2 cursor-pointer ${lang === l.code ? "bg-accent" : ""}`}
          >
            <span className="text-base">{l.flag}</span>
            <span className="flex-1">{l.nativeName}</span>
            {lang === l.code && (
              <span className="text-xs text-primary font-medium">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
