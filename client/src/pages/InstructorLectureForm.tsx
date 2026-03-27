import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  Save,
  Loader2,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Link } from "wouter";

export default function InstructorLectureForm() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id;
  const lectureId = params.id ? Number(params.id) : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("web3");
  const [aiMode, setAiMode] = useState("voice");
  const [aiContext, setAiContext] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: lecture } = trpc.lecture.getById.useQuery(
    { id: lectureId! },
    { enabled: !!lectureId }
  );

  const { data: voiceProfiles } = trpc.voiceProfile.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery({ category });
  const { data: materials, refetch: refetchMaterials } = trpc.material.list.useQuery(
    { lectureId: lectureId! },
    { enabled: !!lectureId }
  );

  const createMutation = trpc.lecture.create.useMutation({
    onSuccess: (data) => {
      toast.success("강의가 생성되었습니다!");
      navigate(`/instructor/lectures/${data.id}/edit`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.lecture.update.useMutation({
    onSuccess: () => toast.success("강의가 수정되었습니다!"),
    onError: (err) => toast.error(err.message),
  });

  const uploadMutation = trpc.material.upload.useMutation({
    onSuccess: () => {
      toast.success("자료가 업로드되었습니다!");
      refetchMaterials();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMaterialMutation = trpc.material.delete.useMutation({
    onSuccess: () => {
      toast.success("자료가 삭제되었습니다.");
      refetchMaterials();
    },
  });

  useEffect(() => {
    if (lecture) {
      setTitle(lecture.title);
      setDescription(lecture.description || "");
      setCategory(lecture.category);
      setAiMode(lecture.aiMode);
      setAiContext(lecture.aiContext || "");
      setVoiceProfileId(lecture.voiceProfileId?.toString() || "");
    }
  }, [lecture]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("강의 제목을 입력해주세요.");
      return;
    }
    const data = {
      title,
      description: description || undefined,
      category: category as any,
      aiMode: aiMode as any,
      aiContext: aiContext || undefined,
      voiceProfileId: voiceProfileId ? Number(voiceProfileId) : undefined,
    };
    if (isEdit && lectureId) {
      updateMutation.mutate({ id: lectureId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lectureId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      let fileType: "pdf" | "ppt" | "image" | "video" | "other" = "other";
      if (file.type.includes("pdf")) fileType = "pdf";
      else if (file.type.includes("powerpoint") || file.name.endsWith(".pptx") || file.name.endsWith(".ppt")) fileType = "ppt";
      else if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";

      uploadMutation.mutate({
        lectureId,
        title: file.name,
        fileBase64: base64,
        filename: file.name,
        fileType,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/instructor/lectures">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{isEdit ? "강의 수정" : "새 강의 만들기"}</h1>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>강의 제목</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: Web3 기초부터 DeFi까지"
                />
              </div>
              <div>
                <Label>설명</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="강의에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>카테고리</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web3">Web3</SelectItem>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="blockchain">Blockchain</SelectItem>
                      <SelectItem value="defi">DeFi</SelectItem>
                      <SelectItem value="nft">NFT</SelectItem>
                      <SelectItem value="metaverse">Metaverse</SelectItem>
                      <SelectItem value="general">일반</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>AI 표현 방식</Label>
                  <Select value={aiMode} onValueChange={setAiMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice">음성</SelectItem>
                      <SelectItem value="text">텍스트</SelectItem>
                      <SelectItem value="avatar">아바타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Profile */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">음성 프로필</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>사용할 음성 프로필</Label>
                <Select value={voiceProfileId} onValueChange={setVoiceProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="기본 AI 음성 사용" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">기본 AI 음성</SelectItem>
                    {voiceProfiles?.map((vp) => (
                      <SelectItem key={vp.id} value={vp.id.toString()}>
                        {vp.name} ({vp.ttsVoiceId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  음성 프로필이 없으면{" "}
                  <Link href="/instructor/voice-profiles" className="text-primary underline">
                    여기서 생성
                  </Link>
                  하세요.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Context */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                AI 컨텍스트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              {templates && templates.length > 0 && (
                <div>
                  <Label>템플릿에서 불러오기</Label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const tpl = templates.find((t: any) => t.id.toString() === val);
                      if (tpl) {
                        setAiContext((prev) => prev ? prev + "\n\n" + tpl.systemPrompt : tpl.systemPrompt);
                        toast.success(`"${tpl.name}" 템플릿이 적용되었습니다.`);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="템플릿 선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl: any) => (
                        <SelectItem key={tpl.id} value={tpl.id.toString()}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    카테고리별 사전 정의된 템플릿을 불러와 컨텍스트에 추가합니다.
                    <Link href="/instructor/templates" className="text-primary underline ml-1">
                      템플릿 관리
                    </Link>
                  </p>
                </div>
              )}
              <div>
                <Label>AI 강사 추가 지식</Label>
                <Textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="AI 강사가 참고할 추가 정보를 입력하세요. 예: 이 강의는 초보자를 대상으로 합니다. 스마트 컨트랙트의 기초 개념을 중심으로 설명합니다."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  AI가 Q&A 답변 시 참고할 추가 컨텍스트입니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Materials (only in edit mode) */}
          {isEdit && lectureId && (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  강의 자료
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    업로드
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.mp4"
                    onChange={handleFileUpload}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {materials && materials.length > 0 ? (
                  <div className="space-y-2">
                    {materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          {mat.fileType === "image" ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{mat.title}</span>
                          <span className="text-xs text-muted-foreground">{mat.fileType}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMaterialMutation.mutate({ id: mat.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    아직 업로드된 자료가 없습니다. PDF, PPT, 이미지 파일을 업로드하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/instructor/lectures">
              <Button variant="outline">취소</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "수정" : "생성"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
