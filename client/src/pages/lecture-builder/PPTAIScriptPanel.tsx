import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image, Loader2, Check, Sparkles, Save, Presentation, CreditCard, Coins } from "lucide-react";

export default function PPTAIScriptPanel({ projectId, slides, sections, setSections, language, setLanguage, onRefresh, onGenerated }: {
  projectId: number;
  slides: any[];
  sections: any[];
  setSections: (s: any[]) => void;
  language: string;
  setLanguage: (l: string) => void;
  onRefresh: () => void;
  onGenerated?: () => void;
}) {
  const { t } = useLanguage();
  const [style, setStyle] = useState<"professional" | "casual" | "academic" | "storytelling">("professional");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [generatedScripts, setGeneratedScripts] = useState<Array<{slideId: number; text: string; estimatedDurationSec: number}>>([]);

  const creditsQuery = trpc.lectureBuilder.getPPTScriptCredits.useQuery();
  const applyMut = trpc.lectureBuilder.applyPPTScripts.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.applied}개 슬라이드 스크립트가 저장되었습니다.`);
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const generateMut = trpc.lectureBuilder.generateScriptFromPPT.useMutation({
    onSuccess: (data) => {
      const newSections = data.scripts.map((s: any, i: number) => ({
        id: `ppt-ai-${Date.now()}-${i}`,
        section: i + 1,
        text: s.text,
      }));
      setSections(newSections);
      setGeneratedScripts(data.scripts);
      onGenerated?.();
      toast.success(`AI 스크립트 생성 완료! ${data.scripts.length}개 슬라이드, ${data.creditsUsed} 크레딧 사용`);
      setGenerating(false);
      creditsQuery.refetch();
    },
    onError: (e) => {
      if (e.message.startsWith("INSUFFICIENT_CREDITS:")) {
        const [, cost, current] = e.message.split(":");
        toast.error(`크레딧 부족! 필요: ${cost}, 보유: ${current}. 크레딧을 충전해주세요.`);
      } else {
        toast.error(`스크립트 생성 실패: ${e.message}`);
      }
      setGenerating(false);
    },
  });

  // Auto-select all slides
  useEffect(() => {
    if (slides.length > 0 && selectedSlideIds.size === 0) {
      setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
    }
  }, [slides]);

  const toggleSlide = (id: number) => {
    setSelectedSlideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    if (selectedSlideIds.size === 0) {
      toast.error("슬라이드를 선택해주세요.");
      return;
    }
    if (!creditsQuery.data?.canGenerate) {
      toast.error("크레딧이 부족합니다. 크레딧을 충전해주세요.");
      return;
    }
    setGenerating(true);
    generateMut.mutate({
      projectId,
      slideIds: Array.from(selectedSlideIds),
      language,
      style,
      additionalContext: additionalContext.trim() || undefined,
    });
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg">PPT AI 스크립트 생성</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <Coins className="w-3 h-3 mr-1" />Premium
            </Badge>
          </div>
          {creditsQuery.data && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">잔여:</span>
              <span className={`font-bold ${creditsQuery.data.canGenerate ? 'text-green-600' : 'text-red-500'}`}>
                {creditsQuery.data.creditsRemaining} 크레딧
              </span>
              <span className="text-muted-foreground">(1회 {creditsQuery.data.costPerGeneration} 크레딧)</span>
            </div>
          )}
        </div>
        <CardDescription>업로드된 PPT 슬라이드 이미지를 AI가 분석하여 각 슬라이드에 맞는 강의 스크립트를 자동으로 생성합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {slides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">슬라이드가 없습니다</p>
            <p className="text-sm">Step 3에서 PPT/PDF 파일을 먼저 업로드해주세요.</p>
          </div>
        ) : (
          <>
            {/* Slide Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">분석할 슬라이드 선택</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSlideIds(new Set(slides.map((s: any) => s.id)))}>
                    전체 선택
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSlideIds(new Set())}>
                    전체 해제
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-background">
                {slides.map((slide: any, idx: number) => (
                  <button
                    key={slide.id}
                    onClick={() => toggleSlide(slide.id)}
                    className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all ${
                      selectedSlideIds.has(slide.id) ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img src={slide.imageUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded">
                      {idx + 1}
                    </div>
                    {selectedSlideIds.has(slide.id) && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedSlideIds.size}/{slides.length}개 슬라이드 선택됨</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">언어</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="th">ภาษาไทย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">스타일</Label>
                <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">전문적 (Professional)</SelectItem>
                    <SelectItem value="casual">캐주얼 (Casual)</SelectItem>
                    <SelectItem value="academic">학술적 (Academic)</SelectItem>
                    <SelectItem value="storytelling">스토리텔링 (Storytelling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <Label className="text-sm">추가 컨텍스트 (선택사항)</Label>
              <Textarea
                placeholder="강의 주제, 대상 청중, 특별 요구사항 등을 입력하세요..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              size="lg"
              disabled={generating || selectedSlideIds.size === 0 || !creditsQuery.data?.canGenerate}
              onClick={handleGenerate}
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />AI 분석 중... (약 30초 소요)</>
              ) : (
                <><Sparkles className="w-4 h-4" />PPT 분석 후 스크립트 생성 ({creditsQuery.data?.costPerGeneration || 10} 크레딧)</>
              )}
            </Button>

            {!creditsQuery.data?.canGenerate && creditsQuery.data && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">
                  크레딧이 부족합니다.
                </p>
                <Button variant="outline" size="sm" onClick={() => window.open('/credits', '_blank')} className="gap-1">
                  <CreditCard className="w-3 h-3" />크레딧 충전하기
                </Button>
              </div>
            )}

            {/* Apply Generated Scripts */}
            {generatedScripts.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{generatedScripts.length}개 스크립트 생성 완료</span>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => applyMut.mutate({ projectId, scripts: generatedScripts })}
                    disabled={applyMut.isPending}
                  >
                    {applyMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    전체 적용 (슬라이드 스크립트에 저장)
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {generatedScripts.map((s, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                      <span className="font-medium text-amber-600">슬라이드 {i + 1}:</span> {s.text.slice(0, 80)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Slide Voice Mode Panel ============
