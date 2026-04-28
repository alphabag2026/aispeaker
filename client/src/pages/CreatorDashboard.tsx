import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Store, DollarSign, ShoppingCart, TrendingUp, Plus, ArrowLeft, Loader2, Eye, Star, Package, Edit, Wallet, CreditCard, ArrowUpRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  { value: "other", label: "기타" },
];

export default function CreatorDashboard() {
  const { user } = useAuth();
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priceInCents, setPriceInCents] = useState(999);
  const [tags, setTags] = useState("");
  const [acceptCrypto, setAcceptCrypto] = useState(false);

  const [payoutAmount, setPayoutAmount] = useState("");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);

  const myListingsQuery = trpc.marketplace.myListings.useQuery(undefined, { enabled: !!user });
  const earningsQuery = trpc.marketplace.earnings.useQuery(undefined, { enabled: !!user });
  const pipelinesQuery = trpc.pipeline.list.useQuery(undefined, { enabled: !!user });
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | undefined>();

  // Stripe Connect
  const connectStatusQuery = trpc.payout.connectStatus.useQuery(undefined, { enabled: !!user });
  const payoutEarningsQuery = trpc.payout.earnings.useQuery(undefined, { enabled: !!user });
  const payoutHistoryQuery = trpc.payout.payoutHistory.useQuery(undefined, { enabled: !!user });
  const connectOnboardMutation = trpc.payout.connectOnboard.useMutation({
    onSuccess: (data) => {
      toast.success("Stripe Connect 온보딩 페이지로 이동합니다.");
      window.open(data.url, "_blank");
      connectStatusQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const requestPayoutMutation = trpc.payout.requestPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`출금 요청 완료! 순 지급액: $${(data.netPayout / 100).toFixed(2)} (수수료 20%)`);
      setIsPayoutDialogOpen(false);
      setPayoutAmount("");
      payoutEarningsQuery.refetch();
      payoutHistoryQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.marketplace.publish.useMutation({
    onSuccess: () => {
      toast.success("강의가 마켓플레이스에 등록되었습니다!");
      setIsPublishOpen(false);
      myListingsQuery.refetch();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setShortDescription("");
    setCategory("other");
    setPriceInCents(999);
    setTags("");
    setAcceptCrypto(false);
    setSelectedPipelineId(undefined);
  };

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (priceInCents < 50) {
      toast.error("최소 가격은 $0.50입니다.");
      return;
    }
    publishMutation.mutate({
      pipelineId: selectedPipelineId,
      title: title.trim(),
      description,
      shortDescription,
      category: category as any,
      priceInCents,
      tags,
      acceptCrypto,
    });
  };

  const completedPipelines = (pipelinesQuery.data || []).filter((p: any) => {
    const status = p.pipeline?.status || p.status;
    return status === "completed";
  });

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const totalEarnings = earningsQuery.data?.total || 0;
  const totalSales = earningsQuery.data?.count || 0;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="container max-w-6xl py-4 sm:py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link href="/marketplace">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Store className="w-7 h-7 text-purple-400" />
                크리에이터 대시보드
              </h1>
              <p className="text-gray-400 mt-1">내 강의를 관리하고 수익을 확인하세요</p>
            </div>
          </div>
          <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />강의 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 강의 등록</DialogTitle>
                <DialogDescription className="text-gray-400">마켓플레이스에 강의를 등록합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>파이프라인 연결 (선택)</Label>
                  <Select onValueChange={(v) => setSelectedPipelineId(Number(v))}>
                    <SelectTrigger className="bg-[#16213e] border-gray-600">
                      <SelectValue placeholder="파이프라인 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-gray-700">
                      {completedPipelines.map((p: any) => {
                        const pid = p.pipeline?.id || p.id;
                        const ptitle = p.pipeline?.title || p.title;
                        return <SelectItem key={pid} value={String(pid)}>{ptitle}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>제목 *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="강의 제목" className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="space-y-2">
                  <Label>짧은 설명</Label>
                  <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="카드에 표시될 짧은 설명" maxLength={255} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="space-y-2">
                  <Label>상세 설명</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="강의 상세 설명" rows={4} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>카테고리</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-[#16213e] border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-gray-700">
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>가격 (USD)</Label>
                    <Input type="number" value={(priceInCents / 100).toFixed(2)} onChange={(e) => setPriceInCents(Math.round(Number(e.target.value) * 100))} min={0.5} step={0.01} className="bg-[#16213e] border-gray-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>태그 (쉼표 구분)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="web3, blockchain, defi" className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>암호화폐 결제 허용</Label>
                  <Switch checked={acceptCrypto} onCheckedChange={setAcceptCrypto} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPublishOpen(false)} className="border-gray-600">취소</Button>
                <Button onClick={handlePublish} disabled={publishMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                  {publishMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  등록
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg"><DollarSign className="w-6 h-6 text-green-400" /></div>
              <div>
                <p className="text-sm text-gray-400">총 수익</p>
                <p className="text-2xl font-bold text-green-400">{formatPrice(totalEarnings)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg"><ShoppingCart className="w-6 h-6 text-purple-400" /></div>
              <div>
                <p className="text-sm text-gray-400">총 판매</p>
                <p className="text-2xl font-bold">{totalSales}건</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg"><Package className="w-6 h-6 text-blue-400" /></div>
              <div>
                <p className="text-sm text-gray-400">등록 상품</p>
                <p className="text-2xl font-bold">{myListingsQuery.data?.length || 0}개</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Listings / Payouts */}
        <Tabs defaultValue="listings" className="mb-6">
          <TabsList className="bg-[#16213e] border-gray-700">
            <TabsTrigger value="listings">내 상품</TabsTrigger>
            <TabsTrigger value="payouts">정산/출금</TabsTrigger>
          </TabsList>

          <TabsContent value="payouts">
            <div className="space-y-4">
              {/* Connect Status */}
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    Stripe Connect 계정
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {connectStatusQuery.data?.status === "active" ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">연결됨</span>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>
                  ) : connectStatusQuery.data?.status === "pending" ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400">온보딩 진행 중...</span>
                      <Button size="sm" onClick={() => connectOnboardMutation.mutate({ returnUrl: window.location.href })} className="bg-yellow-600 hover:bg-yellow-700">
                        온보딩 계속하기
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400">Stripe Connect 계정을 연결하면 수익을 출금할 수 있습니다.</span>
                      <Button onClick={() => connectOnboardMutation.mutate({ returnUrl: window.location.href })} disabled={connectOnboardMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                        {connectOnboardMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        계정 연결하기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Earnings Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">총 수익</p>
                    <p className="text-xl font-bold text-green-400">{formatPrice(payoutEarningsQuery.data?.totalEarnings || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">출금 가능</p>
                    <p className="text-xl font-bold text-blue-400">{formatPrice(payoutEarningsQuery.data?.availableBalance || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">출금 대기중</p>
                    <p className="text-xl font-bold text-yellow-400">{formatPrice(payoutEarningsQuery.data?.pendingPayouts || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">출금 완료</p>
                    <p className="text-xl font-bold text-gray-300">{formatPrice(payoutEarningsQuery.data?.completedPayouts || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payout Request */}
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">출금 요청</CardTitle>
                  <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" disabled={connectStatusQuery.data?.status !== "active" || (payoutEarningsQuery.data?.availableBalance || 0) < 1000} className="bg-green-600 hover:bg-green-700">
                        <ArrowUpRight className="w-4 h-4 mr-1" />출금 신청
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>출금 신청</DialogTitle>
                        <DialogDescription className="text-gray-400">출금 가능 잔액: {formatPrice(payoutEarningsQuery.data?.availableBalance || 0)} (최소 $10.00, 수수료 20%)</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>출금 금액 (USD)</Label>
                          <Input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="10.00" min={10} step={0.01} className="bg-[#16213e] border-gray-600" />
                        </div>
                        {payoutAmount && Number(payoutAmount) >= 10 && (
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>요청 금액: ${Number(payoutAmount).toFixed(2)}</p>
                            <p>플랫폼 수수료 (20%): -${(Number(payoutAmount) * 0.2).toFixed(2)}</p>
                            <p className="text-green-400 font-medium">순 지급액: ${(Number(payoutAmount) * 0.8).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)} className="border-gray-600">취소</Button>
                        <Button onClick={() => requestPayoutMutation.mutate({ amountInCents: Math.round(Number(payoutAmount) * 100) })} disabled={requestPayoutMutation.isPending || !payoutAmount || Number(payoutAmount) < 10} className="bg-green-600 hover:bg-green-700">
                          {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          출금 신청
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {payoutHistoryQuery.isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
                  ) : (payoutHistoryQuery.data?.length || 0) === 0 ? (
                    <p className="text-gray-500 text-center py-4">출금 내역이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {payoutHistoryQuery.data?.map((payout: any) => (
                        <div key={payout.id} className="flex items-center justify-between p-3 bg-[#16213e] rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{formatPrice(payout.netPayoutInCents)} 출금</p>
                            <p className="text-xs text-gray-400">{new Date(payout.requestedAt).toLocaleDateString("ko-KR")}</p>
                          </div>
                          <Badge className={payout.status === "completed" ? "bg-green-500/20 text-green-400" : payout.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : payout.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}>
                            {payout.status === "completed" ? "완료" : payout.status === "pending" ? "대기" : payout.status === "processing" ? "처리중" : payout.status === "failed" ? "실패" : payout.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="listings">
        <Card className="bg-[#1a1a2e] border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">내 등록 상품</CardTitle>
          </CardHeader>
          <CardContent>
            {myListingsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : (myListingsQuery.data?.length || 0) === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">아직 등록한 상품이 없습니다.</p>
                <Button onClick={() => setIsPublishOpen(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />첫 강의 등록하기
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myListingsQuery.data?.map((listing) => (
                  <div key={listing.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-[#16213e] rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-10 bg-purple-900/30 rounded flex items-center justify-center">
                        <Store className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{listing.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <Badge variant="outline" className="text-xs border-gray-600">{listing.category}</Badge>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.viewCount || 0}</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{listing.totalPurchases || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-purple-400">{formatPrice(listing.priceInCents)}</span>
                      <Badge className={listing.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                        {listing.status === "active" ? "판매중" : listing.status === "draft" ? "초안" : listing.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
