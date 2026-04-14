import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Radio, Plus, Play, Pause, Square, Users, Clock, Copy, ExternalLink,
  ArrowLeft, Tv, MessageSquare, Eye, Monitor
} from "lucide-react";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import { useTranslation } from "@/contexts/LanguageContext";

export default function BroadcastManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedScript, setSelectedScript] = useState("");
  const [ttsVoice, setTtsVoice] = useState("");

  const { data: voicesData } = trpc.tts.voices.useQuery();
  const TTS_VOICES = useMemo(() => voicesData || [], [voicesData]);

  useEffect(() => {
    if (TTS_VOICES.length > 0 && !ttsVoice) setTtsVoice(TTS_VOICES[0].id);
  }, [TTS_VOICES]);
  const [filter, setFilter] = useState<"all" | "scheduled" | "live" | "ended">("all");

  const scripts = trpc.script.list.useQuery(undefined, { enabled: !!user });
  const broadcasts = trpc.broadcast.list.useQuery(undefined, { enabled: !!user });
  const createBroadcast = trpc.broadcast.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${t("bm.broadcast_created_code")}: ${data.roomCode}`);
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setSelectedScript("");
      broadcasts.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const readyScripts = scripts.data?.filter((s: any) => s.status === "ready") || [];

  const filteredBroadcasts = broadcasts.data?.filter((item: any) => {
    if (filter === "all") return true;
    return item.broadcast.status === filter;
  }) || [];

  const handleCreate = () => {
    if (!selectedScript || !title.trim()) {
      toast.error(t("bm.enter_script_title"));
      return;
    }
    createBroadcast.mutate({
      scriptId: parseInt(selectedScript),
      title: title.trim(),
      description: description.trim() || undefined,
      ttsVoiceId: ttsVoice,
    });
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("bm.code_copied"));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled": return <Badge variant="outline" className="text-blue-400 border-blue-400"><Clock className="w-3 h-3 mr-1" />{t("bm.scheduled")}</Badge>;
      case "live": return <Badge className="bg-red-500 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" />LIVE</Badge>;
      case "paused": return <Badge variant="outline" className="text-yellow-400 border-yellow-400"><Pause className="w-3 h-3 mr-1" />{t("bm.paused")}</Badge>;
      case "ended": return <Badge variant="secondary"><Square className="w-3 h-3 mr-1" />{t("bm.ended")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">{t("bm.login_required")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-broadcast-VqgzPLgr6PKLpmSfakoS73.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate("/instructor")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <Tv className="w-8 h-8" />
              {t("bm.live_broadcast_management")}
            </h1>
            <p className="text-white/70 text-lg mt-2">{t("bm.broadcast_management_description")}</p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-end gap-3 mb-8">
          <Button variant="outline" className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/10" onClick={() => navigate("/browser-studio")}>
            <Monitor className="w-4 h-4" />
            {t("bm.browser_studio")}
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("bm.create_new_broadcast")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("bm.create_new_live_broadcast")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("bm.broadcast_title")}</label>
                  <Input
                    placeholder={t("bm.title_placeholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("bm.broadcast_description")}</label>
                  <Textarea
                    placeholder={t("bm.broadcast_desc_placeholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("bm.select_lecture_script")}</label>
                  <Select value={selectedScript} onValueChange={setSelectedScript}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("bm.select_script")} />
                    </SelectTrigger>
                    <SelectContent>
                      {readyScripts.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.title} ({t("bm.section_count", { count: s.sectionCount })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {readyScripts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("bm.no_ready_scripts")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("bm.tts_voice")}</label>
                  <div className="flex items-center gap-2">
                    <Select value={ttsVoice} onValueChange={setTtsVoice}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TTS_VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} - {v.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <VoicePreviewButton voiceId={ttsVoice} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>{t("bm.cancel")}</Button>
                <Button onClick={handleCreate} disabled={createBroadcast.isPending}>
                  {createBroadcast.isPending ? t("bm.creating") : t("bm.create_broadcast")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: t("bm.all") },
            { key: "live", label: t("bm.broadcasting") },
            { key: "scheduled", label: t("bm.scheduled_tab") },
            { key: "ended", label: t("bm.ended_tab") },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key as any)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {filteredBroadcasts.length === 0 ? (
          <EmptyState
            type="broadcast"
            title={filter === "all" ? t("bm.no_broadcasts") : `${filter === "live" ? t("bm.live") : filter === "scheduled" ? t("bm.scheduled_broadcast") : t("bm.ended_broadcast")} ${t("bm.no_broadcasts_suffix")}`}
            description={t("bm.select_script_start")}
            actionLabel={t("bm.create_first")}
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <div className="grid gap-4">
            {filteredBroadcasts.map((item: any) => {
              const b = item.broadcast;
              const s = item.script;
              return (
                <Card key={b.id} className={`transition-all ${b.status === "live" ? "border-red-500/50 shadow-red-500/10 shadow-lg" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(b.status)}
                          <h3 className="text-lg font-semibold">{b.title}</h3>
                        </div>
                        {b.description && (
                          <p className="text-sm text-muted-foreground mb-3">{b.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {t("bm.code")}: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{b.roomCode}</code>
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyRoomCode(b.roomCode)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {t("bm.viewers", { count: b.currentViewers || 0 })}
                            {b.peakViewers ? ` (${t("bm.peak_viewers", { count: b.peakViewers })})` : ""}
                          </span>
                          {s && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {t("bm.section_count", { count: s.sectionCount || 0 })}
                            </span>
                          )}
                          <span>
                            {new Date(b.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(b.status === "scheduled" || b.status === "live" || b.status === "paused") && (
                          <Button
                            onClick={() => navigate(`/broadcast/studio/${b.id}`)}
                            className="gap-2"
                            variant={b.status === "live" ? "destructive" : "default"}
                          >
                            {b.status === "live" ? <Radio className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {b.status === "live" ? t("bm.studio") : t("bm.start_broadcast")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/broadcast/view/${b.roomCode}`)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {t("bm.viewer_view")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            {t("bm.live_broadcasts_now")}
          </h2>
          <LiveBroadcastList />
        </div>
      </div>
    </div>
  );
}

function LiveBroadcastList() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const liveBroadcasts = trpc.broadcast.liveList.useQuery(undefined, {
    refetchInterval: 5000,
  });

  if (!liveBroadcasts.data || liveBroadcasts.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("bm.no_live_broadcasts_now")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {liveBroadcasts.data.map((item: any) => {
        const b = item.broadcast;
        const instructor = item.instructor;
        return (
          <Card key={b.id} className="border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer"
            onClick={() => navigate(`/broadcast/view/${b.roomCode}`)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-red-500 text-white animate-pulse text-xs">
                  <Radio className="w-3 h-3 mr-1" />LIVE
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />{b.currentViewers || 0}
                </span>
              </div>
              <CardTitle className="text-base mt-2">{b.title}</CardTitle>
              <CardDescription>
                {instructor?.name || t("bm.instructor")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gap-2" variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                {t("bm.watch")}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
