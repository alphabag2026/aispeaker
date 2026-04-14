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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Mic,
  Trash2,
  Edit,
  Upload,
  Loader2,
  Volume2,
  Brain,
  StopCircle,
} from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";

import { useTranslation } from "@/contexts/LanguageContext";
// Voices loaded from server API

export default function InstructorVoiceProfiles() {
  const { t } = useTranslation();
  const { data: profiles, refetch } = trpc.voiceProfile.list.useQuery();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState("");

  // Load voices from server
  const { data: voicesData } = trpc.tts.voices.useQuery();
  const ttsVoices = useMemo(() => voicesData || [], [voicesData]);

  // Set default voice when loaded
  useEffect(() => {
    if (ttsVoices.length > 0 && !ttsVoiceId) setTtsVoiceId(ttsVoices[0].id);
  }, [ttsVoices]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const createMutation = trpc.voiceProfile.create.useMutation({
    onSuccess: () => {
      toast.success(t("ivp.profile_created"));
      resetForm();
      setDialogOpen(false);
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.voiceProfile.update.useMutation({
    onSuccess: () => {
      toast.success(t("ivp.profile_updated"));
      resetForm();
      setDialogOpen(false);
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.voiceProfile.delete.useMutation({
    onSuccess: () => {
      toast.success(t("ivp.profile_deleted"));
      utils.voiceProfile.list.invalidate();
    },
  });

  const uploadSampleMutation = trpc.voiceProfile.uploadSample.useMutation({
    onSuccess: (data) => {
      toast.success(t("ivp.sample_uploaded"));
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Style analysis is handled server-side during upload

  const ttsMutation = trpc.tts.generate.useMutation();

  const resetForm = () => {
    setEditId(null);
    setName("");
    setVoiceDescription("");
    setTeachingStyle("");
    setTtsVoiceId(ttsVoices[0]?.id || "");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("ivp.enter_name"));
      return;
    }
    if (editId) {
      updateMutation.mutate({
        id: editId,
        name,
        voiceDescription: voiceDescription || undefined,
        teachingStyle: teachingStyle || undefined,
        ttsVoiceId,
      });
    } else {
      createMutation.mutate({
        name,
        voiceDescription: voiceDescription || undefined,
        teachingStyle: teachingStyle || undefined,
        ttsVoiceId,
      });
    }
  };

  const handleEdit = (profile: any) => {
    setEditId(profile.id);
    setName(profile.name);
    setVoiceDescription(profile.voiceDescription || "");
    setTeachingStyle(profile.teachingStyle || "");
    setTtsVoiceId(profile.ttsVoiceId || ttsVoices[0]?.id || "");
    setDialogOpen(true);
  };

  const handleRecordSample = async (profileId: number) => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadSampleMutation.mutate({
            profileId: profileId,
            audioData: base64,
            fileName: `sample-${Date.now()}.webm`,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info(t("ivp.recording_started"));
    } catch (err) {
      toast.error(t("ivp.mic_denied"));
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const handleAnalyze = (profileId: number) => {
    if (!voiceDescription && !teachingStyle) {
      toast.error(t("ivp.enter_style_first"));
      return;
    }
    setIsAnalyzing(true);
    updateMutation.mutate({
      id: profileId,
      voiceDescription,
      teachingStyle,
    }, {
      onSettled: () => setIsAnalyzing(false),
    });
  };

  const handlePreviewVoice = async (voiceId: string) => {
    try {
      const result = await ttsMutation.mutateAsync({
        text: t("ivp.preview_text"),
        voiceId,
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
    } catch (err) {
      toast.error(t("ivp.preview_failed"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
              <Link href="/instructor">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{t("ivp.manage_voice_profiles")}</h1>
            <p className="text-white/70 mt-1">{t("ivp.set_voice_and_style")}</p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-end mb-8">

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("ivp.new_profile")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? t("ivp.edit_profile") : t("ivp.new_voice_profile")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>{t("ivp.profile_name")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("ivp.name_placeholder")}
                  />
                </div>
                <div>
                  <Label>{t("ivp.tts_voice")}</Label>
                  <div className="flex items-center gap-2">
                    <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsVoices.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} - {v.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <VoicePreviewButton voiceId={ttsVoiceId} />
                  </div>
                </div>
                <div>
                  <Label>{t("ivp.voice_desc")}</Label>
                  <Textarea
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    placeholder={t("ivp.voice_desc_placeholder")}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t("ivp.teaching_style")}</Label>
                  <Textarea
                    value={teachingStyle}
                    onChange={(e) => setTeachingStyle(e.target.value)}
                    placeholder={t("ivp.teaching_style_placeholder")}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}>
                    {t("ivp.cancel")}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {editId ? t("ivp.edit") : t("ivp.create")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Voice Profiles List */}
        {profiles && profiles.length > 0 ? (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mic className="h-4 w-4 text-primary" />
                        {profile.name}
                        {profile.isDefault && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {t("ivp.default")}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("ivp.tts_voice_label")} {ttsVoices.find((v) => v.id === profile.ttsVoiceId)?.name || profile.ttsVoiceId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handlePreviewVoice(profile.ttsVoiceId || ttsVoices[0]?.id || "Kore")}
                        disabled={ttsMutation.isPending}
                      >
                        {ttsMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                        {t("ivp.preview")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleEdit(profile)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        {t("ivp.edit_button")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive"
                        onClick={() => {
                          if (confirm(t("ivp.confirm_delete"))) {
                            deleteMutation.mutate({ id: profile.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {profile.voiceDescription && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">{t("ivp.voice_trait")}</p>
                      <p className="text-sm">{profile.voiceDescription}</p>
                    </div>
                  )}

                  {profile.teachingStyle && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">{t("ivp.teaching_style")}</p>
                      <p className="text-sm">{profile.teachingStyle}</p>
                    </div>
                  )}

                  {profile.systemPrompt && (
                    <div className="mb-3 p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {t("ivp.ai_system_prompt")}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {profile.systemPrompt}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleRecordSample(profile.id)}
                      disabled={uploadSampleMutation.isPending}
                    >
                      {isRecording ? (
                        <>
                          <StopCircle className="h-3.5 w-3.5 text-destructive" />
                          {t("ivp.stop_recording")}
                        </>
                      ) : uploadSampleMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("ivp.analyzing")}
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          {t("ivp.record_voice")}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setVoiceDescription(profile.voiceDescription || "");
                        setTeachingStyle(profile.teachingStyle || "");
                        handleAnalyze(profile.id);
                      }}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Brain className="h-3.5 w-3.5" />
                      )}
                      {t("ivp.analyze_style")}
                    </Button>
                    {profile.sampleUrl && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {t("ivp.sample_uploaded_label")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("ivp.no_voice_profiles")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("ivp.create_first_profile_desc")}
            </p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("ivp.create_first_profile_button")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
