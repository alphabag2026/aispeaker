import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [shared, setShared] = useState(false);

  const shareMut = trpc.community.create.useMutation({
    onSuccess: () => {
      toast.success(t("shareToGalleryButton.hardcoded1"));
      setShared(true);
    },
    onError: (err: any) => toast.error(err.message || t("shareToGalleryButton.hardcoded2")),
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
          description: `AI Studio ${toolUsed}`,
          mediaUrl,
          mediaType,
          toolUsed,
        });
      }}
    >
      <Share2 className="h-4 w-4" />
      {shared ? t("shareToGalleryButton.hardcoded3") : t("shareToGalleryButton.hardcoded4")}
    </Button>
  );
}
