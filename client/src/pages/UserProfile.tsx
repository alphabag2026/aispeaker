import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  User, Zap, Image, Calendar, Edit3, Save, X,
  Sparkles, ArrowRight, Shield, Globe,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserProfile() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: !!user });
  const updateMut = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(t("userProfile.updateSuccess"));
      setEditing(false);
      profileQuery.refetch();
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">{t("userProfile.loginRequired")}</p>
          <Link href="/">
            <Button>{t("userProfile.home")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const data = profileQuery.data;
  const maxCredits = 1000;
  const creditPercent = data ? Math.min((data.credits / maxCredits) * 100, 100) : 0;

  const startEdit = () => {
    setName(data?.user.name || "");
    setBio(data?.user.bio || "");
    setEditing(true);
  };

  const saveProfile = () => {
    updateMut.mutate({ name, bio });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t("userProfile.myProfile")}</h1>
          <Link href="/ai-studio">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Studio
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-white" />
                </div>
                {editing ? (
                  <div className="w-full space-y-3">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("userProfile.namePlaceholder")} />
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("userProfile.bioPlaceholder")} rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveProfile} disabled={updateMut.isPending}>
                        <Save className="h-3 w-3 mr-1" /> {t("userProfile.save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="h-3 w-3 mr-1" /> {t("userProfile.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">{data?.user.name || user.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{data?.user.bio || t("userProfile.bioDefault")}</p>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={startEdit}>
                      <Edit3 className="h-3 w-3 mr-1" /> {t("userProfile.edit")}
                    </Button>
                  </>
                )}
                <div className="w-full mt-4 pt-4 border-t space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("userProfile.role")}</span>
                    <Badge variant="secondary">{data?.user.role || user.role}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("userProfile.language")}</span>
                    <span>{data?.user.preferredLang || "ko"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("userProfile.joined")}</span>
                    <span>{data?.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString("ko-KR") : "-"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credits Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {t("userProfile.creditStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mb-3">
                  <span className="text-4xl font-bold">{data?.credits ?? 0}</span>
                  <span className="text-muted-foreground mb-1">/ {maxCredits}</span>
                </div>
                <Progress value={creditPercent} className="h-2 mb-4" />
                <div className="flex gap-3">
                  <Link href="/credits">
                    <Button size="sm" variant="outline">{t("userProfile.usageHistory")}</Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="sm">{t("userProfile.charge")} <ArrowRight className="h-3 w-3 ml-1" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Generation Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  {t("userProfile.aiActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <p className="text-3xl font-bold">{data?.generationCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("userProfile.totalGenerations")}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{data?.recentGallery?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("userProfile.galleryShares")}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href="/ai-history">
                    <Button size="sm" variant="outline">{t("userProfile.viewHistory")}</Button>
                  </Link>
                  <Link href="/community">
                    <Button size="sm" variant="outline">
                      <Image className="h-3 w-3 mr-1" /> {t("userProfile.myGallery")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Gallery */}
            {data?.recentGallery && data.recentGallery.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("userProfile.recentWorks")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {data.recentGallery.slice(0, 6).map((post: any) => (
                      <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        {post.mediaType === "image" ? (
                          <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            {post.mediaType}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
