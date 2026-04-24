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
  Move, Settings2, Video, Download, X, Eraser, Palette, History, Undo2, Sparkles, Link2,
  Copy, Save
} from "lucide-react";
import Navbar from "@/components/Navbar";
import VoicePreviewButton from "@/components/VoicePreviewButton";
import KlingAvatarCreator from "@/components/KlingAvatarCreator";
import LectureFormatSelector from "@/components/LectureFormatSelector";

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
  { type: "eraser" as const, icon: Eraser, label: "지우개" },
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
  const [createStep, setCreateStep] = useState<"info" | "format">("info");
  const [selectedFormats, setSelectedFormats] = useState<any>(null);

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

  // Clone project mutation
  const cloneProjectMut = trpc.lectureBuilder.cloneProject.useMutation({
    onSuccess: (data) => {
      toast.success("프로젝트가 복제되었습니다");
      projectsQuery.refetch();
      setLocation(`/lecture-builder/${data.newProjectId}`);
    },
    onError: () => toast.error("복제에 실패했습니다"),
  });

  const handleCloneProject = (id: number, title: string) => {
    if (confirm(`"${title}" 프로젝트를 복제하시겠습니까?`)) {
      cloneProjectMut.mutate({ sourceProjectId: id, newTitle: `${title} (복사본)` });
    }
  };

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
            <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { setCreateStep("info"); setNewTitle(""); setNewDesc(""); setSelectedFormats(null); } }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2"><Plus className="w-5 h-5" /> 새 프로젝트</Button>
              </DialogTrigger>
              <DialogContent className={createStep === "format" ? "sm:max-w-4xl max-h-[85vh] overflow-y-auto" : ""}>
                <DialogHeader>
                  <DialogTitle>
                    {createStep === "info" ? "새 강의 프로젝트" : "강의 포맷 선택"}
                  </DialogTitle>
                </DialogHeader>
                {createStep === "info" ? (
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>프로젝트 제목</Label>
                      <Input placeholder="예: XPLAY 수익 구조 분석 강의" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>설명 (선택)</Label>
                      <Textarea placeholder="강의 주제 및 목표를 간단히 설명하세요" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" disabled={!newTitle.trim()}
                        onClick={() => setCreateStep("format")}>
                        <Sparkles className="w-4 h-4" /> 포맷 선택하고 생성
                      </Button>
                      <Button className="flex-1" disabled={!newTitle.trim() || createProject.isPending}
                        onClick={() => createProject.mutate({ title: newTitle.trim(), description: newDesc.trim() || undefined })}>
                        {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        바로 생성
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setCreateStep("info")}>
                      <ChevronLeft className="w-4 h-4" /> 뒤로
                    </Button>
                    <LectureFormatSelector
                      onApply={(formats, templates) => {
                        setSelectedFormats({ formats, templates });
                        toast.success(`${templates.length}개 포맷이 선택되었습니다. 아바타와 스크립트가 자동 구성됩니다.`);
                        createProject.mutate({
                          title: newTitle.trim(),
                          description: newDesc.trim() || undefined,
                          formatSelection: {
                            personnelId: formats.personnel,
                            styleId: formats.style,
                            insertIds: formats.inserts,
                          },
                        });
                      }}
                    />
                  </div>
                )}
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
                <Card key={p.id} className="group cursor-pointer hover:border-primary/50 transition-colors relative"
                  onClick={() => setLocation(`/lecture-builder/${p.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{p.title}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleCloneProject(p.id, p.title); }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Badge variant={p.status === "completed" ? "default" : p.status === "draft" ? "secondary" : "outline"}>
                          {p.status === "draft" ? "초안" : p.status === "in_progress" ? "진행중" : p.status === "ready" ? "준비완료" : p.status === "completed" ? "완성" : p.status}
                        </Badge>
                      </div>
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
  const avatarOverrides = fullProjectQuery.data?.avatarOverrides || [];
  const insertContent = fullProjectQuery.data?.insertContent || [];
  const transitions = fullProjectQuery.data?.transitions || [];
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
                avatarOverrides={avatarOverrides}
                insertContent={insertContent}
                transitions={transitions}
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
                avatarOverrides={avatarOverrides}
                insertContent={insertContent}
                transitions={transitions}
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
  const [showKlingDialog, setShowKlingDialog] = useState(false);

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
        <div className="flex items-center gap-2">
          <Dialog open={showKlingDialog} onOpenChange={setShowKlingDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" /> KLING AI 영상 만들기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> KLING AI 아바타 영상 생성</DialogTitle></DialogHeader>
              <KlingAvatarCreator
                onVideoCreated={(videoUrl) => {
                  toast.success("AI 영상이 생성되었습니다! 아바타에 활용할 수 있습니다.");
                }}
              />
            </DialogContent>
          </Dialog>
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
                <div className="flex items-center gap-2">
                  <Select value={avatarVoice} onValueChange={setAvatarVoice}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {voices.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.desc})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <VoicePreviewButton voiceId={avatarVoice} size="default" variant="outline" />
                </div>
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
                        <VoicePreviewButton voiceId={av.ttsVoiceId || ""} size="sm" variant="ghost" className="ml-1 h-6 w-6 p-0" />
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
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const [showVersionPanel, setShowVersionPanel] = useState(false);

  const saveVersionMut = trpc.lectureBuilder.saveScriptVersion.useMutation({
    onSuccess: (data) => { toast.success(`\uBC84\uC804 ${data.versionNumber} \uC800\uC7A5\uB428`); versionsQuery.refetch(); },
  });
  const versionsQuery = trpc.lectureBuilder.listScriptVersions.useQuery(
    { projectId },
    { enabled: showVersionPanel }
  );
  const restoreVersionMut = trpc.lectureBuilder.restoreScriptVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`\uBC84\uC804 ${data.restoredVersion}\uC73C\uB85C \uBCF5\uC6D0\uB428 (${data.sectionCount}\uAC1C \uC139\uC158)`);
      onRefresh();
    },
  });

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
      const newSections = (data.sections || []).map((s: any, i: number) => {
        let text = s.text;
        // Prepend speaker and type info if available
        const prefix: string[] = [];
        if (s.type && s.type !== 'main') {
          const typeMap: Record<string, string> = { intro: '도입', main: '본문', insert: '삽입', qa: 'Q&A', closing: '마무리' };
          prefix.push(typeMap[s.type] || s.type);
        }
        if (s.speaker) prefix.push(s.speaker);
        if (prefix.length > 0 && !text.startsWith('[')) {
          text = `[${prefix.join(' - ')}] ${text}`;
        }
        return {
          id: `gen-${Date.now()}-${i}`,
          section: s.section || i + 1,
          text,
        };
      });
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

  // AI Script Proofread (교정)
  const [proofreadingIdx, setProofreadingIdx] = useState<number | null>(null);
  const [proofreadFilter, setProofreadFilter] = useState<"smooth" | "news" | "presentation" | "conversational" | "dramatic" | "concise">("smooth");
  const [proofreadPreview, setProofreadPreview] = useState<{ idx: number; original: string; proofread: string; filter: string } | null>(null);
  const proofreadMut = trpc.lectureBuilder.proofreadScript.useMutation({
    onSuccess: (data) => {
      if (proofreadingIdx !== null) {
        setProofreadPreview({ idx: proofreadingIdx, original: data.original, proofread: data.proofread, filter: data.filter });
      }
      setProofreadingIdx(null);
    },
    onError: (e: any) => { toast.error(`AI 교정 실패: ${e.message}`); setProofreadingIdx(null); },
  });
  const handleProofread = (idx: number) => {
    const sec = sections[idx];
    if (!sec?.text.trim()) { toast.error("교정할 텍스트가 없습니다"); return; }
    setProofreadingIdx(idx);
    proofreadMut.mutate({ scriptText: sec.text, filter: proofreadFilter, language });
  };
  const applyProofread = () => {
    if (!proofreadPreview) return;
    const newSections = [...sections];
    newSections[proofreadPreview.idx] = { ...newSections[proofreadPreview.idx], text: proofreadPreview.proofread };
    setSections(newSections);
    setProofreadPreview(null);
    toast.success("AI 교정이 적용되었습니다");
  };

  // AI Script Improvement
  const [improvingIdx, setImprovingIdx] = useState<number | null>(null);
  const [improvedPreview, setImprovedPreview] = useState<{ idx: number; original: string; improved: string } | null>(null);
  const [improveStyle, setImproveStyle] = useState<"formal" | "casual" | "educational" | "storytelling">("educational");
  const improveScriptMut = trpc.lectureBuilder.improveScript.useMutation({
    onSuccess: (data, _vars) => {
      if (improvingIdx !== null) {
        setImprovedPreview({ idx: improvingIdx, original: data.original, improved: data.improved });
      }
      setImprovingIdx(null);
    },
    onError: (e: any) => {
      toast.error(`AI 개선 실패: ${e.message}`);
      setImprovingIdx(null);
    },
  });

  const handleImproveScript = (idx: number) => {
    const sec = sections[idx];
    if (!sec || !sec.text.trim()) {
      toast.error("개선할 스크립트가 없습니다");
      return;
    }
    setImprovingIdx(idx);
    improveScriptMut.mutate({
      scriptText: sec.text,
      style: improveStyle,
      language: language,
    });
  };

  const applyImprovement = () => {
    if (!improvedPreview) return;
    const newSections = [...sections];
    newSections[improvedPreview.idx] = { ...newSections[improvedPreview.idx], text: improvedPreview.improved };
    setSections(newSections);
    setImprovedPreview(null);
    toast.success("AI 개선 스크립트가 적용되었습니다");
  };

  // --- Batch AI Improvement ---
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [batchImproving, setBatchImproving] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<{ id: string; original: string; improved: string }[] | null>(null);

  const toggleSectionSelect = (id: string) => {
    setSelectedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const validIds = sections.filter(s => s.text.trim()).map(s => s.id);
    if (selectedSectionIds.size === validIds.length) {
      setSelectedSectionIds(new Set());
    } else {
      setSelectedSectionIds(new Set(validIds));
    }
  };
  const improveAllMut = trpc.lectureBuilder.improveAllScripts.useMutation({
    onSuccess: (data) => {
      setBatchImproving(false);
      setBatchProgress(100);
      setBatchResults(data.results);
      toast.success(`${data.improved}/${data.total}개 섹션이 개선되었습니다`);
    },
    onError: (e: any) => {
      setBatchImproving(false);
      setBatchProgress(0);
      toast.error(`전체 개선 실패: ${e.message}`);
    },
  });

  const handleImproveAll = () => {
    let targetSections = sections.filter(s => s.text.trim().length > 0);
    if (selectedSectionIds.size > 0) {
      targetSections = targetSections.filter(s => selectedSectionIds.has(s.id));
    }
    if (targetSections.length === 0) {
      toast.error("개선할 스크립트가 없습니다. 섹션을 선택해주세요.");
      return;
    }
    setBatchImproving(true);
    setBatchProgress(10);
    const progressInterval = setInterval(() => {
      setBatchProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 2000);
    improveAllMut.mutate(
      { projectId, sections: targetSections.map(s => ({ id: s.id, text: s.text })), style: improveStyle, language },
      { onSettled: () => clearInterval(progressInterval) }
    );
  };

  const applyAllImprovements = () => {
    if (!batchResults) return;
    const newSections = sections.map(sec => {
      const result = batchResults.find(r => r.id === sec.id);
      return result && result.improved !== result.original ? { ...sec, text: result.improved } : sec;
    });
    setSections(newSections);
    setBatchResults(null);
    setBatchProgress(0);
    toast.success("전체 AI 개선 스크립트가 적용되었습니다");
  };

  // Auto-save: debounce 30s after any section edit
  useEffect(() => {
    if (sections.length === 0 || sections.every(s => !s.text.trim())) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        for (const s of scripts) {
          await deleteScriptMut.mutateAsync({ id: s.id });
        }
        const current = sectionsRef.current;
        for (let i = 0; i < current.length; i++) {
          if (!current[i].text.trim()) continue;
          await setScriptMut.mutateAsync({
            projectId,
            slideId: 0,
            scriptText: current[i].text,
            avatarId: current[i].avatarId,
            sortOrder: i,
          });
        }
        setAutoSaveStatus("saved");
        setLastSavedAt(new Date());
        onRefresh();
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 30000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [sections]);

  const saveAllScripts = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
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
          <div className="flex items-center gap-3">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> \uc790\ub3d9 \uc800\uc7a5 \uc911...
              </span>
            )}
            {autoSaveStatus === "saved" && lastSavedAt && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> \uc790\ub3d9 \uc800\uc7a5\ub428 {lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button onClick={async () => { await saveAllScripts(); saveVersionMut.mutate({ projectId, changeDescription: `수동 저장 (${sections.length}개 섹션)`, changeType: "manual" }); }} disabled={setScriptMut.isPending} className="gap-2">
              {setScriptMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              \uc2a4\ud06c\ub9bd\ud2b8 \uc800\uc7a5 ({sections.length}\uac1c)
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowVersionPanel(!showVersionPanel)} className="gap-1">
              <History className="w-4 h-4" /> \ubc84\uc804
            </Button>
          </div>
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
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="th">ภาษาไทย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Format context toggle */}
            {avatars.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <input type="checkbox" id="useFormatCtx" className="w-4 h-4 rounded" defaultChecked />
                <label htmlFor="useFormatCtx" className="text-sm flex-1">
                  <span className="font-medium">포맷 기반 생성</span>
                  <span className="text-muted-foreground ml-1">- 현재 아바타({avatars.length}명)와 기존 섹션 구조를 반영하여 스크립트를 생성합니다</span>
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" disabled={!prompt.trim() || generateScript.isPending}
                onClick={() => generateScript.mutate({ projectId, prompt: prompt.trim(), language, slideCount, useFormatContext: !!(avatars.length > 0 && (document.getElementById('useFormatCtx') as HTMLInputElement)?.checked) })}>
                {generateScript.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                AI 스크립트 생성
              </Button>
              {scripts.length > 0 && (
                <Button variant="outline" className="w-full" disabled={!prompt.trim() || generateScript.isPending}
                  onClick={() => {
                    if (confirm('기존 스크립트를 유지하면서 추가 섹션을 생성합니다. 계속하시겠습니까?')) {
                      generateScript.mutate({ projectId, prompt: `기존 스크립트에 추가할 내용: ${prompt.trim()}`, language, slideCount, useFormatContext: true });
                    }
                  }}>
                  <Plus className="w-4 h-4 mr-2" />
                  추가 섹션 생성
                </Button>
              )}
            </div>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border accent-primary"
                  checked={selectedSectionIds.size > 0 && selectedSectionIds.size === sections.filter(s => s.text.trim()).length}
                  onChange={toggleSelectAll}
                />
                전체선택
              </label>
              <h3 className="font-semibold text-lg">스크립트 섹션 ({sections.length}개){selectedSectionIds.size > 0 && <span className="text-sm text-primary font-normal ml-1">({selectedSectionIds.size}개 선택)</span>}</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
              onClick={handleImproveAll}
              disabled={batchImproving || sections.filter(s => s.text.trim()).length === 0}
            >
              {batchImproving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 개선 중... ({Math.round(batchProgress)}%)</>
              ) : selectedSectionIds.size > 0 ? (
                <><Wand2 className="w-4 h-4" /> 선택 {selectedSectionIds.size}개 AI 개선</>
              ) : (
                <><Wand2 className="w-4 h-4" /> 전체 AI 스크립트 개선</>
              )}
            </Button>
          </div>
          {batchImproving && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500" style={{ width: `${batchProgress}%` }} />
            </div>
          )}
          {sections.map((sec, idx) => (
            <Card key={sec.id} className={`group transition-colors ${selectedSectionIds.has(sec.id) ? "border-primary/40 bg-primary/5" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      checked={selectedSectionIds.has(sec.id)}
                      onChange={() => toggleSectionSelect(sec.id)}
                    />
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
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-cyan-500 border-cyan-500/30 hover:bg-cyan-500/10"
                        onClick={() => handleProofread(idx)}
                        disabled={proofreadingIdx === idx || !sec.text.trim()}
                      >
                        {proofreadingIdx === idx ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> 교정 중...</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> AI 교정</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => handleImproveScript(idx)}
                        disabled={improvingIdx === idx || !sec.text.trim()}
                      >
                        {improvingIdx === idx ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> AI 개선 중...</>
                        ) : (
                          <><Wand2 className="w-3 h-3" /> AI 개선</>
                        )}
                      </Button>
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

          {/* AI Proofread Filter Selector */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">AI 교정 필터:</span>
            {(["smooth", "news", "presentation", "conversational", "dramatic", "concise"] as const).map(f => (
              <button key={f}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  proofreadFilter === f ? "bg-cyan-500 text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                onClick={() => setProofreadFilter(f)}
              >
                {f === "smooth" ? "부드럽게" : f === "news" ? "뉴스체" : f === "presentation" ? "발표체" : f === "conversational" ? "대화체" : f === "dramatic" ? "극적" : "간결"}
              </button>
            ))}
          </div>
          {/* AI Improvement Style Selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">AI 개선 스타일:</span>
            {(["educational", "formal", "casual", "storytelling"] as const).map(s => (
              <button key={s}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  improveStyle === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
                onClick={() => setImproveStyle(s)}
              >
                {s === "educational" ? "교육적" : s === "formal" ? "격식적" : s === "casual" ? "친근" : "스토리"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Proofread Preview Dialog */}
      {proofreadPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                AI 교정 결과
                <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                  {proofreadPreview.filter === "smooth" ? "부드럽게" : proofreadPreview.filter === "news" ? "뉴스체" : proofreadPreview.filter === "presentation" ? "발표체" : proofreadPreview.filter === "conversational" ? "대화체" : proofreadPreview.filter === "dramatic" ? "극적" : "간결"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">원본</h4>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {proofreadPreview.original}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-cyan-500 mb-2">교정된 버전</h4>
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {proofreadPreview.proofread}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setProofreadPreview(null)}>
                  취소
                </Button>
                <Button onClick={applyProofread} className="gap-1 bg-cyan-600 hover:bg-cyan-700">
                  <Check className="w-4 h-4" /> 교정 적용
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Improvement Preview Dialog */}
      {improvedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                AI 스크립트 개선 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">원본</h4>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {improvedPreview.original}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">개선된 버전</h4>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm whitespace-pre-wrap max-h-60 overflow-auto">
                    {improvedPreview.improved}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImprovedPreview(null)}>
                  취소
                </Button>
                <Button onClick={applyImprovement} className="gap-1">
                  <Check className="w-4 h-4" /> 개선된 버전 적용
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batch AI Improvement Results Dialog */}
      {batchResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                전체 AI 스크립트 개선 결과
                <Badge variant="outline" className="ml-2">
                  {batchResults.filter(r => r.improved !== r.original).length}/{batchResults.length}개 개선됨
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                {batchResults.map((result, idx) => {
                  const changed = result.improved !== result.original;
                  return (
                    <div key={result.id} className={`p-3 rounded-lg border ${changed ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">섹션 {idx + 1}</Badge>
                        {changed ? (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">개선됨</Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground text-xs">변경 없음</Badge>
                        )}
                      </div>
                      {changed ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">원본</span>
                            <div className="p-2 bg-muted/50 rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">{result.original}</div>
                          </div>
                          <div>
                            <span className="text-xs text-primary mb-1 block">개선</span>
                            <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs whitespace-pre-wrap max-h-32 overflow-auto">{result.improved}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground line-clamp-2">{result.original}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setBatchResults(null); setBatchProgress(0); }}>
                  취소
                </Button>
                <Button onClick={applyAllImprovements} className="gap-1">
                  <Check className="w-4 h-4" /> 전체 적용 ({batchResults.filter(r => r.improved !== r.original).length}개)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Improvement History */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-4">
          <ImprovementHistoryPanel projectId={projectId} sections={sections} setSections={setSections} />
        </CardContent>
      </Card>

      {/* Script Version History Panel */}
      {showVersionPanel && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                \uc2a4\ud06c\ub9bd\ud2b8 \ubc84\uc804 \uc774\ub825
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowVersionPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>\uc218\ub3d9 \uc800\uc7a5 \uc2dc \uc790\ub3d9\uc73c\ub85c \ubc84\uc804\uc774 \uc0dd\uc131\ub429\ub2c8\ub2e4. \uc774\uc804 \ubc84\uc804\uc73c\ub85c \ub3cc\uc544\uac08 \uc218 \uc788\uc2b5\ub2c8\ub2e4.</CardDescription>
          </CardHeader>
          <CardContent>
            {versionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !versionsQuery.data?.length ? (
              <p className="text-center text-muted-foreground py-6">\uc800\uc7a5\ub41c \ubc84\uc804\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc2a4\ud06c\ub9bd\ud2b8\ub97c \uc800\uc7a5\ud558\uba74 \uc790\ub3d9\uc73c\ub85c \ubc84\uc804\uc774 \uc0dd\uc131\ub429\ub2c8\ub2e4.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {versionsQuery.data.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-500">v{v.versionNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.changeType === "manual" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {v.changeType === "manual" ? "\uc218\ub3d9" : "\uc790\ub3d9"}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.sectionCount}\uac1c \uc139\uc158</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{v.changeDescription}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(v.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                      disabled={restoreVersionMut.isPending}
                      onClick={() => {
                        if (confirm(`\uBC84\uC804 ${v.versionNumber}\uC73C\uB85C \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uD604\uC7AC \uC2A4\uD06C\uB9BD\uD2B8\uAC00 \uB300\uCCB4\uB429\uB2C8\uB2E4.`)) {
                          restoreVersionMut.mutate({ projectId, versionId: v.id });
                        }
                      }}
                    >
                      <Undo2 className="w-3.5 h-3.5" /> \ubcf5\uc6d0
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Improvement History Sub-component ---
function ImprovementHistoryPanel({ projectId, sections, setSections }: {
  projectId: number;
  sections: any[];
  setSections: (s: any[]) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [detailGroup, setDetailGroup] = useState<{ batchId: string; style: string; count: number; createdAt: Date; sections: any[] } | null>(null);
  const historyQuery = trpc.lectureBuilder.getImprovementHistory.useQuery(
    { projectId },
    { enabled: showHistory }
  );
  const revertMut = trpc.lectureBuilder.revertImprovement.useMutation({
    onSuccess: (data) => {
      const newSections = sections.map(sec => {
        const reverted = data.sections.find((s: any) => s.sectionId === sec.id);
        return reverted ? { ...sec, text: reverted.originalText } : sec;
      });
      setSections(newSections);
      toast.success(`${data.sections.length}\uac1c \uc139\uc158\uc774 \uc774\uc804 \ubc84\uc804\uc73c\ub85c \ub418\ub3cc\ub824\uc84c\uc2b5\ub2c8\ub2e4`);
      historyQuery.refetch();
      setDetailGroup(null);
    },
    onError: (e: any) => toast.error(`\ub418\ub3cc\ub9ac\uae30 \uc2e4\ud328: ${e.message}`),
  });

  const groupedHistory = useMemo(() => {
    if (!historyQuery.data) return [];
    const groups = new Map<string, { batchId: string; style: string; count: number; createdAt: Date; sections: typeof historyQuery.data }>(); 
    for (const item of historyQuery.data) {
      const key = item.batchId || `single-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, { batchId: key, style: item.style, count: 0, createdAt: item.createdAt, sections: [] });
      }
      const g = groups.get(key)!;
      g.count++;
      g.sections.push(item);
    }
    return Array.from(groups.values());
  }, [historyQuery.data]);

  const styleLabels: Record<string, string> = { formal: "\uaca9\uc2dd\uc801", casual: "\uce5c\uadfc", educational: "\uad50\uc721\uc801", storytelling: "\uc2a4\ud1a0\ub9ac" };

  return (
    <div className="space-y-3">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        onClick={() => setShowHistory(!showHistory)}
      >
        <History className="w-4 h-4" />
        AI \uac1c\uc120 \uc774\ub825 {showHistory ? "\u25b2" : "\u25bc"}
      </button>
      {showHistory && (
        <div className="space-y-2">
          {historyQuery.isLoading && <p className="text-sm text-muted-foreground">\ub85c\ub529 \uc911...</p>}
          {groupedHistory.length === 0 && !historyQuery.isLoading && (
            <p className="text-sm text-muted-foreground">\uc544\uc9c1 AI \uac1c\uc120 \uc774\ub825\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</p>
          )}
          {groupedHistory.map((group) => (
            <div
              key={group.batchId}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setDetailGroup(group)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{styleLabels[group.style] || group.style}</Badge>
                  <span className="text-sm font-medium">{group.count}\uac1c \uc139\uc158 \uac1c\uc120</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(group.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); setDetailGroup(group); }}
                >
                  <Eye className="w-3.5 h-3.5" /> \uc0c1\uc138
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (group.batchId.startsWith("single-")) {
                      toast.error("\ub2e8\uc77c \uac1c\uc120\uc740 \ub418\ub3cc\ub9ac\uae30\ub97c \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4");
                      return;
                    }
                    revertMut.mutate({ batchId: group.batchId });
                  }}
                  disabled={revertMut.isPending}
                >
                  <Undo2 className="w-3.5 h-3.5" /> \ub418\ub3cc\ub9ac\uae30
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Comparison Modal */}
      {detailGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetailGroup(null)}>
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold">AI \uac1c\uc120 \uc0c1\uc138 \ube44\uad50</h3>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs mr-2">{styleLabels[detailGroup.style] || detailGroup.style}</Badge>
                    {detailGroup.count}\uac1c \uc139\uc158 \u00b7 {new Date(detailGroup.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!detailGroup.batchId.startsWith("single-") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                    onClick={() => revertMut.mutate({ batchId: detailGroup.batchId })}
                    disabled={revertMut.isPending}
                  >
                    <Undo2 className="w-3.5 h-3.5" /> \ub418\ub3cc\ub9ac\uae30
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setDetailGroup(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4 space-y-4">
              {detailGroup.sections.map((item: any, idx: number) => {
                const hasChange = item.originalText !== item.improvedText;
                return (
                  <div key={item.id || idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b flex items-center gap-2">
                      <span className="text-sm font-medium">\uc139\uc158 {idx + 1}</span>
                      {hasChange ? (
                        <Badge className="bg-green-500/10 text-green-500 text-xs">\uac1c\uc120\ub428</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">\ubcc0\uacbd\uc5c6\uc74c</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">\uc6d0\ubcf8</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{item.originalText || "(\ube44\uc5b4\uc788\uc74c)"}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">\uac1c\uc120</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.improvedText || "(\ube44\uc5b4\uc788\uc74c)"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
  const [converting, setConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState("");
  const [extractedTexts, setExtractedTexts] = useState<{ pageIndex: number; text: string }[]>([]);
  const [applyingScripts, setApplyingScripts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteSlide = trpc.lectureBuilder.deleteSlide.useMutation({
    onSuccess: () => { toast.success("슬라이드가 삭제되었습니다"); onRefresh(); },
  });
  const reorderSlides = trpc.lectureBuilder.reorderSlides.useMutation({
    onSuccess: () => onRefresh(),
  });
  const uploadImageSlide = trpc.lectureBuilder.uploadImageSlide.useMutation();
  const convertFileMut = trpc.lectureBuilder.convertFile.useMutation();
  const applyTextsMut = trpc.lectureBuilder.applyExtractedTextsAsScripts.useMutation();

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const isPptOrPdf = (file: File) => {
    const ext = file.name.toLowerCase();
    return ext.endsWith(".pptx") || ext.endsWith(".ppt") || ext.endsWith(".pdf");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      let currentOrder = slides.length;
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name}: 파일 크기가 50MB를 초과합니다`);
          continue;
        }

        const base64 = await readFileAsBase64(file);

        if (isPptOrPdf(file)) {
          // PPT/PDF → 서버에서 이미지로 변환
          setConverting(true);
          setConversionStatus(`${file.name} 변환 중...`);
          try {
            const result = await convertFileMut.mutateAsync({
              projectId,
              fileData: base64,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
            });
            // Store extracted texts for script draft creation
            if (result.extractedTexts && result.extractedTexts.length > 0) {
              setExtractedTexts(result.extractedTexts);
            }
            toast.success(`${file.name}: ${result.count}개 슬라이드로 변환 완료${result.extractedTexts?.length ? " (텍스트 추출 완료)" : ""}`);
          } catch (err: any) {
            toast.error(`${file.name} 변환 실패: ${err.message}`);
          } finally {
            setConverting(false);
            setConversionStatus("");
          }
        } else {
          // 이미지 파일 직접 업로드
          await uploadImageSlide.mutateAsync({
            projectId,
            fileData: base64,
            fileName: file.name,
            mimeType: file.type || "image/png",
            slideOrder: currentOrder++,
          });
          toast.success(`${file.name} 업로드 완료`);
        }
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
    reorderSlides.mutate({ projectId, slideIds: newOrder.map((s: any) => s.id) });
  };

  const isProcessing = uploading || converting;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">슬라이드 업로드</h2>
          <p className="text-muted-foreground">PPT, PDF, 또는 이미지 파일을 업로드하세요. PPT/PDF는 자동으로 개별 슬라이드 이미지로 변환됩니다.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept=".pptx,.ppt,.pdf,.png,.jpg,.jpeg,.webp" className="hidden"
            onChange={handleFileUpload} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {converting ? "변환 중..." : "파일 업로드"}
          </Button>
        </div>
      </div>

      {/* Conversion Status */}
      {converting && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <div>
            <p className="text-sm font-medium">{conversionStatus}</p>
            <p className="text-xs text-muted-foreground">PPT/PDF를 슬라이드 이미지로 변환하고 있습니다. 파일 크기에 따라 시간이 걸릴 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {slides.length === 0 && !converting && (
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
          <p className="text-xs text-muted-foreground mt-2">PPT/PDF 파일은 서버에서 자동으로 슬라이드별 이미지로 변환됩니다</p>
        </div>
      )}

      {/* Extracted Text → Script Draft Banner */}
      {extractedTexts.length > 0 && slides.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PPT/PDF 텍스트 추출 완료 ({extractedTexts.filter(t => t.text && !t.text.startsWith("[Page")).length}개 슬라이드)
                </CardTitle>
                <CardDescription className="text-xs">
                  추출된 텍스트를 스크립트 초안으로 자동 적용할 수 있습니다. Step 2에서 편집 가능합니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 border-green-500/30 hover:bg-green-500/10"
                  disabled={applyingScripts}
                  onClick={async () => {
                    setApplyingScripts(true);
                    try {
                      const pairs = extractedTexts
                        .filter(t => t.text && !t.text.startsWith("[Page"))
                        .map((t, idx) => ({
                          slideId: slides[t.pageIndex]?.id || slides[idx]?.id,
                          text: t.text,
                        }))
                        .filter(p => p.slideId);
                      const result = await applyTextsMut.mutateAsync({
                        projectId,
                        slideTextPairs: pairs,
                      });
                      toast.success(`${result.created}개 스크립트 초안이 생성되었습니다`);
                      setExtractedTexts([]);
                      onRefresh();
                    } catch (err: any) {
                      toast.error(err.message || "스크립트 적용 실패");
                    } finally {
                      setApplyingScripts(false);
                    }
                  }}
                >
                  {applyingScripts ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  스크립트 초안 적용
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setExtractedTexts([])}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {extractedTexts.slice(0, 10).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t.pageIndex + 1}</Badge>
                    <span className="text-muted-foreground line-clamp-2">{t.text || "(텍스트 없음)"}</span>
                  </div>
                ))}
                {extractedTexts.length > 10 && (
                  <p className="text-[10px] text-muted-foreground">... 외 {extractedTexts.length - 10}개 슬라이드</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Slide Grid */}
      {slides.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {slides.map((slide: any, idx: number) => (
            <div key={slide.id} className="group relative">
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                <img src={slide.imageUrl} alt={`슬라이드 ${idx + 1}`} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-1 left-1">
                <Badge className="text-xs bg-black/60 text-white">{idx + 1}</Badge>
              </div>
              {slide.originalFileName && (
                <div className="absolute bottom-1 left-1">
                  <Badge variant="outline" className="text-[9px] bg-black/40 text-white border-white/20 max-w-[100px] truncate">
                    {slide.originalFileName}
                  </Badge>
                </div>
              )}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 && (
                  <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
                    onClick={() => moveSlide(idx, idx - 1)}>&#8592;</button>
                )}
                {idx < slides.length - 1 && (
                  <button className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center text-xs"
                    onClick={() => moveSlide(idx, idx + 1)}>&#8594;</button>
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
function Step4Matching({ projectId, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh }: {
  projectId: number;
  slides: any[];
  scripts: any[];
  avatars: any[];
  annotations: any[];
  avatarOverrides: any[];
  insertContent: any[];
  transitions: any[];
  onRefresh: () => void;
}) {
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [annotationTool, setAnnotationTool] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#FF0000");
  const [penThickness, setPenThickness] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  // Undo/Redo stacks (store annotation IDs)
  const [undoStack, setUndoStack] = useState<number[]>([]);
  const [redoStack, setRedoStack] = useState<number[]>([]);

  // Script assignments per slide
  const [slideScriptMap, setSlideScriptMap] = useState<Record<number, { text: string; avatarId?: number }>>({});

  // Initialize from existing data
  useEffect(() => {
    const map: Record<number, { text: string; avatarId?: number }> = {};
    scripts.forEach((s: any) => {
      if (s.slideId && s.slideId > 0) {
        map[s.slideId] = { text: s.scriptText, avatarId: s.avatarId || undefined };
      }
    });
    setSlideScriptMap(map);
  }, [scripts]);

  const unassignedScripts = scripts.filter((s: any) => !s.slideId || s.slideId === 0);
  const currentSlide = slides[selectedSlideIdx];
  const currentScript = currentSlide ? slideScriptMap[currentSlide.id] : null;
  const currentAnnotations = currentSlide ? annotations.filter((a: any) => a.slideId === currentSlide.id) : [];

  const setScriptMut = trpc.lectureBuilder.setScript.useMutation();
  const saveDrawingMut = trpc.lectureBuilder.saveCanvasDrawing.useMutation();
  const deleteAnnotationMut = trpc.lectureBuilder.deleteAnnotation.useMutation();

  // Avatar overlay per-slide
  const [showAvatarPanel, setShowAvatarPanel] = useState(false);
  const [avatarSize, setAvatarSize] = useState(25); // percentage
  const [avatarPosX, setAvatarPosX] = useState(75); // percentage from left
  const [avatarPosY, setAvatarPosY] = useState(75); // percentage from top
  const [avatarShape, setAvatarShape] = useState<"circle" | "rounded" | "rectangle">("circle");
  const [avatarOpacity, setAvatarOpacity] = useState(100);
  const saveAvatarOverrideMut = trpc.lectureBuilder.upsertAvatarOverride.useMutation({
    onSuccess: () => { toast.success("아바타 설정 저장됨"); onRefresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Load avatar override for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const override = avatarOverrides.find((o: any) => o.slideId === currentSlide.id);
    if (override) {
      setAvatarSize(override.avatarSizePercent || 25);
      setAvatarPosX(override.offsetX || 75);
      setAvatarPosY(override.offsetY || 75);
      setAvatarShape(override.avatarShape || "circle");
      setAvatarOpacity(override.avatarOpacity ?? 100);
    } else {
      setAvatarSize(25); setAvatarPosX(75); setAvatarPosY(75); setAvatarShape("circle"); setAvatarOpacity(100);
    }
  }, [currentSlide?.id, avatarOverrides]);

  const saveAvatarOverride = () => {
    if (!currentSlide) return;
    saveAvatarOverrideMut.mutate({
      projectId,
      slideId: currentSlide.id,
      avatarSizePercent: avatarSize,
      offsetX: avatarPosX,
      offsetY: avatarPosY,
      avatarShape: avatarShape,
      avatarOpacity: avatarOpacity,
    });
  };

  // Insert content between slides
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  const [insertType, setInsertType] = useState<"whiteboard" | "video" | "image" | "design">("whiteboard");
  const [insertAfterSlideId, setInsertAfterSlideId] = useState<number | null>(null);
  const saveInsertMut = trpc.lectureBuilder.createInsertContent.useMutation({
    onSuccess: () => { toast.success("삽입 콘텐츠 저장됨"); onRefresh(); setShowInsertPanel(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteInsertMut = trpc.lectureBuilder.deleteInsertContent.useMutation({
    onSuccess: () => { toast.success("삽입 콘텐츠 삭제됨"); onRefresh(); },
  });

  // Slide transitions
  const [showTransitionPanel, setShowTransitionPanel] = useState(false);
  const [transitionType, setTransitionType] = useState<string>("none");
  const [transitionDuration, setTransitionDuration] = useState(500);
  const [transitionEasing, setTransitionEasing] = useState<string>("ease_in_out");

  const upsertTransitionMut = trpc.lectureBuilder.upsertSlideTransition.useMutation({
    onSuccess: () => { toast.success("전환 효과 저장됨"); onRefresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const setAllTransitionsMut = trpc.lectureBuilder.setAllTransitions.useMutation({
    onSuccess: (data) => { toast.success(`전체 ${data.count}개 슬라이드에 전환 효과 적용`); onRefresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  // Load transition for current slide
  useEffect(() => {
    if (!currentSlide) return;
    const tr = transitions.find((t: any) => t.slideId === currentSlide.id);
    if (tr) {
      setTransitionType(tr.transitionType || "none");
      setTransitionDuration(tr.durationMs || 500);
      setTransitionEasing(tr.easing || "ease_in_out");
    } else {
      setTransitionType("none"); setTransitionDuration(500); setTransitionEasing("ease_in_out");
    }
  }, [currentSlide?.id, transitions]);

  // Whiteboard AI generation
  const [wbPrompt, setWbPrompt] = useState("");
  const [wbGenerating, setWbGenerating] = useState(false);
  const generateWhiteboardMut = trpc.lectureBuilder.generateWhiteboardContent.useMutation({
    onSuccess: (data) => {
      setWbGenerating(false);
      toast.success("AI 화이트보드 콘텐츠 생성 완료");
    },
    onError: (e: any) => { setWbGenerating(false); toast.error(e.message); },
  });

  const assignScript = async (slideId: number, text: string, avatarId?: number) => {
    setSlideScriptMap(prev => ({ ...prev, [slideId]: { text, avatarId } }));
    try {
      await setScriptMut.mutateAsync({ projectId, slideId, scriptText: text, avatarId, sortOrder: 0 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // --- Canvas drawing logic ---
  const getRelativePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const getTouchRelativePos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: ((touch.clientX - rect.left) / rect.width) * 100,
      y: ((touch.clientY - rect.top) / rect.height) * 100,
    };
  };

  // Draw existing annotations + current path on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // Draw saved annotations
    currentAnnotations.forEach((ann: any) => {
      const pd = ann.pathData as any;
      if (!pd) return;
      const color = ann.penColor || "#FF0000";
      const thickness = ann.penThickness || 3;
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.annotationType === "freehand" && pd.points) {
        ctx.beginPath();
        pd.points.forEach((pt: any, i: number) => {
          const px = (pt.x / 100) * w;
          const py = (pt.y / 100) * h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else if (ann.annotationType === "circle") {
        const cx = (pd.x / 100) * w;
        const cy = (pd.y / 100) * h;
        const r = ((pd.width || 8) / 100) * Math.min(w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotationType === "arrow") {
        const sx = (pd.x / 100) * w;
        const sy = (pd.y / 100) * h;
        const ex = ((pd.endX ?? pd.x + 8) / 100) * w;
        const ey = ((pd.endY ?? pd.y - 8) / 100) * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (ann.annotationType === "check") {
        const cx = (pd.x / 100) * w;
        const cy = (pd.y / 100) * h;
        ctx.fillStyle = color;
        ctx.font = `${thickness * 6}px sans-serif`;
        ctx.fillText("\u2713", cx - thickness * 2, cy + thickness * 2);
      } else if (ann.annotationType === "underline") {
        const sx = (pd.x / 100) * w;
        const sy = (pd.y / 100) * h;
        const lineW = ((pd.width || 15) / 100) * w;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + lineW, sy);
        ctx.stroke();
      }
    });

    // Draw current path (live drawing)
    if (currentPath.length > 1) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      currentPath.forEach((pt, i) => {
        const px = (pt.x / 100) * w;
        const py = (pt.y / 100) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [currentAnnotations, currentPath, penColor, penThickness]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // --- Touch handlers for mobile/tablet ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    // Eraser via touch
    if (annotationTool === "eraser") {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;
      const rect = canvas.getBoundingClientRect();
      const pos = {
        x: ((touch.clientX - rect.left) / rect.width) * 100,
        y: ((touch.clientY - rect.top) / rect.height) * 100,
      };
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack(prev => prev.filter(id => id !== target.id));
            onRefresh();
            toast.success("어노테이션이 삭제되었습니다");
          },
        });
      }
      return;
    }
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    if (annotationTool === "freehand" || annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getTouchRelativePos(e);
    setCurrentPath(prev => [...prev, pos]);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentSlide) return;
    e.preventDefault();
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    }
    setCurrentPath([]);
  };

  // Find nearest annotation to a point (for eraser)
  const findNearestAnnotation = (pos: { x: number; y: number }, threshold = 5) => {
    let nearest: any = null;
    let minDist = threshold;
    for (const ann of currentAnnotations) {
      const pd = ann.pathData as any;
      if (!pd) continue;
      let dist = Infinity;
      if (pd.points && Array.isArray(pd.points)) {
        for (const pt of pd.points) {
          const d = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
          if (d < dist) dist = d;
        }
      } else if (pd.x !== undefined && pd.y !== undefined) {
        dist = Math.sqrt((pd.x - pos.x) ** 2 + (pd.y - pos.y) ** 2);
      }
      if (dist < minDist) {
        minDist = dist;
        nearest = ann;
      }
    }
    return nearest;
  };

  // Mouse handlers for freehand drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationTool || !currentSlide) return;
    const pos = getRelativePos(e);

    // Eraser tool: delete nearest annotation
    if (annotationTool === "eraser") {
      const target = findNearestAnnotation(pos);
      if (target) {
        deleteAnnotationMut.mutate({ id: target.id }, {
          onSuccess: () => {
            setUndoStack(prev => prev.filter(id => id !== target.id));
            onRefresh();
            toast.success("어노테이션이 삭제되었습니다");
          },
        });
      }
      return;
    }

    if (annotationTool === "freehand") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (annotationTool === "arrow") {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else {
      // Single-click tools: circle, check, underline
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: annotationTool as any,
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: pos.x, y: pos.y, width: 8, height: 8 },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getRelativePos(e);
    setCurrentPath(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentSlide) return;
    setIsDrawing(false);

    if (annotationTool === "freehand" && currentPath.length > 2) {
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "freehand",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { points: currentPath },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    } else if (annotationTool === "arrow" && currentPath.length >= 2) {
      const start = currentPath[0];
      const end = currentPath[currentPath.length - 1];
      saveDrawingMut.mutate({
        projectId,
        slideId: currentSlide.id,
        type: "arrow",
        color: penColor,
        strokeWidth: penThickness,
        pathData: { x: start.x, y: start.y, endX: end.x, endY: end.y },
      }, {
        onSuccess: (data) => {
          setUndoStack(prev => [...prev, data.id]);
          setRedoStack([]);
          onRefresh();
        },
      });
    }
    setCurrentPath([]);
  };

  // Undo: delete last annotation
  const handleUndo = () => {
    if (undoStack.length === 0 && currentAnnotations.length === 0) return;
    const lastId = undoStack.length > 0 ? undoStack[undoStack.length - 1] : currentAnnotations[currentAnnotations.length - 1]?.id;
    if (!lastId) return;
    deleteAnnotationMut.mutate({ id: lastId }, {
      onSuccess: () => {
        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, lastId]);
        onRefresh();
      },
    });
  };

  // Clear all annotations on current slide
  const handleClearAll = () => {
    if (currentAnnotations.length === 0) return;
    currentAnnotations.forEach((ann: any) => {
      deleteAnnotationMut.mutate({ id: ann.id });
    });
    setUndoStack([]);
    setRedoStack([]);
    setTimeout(() => onRefresh(), 500);
    toast.success("모든 펜 그리기가 삭제되었습니다");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">매칭 에디터</h2>
      <p className="text-muted-foreground">각 슬라이드에 스크립트를 배치하고, 캔버스에 직접 펜으로 그리세요</p>

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "60vh" }}>
        {/* Left: Slide Thumbnails */}
        <div className="col-span-2">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-2">
              {slides.map((slide: any, idx: number) => {
                const hasScript = !!slideScriptMap[slide.id];
                const annCount = annotations.filter((a: any) => a.slideId === slide.id).length;
                return (
                  <button key={slide.id}
                    className={`w-full rounded-lg overflow-hidden border-2 transition-all relative ${
                      selectedSlideIdx === idx ? "border-primary ring-2 ring-primary/30" : hasScript ? "border-green-500/50" : "border-muted"
                    }`}
                    onClick={() => { setSelectedSlideIdx(idx); setUndoStack([]); setRedoStack([]); }}
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
                    {annCount > 0 && (
                      <div className="absolute bottom-0.5 left-0.5">
                        <Badge className="text-[9px] px-1 py-0 bg-orange-500/80 text-white">{annCount}</Badge>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Slide Preview + Canvas Drawing */}
        <div className="col-span-6">
          {currentSlide ? (
            <div className="space-y-3">
              <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden">
                <img src={currentSlide.imageUrl} alt="현재 슬라이드" className="w-full aspect-video object-contain" />
                {/* Avatar overlay preview */}
                {showAvatarPanel && avatars.length > 0 && (
                  <div
                    className={`absolute pointer-events-none border-2 border-cyan-400/60 ${
                      avatarShape === "circle" ? "rounded-full" : avatarShape === "rounded" ? "rounded-xl" : ""
                    }`}
                    style={{
                      width: `${avatarSize}%`,
                      height: `${avatarSize * 0.75}%`,
                      left: `${avatarPosX - avatarSize / 2}%`,
                      top: `${avatarPosY - (avatarSize * 0.75) / 2}%`,
                      opacity: avatarOpacity / 100,
                      background: "rgba(0,180,255,0.15)",
                      backdropFilter: "blur(1px)",
                    }}
                  >
                    <div className="flex items-center justify-center h-full text-cyan-300 text-xs font-medium">
                      <Users className="w-4 h-4 mr-1" /> 아바타
                    </div>
                  </div>
                )}
                {/* Real HTML5 Canvas overlay for drawing */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${annotationTool ? "cursor-crosshair" : "cursor-default"}`}
                  style={{ touchAction: annotationTool ? "none" : "auto" }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                />
              </div>

              {/* Annotation Toolbar */}
              <div className="flex items-center gap-2 p-2 bg-card rounded-lg border flex-wrap">
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
                <div className="relative">
                  <button
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${!PEN_COLORS.includes(penColor) ? "border-foreground scale-125" : "border-muted-foreground/30"}`}
                    style={{ background: !PEN_COLORS.includes(penColor) ? penColor : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                    title="커스텀 색상 선택"
                    onClick={() => {
                      const input = document.getElementById("custom-color-picker") as HTMLInputElement;
                      input?.click();
                    }}
                  />
                  <input
                    id="custom-color-picker"
                    type="color"
                    value={penColor}
                    onChange={(e) => setPenColor(e.target.value)}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                  />
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <span className="text-xs text-muted-foreground mr-1">두께:</span>
                <div className="w-20">
                  <Slider value={[penThickness]} min={1} max={10} step={1} onValueChange={v => setPenThickness(v[0])} />
                </div>
                <Separator orientation="vertical" className="h-6 mx-1" />
                {/* Undo / Clear */}
                <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0 && currentAnnotations.length === 0} className="text-xs gap-1" title="실행 취소">
                  ↩ Undo
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={currentAnnotations.length === 0} className="text-xs gap-1 text-red-400" title="모두 지우기">
                  <Trash2 className="w-3 h-3" /> 전체 삭제
                </Button>
                {annotationTool && (
                  <Button variant="ghost" size="sm" onClick={() => setAnnotationTool(null)} className="ml-auto text-xs">
                    <MousePointer className="w-3 h-3 mr-1" /> 선택 모드
                  </Button>
                )}
              </div>

              {/* Extra tools: Avatar overlay + Insert content */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant={showAvatarPanel ? "default" : "outline"}
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => { setShowAvatarPanel(!showAvatarPanel); setShowInsertPanel(false); }}
                >
                  <Users className="w-3.5 h-3.5" /> 아바타 크기/위치
                </Button>
                <Button
                  variant={showInsertPanel ? "default" : "outline"}
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => { setShowInsertPanel(!showInsertPanel); setShowAvatarPanel(false); setShowTransitionPanel(false); setInsertAfterSlideId(currentSlide?.id || null); }}
                >
                  <Plus className="w-3.5 h-3.5" /> 중간 삽입
                </Button>
                <Button
                  variant={showTransitionPanel ? "default" : "outline"}
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => { setShowTransitionPanel(!showTransitionPanel); setShowAvatarPanel(false); setShowInsertPanel(false); }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 전환 효과
                </Button>
                {/* Show insert indicators */}
                {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    삽입 {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length}개
                  </Badge>
                )}
                {transitionType !== "none" && (
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                    {transitionType.replace("_", " ")}
                  </Badge>
                )}
              </div>

              {/* Avatar Overlay Panel */}
              {showAvatarPanel && (
                <Card className="mt-2 border-cyan-500/30 bg-cyan-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-500" /> 슬라이드 {selectedSlideIdx + 1} 아바타 설정
                    </CardTitle>
                    <CardDescription className="text-xs">이 슬라이드에서 아바타의 크기와 위치를 조정하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">크기 ({avatarSize}%)</Label>
                      <Slider value={[avatarSize]} min={10} max={60} step={1} onValueChange={v => setAvatarSize(v[0])} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">수평 위치 ({avatarPosX}%)</Label>
                        <Slider value={[avatarPosX]} min={10} max={90} step={1} onValueChange={v => setAvatarPosX(v[0])} />
                      </div>
                      <div>
                        <Label className="text-xs">수직 위치 ({avatarPosY}%)</Label>
                        <Slider value={[avatarPosY]} min={10} max={90} step={1} onValueChange={v => setAvatarPosY(v[0])} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">모양</Label>
                        <Select value={avatarShape} onValueChange={(v: any) => setAvatarShape(v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="circle">원형</SelectItem>
                            <SelectItem value="rounded">둥근 사각형</SelectItem>
                            <SelectItem value="rectangle">사각형</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">투명도 ({avatarOpacity}%)</Label>
                        <Slider value={[avatarOpacity]} min={20} max={100} step={5} onValueChange={v => setAvatarOpacity(v[0])} />
                      </div>
                    </div>
                    <Button size="sm" className="w-full gap-1" onClick={saveAvatarOverride} disabled={saveAvatarOverrideMut.isPending}>
                      {saveAvatarOverrideMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      이 슬라이드 아바타 설정 저장
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Insert Content Panel */}
              {showInsertPanel && (
                <Card className="mt-2 border-purple-500/30 bg-purple-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-500" /> 슬라이드 {selectedSlideIdx + 1} 뒤에 콘텐츠 삽입
                    </CardTitle>
                    <CardDescription className="text-xs">화이트보드, 영상, 이미지, 디자인 요소를 삽입하세요</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      {(["whiteboard", "video", "image", "design"] as const).map(t => (
                        <button key={t}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                            insertType === t ? "bg-purple-500 text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                          onClick={() => setInsertType(t)}
                        >
                          {t === "whiteboard" ? "📝 화이트보드" : t === "video" ? "🎬 영상" : t === "image" ? "🖼️ 이미지" : "🎨 디자인"}
                        </button>
                      ))}
                    </div>

                    {insertType === "whiteboard" && (
                      <div className="space-y-2">
                        <Label className="text-xs">AI 화이트보드 프롬프트</Label>
                        <Textarea
                          value={wbPrompt}
                          onChange={e => setWbPrompt(e.target.value)}
                          placeholder="예: '블록체인 구조를 그림으로 설명해주세요' 또는 '수익 구조 다이어그램'"
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              if (!wbPrompt.trim() || !currentSlide) return;
                              setWbGenerating(true);
                              generateWhiteboardMut.mutate({
                                prompt: wbPrompt,
                                contentType: "text",
                              });
                            }}
                            disabled={wbGenerating || !wbPrompt.trim()}
                          >
                            {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI 화이트보드 생성
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              if (!currentSlide) return;
                              saveInsertMut.mutate({
                                projectId,
                                afterSlideId: currentSlide.id,
                                contentType: "whiteboard",
                                title: "빈 화이트보드",
                                drawingData: { elements: [], background: "#ffffff" },
                              });
                            }}
                          >
                            <Pencil className="w-3 h-3" /> 빈 화이트보드
                          </Button>
                        </div>
                      </div>
                    )}

                    {insertType === "video" && (
                      <div className="space-y-2">
                        <Label className="text-xs">영상 URL 또는 업로드</Label>
                        <Input
                          placeholder="YouTube URL 또는 영상 URL 입력..."
                          className="text-xs h-8"
                          onKeyDown={e => {
                            if (e.key === "Enter" && currentSlide) {
                              const url = (e.target as HTMLInputElement).value;
                              if (url.trim()) {
                                saveInsertMut.mutate({
                                  projectId,
                                  afterSlideId: currentSlide.id,
                                  contentType: "video",
                                  title: "삽입 영상",
                                  contentUrl: url,
                                });
                              }
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">Enter를 눌러 저장</p>
                      </div>
                    )}

                    {insertType === "image" && (
                      <div className="space-y-2">
                        <Label className="text-xs">이미지 URL</Label>
                        <Input
                          placeholder="이미지 URL 입력..."
                          className="text-xs h-8"
                          onKeyDown={e => {
                            if (e.key === "Enter" && currentSlide) {
                              const url = (e.target as HTMLInputElement).value;
                              if (url.trim()) {
                                saveInsertMut.mutate({
                                  projectId,
                                  afterSlideId: currentSlide.id,
                                  contentType: "image",
                                  title: "삽입 이미지",
                                  contentUrl: url,
                                });
                              }
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">Enter를 눌러 저장</p>
                      </div>
                    )}

                    {insertType === "design" && (
                      <div className="space-y-2">
                        <Label className="text-xs">AI 디자인 프롬프트</Label>
                        <Textarea
                          value={wbPrompt}
                          onChange={e => setWbPrompt(e.target.value)}
                          placeholder="예: '수익률 비교 차트' 또는 '파트너 로고 모음'"
                          rows={2}
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          className="w-full gap-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            if (!wbPrompt.trim() || !currentSlide) return;
                            setWbGenerating(true);
                            generateWhiteboardMut.mutate({
                              prompt: wbPrompt,
                              contentType: "diagram",
                            });
                          }}
                          disabled={wbGenerating || !wbPrompt.trim()}
                        >
                          {wbGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI 디자인 생성
                        </Button>
                      </div>
                    )}

                    {/* Existing insert content for this slide */}
                    {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).length > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">이 슬라이드 뒤 삽입 콘텐츠:</span>
                        {insertContent.filter((ic: any) => ic.afterSlideId === currentSlide?.id).map((ic: any) => (
                          <div key={ic.id} className="flex items-center justify-between p-1.5 rounded bg-muted/50 text-xs">
                            <span className="flex items-center gap-1">
                              {ic.contentType === "whiteboard" ? "📝" : ic.contentType === "video" ? "🎬" : ic.contentType === "image" ? "🖼️" : "🎨"}
                              {ic.title || ic.contentType}
                            </span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive"
                              onClick={() => deleteInsertMut.mutate({ id: ic.id })}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Transition Effect Panel */}
              {showTransitionPanel && (
                <Card className="mt-2 border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> 슬라이드 {selectedSlideIdx + 1} 전환 효과
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">전환 타입</Label>
                      <Select value={transitionType} onValueChange={setTransitionType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">없음</SelectItem>
                          <SelectItem value="fade">페이드</SelectItem>
                          <SelectItem value="slide_left">슬라이드 좌</SelectItem>
                          <SelectItem value="slide_right">슬라이드 우</SelectItem>
                          <SelectItem value="slide_up">슬라이드 위</SelectItem>
                          <SelectItem value="zoom_in">줌 인</SelectItem>
                          <SelectItem value="zoom_out">줌 아웃</SelectItem>
                          <SelectItem value="wipe_left">와이프 좌</SelectItem>
                          <SelectItem value="wipe_right">와이프 우</SelectItem>
                          <SelectItem value="dissolve">디졸브</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">지속 시간: {transitionDuration}ms</Label>
                      <Slider
                        value={[transitionDuration]}
                        onValueChange={([v]) => setTransitionDuration(v)}
                        min={100} max={3000} step={100}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">이징</Label>
                      <Select value={transitionEasing} onValueChange={setTransitionEasing}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">선형</SelectItem>
                          <SelectItem value="ease_in">가속</SelectItem>
                          <SelectItem value="ease_out">감속</SelectItem>
                          <SelectItem value="ease_in_out">가감속</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1"
                        disabled={upsertTransitionMut.isPending}
                        onClick={() => {
                          if (!currentSlide) return;
                          upsertTransitionMut.mutate({
                            projectId,
                            slideId: currentSlide.id,
                            transitionType: transitionType as any,
                            durationMs: transitionDuration,
                            easing: transitionEasing as any,
                          });
                        }}>
                        {upsertTransitionMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        이 슬라이드 저장
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1"
                        disabled={setAllTransitionsMut.isPending}
                        onClick={() => {
                          setAllTransitionsMut.mutate({
                            projectId,
                            transitionType: transitionType as any,
                            durationMs: transitionDuration,
                            easing: transitionEasing as any,
                          });
                        }}>
                        {setAllTransitionsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        전체 적용
                      </Button>
                    </div>
                    {/* Transition preview hint */}
                    {transitionType !== "none" && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        프리뷰: 슬라이드 전환 시 <span className="font-semibold text-amber-400">{transitionType.replace("_", " ")}</span> 효과가 {transitionDuration}ms 동안 적용됩니다.
                        MP4 내보내기 시 실제 영상에 반영됩니다.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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
                            {avatars.map((av: any) => (
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
                      {unassignedScripts.map((s: any, i: number) => (
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
function Step5Preview({ projectId, project, slides, scripts, avatars, annotations, avatarOverrides, insertContent, transitions, onRefresh }: {
  projectId: number;
  project: any;
  slides: any[];
  scripts: any[];
  avatars: any[];
  annotations: any[];
  avatarOverrides: any[];
  insertContent: any[];
  transitions: any[];
  onRefresh: () => void;
}) {
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [prevSlideIdx, setPrevSlideIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<number>>(() => new Set(slides.map((s: any) => s.id)));
  const [bgmUrl, setBgmUrl] = useState("");
  const [bgmVolume, setBgmVolume] = useState(30);
  const [bgmUploading, setBgmUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(project.finalVideoUrl || "");
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState("");
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [exportResolution, setExportResolution] = useState<"720p" | "1080p" | "1440p">("1080p");
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState("");

  // AI Layout Recommendation
  const layoutsQuery = trpc.slideLayout.list.useQuery({ projectId });
  const recommendLayoutMut = trpc.slideLayout.recommend.useMutation({
    onSuccess: (data) => {
      layoutsQuery.refetch();
      toast.success(`${data.count}개 슬라이드에 대한 레이아웃이 추천되었습니다`);
    },
    onError: (err) => toast.error(err.message || "AI 레이아웃 추천 실패"),
  });
  const applyLayoutMut = trpc.slideLayout.applyLayout.useMutation({
    onSuccess: () => { layoutsQuery.refetch(); toast.success("레이아웃이 적용되었습니다"); },
  });
  const clearLayoutsMut = trpc.slideLayout.clear.useMutation({
    onSuccess: () => { layoutsQuery.refetch(); toast.info("레이아웃 추천이 초기화되었습니다"); },
  });

  // Watermark Settings
  const watermarkQuery = trpc.watermark.get.useQuery({ projectId });
  const saveWatermarkMut = trpc.watermark.upsert.useMutation({
    onSuccess: () => { watermarkQuery.refetch(); toast.success("워터마크가 저장되었습니다"); },
    onError: (err) => toast.error(err.message || "워터마크 저장 실패"),
  });
  const uploadLogoMut = trpc.watermark.uploadLogo.useMutation();

  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmType, setWmType] = useState<"text" | "logo" | "both">("text");
  const [wmText, setWmText] = useState("");
  const [wmLogoUrl, setWmLogoUrl] = useState("");
  const [wmLogoFileKey, setWmLogoFileKey] = useState("");
  const [wmPosition, setWmPosition] = useState<"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right">("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(70);
  const [wmFontSize, setWmFontSize] = useState(24);
  const [wmFontColor, setWmFontColor] = useState("#FFFFFF");
  const [wmSizePercent, setWmSizePercent] = useState(15);

  // Load existing watermark
  useEffect(() => {
    if (watermarkQuery.data) {
      const wm = watermarkQuery.data;
      setWmEnabled(wm.isEnabled ?? false);
      setWmType((wm.watermarkType as any) || "text");
      setWmText(wm.textContent || "");
      setWmLogoUrl(wm.logoUrl || "");
      setWmLogoFileKey(wm.logoFileKey || "");
      setWmPosition((wm.position as any) || "bottom-right");
      setWmOpacity(wm.opacity ?? 70);
      setWmFontSize(wm.fontSize ?? 24);
      setWmFontColor(wm.fontColor || "#FFFFFF");
      setWmSizePercent(wm.sizePercent ?? 15);
    }
  }, [watermarkQuery.data]);

  const handleSaveWatermark = () => {
    saveWatermarkMut.mutate({
      projectId,
      watermarkType: wmType,
      logoUrl: wmLogoUrl || undefined,
      logoFileKey: wmLogoFileKey || undefined,
      textContent: wmText || undefined,
      fontSize: wmFontSize,
      fontColor: wmFontColor,
      position: wmPosition,
      opacity: wmOpacity,
      sizePercent: wmSizePercent,
      isEnabled: wmEnabled,
    });
  };

  const updateProject = trpc.lectureBuilder.updateProject.useMutation({
    onSuccess: () => { toast.success("설정이 저장되었습니다"); onRefresh(); },
  });
  const uploadBgmMut = trpc.lectureBuilder.uploadBgm.useMutation();
  const generateVideoMut = trpc.lectureBuilder.generateVideo.useMutation();
  const exportVideoMut = trpc.lectureBuilder.exportVideo.useMutation();
  const progressQuery = trpc.lectureBuilder.getVideoProgress.useQuery(
    { projectId },
    { enabled: generating, refetchInterval: generating ? 3000 : false }
  );

  // Poll progress while generating
  useEffect(() => {
    if (!generating || !progressQuery.data) return;
    const d = progressQuery.data;
    setGenProgress(d.progress);
    setGenStep(d.step);
    if (d.status === "completed" && d.videoUrl) {
      setGenerating(false);
      setGeneratedVideoUrl(d.videoUrl);
      setGenProgress(100);
      setGenStep("완료");
      toast.success("영상이 성공적으로 생성되었습니다!");
      onRefresh();
    } else if (d.status === "failed") {
      setGenerating(false);
      setGenProgress(0);
      setGenStep("");
      toast.error(d.errorMessage || "영상 생성 실패");
    }
  }, [generating, progressQuery.data]);

  const assignedSlides = slides.filter((s: any) => scripts.some((sc: any) => sc.slideId === s.id));
  const totalDuration = scripts.reduce((acc: number, s: any) => acc + (s.estimatedDurationSec || 30), 0);

  // Filter slides for preview based on selection
  const previewSlides = useMemo(() => {
    return slides.filter((s: any) => selectedSlideIds.has(s.id));
  }, [slides, selectedSlideIds]);

  // Get transition for current slide
  const getTransition = (slideId: number) => {
    return transitions.find((t: any) => t.slideId === slideId) || { type: 'none', durationMs: 500, easing: 'ease' };
  };

  // Handle slide change with transition
  const changeSlide = useCallback((newIdx: number) => {
    if (newIdx === previewSlideIdx || isTransitioning) return;
    const targetSlide = previewSlides[newIdx];
    if (!targetSlide) return;
    const trans = getTransition(targetSlide.id);
    if (trans.type !== 'none') {
      setPrevSlideIdx(previewSlideIdx);
      setIsTransitioning(true);
      setPreviewSlideIdx(newIdx);
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevSlideIdx(null);
      }, trans.durationMs || 500);
    } else {
      setPreviewSlideIdx(newIdx);
    }
  }, [previewSlideIdx, previewSlides, transitions, isTransitioning]);

  // Auto-play preview with transition
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (previewSlideIdx >= previewSlides.length - 1) { setIsPlaying(false); return; }
      changeSlide(previewSlideIdx + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, previewSlideIdx, previewSlides.length, changeSlide]);

  // Update selection when slides change
  useEffect(() => {
    setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  }, [slides]);

  const currentSlide = previewSlides[previewSlideIdx];
  const currentSlideScript = currentSlide ? scripts.find((s: any) => s.slideId === currentSlide.id) : null;
  const currentAvatar = currentSlideScript?.avatarId ? avatars.find((a: any) => a.id === currentSlideScript.avatarId) : avatars[0];

  const toggleSlideSelection = (slideId: number) => {
    setSelectedSlideIds(prev => {
      const next = new Set(prev);
      if (next.has(slideId)) next.delete(slideId);
      else next.add(slideId);
      return next;
    });
  };

  const selectAll = () => setSelectedSlideIds(new Set(slides.map((s: any) => s.id)));
  const deselectAll = () => setSelectedSlideIds(new Set());

  // BGM upload
  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("배경음악 파일은 20MB 이하로 업로드해주세요");
      return;
    }
    setBgmUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadBgmMut.mutateAsync({
        projectId,
        fileData: base64,
        fileName: file.name,
        mimeType: file.type || "audio/mpeg",
      });
      setBgmUrl(result.url);
      toast.success("배경음악이 업로드되었습니다");
    } catch (err: any) {
      toast.error(err.message || "배경음악 업로드 실패");
    } finally {
      setBgmUploading(false);
      if (bgmInputRef.current) bgmInputRef.current.value = "";
    }
  };

  // Generate video (fire-and-forget, progress via polling)
  const handleGenerateVideo = async () => {
    if (selectedSlideIds.size === 0) {
      toast.error("영상에 포함할 슬라이드를 선택해주세요");
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenStep("영상 생성 준비 중...");
    try {
      const result = await generateVideoMut.mutateAsync({
        projectId,
        avatarPosition: project.avatarPosition,
        avatarSize: project.avatarSize === "small" ? 15 : project.avatarSize === "large" ? 35 : 25,
        avatarShape: project.avatarShape,
        avatarOpacity: project.avatarOpacity,
        bgmUrl: bgmUrl || undefined,
        bgmVolume,
        noiseReduction: false,
        resolution: "1080p",
        selectedSlideIds: Array.from(selectedSlideIds),
      });
      setGeneratedVideoUrl(result.videoUrl);
      setGenProgress(100);
      setGenStep("완료");
      toast.success("영상이 성공적으로 생성되었습니다!");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "영상 생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">미리보기 & 최종 설정</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Preview Area */}
        <div className="col-span-8">
          <Card>
            <CardContent className="pt-6">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                {/* Previous slide (for transition) */}
                {isTransitioning && prevSlideIdx !== null && previewSlides[prevSlideIdx] && (
                  <img src={previewSlides[prevSlideIdx].imageUrl} alt="이전" className="absolute inset-0 w-full h-full object-contain z-0" />
                )}
                {currentSlide ? (
                  <>
                    <img
                      src={currentSlide.imageUrl}
                      alt="미리보기"
                      className="w-full h-full object-contain"
                      style={isTransitioning ? (() => {
                        const trans = getTransition(currentSlide.id);
                        const dur = `${(trans.durationMs || 500)}ms`;
                        const ease = trans.easing || 'ease';
                        const base: React.CSSProperties = { position: 'relative', zIndex: 1, transition: `all ${dur} ${ease}` };
                        switch (trans.type) {
                          case 'fade': return { ...base, animation: `fadeIn ${dur} ${ease} forwards` };
                          case 'slide-left': return { ...base, animation: `slideFromRight ${dur} ${ease} forwards` };
                          case 'slide-right': return { ...base, animation: `slideFromLeft ${dur} ${ease} forwards` };
                          case 'slide-up': return { ...base, animation: `slideFromBottom ${dur} ${ease} forwards` };
                          case 'slide-down': return { ...base, animation: `slideFromTop ${dur} ${ease} forwards` };
                          case 'zoom-in': return { ...base, animation: `zoomIn ${dur} ${ease} forwards` };
                          case 'zoom-out': return { ...base, animation: `zoomOut ${dur} ${ease} forwards` };
                          case 'wipe': return { ...base, animation: `wipeRight ${dur} ${ease} forwards` };
                          case 'dissolve': return { ...base, animation: `dissolve ${dur} ${ease} forwards` };
                          default: return base;
                        }
                      })() : undefined}
                    />
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
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Users className="w-8 h-8 text-white/70" />
                          </div>
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
                    {selectedSlideIds.size === 0 ? "슬라이드를 선택해주세요" : "슬라이드가 없습니다"}
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-3 mt-4">
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.max(0, previewSlideIdx - 1))} disabled={isTransitioning}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={isTransitioning}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => changeSlide(Math.min(previewSlides.length - 1, previewSlideIdx + 1))} disabled={isTransitioning}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: previewSlides.length > 0 ? `${((previewSlideIdx + 1) / previewSlides.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-sm text-muted-foreground">{previewSlides.length > 0 ? previewSlideIdx + 1 : 0}/{previewSlides.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Slide Layout Recommendation */}
          <Card className="mt-4 border-purple-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> AI 레이아웃 추천
                </CardTitle>
                <Button variant="outline" size="sm" className="text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => recommendLayoutMut.mutate({ projectId })}
                  disabled={recommendLayoutMut.isPending || slides.length === 0}>
                  {recommendLayoutMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  분석 시작
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {layoutsQuery.data && layoutsQuery.data.length > 0 ? (
                <div className="space-y-1.5">
                  {layoutsQuery.data.map((layout: any) => {
                    const slideIdx = slides.findIndex((s: any) => s.id === layout.slideId);
                    return (
                      <div key={layout.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">슬{slideIdx + 1}</Badge>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">{layout.layoutType}</Badge>
                        <span className="text-muted-foreground truncate flex-1">{layout.aiReasoning}</span>
                        {!layout.isApplied && (
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] text-purple-600"
                            onClick={() => applyLayoutMut.mutate({ layoutId: layout.id })}>
                            적용
                          </Button>
                        )}
                        {layout.isApplied && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="text-xs text-red-400 w-full"
                    onClick={() => clearLayoutsMut.mutate({ projectId })}>
                    추천 초기화
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  AI가 스크립트를 분석하여 각 슬라이드에 최적의 레이아웃을 추천합니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Slide Selection for Preview */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">슬라이드 선택 ({selectedSlideIds.size}/{slides.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={selectAll}>전체 선택</Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={deselectAll}>전체 해제</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {slides.map((slide: any, idx: number) => {
                  const isSelected = selectedSlideIds.has(slide.id);
                  return (
                    <button key={slide.id}
                      className={`relative w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                        isSelected ? "border-primary ring-1 ring-primary/30" : "border-muted opacity-50"
                      }`}
                      onClick={() => toggleSlideSelection(slide.id)}
                    >
                      <img src={slide.imageUrl} alt={`${idx + 1}`} className="w-full h-full object-contain" />
                      <div className="absolute top-0 left-0 text-[8px] bg-black/60 text-white px-0.5 rounded-br">{idx + 1}</div>
                      {isSelected && <Check className="absolute bottom-0 right-0 w-3 h-3 text-green-400" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Generated Video & Export */}
          {generatedVideoUrl && (
            <Card className="mt-4 border-green-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" /> 생성된 영상
                  </CardTitle>
                  <Badge variant="outline" className="text-green-500 border-green-500/30">완료</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <video src={generatedVideoUrl} controls className="w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-2">
                  <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm" className="gap-1 w-full">
                      <Download className="w-3 h-3" /> 영상 다운로드
                    </Button>
                  </a>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    navigator.clipboard.writeText(generatedVideoUrl);
                    toast.success("영상 URL이 복사되었습니다");
                  }}>
                    <Link2 className="w-3 h-3" /> URL 복사
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
              <div className="flex justify-between"><span className="text-muted-foreground">선택된 슬라이드</span><span>{selectedSlideIds.size}장</span></div>
              {project.status && project.status !== "draft" && (
                <div className="flex justify-between"><span className="text-muted-foreground">상태</span>
                  <Badge variant={project.status === "completed" ? "default" : project.status === "generating" ? "secondary" : "destructive"}>
                    {project.status === "completed" ? "완료" : project.status === "generating" ? "생성 중" : project.status === "error" ? "오류" : project.status}
                  </Badge>
                </div>
              )}
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

          {/* BGM Upload */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">배경음악</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input ref={bgmInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a" className="hidden" onChange={handleBgmUpload} />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => bgmInputRef.current?.click()} disabled={bgmUploading}>
                {bgmUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                {bgmUrl ? "배경음악 변경" : "배경음악 업로드"}
              </Button>
              {bgmUrl && (
                <>
                  <audio src={bgmUrl} controls className="w-full h-8" />
                  <div>
                    <Label className="text-xs">볼륨: {bgmVolume}%</Label>
                    <Slider value={[bgmVolume]} min={0} max={100} step={5} onValueChange={v => setBgmVolume(v[0])} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-red-400" onClick={() => setBgmUrl("")}>
                    <X className="w-3 h-3 mr-1" /> 배경음악 제거
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* MP4 Export Settings */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">🎬 MP4 내보내기</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">해상도</Label>
                <Select value={exportResolution} onValueChange={v => setExportResolution(v as any)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subtitles" checked={includeSubtitles} onChange={e => setIncludeSubtitles(e.target.checked)} className="rounded" />
                <Label htmlFor="subtitles" className="text-xs cursor-pointer">자막 포함</Label>
              </div>
              <Button
                className="w-full gap-2"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (slides.length === 0) { toast.error("슬라이드가 없습니다"); return; }
                  setExporting(true);
                  setExportProgress(0);
                  setExportStep("MP4 내보내기 준비 중...");
                  try {
                    const result = await exportVideoMut.mutateAsync({
                      projectId,
                      resolution: exportResolution,
                      includeSubtitles,
                    });
                    setGeneratedVideoUrl(result.videoUrl);
                    setExportProgress(100);
                    setExportStep("완료");
                    toast.success(`MP4 내보내기 완료! (${(result.fileSize / 1024 / 1024).toFixed(1)}MB)`);
                    onRefresh();
                  } catch (err: any) {
                    toast.error(err.message || "MP4 내보내기 실패");
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting || slides.length === 0}
              >
                {exporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> MP4 내보내는 중...</>
                ) : (
                  <><Download className="w-4 h-4" /> MP4로 내보내기</>
                )}
              </Button>
              {exporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{exportStep}</span>
                    <span className="font-mono text-primary">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${exportProgress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watermark Settings */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">🎨 워터마크 / 브랜딩</CardTitle>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="wm-enabled" checked={wmEnabled}
                    onChange={e => setWmEnabled(e.target.checked)} className="rounded" />
                  <Label htmlFor="wm-enabled" className="text-xs cursor-pointer">활성화</Label>
                </div>
              </div>
            </CardHeader>
            {wmEnabled && (
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">워터마크 타입</Label>
                  <Select value={wmType} onValueChange={v => setWmType(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">텍스트</SelectItem>
                      <SelectItem value="logo">로고 이미지</SelectItem>
                      <SelectItem value="both">텍스트 + 로고</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(wmType === "text" || wmType === "both") && (
                  <div>
                    <Label className="text-xs">텍스트</Label>
                    <Input value={wmText} onChange={e => setWmText(e.target.value)}
                      placeholder="예: © My Lecture" className="h-8 text-xs" />
                  </div>
                )}
                {(wmType === "logo" || wmType === "both") && (
                  <div>
                    <Label className="text-xs">로고 이미지</Label>
                    <div className="flex gap-2">
                      <Input type="file" accept="image/*" className="h-8 text-xs flex-1"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            try {
                              const result = await uploadLogoMut.mutateAsync({
                                projectId,
                                fileName: file.name,
                                fileBase64: base64,
                                mimeType: file.type,
                              });
                              setWmLogoUrl(result.url);
                              setWmLogoFileKey(result.fileKey);
                              toast.success("로고가 업로드되었습니다");
                            } catch (err: any) {
                              toast.error(err.message || "로고 업로드 실패");
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {wmLogoUrl && <img src={wmLogoUrl} alt="logo" className="w-8 h-8 rounded border object-contain" />}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">위치</Label>
                    <Select value={wmPosition} onValueChange={v => setWmPosition(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">좌상단</SelectItem>
                        <SelectItem value="top-center">상단 중앙</SelectItem>
                        <SelectItem value="top-right">우상단</SelectItem>
                        <SelectItem value="bottom-left">좌하단</SelectItem>
                        <SelectItem value="bottom-center">하단 중앙</SelectItem>
                        <SelectItem value="bottom-right">우하단</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">투명도: {wmOpacity}%</Label>
                    <Slider value={[wmOpacity]} min={10} max={100} step={5}
                      onValueChange={v => setWmOpacity(v[0])} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">글자 크기: {wmFontSize}px</Label>
                    <Slider value={[wmFontSize]} min={12} max={48} step={2}
                      onValueChange={v => setWmFontSize(v[0])} />
                  </div>
                  <div>
                    <Label className="text-xs">사이즈: {wmSizePercent}%</Label>
                    <Slider value={[wmSizePercent]} min={5} max={40} step={1}
                      onValueChange={v => setWmSizePercent(v[0])} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">글자 색상</Label>
                  <div className="flex gap-1">
                    {["#FFFFFF", "#000000", "#FF0000", "#0066FF", "#00AA00", "#FFAA00"].map(c => (
                      <button key={c}
                        className={`w-6 h-6 rounded-full border-2 ${wmFontColor === c ? "border-primary scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c, boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #ccc" : undefined }}
                        onClick={() => setWmFontColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <Button variant="default" size="sm" className="w-full gap-1"
                  onClick={handleSaveWatermark}
                  disabled={saveWatermarkMut.isPending}>
                  {saveWatermarkMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  워터마크 저장
                </Button>
                {/* Preview */}
                <div className="relative w-full aspect-video bg-muted rounded-lg border overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    워터마크 미리보기
                  </div>
                  <div className={`absolute flex items-center gap-1 ${
                    wmPosition.includes("top") ? "top-2" : "bottom-2"
                  } ${
                    wmPosition.includes("left") ? "left-2" : wmPosition.includes("center") ? "left-1/2 -translate-x-1/2" : "right-2"
                  }`} style={{ opacity: wmOpacity / 100 }}>
                    {wmLogoUrl && (wmType === "logo" || wmType === "both") && (
                      <img src={wmLogoUrl} alt="wm" className="rounded" style={{ height: `${wmSizePercent * 1.5}px` }} />
                    )}
                    {(wmType === "text" || wmType === "both") && wmText && (
                      <span style={{ fontSize: `${Math.max(8, wmFontSize * 0.5)}px`, color: wmFontColor }} className="font-bold drop-shadow-md">
                        {wmText}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Generate Button */}
          <Button className="w-full gap-2" size="lg" onClick={handleGenerateVideo} disabled={generating || exporting || selectedSlideIds.size === 0}>
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 영상 생성 중...</>
            ) : (
              <><Video className="w-5 h-5" /> 최종 영상 생성</>
            )}
          </Button>
          {generating && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">영상 생성 진행률</span>
                  <span className="font-mono font-bold text-primary">{genProgress}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${genProgress}%` }}
                  />
                </div>
                {genStep && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {genStep}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 text-center">영상 생성에는 시간이 걸릴 수 있습니다. 이 페이지를 떠나지 마세요.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
