import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Clock, Target, BookOpen, Star, ShoppingCart, Settings, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const CATEGORIES = [
  { value: "web3", label: "Web3" },
  { value: "ai", label: "AI" },
  { value: "blockchain", label: "블록체인" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "metaverse", label: "메타버스" },
  { value: "programming", label: "프로그래밍" },
  { value: "business", label: "비즈니스" },
  { value: "design", label: "디자인" },
];

export default function Recommendations() {
  const { user } = useAuth();
  const [showPrefs, setShowPrefs] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>("all");
  const [weeklyTarget, setWeeklyTarget] = useState(120);

  const personalizedQuery = trpc.recommendation.getPersonalized.useQuery(undefined, { enabled: !!user });
  const trendingQuery = trpc.recommendation.getTrending.useQuery();
  const historyQuery = trpc.recommendation.getHistory.useQuery(undefined, { enabled: !!user });
  const prefsQuery = trpc.recommendation.getPreferences.useQuery(undefined, { enabled: !!user });

  const updatePrefsMutation = trpc.recommendation.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("학습 선호도가 업데이트되었습니다!");
      prefsQuery.refetch();
      personalizedQuery.refetch();
      setShowPrefs(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSavePrefs = () => {
    updatePrefsMutation.mutate({
      preferredCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      preferredDifficulty: difficulty as any,
      weeklyTargetMinutes: weeklyTarget,
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const formatPrice = (cents: number | null) => cents ? `$${(cents / 100).toFixed(2)}` : "무료";

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="container max-w-6xl py-4 sm:py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-yellow-400" />
              AI 맞춤 추천
            </h1>
            <p className="text-gray-400 mt-1">학습 이력과 선호도를 기반으로 최적의 강의를 추천합니다</p>
          </div>
          <Button variant="outline" onClick={() => setShowPrefs(!showPrefs)} className="border-gray-600 text-gray-300 hover:text-white">
            <Settings className="w-4 h-4 mr-2" />학습 선호도 설정
          </Button>
        </div>

        {/* Preferences Panel */}
        {showPrefs && (
          <Card className="bg-[#1a1a2e] border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                학습 선호도 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>관심 카테고리 (복수 선택 가능)</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <Badge key={cat.value} onClick={() => toggleCategory(cat.value)} className={`cursor-pointer transition-colors ${selectedCategories.includes(cat.value) ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>난이도</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="bg-[#16213e] border-gray-600"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-gray-700">
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="beginner">초급</SelectItem>
                      <SelectItem value="intermediate">중급</SelectItem>
                      <SelectItem value="advanced">고급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>주간 학습 목표 (분)</Label>
                  <Input type="number" value={weeklyTarget} onChange={(e) => setWeeklyTarget(Number(e.target.value))} min={10} max={600} className="bg-[#16213e] border-gray-600" />
                </div>
              </div>
              <Button onClick={handleSavePrefs} disabled={updatePrefsMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                {updatePrefsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                저장
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Personalized Recommendations */}
        {user && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              나를 위한 추천
              {personalizedQuery.data?.fromCache && <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">캐시</Badge>}
            </h2>
            {personalizedQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : (personalizedQuery.data?.recommendations?.length || 0) === 0 ? (
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardContent className="py-8 text-center">
                  <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">아직 추천할 강의가 없습니다. 마켓플레이스를 둘러보고 학습을 시작해보세요!</p>
                  <Link href="/marketplace">
                    <Button className="mt-4 bg-purple-600 hover:bg-purple-700">마켓플레이스 둘러보기 <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalizedQuery.data?.recommendations?.map((item: any) => (
                  <Link key={item.id} href={`/marketplace/${item.id}`}>
                    <Card className="bg-[#1a1a2e] border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2 line-clamp-2">{item.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Badge variant="outline" className="text-xs border-gray-600">{item.category}</Badge>
                          {item.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{(item.rating / 100).toFixed(1)}</span>}
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{item.totalPurchases || 0}</span>
                        </div>
                        <p className="text-purple-400 font-bold mt-2">{formatPrice(item.price)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Trending */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            인기 강의
          </h2>
          {trendingQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
          ) : (trendingQuery.data?.length || 0) === 0 ? (
            <Card className="bg-[#1a1a2e] border-gray-800">
              <CardContent className="py-8 text-center text-gray-400">아직 등록된 강의가 없습니다.</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingQuery.data?.map((item: any) => (
                <Link key={item.id} href={`/marketplace/${item.id}`}>
                  <Card className="bg-[#1a1a2e] border-gray-800 hover:border-orange-500/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.title} className="w-full h-32 object-cover rounded-md mb-3" />}
                      <h3 className="font-medium mb-2 line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Badge variant="outline" className="text-xs border-gray-600">{item.category}</Badge>
                        {item.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{(item.rating / 100).toFixed(1)}</span>}
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{item.totalPurchases || 0}</span>
                      </div>
                      <p className="text-orange-400 font-bold mt-2">{formatPrice(item.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Learning History */}
        {user && (historyQuery.data?.length || 0) > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              최근 학습 이력
            </h2>
            <div className="space-y-2">
              {historyQuery.data?.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">강의 #{item.listingId}</p>
                    <p className="text-xs text-gray-400">진행률: {item.progressPercent}% | 학습 시간: {Math.round((item.watchTimeSec || 0) / 60)}분</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.isCompleted ? (
                      <Badge className="bg-green-500/20 text-green-400">완료</Badge>
                    ) : (
                      <Badge className="bg-blue-500/20 text-blue-400">{item.progressPercent}%</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
