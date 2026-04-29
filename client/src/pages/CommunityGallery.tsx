import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Heart, MessageCircle, Eye, Upload, ArrowLeft, Plus,
  Image as ImageIcon, Video, Music, Filter, TrendingUp,
  Clock, Sparkles, Send, X, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TOOL_FILTERS = [
  { value: "", label: "communityGallery.toolFilter.all" },
  { value: "tts", label: "TTS" },
  { value: "voice-clone", label: "Voice Clone" },
  { value: "image-gen", label: "Image Gen" },
  { value: "bg-remove", label: "BG Remove" },
  { value: "face-swap", label: "Face Swap" },
  { value: "talking-avatar", label: "Talking Avatar" },
  { value: "video-translate", label: "Video Translate" },
  { value: "image-to-video", label: "Image to Video" },
];

export default function CommunityGallery() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [toolFilter, setToolFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.community.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sort,
    toolUsed: toolFilter || undefined,
  });

  const myLikesQuery = trpc.community.myLikes.useQuery(undefined, { enabled: !!user });
  const likedPostIds = useMemo(() => new Set(myLikesQuery.data || []), [myLikesQuery.data]);

  const likeMut = trpc.community.like.useMutation({
    onSuccess: () => {
      refetch();
      myLikesQuery.refetch();
    },
  });

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Community Gallery
              </h1>
              <p className="text-xs text-muted-foreground">{t("communityGallery.header.description")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <Button
                onClick={() => setShowUpload(true)}
                className="glow-button gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("communityGallery.header.uploadButton")}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="container py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={sort === "latest" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSort("latest"); setPage(0); }}
              className="gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              {t("communityGallery.filters.latest")}
            </Button>
            <Button
              variant={sort === "popular" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSort("popular"); setPage(0); }}
              className="gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("communityGallery.filters.popular")}
            </Button>
          </div>
          <div className="h-6 w-px bg-border/50" />
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {TOOL_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={toolFilter === f.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => { setToolFilter(f.value); setPage(0); }}
                className="text-xs h-7"
              >
                {f.value === '' ? t('communityGallery.toolFilter.all') : f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Sparkles className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t("communityGallery.gallery.noPosts")}</p>
            <p className="text-sm mt-1">{t("communityGallery.gallery.shareFirstPost")}</p>
          </div>
        ) : (
          <>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
              {posts.map((post: any) => (
                <GalleryCard
                  key={post.id}
                  post={post}
                  isLiked={likedPostIds.has(post.id)}
                  onLike={() => likeMut.mutate({ postId: post.id })}
                  onSelect={() => setSelectedPost(post.id)}
                  isLoggedIn={!!user}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  {t("communityGallery.pagination.previous")}
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t("communityGallery.pagination.next")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          postId={selectedPost}
          onClose={() => setSelectedPost(null)}
          isLoggedIn={!!user}
          isLiked={likedPostIds.has(selectedPost)}
          onLike={() => likeMut.mutate({ postId: selectedPost })}
          onRefresh={refetch}
        />
      )}

      {/* Upload Modal */}
      {showUpload && user && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); refetch(); }}
        />
      )}
    </div>
  );
}

function GalleryCard({ post, isLiked, onLike, onSelect, isLoggedIn }: {
  post: any; isLiked: boolean; onLike: () => void; onSelect: () => void; isLoggedIn: boolean;
}) {
  const { t } = useLanguage();
  const mediaIcon = post.mediaType === "video" ? <Video className="h-3 w-3" /> :
    post.mediaType === "audio" ? <Music className="h-3 w-3" /> :
    <ImageIcon className="h-3 w-3" />;

  return (
    <div className="break-inside-avoid">
      <Card className="glass-card overflow-hidden group cursor-pointer hover:border-primary/30 transition-all duration-300">
        {/* Media Preview */}
        <div className="relative overflow-hidden" onClick={onSelect}>
          {post.mediaType === "image" ? (
            <img
              src={post.mediaUrl}
              alt={post.title}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : post.mediaType === "video" ? (
            <div className="aspect-video bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Video className="h-12 w-12 text-violet-400/50" />
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
              <Music className="h-12 w-12 text-teal-400/50" />
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Eye className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Info */}
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium line-clamp-1">{post.title}</h3>
            <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
              {mediaIcon}
              {post.toolUsed || "AI"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[9px] text-white font-bold">
                {(post.userName || "U")[0]}
              </div>
              <span className="text-xs text-muted-foreground">{post.userName || "Anonymous"}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button
                className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-rose-400' : 'hover:text-rose-400'}`}
                onClick={(e) => { e.stopPropagation(); if (isLoggedIn) onLike(); else toast.error(t("communityGallery.card.loginRequired")); }}
              >
                <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-rose-400' : ''}`} />
                {post.likeCount}
              </button>
              <button className="flex items-center gap-1 hover:text-primary" onClick={onSelect}>
                <MessageCircle className="h-3.5 w-3.5" />
                {post.commentCount}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PostDetailModal({ postId, onClose, isLoggedIn, isLiked, onLike, onRefresh }: {
  postId: number; onClose: () => void; isLoggedIn: boolean; isLiked: boolean; onLike: () => void; onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const { data: post, isLoading } = trpc.community.getById.useQuery({ id: postId });
  const { data: comments, refetch: refetchComments } = trpc.community.comments.useQuery({ postId });
  const [comment, setComment] = useState("");
  const addCommentMut = trpc.community.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      refetchComments();
      onRefresh();
      toast.success(t("communityGallery.detail.commentSuccess"));
    },
  });

  if (isLoading || !post) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="lg:w-3/5 bg-black flex items-center justify-center min-h-[300px]">
          {post.mediaType === "image" ? (
            <img src={post.mediaUrl} alt={post.title} className="max-w-full max-h-[70vh] object-contain" />
          ) : post.mediaType === "video" ? (
            <video src={post.mediaUrl} controls className="max-w-full max-h-[70vh]" />
          ) : (
            <audio src={post.mediaUrl} controls className="w-full max-w-md" />
          )}
        </div>

        {/* Details */}
        <div className="lg:w-2/5 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs text-white font-bold">
                  {(post.userName || "U")[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{post.userName || "Anonymous"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold">{post.title}</h2>
            {post.description && <p className="text-sm text-muted-foreground mt-1">{post.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              {post.toolUsed && <Badge variant="secondary" className="text-xs">{post.toolUsed}</Badge>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.viewCount}</span>
                <button
                  className={`flex items-center gap-1 ${isLiked ? 'text-rose-400' : 'hover:text-rose-400'}`}
                  onClick={() => { if (isLoggedIn) onLike(); else toast.error(t("communityGallery.card.loginRequired")); }}
                >
                  <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-rose-400' : ''}`} />
                  {post.likeCount}
                </button>
                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.commentCount}</span>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(comments || []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("communityGallery.detail.noComments")}</p>
            ) : (
              (comments || []).map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                    {(c.userName || "U")[0]}
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-medium">{c.userName || "Anonymous"}</span>
                      <span className="text-muted-foreground ml-2">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                    </p>
                    <p className="text-sm mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          {isLoggedIn && (
            <div className="p-3 border-t border-border/40">
              <div className="flex gap-2">
                <Input
                  placeholder={t("communityGallery.detail.commentPlaceholder")}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      addCommentMut.mutate({ postId, content: comment.trim() });
                    }
                  }}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  size="sm"
                  disabled={!comment.trim() || addCommentMut.isPending}
                  onClick={() => addCommentMut.mutate({ postId, content: comment.trim() })}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("image");
  const [toolUsed, setToolUsed] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const uploadMut = trpc.community.upload.useMutation();
  const createMut = trpc.community.create.useMutation({
    onSuccess: () => {
      toast.success(t("communityGallery.upload.success"));
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("communityGallery.upload.fileSizeError"));
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMut.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setMediaUrl(result.url);
        // Auto-detect media type
        if (file.type.startsWith("video")) setMediaType("video");
        else if (file.type.startsWith("audio")) setMediaType("audio");
        else setMediaType("image");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(t("communityGallery.upload.uploadError"));
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !mediaUrl) {
      toast.error(t("communityGallery.upload.validationError"));
      return;
    }
    createMut.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      mediaType,
      mediaUrl,
      toolUsed: toolUsed || undefined,
      tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      isPublic: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("communityGallery.upload.title")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">{t("communityGallery.upload.titleLabel")}</Label>
            <Input
              placeholder={t("communityGallery.upload.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">{t("communityGallery.upload.descriptionLabel")}</Label>
            <Textarea
              placeholder={t("communityGallery.upload.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm">{t("communityGallery.upload.mediaLabel")}</Label>
            {mediaUrl ? (
              <div className="mt-1 relative rounded-lg overflow-hidden border border-border">
                {mediaType === "image" && (
                  <img src={mediaUrl} alt="Preview" className="w-full h-40 object-cover" />
                )}
                {mediaType === "video" && (
                  <video src={mediaUrl} className="w-full h-40 object-cover" />
                )}
                {mediaType === "audio" && (
                  <div className="h-20 flex items-center justify-center bg-muted">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setMediaUrl("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{t("communityGallery.upload.uploadLabel")}</span>
                      <span className="text-xs text-muted-foreground mt-1">{t("communityGallery.upload.uploadHint")}</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload} />
                </label>
                <div className="mt-2">
                  <Input
                    placeholder={t("communityGallery.upload.urlPlaceholder")}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">{t("communityGallery.upload.toolLabel")}</Label>
              <select
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={toolUsed}
                onChange={(e) => setToolUsed(e.target.value)}
              >
                <option value="">{t("communityGallery.upload.toolPlaceholder")}</option>
                {TOOL_FILTERS.filter(f => f.value).map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm">{t("communityGallery.upload.tagsLabel")}</Label>
              <Input
                placeholder="ai, portrait, art"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            className="w-full glow-button"
            disabled={!title.trim() || !mediaUrl || createMut.isPending}
            onClick={handleSubmit}
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {t("communityGallery.upload.submitButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
