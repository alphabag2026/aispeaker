
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Crown, Loader2, Mail, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  owner: { label: "소유자", icon: Crown, color: "text-amber-500" },
  presenter: { label: "projectCollaborationPanel.rolePresenter", icon: User, color: "text-blue-500" },
  editor: { label: "projectCollaborationPanel.roleEditor", icon: User, color: "text-green-500" },
  viewer: { label: "projectCollaborationPanel.roleViewer", icon: User, color: "text-gray-500" },
};

export function ProjectCollaborationPanel({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const collaborators = trpc.collaboration.listByProject.useQuery({ projectId: parseInt(projectId) });
  const inviteMut = trpc.collaboration.invite.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); setOpen(false); setEmail(""); toast.success("초대가 전송되었습니다."); },
    onError: (err: any) => { toast.error(err.message); },
  });
  const removeMut = trpc.collaboration.remove.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); toast.success("제거되었습니다."); },
    onError: (err: any) => { toast.error(err.message); },
  });
  const updateRoleMut = trpc.collaboration.updateRole.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); toast.success("역할이 업데이트되었습니다."); },
    onError: (err: any) => { toast.error(err.message); },
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"presenter" | "editor" | "viewer">("editor");

  const me = (collaborators.data as any[])?.find((c: any) => c.isMe);
  const isOwner = me?.role === "owner";

  const getRoleLabel = (role: string) => {
    const roleKey = `projectCollaborationPanel.role${role.charAt(0).toUpperCase() + role.slice(1)}`;
    return t(roleKey) || ROLE_LABELS[role]?.label || role;
  };

  const getRoleBadgeVariant = (role: string): "default" | "outline" | "secondary" | "destructive" => {
    if (role === "owner") return "outline";
    if (role === "presenter") return "default";
    if (role === "editor") return "secondary";
    return "outline";
  };

  const handleInvite = () => {
    if (!email) return toast.error("이메일을 입력해주세요.");
    inviteMut.mutate({ projectId: parseInt(projectId), email, role });
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/p/${projectId}/join`;
    navigator.clipboard.writeText(url);
    toast.success(t("projectCollaborationPanel.linkCopied"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projectCollaborationPanel.title")}</CardTitle>
        <CardDescription>{t("projectCollaborationPanel.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner && (
          <div className="flex gap-2 mb-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="w-full"><Mail className="w-4 h-4 mr-2" />{t("projectCollaborationPanel.inviteByEmail")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("projectCollaborationPanel.inviteByEmail")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Email</Label>
                    <Input id="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" placeholder="name@example.com" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">{t("projectCollaborationPanel.role")}</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as any)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presenter">{t("projectCollaborationPanel.rolePresenter")}</SelectItem>
                        <SelectItem value="editor">{t("projectCollaborationPanel.roleEditor")}</SelectItem>
                        <SelectItem value="viewer">{t("projectCollaborationPanel.roleViewer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleInvite} disabled={inviteMut.isPending}>
                    {inviteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {t("projectCollaborationPanel.invite")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" onClick={copyInviteLink} className="w-full"><Copy className="w-4 h-4 mr-2" />{t("projectCollaborationPanel.copyInviteLink")}</Button>
          </div>
        )}

        <h3 className="text-sm font-medium mb-2">{t("projectCollaborationPanel.collaboratorList")}</h3>
        {collaborators.isLoading ? (
          <div className="text-center text-muted-foreground py-4">...</div>
        ) : !(collaborators.data as any[])?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("projectCollaborationPanel.noCollaborators")}</p>
        ) : (
          <div className="space-y-2">
            {(collaborators.data as any[]).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group">
                <div className="flex items-center gap-3 min-w-0">
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
                    {c.inviteStatus === "accepted" ? t("projectCollaborationPanel.statusAccepted") : c.inviteStatus === "pending" ? t("projectCollaborationPanel.statusPending") : t("projectCollaborationPanel.statusRejected")}
                  </Badge>
                  <Badge variant={getRoleBadgeVariant(c.role)} className={`text-[10px] h-5 gap-0.5 ${ROLE_LABELS[c.role]?.color || ""}`}>
                    {getRoleLabel(c.role)}
                  </Badge>
                  {isOwner && (
                    <>
                      <Select
                        value={c.role}
                        onValueChange={(v) => updateRoleMut.mutate({ collaboratorId: c.id, projectId: parseInt(projectId), role: v as "presenter" | "editor" | "viewer" })}
                      >
                        <SelectTrigger className="h-6 w-20 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presenter">{t("projectCollaborationPanel.rolePresenter")}</SelectItem>
                          <SelectItem value="editor">{t("projectCollaborationPanel.roleEditor")}</SelectItem>
                          <SelectItem value="viewer">{t("projectCollaborationPanel.roleViewer")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => {
                          if (confirm(t("projectCollaborationPanel.removeConfirmation"))) {
                            removeMut.mutate({ collaboratorId: c.id, projectId: parseInt(projectId) });
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

export function PendingInvitationsPanel() {
  const { t } = useLanguage();
  const invitations = trpc.collaboration.pendingInvitations.useQuery();
  const respondMut = trpc.collaboration.respondToInvite.useMutation({
    onSuccess: () => { invitations.refetch(); },
  });
  if (!(invitations.data as any[])?.length) return null;
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-600" />
          {t("projectCollaborationPanel.pendingInvitationsTitle")} ({(invitations.data as any[])?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {(invitations.data as any[])?.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-background rounded-md border">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{inv.projectTitle || t("projectCollaborationPanel.projectDefaultTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("projectCollaborationPanel.invitedBy")} {inv.inviterName || ""} · {inv.role === "presenter" ? t("projectCollaborationPanel.rolePresenter") : inv.role === "editor" ? t("projectCollaborationPanel.roleEditor") : t("projectCollaborationPanel.roleViewer")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={respondMut.isPending}
                  onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: true }); toast.success(t("projectCollaborationPanel.acceptSuccess")); }}
                >
                  <Check className="w-3 h-3 mr-1" /> {t("projectCollaborationPanel.accept")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={respondMut.isPending}
                  onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: false }); toast.info(t("projectCollaborationPanel.rejectSuccess")); }}
                >
                  <X className="w-3 h-3 mr-1" /> {t("projectCollaborationPanel.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
