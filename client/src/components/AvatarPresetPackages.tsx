import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Mic2, Newspaper, Sparkles, Heart, Briefcase,
  Check, ChevronRight
} from "lucide-react";
import { useLanguage, registerTranslations } from "@/contexts/LanguageContext";

// ============ i18n ============
registerTranslations("ko", {
  "presetPkg.title": "아바타 프리셋 패키지",
  "presetPkg.desc": "목적에 맞는 프리셋을 선택하면 이름, 역할, 음성이 자동 설정됩니다.",
  "presetPkg.apply": "적용하기",
  "presetPkg.applied": "적용됨",
  "presetPkg.name": "이름",
  "presetPkg.role": "역할",
  "presetPkg.voice": "음성",
  "presetPkg.professional.title": "전문 강사",
  "presetPkg.professional.desc": "학술적이고 체계적인 강의 스타일",
  "presetPkg.friendly.title": "친근한 진행자",
  "presetPkg.friendly.desc": "편안하고 대화하듯 설명하는 스타일",
  "presetPkg.news.title": "뉴스 앵커",
  "presetPkg.news.desc": "명확하고 객관적인 전달 스타일",
  "presetPkg.creative.title": "크리에이티브 MC",
  "presetPkg.creative.desc": "에너지 넘치고 재미있는 진행 스타일",
  "presetPkg.counselor.title": "상담사",
  "presetPkg.counselor.desc": "따뜻하고 공감하는 대화 스타일",
  "presetPkg.business.title": "비즈니스 프레젠터",
  "presetPkg.business.desc": "설득력 있고 전문적인 발표 스타일",
});

registerTranslations("en", {
  "presetPkg.title": "Avatar Preset Packages",
  "presetPkg.desc": "Select a preset to auto-configure name, role, and voice for your purpose.",
  "presetPkg.apply": "Apply",
  "presetPkg.applied": "Applied",
  "presetPkg.name": "Name",
  "presetPkg.role": "Role",
  "presetPkg.voice": "Voice",
  "presetPkg.professional.title": "Professional Instructor",
  "presetPkg.professional.desc": "Academic and systematic lecture style",
  "presetPkg.friendly.title": "Friendly Host",
  "presetPkg.friendly.desc": "Casual and conversational explanation style",
  "presetPkg.news.title": "News Anchor",
  "presetPkg.news.desc": "Clear and objective delivery style",
  "presetPkg.creative.title": "Creative MC",
  "presetPkg.creative.desc": "Energetic and entertaining hosting style",
  "presetPkg.counselor.title": "Counselor",
  "presetPkg.counselor.desc": "Warm and empathetic conversational style",
  "presetPkg.business.title": "Business Presenter",
  "presetPkg.business.desc": "Persuasive and professional presentation style",
});

registerTranslations("ja", {
  "presetPkg.title": "アバタープリセットパッケージ",
  "presetPkg.desc": "プリセットを選択すると、名前、役割、音声が自動設定されます。",
  "presetPkg.apply": "適用",
  "presetPkg.applied": "適用済み",
  "presetPkg.name": "名前",
  "presetPkg.role": "役割",
  "presetPkg.voice": "音声",
  "presetPkg.professional.title": "プロ講師",
  "presetPkg.professional.desc": "学術的で体系的な講義スタイル",
  "presetPkg.friendly.title": "フレンドリーホスト",
  "presetPkg.friendly.desc": "カジュアルで会話的な説明スタイル",
  "presetPkg.news.title": "ニュースアンカー",
  "presetPkg.news.desc": "明確で客観的な伝達スタイル",
  "presetPkg.creative.title": "クリエイティブMC",
  "presetPkg.creative.desc": "エネルギッシュで楽しい進行スタイル",
  "presetPkg.counselor.title": "カウンセラー",
  "presetPkg.counselor.desc": "温かく共感的な会話スタイル",
  "presetPkg.business.title": "ビジネスプレゼンター",
  "presetPkg.business.desc": "説得力のある専門的なプレゼンスタイル",
});

registerTranslations("zh", {
  "presetPkg.title": "头像预设包",
  "presetPkg.desc": "选择预设后，名称、角色和语音将自动配置。",
  "presetPkg.apply": "应用",
  "presetPkg.applied": "已应用",
  "presetPkg.name": "名称",
  "presetPkg.role": "角色",
  "presetPkg.voice": "语音",
  "presetPkg.professional.title": "专业讲师",
  "presetPkg.professional.desc": "学术性和系统性的讲座风格",
  "presetPkg.friendly.title": "亲切主持人",
  "presetPkg.friendly.desc": "轻松对话式的解说风格",
  "presetPkg.news.title": "新闻主播",
  "presetPkg.news.desc": "清晰客观的传达风格",
  "presetPkg.creative.title": "创意MC",
  "presetPkg.creative.desc": "充满活力和趣味的主持风格",
  "presetPkg.counselor.title": "咨询师",
  "presetPkg.counselor.desc": "温暖共情的对话风格",
  "presetPkg.business.title": "商务演讲者",
  "presetPkg.business.desc": "有说服力的专业演讲风格",
});

export interface PresetPackage {
  id: string;
  titleKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  avatarName: string;
  role: "instructor" | "host" | "guest" | "narrator";
  voiceId: string;
  voiceName: string;
}

const PRESET_PACKAGES: PresetPackage[] = [
  {
    id: "professional",
    titleKey: "presetPkg.professional.title",
    descKey: "presetPkg.professional.desc",
    icon: GraduationCap,
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    avatarName: "Dr. Kim",
    role: "instructor",
    voiceId: "Kore",
    voiceName: "Kore (Calm)",
  },
  {
    id: "friendly",
    titleKey: "presetPkg.friendly.title",
    descKey: "presetPkg.friendly.desc",
    icon: Mic2,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    avatarName: "Mina",
    role: "host",
    voiceId: "Aoede",
    voiceName: "Aoede (Bright)",
  },
  {
    id: "news",
    titleKey: "presetPkg.news.title",
    descKey: "presetPkg.news.desc",
    icon: Newspaper,
    color: "from-slate-500/20 to-gray-500/20 border-slate-500/30",
    avatarName: "Alex Park",
    role: "narrator",
    voiceId: "Puck",
    voiceName: "Puck (Clear)",
  },
  {
    id: "creative",
    titleKey: "presetPkg.creative.title",
    descKey: "presetPkg.creative.desc",
    icon: Sparkles,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    avatarName: "DJ Luna",
    role: "host",
    voiceId: "Leda",
    voiceName: "Leda (Energetic)",
  },
  {
    id: "counselor",
    titleKey: "presetPkg.counselor.title",
    descKey: "presetPkg.counselor.desc",
    icon: Heart,
    color: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
    avatarName: "Sarah",
    role: "guest",
    voiceId: "Zephyr",
    voiceName: "Zephyr (Warm)",
  },
  {
    id: "business",
    titleKey: "presetPkg.business.title",
    descKey: "presetPkg.business.desc",
    icon: Briefcase,
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    avatarName: "James Lee",
    role: "instructor",
    voiceId: "Orus",
    voiceName: "Orus (Professional)",
  },
];

interface Props {
  onApply: (preset: { name: string; role: string; voiceId: string }) => void;
}

export default function AvatarPresetPackages({ onApply }: Props) {
  const { t } = useLanguage();
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (pkg: PresetPackage) => {
    onApply({
      name: pkg.avatarName,
      role: pkg.role,
      voiceId: pkg.voiceId,
    });
    setAppliedId(pkg.id);
  };

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">{t("presetPkg.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("presetPkg.desc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PRESET_PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const isApplied = appliedId === pkg.id;

          return (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                isApplied ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleApply(pkg)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-50`} />
              <CardContent className="relative p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{t(pkg.titleKey)}</span>
                      {isApplied && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 h-4">
                          <Check className="w-2.5 h-2.5 mr-0.5" />{t("presetPkg.applied")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t(pkg.descKey)}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                      <span className="bg-muted/80 px-1.5 py-0.5 rounded">{pkg.avatarName}</span>
                      <span className="bg-muted/80 px-1.5 py-0.5 rounded">{pkg.voiceName}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
