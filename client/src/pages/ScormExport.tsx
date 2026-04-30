import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Package, Download, FileText, Clock, CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ScormExport() {
  const { t } = useLanguage();
  const { user } = useAuth();
  // Using sonner toast
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [scormVersion, setScormVersion] = useState<"1.2" | "2004">("2004");
  const [completionCriteria, setCompletionCriteria] = useState<"slide_view" | "quiz_pass" | "time_spent">("slide_view");
  const [minTimeSec, setMinTimeSec] = useState(0);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeThumbnail, setIncludeThumbnail] = useState(true);
  const [language, setLanguage] = useState("ko");

  const packagesQuery = trpc.scorm.list.useQuery(undefined, { enabled: !!user });
  const pipelinesQuery = trpc.pipeline.list.useQuery(undefined, { enabled: !!user });
  const generateMutation = trpc.scorm.generate.useMutation({
    onSuccess: () => {
      toast.success(t("scormExport.generationStart"));
      setIsDialogOpen(false);
      packagesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });
  const downloadMutation = trpc.scorm.download.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success(t("scormExport.downloadStart"));
      packagesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Download failed: ${err.message}`);
    },
  });

  const completedPipelines = (pipelinesQuery.data || []).filter((p: any) => {
    const status = p.pipeline?.status || p.status;
    return status === "completed";
  });

  const handleGenerate = () => {
    if (!selectedPipelineId || !title.trim()) {
      toast.error(t("scormExport.errorPipelineAndTitle"));
      return;
    }
    generateMutation.mutate({
      pipelineId: selectedPipelineId,
      title: title.trim(),
      scormVersion,
      completionCriteria,
      minTimeSec,
      includeSubtitles,
      includeThumbnail,
      language,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />{t("scormExport.statusReady")}</Badge>;
      case "generating": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("scormExport.statusGenerating")}</Badge>;
      case "failed": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />{t("scormExport.statusFailed")}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="container max-w-6xl py-4 sm:py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link href="/pipeline-dashboard">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-7 h-7 text-purple-400" />
                {t("scormExport.headerTitle")}
              </h1>
              <p className="text-gray-400 mt-1">{t("scormExport.headerDescription")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => packagesQuery.refetch()} className="border-gray-700 text-gray-300 hover:text-white">
              <RefreshCw className="w-4 h-4 mr-1" /><span className="hidden sm:inline">{t("scormExport.buttonRefresh")}</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Package className="w-4 h-4 mr-2" />{t("scormExport.buttonNewPackage")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white max-w-[95vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-purple-400" />
                    {t("scormExport.dialogTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {t("scormExport.dialogDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("scormExport.labelPipeline")}</Label>
                    <Select onValueChange={(v) => {
                      setSelectedPipelineId(Number(v));
                      const pl = completedPipelines.find((p: any) => String(p.pipeline?.id || p.id) === v);
                      if (pl) setTitle((pl as any).pipeline?.title || (pl as any).title || "");
                    }}>
                      <SelectTrigger className="bg-[#16213e] border-gray-600">
                        <SelectValue placeholder={t("scormExport.placeholderPipeline")} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-gray-700">
                        {completedPipelines.map((p: any) => {
                          const pid = p.pipeline?.id || p.id;
                          const ptitle = p.pipeline?.title || p.title;
                          return (
                            <SelectItem key={pid} value={String(pid)}>
                              {ptitle}
                            </SelectItem>
                          );
                        })}
                        {completedPipelines.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">{t("scormExport.noCompletedPipelines")}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("scormExport.labelPackageTitle")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("scormExport.placeholderPackageTitle")} className="bg-[#16213e] border-gray-600" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("scormExport.labelScormVersion")}</Label>
                      <Select value={scormVersion} onValueChange={(v) => setScormVersion(v as "1.2" | "2004")}>
                        <SelectTrigger className="bg-[#16213e] border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-gray-700">
                          <SelectItem value="2004">{t("scormExport.optionScorm2004")}</SelectItem>
                          <SelectItem value="1.2">{t("scormExport.optionScorm12")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("scormExport.completionCriteriaLabel")}</Label>
                      <Select value={completionCriteria} onValueChange={(v) => setCompletionCriteria(v as any)}>
                        <SelectTrigger className="bg-[#16213e] border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-gray-700">
                          <SelectItem value="slide_view">{t("scormExport.optionSlideView")}</SelectItem>
                          <SelectItem value="quiz_pass">{t("scormExport.optionQuizPass")}</SelectItem>
                          <SelectItem value="time_spent">{t("scormExport.optionMinTime")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {completionCriteria === "time_spent" && (
                    <div className="space-y-2">
                      <Label>{t("scormExport.labelMinTime")}</Label>
                      <Input type="number" value={minTimeSec} onChange={(e) => setMinTimeSec(Number(e.target.value))} className="bg-[#16213e] border-gray-600" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>{t("scormExport.labelIncludeSubtitles")}</Label>
                    <Switch checked={includeSubtitles} onCheckedChange={setIncludeSubtitles} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t("scormExport.labelIncludeThumbnail")}</Label>
                    <Switch checked={includeThumbnail} onCheckedChange={setIncludeThumbnail} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-600">{t("scormExport.buttonCancel")}</Button>
                  <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                    {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                    {t("scormExport.buttonGenerate")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/20 mb-6 sm:mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("scormExport.infoBannerTitle")}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("scormExport.hardcoded1")} 
                  {t("scormExport.hardcoded2")} 
                  {t("scormExport.hardcoded3")} 
                  {t("scormExport.hardcoded4")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package List */}
        {packagesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (packagesQuery.data?.length || 0) === 0 ? (
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Package className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">{t("scormExport.hardcoded1")}</h3>
              <p className="text-gray-500 text-sm mb-4">{t("scormExport.hardcoded5")}</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Package className="w-4 h-4 mr-2" />{t("scormExport.buttonFirstPackage")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {packagesQuery.data?.map((pkg: any) => (
              <Card key={pkg.id} className="bg-[#1a1a2e] border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-3 bg-purple-500/10 rounded-lg shrink-0">
                        <Package className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{pkg.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                          <span>SCORM {pkg.scormVersion}</span>
                          <span>·</span>
                          <span>{pkg.language === "ko" ? t("scormExport.langKorean") : pkg.language}</span>
                          {pkg.fileSizeBytes > 0 && (
                            <>
                              <span>·</span>
                              <span>{formatFileSize(pkg.fileSizeBytes)}</span>
                            </>
                          )}
                          {pkg.downloadCount > 0 && (
                            <>
                              <span>·</span>
                              <span>{t("scormExport.buttonDownload")} {pkg.downloadCount}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(pkg.createdAt).toLocaleDateString("ko-KR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      {getStatusBadge(pkg.status)}
                      {pkg.status === "ready" && (
                        <Button
                          size="sm"
                          onClick={() => downloadMutation.mutate({ id: pkg.id })}
                          disabled={downloadMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-1" />{t("scormExport.buttonDownload")}
                        </Button>
                      )}
                      {pkg.status === "failed" && (
                        <span className="text-xs text-red-400 max-w-[150px] sm:max-w-[200px] truncate">{pkg.errorMessage}</span>
                      )}
                    </div>
                  </div>
                  {/* Completion criteria info */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("scormExport.completionCriteriaLabel")}: {pkg.completionCriteria === "slide_view" ? t("scormExport.optionSlideView") : pkg.completionCriteria === "quiz_pass" ? t("scormExport.optionQuizPass") : `${pkg.minTimeSec}s min`}
                    </span>
                    {pkg.includeSubtitles && <span>{t("{i18n_key}")}</span>}
                    {pkg.includeThumbnail && <span>{t("scormExport.labelIncludeThumbnail")}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
