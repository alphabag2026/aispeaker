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

import { useTranslation } from "@/contexts/LanguageContext";


export default function InstructorVoiceMod() {
  const { t } = useTranslation();

  const speakingStyles = [
  { value: "formal", label: t("ivm.formal") },
  { value: "casual", label: t("ivm.informal") },
  { value: "academic", label: t("ivm.academic") },
  { value: "friendly", label: t("ivm.friendly") },
  { value: "authoritative", label: t("ivm.authoritative") },
  ];
  const voiceCharacters = [
  { value: "male_deep", label: t("ivm.male_deep") },
  { value: "male_bright", label: t("ivm.male_bright") },
  { value: "female_warm", label: t("ivm.female_warm") },
  { value: "female_clear", label: t("ivm.female_clear") },
  { value: "neutral", label: t("ivm.neutral") },
  ];
  const { user } = useAuth();
  const profiles = trpc.voiceMod.list.useQuery(undefined, { enabled: !!user });
  const createProfile = trpc.voiceMod.create.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success(t("ivm.profile_created")); },
  });
  const updateProfile = trpc.voiceMod.update.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success(t("ivm.profile_updated")); },
  });
  const deleteProfile = trpc.voiceMod.delete.useMutation({
    onSuccess: () => { profiles.refetch(); toast.success(t("ivm.profile_deleted")); },
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
        sampleText: t("ivm.sample_text"),
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
      toast.success(t("ivm.preview_generated"));
    } catch {
      toast.info(t("ivm.voice_preview_available"));
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
        <Label>{t("ivm.pitch_shift_label")} ({t("ivm.pitch_shift_unit")}): {data.pitchShift > 0 ? `+${data.pitchShift}` : data.pitchShift}</Label>
        <Slider min={-12} max={12} step={1} value={[data.pitchShift]} onValueChange={v => setData({ ...data, pitchShift: v[0] })} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">-12({t("ivm.very_low")}) ~ +12({t("ivm.very_high")})</p>
      </div>
      <div>
        <Label>{t("ivm.speed_label")}: {data.speedPercent}%</Label>
        <Slider min={50} max={200} step={5} value={[data.speedPercent]} onValueChange={v => setData({ ...data, speedPercent: v[0] })} className="mt-2" />
      </div>
      <div>
        <Label>{t("ivm.tone_warmth_label")}: {data.toneWarmth > 0 ? `+${data.toneWarmth}` : data.toneWarmth}</Label>
        <Slider min={-100} max={100} step={10} value={[data.toneWarmth]} onValueChange={v => setData({ ...data, toneWarmth: v[0] })} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">-100({t("ivm.cold")}) ~ +100({t("ivm.warm")})</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("ivm.speaking_style_label")}</Label>
          <Select value={data.speakingStyle} onValueChange={v => setData({ ...data, speakingStyle: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {speakingStyles.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("ivm.voice_character_label")}</Label>
          <Select value={data.voiceCharacter} onValueChange={v => setData({ ...data, voiceCharacter: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {voiceCharacters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>{t("ivm.style_prompt_label")} ({t("ivm.optional")})</Label>
        <Textarea value={data.stylePrompt} onChange={e => setData({ ...data, stylePrompt: e.target.value })} placeholder={t("ivm.style_prompt_placeholder")} rows={3} />
      </div>
    </div>
  );

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
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"><Volume2 className="h-6 w-6" /> {t("ivm.title")}</h1>
            <p className="text-white/70 mt-1">{t("ivm.description")}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{t("ivm.ai_system_title")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("ivm.ai_system_desc1")}
                  {t("ivm.ai_system_desc2")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="mb-6"><Plus className="h-4 w-4 mr-2" /> {t("ivm.new_voice_profile")}</Button>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-6 space-y-5">
              <div>
                <Label>{t("ivm.profile_name_label")}</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("ivm.profile_name_placeholder")} />
              </div>
              <VoiceFormFields data={form} setData={setForm} />
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!form.name || createProfile.isPending}>
                  {createProfile.isPending ? t("ivm.creating") : t("ivm.create")}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>{t("ivm.cancel")}</Button>
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
                      {profile.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">{t("ivm.default_tag")}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("ivm.pitch_label")}: {profile.pitchShift > 0 ? `+${profile.pitchShift}` : profile.pitchShift}{t("ivm.pitch_unit")} · 
                      {t("ivm.speed_label")}: {profile.speedPercent ?? 100}% · 
                      {t("ivm.character_label")}: {voiceCharacters.find(c => c.value === profile.voiceCharacter)?.label || t("ivm.default")} · 
                      {t("ivm.style_label")}: {speakingStyles.find(s => s.value === profile.speakingStyle)?.label || t("ivm.default")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(profile.id)} disabled={previewVoice.isPending}>
                      <Play className="h-3 w-3 mr-1" /> {t("ivm.preview")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateProfile.mutate({ id: profile.id, isDefault: true })}>
                      <Wand2 className="h-3 w-3 mr-1" /> {t("ivm.set_default")}
                    </Button>
                    {editingId !== profile.id && (
                      <Button variant="outline" size="sm" onClick={() => startEdit(profile)}>{t("ivm.edit")}</Button>
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
                      <Button size="sm" onClick={() => saveEdit(profile.id)}><Save className="h-3 w-3 mr-1" /> {t("ivm.save")}</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(null); }}>{t("ivm.cancel")}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {profiles.data?.length === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              <p>{t("ivm.no_profiles")}</p>
              <p className="text-sm mt-1">{t("ivm.click_new_profile_button")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
