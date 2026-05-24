import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Image, Plus, Upload, Loader2, X } from "lucide-react";

export default function Step3Slides({ projectId, slides, onRefresh



}: {projectId: number;slides: any[];onRefresh: () => void;}) {const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState("");
  const [extractedTexts, setExtractedTexts] = useState<{pageIndex: number;text: string;}[]>([]);
  const [applyingScripts, setApplyingScripts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteSlide = trpc.lectureBuilder.deleteSlide.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral167"));onRefresh();}
  });
  const reorderSlides = trpc.lectureBuilder.reorderSlides.useMutation({
    onSuccess: () => onRefresh()
  });
  const uploadImageSlide = trpc.lectureBuilder.uploadImageSlide.useMutation();
  const convertFileMut = trpc.lectureBuilder.convertFile.useMutation();
  const applyTextsMut = trpc.lectureBuilder.applyExtractedTextsAsScripts.useMutation();

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const isPptOrPdf = (file: File) => {
    const ext = file.name.toLowerCase();
    return ext.endsWith(".pptx") || ext.endsWith(".ppt") || ext.endsWith(".pdf");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let currentOrder = slides.length;
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(t("lectureBuilder.hardcoded.fileSizeExceeded", { name: file.name }));
          continue;
        }

        const base64 = await readFileAsBase64(file);

        if (isPptOrPdf(file)) {
          // PPT/PDF → 서버에서 이미지로 변환
          setConverting(true);
          setConversionStatus(t("lectureBuilder.hardcoded.converting", { name: file.name }));
          try {
            const result = await convertFileMut.mutateAsync({
              projectId,
              fileData: base64,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream"
            });
            // Store extracted texts for script draft creation
            if (result.extractedTexts && result.extractedTexts.length > 0) {
              setExtractedTexts(result.extractedTexts);
            }
            toast.success(t("lectureBuilder.hardcoded.slidesConverted", { name: file.name, count: String(result.count) }) + (result.extractedTexts?.length ? t("lectureBuilder.stringLiteral168") : ""));
          } catch (err: any) {
            toast.error(t("lectureBuilder.hardcoded.conversionFailed", { name: file.name, error: err.message }));
          } finally {
            setConverting(false);
            setConversionStatus("");
          }
        } else {
          // 이미지 파일 직접 업로드
          await uploadImageSlide.mutateAsync({
            projectId,
            fileData: base64,
            fileName: file.name,
            mimeType: file.type || "image/png",
            slideOrder: currentOrder++
          });
          toast.success(t("lectureBuilder.hardcoded.uploadComplete", { name: file.name }));
        }
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || t("lectureBuilder.stringLiteral169"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slides.length) return;
    const newOrder = [...slides];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    reorderSlides.mutate({ projectId, slideIds: newOrder.map((s: any) => s.id) });
  };

  const isProcessing = uploading || converting;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText170")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText171")}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept=".pptx,.ppt,.pdf,.png,.jpg,.jpeg,.webp" className="hidden"
          onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {converting ? t("lectureBuilder.stringLiteral172") : t("lectureBuilder.stringLiteral173")}
          </Button>
        </div>
      </div>

      {/* Conversion Status */}
      {converting &&
      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <div>
            <p className="text-sm font-medium">{conversionStatus}</p>
            <p className="text-xs text-muted-foreground">{t("lectureBuilder.jsxText174")}</p>
          </div>
        </div>
      }

      {/* Drop Zone */}
      {slides.length === 0 && !converting &&
      <div className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => {e.preventDefault();e.currentTarget.classList.add("border-primary");}}
      onDragLeave={(e) => {e.preventDefault();e.currentTarget.classList.remove("border-primary");}}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("border-primary");
        if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
          const dt = new DataTransfer();
          for (const f of Array.from(e.dataTransfer.files)) dt.items.add(f);
          fileInputRef.current.files = dt.files;
          fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }}>
        
          <Image className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t("lectureBuilder.jsxText175")}</h3>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText176")}</p>
          <p className="text-xs text-muted-foreground mt-2">{t("lectureBuilder.jsxText177")}</p>
        </div>
      }

      {/* Extracted Text → Script Draft Banner */}
      {extractedTexts.length > 0 && slides.length > 0 &&
      <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />{t("lectureBuilder.jsxText178")}
                {extractedTexts.filter((t) => t.text && !t.text.startsWith("[Page")).length}{t("lectureBuilder.jsxText179")}
              </CardTitle>
                <CardDescription className="text-xs">{t("lectureBuilder.jsxText180")}

              </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 border-green-500/30 hover:bg-green-500/10"
                disabled={applyingScripts}
                onClick={async () => {
                  setApplyingScripts(true);
                  try {
                    const pairs = extractedTexts.
                    filter((t) => t.text && !t.text.startsWith("[Page")).
                    map((t, idx) => ({
                      slideId: slides[t.pageIndex]?.id || slides[idx]?.id,
                      text: t.text
                    })).
                    filter((p) => p.slideId);
                    const result = await applyTextsMut.mutateAsync({
                      projectId,
                      slideTextPairs: pairs
                    });
                    toast.success(t("lectureBuilder.hardcoded.scriptDraftsCreated", { count: String(result.created) }));
                    setExtractedTexts([]);
                    onRefresh();
                  } catch (err: any) {
                    toast.error(err.message || t("lectureBuilder.stringLiteral181"));
                  } finally {
                    setApplyingScripts(false);
                  }
                }}>
                
                  {applyingScripts ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}{t("lectureBuilder.jsxText182")}

              </Button>
                <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setExtractedTexts([])}>
                
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
               {extractedTexts.slice(0, 10).map((txt, i) =>
              <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="shrink-0 text-[10px]">{txt.pageIndex + 1}</Badge>
                    <span className="text-muted-foreground line-clamp-2">{txt.text || t("lectureBuilder.stringLiteral183")}</span>
                  </div>
              )}
                {extractedTexts.length > 10 &&
              <p className="text-[10px] text-muted-foreground">{t("lectureBuilder.jsxText184")}{extractedTexts.length - 10}{t("lectureBuilder.jsxText185")}</p>
              }
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      }

      {/* Slide Grid */}
      {slides.length > 0 &&
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {slides.map((slide: any, idx: number) =>
        <div key={slide.id} className="group relative">
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                <img src={slide.imageUrl} alt={t("lectureBuilder.hardcoded.slideAlt", { idx: String(idx + 1) })} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-1 left-1">
                <Badge className="text-xs bg-black/60 text-white">{idx + 1}</Badge>
              </div>
              {slide.originalFileName &&
          <div className="absolute bottom-1 left-1">
                  <Badge variant="outline" className="text-[9px] bg-black/40 text-white border-white/20 max-w-[100px] truncate">
                    {slide.originalFileName}
                  </Badge>
                </div>
          }
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 &&
            <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
            onClick={() => moveSlide(idx, idx - 1)}>&#8592;</button>
            }
                {idx < slides.length - 1 &&
            <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
            onClick={() => moveSlide(idx, idx + 1)}>&#8594;</button>
            }
                <button className="w-6 h-6 rounded bg-red-500/80 text-white flex items-center justify-center"
            onClick={() => deleteSlide.mutate({ id: slide.id })}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
        )}
          {/* Add more button */}
          <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      }
    </div>);

}

// ============ STEP 4: MATCHING EDITOR ============
