import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Upload, Wand2, Eye, User2, Sparkles, GripVertical, Heart, MessageCircle, Share2, Image as ImageIcon } from "lucide-react";

/* ─── Interactive Before/After Slider ─── */
function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "원본",
  afterLabel = "AI 변환",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  }, [handleMove]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  }, [handleMove]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-xl overflow-hidden cursor-col-resize select-none group"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* After image (full background) */}
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100vw', maxWidth: 'none' }}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-primary/30 group-hover:scale-110 transition-transform">
          <GripVertical className="h-5 w-5 text-primary/70" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium z-20">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur-sm text-white text-sm font-medium z-20">
        {afterLabel}
      </div>

      {/* Instruction overlay (fades on interaction) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-xs z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
        ← 드래그하여 비교 →
      </div>
    </div>
  );
}

/* ─── Sample Gallery Data ─── */
const SAMPLE_GALLERY = [
  {
    id: 1,
    userName: "김강사",
    avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/avatar-sujin-5gLEWECpKGLiVXyqTcBK7u.webp",
    beforeUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
    afterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
    description: "블록체인 강의에 AI 얼굴 변환을 적용했습니다. 학생들이 더 집중하는 효과가 있었어요!",
    likes: 24,
    comments: 5,
    method: "내장 AI",
    createdAt: "2025-12-15",
  },
  {
    id: 2,
    userName: "이교수",
    avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/avatar-minjun-7Zzw3Cqf2eFHYKFGLWFxVv.webp",
    beforeUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
    afterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
    description: "D-ID API를 사용하여 영어 강의에 외국인 강사 얼굴을 적용했습니다. 자연스러운 결과에 만족합니다.",
    likes: 18,
    comments: 3,
    method: "D-ID",
    createdAt: "2026-01-08",
  },
  {
    id: 3,
    userName: "박튜터",
    avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/avatar-sarah-9ioKDLqFuZNzDJqRLLYHsP.webp",
    beforeUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp",
    afterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp",
    description: "프라이버시 보호를 위해 AI 얼굴 변환을 사용하고 있습니다. HeyGen의 품질이 정말 좋아요!",
    likes: 31,
    comments: 8,
    method: "HeyGen",
    createdAt: "2026-02-20",
  },
];

export default function InstructorFaceSwap() {
  const { user } = useAuth();
  const profiles = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });
  const createProfile = trpc.faceSwap.create.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 생성되었습니다."); } });
  const updateProfile = trpc.faceSwap.update.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 업데이트되었습니다."); } });
  const deleteProfile = trpc.faceSwap.delete.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("프로필이 삭제되었습니다."); } });
  const uploadFace = trpc.faceSwap.uploadFace.useMutation();
  const generatePreview = trpc.faceSwap.generatePreview.useMutation({ onSuccess: () => { profiles.refetch(); toast.success("AI 프리뷰가 생성되었습니다."); } });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", method: "builtin" as string, settings: JSON.stringify({ gender: "male", age: "30s", ethnicity: "asian" }, null, 2) });
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

  const handleCreate = () => {
    createProfile.mutate({ name: form.name, method: form.method as any, settings: form.settings });
    setShowForm(false);
    setForm({ name: "", method: "builtin", settings: JSON.stringify({ gender: "male", age: "30s", ethnicity: "asian" }, null, 2) });
  };

  const handleUploadFace = async (profileId: number, type: "source" | "target", file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const result = await uploadFace.mutateAsync({ imageData: base64, fileName: file.name, type });
      const updateData = type === "source" ? { sourceFaceUrl: result.url } : { targetFaceUrl: result.url };
      await updateProfile.mutateAsync({ id: profileId, ...updateData });
    };
    reader.readAsDataURL(file);
  };

  const toggleLike = (id: number) => {
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-studio-HS5V7dEHhBG4GbPuHinSnZ.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor"><Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></Button></Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><User2 className="h-6 w-6" /> 딥페이크 얼굴 변환</h1>
            <p className="text-white/70 mt-1">강의 시 사용할 대체 얼굴 프로필을 관리합니다</p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">

        {/* Info Banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">AI 얼굴 변환 시스템</p>
                <p className="text-sm text-muted-foreground mt-1">
                  강의 시 자신의 얼굴을 완전히 다른 사람으로 변환할 수 있습니다. 내장 AI 생성, D-ID, HeyGen 방식을 지원합니다.
                  대상 얼굴 이미지를 업로드하거나 AI로 자동 생성할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Gallery with Korean images */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            AI 얼굴 변환 예시
          </h2>
          <div className="grid gap-4">
            {/* Interactive Before/After Slider */}
            <BeforeAfterSlider
              beforeSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-1-UR5sNLMMjUAr4sCpMbZ5Vs.webp"
              afterSrc="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp"
              beforeLabel="원본"
              afterLabel="AI 변환"
            />

            <div className="grid md:grid-cols-2 gap-4">
              {/* Example 2: Before/After lecture */}
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-2-HLyczqY27Tjs5fixoQ799n.webp"
                    alt="AI 얼굴 변환 예시 - 라이브 강의"
                    className="w-full h-auto"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium">라이브 강의 얼굴 변환</p>
                    <p className="text-xs text-muted-foreground">실시간 강의 중 자연스러운 얼굴 변환</p>
                  </div>
                </CardContent>
              </Card>

              {/* Example 3: 3-step process infographic */}
              <Card className="overflow-hidden border-primary/10">
                <CardContent className="p-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/faceswap-kr-3-TnoHqpD27qF7kUo8gZ9gGj.webp"
                    alt="AI 얼굴 변환 3단계 프로세스"
                    className="w-full h-auto"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium">3단계 변환 프로세스</p>
                    <p className="text-xs text-muted-foreground">얼굴 업로드 → AI 변환 → 강의 시작</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              위 이미지를 드래그하여 원본과 AI 변환 결과를 비교해보세요. 원본 강사의 얼굴을 AI가 자연스럽게 다른 얼굴로 변환합니다.
            </p>
          </div>
        </div>

        {/* Create New */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> 새 프로필 생성</Button>
        ) : (
          <Card className="mb-6">
            <CardHeader><CardTitle>새 딥페이크 프로필</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>프로필 이름</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 비즈니스 남성 A" />
              </div>
              <div>
                <Label>변환 방식</Label>
                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">내장 AI 생성</SelectItem>
                    <SelectItem value="did">D-ID API</SelectItem>
                    <SelectItem value="heygen">HeyGen API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>설정 (JSON)</Label>
                <Textarea value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} rows={4} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground mt-1">gender: male/female, age: 20s/30s/40s/50s, ethnicity: asian/caucasian/african 등</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!form.name || createProfile.isPending}>
                  {createProfile.isPending ? "생성 중..." : "생성"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile List */}
        <div className="grid gap-4">
          {profiles.data?.map((profile: any) => (
            <Card key={profile.id} className="overflow-hidden">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {profile.previewUrl ? (
                      <img src={profile.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : profile.targetFaceUrl ? (
                      <img src={profile.targetFaceUrl} alt="Target" className="w-full h-full object-cover" />
                    ) : (
                      <User2 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{profile.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {profile.method === "did" ? "D-ID" : profile.method === "heygen" ? "HeyGen" : "내장 AI"}
                      </span>
                      {profile.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">기본값</span>}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      <span>원본: {profile.sourceFaceUrl ? "업로드됨" : "미설정"}</span>
                      <span>대상: {profile.targetFaceUrl ? "업로드됨" : "미설정"}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadFace(profile.id, "source", e.target.files[0])} />
                        <Button variant="outline" size="sm" asChild><span><Upload className="h-3 w-3 mr-1" /> 원본 얼굴</span></Button>
                      </label>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadFace(profile.id, "target", e.target.files[0])} />
                        <Button variant="outline" size="sm" asChild><span><Upload className="h-3 w-3 mr-1" /> 대상 얼굴</span></Button>
                      </label>
                      <Button variant="outline" size="sm" onClick={() => generatePreview.mutate({ profileId: profile.id })} disabled={generatePreview.isPending}>
                        <Wand2 className="h-3 w-3 mr-1" /> {generatePreview.isPending ? "생성 중..." : "AI 프리뷰"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateProfile.mutate({ id: profile.id, isDefault: true })}>
                        <Eye className="h-3 w-3 mr-1" /> 기본값 설정
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProfile.mutate({ id: profile.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {profiles.data?.length === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              <p>아직 딥페이크 프로필이 없습니다.</p>
              <p className="text-sm mt-1">위의 "새 프로필 생성" 버튼을 클릭하여 시작하세요.</p>
            </Card>
          )}
        </div>

        {/* ─── User Results Gallery ─── */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              사용자 변환 갤러리
            </h2>
            <p className="text-sm text-muted-foreground">다른 사용자들의 AI 변환 결과물</p>
          </div>

          <div className="grid gap-6">
            {SAMPLE_GALLERY.map((item) => (
              <Card key={item.id} className="overflow-hidden border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-0">
                  {/* User info header */}
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <img src={item.avatar} alt={item.userName} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.userName}</p>
                      <p className="text-xs text-muted-foreground">{item.createdAt} · {item.method}</p>
                    </div>
                  </div>

                  {/* Before/After comparison */}
                  <div className="px-4 pb-2">
                    <BeforeAfterSlider
                      beforeSrc={item.beforeUrl}
                      afterSrc={item.afterUrl}
                    />
                  </div>

                  {/* Description & actions */}
                  <div className="p-4 pt-2">
                    <p className="text-sm mb-3">{item.description}</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleLike(item.id)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Heart className={`h-4 w-4 ${likedItems.has(item.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        <span>{item.likes + (likedItems.has(item.id) ? 1 : 0)}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        <span>{item.comments}</span>
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>공유</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => toast.info("더 많은 결과물이 곧 추가됩니다!")}>
              더 보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
