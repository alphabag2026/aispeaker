import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, X, History, Undo2 } from "lucide-react";

export default function VersionHistoryButton({ projectId, onRestore }: { projectId: number; onRestore: () => void }) {
  const [open, setOpen] = useState(false);
  const versionsQuery = trpc.lectureBuilder.listScriptVersions.useQuery(
    { projectId },
    { enabled: open }
  );
  const restoreMut = trpc.lectureBuilder.restoreScriptVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`버전 ${data.restoredVersion}으로 복원됨 (${data.sectionCount}개 섹션)`);
      setOpen(false);
      onRestore();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <History className="w-3 h-3" />
        버전 이력
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                스크립트 버전 이력
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2">
              {versionsQuery.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !versionsQuery.data?.length ? (
                <p className="text-center text-muted-foreground py-6">저장된 버전이 없습니다</p>
              ) : (
                versionsQuery.data.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-500">v{v.versionNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.changeType === "manual" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {v.changeType === "manual" ? "수동" : "자동"}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.sectionCount}개 섹션</span>
                      </div>
                      {v.changeDescription && <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.changeDescription}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(v.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 flex-shrink-0"
                      disabled={restoreMut.isPending}
                      onClick={() => {
                        if (confirm(`버전 ${v.versionNumber}으로 복원하시겠습니까?`)) {
                          restoreMut.mutate({ projectId, versionId: v.id });
                        }
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" /> 복원
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// --- Pronunciation Guide Button & Panel for Step4 Matching Editor ---
