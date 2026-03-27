import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Volume2, Wand2, Sparkles, Play, Save } from "lucide-react";

const speakingStyles = [
  { value: "formal", label: "격식체" },
  { value: "casual", label: "비격식체" },
  { value: "academic", label: "학술적" },
  { value: "friendly", label: "친근한" },
  { value: "authoritative", label: "권위있는" },
];

const voiceCharacters = [
  { value: "male_deep", label: "남성 저음" },
  { value: "male_bright", label: "남성 밝은" },
  { value: "female_warm", label: "여성 따뜻한" },
  { value: "female_clear", label: "여성 맑은" },
  { value: "neutral", label: "중성" },
];

export default function InstructorVoiceMod() {
  const { user } = useAuth();
  const profiles = trpc.voiceMod.list.useQuery(undefined, { enabled: !!user });
  const createProfile = trpc.voiceMod.create.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success("음성 변조 프로필이 생성되었습니다."); },
  });
  const updateProfile = trpc.voiceMod.update.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success("프로필이 업데이트되었습니다."); },
  });
  const deleteProfile = trpc.voiceMod.delete.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success("프로필이 삭제되었습니다."); },
  });
  const previewVoice = trpc.voiceMod.preview.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    pitchShift: 0,
    speedPercent: 100,
    toneWarmth: 0,
    speakingStyle: "formal" as "formal" | "casual" | "academic" | "friendly" | "authoritative",
    voiceCharacter: "male_deep" as "male_deep" | "male_bright" | "female_warm" | "female_clear" | "neutral",
    stylePrompt: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const handleCreate = () => {
    createProfile.mutate({
      name: form.name,
      pitchShift: form.pitchShift,
      speedPercent: form.speedPercent,
      toneWarmth: form.toneWarmth,
      speakingStyle: form.speakingStyle,
      voiceCharacter: form.voiceCharacter,
      stylePrompt: form.stylePrompt || undefined,
    });
    setShowForm(false);
    setForm({ name: "", pitchShift: 0, speedPercent: 100, toneWarmth: 0, speakingStyle: "formal", voiceCharacter: "male_deep", stylePrompt: "" });
  };

  const handlePreview = async (profileId: number) => {
    try {
      const result = await previewVoice.mutateAsync({
        profileId,
        sampleText: "안녕하세요, 오늘 Web3 기술의 핵심 개념에 대해 알아보겠습니다.",
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
      toast.success("음성 미리듣기가 생성되었습니다.");
    } catch {
      toast.info("음성 미리듣기 기능은 TTS API 연동 후 사용 가능합니다.");
    }
  };

  const startEdit = (profile: any) => {
    setEditingId(profile.id);
    setEditForm({
      pitchShift: profile.pitchShift ?? 0,
      speedPercent: profile.speedPercent ?? 100,
      toneWarmth: profile.toneWarmth ?? 0,
      speakingStyle: profile.speakingStyle ?? "formal",
      voiceCharacter: profile.voiceCharacter ?? "male_deep",
      stylePrompt: profile.stylePrompt ?? "",
    });
  };

  const saveEdit = (id: number) => {
    updateProfile.mutate({
      id,
      pitchShift: editForm.pitchShift,
      speedPercent: editForm.speedPercent,
      toneWarmth: editForm.toneWarmth,
      speakingStyle: editForm.speakingStyle,
      voiceCharacter: editForm.voiceCharacter,
      stylePrompt: editForm.stylePrompt || undefined,
    });
    setEditingId(null);
    setEditForm(null);
  };

  const VoiceFormFields = ({ data, setData }: { data: any; setData: (d: any) => void }) => (
    <div className="space-y-4">
      <div>
        <Label>피치 조절 (반음): {data.pitchShift > 0 ? `+${data.pitchShift}` : data.pitchShift}</Label>
        <Slider min={-12} max={12} step={1} value={[data.pitchShift]} onValueChange={v => setData({ ...data, pitchShift: v[0] })} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">-12(매우 낮음) ~ +12(매우 높음)</p>
      </div>
      <div>
        <Label>속도: {data.speedPercent}%</Label>
        <Slider min={50} max={200} step={5} value={[data.speedPercent]} onValueChange={v => setData({ ...data, speedPercent: v[0] })} className="mt-2" />
      </div>
      <div>
        <Label>톤 따뜻함: {data.toneWarmth > 0 ? `+${data.toneWarmth}` : data.toneWarmth}</Label>
        <Slider min={-100} max={100} step={10} value={[data.toneWarmth]} onValueChange={v => setData({ ...data, toneWarmth: v[0] })} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">-100(차가운) ~ +100(따뜻한)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>말투 스타일</Label>
          <Select value={data.speakingStyle} onValueChange={v => setData({ ...data, speakingStyle: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {speakingStyles.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>음성 캐릭터</Label>
          <Select value={data.voiceCharacter} onValueChange={v => setData({ ...data, voiceCharacter: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {voiceCharacters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>스타일 프롬프트 (선택사항)</Label>
        <Textarea value={data.stylePrompt} onChange={e => setData({ ...data, stylePrompt: e.target.value })} placeholder="예: 50대 교수님처럼 차분하고 권위있게 말하되, 어려운 개념은 비유를 들어 설명" rows={3} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-5xl py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/instructor"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Volume2 className="h-6 w-6 text-primary" /> 음성 변조 관리</h1>
            <p className="text-muted-foreground">목소리 톤, 말투, 속도를 변환하여 완전히 다른 사람처럼 강의합니다</p>
          </div>
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">AI 음성 변조 시스템</p>
                <p className="text-sm text-muted-foreground mt-1">
                  피치, 속도, 톤, 말투 패턴, 음성 캐릭터를 조합하여 원래 목소리와 완전히 다른 음성을 만들 수 있습니다.
                  딥페이크 얼굴 변환과 함께 사용하면 완전히 다른 강사로 변신할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> 새 음성 프로필</Button>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-6 space-y-5">
              <div>
                <Label>프로필 이름</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 저음 남성 전문가" />
              </div>
              <VoiceFormFields data={form} setData={setForm} />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!form.name || createProfile.isPending}>
                  {createProfile.isPending ? "생성 중..." : "생성"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {profiles.data?.map((profile: any) => (
            <Card key={profile.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{profile.name}</h3>
                      {profile.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">기본값</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      피치: {profile.pitchShift > 0 ? `+${profile.pitchShift}` : profile.pitchShift}반음 · 
                      속도: {profile.speedPercent ?? 100}% · 
                      캐릭터: {voiceCharacters.find(c => c.value === profile.voiceCharacter)?.label || "기본"} · 
                      말투: {speakingStyles.find(s => s.value === profile.speakingStyle)?.label || "기본"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(profile.id)} disabled={previewVoice.isPending}>
                      <Play className="h-3 w-3 mr-1" /> 미리듣기
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateProfile.mutate({ id: profile.id, isDefault: true })}>
                      <Wand2 className="h-3 w-3 mr-1" /> 기본값
                    </Button>
                    {editingId !== profile.id && (
                      <Button variant="outline" size="sm" onClick={() => startEdit(profile)}>편집</Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProfile.mutate({ id: profile.id })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingId === profile.id && editForm && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <VoiceFormFields data={editForm} setData={setEditForm} />
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => saveEdit(profile.id)}><Save className="h-3 w-3 mr-1" /> 저장</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(null); }}>취소</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {profiles.data?.length === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              <p>아직 음성 변조 프로필이 없습니다.</p>
              <p className="text-sm mt-1">"새 음성 프로필" 버튼을 클릭하여 시작하세요.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
