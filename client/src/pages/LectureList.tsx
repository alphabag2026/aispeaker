import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { BookOpen, Search, Users, Clock, Mic, MessageSquare, Monitor } from "lucide-react";

const categoryLabels: Record<string, string> = {
  web3: "Web3",
  ai: "AI",
  blockchain: "Blockchain",
  defi: "DeFi",
  nft: "NFT",
  metaverse: "Metaverse",
  general: "일반",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "준비중", color: "bg-muted text-muted-foreground" },
  scheduled: { label: "예정", color: "bg-blue-500/20 text-blue-400" },
  live: { label: "LIVE", color: "bg-green-500/20 text-green-400" },
  completed: { label: "완료", color: "bg-gray-500/20 text-gray-400" },
  archived: { label: "보관", color: "bg-gray-500/20 text-gray-400" },
};

const aiModeIcons: Record<string, React.ReactNode> = {
  voice: <Mic className="h-3.5 w-3.5" />,
  text: <MessageSquare className="h-3.5 w-3.5" />,
  avatar: <Monitor className="h-3.5 w-3.5" />,
};

export default function LectureList() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: lectures, isLoading } = trpc.lecture.list.useQuery({
    category: selectedCategory || undefined,
    search: search || undefined,
  });

  const categories = ["", "web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">강의 목록</h1>
          <p className="text-muted-foreground">AI 강사가 진행하는 다양한 강의를 둘러보세요</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="강의 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat ? categoryLabels[cat] : "전체"}
              </Button>
            ))}
          </div>
        </div>

        {/* Lecture Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lectures && lectures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lectures.map((lecture) => {
              const status = statusLabels[lecture.status] || statusLabels.draft;
              return (
                <Link key={lecture.id} href={`/lecture/${lecture.id}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className={`${status.color} border-0`}>
                          {status.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {aiModeIcons[lecture.aiMode]}
                          <span>{lecture.aiMode === "voice" ? "음성" : lecture.aiMode === "text" ? "텍스트" : "아바타"}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {lecture.title}
                      </h3>

                      {lecture.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {lecture.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[lecture.category] || lecture.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(lecture.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">강의가 없습니다</h3>
            <p className="text-muted-foreground">아직 등록된 강의가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
