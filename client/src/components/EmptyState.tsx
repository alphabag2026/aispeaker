import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LucideIcon, Plus } from "lucide-react";

const EMPTY_IMAGES: Record<string, string> = {
  lectures: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/empty-lectures-5LXJ3QKWb3QzjXpPSZMKSr.webp",
  scripts: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/empty-scripts-gzNmc8Pv4w8UzDyzizxAvH.webp",
  broadcast: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/empty-broadcast-WiVTAadrzfDya7o4vJkuDP.webp",
  pipeline: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/empty-pipeline-PzXpmP29VKvU5veyLvpsJk.webp",
  general: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/empty-general-bvPQqc5ULZ6RqoZvzuSSMQ.webp",
};

interface EmptyStateProps {
  type?: "lectures" | "scripts" | "broadcast" | "pipeline" | "general";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export default function EmptyState({
  type = "general",
  title,
  description,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon = Plus,
  onAction,
}: EmptyStateProps) {
  const imageUrl = EMPTY_IMAGES[type] || EMPTY_IMAGES.general;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-6">
        <img
          src={imageUrl}
          alt={title}
          className="w-48 h-48 object-contain opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent rounded-full" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {actionLabel && (actionHref ? (
        <Link href={actionHref}>
          <Button className="gap-2">
            <ActionIcon className="h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      ) : onAction ? (
        <Button onClick={onAction} className="gap-2">
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </Button>
      ) : null)}
    </div>
  );
}
