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

      {/* ============ SUMMARY & APPLY ============ */}
      {selectedCount > 0 && (
        <>
          <Separator />
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
