import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, Users, Volume2, Loader2, Check, Mic, User, Sparkles } from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: AvatarData;
  faces: any[];
  voices: any[];
  onUpdated: () => void;
}

const AVATAR_ROLES = [
  { value: "instructor", label: "강사", color: "bg-blue-500/20 text-blue-400", desc: "메인 강의 진행" },
  { value: "host", label: "사회자", color: "bg-purple-500/20 text-purple-400", desc: "진행/MC 역할" },
  { value: "guest", label: "게스트", color: "bg-green-500/20 text-green-400", desc: "초대 출연자" },
  { value: "narrator", label: "내레이터", color: "bg-orange-500/20 text-orange-400", desc: "나레이션 전담" },
];

export default function AvatarSettingsDialog({ open, onOpenChange, avatar, faces, voices, onUpdated }: Props) {
  const [name, setName] = useState(avatar.name);
  const [role, setRole] = useState(avatar.role);
  const [ttsVoiceId, setTtsVoiceId] = useState(avatar.ttsVoiceId || "Kore");
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(avatar.sampleFaceId);
  const [customFaceUrl, setCustomFaceUrl] = useState<string | null>(avatar.customFaceUrl);
  const [faceTab, setFaceTab] = useState<string>(avatar.customFaceUrl ? "custom" : "gallery");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when avatar changes
  useEffect(() => {
    setName(avatar.name);
    setRole(avatar.role);
    setTtsVoiceId(avatar.ttsVoiceId || "Kore");
    setSelectedFaceId(avatar.sampleFaceId);
    setCustomFaceUrl(avatar.customFaceUrl);
    setFaceTab(avatar.customFaceUrl ? "custom" : "gallery");
  }, [avatar]);

  const updateMut = trpc.lectureBuilder.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("아바타 설정이 저장되었습니다");
      onUpdated();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFace = trpc.gallery.uploadImage.useMutation();

  const handleSave = () => {
    updateMut.mutate({
      id: avatar.id,
      name: name.trim() || avatar.name,
      role: role as any,
      ttsVoiceId,
      sampleFaceId: faceTab === "gallery" ? selectedFaceId : null,
      customFaceUrl: faceTab === "custom" ? customFaceUrl : null,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 파일만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadFace.mutateAsync({
          fileName: `avatar-face-${avatar.id}-${Date.now()}.${file.name.split(".").pop()}`,
          imageData: base64,
          mimeType: file.type,
        });
        setCustomFaceUrl(result.url);
        setFaceTab("custom");
        toast.success("얼굴 이미지가 업로드되었습니다");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("업로드에 실패했습니다");
      setUploading(false);
    }
  };

  const currentFace = faces.find((f) => f.id === selectedFaceId);
  const displayFaceUrl = faceTab === "custom" ? customFaceUrl : currentFace?.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2Icon className="w-5 h-5 text-primary" />
            아바타 설정 - {avatar.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Current Avatar Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-primary/30 shrink-0 relative">
              {displayFaceUrl ? (
                <img src={displayFaceUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">{name}</h3>
              <Badge className={`${AVATAR_ROLES.find((r) => r.value === role)?.color || ""} text-xs mt-1`}>
                {AVATAR_ROLES.find((r) => r.value === role)?.label || role}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> {ttsVoiceId}
              </p>
            </div>
          </div>

          {/* Face Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Camera className="w-4 h-4" /> 얼굴 설정
            </Label>
            <Tabs value={faceTab} onValueChange={setFaceTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery" className="gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 샘플 갤러리
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-1">
                  <Upload className="w-3.5 h-3.5" /> 내 얼굴 업로드
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 max-h-[240px] overflow-y-auto p-1">
                  {faces
                    .filter((f) => f.isActive)
                    .map((face) => (
                      <button
                        key={face.id}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                          selectedFaceId === face.id
                            ? "border-primary ring-2 ring-primary/30 scale-105"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setSelectedFaceId(face.id)}
                      >
                        <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                        {selectedFaceId === face.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary-foreground bg-primary rounded-full p-0.5" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                          <span className="text-[9px] text-white truncate block">{face.name}</span>
                        </div>
                      </button>
                    ))}
                </div>
                {faces.filter((f) => f.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    등록된 샘플 얼굴이 없습니다
                  </p>
                )}
              </TabsContent>

              <TabsContent value="custom" className="mt-3">
                <div className="flex flex-col items-center gap-4">
                  {/* Preview */}
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 relative">
                    {customFaceUrl ? (
                      <img src={customFaceUrl} alt="내 얼굴" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                        <User className="w-10 h-10 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground mt-1">사진 없음</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {customFaceUrl ? "다른 사진으로 변경" : "내 얼굴 사진 업로드"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      정면 얼굴 사진을 업로드하세요 (5MB 이하, JPG/PNG)
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Name & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">이름</Label>
              <Input
                placeholder="아바타 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">역할</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVATAR_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${r.color} text-[10px] px-1.5 py-0`}>{r.label}</Badge>
                        <span className="text-xs text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Voice Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
              <Mic className="w-4 h-4" /> 목소리 설정
            </Label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <span>{v.name}</span>
                          <span className="text-xs text-muted-foreground">({v.desc})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <VoicePreviewButton voiceId={ttsVoiceId} size="default" variant="outline" />
              </div>
              <p className="text-xs text-muted-foreground">
                선택한 음성으로 강의 TTS가 생성됩니다. 미리듣기 버튼으로 음성을 확인하세요.
              </p>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Settings icon component (to avoid importing from lucide twice)
function Settings2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  );
}
