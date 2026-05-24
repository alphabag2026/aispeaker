import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Image, Plus, Upload, Wand2, Loader2, Check, Pencil, Volume2, Play, Settings2, Video, Download, X, Sparkles, Camera, UserCircle2, ImagePlus, Star, ArrowUpDown, Mic } from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import KlingAvatarCreator from "@/components/KlingAvatarCreator";
import { LectureFormatSelector } from "@/components/LectureFormatSelector";
import AvatarSettingsDialog from "@/components/AvatarSettingsDialog";
import AvatarCustomizePanel from "@/components/AvatarCustomizePanel";
import AvatarPresetPackages from "@/components/AvatarPresetPackages";
import { getAVATAR_ROLES } from "./types";

export default function Step1Avatars({ projectId, avatars, faces, voices, onRefresh, project, slides, scripts
}: {projectId: number;avatars: any[];faces: any[];voices: any[];onRefresh: () => void; project?: any; slides?: any[]; scripts?: any[];}) {const { t } = useLanguage();
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [showFormatWarning, setShowFormatWarning] = useState(false);
  const [pendingFormatChange, setPendingFormatChange] = useState<{personnelId: number|null; styleId: number|null; insertIds: number[]} | null>(null);
  const hasExistingContent = (slides && slides.length > 0) || (scripts && scripts.length > 0);
  const updateProjectFormat = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => { toast.success(t("lectureBuilder.formatChangeSuccess")); onRefresh(); setShowFormatDialog(false); setShowFormatWarning(false); setPendingFormatChange(null); },
    onError: (e) => toast.error(e.message)
  });
  const AVATAR_ROLES = getAVATAR_ROLES(t);
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [avatarRole, setAvatarRole] = useState<string>("instructor");
  const [avatarVoice, setAvatarVoice] = useState("Kore");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addTab, setAddTab] = useState<"preset" | "my" | "upload" | "ai" | "did">("preset");
  const [didText, setDidText] = useState("");
  const [didTalkId, setDidTalkId] = useState<string | null>(null);
  const [didVideoUrl, setDidVideoUrl] = useState<string | null>(null);
  const [didGenerating, setDidGenerating] = useState(false);
  const [didVoiceId, setDidVoiceId] = useState("en-US-JennyNeural");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSortBy, setAvatarSortBy] = useState<"favorite" | "recent" | "name" | "created">("favorite");
  const myAvatarsQuery = trpc.userAvatar.list.useQuery({ sortBy: avatarSortBy }, { enabled: showAddDialog });
  const toggleFavorite = trpc.userAvatar.toggleFavorite.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); },
    onError: (e) => toast.error(e.message)
  });
  const recordUsage = trpc.userAvatar.recordUsage.useMutation();
  const createUserAvatar = trpc.userAvatar.create.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.uploaded")); },
    onError: (e) => toast.error(e.message)
  });
  const deleteUserAvatar = trpc.userAvatar.delete.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.deleted")); }
  });
  const generateFace = trpc.userAvatar.generateFace.useMutation({
    onSuccess: (data) => {
      myAvatarsQuery.refetch();
      setAiPreview(data.imageUrl);
      setSelectedMyAvatarUrl(data.imageUrl);
      setSelectedFaceId(null);
      setAiGenerating(false);
      toast.success(t("lectureBuilder.avatar.aiGenerated"));
    },
    onError: (e) => { setAiGenerating(false); toast.error(e.message); }
  });
  const updateUserAvatar = trpc.userAvatar.update.useMutation({
    onSuccess: () => { myAvatarsQuery.refetch(); toast.success(t("lectureBuilder.avatar.updated")); },
    onError: (e) => toast.error(e.message)
  });
  const [selectedMyAvatarUrl, setSelectedMyAvatarUrl] = useState<string | null>(null);
  const createDidPreview = trpc.userAvatar.createDidPreview.useMutation();
  const [showKlingDialog, setShowKlingDialog] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any | null>(null);
  const [customizingAvatar, setCustomizingAvatar] = useState<any | null>(null);
  const [editingUserAvatar, setEditingUserAvatar] = useState<any | null>(null);
  const [editUserAvatarName, setEditUserAvatarName] = useState("");
  const [editUserAvatarDesc, setEditUserAvatarDesc] = useState("");

  // Fetch user's personal voice clones
  const voiceClonesQuery = trpc.voiceClone.list.useQuery(undefined, { enabled: showAddDialog });
  const myVoiceClones = voiceClonesQuery.data?.filter((c: any) => c.status === "ready") || [];

  const addAvatar = trpc.lectureBuilder.addAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("lectureBuilder.stringLiteral49"));
      setShowAddDialog(false);
      setSelectedFaceId(null);
      setAvatarName("");
      onRefresh();
    },
    onError: (e) => toast.error(e.message)
  });

  const deleteAvatar = trpc.lectureBuilder.deleteAvatar.useMutation({
    onSuccess: () => {toast.success(t("lectureBuilder.stringLiteral50"));onRefresh();}
  });

  const selectedFace = faces.find((f) => f.id === selectedFaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("lectureBuilder.jsxText51")}</h2>
          <p className="text-muted-foreground">{t("lectureBuilder.jsxText52")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Format Change Button */}
          <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                <Settings2 className="w-4 h-4" />{t("lectureBuilder.changeFormat")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-amber-500" />{t("lectureBuilder.changeFormatTitle")}</DialogTitle></DialogHeader>
              {project?.formatSelection && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">{t("lectureBuilder.currentFormatInfo")}</p>
                </div>
              )}
              <LectureFormatSelector
                initialSelection={project?.formatSelection ? {
                  personnelId: project.formatSelection.personnelId ?? null,
                  styleId: project.formatSelection.styleId ?? null,
                  insertIds: project.formatSelection.insertIds ?? []
                } : undefined}
                onApply={(formats, templates) => {
                  const newFormat = {
                    personnelId: formats.personnel,
                    styleId: formats.style,
                    insertIds: formats.inserts
                  };
                  if (hasExistingContent) {
                    setPendingFormatChange(newFormat);
                    setShowFormatWarning(true);
                  } else {
                    updateProjectFormat.mutate({ id: projectId, formatSelection: newFormat });
                  }
                }} />
            </DialogContent>
          </Dialog>
          {/* Format change warning dialog */}
          <Dialog open={showFormatWarning} onOpenChange={setShowFormatWarning}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-500">
                  <Settings2 className="w-5 h-5" />{t("lectureBuilder.formatWarningTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("lectureBuilder.formatWarningDesc")}</p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-600">{t("lectureBuilder.formatWarningImpact")}</p>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                    {slides && slides.length > 0 && <li>• {t("lectureBuilder.formatWarningSlides", { count: String(slides.length) })}</li>}
                    {scripts && scripts.length > 0 && <li>• {t("lectureBuilder.formatWarningScripts", { count: String(scripts.length) })}</li>}
                  </ul>
                </div>
                {scripts && scripts.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-400">{t("lectureBuilder.formatMigrateOption")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("lectureBuilder.formatMigrateDesc")}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowFormatWarning(false); setPendingFormatChange(null); }}>
                    {t("lectureBuilder.formatWarningCancel")}
                  </Button>
                  {scripts && scripts.length > 0 && (
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={updateProjectFormat.isPending} onClick={() => {
                      if (pendingFormatChange) {
                        updateProjectFormat.mutate({ id: projectId, formatSelection: pendingFormatChange, migrateScripts: true });
                      }
                    }}>
                      {updateProjectFormat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {t("lectureBuilder.formatMigrateBtn")}
                    </Button>
                  )}
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={updateProjectFormat.isPending} onClick={() => {
                    if (pendingFormatChange) {
                      updateProjectFormat.mutate({ id: projectId, formatSelection: pendingFormatChange });
                    }
                  }}>
                    {updateProjectFormat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {t("lectureBuilder.formatWarningConfirm")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showKlingDialog} onOpenChange={setShowKlingDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" />{t("lectureBuilder.jsxText53")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{t("lectureBuilder.jsxText54")}</DialogTitle></DialogHeader>
              <KlingAvatarCreator
                onVideoCreated={(videoUrl) => {
                  toast.success(t("lectureBuilder.stringLiteral55"));
                }} />
              
            </DialogContent>
          </Dialog>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button disabled={avatars.length >= 3} className="gap-2"><Plus className="w-4 h-4" />{t("lectureBuilder.jsxText56")}</Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("lectureBuilder.jsxText57")}</DialogTitle></DialogHeader>
            <Tabs value={addTab} onValueChange={(v) => { setAddTab(v as any); setSelectedFaceId(null); setSelectedMyAvatarUrl(null); setUploadPreview(null); setUploadFile(null); setAiPreview(null); setAiPrompt(""); }} className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="preset" className="gap-1.5"><Users className="w-4 h-4" />{t("lectureBuilder.avatarTab.preset")}</TabsTrigger>
                <TabsTrigger value="my" className="gap-1.5"><UserCircle2 className="w-4 h-4" />{t("lectureBuilder.avatarTab.myAvatars")}</TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5"><Camera className="w-4 h-4" />{t("lectureBuilder.avatarTab.upload")}</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="w-4 h-4" />{t("lectureBuilder.avatarTab.aiGenerate")}</TabsTrigger>
                <TabsTrigger value="did" className="gap-1.5"><Video className="w-4 h-4" />{t("lectureBuilder.avatarTab.didPreview")}</TabsTrigger>
              </TabsList>

              {/* Tab 1: Preset Faces */}
              <TabsContent value="preset" className="space-y-4 pt-2">
                {/* Preset Packages */}
                <AvatarPresetPackages onApply={(preset) => {
                  setAvatarName(preset.name);
                  setAvatarRole(preset.role);
                  setAvatarVoice(preset.voiceId);
                }} />
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground font-medium">{t("lectureBuilder.avatarTab.preset")}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {faces.filter((f) => f.isActive).map((face) =>
                    <button key={face.id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                    selectedFaceId === face.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/30"}`}
                    onClick={() => {setSelectedFaceId(face.id); setSelectedMyAvatarUrl(null); if (!avatarName) setAvatarName(face.name);}}>
                      <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                      {selectedFaceId === face.id &&
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary-foreground bg-primary rounded-full p-1" />
                        </div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                        <span className="text-[10px] text-white truncate block">{face.name}</span>
                      </div>
                    </button>)}
                </div>
              </TabsContent>

              {/* Tab 2: My Avatars */}
              <TabsContent value="my" className="space-y-4 pt-2">
                {myAvatarsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : !myAvatarsQuery.data?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCircle2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-muted-foreground">{t("lectureBuilder.avatar.myAvatarsEmpty")}</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">{t("lectureBuilder.avatar.myAvatarsEmptyDesc")}</p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={() => setAddTab("upload")}>
                      <Upload className="w-4 h-4" />{t("lectureBuilder.avatarTab.upload")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Sort dropdown */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{myAvatarsQuery.data.length} {t("lectureBuilder.avatar.avatarCount")}</span>
                      <Select value={avatarSortBy} onValueChange={(v) => setAvatarSortBy(v as any)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <ArrowUpDown className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="favorite">{t("lectureBuilder.avatar.sortFavorite")}</SelectItem>
                          <SelectItem value="recent">{t("lectureBuilder.avatar.sortRecent")}</SelectItem>
                          <SelectItem value="name">{t("lectureBuilder.avatar.sortName")}</SelectItem>
                          <SelectItem value="created">{t("lectureBuilder.avatar.sortCreated")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                      {myAvatarsQuery.data.map((av) =>
                        <div key={av.id} className="relative group">
                          <button
                            className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square w-full ${
                            selectedMyAvatarUrl === av.imageUrl ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/30"}`}
                            onClick={() => {
                              setSelectedMyAvatarUrl(av.imageUrl); setSelectedFaceId(null);
                              if (!avatarName) setAvatarName(av.name);
                              recordUsage.mutate({ id: av.id });
                            }}>
                            <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                            {selectedMyAvatarUrl === av.imageUrl &&
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary-foreground bg-primary rounded-full p-1" />
                            </div>}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                              <span className="text-[10px] text-white truncate block">{av.name}</span>
                            </div>
                            {/* Favorite star badge */}
                            {av.isFavorite && (
                              <div className="absolute top-0.5 left-0.5">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 drop-shadow" />
                              </div>
                            )}
                          </button>
                          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10">
                            <button className={`rounded-full p-0.5 transition-colors ${av.isFavorite ? "bg-yellow-400 text-yellow-900" : "bg-muted text-muted-foreground hover:bg-yellow-400 hover:text-yellow-900"}`}
                              onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate({ id: av.id }); }}>
                              <Star className={`w-3 h-3 ${av.isFavorite ? "fill-current" : ""}`} />
                            </button>
                            <button className="bg-primary text-primary-foreground rounded-full p-0.5"
                              onClick={(e) => { e.stopPropagation(); setEditingUserAvatar(av); setEditUserAvatarName(av.name); setEditUserAvatarDesc(av.description || ""); }}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button className="bg-destructive text-destructive-foreground rounded-full p-0.5"
                              onClick={(e) => { e.stopPropagation(); if (confirm(t("lectureBuilder.avatar.deleteConfirm"))) deleteUserAvatar.mutate({ id: av.id }); }}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>)}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab 3: Upload Photo */}
              <TabsContent value="upload" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.uploadTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.uploadDesc")}</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { toast.error(t("lectureBuilder.avatar.fileTooLarge")); return; }
                  setUploadFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
                {uploadPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30">
                      <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setUploadPreview(null); setUploadFile(null); }}>
                        <X className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.changePhoto")}
                      </Button>
                      <Button size="sm" disabled={isUploading || !avatarName.trim()} onClick={async () => {
                        if (!uploadFile) return;
                        setIsUploading(true);
                        try {
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64 = (ev.target?.result as string).split(",")[1];
                            const result = await createUserAvatar.mutateAsync({
                              name: avatarName.trim() || uploadFile.name.replace(/\.[^.]+$/, ""),
                              imageData: base64,
                              fileName: uploadFile.name,
                              mimeType: uploadFile.type,
                              type: "photo",
                            });
                            setSelectedMyAvatarUrl(result.imageUrl);
                            setSelectedFaceId(null);
                            setUploadPreview(null);
                            setUploadFile(null);
                            setAddTab("my");
                          };
                          reader.readAsDataURL(uploadFile);
                        } catch (err) { /* handled by mutation */ }
                        finally { setIsUploading(false); }
                      }}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                        {t("lectureBuilder.avatar.saveAndRegister")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t("lectureBuilder.avatar.clickToUpload")}</span>
                    <span className="text-xs text-muted-foreground">{t("lectureBuilder.avatar.uploadHint")}</span>
                  </button>
                )}
              </TabsContent>
              {/* Tab 4: AI Face Generation */}
              <TabsContent value="ai" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.aiTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.aiDesc")}</p>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                    placeholder={t("lectureBuilder.avatar.aiPlaceholder")}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{aiPrompt.length}/500</span>
                  </div>
                </div>
                {aiPreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg">
                      <img src={aiPreview} alt="AI generated" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAiPreview(null); setSelectedMyAvatarUrl(null); }}>
                        <Wand2 className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.aiRegenerate")}
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 font-medium">{t("lectureBuilder.avatar.aiSavedToMyAvatars")}</p>
                  </div>
                ) : (
                  <Button
                    className="w-full gap-2"
                    disabled={!aiPrompt.trim() || aiGenerating || !avatarName.trim()}
                    onClick={() => {
                      setAiGenerating(true);
                      generateFace.mutate({ prompt: aiPrompt.trim(), name: avatarName.trim() || "AI Avatar" });
                    }}
                  >
                    {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiGenerating ? t("lectureBuilder.avatar.aiGenerating") : t("lectureBuilder.avatar.aiGenerateBtn")}
                  </Button>
                )}
                {/* Example prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("lectureBuilder.avatar.aiExamples")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: t("lectureBuilder.avatar.aiEx1"), prompt: "a young Korean female professor in her 30s with glasses" },
                      { label: t("lectureBuilder.avatar.aiEx2"), prompt: "a middle-aged Caucasian male business executive with gray hair" },
                      { label: t("lectureBuilder.avatar.aiEx3"), prompt: "a young Indian female tech entrepreneur with confident smile" },
                      { label: t("lectureBuilder.avatar.aiEx4"), prompt: "a friendly Japanese male teacher in his 40s" },
                    ].map((ex) => (
                      <button key={ex.prompt} className="text-xs px-2.5 py-1 rounded-full border hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        onClick={() => setAiPrompt(ex.prompt)}>{ex.label}</button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              {/* Tab 5: D-ID Preview */}
              <TabsContent value="did" className="space-y-4 pt-2">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">{t("lectureBuilder.avatar.didTitle")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("lectureBuilder.avatar.didDesc")}</p>
                </div>
                {/* Step 1: Select avatar image */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep1")}</Label>
                  {(selectedMyAvatarUrl || selectedFaceId) ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <img src={selectedMyAvatarUrl || faces.find(f => f.id === selectedFaceId)?.imageUrl || ""} alt="selected" className="w-12 h-12 rounded-full object-cover border-2 border-primary/30" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{avatarName || t("lectureBuilder.avatar.didSelectedAvatar")}</p>
                        <p className="text-xs text-muted-foreground">{t("lectureBuilder.avatar.didAvatarReady")}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setAddTab("my")}>{t("lectureBuilder.avatar.didChangeAvatar")}</Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center">
                      <p className="text-sm text-muted-foreground mb-2">{t("lectureBuilder.avatar.didNoAvatar")}</p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => setAddTab("my")}>{t("lectureBuilder.avatarTab.myAvatars")}</Button>
                        <Button variant="outline" size="sm" onClick={() => setAddTab("preset")}>{t("lectureBuilder.avatarTab.preset")}</Button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Step 2: Voice selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep2")}</Label>
                  <Select value={didVoiceId} onValueChange={setDidVoiceId}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US-JennyNeural">Jenny (English, Female)</SelectItem>
                      <SelectItem value="en-US-GuyNeural">Guy (English, Male)</SelectItem>
                      <SelectItem value="ko-KR-SunHiNeural">SunHi (Korean, Female)</SelectItem>
                      <SelectItem value="ko-KR-InJoonNeural">InJoon (Korean, Male)</SelectItem>
                      <SelectItem value="ja-JP-NanamiNeural">Nanami (Japanese, Female)</SelectItem>
                      <SelectItem value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Chinese, Female)</SelectItem>
                      <SelectItem value="es-ES-ElviraNeural">Elvira (Spanish, Female)</SelectItem>
                      <SelectItem value="fr-FR-DeniseNeural">Denise (French, Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Step 3: Text input */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("lectureBuilder.avatar.didStep3")}</Label>
                  <textarea
                    className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
                    placeholder={t("lectureBuilder.avatar.didPlaceholder")}
                    value={didText}
                    onChange={(e) => setDidText(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{didText.length}/1000</span>
                  </div>
                </div>
                {/* Generate button or video result */}
                {didVideoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-full max-w-sm rounded-xl overflow-hidden border shadow-lg">
                      <video src={didVideoUrl} controls autoPlay className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDidVideoUrl(null); setDidTalkId(null); }}>
                        <Wand2 className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.didRegenerate")}
                      </Button>
                      <a href={didVideoUrl} download target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />{t("lectureBuilder.avatar.didDownload")}</Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full gap-2"
                    disabled={!(selectedMyAvatarUrl || selectedFaceId) || !didText.trim() || didGenerating}
                    onClick={async () => {
                      const imageUrl = selectedMyAvatarUrl || faces.find(f => f.id === selectedFaceId)?.imageUrl;
                      if (!imageUrl) return;
                      setDidGenerating(true);
                      setDidVideoUrl(null);
                      try {
                        const result = await createDidPreview.mutateAsync({
                          imageUrl,
                          text: didText.trim(),
                          voiceId: didVoiceId,
                        });
                        setDidTalkId(result.talkId);
                        // Poll for completion
                        let attempts = 0;
                        const poll = async () => {
                          if (attempts >= 30) { setDidGenerating(false); toast.error(t("lectureBuilder.avatar.didTimeout")); return; }
                          attempts++;
                          try {
                            const statusRes = await fetch(`/api/trpc/userAvatar.getDidPreviewStatus?input=${encodeURIComponent(JSON.stringify({ talkId: result.talkId }))}`, { credentials: "include" });
                            const statusJson = await statusRes.json() as any;
                            const statusData = statusJson?.result?.data;
                            if (statusData?.status === "done" && statusData?.videoUrl) {
                              setDidVideoUrl(statusData.videoUrl);
                              setDidGenerating(false);
                              toast.success(t("lectureBuilder.avatar.didSuccess"));
                            } else if (statusData?.status === "error") {
                              setDidGenerating(false);
                              toast.error(statusData.error || t("lectureBuilder.avatar.didError"));
                            } else {
                              setTimeout(poll, 2000);
                            }
                          } catch { setTimeout(poll, 2000); }
                        };
                        setTimeout(poll, 3000);
                      } catch (err: any) {
                        setDidGenerating(false);
                        toast.error(err.message || t("lectureBuilder.avatar.didError"));
                      }
                    }}
                  >
                    {didGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{t("lectureBuilder.avatar.didGenerating")}</>
                    ) : (
                      <><Video className="w-4 h-4" />{t("lectureBuilder.avatar.didGenerateBtn")}</>
                    )}
                  </Button>
                )}
              </TabsContent>
            </Tabs>

            <Separator className="my-2" />
            {/* Avatar Settings - shared across all tabs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("lectureBuilder.jsxText59")}</Label>
                  <Input placeholder={t("lectureBuilder.stringLiteral60")} value={avatarName} onChange={(e) => setAvatarName(e.target.value)} />
                </div>
                <div>
                  <Label>{t("lectureBuilder.jsxText61")}</Label>
                  <Select value={avatarRole} onValueChange={setAvatarRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVATAR_ROLES.map((r: any) =>
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("lectureBuilder.jsxText62")}</Label>
                <div className="flex items-center gap-2">
                  <Select value={avatarVoice} onValueChange={setAvatarVoice}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* Personal clone voices first */}
                      {myVoiceClones.length === 0 && (
                        <div className="px-3 py-2 border-b bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">{t("lectureBuilder.noCloneVoiceYet") || "아직 개인 클론 음성이 없습니다."}</p>
                          <a href="/ai-studio/voice-clone" className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                            <Mic className="w-3 h-3" /> {t("lectureBuilder.createCloneVoice") || "음성 클론 만들기"}
                          </a>
                        </div>
                      )}
                      {myVoiceClones.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider border-b">
                            🎤 {t("lectureBuilder.myCloneVoices") || "내 클론 음성"}
                          </div>
                          {myVoiceClones.map((clone: any) => (
                            <SelectItem key={`clone-${clone.id}`} value={clone.matchedVoiceId || `clone-${clone.id}`}>
                              <span className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  🎤
                                </span>
                                <span>{clone.name}</span>
                                <span className="text-muted-foreground text-xs">({t("lectureBuilder.personalVoice") || "개인 음성"})</span>
                              </span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-t mt-1">
                            🌐 {t("lectureBuilder.presetVoices") || "프리셋 음성"}
                          </div>
                        </>
                      )}
                      {voices.map((v: any) =>
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${v.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                              {v.gender === 'female' ? '♀' : '♂'}
                            </span>
                            <span>{v.name}</span>
                            <span className="text-muted-foreground text-xs">({v.desc})</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">🌐 {(v.languages || []).length}+</span>
                          </span>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <VoicePreviewButton voiceId={avatarVoice} size="default" variant="outline" />
                </div>
                {(() => {
                  const cloneMatch = myVoiceClones.find((c: any) => (c.matchedVoiceId || `clone-${c.id}`) === avatarVoice);
                  if (cloneMatch) {
                    const analysis = cloneMatch.voiceAnalysis ? JSON.parse(cloneMatch.voiceAnalysis) : null;
                    return (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                        🎤 {t("lectureBuilder.personalVoice") || "개인 음성"} · {analysis?.gender || ""} · {cloneMatch.language || "ko"}
                      </p>
                    );
                  }
                  const sel = voices.find((v: any) => v.id === avatarVoice) as any;
                  return sel ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {sel.gender === 'female' ? '👩 여성' : '👨 남성'} · {sel.style} · 지원: 한/영/일/중/스/프/독/포 외 {(sel.languages || []).length}개 언어
                    </p>
                  ) : null;
                })()}
              </div>
              <Button className="w-full" disabled={(!selectedFaceId && !selectedMyAvatarUrl) || !avatarName.trim() || addAvatar.isPending}
                onClick={() => {
                  if (selectedMyAvatarUrl) {
                    addAvatar.mutate({ projectId, customFaceUrl: selectedMyAvatarUrl, name: avatarName.trim(), role: avatarRole as any, ttsVoiceId: avatarVoice, sortOrder: avatars.length });
                  } else {
                    addAvatar.mutate({ projectId, sampleFaceId: selectedFaceId!, name: avatarName.trim(), role: avatarRole as any, ttsVoiceId: avatarVoice, sortOrder: avatars.length });
                  }
                }}>
                {addAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{t("lectureBuilder.jsxText63")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Selected Avatars */}
      {avatars.length === 0 ?
      <Card className="border-dashed border-2 py-16">
          <CardContent className="flex flex-col items-center text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">{t("lectureBuilder.jsxText64")}</h3>
            <p className="text-muted-foreground text-sm">{t("lectureBuilder.jsxText65")}</p>
          </CardContent>
        </Card> :

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {avatars.map((av, i) => {
          const face = faces.find((f) => f.id === av.sampleFaceId);
          const roleInfo = AVATAR_ROLES.find((r: any) => r.value === av.role);
          const isCustomizing = customizingAvatar?.id === av.id;
          return (
            <Card key={av.id} className={`relative group cursor-pointer transition-all ${isCustomizing ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/30"}`}
            onClick={() => { setCustomizingAvatar(av); setEditingAvatar(null); setTimeout(() => { document.getElementById('avatar-customize-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }}>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button className="p-1 rounded-md hover:bg-primary/10 transition-colors" title="설정"
                    onClick={(e) => { e.stopPropagation(); setCustomizingAvatar(av); setEditingAvatar(null); setTimeout(() => { document.getElementById('avatar-customize-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }}>
                    <Settings2 className="w-4 h-4 text-primary" />
                  </button>
                  <button className="p-1 rounded-md hover:bg-destructive/10 transition-colors" title="삭제"
                    onClick={(e) => {e.stopPropagation();deleteAvatar.mutate({ id: av.id });}}>
                    <X className="w-5 h-5 text-destructive hover:text-destructive/80" />
                  </button>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      {av.customFaceUrl ?
                    <img src={av.customFaceUrl} alt={av.name} className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-in-out]" key={av.customFaceUrl} /> :
                    face?.imageUrl ?
                    <img src={face.imageUrl} alt={av.name} className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-in-out]" key={face.imageUrl} /> :

                    <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                    }
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{av.name}</h3>
                      <Badge className={`${roleInfo?.color || ""} text-xs`}>{roleInfo?.label || av.role}</Badge>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> {av.ttsVoiceId}
                        <VoicePreviewButton voiceId={av.ttsVoiceId || ""} size="sm" variant="ghost" className="ml-1 h-6 w-6 p-0" />
                      </p>
                      <p className="text-[11px] text-primary/70 mt-1 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />
                        {isCustomizing ? t("lectureBuilder.jsxText66") : "클릭하여 얼굴/목소리 설정"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>);

        })}
        </div>
      }

      {/* Inline Customize Panel */}
      {avatars.length > 0 && (
        <div id="avatar-customize-panel">
        <AvatarCustomizePanel
          avatar={customizingAvatar}
          faces={faces}
          voices={voices}
          onUpdated={() => { onRefresh(); setCustomizingAvatar(null); }}
          onClose={() => setCustomizingAvatar(null)}
        />
        </div>
      )}

      {/* User Avatar Edit Dialog */}
      <Dialog open={!!editingUserAvatar} onOpenChange={(open) => { if (!open) setEditingUserAvatar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("lectureBuilder.avatar.editTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {editingUserAvatar?.imageUrl && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30">
                  <img src={editingUserAvatar.imageUrl} alt={editUserAvatarName} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("lectureBuilder.avatar.editName")}</Label>
              <Input value={editUserAvatarName} onChange={(e) => setEditUserAvatarName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>{t("lectureBuilder.avatar.editDesc")}</Label>
              <Textarea value={editUserAvatarDesc} onChange={(e) => setEditUserAvatarDesc(e.target.value)} maxLength={500} rows={3} />
            </div>
            <Button className="w-full" disabled={!editUserAvatarName.trim() || updateUserAvatar.isPending}
              onClick={() => {
                updateUserAvatar.mutate({ id: editingUserAvatar.id, name: editUserAvatarName.trim(), description: editUserAvatarDesc.trim() || undefined },
                  { onSuccess: () => setEditingUserAvatar(null) });
              }}>
              {updateUserAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {t("lectureBuilder.avatar.editSave")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Settings Dialog */}
      {editingAvatar &&
      <AvatarSettingsDialog
        open={!!editingAvatar}
        onOpenChange={(open) => {if (!open) setEditingAvatar(null);}}
        avatar={editingAvatar}
        faces={faces}
        voices={voices}
        onUpdated={onRefresh} />

      }
    </div>);

}

// ============ STEP 2: SCRIPTS ============
