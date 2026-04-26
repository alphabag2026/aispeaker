import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import {
  Sparkles,
  Zap,
  Clock,
  Film,
  Monitor,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";

/* ── AI Model Data ── */
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  logo: string; // text-based logo
  gradient: string;
  badge?: string;
  maxResolution: string;
  maxDuration: string;
  speed: string;
  pricing: string;
  features: string[];
  strengths: string[];
  weaknesses: string[];
  category: "video" | "image" | "avatar" | "audio";
}

export const AI_MODELS: AIModel[] = [
  {
    id: "akool-i2v",
    name: "Akool I2V",
    provider: "Akool",
    logo: "Akool",
    gradient: "from-violet-600 to-blue-500",
    badge: "Integrated",
    maxResolution: "4K",
    maxDuration: "60s",
    speed: "Fast",
    pricing: "$0.02/s",
    features: ["Image to Video", "Motion Control", "Camera Effects", "Face Consistency"],
    strengths: ["정밀 모션 제어", "캐릭터 일관성", "효과 프리셋 풍부"],
    weaknesses: ["긴 영상 제한"],
    category: "video",
  },
  {
    id: "kling-3",
    name: "Kling 3.0",
    provider: "Kuaishou",
    logo: "Kling",
    gradient: "from-orange-500 to-red-500",
    badge: "Popular",
    maxResolution: "1080p",
    maxDuration: "10s",
    speed: "Medium",
    pricing: "$0.03/s",
    features: ["T2V", "I2V", "Motion Brush", "Camera Control"],
    strengths: ["자연스러운 모션", "높은 일관성", "다양한 스타일"],
    weaknesses: ["4K 미지원", "최대 10초"],
    category: "video",
  },
  {
    id: "wan-2.7",
    name: "Wan 2.7",
    provider: "Alibaba",
    logo: "Wan",
    gradient: "from-blue-500 to-indigo-600",
    maxResolution: "1080p",
    maxDuration: "5s",
    speed: "Fast",
    pricing: "$0.015/s",
    features: ["T2V", "I2V", "Style Transfer", "Inpainting"],
    strengths: ["빠른 생성 속도", "저렴한 가격", "다양한 스타일"],
    weaknesses: ["짧은 영상", "해상도 제한"],
    category: "video",
  },
  {
    id: "seedance-2",
    name: "Seedance 2.0",
    provider: "ByteDance",
    logo: "Seedance",
    gradient: "from-teal-500 to-emerald-500",
    badge: "New",
    maxResolution: "1080p",
    maxDuration: "8s",
    speed: "Medium",
    pricing: "$0.025/s",
    features: ["Dance Generation", "Character Animation", "Music Sync"],
    strengths: ["댄스/모션 특화", "음악 동기화", "캐릭터 애니메이션"],
    weaknesses: ["범용성 부족"],
    category: "video",
  },
  {
    id: "sora",
    name: "Sora",
    provider: "OpenAI",
    logo: "Sora",
    gradient: "from-green-500 to-emerald-600",
    badge: "Premium",
    maxResolution: "1080p",
    maxDuration: "60s",
    speed: "Slow",
    pricing: "$0.05/s",
    features: ["T2V", "I2V", "Video Editing", "Storyboard"],
    strengths: ["최고 품질", "긴 영상 지원", "스토리보드"],
    weaknesses: ["느린 속도", "높은 가격"],
    category: "video",
  },
  {
    id: "veo-2",
    name: "Veo 2",
    provider: "Google",
    logo: "Veo",
    gradient: "from-blue-400 to-blue-600",
    maxResolution: "4K",
    maxDuration: "120s",
    speed: "Medium",
    pricing: "$0.04/s",
    features: ["T2V", "I2V", "8K Support", "Physics Simulation"],
    strengths: ["4K/8K 지원", "물리 시뮬레이션", "긴 영상"],
    weaknesses: ["접근 제한"],
    category: "video",
  },
  {
    id: "minimax",
    name: "MiniMax",
    provider: "MiniMax",
    logo: "MiniMax",
    gradient: "from-purple-500 to-pink-500",
    maxResolution: "1080p",
    maxDuration: "6s",
    speed: "Fast",
    pricing: "$0.02/s",
    features: ["T2V", "I2V", "Character Consistency", "Multi-Scene"],
    strengths: ["캐릭터 일관성", "멀티씬", "빠른 속도"],
    weaknesses: ["짧은 영상"],
    category: "video",
  },
  {
    id: "flux-pro",
    name: "FLUX Pro",
    provider: "Black Forest Labs",
    logo: "FLUX",
    gradient: "from-amber-500 to-yellow-500",
    maxResolution: "4K",
    maxDuration: "-",
    speed: "Fast",
    pricing: "$0.05/img",
    features: ["T2I", "I2I", "Inpainting", "ControlNet"],
    strengths: ["최고 이미지 품질", "프롬프트 정확도", "다양한 스타일"],
    weaknesses: ["비디오 미지원"],
    category: "image",
  },
];

/* ── Badge color helper ── */
function badgeColor(badge?: string) {
  switch (badge) {
    case "Integrated":
      return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    case "Popular":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "New":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Premium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-muted/20 text-muted-foreground border-border/30";
  }
}

/* ── Infinite Marquee Logo Slider ── */
function LogoMarquee() {
  const doubled = [...AI_MODELS, ...AI_MODELS];
  return (
    <div className="relative overflow-hidden py-4">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-background to-transparent" />
      <div className="flex gap-8 animate-marquee">
        {doubled.map((model, i) => (
          <div
            key={`${model.id}-${i}`}
            className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${model.gradient} flex items-center justify-center`}>
              <span className="text-white text-[10px] font-black">{model.logo.charAt(0)}</span>
            </div>
            <div>
              <div className="text-sm font-semibold whitespace-nowrap">{model.name}</div>
              <div className="text-[10px] text-muted-foreground">{model.provider}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Model Comparison Table ── */
function ModelComparisonTable({ models }: { models: AIModel[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Model</th>
            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Resolution</th>
            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Duration</th>
            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Speed</th>
            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Price</th>
            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Features</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr key={model.id} className="border-b border-border/30 hover:bg-card/50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${model.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-[9px] font-black">{model.logo.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground">{model.provider}</div>
                  </div>
                  {model.badge && (
                    <Badge variant="outline" className={`text-[9px] ml-1 ${badgeColor(model.badge)}`}>
                      {model.badge}
                    </Badge>
                  )}
                </div>
              </td>
              <td className="text-center py-3 px-4">
                <span className={model.maxResolution === "4K" ? "text-primary font-semibold" : ""}>{model.maxResolution}</span>
              </td>
              <td className="text-center py-3 px-4">{model.maxDuration}</td>
              <td className="text-center py-3 px-4">
                <Badge variant="outline" className={`text-[10px] ${
                  model.speed === "Fast" ? "text-green-400 border-green-500/30" :
                  model.speed === "Medium" ? "text-yellow-400 border-yellow-500/30" :
                  "text-red-400 border-red-500/30"
                }`}>
                  {model.speed}
                </Badge>
              </td>
              <td className="text-center py-3 px-4 text-muted-foreground">{model.pricing}</td>
              <td className="text-center py-3 px-4">
                <div className="flex flex-wrap justify-center gap-1">
                  {model.features.slice(0, 3).map((f) => (
                    <span key={f} className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                      {f}
                    </span>
                  ))}
                  {model.features.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-muted/30 text-muted-foreground">
                      +{model.features.length - 3}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Model Detail Card ── */
function ModelDetailCard({ model, isSelected, onSelect }: { model: AIModel; isSelected: boolean; onSelect: () => void }) {
  return (
    <Card
      className={`group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer h-full ${
        isSelected ? "border-primary/50 shadow-lg shadow-violet-500/10" : "hover:border-primary/30"
      }`}
      onClick={onSelect}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${model.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${model.gradient} flex items-center justify-center shadow-lg`}>
            <span className="text-white text-sm font-black">{model.logo.charAt(0)}</span>
          </div>
          <div className="flex items-center gap-2">
            {model.badge && (
              <Badge variant="outline" className={`text-[10px] ${badgeColor(model.badge)}`}>
                {model.badge}
              </Badge>
            )}
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold mb-0.5">{model.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{model.provider}</p>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Monitor className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{model.maxResolution}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{model.maxDuration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{model.speed}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Film className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{model.pricing}</span>
          </div>
        </div>

        {/* Strengths */}
        <div className="space-y-1">
          {model.strengths.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[11px]">
              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════ Main Component: ModelCarousel ═══════════ */
export default function ModelCarousel({
  showComparison = true,
  onModelSelect,
  selectedModelId,
}: {
  showComparison?: boolean;
  onModelSelect?: (model: AIModel) => void;
  selectedModelId?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const [selectedId, setSelectedId] = useState(selectedModelId || "akool-i2v");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "video" | "image" | "avatar" | "audio">("all");

  const filteredModels = categoryFilter === "all"
    ? AI_MODELS
    : AI_MODELS.filter((m) => m.category === categoryFilter);

  const handleSelect = (model: AIModel) => {
    setSelectedId(model.id);
    onModelSelect?.(model);
  };

  return (
    <div className="space-y-8">
      {/* Infinite logo marquee */}
      <LogoMarquee />

      {/* Category filter */}
      <div className="flex justify-center gap-2">
        {(["all", "video", "image"] as const).map((cat) => (
          <Button
            key={cat}
            variant={categoryFilter === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(cat)}
            className={categoryFilter === cat
              ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white border-0"
              : "border-primary/30 hover:bg-primary/10"
            }
          >
            {cat === "all" ? "All Models" : cat === "video" ? "Video" : "Image"}
          </Button>
        ))}
      </div>

      {/* Model cards carousel */}
      <Carousel
        opts={{ align: "start", loop: true }}
        plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
        className="mx-auto max-w-6xl"
      >
        <CarouselContent className="-ml-4">
          {filteredModels.map((model) => (
            <CarouselItem key={model.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <ModelDetailCard
                model={model}
                isSelected={selectedId === model.id}
                onSelect={() => handleSelect(model)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card" />
        <CarouselNext className="-right-4 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card" />
      </Carousel>

      {/* Comparison toggle */}
      {showComparison && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className="gap-2 border-primary/30 hover:bg-primary/10"
          >
            {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showTable ? "Hide Comparison" : "Compare All Models"}
          </Button>
        </div>
      )}

      {/* Comparison table */}
      {showTable && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <ModelComparisonTable models={filteredModels} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
