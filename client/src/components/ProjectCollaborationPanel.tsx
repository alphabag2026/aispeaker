import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Loader2, X, Check, Eye, Pencil, Mic } from "lucide-react";

interface Props {
  projectId: number;
  isOwner: boolean;
}

const ROLE_LABELS: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
  presenter: { label: "발표자", desc: "방송 시작/진행/슬라이드 제어 가능", icon: <Mic className="w-3.5 h-3.5" />, color: "text-violet-600 dark:text-violet-400" },
  editor: { label: "편집자", desc: "콘텐츠 수정 가능", icon: <Pencil className="w-3.5 h-3.5" />, color: "text-blue-600 dark:text-blue-400" },
  viewer: { label: "뷰어", desc: "보기만 가능", icon: <Eye className="w-3.5 h-3.5" />, color: "text-gray-500" },
};

function getRoleLabel(role: string) {
  return ROLE_LABELS[role]?.label || role;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "presenter") return "default";
  if (role === "editor") return "secondary";
  return "outline";
}

export default function ProjectCollaborationPanel({ projectId, isOwner }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"presenter" | "editor" | "viewer">("editor");
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const collaborators = trpc.collaboration.listByProject.useQuery({ projectId });
  const inviteMut = trpc.collaboration.invite.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.userName || inviteEmail}님을 초대했습니다`);
      setInviteEmail("");
      setShowInviteDialog(false);
      collaborators.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMut = trpc.collaboration.remove.useMutation({
    onSuccess: () => { toast.success("협업자를 제거했습니다"); collaborators.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRoleMut = trpc.collaboration.updateRole.useMutation({
    onSuccess: () => { toast.success("역할이 변경되었습니다"); collaborators.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMut.mutate({ projectId, email: inviteEmail.trim(), role: inviteRole });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            팀 협업 ({collaborators.data?.length || 0}명)
          </CardTitle>
          {isOwner && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> 초대
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>팀원 초대</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">이메일 주소</label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="team@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">역할</label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "presenter" | "editor" | "viewer")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presenter">
                          <div className="flex items-center gap-2">
                            <Mic className="w-3.5 h-3.5 text-violet-500" /> 발표자 - 방송 시작/진행/슬라이드 제어
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Pencil className="w-3.5 h-3.5 text-blue-500" /> 편집자 - 콘텐츠 수정 가능
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-gray-500" /> 뷰어 - 보기만 가능
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Role permission summary */}
                    <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1.5">
                      <p className="font-medium text-muted-foreground">역할별 권한 안내</p>
                      <div className="flex items-start gap-2">
                        <Mic className="w-3 h-3 mt-0.5 text-violet-500 shrink-0" />
                        <span><strong className="text-violet-600 dark:text-violet-400">발표자</strong>: 방송 시작/일시정지/재개/종료, 슬라이드 제어, 콘텐츠 보기</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Pencil className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
                        <span><strong className="text-blue-600 dark:text-blue-400">편집자</strong>: 스크립트/슬라이드 수정, 콘텐츠 보기</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Eye className="w-3 h-3 mt-0.5 text-gray-500 shrink-0" />
                        <span><strong className="text-gray-500">뷰어</strong>: 콘텐츠 보기만 가능</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleInvite} disabled={inviteMut.isPending || !inviteEmail.trim()}>
                    {inviteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                    초대 보내기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {collaborators.isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : !collaborators.data?.length ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            아직 팀원이 없습니다. {isOwner ? "초대 버튼을 눌러 팀원을 추가하세요." : ""}
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.data.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 group">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {c.userName?.charAt(0) || c.inviteEmail?.charAt(0) || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.userName || c.inviteEmail}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.userEmail || c.inviteEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={c.inviteStatus === "accepted" ? "default" : c.inviteStatus === "pending" ? "secondary" : "destructive"} className="text-[10px] h-5">
                    {c.inviteStatus === "accepted" ? "참여중" : c.inviteStatus === "pending" ? "대기중" : "거절"}
                  </Badge>
                  {/* Role badge with icon */}
                  <Badge variant={getRoleBadgeVariant(c.role)} className={`text-[10px] h-5 gap-0.5 ${ROLE_LABELS[c.role]?.color || ""}`}>
                    {ROLE_LABELS[c.role]?.icon}
                    {getRoleLabel(c.role)}
                  </Badge>
                  {isOwner && (
                    <>
                      <Select
                        value={c.role}
                        onValueChange={(v) => updateRoleMut.mutate({ collaboratorId: c.id, projectId, role: v as "presenter" | "editor" | "viewer" })}
                      >
                        <SelectTrigger className="h-6 w-20 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presenter">발표자</SelectItem>
                          <SelectItem value="editor">편집자</SelectItem>
                          <SelectItem value="viewer">뷰어</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => {
                          if (confirm(`${c.userName || c.inviteEmail}님을 제거하시겠습니까?`)) {
                            removeMut.mutate({ collaboratorId: c.id, projectId });
                          }
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 받은 초대 목록 컴포넌트
export function PendingInvitationsPanel() {
  const invitations = trpc.collaboration.pendingInvitations.useQuery();
  const respondMut = trpc.collaboration.respondToInvite.useMutation({
    onSuccess: () => { invitations.refetch(); },
  });

  if (!invitations.data?.length) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-600" />
          받은 초대 ({invitations.data.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {invitations.data.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-background rounded-md border">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{inv.projectTitle || "프로젝트"}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.inviterName}님이 초대 · {inv.role === "presenter" ? "발표자" : inv.role === "editor" ? "편집자" : "뷰어"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={respondMut.isPending}
                  onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: true }); toast.success("초대를 수락했습니다"); }}
                >
                  <Check className="w-3 h-3 mr-1" /> 수락
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={respondMut.isPending}
                  onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: false }); toast.info("초대를 거절했습니다"); }}
                >
                  <X className="w-3 h-3 mr-1" /> 거절
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
