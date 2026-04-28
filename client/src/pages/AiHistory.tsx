
import { useLanguage } from "@/contexts/LanguageContext";
import { useAiHistory } from "@/hooks/useAiHistory";
import { TOOL_LABELS } from "@/lib/ai-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Download, Filter, Sparkles, Wand2, Zap } from "lucide-react";
import { Link } from "wouter";

export default function AiHistoryPage() {
  const { t } = useLanguage();
  const { 
    history, 
    total, 
    page, 
    limit, 
    totalPages, 
    toolFilter, 
    setToolFilter, 
    setPage 
  } = useAiHistory();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">{t("aiHistory.title")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="h-3 w-3 mr-1" /> {t("aiHistory.totalCount")} {total}
            </Badge>
            <Link href="/ai-studio">
              <Button size="sm"><Wand2 className="h-3.5 w-3.5 mr-1" /> {t("aiHistory.aiStudio")}</Button>
            </Link>
          </div>
        </div>
        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={toolFilter ?? undefined} onValueChange={(v) => { setToolFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("aiHistory.selectTool")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("aiHistory.allTools")}</SelectItem>
                  {Object.entries(TOOL_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">
                {history.length > 0 ? `${page * limit + 1}-${Math.min((page + 1) * limit, total)} / ${total}` : t("aiHistory.noResults")}
              </span>
            </div>
          </CardContent>
        </Card>
        {/* History List */}
        {history.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("aiHistory.noHistory")}</p>
              <Link href="/ai-studio">
                <Button className="mt-4">{t("aiHistory.startInAiStudio")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((item: any) => {
              const toolInfo = TOOL_LABELS[item.tool] || { label: item.tool, icon: Sparkles, color: "bg-gray-500/10 text-gray-500" };
              const Icon = toolInfo.icon;
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${toolInfo.color}`}>
                        <Icon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{toolInfo?.label}</span>
                          <Badge variant={item.status === "completed" ? "default" : "destructive"} className="text-xs">
                            {item.status === "completed" ? t("aiHistory.completed") : t("aiHistory.failed")}
                          </Badge>
                          {item.creditsUsed > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-2.5 w-2.5 mr-0.5" /> {item.creditsUsed}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.inputSummary || t("aiHistory.noInput")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(item.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.outputUrl && (
                          <a href={item.outputUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="h-3.5 w-3.5 mr-1" /> {t("aiHistory.download")}
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p: number) => p - 1)}>
              {t("aiHistory.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p: number) => p + 1)}>
              {t("aiHistory.next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
