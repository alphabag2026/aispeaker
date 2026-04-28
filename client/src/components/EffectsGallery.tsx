
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
import { useLanguage } from "@/contexts/LanguageContext";
import "@/i18n/components/EffectsGallery";

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
    description: "effectsGallery.kissScreen.description",
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
    description: "effectsGallery.catwalk.description",
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
    description: "effectsGallery.360Orbit.description",
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
    description: "effectsGallery.dramaticZoom.description",
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
    description: "effectsGallery.smoothPan.description",
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
    description: "effectsGallery.cinematicTilt.description",
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
    description: "effectsGallery.dollyZoom.description",
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
    description: "effectsGallery.slowMotion.description",
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
    description: "effectsGallery.parallaxDepth.description",
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
    description: "effectsGallery.styleTransfer.description",
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
    description: "effectsGallery.faceFocus.description",
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
    description: "effectsGallery.spinEffect.description",
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
  { id: "all" as const, label: "effectsGallery.category.all", icon: Sparkles },
  { id: "motion" as const, label: "effectsGallery.category.motion", icon: Move },
  { id: "camera" as const, label: "effectsGallery.category.camera", icon: Camera },
  { id: "style" as const, label: "effectsGallery.category.style", icon: Wand2 },
  { id: "special" as const, label: "effectsGallery.category.special", icon: Zap },
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
  const { t } = useLanguage();
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
            {t("effectsGallery.preview")}
          </div>
        </div>
      )}

      {/* Popularity stars */}
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-xs text-white">
        <Sparkles className="h-3 w-3 text-yellow-400" />
        <span>{t("effectsGallery.popularity")} {effect.popularity}/5</span>
      </div>

      {/* Difficulty badge */}
      <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs bg-black/50 border ${difficultyColor(effect.difficulty)}`}>
        {t("effectsGallery.difficulty")}: {effect.difficulty}
      </div>
    </div>
  );
}

/* ── Main Gallery Component ── */
export default function EffectsGallery({ onEffectSelect }: { onEffectSelect?: (effect: EffectPreset) => void }) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [hoveredEffect, setHoveredEffect] = useState<string | null>(null);
  const [detailEffect, setDetailEffect] = useState<EffectPreset | null>(null);

  const filteredEffects = activeCategory === "all"
    ? EFFECT_PRESETS
    : EFFECT_PRESETS.filter((e) => e.category === activeCategory);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeCategory === id ? "default" : "outline"}
            className={`gap-2 transition-all duration-200 ${activeCategory === id ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setActiveCategory(id)}
          >
            <Icon className="h-4 w-4" />
            {t(label)}
          </Button>
        ))}
      </div>

      {/* Effects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredEffects.map((effect) => (
          <Card
            key={effect.id}
            className="overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-border/30 bg-card/80"
            onMouseEnter={() => setHoveredEffect(effect.id)}
            onMouseLeave={() => setHoveredEffect(null)}
            onClick={() => setDetailEffect(effect)}
          >
            <CardContent className="p-0">
              <EffectPreview effect={effect} isHovered={hoveredEffect === effect.id} />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1.5 group-hover:text-primary transition-colors">{effect.name}</h3>
                <p className="text-sm text-muted-foreground h-10 overflow-hidden">{t(effect.description)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Effect Detail Modal */}
      <Dialog open={!!detailEffect} onOpenChange={(open) => !open && setDetailEffect(null)}>
        <DialogContent className="max-w-3xl p-0">
          {detailEffect && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${detailEffect.gradient}`}>
                    <detailEffect.icon className="h-6 w-6 text-white" />
                  </div>
                  {detailEffect.name}
                </DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  {t(detailEffect.description)}
                </DialogDescription>
              </DialogHeader>

              {/* Main content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
                {/* Left: Preview */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/30 bg-card/50">
                  <EffectPreview effect={detailEffect} isHovered={true} />
                </div>

                {/* Right: Parameters */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">{t("effectsGallery.parameters")}</h4>
                  <ul className="space-y-2 text-sm">
                    {detailEffect.parameters.map((param) => (
                      <li key={param.name} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">{param.name}</span>
                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{param.default}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tags */}
              <h4 className="font-semibold text-lg px-6">{t("effectsGallery.tags")}</h4>
              <div className="flex flex-wrap gap-1.5 px-6">
                {detailEffect.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Apply button */}
              {onEffectSelect && (
                <div className="p-6 pt-4">
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0"
                    onClick={() => {
                      onEffectSelect(detailEffect);
                      setDetailEffect(null);
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    {t("effectsGallery.applyEffect", { effectName: detailEffect.name })}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
