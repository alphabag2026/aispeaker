import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Star, ShoppingCart, Eye, Clock, Tag, Filter, Store, TrendingUp, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

const CATEGORIES = [
  { value: "all", label: "전체" },
  { value: "web3", label: "Web3" },
  { value: "ai", label: "AI" },
  { value: "blockchain", label: "블록체인" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "metaverse", label: "메타버스" },
  { value: "programming", label: "프로그래밍" },
  { value: "business", label: "비즈니스" },
  { value: "design", label: "디자인" },
  { value: "other", label: "기타" },
];

export default function Marketplace() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const listingsQuery = trpc.marketplace.list.useQuery({
    category: category !== "all" ? category : undefined,
    search: search || undefined,
    limit: 50,
  });

  const sortedListings = useMemo(() => {
    const items = listingsQuery.data || [];
    if (sortBy === "price_low") return [...items].sort((a, b) => (a.salePriceInCents || a.priceInCents) - (b.salePriceInCents || b.priceInCents));
    if (sortBy === "price_high") return [...items].sort((a, b) => (b.salePriceInCents || b.priceInCents) - (a.salePriceInCents || a.priceInCents));
    if (sortBy === "popular") return [...items].sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0));
    if (sortBy === "rating") return [...items].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    return items;
  }, [listingsQuery.data, sortBy]);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="container max-w-7xl py-4 sm:py-8 px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            AI 강의 마켓플레이스
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto">
            전문가가 만든 AI 강의를 구매하고, 나만의 강의를 판매하세요
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
            {user && (
              <>
                <Link href="/creator-dashboard">
                  <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                    <Store className="w-4 h-4 mr-2" />크리에이터 대시보드
                  </Button>
                </Link>
                <Link href="/scorm-export">
                  <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                    <Tag className="w-4 h-4 mr-2" />SCORM 내보내기
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="강의 검색..."
              className="pl-10 bg-[#1a1a2e] border-gray-700 text-white"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[160px] bg-[#1a1a2e] border-gray-700">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-gray-700">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] bg-[#1a1a2e] border-gray-700">
              <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-gray-700">
              <SelectItem value="latest">최신순</SelectItem>
              <SelectItem value="popular">인기순</SelectItem>
              <SelectItem value="rating">평점순</SelectItem>
              <SelectItem value="price_low">가격 낮은순</SelectItem>
              <SelectItem value="price_high">가격 높은순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings Grid */}
        {listingsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="bg-[#1a1a2e] border-gray-800 animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded w-1/2" />
                  <div className="h-6 bg-gray-800 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">등록된 강의가 없습니다</h3>
            <p className="text-gray-500 text-sm mb-6">첫 번째 강의를 등록해보세요!</p>
            {user && (
              <Link href="/creator-dashboard">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />강의 등록하기
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedListings.map((listing) => (
              <Card
                key={listing.id}
                className="bg-[#1a1a2e] border-gray-800 hover:border-purple-500/30 transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/marketplace/${listing.id}`)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 relative overflow-hidden">
                  {listing.thumbnailUrl ? (
                    <img src={listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Store className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  {listing.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-orange-500/90 text-white text-xs">추천</Badge>
                  )}
                  {listing.salePriceInCents && listing.salePriceInCents < listing.priceInCents && (
                    <Badge className="absolute top-2 right-2 bg-red-500/90 text-white text-xs">
                      {Math.round((1 - listing.salePriceInCents / listing.priceInCents) * 100)}% 할인
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                      {CATEGORIES.find((c) => c.value === listing.category)?.label || listing.category}
                    </Badge>
                    {listing.acceptCrypto && (
                      <Badge variant="outline" className="text-xs border-green-600 text-green-400">Crypto</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-purple-400 transition-colors">
                    {listing.title}
                  </h3>
                  {listing.shortDescription && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{listing.shortDescription}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      {listing.salePriceInCents && listing.salePriceInCents < listing.priceInCents ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-purple-400">{formatPrice(listing.salePriceInCents)}</span>
                          <span className="text-xs text-gray-500 line-through">{formatPrice(listing.priceInCents)}</span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-purple-400">{formatPrice(listing.priceInCents)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {(listing.avgRating || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {((listing.avgRating || 0) / 100).toFixed(1)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />{listing.viewCount || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
