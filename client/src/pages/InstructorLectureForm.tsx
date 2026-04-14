import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  Save,
  Loader2,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Link } from "wouter";

import { useTranslation } from "@/contexts/LanguageContext";
export default function InstructorLectureForm() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id;
  const lectureId = params.id ? Number(params.id) : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("web3");
  const [aiMode, setAiMode] = useState("voice");
  const [aiContext, setAiContext] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: lecture } = trpc.lecture.getById.useQuery(
    { id: lectureId! },
    { enabled: !!lectureId }
  );

  const { data: voiceProfiles } = trpc.voiceProfile.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery({ category });
  const { data: materials, refetch: refetchMaterials } = trpc.material.list.useQuery(
    { lectureId: lectureId! },
    { enabled: !!lectureId }
  );

  const createMutation = trpc.lecture.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("ilf.lecture_created"));
      navigate(`/instructor/lectures/${data.id}/edit`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.lecture.update.useMutation({
    onSuccess: () => toast.success(t("ilf.lecture_updated")),
    onError: (err) => toast.error(err.message),
  });

  const uploadMutation = trpc.material.upload.useMutation({
    onSuccess: () => {
      toast.success(t("ilf.material_uploaded"));
      refetchMaterials();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMaterialMutation = trpc.material.delete.useMutation({
    onSuccess: () => {
      toast.success(t("ilf.material_deleted"));
      refetchMaterials();
    },
  });

  useEffect(() => {
    if (lecture) {
      setTitle(lecture.title);
      setDescription(lecture.description || "");
      setCategory(lecture.category);
      setAiMode(lecture.aiMode);
      setAiContext(lecture.aiContext || "");
      setVoiceProfileId(lecture.voiceProfileId?.toString() || "");
    }
  }, [lecture]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t("ilf.enter_title"));
      return;
    }
    const data = {
      title,
      description: description || undefined,
      category: category as any,
      aiMode: aiMode as any,
      aiContext: aiContext || undefined,
      voiceProfileId: voiceProfileId ? Number(voiceProfileId) : undefined,
    };
    if (isEdit && lectureId) {
      updateMutation.mutate({ id: lectureId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lectureId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      let fileType: "pdf" | "ppt" | "image" | "video" | "other" = "other";
      if (file.type.includes("pdf")) fileType = "pdf";
      else if (file.type.includes("powerpoint") || file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) fileType = "ppt";
      else if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";

      uploadMutation.mutate({
        lectureId,
        title: file.name,
        fileData: base64,
        fileName: file.name,
        fileType,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-40 md:h-48 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-lectures-XYLqtqjCfGhVTCVFxwCdFR.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor/lectures">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{isEdit ? t("ilf.edit_lecture") : t("ilf.new_lecture")}</h1>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-3xl">

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">{t("ilf.basic_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("ilf.lecture_title")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("ilf.title_placeholder")}
                />
              </div>
              <div>
                <Label>{t("ilf.description")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("ilf.enter_description")}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("ilf.category")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web3">Web3</SelectItem>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="blockchain">Blockchain</SelectItem>
                      <SelectItem value="defi">DeFi</SelectItem>
                      <SelectItem value="nft">NFT</SelectItem>
                      <SelectItem value="metaverse">Metaverse</SelectItem>
                      <SelectItem value="general">{t("ilf.general")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("ilf.ai_expression_method")}</Label>
                  <Select value={aiMode} onValueChange={setAiMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice">{t("ilf.voice")}</SelectItem>
                      <SelectItem value="text">{t("ilf.text")}</SelectItem>
                      <SelectItem value="avatar">{t("ilf.avatar")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Profile */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">{t("ilf.voice_profile")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>{t("ilf.voice_profile_to_use")}</Label>
                <Select value={voiceProfileId} onValueChange={setVoiceProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ilf.default_ai_voice")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("ilf.default_ai_voice_option")}</SelectItem>
                    {voiceProfiles?.map((vp) => (
                      <SelectItem key={vp.id} value={vp.id.toString()}>
                        {vp.name} ({vp.ttsVoiceId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("ilf.no_voice_profile_pre")}{" "}
                  <Link href="/instructor/voice-profiles" className="text-primary underline">
                    {t("ilf.create_here")}
                  </Link>
                  {t("ilf.no_voice_profile_post")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Context */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                {t("ilf.ai_context")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              {templates && templates.length > 0 && (
                <div>
                  <Label>{t("ilf.load_from_template")}</Label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const tpl = templates.find((t: any) => t.id.toString() === val);
                      if (tpl) {
                        setAiContext((prev) => prev ? prev + "\n\n" + tpl.systemPrompt : tpl.systemPrompt);
                        toast.success(`"${tpl.name}" ${t("ilf.template_applied")}`);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("ilf.select_template")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl: any) => (
                        <SelectItem key={tpl.id} value={tpl.id.toString()}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("ilf.template_description")}
                    <Link href="/instructor/templates" className="text-primary underline ml-1">
                      {t("ilf.manage_templates")}
                    </Link>
                  </p>
                </div>
              )}
              <div>
                <Label>{t("ilf.ai_instructor_additional_knowledge")}</Label>
                <Textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder={t("ilf.ai_context_placeholder")}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("ilf.ai_context_description")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Materials (only in edit mode) */}
          {isEdit && lectureId && (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {t("ilf.lecture_materials")}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t("ilf.upload")}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.mp4"
                    onChange={handleFileUpload}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {materials && materials.length > 0 ? (
                  <div className="space-y-2">
                    {materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          {mat.fileType === "image" ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{mat.title}</span>
                          <span className="text-xs text-muted-foreground">{mat.fileType}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMaterialMutation.mutate({ id: mat.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("ilf.no_materials_uploaded")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/instructor/lectures">
              <Button variant="outline">{t("ilf.cancel")}</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? t("ilf.edit") : t("ilf.create")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
