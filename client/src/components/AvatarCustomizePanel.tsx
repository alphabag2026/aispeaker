import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings2, Volume2, Camera, Upload, Wand2, Sparkles, Check, Loader2,
  User, RefreshCw, ChevronDown, ChevronUp, Mic, X, Play, Square
} from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import { useLanguage, registerTranslations } from "@/contexts/LanguageContext";

// ============ i18n ============
registerTranslations("ko", {
  "avatarCustomize.title": "아바타 커스터마이징",
  "avatarCustomize.quickEdit": "빠른 편집",
  "avatarCustomize.selectToCustomize": "아바타를 선택하면 여기서 커스터마이징할 수 있습니다",
  "avatarCustomize.name": "이름",
  "avatarCustomize.namePlaceholder": "아바타 이름 입력",
  "avatarCustomize.role": "역할",
  "avatarCustomize.voice": "음성",
  "avatarCustomize.face": "얼굴",
  "avatarCustomize.gallery": "갤러리",
  "avatarCustomize.upload": "업로드",
  "avatarCustomize.aiGenerate": "AI 생성",
  "avatarCustomize.save": "저장",
  "avatarCustomize.saving": "저장 중...",
  "avatarCustomize.saved": "아바타 설정이 저장되었습니다",
  "avatarCustomize.cancel": "취소",
  "avatarCustomize.expand": "상세 설정",
  "avatarCustomize.collapse": "접기",
  "avatarCustomize.instructor": "강사",
  "avatarCustomize.host": "진행자",
  "avatarCustomize.guest": "게스트",
  "avatarCustomize.narrator": "나레이터",
  "avatarCustomize.facePreview": "얼굴 미리보기",
  "avatarCustomize.changeFace": "얼굴 변경",
  "avatarCustomize.uploadPhoto": "사진 업로드",
  "avatarCustomize.changePhoto": "사진 변경",
  "avatarCustomize.jpgPng5mb": "JPG/PNG, 최대 5MB",
  "avatarCustomize.aiPrompt": "얼굴 설명",
  "avatarCustomize.aiPromptPlaceholder": "예: 30대 여성, 짧은 머리, 전문적인 느낌",
  "avatarCustomize.generate": "생성",
  "avatarCustomize.generating": "생성 중...",
  "avatarCustomize.realisticStyle": "실사",
  "avatarCustomize.animeStyle": "애니메이션",
  "avatarCustomize.3dStyle": "3D 렌더링",
  "avatarCustomize.illustrationStyle": "일러스트",
  "avatarCustomize.previewVoice": "미리듣기",
  "avatarCustomize.noAvatarSelected": "편집할 아바타를 선택하세요",
  "avatarCustomize.clickAvatarCard": "위의 아바타 카드를 클릭하면 여기서 이름, 역할, 음성, 얼굴을 바로 편집할 수 있습니다.",
});

registerTranslations("en", {
  "avatarCustomize.title": "Avatar Customization",
  "avatarCustomize.quickEdit": "Quick Edit",
  "avatarCustomize.selectToCustomize": "Select an avatar to customize here",
  "avatarCustomize.name": "Name",
  "avatarCustomize.namePlaceholder": "Enter avatar name",
  "avatarCustomize.role": "Role",
  "avatarCustomize.voice": "Voice",
  "avatarCustomize.face": "Face",
  "avatarCustomize.gallery": "Gallery",
  "avatarCustomize.upload": "Upload",
  "avatarCustomize.aiGenerate": "AI Generate",
  "avatarCustomize.save": "Save",
  "avatarCustomize.saving": "Saving...",
  "avatarCustomize.saved": "Avatar settings saved",
  "avatarCustomize.cancel": "Cancel",
  "avatarCustomize.expand": "Detailed Settings",
  "avatarCustomize.collapse": "Collapse",
  "avatarCustomize.instructor": "Instructor",
  "avatarCustomize.host": "Host",
  "avatarCustomize.guest": "Guest",
  "avatarCustomize.narrator": "Narrator",
  "avatarCustomize.facePreview": "Face Preview",
  "avatarCustomize.changeFace": "Change Face",
  "avatarCustomize.uploadPhoto": "Upload Photo",
  "avatarCustomize.changePhoto": "Change Photo",
  "avatarCustomize.jpgPng5mb": "JPG/PNG, max 5MB",
  "avatarCustomize.aiPrompt": "Face Description",
  "avatarCustomize.aiPromptPlaceholder": "e.g., 30s female, short hair, professional look",
  "avatarCustomize.generate": "Generate",
  "avatarCustomize.generating": "Generating...",
  "avatarCustomize.realisticStyle": "Realistic",
  "avatarCustomize.animeStyle": "Anime",
  "avatarCustomize.3dStyle": "3D Render",
  "avatarCustomize.illustrationStyle": "Illustration",
  "avatarCustomize.previewVoice": "Preview",
  "avatarCustomize.noAvatarSelected": "Select an avatar to edit",
  "avatarCustomize.clickAvatarCard": "Click an avatar card above to edit name, role, voice, and face right here.",
});

registerTranslations("ja", {
  "avatarCustomize.title": "アバターカスタマイズ",
  "avatarCustomize.quickEdit": "クイック編集",
  "avatarCustomize.selectToCustomize": "アバターを選択してカスタマイズ",
  "avatarCustomize.name": "名前",
  "avatarCustomize.namePlaceholder": "アバター名を入力",
  "avatarCustomize.role": "役割",
  "avatarCustomize.voice": "音声",
  "avatarCustomize.face": "顔",
  "avatarCustomize.gallery": "ギャラリー",
  "avatarCustomize.upload": "アップロード",
  "avatarCustomize.aiGenerate": "AI生成",
  "avatarCustomize.save": "保存",
  "avatarCustomize.saving": "保存中...",
  "avatarCustomize.saved": "アバター設定が保存されました",
  "avatarCustomize.cancel": "キャンセル",
  "avatarCustomize.expand": "詳細設定",
  "avatarCustomize.collapse": "閉じる",
  "avatarCustomize.instructor": "講師",
  "avatarCustomize.host": "司会者",
  "avatarCustomize.guest": "ゲスト",
  "avatarCustomize.narrator": "ナレーター",
  "avatarCustomize.facePreview": "顔プレビュー",
  "avatarCustomize.changeFace": "顔を変更",
  "avatarCustomize.uploadPhoto": "写真をアップロード",
  "avatarCustomize.changePhoto": "写真を変更",
  "avatarCustomize.jpgPng5mb": "JPG/PNG、最大5MB",
  "avatarCustomize.aiPrompt": "顔の説明",
  "avatarCustomize.aiPromptPlaceholder": "例: 30代女性、ショートヘア、プロフェッショナルな雰囲気",
  "avatarCustomize.generate": "生成",
  "avatarCustomize.generating": "生成中...",
  "avatarCustomize.realisticStyle": "リアル",
  "avatarCustomize.animeStyle": "アニメ",
  "avatarCustomize.3dStyle": "3Dレンダリング",
  "avatarCustomize.illustrationStyle": "イラスト",
  "avatarCustomize.previewVoice": "プレビュー",
  "avatarCustomize.noAvatarSelected": "編集するアバターを選択してください",
  "avatarCustomize.clickAvatarCard": "上のアバターカードをクリックすると、名前、役割、音声、顔をここで編集できます。",
});

registerTranslations("zh", {
  "avatarCustomize.title": "头像自定义",
  "avatarCustomize.quickEdit": "快速编辑",
  "avatarCustomize.selectToCustomize": "选择头像进行自定义",
  "avatarCustomize.name": "名称",
  "avatarCustomize.namePlaceholder": "输入头像名称",
  "avatarCustomize.role": "角色",
  "avatarCustomize.voice": "语音",
  "avatarCustomize.face": "面孔",
  "avatarCustomize.gallery": "画廊",
  "avatarCustomize.upload": "上传",
  "avatarCustomize.aiGenerate": "AI生成",
  "avatarCustomize.save": "保存",
  "avatarCustomize.saving": "保存中...",
  "avatarCustomize.saved": "头像设置已保存",
  "avatarCustomize.cancel": "取消",
  "avatarCustomize.expand": "详细设置",
  "avatarCustomize.collapse": "收起",
  "avatarCustomize.instructor": "讲师",
  "avatarCustomize.host": "主持人",
  "avatarCustomize.guest": "嘉宾",
  "avatarCustomize.narrator": "旁白",
  "avatarCustomize.facePreview": "面孔预览",
  "avatarCustomize.changeFace": "更换面孔",
  "avatarCustomize.uploadPhoto": "上传照片",
  "avatarCustomize.changePhoto": "更换照片",
  "avatarCustomize.jpgPng5mb": "JPG/PNG，最大5MB",
  "avatarCustomize.aiPrompt": "面孔描述",
  "avatarCustomize.aiPromptPlaceholder": "例如：30岁女性，短发，专业形象",
  "avatarCustomize.generate": "生成",
  "avatarCustomize.generating": "生成中...",
  "avatarCustomize.realisticStyle": "写实",
  "avatarCustomize.animeStyle": "动漫",
  "avatarCustomize.3dStyle": "3D渲染",
  "avatarCustomize.illustrationStyle": "插画",
  "avatarCustomize.previewVoice": "预览",
  "avatarCustomize.noAvatarSelected": "选择要编辑的头像",
  "avatarCustomize.clickAvatarCard": "点击上方的头像卡片，即可在此编辑名称、角色、语音和面孔。",
});

// ============ Types ============
interface AvatarData {
  id: number;
  name: string;
  role: string;
  ttsVoiceId: string | null;
  sampleFaceId: number | null;
  customFaceUrl: string | null;
  sortOrder: number;
}

interface Props {
  avatar: AvatarData | null;
  faces: any[];
  voices: any[];
  onUpdated: () => void;
  onClose: () => void;
}

const ROLES = [
  { value: "instructor", labelKey: "avatarCustomize.instructor", color: "bg-blue-500/20 text-blue-400" },
  { value: "host", labelKey: "avatarCustomize.host", color: "bg-purple-500/20 text-purple-400" },
  { value: "guest", labelKey: "avatarCustomize.guest", color: "bg-green-500/20 text-green-400" },
  { value: "narrator", labelKey: "avatarCustomize.narrator", color: "bg-orange-500/20 text-orange-400" },
];

const AI_STYLES = [
  { value: "realistic", labelKey: "avatarCustomize.realisticStyle" },
  { value: "anime", labelKey: "avatarCustomize.animeStyle" },
  { value: "3d", labelKey: "avatarCustomize.3dStyle" },
  { value: "illustration", labelKey: "avatarCustomize.illustrationStyle" },
];

export default function AvatarCustomizePanel({ avatar, faces, voices, onUpdated, onClose }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [role, setRole] = useState("instructor");
  const [ttsVoiceId, setTtsVoiceId] = useState("Kore");
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [customFaceUrl, setCustomFaceUrl] = useState<string | null>(null);
  const [faceTab, setFaceTab] = useState<string>("gallery");
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("realistic");
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when avatar changes
  useEffect(() => {
    if (avatar) {
      setName(avatar.name);
      setRole(avatar.role);
      setTtsVoiceId(avatar.ttsVoiceId || "Kore");
      setSelectedFaceId(avatar.sampleFaceId);
      setCustomFaceUrl(avatar.customFaceUrl);
      setFaceTab(avatar.customFaceUrl ? "custom" : "gallery");
      setAiGeneratedUrl(null);
      setAiPrompt("");
    }
  }, [avatar]);

  const updateMut = trpc.lectureBuilder.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("avatarCustomize.saved"));
      onUpdated();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFace = trpc.gallery.uploadImage.useMutation();
  const generateFace = trpc.lectureBuilder.generateAvatarFace.useMutation({
    onSuccess: (data) => {
      setAiGeneratedUrl(data.imageUrl);
      setCustomFaceUrl(data.imageUrl);
      setFaceTab("ai");
      toast.success(t("avatarCustomize.saved"));
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!avatar) return;
    const faceUrl = faceTab === "ai" ? aiGeneratedUrl : faceTab === "custom" ? customFaceUrl : null;
    updateMut.mutate({
      id: avatar.id,
      name: name.trim() || avatar.name,
      role: role as any,
      ttsVoiceId,
      sampleFaceId: faceTab === "gallery" ? selectedFaceId : null,
      customFaceUrl: faceUrl,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Image files only"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadFace.mutateAsync({
          fileName: `avatar-face-${avatar?.id}-${Date.now()}.${file.name.split(".").pop()}`,
          imageData: base64,
          mimeType: file.type,
        });
        setCustomFaceUrl(result.url);
        setFaceTab("custom");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const currentFace = faces.find((f) => f.id === selectedFaceId);
  const displayFaceUrl = faceTab === "ai" ? aiGeneratedUrl : faceTab === "custom" ? customFaceUrl : currentFace?.imageUrl;

  if (!avatar) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="py-8 text-center">
          <Settings2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-muted-foreground">{t("avatarCustomize.noAvatarSelected")}</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">{t("avatarCustomize.clickAvatarCard")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header with avatar preview */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent border-b">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 shrink-0 relative">
            {displayFaceUrl ? (
              <img src={displayFaceUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                {t("avatarCustomize.quickEdit")}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg truncate mt-0.5">{name}</h3>
            <Badge className={`${ROLES.find((r) => r.value === role)?.color || ""} text-[10px] mt-0.5`}>
              {t(ROLES.find((r) => r.value === role)?.labelKey || "")}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick edit fields */}
        <div className="p-4 space-y-4">
          {/* Name & Role - inline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("avatarCustomize.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("avatarCustomize.namePlaceholder")}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">{t("avatarCustomize.role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${r.color} text-[10px] px-1.5 py-0`}>{t(r.labelKey)}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice */}
          <div>
            <Label className="text-xs mb-1 block text-muted-foreground flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> {t("avatarCustomize.voice")}
            </Label>
            <div className="flex items-center gap-2">
              <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {voices.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-1">
                        <span className={`text-[9px] font-medium px-0.5 rounded ${v.gender === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                          {v.gender === 'female' ? '♀' : '♂'}
                        </span>
                        <span>{v.name}</span>
                        <span className="text-muted-foreground text-[10px]">({v.desc})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <VoicePreviewButton voiceId={ttsVoiceId} size="sm" variant="outline" />
            </div>
          </div>

          {/* Expandable Face Section */}
          <div>
            <button
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" /> {t("avatarCustomize.face")} - {t(expanded ? "avatarCustomize.collapse" : "avatarCustomize.expand")}
              </span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expanded && (
              <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <Tabs value={faceTab} onValueChange={setFaceTab}>
                  <TabsList className="grid w-full grid-cols-3 h-8">
                    <TabsTrigger value="gallery" className="text-xs gap-1 h-7">
                      <Sparkles className="w-3 h-3" /> {t("avatarCustomize.gallery")}
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="text-xs gap-1 h-7">
                      <Upload className="w-3 h-3" /> {t("avatarCustomize.upload")}
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs gap-1 h-7">
                      <Wand2 className="w-3 h-3" /> {t("avatarCustomize.aiGenerate")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gallery" className="mt-2">
                    <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto p-0.5">
                      {faces.filter((f) => f.isActive).map((face) => (
                        <button
                          key={face.id}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                            selectedFaceId === face.id
                              ? "border-primary ring-1 ring-primary/30 scale-105"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => { setSelectedFaceId(face.id); setFaceTab("gallery"); }}
                        >
                          <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                          {selectedFaceId === face.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground bg-primary rounded-full p-0.5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 shrink-0">
                        {customFaceUrl ? (
                          <img src={customFaceUrl} alt="custom" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Button variant="outline" size="sm" className="w-full gap-1 h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {customFaceUrl ? t("avatarCustomize.changePhoto") : t("avatarCustomize.uploadPhoto")}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">{t("avatarCustomize.jpgPng5mb")}</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select value={aiStyle} onValueChange={setAiStyle}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AI_STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}><span className="text-xs">{t(s.labelKey)}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={t("avatarCustomize.aiPromptPlaceholder")}
                        className="flex-1 h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs shrink-0"
                        disabled={generateFace.isPending || !aiPrompt.trim()}
                        onClick={() => {
                          generateFace.mutate({
                            prompt: aiPrompt.trim(),
                            style: aiStyle as any,
                            gender: "neutral" as any,
                            ageRange: "middle" as any,
                          });
                        }}
                      >
                        {generateFace.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {generateFace.isPending ? t("avatarCustomize.generating") : t("avatarCustomize.generate")}
                      </Button>
                    </div>
                    {aiGeneratedUrl && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/30 shrink-0">
                          <img src={aiGeneratedUrl} alt="AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-muted-foreground flex-1">AI {t("avatarCustomize.facePreview")}</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                          generateFace.mutate({ prompt: aiPrompt.trim(), style: aiStyle as any, gender: "neutral" as any, ageRange: "middle" as any });
                        }} disabled={generateFace.isPending}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          <Separator />

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
              {t("avatarCustomize.cancel")}
            </Button>
            <Button size="sm" className="flex-1 gap-1" onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {updateMut.isPending ? t("avatarCustomize.saving") : t("avatarCustomize.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
