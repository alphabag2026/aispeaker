import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight } from "lucide-react";

export default function PronunciationHighlight({ text, projectId }: { text: string; projectId: number }) {
  const { t } = useLanguage();
  const guidesQuery = trpc.lectureBuilder.getPronunciationGuides.useQuery({ projectId });
  
  if (!text || !guidesQuery.data?.length) return null;

  const guides = guidesQuery.data;
  const matchedWords: { word: string; phonetic: string }[] = [];
  
  for (const guide of guides) {
    const regex = new RegExp(guide.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) {
      matchedWords.push({ word: guide.word, phonetic: guide.phonetic });
    }
  }

  if (matchedWords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <span className="text-[10px] text-muted-foreground/60 mr-1">{t("lectureBuilder.pronunciation.applied")}:</span>
      {matchedWords.map((m, i) => (
        <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-[10px]">
          <span className="font-medium text-purple-700 dark:text-purple-300">{m.word}</span>
          <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
          <span className="text-purple-500 dark:text-purple-400">{m.phonetic}</span>
        </span>
      ))}
    </div>
  );
}
