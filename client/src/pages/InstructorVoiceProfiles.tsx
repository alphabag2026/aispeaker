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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Mic,
  Trash2,
  Edit,
  Upload,
  Loader2,
  Volume2,
  Brain,
  StopCircle,
} from "lucide-react";

const ttsVoices = [
  { id: "alloy", name: "Alloy", desc: "중성적, 균형잡힌 목소리" },
  { id: "echo", name: "Echo", desc: "남성적, 깊은 목소리" },
  { id: "fable", name: "Fable", desc: "영국식, 서술적 목소리" },
  { id: "onyx", name: "Onyx", desc: "남성적, 권위있는 목소리" },
  { id: "nova", name: "Nova", desc: "여성적, 따뜻한 목소리" },
  { id: "shimmer", name: "Shimmer", desc: "여성적, 밝은 목소리" },
];

export default function InstructorVoiceProfiles() {
  const { data: profiles, refetch } = trpc.voiceProfile.list.useQuery();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("");
  const [ttsVoiceId, setTtsVoiceId] = useState("alloy");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const createMutation = trpc.voiceProfile.create.useMutation({
    onSuccess: () => {
      toast.success("음성 프로필이 생성되었습니다!");
      resetForm();
      setDialogOpen(false);
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.voiceProfile.update.useMutation({
    onSuccess: () => {
      toast.success("음성 프로필이 수정되었습니다!");
      resetForm();
      setDialogOpen(false);
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.voiceProfile.delete.useMutation({
    onSuccess: () => {
      toast.success("음성 프로필이 삭제되었습니다.");
      utils.voiceProfile.list.invalidate();
    },
  });

  const uploadSampleMutation = trpc.voiceProfile.uploadSample.useMutation({
    onSuccess: (data) => {
      toast.success("음성 샘플이 업로드되고 분석되었습니다!");
      utils.voiceProfile.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Style analysis is handled server-side during upload

  const ttsMutation = trpc.tts.generate.useMutation();

  const resetForm = () => {
    setEditId(null);
    setName("");
    setVoiceDescription("");
    setTeachingStyle("");
    setTtsVoiceId("alloy");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("프로필 이름을 입력해주세요.");
      return;
    }
    if (editId) {
      updateMutation.mutate({
        id: editId,
        name,
        voiceDescription: voiceDescription || undefined,
        teachingStyle: teachingStyle || undefined,
        ttsVoiceId,
      });
    } else {
      createMutation.mutate({
        name,
        voiceDescription: voiceDescription || undefined,
        teachingStyle: teachingStyle || undefined,
        ttsVoiceId,
      });
    }
  };

  const handleEdit = (profile: any) => {
    setEditId(profile.id);
    setName(profile.name);
    setVoiceDescription(profile.voiceDescription || "");
    setTeachingStyle(profile.teachingStyle || "");
    setTtsVoiceId(profile.ttsVoiceId || "alloy");
    setDialogOpen(true);
  };

  const handleRecordSample = async (profileId: number) => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          uploadSampleMutation.mutate({
            profileId: profileId,
            audioData: base64,
            fileName: `sample-${Date.now()}.webm`,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("녹음이 시작되었습니다. 30초~1분 정도 자연스럽게 강의하듯 말씀해주세요.");
    } catch (err) {
      toast.error("마이크 접근이 거부되었습니다.");
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const handleAnalyze = (profileId: number) => {
    if (!voiceDescription && !teachingStyle) {
      toast.error("음성 특성이나 강의 스타일을 먼저 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
    updateMutation.mutate({
      id: profileId,
      voiceDescription,
      teachingStyle,
    }, {
      onSettled: () => setIsAnalyzing(false),
    });
  };

  const handlePreviewVoice = async (voiceId: string) => {
    try {
      const result = await ttsMutation.mutateAsync({
        text: "안녕하세요, 저는 AI 강사입니다. 오늘 Web3에 대해 알아보겠습니다.",
        voiceId,
      });
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play();
      }
    } catch (err) {
      toast.error("음성 미리듣기에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-studio-HS5V7dEHhBG4GbPuHinSnZ.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/instructor">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">음성 프로필 관리</h1>
            <p className="text-white/70 mt-1">AI가 사용할 음성과 강의 스타일을 설정하세요</p>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-end mb-8">

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 프로필
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "프로필 수정" : "새 음성 프로필"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>프로필 이름</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 기본 강의 목소리"
                  />
                </div>
                <div>
                  <Label>TTS 음성</Label>
                  <Select value={ttsVoiceId} onValueChange={setTtsVoiceId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ttsVoices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} - {v.desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>음성 특성 설명</Label>
                  <Textarea
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    placeholder="예: 차분하고 명확한 발음, 중간 속도, 핵심 개념 강조 시 톤 높임"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>강의 스타일</Label>
                  <Textarea
                    value={teachingStyle}
                    onChange={(e) => setTeachingStyle(e.target.value)}
                    placeholder="예: 비유를 자주 사용, 단계별 설명, 질문을 던지며 진행"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}>
                    취소
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editId ? "수정" : "생성"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Voice Profiles List */}
        {profiles && profiles.length > 0 ? (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mic className="h-4 w-4 text-primary" />
                        {profile.name}
                        {profile.isDefault && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            기본
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        TTS 음성: {ttsVoices.find((v) => v.id === profile.ttsVoiceId)?.name || profile.ttsVoiceId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handlePreviewVoice(profile.ttsVoiceId || "alloy")}
                        disabled={ttsMutation.isPending}
                      >
                        {ttsMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                        미리듣기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleEdit(profile)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive"
                        onClick={() => {
                          if (confirm("정말 삭제하시겠습니까?")) {
                            deleteMutation.mutate({ id: profile.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {profile.voiceDescription && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">음성 특성</p>
                      <p className="text-sm">{profile.voiceDescription}</p>
                    </div>
                  )}

                  {profile.teachingStyle && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">강의 스타일</p>
                      <p className="text-sm">{profile.teachingStyle}</p>
                    </div>
                  )}

                  {profile.systemPrompt && (
                    <div className="mb-3 p-3 rounded-lg bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        AI 시스템 프롬프트 (자동 생성)
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {profile.systemPrompt}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleRecordSample(profile.id)}
                      disabled={uploadSampleMutation.isPending}
                    >
                      {isRecording ? (
                        <>
                          <StopCircle className="h-3.5 w-3.5 text-destructive" />
                          녹음 중지
                        </>
                      ) : uploadSampleMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          음성 녹음
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setVoiceDescription(profile.voiceDescription || "");
                        setTeachingStyle(profile.teachingStyle || "");
                        handleAnalyze(profile.id);
                      }}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Brain className="h-3.5 w-3.5" />
                      )}
                      스타일 분석
                    </Button>
                    {profile.sampleUrl && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        샘플 업로드됨
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">음성 프로필이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              AI 강사가 사용할 음성 프로필을 만들어보세요.
            </p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              첫 프로필 만들기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
