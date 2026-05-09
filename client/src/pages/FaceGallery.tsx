import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Crown, Globe, Sparkles, User, ChevronRight, Volume2, Mic, Pencil, Loader2, Star, UserCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLocation } from "wouter";

import { useTranslation } from "@/contexts/LanguageContext";

export default function FaceGallery() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const CATEGORIES = [
    { value: "all", label: t("fg.all") },
    { value: "professional", label: t("fg.expert") },
    { value: "academic", label: t("fg.academic") },
    { value: "corporate", label: t("fg.corporate") },
    { value: "casual", label: t("fg.casual") },
    { value: "creative", label: t("fg.creative") },
  ];

  const GENDERS = [
    { value: "all", label: t("fg.all") },
    { value: "male", label: t("fg.male") },
    { value: "female", label: t("fg.female") },
  ];

  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFace, setSelectedFace] = useState<any>(null);
  const [editingAvatarId, setEditingAvatarId] = useState<number | null>(null);
  const [newVoiceId, setNewVoiceId] = useState("");
  const [activeTab, setActiveTab] = useState<"gallery" | "my">("gallery");
  const [editingDefaultVoiceId, setEditingDefaultVoiceId] = useState<number | null>(null);
  const [defaultVoiceSelection, setDefaultVoiceSelection] = useState("");

  const { data: faces = [], isLoading } = trpc.sampleFace.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    gender: selectedGender === "all" ? undefined : selectedGender,
  });

  // My avatars queries
  const myAvatarsQuery = trpc.userAvatar.list.useQuery({ sortBy: "favorite" }, { enabled: !!user });
  const myAvatars = myAvatarsQuery.data || [];
  const toggleFavorite = trpc.userAvatar.toggleFavorite.useMutation({
    onSuccess: () => myAvatarsQuery.refetch(),
  });
  const updateDefaultVoice = trpc.userAvatar.updateDefaultVoice.useMutation({
    onSuccess: () => {
      toast.success(t("fg.default_voice_saved"));
      setEditingDefaultVoiceId(null);
      setDefaultVoiceSelection("");
      myAvatarsQuery.refetch();
    },
    onError: () => toast.error(t("fg.default_voice_failed")),
  });

   const voicesQuery = trpc.tts.voices.useQuery(undefined, { enabled: !!selectedFace || (activeTab === "my" && !!user) });
  const voices = voicesQuery.data || [];
  const voiceClonesQuery = trpc.voiceClone.list.useQuery(undefined, { enabled: (!!selectedFace || activeTab === "my") && !!user });
  const myVoiceClones = (voiceClonesQuery.data?.filter((c: any) => c.status === "ready") || []) as any[];

  // Query avatars using this face
  const avatarsByFaceQuery = trpc.sampleFace.avatarsByFace.useQuery(
    { sampleFaceId: selectedFace?.id },
    { enabled: !!selectedFace && !!user }
  );
  const avatarsUsingFace = avatarsByFaceQuery.data || [];

  const updateAvatarMut = trpc.lectureBuilder.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success(t("fg.voice_changed_success") || "음성이 변경되었습니다.");
      setEditingAvatarId(null);
      setNewVoiceId("");
      avatarsByFaceQuery.refetch();
    },
    onError: () => toast.error(t("fg.voice_change_failed") || "음성 변경에 실패했습니다."),
  });

  const filteredFaces = faces.filter((face: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      face.name.toLowerCase().includes(q) ||
      face.description?.toLowerCase().includes(q) ||
      (face.tags as string[])?.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const getVoiceName = (voiceId: string | null, cloneId: number | null) => {
    if (cloneId) {
      const clone = myVoiceClones.find((c: any) => c.id === cloneId);
      return clone ? `🎤 ${clone.name}` : `🎤 Clone #${cloneId}`;
    }
    if (voiceId) {
      const voice = voices.find((v: any) => v.id === voiceId);
      return voice ? voice.name : voiceId;
    }
    return t("fg.no_voice") || "미설정";
  };

  const handleVoiceChange = (avatarId: number) => {
    if (!newVoiceId) return;
    const isClone = newVoiceId.startsWith("clone-");
    if (isClone) {
      const cloneId = parseInt(newVoiceId.replace("clone-", ""));
      const clone = myVoiceClones.find((c: any) => c.id === cloneId);
      updateAvatarMut.mutate({
        id: avatarId,
        ttsVoiceId: clone?.matchedVoiceId || "Kore",
        voiceCloneId: cloneId,
      });
    } else {
      updateAvatarMut.mutate({
        id: avatarId,
        ttsVoiceId: newVoiceId,
        voiceCloneId: null,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTEydjRoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">{t("fg.title")}</h1>
              <p className="text-purple-100 mt-1">{t("fg.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> {faces.length}+ {t("fg.presets")}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Globe className="w-3 h-3 mr-1" /> {t("fg.multilingual_support")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Tabs: Gallery / My Avatars */}
        {user && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
            <TabsList>
              <TabsTrigger value="gallery" className="gap-1.5"><Globe className="w-4 h-4" />{t("fg.gallery_tab")}</TabsTrigger>
              <TabsTrigger value="my" className="gap-1.5"><UserCircle2 className="w-4 h-4" />{t("fg.my_avatars_tab")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* My Avatars Tab */}
        {activeTab === "my" && user && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("fg.my_avatars_title")}</h3>
              <Badge variant="outline">{myAvatars.length} {t("fg.avatars_count")}</Badge>
            </div>
            {myAvatars.length === 0 ? (
              <div className="text-center py-16">
                <UserCircle2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">{t("fg.no_my_avatars")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {myAvatars.map((av: any) => (
                  <Card key={av.id} className="overflow-hidden">
                    <div className="relative aspect-square">
                      <img src={av.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                      {/* Favorite toggle */}
                      <button
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${av.isFavorite ? "bg-yellow-400 text-yellow-900" : "bg-black/40 text-white hover:bg-yellow-400 hover:text-yellow-900"}`}
                        onClick={() => toggleFavorite.mutate({ id: av.id })}
                      >
                        <Star className={`w-4 h-4 ${av.isFavorite ? "fill-current" : ""}`} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-3">
                        <h4 className="text-sm font-medium text-white">{av.name}</h4>
                        <p className="text-[10px] text-white/70">{av.type === "ai" ? "AI" : av.type === "photo" ? t("fg.photo") : t("fg.custom")}</p>
                      </div>
                    </div>
                    <CardContent className="p-3 space-y-2">
                      {/* Default role selector */}
                      <div className="text-xs">
                        <span className="text-muted-foreground">{t("fg.default_role")}:</span>
                        <Select value={av.defaultRole || "instructor"} onValueChange={(val) => {
                          updateDefaultVoice.mutate({ id: av.id, defaultTtsVoiceId: av.defaultTtsVoiceId || null, defaultVoiceCloneId: av.defaultVoiceCloneId || null, defaultRole: val as any });
                        }}>
                          <SelectTrigger className="h-7 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instructor">{t("fg.role_instructor")}</SelectItem>
                            <SelectItem value="host">{t("fg.role_host")}</SelectItem>
                            <SelectItem value="guest">{t("fg.role_guest")}</SelectItem>
                            <SelectItem value="narrator">{t("fg.role_narrator")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Default voice display/edit */}
                      <div className="text-xs">
                        <span className="text-muted-foreground">{t("fg.default_voice")}:</span>
                        {editingDefaultVoiceId === av.id ? (
                          <div className="mt-1.5 space-y-2">
                            <Select value={defaultVoiceSelection} onValueChange={setDefaultVoiceSelection}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t("fg.select_voice")} />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {myVoiceClones.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-[10px] font-semibold text-primary border-b">🎤 {t("fg.my_clone_voices")}</div>
                                    {myVoiceClones.map((clone: any) => (
                                      <SelectItem key={`clone-${clone.id}`} value={`clone-${clone.id}`}>🎤 {clone.name}</SelectItem>
                                    ))}
                                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-t">🌐 {t("fg.preset_voices")}</div>
                                  </>
                                )}
                                {voices.map((v: any) => (
                                  <SelectItem key={v.id} value={v.id}>{v.gender === "female" ? "♀" : "♂"} {v.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-7 text-xs flex-1" disabled={!defaultVoiceSelection || updateDefaultVoice.isPending}
                                onClick={() => {
                                  const isClone = defaultVoiceSelection.startsWith("clone-");
                                  if (isClone) {
                                    const cloneId = parseInt(defaultVoiceSelection.replace("clone-", ""));
                                    const clone = myVoiceClones.find((c: any) => c.id === cloneId);
                                    updateDefaultVoice.mutate({ id: av.id, defaultTtsVoiceId: clone?.matchedVoiceId || "Kore", defaultVoiceCloneId: cloneId });
                                  } else {
                                    updateDefaultVoice.mutate({ id: av.id, defaultTtsVoiceId: defaultVoiceSelection, defaultVoiceCloneId: null });
                                  }
                                }}>
                                {updateDefaultVoice.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : t("fg.save")}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingDefaultVoiceId(null); setDefaultVoiceSelection(""); }}>
                                {t("fg.cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-medium">
                              {av.defaultVoiceCloneId
                                ? getVoiceName(av.defaultTtsVoiceId, av.defaultVoiceCloneId)
                                : av.defaultTtsVoiceId
                                  ? getVoiceName(av.defaultTtsVoiceId, null)
                                  : t("fg.no_voice")}
                            </span>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              onClick={() => {
                                setEditingDefaultVoiceId(av.id);
                                setDefaultVoiceSelection(av.defaultVoiceCloneId ? `clone-${av.defaultVoiceCloneId}` : (av.defaultTtsVoiceId || ""));
                              }}>
                              <Pencil className="w-3 h-3" /> {t("fg.set_default_voice")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {(activeTab === "gallery" || !user) && (
        <>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("fg.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("fg.category_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder={t("fg.gender_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFaces.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">{t("fg.no_results_title")}</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">{t("fg.no_results_subtitle")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredFaces.map((face: any) => (
              <Card
                key={face.id}
                className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
                onClick={() => setSelectedFace(face)}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-muted/50 to-muted">
                  <img
                    src={face.imageUrl}
                    alt={face.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {face.isPremium && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-500/90 text-white border-0 shadow-lg">
                        <Crown className="w-3 h-3 mr-1" /> PRO
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                    <h3 className="font-semibold text-white text-sm">{face.name}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{face.category} · {face.ageRange}</p>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{face.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(face.tags as string[])?.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {/* Face Detail Dialog */}
      <Dialog open={!!selectedFace} onOpenChange={() => { setSelectedFace(null); setEditingAvatarId(null); setNewVoiceId(""); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFace?.name}
              {selectedFace?.isPremium && (
                <Badge className="bg-amber-500 text-white border-0">
                  <Crown className="w-3 h-3 mr-1" /> PRO
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFace && (
            <div className="space-y-4">
              <div className="aspect-square max-h-[300px] mx-auto overflow-hidden rounded-xl">
                <img
                  src={selectedFace.imageUrl}
                  alt={selectedFace.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("fg.category")}</span>
                    <p className="font-medium capitalize">{selectedFace.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("fg.gender")}</span>
                    <p className="font-medium">{selectedFace.gender === "male" ? t("fg.male") : t("fg.female")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("fg.age_range")}</span>
                    <p className="font-medium">{selectedFace.ageRange}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("fg.supported_languages")}</span>
                    <p className="font-medium">{(selectedFace.languages as string[])?.join(", ")}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedFace.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(selectedFace.tags as string[])?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Avatars using this face - voice management */}
              {user && avatarsUsingFace.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    {t("fg.matched_voices_title") || "이 얼굴을 사용 중인 아바타"}
                  </h4>
                  <div className="space-y-3">
                    {avatarsUsingFace.map((avatar: any) => (
                      <div key={avatar.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium">{avatar.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({avatar.projectTitle})</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{avatar.role}</Badge>
                        </div>
                        
                        {editingAvatarId === avatar.id ? (
                          <div className="mt-2 space-y-2">
                            <Select value={newVoiceId} onValueChange={setNewVoiceId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t("fg.select_voice") || "음성 선택"} />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {myVoiceClones.length > 0 && (
                                  <>
                                    <div className="px-2 py-1 text-[10px] font-semibold text-primary border-b">
                                      🎤 {t("fg.my_clone_voices") || "내 클론 음성"}
                                    </div>
                                    {myVoiceClones.map((clone: any) => (
                                      <SelectItem key={`clone-${clone.id}`} value={`clone-${clone.id}`}>
                                        🎤 {clone.name}
                                      </SelectItem>
                                    ))}
                                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-t">
                                      🌐 {t("fg.preset_voices") || "프리셋 음성"}
                                    </div>
                                  </>
                                )}
                                {myVoiceClones.length === 0 && (
                                  <div className="px-3 py-2 border-b bg-muted/30">
                                    <p className="text-[10px] text-muted-foreground mb-1">{t("fg.no_clone_voice") || "클론 음성이 없습니다."}</p>
                                    <a href="/ai-studio/voice-clone" className="text-[10px] text-primary hover:underline font-medium">
                                      + {t("fg.create_clone_voice") || "음성 클론 만들기"}
                                    </a>
                                  </div>
                                )}
                                {voices.map((v: any) => (
                                  <SelectItem key={v.id} value={v.id}>
                                    {v.gender === "female" ? "♀" : "♂"} {v.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs flex-1" disabled={!newVoiceId || updateAvatarMut.isPending}
                                onClick={() => handleVoiceChange(avatar.id)}>
                                {updateAvatarMut.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                {t("fg.save") || "저장"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => { setEditingAvatarId(null); setNewVoiceId(""); }}>
                                {t("fg.cancel") || "취소"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {getVoiceName(avatar.ttsVoiceId, avatar.voiceCloneId)}
                              </span>
                              <VoicePreviewButton voiceId={avatar.ttsVoiceId || "Kore"} size="sm" variant="ghost" />
                            </div>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1"
                              onClick={() => { setEditingAvatarId(avatar.id); setNewVoiceId(avatar.voiceCloneId ? `clone-${avatar.voiceCloneId}` : (avatar.ttsVoiceId || "")); }}>
                              <Pencil className="w-3 h-3" /> {t("fg.change_voice") || "변경"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No avatars using this face */}
              {user && avatarsUsingFace.length === 0 && !avatarsByFaceQuery.isLoading && (
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    {t("fg.no_avatars_using_face") || "이 얼굴을 사용 중인 아바타가 없습니다."}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  if (!user) {
                    toast.error(t("fg.login_required"));
                    return;
                  }
                  if (selectedFace.isPremium) {
                    toast.info(t("fg.pro_required"));
                    return;
                  }
                  toast.success(t("fg.face_selected_toast", { name: selectedFace.name }));
                  setSelectedFace(null);
                }}
              >
                {t("fg.select_this_face")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
