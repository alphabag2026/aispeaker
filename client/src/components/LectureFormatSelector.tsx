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
  // Parse personnel config
  const personnel = useMemo(() => {
    if (!personnelTemplate?.personnelConfig) return [{ role: "instructor", label: "강사", count: 1 }];
    try {
      const config = typeof personnelTemplate.personnelConfig === "string"
        ? JSON.parse(personnelTemplate.personnelConfig)
        : personnelTemplate.personnelConfig;
      return Array.isArray(config) ? config : [{ role: "instructor", label: "강사", count: 1 }];
    } catch { return [{ role: "instructor", label: "강사", count: 1 }]; }
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
            <span className="text-[10px] text-green-400/60">PPT 슬라이드</span>
          </div>
          <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
            <User className="w-5 h-5 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">강사 PIP</span>
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
            <span className="text-xs text-green-400/60">PPT 슬라이드</span>
          </div>
        </div>
      );
    }

    if (hasWhiteboard) {
      return (
        <div className="flex gap-2 h-full">
          <div className="flex-1 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-1">
            <PenTool className="w-6 h-6 text-amber-400/60" />
            <span className="text-[10px] text-amber-400/60">화이트보드</span>
          </div>
          {totalPersonnel > 0 && (
            <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
              <User className="w-5 h-5 text-blue-400/60" />
              <span className="text-[10px] text-blue-400/60">강사</span>
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
            <span className="text-[10px] text-violet-400/60">화면 공유</span>
          </div>
          <div className="w-24 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 flex flex-col items-center justify-center gap-1">
            <User className="w-5 h-5 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/60">강사 PIP</span>
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
        <span className="text-xs text-blue-400/60">전면 강사 뷰</span>
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
            {styleTemplate?.name || "기본 레이아웃"}
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
            Array.from({ length: p.count || 1 }).map((_, j) =>
              renderPersonAvatar(p, i * 10 + j)
            )
          )}
        </div>
      )}

      {/* Timeline Preview */}
      {inserts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">타임라인 미리보기</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <div className="shrink-0 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] text-blue-400">도입</span>
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <div className="shrink-0 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
              <span className="text-[10px] text-green-400">본문 강의</span>
            </div>
            {inserts.map((ins, i) => {
              const InsIcon = ICON_MAP[ins.icon] || Layers;
              return (
                <span key={i} className="contents">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <div className="shrink-0 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-1">
                    <InsIcon className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] text-yellow-400">{ins.name}</span>
                  </div>
                </span>
              );
            })}
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <div className="shrink-0 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px] text-purple-400">마무리</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LectureFormatSelector({ onApply, className = "" }: LectureFormatSelectorProps) {
  const [selected, setSelected] = useState<SelectedFormats>({
    personnel: null,
    style: null,
    inserts: [],
  });

  const templatesQuery = trpc.lectureBuilder.listFormatTemplates.useQuery();
  const templates = templatesQuery.data || [];

  const personnelTemplates = useMemo(() => templates.filter((t: any) => t.category === "personnel"), [templates]);
  const styleTemplates = useMemo(() => templates.filter((t: any) => t.category === "style"), [templates]);
  const insertTemplates = useMemo(() => templates.filter((t: any) => t.category === "insert"), [templates]);

  const selectedCount = (selected.personnel ? 1 : 0) + (selected.style ? 1 : 0) + selected.inserts.length;

  const getSelectedTemplates = () => {
    const result: any[] = [];
    if (selected.personnel) {
      const t = templates.find((t: any) => t.id === selected.personnel);
      if (t) result.push(t);
    }
    if (selected.style) {
      const t = templates.find((t: any) => t.id === selected.style);
      if (t) result.push(t);
    }
    selected.inserts.forEach(id => {
      const t = templates.find((t: any) => t.id === id);
      if (t) result.push(t);
    });
    return result;
  };

  const handleApply = () => {
    if (!selected.personnel && !selected.style) {
      toast.error("인원 구성 또는 강의 스타일을 하나 이상 선택해주세요");
      return;
    }
    onApply(selected, getSelectedTemplates());
  };

  if (templatesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderTemplateCard = (template: any, isSelected: boolean, onClick: () => void) => {
    const IconComp = ICON_MAP[template.icon] || Layers;
    const colorClass = COLOR_MAP[template.colorTheme] || COLOR_MAP.blue;
    const iconColor = ICON_COLOR_MAP[template.colorTheme] || ICON_COLOR_MAP.blue;
    const selectedRing = SELECTED_COLOR_MAP[template.colorTheme] || SELECTED_COLOR_MAP.blue;
    const personnelConfig = template.personnelConfig ? (typeof template.personnelConfig === "string" ? JSON.parse(template.personnelConfig) : template.personnelConfig) : null;

    return (
      <button
        key={template.id}
        className={`relative p-4 rounded-xl border-2 text-left transition-all ${colorClass} ${
          isSelected ? `ring-2 ${selectedRing}` : "border-transparent hover:border-muted-foreground/30"
        }`}
        onClick={onClick}
      >
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor} bg-current/10 shrink-0`}>
            <IconComp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-foreground">{template.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
            {personnelConfig && (
              <div className="flex flex-wrap gap-1 mt-2">
                {personnelConfig.map((p: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5">
                    {p.label} {p.count > 1 ? `x${p.count}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            강의 포맷 선택
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            원하는 강의 형태를 선택하면 자동으로 구성이 세팅됩니다
          </p>
        </div>
        {selectedCount > 0 && (
          <Badge className="bg-primary/20 text-primary">{selectedCount}개 선택됨</Badge>
        )}
      </div>

      {/* ============ PERSONNEL SECTION ============ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-400" />
          <h4 className="font-semibold text-sm">인원 구성</h4>
          <span className="text-xs text-muted-foreground">(1개 선택)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {personnelTemplates.map((t: any) =>
            renderTemplateCard(t, selected.personnel === t.id, () => {
              setSelected(prev => ({
                ...prev,
                personnel: prev.personnel === t.id ? null : t.id,
              }));
            })
          )}
        </div>
      </div>

      <Separator />

      {/* ============ STYLE SECTION ============ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Presentation className="w-4 h-4 text-green-400" />
          <h4 className="font-semibold text-sm">강의 스타일</h4>
          <span className="text-xs text-muted-foreground">(1개 선택)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {styleTemplates.map((t: any) =>
            renderTemplateCard(t, selected.style === t.id, () => {
              setSelected(prev => ({
                ...prev,
                style: prev.style === t.id ? null : t.id,
              }));
            })
          )}
        </div>
      </div>

      <Separator />

      {/* ============ INSERT ELEMENTS SECTION ============ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-yellow-400" />
          <h4 className="font-semibold text-sm">중간 삽입 요소</h4>
          <span className="text-xs text-muted-foreground">(다중 선택 가능)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insertTemplates.map((t: any) =>
            renderTemplateCard(t, selected.inserts.includes(t.id), () => {
              setSelected(prev => ({
                ...prev,
                inserts: prev.inserts.includes(t.id)
                  ? prev.inserts.filter(id => id !== t.id)
                  : [...prev.inserts, t.id],
              }));
            })
          )}
        </div>
      </div>

      {/* ============ LAYOUT PREVIEW + SUMMARY & APPLY ============ */}
      {selectedCount > 0 && (
        <>
          <Separator />

          {/* Visual Layout Preview */}
          <Card className="border-muted-foreground/20 bg-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                강의 화면 미리보기
              </CardTitle>
              <CardDescription className="text-xs">선택한 포맷으로 구성된 강의 화면 레이아웃입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <LayoutPreview
                personnelTemplate={selected.personnel ? templates.find((t: any) => t.id === selected.personnel) : null}
                styleTemplate={selected.style ? templates.find((t: any) => t.id === selected.style) : null}
                insertTemplates={selected.inserts.map(id => templates.find((t: any) => t.id === id)).filter(Boolean)}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                선택한 포맷 요약
              </h4>
              <div className="space-y-2 mb-4">
                {selected.personnel && (() => {
                  const t = templates.find((t: any) => t.id === selected.personnel);
                  return t ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">인원</Badge>
                      <span>{t.name}</span>
                    </div>
                  ) : null;
                })()}
                {selected.style && (() => {
                  const t = templates.find((t: any) => t.id === selected.style);
                  return t ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">스타일</Badge>
                      <span>{t.name}</span>
                    </div>
                  ) : null;
                })()}
                {selected.inserts.map(id => {
                  const t = templates.find((t: any) => t.id === id);
                  return t ? (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">삽입</Badge>
                      <span>{t.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <Button className="w-full gap-2" onClick={handleApply}>
                <Sparkles className="w-4 h-4" /> 이 포맷으로 강의 구성하기
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
