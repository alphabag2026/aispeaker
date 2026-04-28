import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, ShoppingCart, ArrowLeft, Eye, Clock, User, CheckCircle, Loader2, Play } from "lucide-react";
import { Link, useParams } from "wouter";

export default function MarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const listingId = Number(id);

  const listingQuery = trpc.marketplace.get.useQuery({ id: listingId }, { enabled: !!listingId });
  const reviewsQuery = trpc.marketplace.reviews.useQuery({ listingId }, { enabled: !!listingId });
  const hasPurchasedQuery = trpc.marketplace.hasPurchased.useQuery({ listingId }, { enabled: !!user && !!listingId });

  const purchaseMutation = trpc.marketplace.purchase.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.success("결제 페이지로 이동합니다.");
        window.open(data.checkoutUrl, "_blank");
      } else {
        toast.success("구매가 완료되었습니다.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const listing = listingQuery.data;
  if (listingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center text-gray-400">
        상품을 찾을 수 없습니다.
      </div>
    );
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const effectivePrice = listing.salePriceInCents && listing.salePriceInCents < listing.priceInCents ? listing.salePriceInCents : listing.priceInCents;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="container max-w-5xl py-4 sm:py-8 px-4 sm:px-6">
        <Link href="/marketplace">
          <Button variant="ghost" className="text-gray-400 hover:text-white mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />마켓플레이스로 돌아가기
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video/Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl overflow-hidden relative">
              {listing.previewVideoUrl ? (
                <video controls className="w-full h-full object-cover" src={listing.previewVideoUrl} />
              ) : listing.thumbnailUrl ? (
                <img src={listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="w-16 h-16 text-gray-600" />
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="border-gray-600 text-gray-400">{listing.category}</Badge>
                {listing.acceptCrypto && <Badge variant="outline" className="border-green-600 text-green-400">Crypto</Badge>}
                {listing.language && <Badge variant="outline" className="border-blue-600 text-blue-400">{listing.language}</Badge>}
              </div>
              <h1 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{listing.viewCount || 0} 조회</span>
                <span className="flex items-center gap-1"><ShoppingCart className="w-4 h-4" />{listing.totalPurchases || 0} 구매</span>
                {(listing.durationSec || 0) > 0 && (
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{Math.round((listing.durationSec || 0) / 60)}분</span>
                )}
                {(listing.avgRating || 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {((listing.avgRating || 0) / 100).toFixed(1)} ({listing.reviewCount}개 리뷰)
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-3">강의 소개</h2>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{listing.description}</div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {listing.tags && (
              <div className="flex flex-wrap gap-2">
                {listing.tags.split(",").map((tag, i) => (
                  <Badge key={i} variant="outline" className="border-gray-700 text-gray-400">#{tag.trim()}</Badge>
                ))}
              </div>
            )}

            {/* Reviews */}
            <Card className="bg-[#1a1a2e] border-gray-800">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">리뷰 ({reviewsQuery.data?.length || 0})</h2>
                {(reviewsQuery.data?.length || 0) === 0 ? (
                  <p className="text-gray-500 text-sm">아직 리뷰가 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {reviewsQuery.data?.map((review) => (
                      <div key={review.id} className="border-b border-gray-800 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
                            ))}
                          </div>
                          {review.title && <span className="font-medium text-sm">{review.title}</span>}
                        </div>
                        {review.content && <p className="text-sm text-gray-400">{review.content}</p>}
                        <span className="text-xs text-gray-600 mt-1 block">{new Date(review.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Purchase */}
          <div className="space-y-4">
            <Card className="bg-[#1a1a2e] border-gray-800 lg:sticky lg:top-8">
              <CardContent className="p-6 space-y-4">
                <div>
                  {listing.salePriceInCents && listing.salePriceInCents < listing.priceInCents ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-purple-400">{formatPrice(listing.salePriceInCents)}</span>
                      <span className="text-lg text-gray-500 line-through">{formatPrice(listing.priceInCents)}</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {Math.round((1 - listing.salePriceInCents / listing.priceInCents) * 100)}% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-purple-400">{formatPrice(listing.priceInCents)}</span>
                  )}
                </div>

                {hasPurchasedQuery.data ? (
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">이미 구매한 강의입니다</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-base"
                      onClick={() => purchaseMutation.mutate({ listingId, paymentMethod: "stripe" })}
                      disabled={purchaseMutation.isPending || !user}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 mr-2" />
                      )}
                      카드 결제
                    </Button>
                    {listing.acceptCrypto && (
                      <Button
                        variant="outline"
                        className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 h-12"
                        onClick={() => purchaseMutation.mutate({ listingId, paymentMethod: "crypto" })}
                        disabled={purchaseMutation.isPending || !user}
                      >
                        암호화폐 결제
                      </Button>
                    )}
                    {!user && (
                      <p className="text-xs text-gray-500 text-center">구매하려면 로그인이 필요합니다.</p>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-800 pt-4 space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between"><span>판매자 ID</span><span>#{listing.sellerId}</span></div>
                  <div className="flex justify-between"><span>등록일</span><span>{new Date(listing.createdAt).toLocaleDateString("ko-KR")}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
