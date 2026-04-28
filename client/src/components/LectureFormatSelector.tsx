import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Users, MessageSquare, UsersRound,
  Presentation, PenTool, LayoutPanelLeft, Monitor, ScreenShare,
  HelpCircle, Coffee, Film, ListChecks, CircleHelp, Clapperboard,
  Check, ChevronRight, Sparkles, Layers, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Icon mapping from DB icon names to Lucide components
const ICON_MAP: Record<string, any> = {
  User, Users, MessageSquare, UsersRound,
  Presentation, PenTool, LayoutPanelLeft, Monitor, ScreenShare,
  HelpCircle, Coffee, Film, ListChecks, CircleHelp, Clapperboard,
};

// Color theme mapping
const COLOR_MAP: Record<string, string> = {
  blue: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
  purple: "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10",
  green: "border-green-500/30 bg-green-500/5 hover:bg-green-500/10",
  orange: "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10",
  red: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10",
  cyan: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10",
  yellow: "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10",
  amber: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
  indigo: "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10",
  teal: "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10",
  pink: "border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10",
  violet: "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10",
};

const ICON_COLOR_MAP: Record<string, string> = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  green: "text-green-400",
  orange: "text-orange-400",
  red: "text-red-400",
  cyan: "text-cyan-400",
  yellow: "text-yellow-400",
  amber: "text-amber-400",
  indigo: "text-indigo-400",
  teal: "text-teal-400",
  pink: "text-pink-400",
  violet: "text-violet-400",
};

const SELECTED_COLOR_MAP: Record<string, string> = {
  blue: "ring-blue-500 border-blue-500",
  purple: "ring-purple-500 border-purple-500",
  green: "ring-green-500 border-green-500",
  orange: "ring-orange-500 border-orange-500",
  red: "ring-red-500 border-red-500",
  cyan: "ring-cyan-500 border-cyan-500",
  yellow: "ring-yellow-500 border-yellow-500",
  amber: "ring-amber-500 border-amber-500",
  indigo: "ring-indigo-500 border-indigo-500",
  teal: "ring-teal-500 border-teal-500",
  pink: "ring-pink-500 border-pink-500",
  violet: "ring-violet-500 border-violet-500",
};

interface SelectedFormats {
  personnel: number | null;
  style: number | null;
  inserts: number[];
}

interface LectureFormatSelectorProps {
  onApply: (formats: SelectedFormats, templates: any[]) => void;
  className?: string;
}

// ============ LAYOUT PREVIEW COMPONENT ============
function LayoutPreview({ personnelTemplate, styleTemplate, insertTemplates }: {
  personnelTemplate: any | null;
  styleTemplate: any | null;
  insertTemplates: any[];
}) {
  const { t } = useLanguage();
  // Parse personnel config
  const personnel = useMemo(() => {
    if (!personnelTemplate?.personnelConfig) return [{ role: "instructor", label: t("lectureFormatSelector.instructor"), count: 1 }];
    try {
      const config = typeof personnelTemplate.personnelConfig === "string"
        ? JSON.parse(personnelTemplate.personnelConfig)
        : personnelTemplate.personnelConfig;
      return Array.isArray(config) ? config : [{ role: "instructor", label: t("lectureFormatSelector.instructor"), count: 1 }];
    } catch { return [{ role: "instructor", label: t("lectureFormatSelector.instructor"), count: 1 }]; }
  }, [personnelTemplate]);

  // Parse style config
  const styleConfig = useMemo(() => {
    if (!styleTemplate?.styleConfig) return { hasSlides: false, hasWhiteboard: false, hasPIP: false, layoutType: "fullscreen" };
    try {
      return typeof styleTemplate.styleConfig === "string"
        ? JSON.parse(styleTemplate.styleConfig)
        : styleTemplate.styleConfig;
    } catch { return { hasSlides: false, hasWhiteboard: false, hasPIP: false, layoutType: "fullscreen" }; }
  }, [styleTemplate]);

  // Parse insert elements
  const inserts = useMemo(() => {
    return insertTemplates.map((t: any) => {
      try {
        const elements = typeof t.insertElements === "string" ? JSON.parse(t.insertElements) : t.insertElements;
        return { name: t.name, icon: t.icon, elements: Array.isArray(elements) ? elements : [] };
      } catch { return { name: t.name, icon: t.icon, elements: [] }; }
    });
  }, [insertTemplates]);

  const totalPersonnel = personnel.reduce((sum: number, p: any) => sum + (p.count || 1), 0);

  // Role colors for avatar placeholders
  const ROLE_COLORS: Record<string, string> = {
    instructor: "bg-blue-500/30 border-blue-500/50 text-blue-300",
    mc: "bg-purple-500/30 border-purple-500/50 text-purple-300",
    translator: "bg-green-500/30 border-green-500/50 text-green-300",
    guest: "bg-orange-500/30 border-orange-500/50 text-orange-300",
    panelist: "bg-cyan-500/30 border-cyan-500/50 text-cyan-300",
    questioner: "bg-yellow-500/30 border-yellow-500/50 text-yellow-300",
    default: "bg-muted border-muted-foreground/30 text-muted-foreground",
  };

  const renderPersonAvatar = (person: any, index: number) => {
    const colorClass = ROLE_COLORS[person.role] || ROLE_COLORS.default;
    return (
      <div key={`${person.role}-${index}`} className={`flex flex-col items-center gap-1`}>
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
          <User className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium text-center leading-tight">{person.label}</span>
      </div>
    );
  };

  // Determine main layout based on style
  const renderMainArea = () => {
    const { hasSlides, hasWhiteboard, hasPIP, layoutType } = styleConfig;

    if (layoutType === "split" || (hasSlides && hasPIP)) {
      // Split view: slides + speaker PIP
      return (
        <div className="flex gap-2 h-full">
          <div className="flex-1 rounded-lg border-2 border-dashed border-green-500/30 bg-green-500/5 flex flex-col items-center justify-center gap-1">
            <Presentation className="w-6 h-6 text-green-400/60" />
            <span className="text-[10px] text-green-400/60">{t("lectureFormatSelector.pptSlide")}</span>
          </div>
          <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
            <User className="w-5 h-5 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">{t("lectureFormatSelector.instructorPip")}</span>
          </div>
        </div>
      );
    }

    if (hasSlides && !hasPIP) {
      // Full slides with speaker below
      return (
        <div className="flex flex-col gap-2 h-full">
          <div className="flex-1 rounded-lg border-2 border-dashed border-green-500/30 bg-green-500/5 flex flex-col items-center justify-center gap-1">
            <Presentation className="w-8 h-8 text-green-400/60" />
            <span className="text-xs text-green-400/60">{t("lectureFormatSelector.pptSlide")}</span>
          </div>
        </div>
      );
    }

    if (hasWhiteboard) {
      return (
        <div className="flex gap-2 h-full">
          <div className="flex-1 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-1">
            <PenTool className="w-6 h-6 text-amber-400/60" />
            <span className="text-[10px] text-amber-400/60">{t("lectureFormatSelector.whiteboard")}</span>
          </div>
          {totalPersonnel > 0 && (
            <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
              <User className="w-5 h-5 text-blue-400/60" />
              <span className="text-[10px] text-blue-400/60">{t("lectureFormatSelector.instructor")}</span>
            </div>
          )}
        </div>
      );
    }

    if (layoutType === "screenShare") {
      return (
        <div className="flex gap-2 h-full">
          <div className="flex-1 rounded-lg border-2 border-dashed border-violet-500/30 bg-violet-500/5 flex flex-col items-center justify-center gap-1">
            <ScreenShare className="w-6 h-6 text-violet-400/60" />
            <span className="text-[10px] text-violet-400/60">{t("lectureFormatSelector.screenShare")}</span>
          </div>
          <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
            <User className="w-5 h-5 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">{t("lectureFormatSelector.instructorPip")}</span>
          </div>
        </div>
      );
    }

    // Default: fullscreen speaker(s)
    return (
      <div className="h-full rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-2">
        <div className="flex gap-3">
          {personnel.map((p: any, i: number) => (
            Array.from({ length: p.count || 1 }).map((_, j) => (
              <div key={`${i}-${j}`} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${ROLE_COLORS[p.role] || ROLE_COLORS.default}`}>
                <User className="w-4 h-4" />
              </div>
            ))
          ))}
        </div>
        <span className="text-xs text-blue-400/60">{t("lectureFormatSelector.fullscreenInstructorView")}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Screen Preview */}
      <div className="relative aspect-video bg-muted/50 rounded-xl border border-border overflow-hidden p-3">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {styleTemplate?.name || t("lectureFormatSelector.defaultLayout")}
          </span>
          <div className="w-16" />
        </div>

        {/* Main Content Area */}
        <div className="h-[calc(100%-2rem)]">
          {renderMainArea()}
        </div>
      </div>

      {/* Personnel Row */}
      {personnelTemplate && (
        <div className="flex items-center gap-4 justify-center py-2">
          {personnel.flatMap((p: any, i: number) =>
            Array.from({ length: p.count || 1 }).map((_, j) => renderPersonAvatar(p, i + j))
          )}
        </div>
      )}

      {/* Insert Icons Row */}
      {inserts.length > 0 && (
        <div className="flex items-center justify-center gap-3 flex-wrap py-2">
          {inserts.map((insert: any, i: number) => {
            const Icon = ICON_MAP[insert.icon] || HelpCircle;
            return (
              <div key={i} className="flex flex-col items-center gap-1 w-16 text-center">
                <div className="w-10 h-10 rounded-lg bg-muted border flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">{insert.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function LectureFormatSelector({ onApply, className }: LectureFormatSelectorProps) {
  const { t } = useLanguage();
  const { data: templates, isLoading } = trpc.scriptTemplate.list.useQuery();
  const [selected, setSelected] = useState<SelectedFormats>({ personnel: null, style: null, inserts: [] });

  const personnelTemplates = useMemo(() => templates?.filter((t: any) => t.type === 'PERSONNEL') || [], [templates]);
  const styleTemplates = useMemo(() => templates?.filter((t: any) => t.type === 'STYLE') || [], [templates]);
  const insertTemplates = useMemo(() => templates?.filter((t: any) => t.type === 'INSERT') || [], [templates]);

  const selectedPersonnelTemplate = useMemo(() => templates?.find((t: any) => t.id === selected.personnel) || null, [templates, selected.personnel]);
  const selectedStyleTemplate = useMemo(() => templates?.find((t: any) => t.id === selected.style) || null, [templates, selected.style]);
  const selectedInsertTemplates = useMemo(() => selected.inserts.map(id => templates?.find((t: any) => t.id === id)).filter(Boolean) || [], [templates, selected.inserts]);

  const handleSelect = (type: keyof SelectedFormats, id: number) => {
    setSelected(prev => {
      if (type === 'inserts') {
        const newInserts = prev.inserts.includes(id)
          ? prev.inserts.filter(i => i !== id)
          : [...prev.inserts, id];
        return { ...prev, inserts: newInserts };
      }
      // @ts-ignore
      return { ...prev, [type]: prev[type] === id ? null : id };
    });
  };

  const handleApply = () => {
    if (!selected.personnel || !selected.style) {
      toast.error(t("lectureFormatSelector.personnelAndStyleRequired"));
      return;
    }
    const selectedTemplates = [
      selectedPersonnelTemplate,
      selectedStyleTemplate,
      ...selectedInsertTemplates
    ].filter(Boolean);

    onApply(selected, selectedTemplates);
  };

  const renderTemplateCard = (template: any) => {
    const type = template.type.toLowerCase() as keyof SelectedFormats;
    const isSelected = type === 'inserts' ? selected.inserts.includes(template.id) : selected[type] === template.id;
    const Icon = ICON_MAP[template.icon] || Layers;
    const colorClass = COLOR_MAP[template.themeColor] || COLOR_MAP.blue;
    const selectedClass = isSelected ? (SELECTED_COLOR_MAP[template.themeColor] || SELECTED_COLOR_MAP.blue) : '';

    return (
      <Card
        key={template.id}
        className={`cursor-pointer transition-all duration-200 relative ${colorClass} ${isSelected ? `ring-2 ${selectedClass}` : ''}`}
        onClick={() => handleSelect(type, template.id)}
      >
        {template.isRecommended && (
          <Badge variant="secondary" className="absolute -top-2 -right-2 bg-yellow-400 text-black hover:bg-yellow-500">
            {t("lectureFormatSelector.recommended")}
          </Badge>
        )}
        <CardHeader className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-background/50 ${ICON_COLOR_MAP[template.themeColor] || ICON_COLOR_MAP.blue}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold leading-tight">{template.name}</CardTitle>
              <CardDescription className="text-xs mt-1 leading-snug">{template.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {isSelected && (
          <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAnyFormatSelected = selected.personnel || selected.style || selected.inserts.length > 0;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Left: Format Library */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-transparent border-none shadow-none">
          <CardHeader className="p-0">
            <CardTitle className="text-2xl font-bold">{t("lectureFormatSelector.formatLibrary")}</CardTitle>
            <CardDescription>{t("lectureFormatSelector.formatLibraryDescription")}</CardDescription>
          </CardHeader>
        </Card>

        {/* Personnel Composition */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{t("lectureFormatSelector.personnelComposition")}</h3>
          <p className="text-sm text-muted-foreground -mt-2">{t("lectureFormatSelector.personnelCompositionDescription")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personnelTemplates.map(renderTemplateCard)}
          </div>
        </div>

        <Separator />

        {/* Lecture Style */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{t("lectureFormatSelector.lectureStyle")}</h3>
          <p className="text-sm text-muted-foreground -mt-2">{t("lectureFormatSelector.lectureStyleDescription")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {styleTemplates.map(renderTemplateCard)}
          </div>
        </div>

        <Separator />

        {/* Additional Insert Elements */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{t("lectureFormatSelector.additionalInsertElements")}</h3>
          <p className="text-sm text-muted-foreground -mt-2">{t("lectureFormatSelector.additionalInsertElementsDescription")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insertTemplates.map(renderTemplateCard)}
          </div>
        </div>
      </div>

      {/* Right: Preview and Apply */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 self-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("lectureFormatSelector.layoutPreview")}</CardTitle>
            <CardDescription>{t("lectureFormatSelector.layoutPreviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LayoutPreview
              personnelTemplate={selectedPersonnelTemplate}
              styleTemplate={selectedStyleTemplate}
              insertTemplates={selectedInsertTemplates}
            />
          </CardContent>
        </Card>

        {isAnyFormatSelected && (
          <>
            <Card className="bg-gradient-to-br from-card to-muted/30">
              <CardHeader>
                <CardTitle>{t("lectureFormatSelector.formatSelectionComplete")}</CardTitle>
                <CardDescription>{t("lectureFormatSelector.formatSelectionCompleteDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 p-4 rounded-lg border bg-background/50">
                  <h4 className="font-semibold">{t("lectureFormatSelector.selectionDetails")}</h4>
                  {!isAnyFormatSelected && <p className="text-sm text-muted-foreground">{t("lectureFormatSelector.noFormatSelected")}</p>}
                  {selected.personnel && (() => {
                    const tmpl = (templates || []).find((item: any) => item.id === selected.personnel);
                    return tmpl ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">{t("lectureFormatSelector.personnel")}</Badge>
                        <span>{tmpl.name}</span>
                      </div>
                    ) : null;
                  })()}
                  {selected.style && (() => {
                    const tmpl = (templates || []).find((item: any) => item.id === selected.style);
                    return tmpl ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">{t("lectureFormatSelector.style")}</Badge>
                        <span>{tmpl.name}</span>
                      </div>
                    ) : null;
                  })()}
                  {selected.inserts.map(id => {
                    const t_item = (templates || []).find((item: any) => item.id === id);
                    return t_item ? (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">{t("lectureFormatSelector.insert")}</Badge>
                        <span>{t_item.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
                <Button className="w-full gap-2" onClick={handleApply}>
                  <Sparkles className="w-4 h-4" /> {t("lectureFormatSelector.applyFormat")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
