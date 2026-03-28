import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Crown, Globe, Sparkles, User, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "professional", label: "전문가" },
  { value: "academic", label: "학술" },
  { value: "corporate", label: "기업" },
  { value: "casual", label: "캐주얼" },
  { value: "creative", label: "크리에이티브" },
];

const GENDERS = [
  { value: "all", label: "전체" },
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

export default function FaceGallery() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFace, setSelectedFace] = useState<any>(null);

  const { data: faces = [], isLoading } = trpc.sampleFace.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    gender: selectedGender === "all" ? undefined : selectedGender,
  });

  const filteredFaces = faces.filter((face: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      face.name.toLowerCase().includes(q) ||
      face.description?.toLowerCase().includes(q) ||
      (face.tags as string[])?.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTEydjRoMTJ6TTI0IDI0aDEydi0ySDI0djJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">AI 얼굴 갤러리</h1>
              <p className="text-purple-100 mt-1">강의에 사용할 AI 강사 페르소나를 선택하세요</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> {faces.length}+ 프리셋
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 px-3 py-1">
              <Globe className="w-3 h-3 mr-1" /> 다국어 지원
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 설명, 태그로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="성별" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFaces.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">검색 결과가 없습니다</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">다른 필터를 시도해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredFaces.map((face: any) => (
              <Card
                key={face.id}
                className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
                onClick={() => setSelectedFace(face)}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-muted/50 to-muted">
                  <img
                    src={face.imageUrl}
                    alt={face.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {face.isPremium && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-500/90 text-white border-0 shadow-lg">
                        <Crown className="w-3 h-3 mr-1" /> PRO
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                    <h3 className="font-semibold text-white text-sm">{face.name}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{face.category} · {face.ageRange}</p>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{face.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(face.tags as string[])?.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Face Detail Dialog */}
      <Dialog open={!!selectedFace} onOpenChange={() => setSelectedFace(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFace?.name}
              {selectedFace?.isPremium && (
                <Badge className="bg-amber-500 text-white border-0">
                  <Crown className="w-3 h-3 mr-1" /> PRO
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFace && (
            <div className="space-y-4">
              <div className="aspect-square max-h-[300px] mx-auto overflow-hidden rounded-xl">
                <img
                  src={selectedFace.imageUrl}
                  alt={selectedFace.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">카테고리</span>
                    <p className="font-medium capitalize">{selectedFace.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">성별</span>
                    <p className="font-medium">{selectedFace.gender === "male" ? "남성" : "여성"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">연령대</span>
                    <p className="font-medium">{selectedFace.ageRange}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">지원 언어</span>
                    <p className="font-medium">{(selectedFace.languages as string[])?.join(", ")}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedFace.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(selectedFace.tags as string[])?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!user) {
                    toast.error("로그인이 필요합니다.");
                    return;
                  }
                  if (selectedFace.isPremium) {
                    toast.info("Pro 플랜 이상에서 사용 가능합니다.");
                    return;
                  }
                  toast.success(`${selectedFace.name}이(가) 선택되었습니다. 스튜디오에서 적용하세요.`);
                  setSelectedFace(null);
                }}
              >
                이 얼굴 선택하기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
