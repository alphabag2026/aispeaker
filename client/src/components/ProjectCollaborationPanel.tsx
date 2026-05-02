
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Crown, Loader2, Mail, Shield, User, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const ROLE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  owner: { label: "소유자", icon: Crown, color: "text-amber-500" },
  presenter: { label: "발표자", icon: User, color: "text-blue-500" },
  editor: { label: "편집자", icon: User, color: "text-green-500" },
  viewer: { label: "뷰어", icon: User, color: "text-gray-500" },
};

export function ProjectCollaborationPanel({ projectId }: { projectId: string }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const collaborators = trpc.collaboration.listByProject.useQuery({ projectId: parseInt(projectId) });
  const inviteMut = trpc.collaboration.invite.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); setOpen(false); setEmail(""); toast.success(t("projectCollaborationPanel.hardcoded2")); },
    onError: (err: any) => { toast.error(err.message); },
  });
  const removeMut = trpc.collaboration.remove.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); toast.success(t("projectCollaborationPanel.hardcoded3")); },
    onError: (err: any) => { toast.error(err.message); },
  });
  const updateRoleMut = trpc.collaboration.updateRole.useMutation({
    onSuccess: () => { utils.collaboration.listByProject.invalidate({ projectId: parseInt(projectId) }); toast.success(t("projectCollaborationPanel.hardcoded4")); },
    onError: (err: any) => { toast.error(err.message); },
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"presenter" | "editor" | "viewer">("editor");
  const [expanded, setExpanded] = useState(false);

  const me = (collaborators.data as any[])?.find((c: any) => c.isMe);
  const isOwner = me?.role === "owner";

  const getRoleLabel = (role: string) => {
    if (ROLE_LABELS[role]) return ROLE_LABELS[role].label;
    const roleKey = `projectCollaborationPanel.role${role.charAt(0).toUpperCase() + role.slice(1)}`;
    const translated = t(roleKey);
    return (translated && translated !== roleKey) ? translated : role;
  };

  const getRoleBadgeVariant = (role: string): "default" | "outline" | "secondary" | "destructive" => {
    if (role === "owner") return "outline";
    if (role === "presenter") return "default";
    if (role === "editor") return "secondary";
    return "outline";
  };

  const handleInvite = () => {
    if (!email) return toast.error(t("projectCollaborationPanel.hardcoded5"));
    inviteMut.mutate({ projectId: parseInt(projectId), email, role });
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/p/${projectId}/join`;
    navigator.clipboard.writeText(url);
    toast.success(t("projectCollaborationPanel.linkCopied"));
  };

  const collabCount = (collaborators.data as any[])?.length || 0;

  return (
    <div className="border rounded-lg bg-card text-card-foreground">
      {/* Compact header - clickable to expand */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{t("projectCollaborationPanel.title")}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{collabCount}</Badge>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t">
          {isOwner && (
            <div className="flex gap-1.5 mb-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1 h-7 text-xs"><Mail className="w-3 h-3 mr-1" />{t("projectCollaborationPanel.inviteByEmail")}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[380px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm">{t("projectCollaborationPanel.inviteByEmail")}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label htmlFor="email" className="text-right text-xs">Email</Label>
                      <Input id="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3 h-8 text-xs" placeholder="name@example.com" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-3">
                      <Label htmlFor="role" className="text-right text-xs">{t("projectCollaborationPanel.role")}</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as any)}>
                        <SelectTrigger className="col-span-3 h-8 text-xs">
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
                    <Button size="sm" onClick={handleInvite} disabled={inviteMut.isPending}>
                      {inviteMut.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} {t("projectCollaborationPanel.invite")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={copyInviteLink} className="flex-1 h-7 text-xs"><Copy className="w-3 h-3 mr-1" />{t("projectCollaborationPanel.copyInviteLink")}</Button>
            </div>
          )}

          {collaborators.isLoading ? (
            <div className="text-center text-muted-foreground py-2 text-xs">...</div>
          ) : !collabCount ? (
            <p className="text-xs text-muted-foreground text-center py-2">{t("projectCollaborationPanel.noCollaborators")}</p>
          ) : (
            <div className="space-y-1">
              {(collaborators.data as any[]).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/50 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary shrink-0">
                      {c.userName?.charAt(0) || c.inviteEmail?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">{c.userName || c.inviteEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={getRoleBadgeVariant(c.role)} className={`text-[9px] h-4 px-1 ${ROLE_LABELS[c.role]?.color || ""}`}>
                      {getRoleLabel(c.role)}
                    </Badge>
                    {isOwner && c.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => {
                          if (confirm(t("projectCollaborationPanel.removeConfirmation"))) {
                            removeMut.mutate({ collaboratorId: c.id, projectId: parseInt(projectId) });
                          }
                        }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 rounded-lg p-2 mb-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Mail className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-medium">{t("projectCollaborationPanel.pendingInvitationsTitle")} ({(invitations.data as any[])?.length || 0})</span>
      </div>
      <div className="space-y-1.5">
        {(invitations.data as any[])?.map((inv: any) => (
          <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 bg-background rounded border text-xs">
            <div className="min-w-0">
              <p className="font-medium truncate">{inv.projectTitle || t("projectCollaborationPanel.projectDefaultTitle")}</p>
              <p className="text-[10px] text-muted-foreground">
                {inv.inviterName || ""} · {inv.role === "presenter" ? t("projectCollaborationPanel.rolePresenter") : inv.role === "editor" ? t("projectCollaborationPanel.roleEditor") : t("projectCollaborationPanel.roleViewer")}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="default"
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={respondMut.isPending}
                onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: true }); toast.success(t("projectCollaborationPanel.acceptSuccess")); }}
              >
                <Check className="w-2.5 h-2.5 mr-0.5" /> {t("projectCollaborationPanel.accept")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={respondMut.isPending}
                onClick={() => { respondMut.mutate({ inviteId: inv.id, accept: false }); toast.info(t("projectCollaborationPanel.rejectSuccess")); }}
              >
                <X className="w-2.5 h-2.5 mr-0.5" /> {t("projectCollaborationPanel.reject")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
