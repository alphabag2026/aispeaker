
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
import { useLanguage } from "@/contexts/LanguageContext";

const CATEGORIES = [
  { value: "web3", label: "Web3" },
  { value: "ai", label: "AI" },
  { value: "blockchain", label: "creatorDashboard.category.blockchain" },
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "metaverse", label: "creatorDashboard.category.metaverse" },
  { value: "programming", label: "creatorDashboard.category.programming" },
  { value: "business", label: "creatorDashboard.category.business" },
  { value: "design", label: "creatorDashboard.category.design" },
  { value: "other", label: "creatorDashboard.category.other" },
];

export default function CreatorDashboard() {
  const { t } = useLanguage();
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
      toast.success(t("creatorDashboard.toast.connectOnboardSuccess"));
      window.open(data.url, "_blank");
      connectStatusQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const requestPayoutMutation = trpc.payout.requestPayout.useMutation({
    onSuccess: (data) => {
      toast.success(t("creatorDashboard.toast.requestPayoutSuccess", { netPayout: `$${(data.netPayout / 100).toFixed(2)}` }));
      setIsPayoutDialogOpen(false);
      setPayoutAmount("");
      payoutEarningsQuery.refetch();
      payoutHistoryQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.marketplace.publish.useMutation({
    onSuccess: () => {
      toast.success(t("creatorDashboard.toast.publishSuccess"));
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
      toast.error(t("creatorDashboard.toast.titleRequired"));
      return;
    }
    if (priceInCents < 50) {
      toast.error(t("creatorDashboard.toast.minPrice"));
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
                {t("creatorDashboard.header.title")}
              </h1>
              <p className="text-gray-400 mt-1">{t("creatorDashboard.header.description")}</p>
            </div>
          </div>
          <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />{t("creatorDashboard.button.publishCourse")}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("creatorDashboard.dialog.publish.title")}</DialogTitle>
                <DialogDescription className="text-gray-400">{t("creatorDashboard.dialog.publish.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("creatorDashboard.dialog.publish.connectPipeline")}</Label>
                  <Select onValueChange={(v) => setSelectedPipelineId(Number(v))}>
                    <SelectTrigger className="bg-[#16213e] border-gray-600">
                      <SelectValue placeholder={t("creatorDashboard.dialog.publish.selectPipelinePlaceholder")} />
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
                  <Label>{t("creatorDashboard.dialog.publish.titleLabel")}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("creatorDashboard.dialog.publish.titlePlaceholder")} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="space-y-2">
                  <Label>{t("creatorDashboard.dialog.publish.shortDescriptionLabel")}</Label>
                  <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder={t("creatorDashboard.dialog.publish.shortDescriptionPlaceholder")} maxLength={255} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="space-y-2">
                  <Label>{t("creatorDashboard.dialog.publish.longDescriptionLabel")}</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("creatorDashboard.dialog.publish.longDescriptionPlaceholder")} rows={4} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("creatorDashboard.dialog.publish.categoryLabel")}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-[#16213e] border-gray-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-gray-700">
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.label)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("creatorDashboard.dialog.publish.priceLabel")}</Label>
                    <Input type="number" value={(priceInCents / 100).toFixed(2)} onChange={(e) => setPriceInCents(Math.round(Number(e.target.value) * 100))} min={0.5} step={0.01} className="bg-[#16213e] border-gray-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("creatorDashboard.dialog.publish.tagsLabel")}</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("creatorDashboard.dialog.publish.tagsPlaceholder")} className="bg-[#16213e] border-gray-600" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t("creatorDashboard.dialog.publish.acceptCryptoLabel")}</Label>
                  <Switch checked={acceptCrypto} onCheckedChange={setAcceptCrypto} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPublishOpen(false)} className="border-gray-600">{t("creatorDashboard.dialog.publish.cancelButton")}</Button>
                <Button onClick={handlePublish} disabled={publishMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                  {publishMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {t("creatorDashboard.dialog.publish.submitButton")}
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
                <p className="text-sm text-gray-400">{t("creatorDashboard.stats.totalEarnings")}</p>
                <p className="text-2xl font-bold text-green-400">{formatPrice(totalEarnings)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg"><ShoppingCart className="w-6 h-6 text-purple-400" /></div>
              <div>
                <p className="text-sm text-gray-400">{t("creatorDashboard.stats.totalSales")}</p>
                <p className="text-2xl font-bold">{totalSales}{t("creatorDashboard.stats.salesUnit")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a2e] border-gray-800">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg"><Package className="w-6 h-6 text-blue-400" /></div>
              <div>
                <p className="text-sm text-gray-400">{t("creatorDashboard.stats.listedProducts")}</p>
                <p className="text-2xl font-bold">{myListingsQuery.data?.length || 0}{t("creatorDashboard.stats.productsUnit")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Listings / Payouts */}
        <Tabs defaultValue="listings" className="mb-6">
          <TabsList className="bg-[#16213e] border-gray-700">
            <TabsTrigger value="listings">{t("creatorDashboard.tabs.myProducts")}</TabsTrigger>
            <TabsTrigger value="payouts">{t("creatorDashboard.tabs.payouts")}</TabsTrigger>
          </TabsList>

          <TabsContent value="payouts">
            <div className="space-y-4">
              {/* Connect Status */}
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    {t("creatorDashboard.payouts.connectAccount")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {connectStatusQuery.data?.status === "active" ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">{t("creatorDashboard.payouts.connected")}</span>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>
                  ) : connectStatusQuery.data?.status === "pending" ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400">{t("creatorDashboard.payouts.onboardingInProgress")}</span>
                      <Button size="sm" onClick={() => connectOnboardMutation.mutate({ returnUrl: window.location.href })} className="bg-yellow-600 hover:bg-yellow-700">
                        {t("creatorDashboard.payouts.continueOnboarding")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400">{t("creatorDashboard.payouts.connectPrompt")}</span>
                      <Button onClick={() => connectOnboardMutation.mutate({ returnUrl: window.location.href })} disabled={connectOnboardMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                        {connectOnboardMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        {t("creatorDashboard.payouts.connectButton")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Earnings Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">{t("creatorDashboard.stats.totalEarnings")}</p>
                    <p className="text-xl font-bold text-green-400">{formatPrice(payoutEarningsQuery.data?.totalEarnings || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">{t("creatorDashboard.payouts.availableBalance")}</p>
                    <p className="text-xl font-bold text-blue-400">{formatPrice(payoutEarningsQuery.data?.availableBalance || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">{t("creatorDashboard.payouts.pendingPayouts")}</p>
                    <p className="text-xl font-bold text-yellow-400">{formatPrice(payoutEarningsQuery.data?.pendingPayouts || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a1a2e] border-gray-800">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400">{t("creatorDashboard.payouts.completedPayouts")}</p>
                    <p className="text-xl font-bold text-gray-300">{formatPrice(payoutEarningsQuery.data?.completedPayouts || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payout Request */}
              <Card className="bg-[#1a1a2e] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{t("creatorDashboard.payouts.requestPayout")}</CardTitle>
                  <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" disabled={connectStatusQuery.data?.status !== "active" || (payoutEarningsQuery.data?.availableBalance || 0) < 1000} className="bg-green-600 hover:bg-green-700">
                        <ArrowUpRight className="w-4 h-4 mr-1" />{t("creatorDashboard.payouts.requestPayoutButton")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>{t("creatorDashboard.dialog.payout.title")}</DialogTitle>
                        <DialogDescription className="text-gray-400">{t("creatorDashboard.dialog.payout.description", { balance: formatPrice(payoutEarningsQuery.data?.availableBalance || 0) })}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t("creatorDashboard.dialog.payout.amountLabel")}</Label>
                          <Input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder={t("creatorDashboard.dialog.payout.amountPlaceholder")} min={10} step={0.01} className="bg-[#16213e] border-gray-600" />
                        </div>
                        {payoutAmount && Number(payoutAmount) >= 10 && (
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>{t("creatorDashboard.dialog.payout.requestedAmount", { amount: `$${Number(payoutAmount).toFixed(2)}` })}</p>
                            <p>{t("creatorDashboard.dialog.payout.platformFee", { fee: `-$${(Number(payoutAmount) * 0.2).toFixed(2)}` })}</p>
                            <p className="text-green-400 font-medium">{t("creatorDashboard.dialog.payout.netPayout", { amount: `$${(Number(payoutAmount) * 0.8).toFixed(2)}` })}</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)} className="border-gray-600">{t("creatorDashboard.dialog.publish.cancelButton")}</Button>
                        <Button onClick={() => requestPayoutMutation.mutate({ amountInCents: Math.round(Number(payoutAmount) * 100) })} disabled={requestPayoutMutation.isPending || !payoutAmount || Number(payoutAmount) < 10} className="bg-green-600 hover:bg-green-700">
                          {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          {t("creatorDashboard.payouts.requestPayoutButton")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {payoutHistoryQuery.isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
                  ) : (payoutHistoryQuery.data?.length || 0) === 0 ? (
                    <p className="text-gray-500 text-center py-4">{t("creatorDashboard.payouts.history.noPayouts")}</p>
                  ) : (
                    <div className="space-y-2">
                      {payoutHistoryQuery.data?.map((payout: any) => (
                        <div key={payout.id} className="flex items-center justify-between p-3 bg-[#16213e] rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{t("creatorDashboard.payouts.history.payout", { amount: formatPrice(payout.netPayoutInCents) })}</p>
                            <p className="text-xs text-gray-400">{new Date(payout.requestedAt).toLocaleDateString("ko-KR")}</p>
                          </div>
                          <Badge className={payout.status === "completed" ? "bg-green-500/20 text-green-400" : payout.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : payout.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}>
                            {payout.status === "completed" ? t("creatorDashboard.payouts.history.status.completed") : payout.status === "pending" ? t("creatorDashboard.payouts.history.status.pending") : payout.status === "processing" ? t("creatorDashboard.payouts.history.status.processing") : payout.status === "failed" ? t("creatorDashboard.payouts.history.status.failed") : payout.status}
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
            <CardTitle className="text-lg">{t("creatorDashboard.listings.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {myListingsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
            ) : (myListingsQuery.data?.length || 0) === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">{t("creatorDashboard.listings.noProducts")}</p>
                <Button onClick={() => setIsPublishOpen(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />{t("creatorDashboard.listings.publishFirstCourse")}
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
                        {listing.status === "active" ? t("creatorDashboard.listings.status.active") : listing.status === "draft" ? t("creatorDashboard.listings.status.draft") : listing.status}
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
