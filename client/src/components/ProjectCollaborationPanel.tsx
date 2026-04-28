import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Loader2, X, Check, Crown, Eye, Pencil } from "lucide-react";

interface Props {
  projectId: number;
  isOwner: boolean;
}

export default function ProjectCollaborationPanel({ projectId, isOwner }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
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
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Pencil className="w-3.5 h-3.5" /> 편집자 - 콘텐츠 수정 가능
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5" /> 뷰어 - 보기만 가능
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  {isOwner && (
                    <>
                      <Select
                        value={c.role}
                        onValueChange={(v) => updateRoleMut.mutate({ collaboratorId: c.id, projectId, role: v as "editor" | "viewer" })}
                      >
                        <SelectTrigger className="h-6 w-20 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                <p className="text-xs text-muted-foreground">{inv.inviterName}님이 초대 · {inv.role === "editor" ? "편집자" : "뷰어"}</p>
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
