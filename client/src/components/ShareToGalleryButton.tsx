import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2 } from "lucide-react";

interface ShareToGalleryButtonProps {
  mediaUrl: string;
  mediaType: "image" | "video" | "audio";
  toolUsed: string;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function ShareToGalleryButton({
  mediaUrl,
  mediaType,
  toolUsed,
  size = "default",
  className = "flex-1 gap-2",
}: ShareToGalleryButtonProps) {
  const [shared, setShared] = useState(false);

  const shareMut = trpc.community.create.useMutation({
    onSuccess: () => {
      toast.success("커뮤니티 갤러리에 공유되었습니다! 🎉");
      setShared(true);
    },
    onError: (err: any) => toast.error(err.message || "공유 실패"),
  });

  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      disabled={shareMut.isPending || shared}
      onClick={() => {
        shareMut.mutate({
          title: `AI Studio - ${toolUsed}`,
          description: `AI Studio ${toolUsed} 도구로 생성한 작품입니다.`,
          mediaUrl,
          mediaType,
          toolUsed,
        });
      }}
    >
      <Share2 className="h-4 w-4" />
      {shared ? "공유 완료" : "갤러리 공유"}
    </Button>
  );
}
