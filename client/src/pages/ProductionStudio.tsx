import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearch } from "wouter";
import {
  Wand2, Play, FileText, Clock, Layers, Volume2, Trash2, ChevronRight,
  Loader2, Sparkles, Download, ArrowLeft, RefreshCw, Mic, UserCircle2, Settings2, Edit3, History,
  BookTemplate, Image, CheckCircle2, XCircle, SkipForward, ListChecks, CheckSquare
} from "lucide-react";

const CATEGORIES = [
  { value: "web3", label: "Web3" },
  { value: "ai", label: "AI / 인공지능" },
  { value: "blockchain", label: "블록체인" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "metaverse", label: "메타버스" },
  { value: "general", label: "일반" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "초급", color: "bg-green-500/20 text-green-400" },
  { value: "intermediate", label: "중급", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "advanced", label: "고급", color: "bg-red-500/20 text-red-400" },
];

const VOICES = [
  { value: "alloy", label: "Alloy (중성)" },
  { value: "echo", label: "Echo (남성)" },
  { value: "fable", label: "Fable (남성)" },
  { value: "onyx", label: "Onyx (남성 저음)" },
  { value: "nova", label: "Nova (여성)" },
  { value: "shimmer", label: "Shimmer (여성)" },
];

export default function ProductionStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");

  // Script generation form
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("web3");
  const [difficulty, setDifficulty] = useState("beginner");
  const [language, setLanguage] = useState("ko");
  const [durationMin, setDurationMin] = useState(10);

  // Pipeline form
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [pipelineTitle, setPipelineTitle] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState("alloy");
  const [selectedVoiceModId, setSelectedVoiceModId] = useState<string>("none");
  const [selectedFaceSwapId, setSelectedFaceSwapId] = useState<string>("none");

  // Batch processing state
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set());
  const [batchTtsVoiceId, setBatchTtsVoiceId] = useState("alloy");
  const [batchVoiceModId, setBatchVoiceModId] = useState<string>("none");
  const [batchFaceSwapId, setBatchFaceSwapId] = useState<string>("none");
  const [batchResults, setBatchResults] = useState<any>(null);

  // Template from URL
  const searchString = useSearch();
  const templateId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("templateId") ? parseInt(params.get("templateId")!) : null;
  }, [searchString]);
  const selectedTemplateQuery = trpc.scriptTemplate.getById.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // Data queries
  const scriptsQuery = trpc.script.list.useQuery(undefined, { enabled: !!user });
  const pipelinesQuery = trpc.pipeline.list.useQuery(undefined, { enabled: !!user });
  const voiceModsQuery = trpc.voiceMod.list.useQuery(undefined, { enabled: !!user });
  const faceSwapsQuery = trpc.faceSwap.list.useQuery(undefined, { enabled: !!user });

  // Mutations
  const generateScript = trpc.script.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`스크립트 생성 완료! ${data.sectionCount}개 섹션, 약 ${Math.round((data.estimatedDurationSec || 0) / 60)}분`);
      scriptsQuery.refetch();
      setActiveTab("scripts");
    },
    onError: (err) => toast.error(err.message),
  });

  const startPipeline = trpc.pipeline.start.useMutation({
    onSuccess: (data) => {
      toast.success("파이프라인 완료! 음성이 생성되었습니다.");
      pipelinesQuery.refetch();
      setActiveTab("pipelines");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteScript = trpc.script.delete.useMutation({
    onSuccess: () => { toast.success("스크립트 삭제됨"); scriptsQuery.refetch(); },
  });

  const deletePipeline = trpc.pipeline.delete.useMutation({
    onSuccess: () => { toast.success("파이프라인 삭제됨"); pipelinesQuery.refetch(); },
  });

  // Template-based script generation
  const generateFromTemplate = trpc.scriptTemplate.generateFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`템플릿 기반 스크립트 생성 완료! ${data.sectionCount}개 섹션`);
      scriptsQuery.refetch();
      setActiveTab("scripts");
    },
    onError: (err) => toast.error(err.message),
  });

  // Batch pipeline
  const batchStart = trpc.pipeline.batchStart.useMutation({
    onSuccess: (data) => {
      setBatchResults(data);
      toast.success(`배치 완료: ${data.summary.completed}건 성공, ${data.summary.failed}건 실패`);
      pipelinesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Thumbnail generation
  const generateThumbnail = trpc.pipeline.generateThumbnail.useMutation({
    onSuccess: (data) => {
      toast.success("썸네일이 생성되었습니다!");
      pipelinesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Apply template if coming from template library
  useEffect(() => {
    if (templateId && selectedTemplateQuery.data) {
      setActiveTab("create");
    }
  }, [templateId, selectedTemplateQuery.data]);

  const handleGenerateScript = () => {
    if (!title.trim() || !prompt.trim()) { toast.error("제목과 프롬프트를 입력하세요."); return; }
    if (templateId) {
      generateFromTemplate.mutate({ templateId, title, prompt, language, targetDurationMin: durationMin });
    } else {
      generateScript.mutate({ title, prompt, category: category as any, difficulty: difficulty as any, language, targetDurationMin: durationMin });
    }
  };

  const handleBatchStart = () => {
    if (batchSelectedIds.size === 0) { toast.error("스크립트를 선택하세요."); return; }
    const readyScripts = scriptsQuery.data?.filter(s => s.status === "ready" && batchSelectedIds.has(s.id)) || [];
    if (readyScripts.length === 0) { toast.error("준비된 스크립트가 없습니다."); return; }
    batchStart.mutate({
      items: readyScripts.map(s => ({
        scriptId: s.id,
        title: s.title,
        ttsVoiceId: batchTtsVoiceId,
        voiceModProfileId: batchVoiceModId !== "none" ? parseInt(batchVoiceModId) : undefined,
        faceSwapProfileId: batchFaceSwapId !== "none" ? parseInt(batchFaceSwapId) : undefined,
      })),
    });
  };

  const toggleBatchSelect = (id: number) => {
    setBatchSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const readyScripts = scriptsQuery.data?.filter(s => s.status === "ready") || [];
    if (batchSelectedIds.size === readyScripts.length) {
      setBatchSelectedIds(new Set());
    } else {
      setBatchSelectedIds(new Set(readyScripts.map(s => s.id)));
    }
  };

  const handleStartPipeline = () => {
    if (!selectedScriptId || !pipelineTitle.trim()) { toast.error("스크립트를 선택하고 제목을 입력하세요."); return; }
    startPipeline.mutate({
      scriptId: selectedScriptId,
      title: pipelineTitle,
      ttsVoiceId,
      voiceModProfileId: selectedVoiceModId !== "none" ? parseInt(selectedVoiceModId) : undefined,
      faceSwapProfileId: selectedFaceSwapId !== "none" ? parseInt(selectedFaceSwapId) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-studio-HS5V7dEHhBG4GbPuHinSnZ.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-3">
              <Link href="/instructor">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"><ArrowLeft className="w-4 h-4 mr-1" /> 대시보드</Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">원클릭 강의 제작 스튜디오</h1>
                <p className="text-white/70 mt-1">프롬프트 입력 → AI 스크립트 생성 → TTS 음성 → 강의 영상 자동 제작</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Pipeline Steps Visual */}
        <Card className="mb-8 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 border-violet-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {[
                { icon: FileText, label: "1. 프롬프트 입력", desc: "주제와 요구사항" },
                { icon: Wand2, label: "2. AI 스크립트 생성", desc: "GPT가 강의 대본 작성" },
                { icon: Volume2, label: "3. TTS 음성 생성", desc: "음성 변조 적용" },
                { icon: UserCircle2, label: "4. 아바타 영상", desc: "딥페이크 적용 (선택)" },
                { icon: Download, label: "5. 완성 & 배포", desc: "Zoom/Meet에서 사용" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-2">
                      <step.icon className="w-5 h-5 text-violet-400" />
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="create"><Wand2 className="w-4 h-4 mr-2" />스크립트 생성</TabsTrigger>
            <TabsTrigger value="scripts"><FileText className="w-4 h-4 mr-2" />내 스크립트 ({scriptsQuery.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="produce"><Play className="w-4 h-4 mr-2" />영상 제작</TabsTrigger>
            <TabsTrigger value="batch"><ListChecks className="w-4 h-4 mr-2" />배치 제작</TabsTrigger>
            <TabsTrigger value="pipelines"><Layers className="w-4 h-4 mr-2" />제작 이력 ({pipelinesQuery.data?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Tab 1: Create Script */}
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-violet-400" /> AI 강의 스크립트 생성</CardTitle>
                    <CardDescription>프롬프트를 입력하면 AI가 전문 강의 스크립트를 자동으로 작성합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>강의 제목</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: DeFi 유동성 풀의 원리와 수익 구조" className="mt-1" />
                    </div>
                    <div>
                      <Label>상세 프롬프트</Label>
                      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="강의에서 다룰 내용을 상세히 설명하세요. 예: DeFi에서 유동성 풀이 어떻게 작동하는지, AMM의 원리, 임시 손실 개념, 실제 수익률 계산 방법 등을 초보자도 이해할 수 있게 설명해주세요." className="mt-1 min-h-[150px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>카테고리</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>난이도</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>언어</Label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ko">한국어</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ja">日本語</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>목표 시간 (분)</Label>
                        <Input type="number" min={1} max={120} value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value) || 10)} className="mt-1" />
                      </div>
                    </div>
                    {/* Template indicator */}
                    {templateId && selectedTemplateQuery.data && (
                      <Card className="bg-amber-500/10 border-amber-500/30">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2">
                            <BookTemplate className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-amber-300">템플릿 적용: {selectedTemplateQuery.data.name}</span>
                            <Badge variant="outline" className="text-xs">{selectedTemplateQuery.data.sectionCount}섹션</Badge>
                            <Link href="/studio">
                              <Button size="sm" variant="ghost" className="text-xs ml-auto">템플릿 해제</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Button onClick={handleGenerateScript} disabled={generateScript.isPending || generateFromTemplate.isPending} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                      {(generateScript.isPending || generateFromTemplate.isPending) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI가 스크립트를 작성하고 있습니다...</> : <><Sparkles className="w-4 h-4 mr-2" />{templateId ? "템플릿 기반 스크립트 생성" : "AI 스크립트 생성"}</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Tips sidebar */}
              <div>
                <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg">프롬프트 작성 팁</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="p-3 bg-violet-500/10 rounded-lg">
                      <p className="font-medium text-violet-300 mb-1">구체적인 주제 명시</p>
                      <p>"블록체인" 보다 "이더리움 스마트 컨트랙트의 가스비 최적화 방법"이 더 좋은 결과를 만듭니다.</p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-lg">
                      <p className="font-medium text-violet-300 mb-1">대상 청중 지정</p>
                      <p>"프로그래밍 경험이 없는 일반인 대상" 또는 "Solidity 개발 경험이 있는 개발자 대상"</p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-lg">
                      <p className="font-medium text-violet-300 mb-1">포함할 내용 나열</p>
                      <p>다룰 세부 주제를 나열하면 더 체계적인 스크립트가 생성됩니다.</p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-lg">
                      <p className="font-medium text-violet-300 mb-1">실습/예시 요청</p>
                      <p>"실제 코드 예시 포함" 또는 "실제 사례 분석 포함"을 추가하세요.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: My Scripts */}
          <TabsContent value="scripts">
            <div className="space-y-4">
              {scriptsQuery.isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>}
              {scriptsQuery.data?.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">아직 생성된 스크립트가 없습니다.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab("create")}>스크립트 생성하기</Button>
                  </CardContent>
                </Card>
              )}
              {scriptsQuery.data?.map((script) => {
                const sections = script.sections ? JSON.parse(script.sections) : [];
                return (
                  <Card key={script.id} className="hover:border-violet-500/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{script.title}</h3>
                            <Badge variant="outline" className={DIFFICULTIES.find(d => d.value === script.difficulty)?.color || ""}>
                              {DIFFICULTIES.find(d => d.value === script.difficulty)?.label}
                            </Badge>
                            <Badge variant="outline">{CATEGORIES.find(c => c.value === script.category)?.label}</Badge>
                            <Badge variant={script.status === "ready" ? "default" : script.status === "generating" ? "secondary" : "destructive"}>
                              {script.status === "ready" ? "완료" : script.status === "generating" ? "생성 중" : "오류"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{script.prompt}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{script.sectionCount}개 섹션</span>
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />약 {Math.round((script.estimatedDurationSec || 0) / 60)}분</span>
                            <span>{new Date(script.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                          {sections.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sections.slice(0, 5).map((s: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{i + 1}. {s.title}</Badge>
                              ))}
                              {sections.length > 5 && <Badge variant="outline" className="text-xs">+{sections.length - 5}개</Badge>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Link href={`/script/${script.id}`}>
                            <Button size="sm" variant="outline">
                              <Edit3 className="w-4 h-4 mr-1" />편집
                            </Button>
                          </Link>
                          <Button size="sm" variant="default" onClick={() => { setSelectedScriptId(script.id); setPipelineTitle(script.title); setActiveTab("produce"); }} disabled={script.status !== "ready"}>
                            <Play className="w-4 h-4 mr-1" />영상 제작
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteScript.mutate({ id: script.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 3: Produce Video */}
          <TabsContent value="produce">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-violet-400" /> 원클릭 영상 제작</CardTitle>
                    <CardDescription>스크립트를 선택하고 음성/아바타 설정을 적용하여 강의 영상을 자동 제작합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>스크립트 선택</Label>
                      <Select value={selectedScriptId?.toString() || ""} onValueChange={(v) => { setSelectedScriptId(parseInt(v)); const s = scriptsQuery.data?.find(s => s.id === parseInt(v)); if (s) setPipelineTitle(s.title); }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="스크립트를 선택하세요" /></SelectTrigger>
                        <SelectContent>
                          {scriptsQuery.data?.filter(s => s.status === "ready").map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.title} ({s.sectionCount}섹션, ~{Math.round((s.estimatedDurationSec || 0) / 60)}분)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>제작 제목</Label>
                      <Input value={pipelineTitle} onChange={(e) => setPipelineTitle(e.target.value)} placeholder="영상 제목" className="mt-1" />
                    </div>

                    <Separator />

                    <div>
                      <Label className="flex items-center gap-2 mb-3"><Volume2 className="w-4 h-4 text-violet-400" />음성 설정</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">TTS 음성</Label>
                          <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VOICES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">음성 변조 프로필</Label>
                          <Select value={selectedVoiceModId} onValueChange={setSelectedVoiceModId}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">변조 없음</SelectItem>
                              {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 mb-3"><UserCircle2 className="w-4 h-4 text-violet-400" />딥페이크 아바타 (선택)</Label>
                      <Select value={selectedFaceSwapId} onValueChange={setSelectedFaceSwapId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">아바타 없음 (음성만)</SelectItem>
                          {faceSwapsQuery.data?.map((f) => <SelectItem key={f.id} value={f.id.toString()}>{f.name} ({f.method})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleStartPipeline} disabled={startPipeline.isPending || !selectedScriptId} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                      {startPipeline.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />강의 영상을 제작하고 있습니다... (TTS 생성 중)</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />원클릭 강의 영상 제작 시작</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Selected script preview */}
              <div>
                {selectedScriptId && scriptsQuery.data?.find(s => s.id === selectedScriptId) ? (() => {
                  const script = scriptsQuery.data!.find(s => s.id === selectedScriptId)!;
                  const sections = script.sections ? JSON.parse(script.sections) : [];
                  return (
                    <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                      <CardHeader>
                        <CardTitle className="text-lg">스크립트 미리보기</CardTitle>
                        <CardDescription>{script.title}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {sections.map((s: any, i: number) => (
                              <div key={i} className="p-3 bg-card/50 rounded-lg border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{i + 1}. {s.title}</span>
                                  <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{Math.round(s.durationSec / 60)}분</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-3">{s.content}</p>
                                {s.slideNotes && <p className="text-xs text-violet-400 mt-2">📝 {s.slideNotes}</p>}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })() : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">스크립트를 선택하면 미리보기가 표시됩니다.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Pipeline History */}
          <TabsContent value="pipelines">
            <div className="space-y-4">
              {pipelinesQuery.isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>}
              {pipelinesQuery.data?.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">아직 제작 이력이 없습니다.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab("produce")}>영상 제작하기</Button>
                  </CardContent>
                </Card>
              )}
              {pipelinesQuery.data?.map((item) => {
                const p = item.pipeline;
                const s = item.script;
                const audioUrls = p.audioUrls ? JSON.parse(p.audioUrls) : [];
                const statusMap: Record<string, { label: string; color: string }> = {
                  queued: { label: "대기 중", color: "bg-gray-500/20 text-gray-400" },
                  script_gen: { label: "스크립트 생성", color: "bg-blue-500/20 text-blue-400" },
                  tts_gen: { label: "TTS 생성", color: "bg-yellow-500/20 text-yellow-400" },
                  avatar_gen: { label: "아바타 생성", color: "bg-purple-500/20 text-purple-400" },
                  compositing: { label: "합성 중", color: "bg-orange-500/20 text-orange-400" },
                  completed: { label: "완료", color: "bg-green-500/20 text-green-400" },
                  failed: { label: "실패", color: "bg-red-500/20 text-red-400" },
                };
                const status = statusMap[p.status] || statusMap.queued;

                return (
                  <Card key={p.id} className="hover:border-violet-500/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{p.title}</h3>
                            <Badge variant="outline" className={status.color}>{status.label}</Badge>
                          </div>
                          {p.status !== "completed" && p.status !== "failed" && (
                            <div className="mb-3">
                              <Progress value={p.progressPercent || 0} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">{p.currentStep} ({p.progressPercent}%)</p>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>스크립트: {s.title}</span>
                            {p.totalDurationSec ? <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{Math.round(p.totalDurationSec / 60)}분</span> : null}
                            <span>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</span>
                          </div>
                          {p.status === "completed" && audioUrls.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium">생성된 음성 파일:</p>
                              <div className="flex flex-wrap gap-2">
                                {audioUrls.map((url: string, i: number) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <Badge variant="outline" className="cursor-pointer hover:bg-violet-500/20">
                                      <Volume2 className="w-3 h-3 mr-1" />섹션 {i + 1}
                                    </Badge>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {p.status === "completed" && (
                            <div className="mt-3 flex items-center gap-2">
                              {p.thumbnailUrl ? (
                                <div className="flex items-center gap-2">
                                  <img src={p.thumbnailUrl} alt="썸네일" className="w-24 h-14 object-cover rounded border border-border/50" />
                                  <a href={p.thumbnailUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" />썸네일 다운로드</Button>
                                  </a>
                                  <Button size="sm" variant="ghost" onClick={() => generateThumbnail.mutate({ pipelineId: p.id })} disabled={generateThumbnail.isPending}>
                                    <RefreshCw className="w-3 h-3 mr-1" />재생성
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => generateThumbnail.mutate({ pipelineId: p.id })} disabled={generateThumbnail.isPending}>
                                  {generateThumbnail.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Image className="w-3 h-3 mr-1" />}
                                  AI 썸네일 생성
                                </Button>
                              )}
                            </div>
                          )}
                          {p.errorMessage && <p className="text-sm text-red-400 mt-2">오류: {p.errorMessage}</p>}
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePipeline.mutate({ id: p.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          {/* Tab 5: Batch Production */}
          <TabsContent value="batch">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-violet-400" /> 배치 영상 제작</CardTitle>
                    <CardDescription>여러 스크립트를 선택하여 한번에 일괄 영상을 생성합니다. (최대 10개)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Select All */}
                    <div className="flex items-center justify-between">
                      <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        {batchSelectedIds.size === (scriptsQuery.data?.filter(s => s.status === "ready").length || 0) ? "전체 해제" : "전체 선택"}
                      </Button>
                      <Badge variant="outline">{batchSelectedIds.size}개 선택됨</Badge>
                    </div>

                    {/* Script list with checkboxes */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {scriptsQuery.data?.filter(s => s.status === "ready").map((script) => (
                        <div key={script.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            batchSelectedIds.has(script.id) ? "border-violet-500/50 bg-violet-500/10" : "border-border/50 hover:border-violet-500/30"
                          }`}
                          onClick={() => toggleBatchSelect(script.id)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            batchSelectedIds.has(script.id) ? "border-violet-500 bg-violet-500" : "border-muted-foreground"
                          }`}>
                            {batchSelectedIds.has(script.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{script.title}</p>
                            <p className="text-xs text-muted-foreground">{script.sectionCount}섹션 / ~{Math.round((script.estimatedDurationSec || 0) / 60)}분</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.value === script.category)?.label}
                          </Badge>
                        </div>
                      ))}
                      {(!scriptsQuery.data || scriptsQuery.data.filter(s => s.status === "ready").length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">준비된 스크립트가 없습니다.</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Batch voice settings */}
                    <div>
                      <Label className="flex items-center gap-2 mb-3"><Volume2 className="w-4 h-4 text-violet-400" />공통 음성 설정</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">TTS 음성</Label>
                          <Select value={batchTtsVoiceId} onValueChange={setBatchTtsVoiceId}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VOICES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">음성 변조</Label>
                          <Select value={batchVoiceModId} onValueChange={setBatchVoiceModId}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">변조 없음</SelectItem>
                              {voiceModsQuery.data?.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleBatchStart} disabled={batchStart.isPending || batchSelectedIds.size === 0} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                      {batchStart.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />배치 처리 중... ({batchSelectedIds.size}건)</>  
                      ) : (
                        <><ListChecks className="w-4 h-4 mr-2" />{batchSelectedIds.size}건 일괄 영상 제작 시작</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Batch Results */}
              <div>
                <Card className="bg-gradient-to-b from-violet-500/5 to-transparent border-violet-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg">배치 결과</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!batchResults ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListChecks className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">배치 제작을 시작하면 결과가 여기에 표시됩니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-green-500/10 rounded-lg text-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-green-400">{batchResults.summary.completed}</p>
                            <p className="text-xs text-muted-foreground">성공</p>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded-lg text-center">
                            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-red-400">{batchResults.summary.failed}</p>
                            <p className="text-xs text-muted-foreground">실패</p>
                          </div>
                          <div className="p-3 bg-gray-500/10 rounded-lg text-center">
                            <SkipForward className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-gray-400">{batchResults.summary.skipped}</p>
                            <p className="text-xs text-muted-foreground">건너뜀</p>
                          </div>
                        </div>

                        {/* Individual results */}
                        <div className="space-y-2">
                          {batchResults.results.map((r: any, i: number) => (
                            <div key={i} className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                              r.status === "completed" ? "bg-green-500/10" : r.status === "failed" ? "bg-red-500/10" : "bg-gray-500/10"
                            }`}>
                              {r.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : r.status === "failed" ? <XCircle className="w-4 h-4 text-red-400" /> : <SkipForward className="w-4 h-4 text-gray-400" />}
                              <span className="flex-1">스크립트 #{r.scriptId}</span>
                              {r.error && <span className="text-xs text-red-400">{r.error}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
