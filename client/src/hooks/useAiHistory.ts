import { trpc } from "@/lib/trpc";
import { useState } from "react";

export function useAiHistory() {
  const [page, setPage] = useState(1);
  const [toolFilter, setToolFilter] = useState<string | null>(null);
  const limit = 20;
  
  const query = trpc.aiHistory.list.useQuery(
    { limit, offset: (page - 1) * limit, tool: toolFilter || undefined },
  );
  
  const history = query.data?.items || [];
  const total = query.data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  
  return {
    history,
    total,
    isLoading: query.isLoading,
    refetch: query.refetch,
    page,
    setPage,
    limit,
    totalPages,
    toolFilter,
    setToolFilter,
  };
}
