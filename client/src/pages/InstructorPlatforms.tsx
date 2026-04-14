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

import { useTranslation } from "@/contexts/LanguageContext";
const platformInfo: Record<string, { name: string; color: string; icon: string; guide: string }> = {
  zoom: { name: "Zoom", color: "bg-blue-500/10 text-blue-400", icon: "📹", guide: "ip.zoom_guide" },
  webex: { name: "Webex", color: "bg-green-500/10 text-green-400", icon: "🌐", guide: "ip.webex_guide" },
  google_meet: { name: "Google Meet", color: "bg-red-500/10 text-red-400", icon: "🎥", guide: "ip.chrome_extension" },
  tencent: { name: "Tencent Meeting", color: "bg-purple-500/10 text-purple-400", icon: "💬", guide: "ip.tencent_guide" },
  teams: { name: "MS Teams", color: "bg-indigo-500/10 text-indigo-400", icon: "💼", guide: "ip.teams_guide" },
  obs: { name: "OBS Studio", color: "bg-gray-500/10 text-gray-300", icon: "🎬", guide: "ip.obs_virtual_camera" },
  custom: { name: "ip.other", color: "bg-orange-500/10 text-orange-400", icon: "⚙️", guide: "ip.rtmp_url" },
};

export default function InstructorPlatforms() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const integrations = trpc.platform.list.useQuery(undefined, { enabled: !!user });
  const createIntegration = trpc.platform.create.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success(t("ip.integration_added")); },
  });
  const updateIntegration = trpc.platform.update.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success(t("ip.settings_updated")); },
  });
  const deleteIntegration = trpc.platform.delete.useMutation({
    onSuccess: () => { integrations.refetch(); toast.success(t("ip.integration_deleted")); },
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
      name: form.name || t(platformInfo[form.platformType]?.name) || form.platformType,
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
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><Monitor className="h-6 w-6" /> {t("ip.title")}</h1>
            <p className="text-white/70 mt-1">{t("ip.description")}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{t("ip.guide_title")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("ip.guide_desc1")}
                  {t("ip.guide_desc2")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-3">{t("ip.how_it_works")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">{t("ip.step1_title")}</p>
                <p className="text-muted-foreground">{t("ip.step1_desc")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">{t("ip.step2_title")}</p>
                <p className="text-muted-foreground">{t("ip.step2_desc")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium mb-1">{t("ip.step3_title")}</p>
                <p className="text-muted-foreground">{t("ip.step3_desc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> {t("ip.add_platform")}</Button>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-6 space-y-4">
              <div>
                <Label>{t("ip.select_platform")}</Label>
                <Select value={form.platformType} onValueChange={v => setForm({ ...form, platformType: v, name: t(platformInfo[v]?.name) || "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(platformInfo).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.icon} {t(info.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("ip.integration_name")}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t(platformInfo[form.platformType]?.name)} />
              </div>
              {(form.platformType === "obs" || form.platformType === "custom") && (
                <>
                  <div>
                    <Label>{t("ip.stream_url")}</Label>
                    <Input value={form.streamUrl} onChange={e => setForm({ ...form, streamUrl: e.target.value })} placeholder="rtmp://live.example.com/app" />
                  </div>
                  <div>
                    <Label>{t("ip.stream_key")}</Label>
                    <Input value={form.streamKey} onChange={e => setForm({ ...form, streamKey: e.target.value })} placeholder="stream-key-xxxx" type="password" />
                  </div>
                </>
              )}
              <div>
                <Label>{t("ip.extra_settings")}</Label>
                <Textarea value={form.settings} onChange={e => setForm({ ...form, settings: e.target.value })} placeholder='{"resolution": "1080p", "fps": 30}' rows={3} className="font-mono text-sm" />
              </div>
              {platformInfo[form.platformType] && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">{t("ip.settings_guide")}</p>
                  <p className="text-muted-foreground">{t(platformInfo[form.platformType].guide)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createIntegration.isPending}>
                  {createIntegration.isPending ? t("ip.adding") : t("ip.add")}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>{t("ip.cancel")}</Button>
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
                          <span className={`text-xs px-2 py-0.5 rounded-full ${info?.color}`}>{t(info?.name)}</span>
                          {integration.isActive ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">{t("ip.active")}</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400">{t("ip.inactive")}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.streamUrl ? `URL: ${integration.streamUrl.substring(0, 40)}...` : t("ip.virtual_camera_mode")}
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
              <p>{t("ip.no_platforms")}</p>
              <p className="text-sm mt-1">{t("ip.click_add_platform")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
