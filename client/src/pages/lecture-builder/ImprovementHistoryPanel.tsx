import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, X, History, Undo2 } from "lucide-react";

export default function ImprovementHistoryPanel({ projectId, sections, setSections



}: {projectId: number;sections: any[];setSections: (s: any[]) => void;}) {const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [detailGroup, setDetailGroup] = useState<{batchId: string;style: string;count: number;createdAt: Date;sections: any[];} | null>(null);
  const historyQuery = trpc.lectureBuilder.getImprovementHistory.useQuery(
    { projectId },
    { enabled: showHistory }
  );
  const revertMut = trpc.lectureBuilder.revertImprovement.useMutation({
    onSuccess: (data) => {
      const newSections = sections.map((sec) => {
        const reverted = data.sections.find((s: any) => s.sectionId === sec.id);
        return reverted ? { ...sec, text: reverted.originalText } : sec;
      });
      setSections(newSections);
      toast.success(t("lectureBuilder.hardcoded.sectionsReverted", { count: String(data.sections.length) }));
      historyQuery.refetch();
      setDetailGroup(null);
    },
    onError: (e: any) => toast.error(t("lectureBuilder.hardcoded.revertFailed", { error: e.message }))
  });

  const groupedHistory = useMemo(() => {
    if (!historyQuery.data) return [];
    const groups = new Map<string, {batchId: string;style: string;count: number;createdAt: Date;sections: typeof historyQuery.data;}>();
    for (const item of historyQuery.data) {
      const key = item.batchId || `single-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, { batchId: key, style: item.style, count: 0, createdAt: item.createdAt, sections: [] });
      }
      const g = groups.get(key)!;
      g.count++;
      g.sections.push(item);
    }
    return Array.from(groups.values());
  }, [historyQuery.data]);

  const styleLabels: Record<string, string> = { formal: t("lectureBuilder.stringLiteral160"), casual: t("lectureBuilder.stringLiteral161"), educational: t("lectureBuilder.stringLiteral162"), storytelling: t("lectureBuilder.stringLiteral163") };

  return (
    <div className="space-y-3">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        onClick={() => setShowHistory(!showHistory)}>
        
        <History className="w-4 h-4" />
        {t("lectureBuilder.hardcoded.aiImprovementHistory")} {showHistory ? "\u25b2" : "\u25bc"}
      </button>
      {showHistory &&
      <div className="space-y-2">
          {historyQuery.isLoading && <p className="text-sm text-muted-foreground">{t("lectureBuilder.hardcoded.loading")}</p>}
          {groupedHistory.length === 0 && !historyQuery.isLoading &&
        <p className="text-sm text-muted-foreground">{t("lectureBuilder.hardcoded.noImprovementHistory")}</p>
        }
          {groupedHistory.map((group) =>
        <div
          key={group.batchId}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => setDetailGroup(group)}>
          
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{styleLabels[group.style] || group.style}</Badge>
                  <span className="text-sm font-medium">{t("lectureBuilder.hardcoded.sectionsImproved", { count: String(group.count) })}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(group.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={(e) => {e.stopPropagation();setDetailGroup(group);}}>
              
                  <Eye className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.detail")}
                </Button>
                <Button
              variant="outline"
              size="sm"
              className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
              onClick={(e) => {
                e.stopPropagation();
                if (group.batchId.startsWith("single-")) {
                  toast.error(t("lectureBuilder.stringLiteral164"));
                  return;
                }
                revertMut.mutate({ batchId: group.batchId });
              }}
              disabled={revertMut.isPending}>
              
                  <Undo2 className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.revert")}
                </Button>
              </div>
            </div>
        )}
        </div>
      }

      {/* Detail Comparison Modal */}
      {detailGroup &&
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetailGroup(null)}>
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{t("lectureBuilder.hardcoded.aiImprovementDetailComparison")}</h3>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs mr-2">{styleLabels[detailGroup.style] || detailGroup.style}</Badge>
                    {t("lectureBuilder.hardcoded.sectionsImproved", { count: String(detailGroup.count) })} \u00b7 {new Date(detailGroup.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!detailGroup.batchId.startsWith("single-") &&
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                onClick={() => revertMut.mutate({ batchId: detailGroup.batchId })}
                disabled={revertMut.isPending}>
                
                    <Undo2 className="w-3.5 h-3.5" /> {t("lectureBuilder.hardcoded.revert")}
                  </Button>
              }
                <Button variant="ghost" size="sm" onClick={() => setDetailGroup(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 space-y-4">
              {detailGroup.sections.map((item: any, idx: number) => {
              const hasChange = item.originalText !== item.improvedText;
              return (
                <div key={item.id || idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b flex items-center gap-2">
                      <span className="text-sm font-medium">{t("lectureBuilder.hardcoded.section", { idx: String(idx + 1) })}</span>
                      {hasChange ?
                    <Badge className="bg-green-500/10 text-green-500 text-xs">{t("lectureBuilder.hardcoded.improved")}</Badge> :

                    <Badge variant="outline" className="text-xs text-muted-foreground">{t("lectureBuilder.hardcoded.noChange")}</Badge>
                    }
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{t("lectureBuilder.hardcoded.original")}</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{item.originalText || t("lectureBuilder.stringLiteral165")}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">{t("lectureBuilder.hardcoded.improvementResult")}</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.improvedText || t("lectureBuilder.stringLiteral166")}</p>
                      </div>
                    </div>
                  </div>);

            })}
            </div>
          </div>
        </div>
      }
    </div>);

}

// ============ STEP 3: SLIDES ============
