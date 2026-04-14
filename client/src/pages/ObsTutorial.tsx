import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ArrowLeft, Monitor, Camera, Mic, Settings, Download, Play,
  CheckCircle2, AlertTriangle, ExternalLink, Layers, Volume2,
  UserCircle2, Video, Wifi, ChevronRight, Info
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function ObsTutorial() {
  const { t } = useTranslation();

  const steps = {
    obs: [
      {
        title: t("ot.step1Title"),
        icon: Download,
        content: t("ot.step1Content"),
        details: [
          t("ot.step1Detail1"),
          t("ot.step1Detail2"),
          t("ot.step1Detail3"),
          t("ot.step1Detail4"),
        ],
        tip: t("ot.step1Tip"),
      },
      {
        title: t("ot.step2Title"),
        icon: Layers,
        content: t("ot.step2Content"),
        details: [
          t("ot.step2Detail1"),
          t("ot.step2Detail2"),
          t("ot.step2Detail3"),
          t("ot.step2Detail4"),
          t("ot.step2Detail5"),
        ],
        tip: t("ot.step2Tip"),
      },
      {
        title: t("ot.step3Title"),
        icon: UserCircle2,
        content: t("ot.step3Content"),
        details: [
          t("ot.step3Detail1"),
          t("ot.step3Detail2"),
          t("ot.step3Detail3"),
          t("ot.step3Detail4"),
          t("ot.step3Detail5"),
        ],
        tip: t("ot.step3Tip"),
      },
      {
        title: t("ot.step4Title"),
        icon: Volume2,
        content: t("ot.step4Content"),
        details: [
          t("ot.step4Detail1"),
          t("ot.step4Detail2"),
          t("ot.step4Detail3"),
          t("ot.step4Detail4"),
          t("ot.step4Detail5"),
        ],
        tip: t("ot.step4Tip"),
      },
      {
        title: t("ot.step5Title"),
        icon: Camera,
        content: t("ot.step5Content"),
        details: [
          t("ot.step5Detail1"),
          t("ot.step5Detail2"),
          t("ot.step5Detail3"),
          t("ot.step5Detail4"),
          t("ot.step5Detail5"),
        ],
        tip: t("ot.step5Tip"),
      },
    ],
    zoom: [
      {
        title: t("ot.zoomTitle"),
        icon: Video,
        details: [
          t("ot.zoomDetail1"),
          t("ot.zoomDetail2"),
          t("ot.zoomDetail3"),
          t("ot.zoomDetail4"),
          t("ot.zoomDetail5"),
        ],
      },
      {
        title: t("ot.meetTitle"),
        icon: Video,
        details: [
          t("ot.meetDetail1"),
          t("ot.meetDetail2"),
          t("ot.meetDetail3"),
          t("ot.meetDetail4"),
          t("ot.meetDetail5"),
        ],
      },
      {
        title: t("ot.webexTitle"),
        icon: Video,
        details: [
          t("ot.webexDetail1"),
          t("ot.webexDetail2"),
          t("ot.webexDetail3"),
        ],
      },
      {
        title: t("ot.tencentTitle"),
        icon: Video,
        details: [
          t("ot.tencentDetail1"),
          t("ot.tencentDetail2"),
          t("ot.tencentDetail3"),
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
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
              <Link href="/instructor">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"><ArrowLeft className="w-4 h-4 mr-1" /> {t("ot.dashboard")}</Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{t("ot.pageTitle")}</h1>
                <p className="text-white/70 mt-1">{t("ot.pageDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Overview */}
        <Card className="mb-8 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 border-green-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {[
                { icon: Settings, label: t("ot.overviewLabel1"), desc: t("ot.overviewDesc1") },
                { icon: UserCircle2, label: t("ot.overviewLabel2"), desc: t("ot.overviewDesc2") },
                { icon: Mic, label: t("ot.overviewLabel3"), desc: t("ot.overviewDesc3") },
                { icon: Camera, label: t("ot.overviewLabel4"), desc: t("ot.overviewDesc4") },
                { icon: Video, label: t("ot.overviewLabel5"), desc: t("ot.overviewDesc5") },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                      <step.icon className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-xs font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.desc}</span>
                  </div>
                  {i < 4 && <ChevronRight className="w-5 h-5 text-muted-foreground mx-2 mt-[-20px]" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <Card className="mb-8 border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400"><AlertTriangle className="w-5 h-5" /> {t("ot.prerequisitesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Download className="w-4 h-4 text-green-400" />{t("ot.requiredSoftware")}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• OBS Studio v30+ (obsproject.com)</li>
                  <li>• {t("ot.softwareItem1")}</li>
                  <li>• {t("ot.softwareItem2")}</li>
                </ul>
              </div>
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-violet-400" />{t("ot.platformSettings")}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t("ot.settingsItem1")}</li>
                  <li>• {t("ot.settingsItem2")}</li>
                  <li>• {t("ot.settingsItem3")}</li>
                </ul>
              </div>
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Wifi className="w-4 h-4 text-blue-400" />{t("ot.systemRequirements")}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t("ot.requirementsItem1")}</li>
                  <li>• {t("ot.requirementsItem2")}</li>
                  <li>• {t("ot.requirementsItem3")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="obs">
          <TabsList className="mb-6">
            <TabsTrigger value="obs"><Monitor className="w-4 h-4 mr-2" />{t("ot.tabObs")}</TabsTrigger>
            <TabsTrigger value="platforms"><Video className="w-4 h-4 mr-2" />{t("ot.tabPlatforms")}</TabsTrigger>
            <TabsTrigger value="tips"><Info className="w-4 h-4 mr-2" />{t("ot.tabTips")}</TabsTrigger>
          </TabsList>

          <TabsContent value="obs">
            <div className="space-y-6">
              {steps.obs.map((step, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-green-400" />
                      </div>
                      {step.title}
                    </CardTitle>
                    <CardDescription>{step.content}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {step.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                    {step.tip && (
                      <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-sm text-green-300 flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          <span><strong>{t("ot.tipLabel")}</strong> {step.tip}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="platforms">
            <div className="space-y-6">
              {steps.zoom.map((platform, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <platform.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      {platform.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {platform.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle>{t("ot.advancedTipsTitle")}</CardTitle>
                <CardDescription>{t("ot.advancedTipsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-card/50 rounded-lg">
                  <h4 className="font-medium mb-2">{t("ot.tip1Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("ot.tip1Content")}</p>
                </div>
                <div className="p-4 bg-card/50 rounded-lg">
                  <h4 className="font-medium mb-2">{t("ot.tip2Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("ot.tip2Content")}</p>
                </div>
                <div className="p-4 bg-card/50 rounded-lg">
                  <h4 className="font-medium mb-2">{t("ot.tip3Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("ot.tip3Content")}</p>
                </div>
                <div className="p-4 bg-card/50 rounded-lg">
                  <h4 className="font-medium mb-2">{t("ot.tip4Title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("ot.tip4Content")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
