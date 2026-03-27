import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState } from "react";
import {
  Play,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  Search,
  Video,
  Palette,
} from "lucide-react";

export default function VodList() {
  const [search, setSearch] = useState("");
  const { data: vods, isLoading } = trpc.vod.list.useQuery({});

  const filteredVods = vods?.filter(
    (v) =>
      v.vod.title.toLowerCase().includes(search.toLowerCase()) ||
      v.lecture.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              VOD 아카이브
            </h1>
            <p className="text-muted-foreground mt-1">
              지난 강의 녹화본을 다시 볼 수 있습니다
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="VOD 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">로딩 중...</p>
          </div>
        ) : filteredVods && filteredVods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVods.map((item) => (
              <Link key={item.vod.id} href={`/vod/${item.vod.id}`}>
                <Card className="bg-card hover:border-primary/50 transition-all cursor-pointer group overflow-hidden">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                    <Video className="h-12 w-12 text-primary/50" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="h-6 w-6 text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {formatDuration(item.vod.duration || 0)}
                      </Badge>
                    </div>
                    {/* Status badge */}
                    {item.vod.status === "processing" && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-0">
                          처리 중
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                      {item.vod.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {item.lecture.title}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.vod.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {item.vod.messageCount || 0} Q&A
                      </span>
                      <span className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        {item.vod.snapshotCount || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.vod.createdAt
                        ? new Date(item.vod.createdAt).toLocaleDateString("ko-KR")
                        : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">아직 VOD가 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              강의가 종료되면 자동으로 VOD가 생성됩니다.
            </p>
            <Link href="/lectures">
              <Button>강의 둘러보기</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
