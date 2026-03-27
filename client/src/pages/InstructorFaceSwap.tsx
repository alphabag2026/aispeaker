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
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Upload, Wand2, Eye, User2, Sparkles } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-5xl py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/instructor"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><User2 className="h-6 w-6 text-primary" /> 딥페이크 얼굴 변환</h1>
            <p className="text-muted-foreground">강의 시 사용할 대체 얼굴 프로필을 관리합니다</p>
          </div>
        </div>

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
      </div>
    </div>
  );
}
