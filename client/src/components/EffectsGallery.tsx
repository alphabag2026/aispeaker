import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  Sparkles,
  Camera,
  Move,
  RotateCcw,
  Zap,
  Wand2,
  Film,
  Eye,
  Heart,
  Wind,
  Maximize,
  Minimize,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RotateCw,
  X,
} from "lucide-react";

/* ── Effect Preset Data ── */
export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  category: "motion" | "camera" | "style" | "special";
  icon: typeof Play;
  gradient: string;
  thumbnail: string; // placeholder gradient color
  parameters: { name: string; range: string; default: string }[];
  tags: string[];
  popularity: number; // 1-5
  difficulty: "Easy" | "Medium" | "Advanced";
}

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: "kiss-screen",
    name: "Kiss Screen",
    description: "캐릭터가 화면에 키스하는 인터랙티브 효과. 소셜 미디어 콘텐츠에 최적화.",
    category: "special",
    icon: Heart,
    gradient: "from-pink-500 to-rose-600",
    thumbnail: "bg-gradient-to-br from-pink-500/20 to-rose-600/20",
    parameters: [
      { name: "Intensity", range: "1-10", default: "7" },
      { name: "Duration", range: "1-5s", default: "3s" },
      { name: "Angle", range: "0-360°", default: "0°" },
    ],
    tags: ["Interactive", "Social", "Fun"],
    popularity: 5,
    difficulty: "Easy",
  },
  {
    id: "catwalk",
    name: "Catwalk",
    description: "패션 런웨이 스타일의 워킹 모션. 모델/캐릭터가 카메라를 향해 걸어오는 효과.",
    category: "motion",
    icon: Move,
    gradient: "from-amber-500 to-orange-600",
    thumbnail: "bg-gradient-to-br from-amber-500/20 to-orange-600/20",
    parameters: [
      { name: "Walk Speed", range: "0.5-2x", default: "1x" },
      { name: "Camera Angle", range: "Low/Eye/High", default: "Eye" },
      { name: "Background Blur", range: "0-20", default: "5" },
    ],
    tags: ["Fashion", "Walk", "Professional"],
    popularity: 4,
    difficulty: "Easy",
  },
  {
    id: "360-orbit",
    name: "360° Orbit",
    description: "카메라가 피사체 주위를 360도 회전하는 시네마틱 효과. 제품 쇼케이스에 적합.",
    category: "camera",
    icon: RotateCcw,
    gradient: "from-blue-500 to-cyan-600",
    thumbnail: "bg-gradient-to-br from-blue-500/20 to-cyan-600/20",
    parameters: [
      { name: "Rotation Speed", range: "1-10", default: "5" },
      { name: "Orbit Radius", range: "1-20", default: "10" },
      { name: "Tilt Angle", range: "-45° to 45°", default: "0°" },
    ],
    tags: ["Cinematic", "Product", "3D"],
    popularity: 5,
    difficulty: "Medium",
  },
  {
    id: "zoom-in",
    name: "Dramatic Zoom",
    description: "피사체를 향해 극적으로 줌인하는 효과. 강조 장면이나 리액션 영상에 적합.",
    category: "camera",
    icon: Maximize,
    gradient: "from-violet-500 to-purple-600",
    thumbnail: "bg-gradient-to-br from-violet-500/20 to-purple-600/20",
    parameters: [
      { name: "Zoom Level", range: "1.5-5x", default: "2.5x" },
      { name: "Speed", range: "Slow/Medium/Fast", default: "Medium" },
      { name: "Focus Point", range: "Center/Face/Custom", default: "Face" },
    ],
    tags: ["Dramatic", "Emphasis", "Reaction"],
    popularity: 4,
    difficulty: "Easy",
  },
  {
    id: "pan-left",
    name: "Smooth Pan",
    description: "카메라가 부드럽게 좌우로 패닝하는 효과. 풍경이나 파노라마 장면에 적합.",
    category: "camera",
    icon: ArrowRight,
    gradient: "from-teal-500 to-emerald-600",
    thumbnail: "bg-gradient-to-br from-teal-500/20 to-emerald-600/20",
    parameters: [
      { name: "Direction", range: "Left/Right", default: "Right" },
      { name: "Speed", range: "1-10", default: "5" },
      { name: "Easing", range: "Linear/Ease/Bounce", default: "Ease" },
    ],
    tags: ["Landscape", "Panorama", "Smooth"],
    popularity: 3,
    difficulty: "Easy",
  },
  {
    id: "tilt-up",
    name: "Cinematic Tilt",
    description: "카메라가 아래에서 위로 틸트하며 피사체를 드러내는 시네마틱 효과.",
    category: "camera",
    icon: ArrowUp,
    gradient: "from-indigo-500 to-blue-600",
    thumbnail: "bg-gradient-to-br from-indigo-500/20 to-blue-600/20",
    parameters: [
      { name: "Direction", range: "Up/Down", default: "Up" },
      { name: "Speed", range: "1-10", default: "4" },
      { name: "Reveal Style", range: "Gradual/Quick", default: "Gradual" },
    ],
    tags: ["Reveal", "Cinematic", "Architecture"],
    popularity: 3,
    difficulty: "Easy",
  },
  {
    id: "dolly-zoom",
    name: "Dolly Zoom",
    description: "히치콕 효과. 줌인하면서 카메라가 후진하여 배경이 왜곡되는 극적 효과.",
    category: "special",
    icon: Film,
    gradient: "from-red-500 to-orange-600",
    thumbnail: "bg-gradient-to-br from-red-500/20 to-orange-600/20",
    parameters: [
      { name: "Intensity", range: "1-10", default: "7" },
      { name: "Duration", range: "1-5s", default: "2s" },
      { name: "Direction", range: "In/Out", default: "In" },
    ],
    tags: ["Hitchcock", "Dramatic", "Vertigo"],
    popularity: 4,
    difficulty: "Advanced",
  },
  {
    id: "slow-motion",
    name: "Slow Motion",
    description: "시간을 늦추는 슬로우 모션 효과. 액션 장면이나 감성적 순간에 적합.",
    category: "motion",
    icon: Wind,
    gradient: "from-sky-500 to-blue-600",
    thumbnail: "bg-gradient-to-br from-sky-500/20 to-blue-600/20",
    parameters: [
      { name: "Speed", range: "0.1-0.5x", default: "0.25x" },
      { name: "Interpolation", range: "Optical/Frame", default: "Optical" },
      { name: "Smooth", range: "1-10", default: "8" },
    ],
    tags: ["Action", "Emotional", "Time"],
    popularity: 5,
    difficulty: "Easy",
  },
  {
    id: "parallax",
    name: "Parallax Depth",
    description: "2D 이미지에 깊이감을 추가하여 3D 패럴랙스 효과를 생성.",
    category: "style",
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-pink-600",
    thumbnail: "bg-gradient-to-br from-fuchsia-500/20 to-pink-600/20",
    parameters: [
      { name: "Depth Layers", range: "2-5", default: "3" },
      { name: "Motion Range", range: "1-20px", default: "10px" },
      { name: "Direction", range: "Horizontal/Vertical/Both", default: "Both" },
    ],
    tags: ["3D", "Depth", "Immersive"],
    popularity: 4,
    difficulty: "Medium",
  },
  {
    id: "style-transfer",
    name: "Style Transfer",
    description: "영상에 아트 스타일을 적용. 유화, 수채화, 애니메이션 등 다양한 화풍 변환.",
    category: "style",
    icon: Wand2,
    gradient: "from-emerald-500 to-teal-600",
    thumbnail: "bg-gradient-to-br from-emerald-500/20 to-teal-600/20",
    parameters: [
      { name: "Style", range: "Oil/Watercolor/Anime/Sketch", default: "Oil" },
      { name: "Intensity", range: "1-10", default: "6" },
      { name: "Preserve Face", range: "On/Off", default: "On" },
    ],
    tags: ["Art", "Creative", "Transform"],
    popularity: 4,
    difficulty: "Medium",
  },
  {
    id: "face-zoom",
    name: "Face Focus",
    description: "얼굴을 자동 감지하여 부드럽게 줌인. 인물 중심 콘텐츠에 최적화.",
    category: "special",
    icon: Eye,
    gradient: "from-cyan-500 to-blue-600",
    thumbnail: "bg-gradient-to-br from-cyan-500/20 to-blue-600/20",
    parameters: [
      { name: "Zoom Level", range: "1.2-3x", default: "1.8x" },
      { name: "Tracking", range: "Static/Follow", default: "Follow" },
      { name: "Smooth", range: "1-10", default: "7" },
    ],
    tags: ["Portrait", "Auto", "AI"],
    popularity: 3,
    difficulty: "Easy",
  },
  {
    id: "rotation-spin",
    name: "Spin Effect",
    description: "피사체가 회전하는 역동적 효과. 제품 360도 뷰나 트랜지션에 적합.",
    category: "motion",
    icon: RotateCw,
    gradient: "from-yellow-500 to-amber-600",
    thumbnail: "bg-gradient-to-br from-yellow-500/20 to-amber-600/20",
    parameters: [
      { name: "Rotation", range: "90-720°", default: "360°" },
      { name: "Axis", range: "X/Y/Z", default: "Y" },
      { name: "Speed", range: "1-10", default: "5" },
    ],
    tags: ["Dynamic", "Product", "Transition"],
    popularity: 3,
    difficulty: "Medium",
  },
];

/* ── Category config ── */
const CATEGORIES = [
  { id: "all" as const, label: "All Effects", icon: Sparkles },
  { id: "motion" as const, label: "Motion", icon: Move },
  { id: "camera" as const, label: "Camera", icon: Camera },
  { id: "style" as const, label: "Style", icon: Wand2 },
  { id: "special" as const, label: "Special", icon: Zap },
];

/* ── Difficulty badge color ── */
function difficultyColor(d: string) {
  switch (d) {
    case "Easy": return "text-green-400 border-green-500/30";
    case "Medium": return "text-yellow-400 border-yellow-500/30";
    case "Advanced": return "text-red-400 border-red-500/30";
    default: return "";
  }
}

/* ── Animated Preview Placeholder ── */
function EffectPreview({ effect, isHovered }: { effect: EffectPreset; isHovered: boolean }) {
  const Icon = effect.icon;
  return (
    <div className={`relative w-full aspect-video rounded-lg overflow-hidden ${effect.thumbnail} border border-border/30`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute inset-0 bg-gradient-to-br ${effect.gradient} ${isHovered ? "animate-pulse" : ""}`} />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
        }} />
      </div>

      {/* Center icon with animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`p-4 rounded-full bg-gradient-to-br ${effect.gradient} shadow-lg transition-transform duration-500 ${isHovered ? "scale-125 rotate-12" : "scale-100"}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Play overlay on hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-[10px] flex items-center gap-1">
            <Play className="h-3 w-3" fill="white" />
            Preview
          </div>
        </div>
      )}

      {/* Popularity stars */}
      <div className="absolute top-2 left-2 flex gap-0.5">
        {Array.from({ length: effect.popularity }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        ))}
      </div>
    </div>
  );
}

/* ── Effect Card ── */
function EffectCard({
  effect,
  onSelect,
  onDetail,
}: {
  effect: EffectPreset;
  onSelect?: (effect: EffectPreset) => void;
  onDetail: (effect: EffectPreset) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onDetail(effect)}
    >
      <CardContent className="p-3">
        <EffectPreview effect={effect} isHovered={isHovered} />

        <div className="mt-3">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{effect.name}</h3>
            <Badge variant="outline" className={`text-[9px] ${difficultyColor(effect.difficulty)}`}>
              {effect.difficulty}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {effect.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {effect.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Quick apply button */}
        {onSelect && (
          <Button
            size="sm"
            className="w-full mt-3 gap-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs h-8"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(effect);
            }}
          >
            <Zap className="h-3 w-3" />
            Apply Effect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════ Main Component: EffectsGallery ═══════════ */
export default function EffectsGallery({
  onEffectSelect,
  compact = false,
}: {
  onEffectSelect?: (effect: EffectPreset) => void;
  compact?: boolean;
}) {
  const [category, setCategory] = useState<"all" | "motion" | "camera" | "style" | "special">("all");
  const [detailEffect, setDetailEffect] = useState<EffectPreset | null>(null);

  const filtered = category === "all"
    ? EFFECT_PRESETS
    : EFFECT_PRESETS.filter((e) => e.category === category);

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={category === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.id)}
              className={`gap-1.5 ${
                category === cat.id
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white border-0"
                  : "border-primary/30 hover:bg-primary/10"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
              {cat.id !== "all" && (
                <span className="text-[10px] opacity-70">
                  ({EFFECT_PRESETS.filter((e) => e.category === cat.id).length})
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Effects grid */}
      <div className={`grid gap-4 ${
        compact
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      }`}>
        {filtered.map((effect) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            onSelect={onEffectSelect}
            onDetail={setDetailEffect}
          />
        ))}
      </div>

      {/* Detail modal */}
      <Dialog open={!!detailEffect} onOpenChange={(open) => !open && setDetailEffect(null)}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          {detailEffect && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${detailEffect.gradient} text-white shadow-lg`}>
                    <detailEffect.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{detailEffect.name}</DialogTitle>
                    <DialogDescription className="text-sm">{detailEffect.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Preview */}
              <div className={`w-full aspect-video rounded-lg overflow-hidden ${detailEffect.thumbnail} border border-border/30 relative`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${detailEffect.gradient} opacity-20 animate-pulse`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`p-6 rounded-full bg-gradient-to-br ${detailEffect.gradient} shadow-xl`}>
                    <detailEffect.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Category</div>
                  <div className="text-sm font-semibold capitalize">{detailEffect.category}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Difficulty</div>
                  <Badge variant="outline" className={`text-[10px] ${difficultyColor(detailEffect.difficulty)}`}>
                    {detailEffect.difficulty}
                  </Badge>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Popularity</div>
                  <div className="flex justify-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < detailEffect.popularity ? "bg-amber-400" : "bg-muted/50"}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Parameters */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                <div className="space-y-2">
                  {detailEffect.parameters.map((param) => (
                    <div key={param.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <span className="text-sm font-medium">{param.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{param.range}</span>
                        <Badge variant="outline" className="text-[10px]">Default: {param.default}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {detailEffect.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Apply button */}
              {onEffectSelect && (
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0"
                  onClick={() => {
                    onEffectSelect(detailEffect);
                    setDetailEffect(null);
                  }}
                >
                  <Zap className="h-4 w-4" />
                  Apply "{detailEffect.name}" Effect
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
