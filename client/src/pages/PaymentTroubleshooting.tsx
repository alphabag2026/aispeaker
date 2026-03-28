import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowLeft,
  Wallet,
  Clock,
  Ban,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface TroubleshootItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  symptoms: string[];
  solutions: string[];
  severity: "low" | "medium" | "high";
}

const stripeIssues: TroubleshootItem[] = [
  {
    id: "card-declined",
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    title: "카드가 거절되었습니다 (Card Declined)",
    symptoms: [
      "결제 시 'Your card was declined' 메시지 표시",
      "결제 버튼 클릭 후 에러 화면으로 돌아옴",
      "카드 정보 입력 후 승인 실패",
    ],
    solutions: [
      "테스트 환경에서는 테스트 카드 번호를 사용하세요: 4242 4242 4242 4242",
      "만료일은 미래 날짜(예: 12/30), CVC는 아무 3자리(예: 123)를 입력하세요",
      "실제 카드 사용 시 카드사에 해외 결제가 차단되어 있지 않은지 확인하세요",
      "카드 한도를 초과하지 않았는지 확인하세요",
      "3D Secure 인증이 필요한 경우 카드사 앱에서 승인해주세요",
    ],
    severity: "high",
  },
  {
    id: "checkout-not-loading",
    icon: <Monitor className="w-5 h-5 text-orange-500" />,
    title: "결제 페이지가 로딩되지 않습니다",
    symptoms: [
      "결제 버튼 클릭 후 빈 화면 또는 무한 로딩",
      "Stripe 체크아웃 페이지가 열리지 않음",
      "새 탭이 열리지만 에러 표시",
    ],
    solutions: [
      "팝업 차단기가 활성화되어 있다면 이 사이트를 허용 목록에 추가하세요",
      "브라우저의 JavaScript가 활성화되어 있는지 확인하세요",
      "시크릿/프라이빗 모드에서 시도해보세요",
      "다른 브라우저(Chrome, Firefox, Edge)에서 시도해보세요",
      "VPN이나 프록시를 사용 중이라면 일시적으로 비활성화해보세요",
    ],
    severity: "medium",
  },
  {
    id: "payment-pending",
    icon: <Clock className="w-5 h-5 text-yellow-500" />,
    title: "결제 완료 후 구독이 활성화되지 않습니다",
    symptoms: [
      "결제는 성공했지만 플랜이 변경되지 않음",
      "크레딧이 충전되지 않음",
      "결제 내역에는 표시되지만 서비스 이용 불가",
    ],
    solutions: [
      "결제 처리에 최대 1~2분이 소요될 수 있습니다. 잠시 기다린 후 페이지를 새로고침하세요",
      "로그아웃 후 다시 로그인하면 구독 상태가 갱신됩니다",
      "문제가 지속되면 결제 내역 페이지에서 결제 ID를 확인하고 고객지원에 문의하세요",
      "Stripe 대시보드에서 결제 상태를 직접 확인할 수 있습니다",
    ],
    severity: "medium",
  },
  {
    id: "duplicate-charge",
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    title: "중복 결제가 발생했습니다",
    symptoms: [
      "같은 금액이 두 번 이상 청구됨",
      "결제 내역에 동일한 항목이 여러 개 표시",
    ],
    solutions: [
      "결제 버튼을 여러 번 클릭하지 마세요. 처리 중에는 버튼이 비활성화됩니다",
      "중복 결제가 확인되면 자동으로 환불 처리됩니다 (영업일 기준 3~5일 소요)",
      "즉시 환불이 필요하면 결제 내역의 결제 ID와 함께 고객지원에 문의하세요",
    ],
    severity: "high",
  },
  {
    id: "subscription-cancel",
    icon: <Ban className="w-5 h-5 text-gray-500" />,
    title: "구독 취소/변경이 되지 않습니다",
    symptoms: [
      "구독 취소 버튼이 작동하지 않음",
      "플랜 변경 후 이전 플랜이 계속 청구됨",
    ],
    solutions: [
      "구독 취소는 현재 결제 주기가 끝날 때 적용됩니다. 즉시 해지가 아닙니다",
      "플랜 업그레이드는 즉시 적용되며, 남은 기간에 대한 비례 금액이 청구됩니다",
      "다운그레이드는 다음 결제 주기부터 적용됩니다",
      "'내 구독' 페이지에서 구독 상태와 다음 결제일을 확인하세요",
    ],
    severity: "low",
  },
  {
    id: "currency-issue",
    icon: <Globe className="w-5 h-5 text-blue-500" />,
    title: "통화/환율 관련 문제",
    symptoms: [
      "예상과 다른 금액이 청구됨",
      "원화(KRW)로 결제하고 싶은데 달러(USD)로만 표시됨",
    ],
    solutions: [
      "모든 가격은 USD(미국 달러) 기준입니다",
      "카드사에서 자동으로 현지 통화로 환산하여 청구합니다",
      "환율은 카드사 기준이며, 해외 결제 수수료(1~3%)가 추가될 수 있습니다",
      "정확한 청구 금액은 카드 명세서에서 확인하세요",
    ],
    severity: "low",
  },
];

const testCardInfo = [
  { type: "성공 테스트", number: "4242 4242 4242 4242", desc: "정상 결제 승인" },
  { type: "3D Secure", number: "4000 0025 0000 3155", desc: "3D Secure 인증 필요" },
  { type: "결제 거절", number: "4000 0000 0000 0002", desc: "카드 거절 테스트" },
  { type: "잔액 부족", number: "4000 0000 0000 9995", desc: "잔액 부족 거절" },
];

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels = { low: "낮음", medium: "보통", high: "높음" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity as keyof typeof colors]}`}>
      {labels[severity as keyof typeof labels]}
    </span>
  );
}

export default function PaymentTroubleshooting() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());


  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyCardNumber = (number: string) => {
    navigator.clipboard.writeText(number.replace(/\s/g, ""));
    toast.success("카드 번호가 클립보드에 복사되었습니다.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" /> 요금제로 돌아가기
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">결제 문제 해결 가이드</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            결제 과정에서 문제가 발생했나요? 아래 가이드를 참고하여 대부분의 문제를 직접 해결할 수 있습니다.
          </p>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              빠른 해결 방법
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors text-left"
              >
                <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="font-medium text-sm">페이지 새로고침</p>
                  <p className="text-xs text-muted-foreground">일시적 오류 해결</p>
                </div>
              </button>
              <Link href="/payment-history">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <CreditCard className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">결제 내역 확인</p>
                    <p className="text-xs text-muted-foreground">결제 상태 조회</p>
                  </div>
                </div>
              </Link>
              <Link href="/my-subscription">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <Wallet className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">구독 상태 확인</p>
                    <p className="text-xs text-muted-foreground">현재 플랜 조회</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Test Card Info */}
        <Card className="mb-8 border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-yellow-400" />
              테스트 카드 정보 (샌드박스 환경)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              테스트 환경에서는 아래 카드 번호를 사용하세요. 만료일은 미래 날짜, CVC는 아무 3자리를 입력하면 됩니다.
            </p>
            <div className="space-y-3">
              {testCardInfo.map((card) => (
                <div
                  key={card.type}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                      {card.type}
                    </span>
                    <code className="text-sm font-mono text-foreground">{card.number}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{card.desc}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCardNumber(card.number)}
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * 만료일 예시: 12/30 | CVC 예시: 123 | 우편번호: 아무 5자리
            </p>
          </CardContent>
        </Card>

        {/* Troubleshooting Items */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            카드 결제 문제 해결
          </h2>
          <div className="space-y-3">
            {stripeIssues.map((item) => (
              <Card
                key={item.id}
                className={`transition-all cursor-pointer ${
                  expandedItems.has(item.id) ? "border-cyan-500/30" : "border-border/50"
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium text-foreground">{item.title}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {expandedItems.has(item.id) && (
                    <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <h4 className="text-sm font-semibold text-red-400 mb-2">증상</h4>
                        <ul className="space-y-1">
                          {item.symptoms.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-2">해결 방법</h4>
                        <ul className="space-y-1">
                          {item.solutions.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Crypto Payment Issues */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            암호화폐 결제 문제 해결
          </h2>
          <div className="space-y-3">
            {[
              {
                title: "전송한 금액이 정확한데 확인이 안 됩니다",
                content:
                  "블록체인 네트워크 컨펌에 시간이 소요됩니다. ERC20/BEP20은 약 3~5분, TRC20은 약 1~3분, BTC는 약 10~60분이 소요됩니다. 30분 이내에 확인되지 않으면 트랜잭션 해시(TxHash)와 함께 고객지원에 문의하세요.",
              },
              {
                title: "잘못된 네트워크로 전송했습니다",
                content:
                  "예를 들어 ERC20 주소로 TRC20 토큰을 보낸 경우, 복구가 불가능할 수 있습니다. 전송 전 반드시 네트워크를 확인하세요. 잘못 전송한 경우 트랜잭션 해시와 함께 즉시 고객지원에 문의하세요.",
              },
              {
                title: "결제 시간이 만료되었습니다",
                content:
                  "암호화폐 결제는 30분 이내에 완료해야 합니다. 만료된 경우 새로운 결제를 생성하세요. 이미 전송한 경우 트랜잭션 해시와 함께 고객지원에 문의하면 수동으로 확인해드립니다.",
              },
            ].map((item, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleItem(`crypto-${i}`)}
                  >
                    <span className="font-medium text-foreground">{item.title}</span>
                    {expandedItems.has(`crypto-${i}`) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  {expandedItems.has(`crypto-${i}`) && (
                    <p className="mt-3 text-sm text-muted-foreground">{item.content}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Still Need Help */}
        <Card className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
          <CardContent className="p-6 text-center">
            <HelpCircle className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">여전히 문제가 해결되지 않나요?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              위 가이드로 해결되지 않는 경우, 아래 정보를 포함하여 고객지원에 문의해주세요.
            </p>
            <div className="bg-background/50 rounded-lg p-4 text-left mb-4 max-w-md mx-auto">
              <p className="text-sm font-medium mb-2">문의 시 포함할 정보:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. 결제 ID 또는 트랜잭션 해시</li>
                <li>2. 결제 시도 일시</li>
                <li>3. 사용한 결제 수단 (카드/암호화폐)</li>
                <li>4. 에러 메시지 스크린샷</li>
                <li>5. 사용 중인 브라우저 및 기기 정보</li>
              </ul>
            </div>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
              고객지원 문의하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
