import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Users, FileText, Image, Layers, Eye, ChevronLeft, ChevronRight, Plus, Trash2,
  Upload, Wand2, Loader2, GripVertical, Check, ArrowRight, Pencil, Circle,
  ArrowUpRight, CheckSquare, PenTool, MousePointer, Volume2, Play, Pause,
  Move, Settings2, Video, Download, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import VoicePreviewButton from "@/components/VoicePreviewButton";

// ============ TYPES ============
interface ScriptSection {
  id: string;
  section: number;
  text: string;
  avatarId?: number;
}

interface AnnotationData {
  type: "circle" | "arrow" | "check" | "underline" | "freehand";
  color: string;
  thickness: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
}

// ============ STEP DEFINITIONS ============
const STEPS = [
  { id: 1, title: "아바타 선택", icon: Users, desc: "강의에 사용할 AI 아바타를 선택하세요" },
  { id: 2, title: "스크립트", icon: FileText, desc: "강의 대본을 준비하세요" },
  { id: 3, title: "슬라이드", icon: Image, desc: "PPT/PDF/이미지를 업로드하세요" },
  { id: 4, title: "매칭 에디터", icon: Layers, desc: "슬라이드에 스크립트를 배치하세요" },
  { id: 5, title: "미리보기", icon: Eye, desc: "최종 설정을 확인하세요" },
];

const AVATAR_ROLES = [
  { value: "instructor", label: "강사", color: "bg-blue-500/20 text-blue-400" },
  { value: "host", label: "사회자", color: "bg-purple-500/20 text-purple-400" },
  { value: "guest", label: "게스트", color: "bg-green-500/20 text-green-400" },
  { value: "narrator", label: "내레이터", color: "bg-orange-500/20 text-orange-400" },
];

const ANNOTATION_TOOLS = [
  { type: "circle" as const, icon: Circle, label: "동그라미" },
  { type: "arrow" as const, icon: ArrowUpRight, label: "화살표" },
  { type: "check" as const, icon: CheckSquare, label: "체크" },
  { type: "underline" as const, icon: PenTool, label: "밑줄" },
  { type: "freehand" as const, icon: Pencil, label: "자유 그리기" },
];

const PEN_COLORS = ["#FF0000", "#00FF00", "#0066FF", "#FFFF00", "#FF6600", "#FF00FF", "#FFFFFF"];

// ============ MAIN COMPONENT ============
export default function LectureBuilder() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/lecture-builder/:id");
  const projectId = matched ? parseInt(params!.id) : null;

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Project creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [user, authLoading]);

  // Queries
  const projectsQuery = trpc.lectureBuilder.listProjects.useQuery(undefined, { enabled: !!user });
  const fullProjectQuery = trpc.lectureBuilder.getFullProject.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );
  const facesQuery = trpc.sampleFace.list.useQuery({});
  const voicesQuery = trpc.tts.voices.useQuery();

  // Mutations
  const createProject = trpc.lectureBuilder.createProject.useMutation({
    onSuccess: (data) => {
      toast.success("프로젝트가 생성되었습니다");
      setShowCreateDialog(false);
      setLocation(`/lecture-builder/${data.id}`);
    },
  });

  // Only set step from DB on initial load
  const [stepInitialized, setStepInitialized] = useState(false);
  useEffect(() => {
    if (fullProjectQuery.data?.project && !stepInitialized) {
      setCurrentStep(fullProjectQuery.data.project.currentStep);
      setStepInitialized(true);
    }
  }, [fullProjectQuery.data?.project?.currentStep, stepInitialized]);

  // Mutation to persist step changes
  const updateProject = trpc.lectureBuilder.updateProject.useMutation();

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  // ============ PROJECT LIST VIEW ============
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">강의 제작 스튜디오</h1>
              <p className="text-muted-foreground mt-1">AI 아바타로 전문적인 강의 영상을 만들어보세요</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2"><Plus className="w-5 h-5" /> 새 프로젝트</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>새 강의 프로젝트</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>프로젝트 제목</Label>
                    <Input placeholder="예: XPLAY 수익 구조 분석 강의" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>설명 (선택)</Label>
                    <Textarea placeholder="강의 주제 및 목표를 간단히 설명하세요" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  </div>
                  <Button className="w-full" disabled={!newTitle.trim() || createProject.isPending}
                    onClick={() => createProject.mutate({ title: newTitle.trim(), description: newDesc.trim() || undefined })}>
                    {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    프로젝트 생성
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {projectsQuery.isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !projectsQuery.data?.length ? (
            <Card className="border-dashed border-2 py-20">
              <CardContent className="flex flex-col items-center text-center">
                <Video className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">아직 프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-6">새 프로젝트를 만들어 AI 강의 영상을 제작해보세요</p>
                <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" /> 첫 프로젝트 만들기</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectsQuery.data.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setLocation(`/lecture-builder/${p.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{p.title}</CardTitle>
                      <Badge variant={p.status === "completed" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                        {p.status === "draft" ? "초안" : p.status === "in_progress" ? "진행중" : p.status === "ready" ? "준비완료" : p.status === "completed" ? "완성" : p.status}
                      </Badge>
                    </div>
                    {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Step {p.currentStep}/5</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(p.currentStep / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs">{new Date(p.updatedAt).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ BUILDER VIEW ============
  const project = fullProjectQuery.data?.project;
  const avatars = fullProjectQuery.data?.avatars || [];
  const slides = fullProjectQuery.data?.slides || [];
  const scripts = fullProjectQuery.data?.scripts || [];
  const annotations = fullProjectQuery.data?.annotations || [];
  const faces = facesQuery.data || [];
  const voices = voicesQuery.data || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Step Progress Bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/lecture-builder")} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> 프로젝트 목록
            </Button>
            <h2 className="font-semibold text-foreground truncate max-w-md">{project?.title || "로딩중..."}</h2>
            <div className="text-sm text-muted-foreground">Step {currentStep}/5</div>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isClickable = !isActive; // All steps are clickable except current
              return (
                <button key={step.id}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive ? "bg-primary text-primary-foreground" :
                    isCompleted ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                    "bg-muted/50 text-muted-foreground cursor-pointer hover:bg-muted"
                  }`}
                  onClick={() => {
                    if (isClickable) {
                      setCurrentStep(step.id);
                      if (projectId) updateProject.mutate({ id: projectId, currentStep: step.id });
                    }
                  }}
                >
                  <StepIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{step.title}</span>
                  {isCompleted && <Check className="w-3 h-3 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {fullProjectQuery.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {currentStep === 1 && (
              <Step1Avatars
                projectId={projectId}
                avatars={avatars}
                faces={faces}
                voices={voices}
                onRefresh={() => fullProjectQuery.refetch()}
              />
            )}
            {currentStep === 2 && (
              <Step2Scripts
                projectId={projectId}
                slides={slides}
                scripts={scripts}
                avatars={avatars}
                onRefresh={() => fullProjectQuery.refetch()}
              />
            )}
            {currentStep === 3 && (
              <Step3Slides
                projectId={projectId}
                slides={slides}
                onRefresh={() => fullProjectQuery.refetch()}
              />
            )}
            {currentStep === 4 && (
              <Step4Matching
                projectId={projectId}
                slides={slides}
                scripts={scripts}
                avatars={avatars}
                annotations={annotations}
                onRefresh={() => fullProjectQuery.refetch()}
              />
            )}
            {currentStep === 5 && (
              <Step5Preview
                projectId={projectId}
                project={project!}
                slides={slides}
                scripts={scripts}
                avatars={avatars}
                annotations={annotations}
                onRefresh={() => fullProjectQuery.refetch()}
              />
            )}
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="outline" disabled={currentStep <= 1}
            onClick={() => {
              const newStep = Math.max(1, currentStep - 1);
              setCurrentStep(newStep);
              if (projectId) updateProject.mutate({ id: projectId, currentStep: newStep });
            }}>
            <ChevronLeft className="w-4 h-4 mr-1" /> 이전
          </Button>
          <div className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1]?.desc}
          </div>
          {currentStep < 5 ? (
            <Button onClick={() => {
              const newStep = Math.min(5, currentStep + 1);
              setCurrentStep(newStep);
              if (projectId) updateProject.mutate({ id: projectId, currentStep: newStep });
            }}>
              다음 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="gap-2" onClick={() => toast.success("영상 생성 기능은 곧 출시됩니다!")}>
              <Video className="w-4 h-4" /> 영상 생성
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ STEP 1: AVATAR SELECTION ============
function Step1Avatars({ projectId, avatars, faces, voices, onRefresh }: {
  projectId: number;
  avatars: any[];
  faces: any[];
  voices: any[];
  onRefresh: () => void;
}) {
  const [selectedFaceId, setSelectedFaceId] = useState<number | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [avatarRole, setAvatarRole] = useState<string>("instructor");
  const [avatarVoice, setAvatarVoice] = useState("Kore");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const addAvatar = trpc.lectureBuilder.addAvatar.useMutation({
    onSuccess: () => {
      toast.success("아바타가 추가되었습니다");
      setShowAddDialog(false);
      setSelectedFaceId(null);
      setAvatarName("");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAvatar = trpc.lectureBuilder.deleteAvatar.useMutation({
    onSuccess: () => { toast.success("아바타가 삭제되었습니다"); onRefresh(); },
  });

  const selectedFace = faces.find(f => f.id === selectedFaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">아바타 선택</h2>
          <p className="text-muted-foreground">강의에 출연할 AI 아바타를 선택하세요. 최대 3명까지 추가할 수 있습니다.</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={avatars.length >= 3} className="gap-2"><Plus className="w-4 h-4" /> 아바타 추가</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>아바타 추가</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Face Gallery */}
              <div>
                <Label className="text-base font-semibold mb-3 block">얼굴 선택</Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {faces.filter(f => f.isActive).map(face => (
                    <button key={face.id}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                        selectedFaceId === face.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => { setSelectedFaceId(face.id); if (!avatarName) setAvatarName(face.name); }}
                    >
                      <img src={face.imageUrl} alt={face.name} className="w-full h-full object-cover" />
                      {selectedFaceId === face.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary-foreground bg-primary rounded-full p-1" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-1 py-0.5">
                        <span className="text-[10px] text-white truncate block">{face.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Avatar Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>이름</Label>
                  <Input placeholder="아바타 이름" value={avatarName} onChange={e => setAvatarName(e.target.value)} />
                </div>
                <div>
                  <Label>역할</Label>
                  <Select value={avatarRole} onValueChange={setAvatarRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVATAR_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>음성 선택</Label>
                <Select value={avatarVoice} onValueChange={setAvatarVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {voices.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v.desc})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" disabled={!selectedFaceId || !avatarName.trim() || addAvatar.isPending}
                onClick={() => addAvatar.mutate({
                  projectId,
                  sampleFaceId: selectedFaceId!,
                  name: avatarName.trim(),
                  role: avatarRole as any,
                  ttsVoiceId: avatarVoice,
                  sortOrder: avatars.length,
                })}>
                {addAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                아바타 추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Avatars */}
      {avatars.length === 0 ? (
        <Card className="border-dashed border-2 py-16">
          <CardContent className="flex flex-col items-center text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold mb-1">아바타를 추가하세요</h3>
            <p className="text-muted-foreground text-sm">강의에 출연할 AI 아바타를 선택해주세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {avatars.map((av, i) => {
            const face = faces.find(f => f.id === av.sampleFaceId);
            const roleInfo = AVATAR_ROLES.find(r => r.value === av.role);
            return (
              <Card key={av.id} className="relative group">
                <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={() => deleteAvatar.mutate({ id: av.id })}>
                  <X className="w-5 h-5 text-destructive hover:text-destructive/80" />
                </button>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                      {face?.imageUrl ? (
                        <img src={face.imageUrl} alt={av.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{av.name}</h3>
                      <Badge className={`${roleInfo?.color || ""} text-xs`}>{roleInfo?.label || av.role}</Badge>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> {av.ttsVoiceId}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ STEP 2: SCRIPTS ============
function Step2Scripts({ projectId, slides, scripts, avatars, onRefresh }: {
  projectId: number;
  slides: any[];
  scripts: any[];
  avatars: any[];
  onRefresh: () => void;
}) {
  const [mode, setMode] = useState<"generate" | "split" | "manual">("manual");
  const [prompt, setPrompt] = useState("");
  const [fullText, setFullText] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [language, setLanguage] = useState("ko");
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Load existing scripts into sections
  useEffect(() => {
    if (scripts.length > 0 && sections.length === 0) {
      setSections(scripts.map((s, i) => ({
        id: `existing-${s.id}`,
        section: i + 1,
        text: s.scriptText,
        avatarId: s.avatarId || undefined,
      })));
    }
  }, [scripts]);

  const generateScript = trpc.lectureBuilder.generateScript.useMutation({
    onSuccess: (data) => {
      const newSections = (data.sections || []).map((s: any, i: number) => ({
        id: `gen-${Date.now()}-${i}`,
        section: s.section || i + 1,
        text: s.text,
      }));
      setSections(newSections);
      toast.success(`${newSections.length}개 섹션이 생성되었습니다`);
    },
    onError: (e) => toast.error(e.message),
  });

  const splitScript = trpc.lectureBuilder.splitScript.useMutation({
    onSuccess: (data) => {
      const newSections = (data.sections || []).map((s: any, i: number) => ({
        id: `split-${Date.now()}-${i}`,
        section: s.section || i + 1,
        text: s.text,
      }));
      setSections(newSections);
      toast.success(`${newSections.length}개 섹션으로 분류되었습니다`);
    },
    onError: (e) => toast.error(e.message),
  });

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const deleteScriptMut = trpc.lectureBuilder.deleteScript.useMutation();

  const saveAllScripts = async () => {
    try {
      // Delete existing scripts first
      for (const s of scripts) {
        await deleteScriptMut.mutateAsync({ id: s.id });
      }
      // Save new sections
      for (let i = 0; i < sections.length; i++) {
        await setScriptMut.mutateAsync({
          projectId,
          slideId: 0, // Will be assigned in Step 4
          scriptText: sections[i].text,
          avatarId: sections[i].avatarId,
          sortOrder: i,
        });
      }
      toast.success("스크립트가 저장되었습니다");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "저장 실패");
    }
  };

  const addSection = () => {
    setSections(prev => [...prev, {
      id: `manual-${Date.now()}`,
      section: prev.length + 1,
      text: "",
    }]);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, section: i + 1 })));
  };

  const updateSection = (idx: number, text: string) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, text } : s));
  };

  const updateSectionAvatar = (idx: number, avatarId: number | undefined) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, avatarId } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">스크립트 준비</h2>
          <p className="text-muted-foreground">3가지 방법으로 강의 대본을 준비할 수 있습니다</p>
        </div>
        {sections.length > 0 && (
          <Button onClick={saveAllScripts} disabled={setScriptMut.isPending} className="gap-2">
            {setScriptMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            스크립트 저장 ({sections.length}개)
          </Button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        {[
          { id: "generate" as const, label: "AI 생성", icon: Wand2, desc: "프롬프트로 자동 생성" },
          { id: "split" as const, label: "스크립트 분류", icon: Layers, desc: "긴 텍스트를 섹션으로 분류" },
          { id: "manual" as const, label: "직접 입력", icon: FileText, desc: "섹션별 수동 입력" },
        ].map(m => (
          <button key={m.id}
            className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
              mode === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
            }`}
            onClick={() => setMode(m.id)}
          >
            <m.icon className={`w-5 h-5 mb-2 ${mode === m.id ? "text-primary" : "text-muted-foreground"}`} />
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-muted-foreground">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Mode Content */}
      {mode === "generate" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>강의 주제 및 프롬프트</Label>
              <Textarea placeholder="예: XPLAY 플랫폼의 수익 구조를 설명하는 강의. 게임 수익, 추천 보상, 팀 수익 등을 포함..." value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>섹션 수</Label>
                <Input type="number" min={1} max={50} value={slideCount} onChange={e => setSlideCount(parseInt(e.target.value) || 10)} />
              </div>
              <div>
                <Label>언어</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" disabled={!prompt.trim() || generateScript.isPending}
              onClick={() => generateScript.mutate({ projectId, prompt: prompt.trim(), language, slideCount })}>
              {generateScript.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              AI 스크립트 생성
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "split" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>전체 스크립트 텍스트</Label>
              <Textarea placeholder="이미 작성된 전체 강의 대본을 붙여넣기 하세요..." value={fullText} onChange={e => setFullText(e.target.value)} rows={10} />
            </div>
            <div>
              <Label>분류할 섹션 수</Label>
              <Input type="number" min={1} max={50} value={slideCount} onChange={e => setSlideCount(parseInt(e.target.value) || 10)} />
            </div>
            <Button className="w-full" disabled={!fullText.trim() || splitScript.isPending}
              onClick={() => splitScript.mutate({ projectId, fullText: fullText.trim(), slideCount, language })}>
              {splitScript.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
              AI 자동 분류
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "manual" && (
        <Button variant="outline" onClick={addSection} className="gap-2">
          <Plus className="w-4 h-4" /> 섹션 추가
        </Button>
      )}

      {/* Script Sections List */}
      {sections.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">스크립트 섹션 ({sections.length}개)</h3>
          {sections.map((sec, idx) => (
            <Card key={sec.id} className="group">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={sec.text}
                      onChange={e => updateSection(idx, e.target.value)}
                      placeholder={`섹션 ${idx + 1} 스크립트를 입력하세요...`}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center gap-2">
                      {avatars.length > 0 && (
                        <Select value={sec.avatarId?.toString() || "default"} onValueChange={v => updateSectionAvatar(idx, v === "default" ? undefined : parseInt(v))}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="화자 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">기본 화자</SelectItem>
                            {avatars.map(av => (
                              <SelectItem key={av.id} value={av.id.toString()}>{av.name} ({AVATAR_ROLES.find(r => r.value === av.role)?.label})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{sec.text.length}자 / ~{Math.ceil(sec.text.length / 5)}초</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => removeSection(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {mode === "manual" && (
            <Button variant="outline" onClick={addSection} className="w-full gap-2">
              <Plus className="w-4 h-4" /> 섹션 추가
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============ STEP 3: SLIDES ============
function Step3Slides({ projectId, slides, onRefresh }: {
  projectId: number;
  slides: any[];
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSlide = trpc.lectureBuilder.addSlide.useMutation({
    onSuccess: () => onRefresh(),
  });
  const deleteSlide = trpc.lectureBuilder.deleteSlide.useMutation({
    onSuccess: () => { toast.success("슬라이드가 삭제되었습니다"); onRefresh(); },
  });
  const reorderSlides = trpc.lectureBuilder.reorderSlides.useMutation({
    onSuccess: () => onRefresh(),
  });

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // Remove data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadImageSlide = trpc.lectureBuilder.uploadImageSlide.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let currentOrder = slides.length;
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: 파일 크기가 10MB를 초과합니다`);
          continue;
        }
        const base64 = await readFileAsBase64(file);
        const result = await uploadImageSlide.mutateAsync({
          projectId,
          fileData: base64,
          fileName: file.name,
          mimeType: file.type || "image/png",
          slideOrder: currentOrder++,
        });
        toast.success(`${file.name} 업로드 완료`);
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moveSlide = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slides.length) return;
    const newOrder = [...slides];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    reorderSlides.mutate({ projectId, slideIds: newOrder.map(s => s.id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">슬라이드 업로드</h2>
          <p className="text-muted-foreground">PPT, PDF, 또는 이미지 파일을 업로드하세요. 자동으로 개별 슬라이드로 분리됩니다.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept=".pptx,.pdf,.png,.jpg,.jpeg,.webp" className="hidden"
            onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            파일 업로드
          </Button>
        </div>
      </div>

      {/* Drop Zone */}
      {slides.length === 0 && (
        <div className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
          onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove("border-primary"); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary");
            if (e.dataTransfer.files.length > 0 && fileInputRef.current) {
              const dt = new DataTransfer();
              for (const f of Array.from(e.dataTransfer.files)) dt.items.add(f);
              fileInputRef.current.files = dt.files;
              fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }}
        >
          <Image className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">파일을 드래그하거나 클릭하세요</h3>
          <p className="text-muted-foreground">PPT (.pptx), PDF, 이미지 (.png, .jpg) 지원</p>
        </div>
      )}

      {/* Slide Grid */}
      {slides.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="group relative">
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                <img src={slide.imageUrl} alt={`슬라이드 ${idx + 1}`} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-1 left-1">
                <Badge className="text-xs bg-black/60 text-white">{idx + 1}</Badge>
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 && (
                  <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
                    onClick={() => moveSlide(idx, idx - 1)}>←</button>
                )}
                {idx < slides.length - 1 && (
                  <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
                    onClick={() => moveSlide(idx, idx + 1)}>→</button>
                )}
                <button className="w-6 h-6 rounded bg-red-500/80 text-white flex items-center justify-center"
                  onClick={() => deleteSlide.mutate({ id: slide.id })}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {/* Add more button */}
          <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============ STEP 4: MATCHING EDITOR ============
function Step4Matching({ projectId, slides, scripts, avatars, annotations, onRefresh }: {
  projectId: number;
  slides: any[];
  scripts: any[];
  avatars: any[];
  annotations: any[];
  onRefresh: () => void;
}) {
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [annotationTool, setAnnotationTool] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#FF0000");
  const [penThickness, setPenThickness] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);

  // Script assignments per slide
  const [slideScriptMap, setSlideScriptMap] = useState<Record<number, { text: string; avatarId?: number }>>({});

  // Initialize from existing data
  useEffect(() => {
    const map: Record<number, { text: string; avatarId?: number }> = {};
    scripts.forEach(s => {
      if (s.slideId && s.slideId > 0) {
        map[s.slideId] = { text: s.scriptText, avatarId: s.avatarId || undefined };
      }
    });
    setSlideScriptMap(map);
  }, [scripts]);

  // Unassigned scripts (slideId === 0)
  const unassignedScripts = scripts.filter(s => !s.slideId || s.slideId === 0);
  const currentSlide = slides[selectedSlideIdx];
  const currentScript = currentSlide ? slideScriptMap[currentSlide.id] : null;
  const currentAnnotations = currentSlide ? annotations.filter(a => a.slideId === currentSlide.id) : [];

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const addAnnotationMut = trpc.lectureBuilder.addAnnotation.useMutation();
  const deleteAnnotationMut = trpc.lectureBuilder.deleteAnnotation.useMutation();

  const assignScript = async (slideId: number, text: string, avatarId?: number) => {
    setSlideScriptMap(prev => ({ ...prev, [slideId]: { text, avatarId } }));
    try {
      await setScriptMut.mutateAsync({
        projectId,
        slideId,
        scriptText: text,
        avatarId,
        sortOrder: 0,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotationTool !== "freehand") {
      addAnnotationMut.mutate({
        projectId,
        slideId: currentSlide.id,
        annotationType: annotationTool as any,
        penColor,
        penThickness,
        pathData: { x, y, width: 10, height: 10 },
        showAtSec: 0,
        durationSec: 5,
      }, {
        onSuccess: () => onRefresh(),
      });
    }
  };

  // Freehand drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool !== "freehand") return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationTool !== "freehand") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawPoints(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentSlide) return;
    setIsDrawing(false);
    if (drawPoints.length > 2) {
      addAnnotationMut.mutate({
        projectId,
        slideId: currentSlide.id,
        annotationType: "freehand",
        penColor,
        penThickness,
        pathData: { points: drawPoints },
        showAtSec: 0,
        durationSec: 5,
      }, {
        onSuccess: () => { onRefresh(); setDrawPoints([]); },
      });
    }
    setDrawPoints([]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">매칭 에디터</h2>
      <p className="text-muted-foreground">각 슬라이드에 스크립트를 배치하고, 펜 애니메이션을 추가하세요</p>

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "60vh" }}>
        {/* Left: Slide Thumbnails */}
        <div className="col-span-2">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-2">
              {slides.map((slide, idx) => {
                const hasScript = !!slideScriptMap[slide.id];
                return (
                  <button key={slide.id}
                    className={`w-full rounded-lg overflow-hidden border-2 transition-all relative ${
                      selectedSlideIdx === idx ? "border-primary ring-2 ring-primary/30" : hasScript ? "border-green-500/50" : "border-muted"
                    }`}
                    onClick={() => setSelectedSlideIdx(idx)}
                  >
                    <div className="aspect-video">
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                    </div>
                    <div className="absolute top-0.5 left-0.5">
                      <Badge className="text-[10px] px-1 py-0 bg-black/60 text-white">{idx + 1}</Badge>
                    </div>
                    {hasScript && (
                      <div className="absolute bottom-0.5 right-0.5">
                        <Check className="w-3 h-3 text-green-400 bg-green-900/60 rounded-full p-0.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Slide Preview + Annotations */}
        <div className="col-span-6">
          {currentSlide ? (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <img src={currentSlide.imageUrl} alt="현재 슬라이드" className="w-full aspect-video object-contain" />
                {/* Annotation canvas overlay */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${annotationTool ? "cursor-crosshair" : "cursor-default"}`}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                {/* Render annotations */}
                {currentAnnotations.map(ann => {
                  const pd = ann.pathData as any;
                  if (!pd) return null;
                  return (
                    <div key={ann.id} className="absolute group/ann" style={{
                      left: `${pd.x || 0}%`, top: `${pd.y || 0}%`,
                      transform: "translate(-50%, -50%)",
                    }}>
                      {ann.annotationType === "circle" && (
                        <div className="w-12 h-12 rounded-full border-3" style={{ borderColor: ann.penColor || "#FF0000", borderWidth: ann.penThickness || 3 }} />
                      )}
                      {ann.annotationType === "arrow" && (
                        <ArrowUpRight className="w-8 h-8" style={{ color: ann.penColor || "#FF0000" }} />
                      )}
                      {ann.annotationType === "check" && (
                        <CheckSquare className="w-8 h-8" style={{ color: ann.penColor || "#00FF00" }} />
                      )}
                      <button className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover/ann:opacity-100"
                        onClick={() => deleteAnnotationMut.mutate({ id: ann.id }, { onSuccess: onRefresh })}>×</button>
                    </div>
                  );
                })}
              </div>

              {/* Annotation Toolbar */}
              <div className="flex items-center gap-2 p-2 bg-card rounded-lg border">
                <span className="text-xs text-muted-foreground mr-1">펜 도구:</span>
                {ANNOTATION_TOOLS.map(tool => (
                  <button key={tool.type}
                    className={`p-2 rounded-lg transition-colors ${annotationTool === tool.type ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setAnnotationTool(annotationTool === tool.type ? null : tool.type)}
                    title={tool.label}
                  >
                    <tool.icon className="w-4 h-4" />
                  </button>
                ))}
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">색상:</span>
                {PEN_COLORS.map(color => (
                  <button key={color}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${penColor === color ? "border-foreground scale-125" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setPenColor(color)}
                  />
                ))}
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">두께:</span>
                <div className="w-20">
                  <Slider value={[penThickness]} min={1} max={10} step={1} onValueChange={v => setPenThickness(v[0])} />
                </div>
                {annotationTool && (
                  <Button variant="ghost" size="sm" onClick={() => setAnnotationTool(null)} className="ml-auto text-xs">
                    <MousePointer className="w-3 h-3 mr-1" /> 선택 모드
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              슬라이드를 먼저 업로드하세요
            </div>
          )}
        </div>

        {/* Right: Script Assignment */}
        <div className="col-span-4">
          <div className="space-y-4">
            {/* Current slide script */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">슬라이드 {selectedSlideIdx + 1} 스크립트</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSlide ? (
                  <div className="space-y-3">
                    <Textarea
                      value={currentScript?.text || ""}
                      onChange={e => {
                        if (currentSlide) {
                          setSlideScriptMap(prev => ({
                            ...prev,
                            [currentSlide.id]: { ...prev[currentSlide.id], text: e.target.value },
                          }));
                        }
                      }}
                      onBlur={() => {
                        if (currentSlide && slideScriptMap[currentSlide.id]?.text) {
                          assignScript(currentSlide.id, slideScriptMap[currentSlide.id].text, slideScriptMap[currentSlide.id].avatarId);
                        }
                      }}
                      placeholder="이 슬라이드의 스크립트를 입력하세요..."
                      rows={5}
                    />
                    {avatars.length > 0 && (
                      <div>
                        <Label className="text-xs">화자</Label>
                        <Select
                          value={currentScript?.avatarId?.toString() || "default"}
                          onValueChange={v => {
                            if (currentSlide) {
                              const avatarId = v === "default" ? undefined : parseInt(v);
                              const text = slideScriptMap[currentSlide.id]?.text || "";
                              assignScript(currentSlide.id, text, avatarId);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">기본 화자</SelectItem>
                            {avatars.map(av => (
                              <SelectItem key={av.id} value={av.id.toString()}>{av.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">슬라이드를 선택하세요</p>
                )}
              </CardContent>
            </Card>

            {/* Unassigned scripts pool */}
            {unassignedScripts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">미배정 스크립트 ({unassignedScripts.length}개)</CardTitle>
                  <CardDescription className="text-xs">클릭하면 현재 슬라이드에 배치됩니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {unassignedScripts.map((s, i) => (
                        <button key={s.id}
                          className="w-full text-left p-2 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          onClick={() => {
                            if (currentSlide) {
                              assignScript(currentSlide.id, s.scriptText, s.avatarId || undefined);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0">{s.sortOrder + 1}</Badge>
                            <span className="text-xs line-clamp-2">{s.scriptText}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ STEP 5: PREVIEW & SETTINGS ============
function Step5Preview({ projectId, project, slides, scripts, avatars, annotations, onRefresh }: {
  projectId: number;
  project: any;
  slides: any[];
  scripts: any[];
  avatars: any[];
  annotations: any[];
  onRefresh: () => void;
}) {
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const updateProject = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => { toast.success("설정이 저장되었습니다"); onRefresh(); },
  });

  const assignedSlides = slides.filter(s => scripts.some(sc => sc.slideId === s.id));
  const totalDuration = scripts.reduce((acc, s) => acc + (s.estimatedDurationSec || 30), 0);

  // Auto-play preview
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      setPreviewSlideIdx(prev => {
        if (prev >= slides.length - 1) { setIsPlaying(false); return 0; }
        return prev + 1;
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, previewSlideIdx, slides.length]);

  const currentSlide = slides[previewSlideIdx];
  const currentSlideScript = currentSlide ? scripts.find(s => s.slideId === currentSlide.id) : null;
  const currentAvatar = currentSlideScript?.avatarId ? avatars.find(a => a.id === currentSlideScript.avatarId) : avatars[0];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">미리보기 & 최종 설정</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Preview Area */}
        <div className="col-span-8">
          <Card>
            <CardContent className="pt-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                {currentSlide ? (
                  <>
                    <img src={currentSlide.imageUrl} alt="미리보기" className="w-full h-full object-contain" />
                    {/* Avatar PIP overlay */}
                    {project.avatarPosition !== "none" && currentAvatar && (
                      <div className={`absolute ${
                        project.avatarPosition === "bottom-right" ? "bottom-4 right-4" :
                        project.avatarPosition === "bottom-left" ? "bottom-4 left-4" :
                        project.avatarPosition === "top-right" ? "top-4 right-4" :
                        "top-4 left-4"
                      }`}>
                        <div className={`${
                          project.avatarSize === "small" ? "w-20 h-20" :
                          project.avatarSize === "medium" ? "w-28 h-28" :
                          "w-36 h-36"
                        } ${
                          project.avatarShape === "circle" ? "rounded-full" :
                          project.avatarShape === "rounded" ? "rounded-xl" :
                          "rounded-none"
                        } overflow-hidden border-2 border-white/30 shadow-lg`}
                          style={{ opacity: (project.avatarOpacity || 100) / 100 }}
                        >
                          {(() => {
                            const face = currentAvatar?.sampleFaceId ? (undefined) : null; // simplified
                            return (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Users className="w-8 h-8 text-white/70" />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {/* Script overlay */}
                    {currentSlideScript && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
                        <p className="text-white text-sm line-clamp-2">{currentSlideScript.scriptText}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    슬라이드가 없습니다
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3 mt-4">
                <Button variant="outline" size="icon" onClick={() => setPreviewSlideIdx(Math.max(0, previewSlideIdx - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setPreviewSlideIdx(Math.min(slides.length - 1, previewSlideIdx + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: slides.length > 0 ? `${((previewSlideIdx + 1) / slides.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-sm text-muted-foreground">{previewSlideIdx + 1}/{slides.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="col-span-4 space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">프로젝트 요약</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">아바타</span><span>{avatars.length}명</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">슬라이드</span><span>{slides.length}장</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">배정된 스크립트</span><span>{assignedSlides.length}/{slides.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">예상 길이</span><span>~{Math.ceil(totalDuration / 60)}분</span></div>
            </CardContent>
          </Card>

          {/* Avatar Position */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">아바타 위치</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={project.avatarPosition} onValueChange={v => updateProject.mutate({ id: projectId, avatarPosition: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">우하단</SelectItem>
                  <SelectItem value="bottom-left">좌하단</SelectItem>
                  <SelectItem value="top-right">우상단</SelectItem>
                  <SelectItem value="top-left">좌상단</SelectItem>
                  <SelectItem value="none">없음</SelectItem>
                </SelectContent>
              </Select>

              <div>
                <Label className="text-xs">크기</Label>
                <Select value={project.avatarSize} onValueChange={v => updateProject.mutate({ id: projectId, avatarSize: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">작게</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="large">크게</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">모양</Label>
                <Select value={project.avatarShape} onValueChange={v => updateProject.mutate({ id: projectId, avatarShape: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">원형</SelectItem>
                    <SelectItem value="rounded">둥근 사각형</SelectItem>
                    <SelectItem value="rectangle">사각형</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">투명도: {project.avatarOpacity}%</Label>
                <Slider value={[project.avatarOpacity]} min={20} max={100} step={5}
                  onValueChange={v => updateProject.mutate({ id: projectId, avatarOpacity: v[0] })} />
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button className="w-full gap-2" size="lg"
            onClick={() => toast.success("영상 생성 기능은 곧 출시됩니다! 현재 설정이 저장되었습니다.")}>
            <Video className="w-5 h-5" /> 최종 영상 생성
          </Button>
        </div>
      </div>
    </div>
  );
}
