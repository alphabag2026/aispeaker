import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Monitor, Settings, ExternalLink, Sparkles, Copy, CheckCircle } from "lucide-react";

const platformInfo: Record<string, { name: string; color: string; icon: string; guide: string }> = {
  zoom: { name: "Zoom", color: "bg-blue-500/10 text-blue-400", icon: "📹", guide: "Zoom 설정 > 가상 카메라/마이크를 활성화하세요" },
  webex: { name: "Webex", color: "bg-green-500/10 text-green-400", icon: "🌐", guide: "Webex 설정 > 오디오/비디오에서 가상 장치를 선택하세요" },
  google_meet: { name: "Google Meet", color: "bg-red-500/10 text-red-400", icon: "🎥", guide: "Chrome 확장 프로그램으로 가상 카메라를 연결하세요" },
  tencent: { name: "Tencent Meeting", color: "bg-purple-500/10 text-purple-400", icon: "💬", guide: "텐센트 회의 설정에서 가상 카메라를 선택하세요" },
  teams: { name: "MS Teams", color: "bg-indigo-500/10 text-indigo-400", icon: "💼", guide: "Teams 설정 > 장치에서 가상 카메라/마이크를 선택하세요" },
  obs: { name: "OBS Studio", color: "bg-gray-500/10 text-gray-300", icon: "🎬", guide: "OBS 가상 카메라 출력을 활성화하여 다른 플랫폼에서 사용하세요" },
  custom: { name: "기타", color: "bg-orange-500/10 text-orange-400", icon: "⚙️", guide: "RTMP 또는 WebRTC 스트림 URL을 입력하세요" },
};

export default function InstructorPlatforms() {
  const { user } = useAuth();
  const integrations = trpc.platform.list.useQuery(undefined, { enabled: !!user });
  const createIntegration = trpc.platform.create.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success("플랫폼 연동이 추가되었습니다."); },
  });
  const updateIntegration = trpc.platform.update.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success("설정이 업데이트되었습니다."); },
  });
  const deleteIntegration = trpc.platform.delete.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success("연동이 삭제되었습니다."); },
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    platformType: "zoom" as string,
    name: "",
    streamUrl: "",
    streamKey: "",
    settings: "",
  });

  const handleCreate = () => {
    createIntegration.mutate({
      platform: form.platformType as any,
      name: form.name || platformInfo[form.platformType]?.name || form.platformType,
      meetingUrl: form.streamUrl || undefined,
      config: form.settings || undefined,
    });
    setShowForm(false);
    setForm({ platformType: "zoom", name: "", streamUrl: "", streamKey: "", settings: "" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-broadcast-VqgzPLgr6PKLpmSfakoS73.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor"><Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></Button></Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><Monitor className="h-6 w-6" /> 외부 플랫폼 연동</h1>
            <p className="text-white/70 mt-1">Zoom, Google Meet, Webex 등에서 AI 강의를 송출합니다</p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">외부 회의 플랫폼 연동 가이드</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI가 생성한 강의 영상/음성을 외부 회의 플랫폼에서 사용할 수 있습니다.
                  가상 카메라/마이크를 통해 Zoom, Google Meet, Webex, Tencent Meeting 등에서 AI 강사가 직접 강의하는 것처럼 송출됩니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-3">작동 방식</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">1. AI 강의 생성</p>
                <p className="text-muted-foreground">프롬프트 또는 교안 기반으로 AI가 강의 콘텐츠를 생성합니다</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">2. 가상 장치 연결</p>
                <p className="text-muted-foreground">AI 아바타 영상 + 변조된 음성이 가상 카메라/마이크로 출력됩니다</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">3. 외부 플랫폼 송출</p>
                <p className="text-muted-foreground">Zoom 등 회의 플랫폼에서 가상 장치를 선택하면 AI 강의가 송출됩니다</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> 플랫폼 추가</Button>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-6 space-y-4">
              <div>
                <Label>플랫폼 선택</Label>
                <Select value={form.platformType} onValueChange={v => setForm({ ...form, platformType: v, name: platformInfo[v]?.name || "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(platformInfo).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.icon} {info.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>연동 이름</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={platformInfo[form.platformType]?.name} />
              </div>
              {(form.platformType === "obs" || form.platformType === "custom") && (
                <>
                  <div>
                    <Label>스트림 URL (RTMP)</Label>
                    <Input value={form.streamUrl} onChange={e => setForm({ ...form, streamUrl: e.target.value })} placeholder="rtmp://live.example.com/app" />
                  </div>
                  <div>
                    <Label>스트림 키</Label>
                    <Input value={form.streamKey} onChange={e => setForm({ ...form, streamKey: e.target.value })} placeholder="stream-key-xxxx" type="password" />
                  </div>
                </>
              )}
              <div>
                <Label>추가 설정 (JSON, 선택사항)</Label>
                <Textarea value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} placeholder='{"resolution": "1080p", "fps": 30}' rows={3} className="font-mono text-sm" />
              </div>
              {platformInfo[form.platformType] && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">설정 가이드:</p>
                  <p className="text-muted-foreground">{platformInfo[form.platformType].guide}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createIntegration.isPending}>
                  {createIntegration.isPending ? "추가 중..." : "추가"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {integrations.data?.map((integration: any) => {
            const info = platformInfo[integration.platformType] || platformInfo.custom;
            return (
              <Card key={integration.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info?.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${info?.color}`}>{info?.name}</span>
                          {integration.isActive ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">활성</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400">비활성</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.streamUrl ? `URL: ${integration.streamUrl.substring(0, 40)}...` : "가상 카메라/마이크 모드"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.isActive ?? true}
                        onCheckedChange={checked => updateIntegration.mutate({ id: integration.id, isActive: checked })}
                      />
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteIntegration.mutate({ id: integration.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {integrations.data?.length === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              <p>아직 연동된 플랫폼이 없습니다.</p>
              <p className="text-sm mt-1">"플랫폼 추가" 버튼을 클릭하여 시작하세요.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
