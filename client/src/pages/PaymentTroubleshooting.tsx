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
import { useTranslation } from "@/contexts/LanguageContext";

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
    title: "pt.stripeIssues.cardDeclined.title",
    symptoms: [
      "pt.stripeIssues.cardDeclined.symptom1",
      "pt.stripeIssues.cardDeclined.symptom2",
      "pt.stripeIssues.cardDeclined.symptom3",
    ],
    solutions: [
      "pt.stripeIssues.cardDeclined.solution1",
      "pt.stripeIssues.cardDeclined.solution2",
      "pt.stripeIssues.cardDeclined.solution3",
      "pt.stripeIssues.cardDeclined.solution4",
      "pt.stripeIssues.cardDeclined.solution5",
    ],
    severity: "high",
  },
  {
    id: "checkout-not-loading",
    icon: <Monitor className="w-5 h-5 text-orange-500" />,
    title: "pt.stripeIssues.checkoutNotLoading.title",
    symptoms: [
      "pt.stripeIssues.checkoutNotLoading.symptom1",
      "pt.stripeIssues.checkoutNotLoading.symptom2",
      "pt.stripeIssues.checkoutNotLoading.symptom3",
    ],
    solutions: [
      "pt.stripeIssues.checkoutNotLoading.solution1",
      "pt.stripeIssues.checkoutNotLoading.solution2",
      "pt.stripeIssues.checkoutNotLoading.solution3",
      "pt.stripeIssues.checkoutNotLoading.solution4",
      "pt.stripeIssues.checkoutNotLoading.solution5",
    ],
    severity: "medium",
  },
  {
    id: "payment-pending",
    icon: <Clock className="w-5 h-5 text-yellow-500" />,
    title: "pt.stripeIssues.paymentPending.title",
    symptoms: [
      "pt.stripeIssues.paymentPending.symptom1",
      "pt.stripeIssues.paymentPending.symptom2",
      "pt.stripeIssues.paymentPending.symptom3",
    ],
    solutions: [
      "pt.stripeIssues.paymentPending.solution1",
      "pt.stripeIssues.paymentPending.solution2",
      "pt.stripeIssues.paymentPending.solution3",
      "pt.stripeIssues.paymentPending.solution4",
    ],
    severity: "medium",
  },
  {
    id: "duplicate-charge",
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    title: "pt.stripeIssues.duplicateCharge.title",
    symptoms: [
      "pt.stripeIssues.duplicateCharge.symptom1",
      "pt.stripeIssues.duplicateCharge.symptom2",
    ],
    solutions: [
      "pt.stripeIssues.duplicateCharge.solution1",
      "pt.stripeIssues.duplicateCharge.solution2",
      "pt.stripeIssues.duplicateCharge.solution3",
    ],
    severity: "high",
  },
  {
    id: "subscription-cancel",
    icon: <Ban className="w-5 h-5 text-gray-500" />,
    title: "pt.stripeIssues.subscriptionCancel.title",
    symptoms: [
      "pt.stripeIssues.subscriptionCancel.symptom1",
      "pt.stripeIssues.subscriptionCancel.symptom2",
    ],
    solutions: [
      "pt.stripeIssues.subscriptionCancel.solution1",
      "pt.stripeIssues.subscriptionCancel.solution2",
      "pt.stripeIssues.subscriptionCancel.solution3",
      "pt.stripeIssues.subscriptionCancel.solution4",
    ],
    severity: "low",
  },
  {
    id: "currency-issue",
    icon: <Globe className="w-5 h-5 text-blue-500" />,
    title: "pt.stripeIssues.currencyIssue.title",
    symptoms: [
      "pt.stripeIssues.currencyIssue.symptom1",
      "pt.stripeIssues.currencyIssue.symptom2",
    ],
    solutions: [
      "pt.stripeIssues.currencyIssue.solution1",
      "pt.stripeIssues.currencyIssue.solution2",
      "pt.stripeIssues.currencyIssue.solution3",
      "pt.stripeIssues.currencyIssue.solution4",
    ],
    severity: "low",
  },
];

const testCardInfo = [
  { type: "pt.testCardInfo.success.type", number: "4242 4242 4242 4242", desc: "pt.testCardInfo.success.desc" },
  { type: "pt.testCardInfo.3ds.type", number: "4000 0025 0000 3155", desc: "pt.testCardInfo.3ds.desc" },
  { type: "pt.testCardInfo.declined.type", number: "4000 0000 0000 0002", desc: "pt.testCardInfo.declined.desc" },
  { type: "pt.testCardInfo.insufficient.type", number: "4000 0000 0000 9995", desc: "pt.testCardInfo.insufficient.desc" },
];

interface FailScenario {
  id: string;
  cardNumber: string;
  scenario: string;
  errorMessage: string;
  description: string;
  resolution: string;
  badgeColor: string;
}

const failureScenarios: FailScenario[] = [
  {
    id: "generic-decline",
    cardNumber: "4000 0000 0000 0002",
    scenario: "pt.failureScenarios.genericDecline.scenario",
    errorMessage: "Your card was declined.",
    description: "pt.failureScenarios.genericDecline.description",
    resolution: "pt.failureScenarios.genericDecline.resolution",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    id: "insufficient-funds",
    cardNumber: "4000 0000 0000 9995",
    scenario: "pt.failureScenarios.insufficientFunds.scenario",
    errorMessage: "Your card has insufficient funds.",
    description: "pt.failureScenarios.insufficientFunds.description",
    resolution: "pt.failureScenarios.insufficientFunds.resolution",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    id: "lost-card",
    cardNumber: "4000 0000 0000 9987",
    scenario: "pt.failureScenarios.lostCard.scenario",
    errorMessage: "Your card was declined.",
    description: "pt.failureScenarios.lostCard.description",
    resolution: "pt.failureScenarios.lostCard.resolution",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    id: "stolen-card",
    cardNumber: "4000 0000 0000 9979",
    scenario: "pt.failureScenarios.stolenCard.scenario",
    errorMessage: "Your card was declined.",
    description: "pt.failureScenarios.stolenCard.description",
    resolution: "pt.failureScenarios.stolenCard.resolution",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    id: "expired-card",
    cardNumber: "4000 0000 0000 0069",
    scenario: "pt.failureScenarios.expiredCard.scenario",
    errorMessage: "Your card has expired.",
    description: "pt.failureScenarios.expiredCard.description",
    resolution: "pt.failureScenarios.expiredCard.resolution",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  {
    id: "incorrect-cvc",
    cardNumber: "4000 0000 0000 0127",
    scenario: "pt.failureScenarios.incorrectCvc.scenario",
    errorMessage: "Your card's security code is incorrect.",
    description: "pt.failureScenarios.incorrectCvc.description",
    resolution: "pt.failureScenarios.incorrectCvc.resolution",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  {
    id: "processing-error",
    cardNumber: "4000 0000 0000 0119",
    scenario: "pt.failureScenarios.processingError.scenario",
    errorMessage: "An error occurred while processing your card. Try again.",
    description: "pt.failureScenarios.processingError.description",
    resolution: "pt.failureScenarios.processingError.resolution",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    id: "3ds-auth-fail",
    cardNumber: "4000 0084 0000 1629",
    scenario: "pt.failureScenarios.3dsAuthFail.scenario",
    errorMessage: "We are unable to authenticate your payment method.",
    description: "pt.failureScenarios.3dsAuthFail.description",
    resolution: "pt.failureScenarios.3dsAuthFail.resolution",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
];

function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useTranslation();
  const labels: { [key: string]: string } = { low: t("pt.severity.low"), medium: t("pt.severity.medium"), high: t("pt.severity.high") };
  const colors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity as keyof typeof colors]}`}>
      {labels[severity as keyof typeof labels]}
    </span>
  );
}

export default function PaymentTroubleshooting() {
  const { t } = useTranslation();
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
    toast.success(t("pt.copySuccess"));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" /> {t("pt.backToPricing")}
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">{t("pt.title")}</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {t("pt.subtitle")}
          </p>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              {t("pt.quickActions.title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors text-left"
              >
                <RefreshCw className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("pt.quickActions.reload.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("pt.quickActions.reload.desc")}</p>
                </div>
              </button>
              <Link href="/payment-history">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <CreditCard className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("pt.quickActions.history.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("pt.quickActions.history.desc")}</p>
                  </div>
                </div>
              </Link>
              <Link href="/subscription">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                  <Wallet className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("pt.quickActions.subscription.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("pt.quickActions.subscription.desc")}</p>
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
              {t("pt.testCardInfo.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("pt.testCardInfo.description")}
            </p>
            <div className="space-y-3">
              {testCardInfo.map((card) => (
                <div
                  key={card.type}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                      {t(card.type)}
                    </span>
                    <code className="text-sm font-mono text-foreground">{card.number}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{t(card.desc)}</span>
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
              {t("pt.testCardInfo.note")}
            </p>
          </CardContent>
        </Card>

        {/* Stripe Test Card Failure Scenarios */}
        <Card className="mb-8 border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              {t("pt.failureScenarios.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("pt.failureScenarios.description")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {failureScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`rounded-lg border transition-all ${
                  expandedItems.has(scenario.id)
                    ? "border-red-500/30 bg-background/80"
                    : "border-border/30 bg-background/40"
                }`}
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleItem(scenario.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${scenario.badgeColor}`}
                    >
                      {t(scenario.scenario)}
                    </span>
                    <code className="text-sm font-mono text-foreground">{scenario.cardNumber}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCardNumber(scenario.cardNumber);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {expandedItems.has(scenario.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                {expandedItems.has(scenario.id) && (
                  <div className="px-4 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-xs font-semibold text-red-400 mb-1">{t("pt.failureScenarios.expectedError")}</p>
                      <code className="text-sm text-red-300">{scenario.errorMessage}</code>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{t("pt.failureScenarios.explanation")}</p>
                      <p className="text-sm text-muted-foreground">{t(scenario.description)}</p>
                    </div>
                    <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                      <p className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {t("pt.failureScenarios.resolution")}
                      </p>
                      <p className="text-sm text-green-300/80">{t(scenario.resolution)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Troubleshooting Items */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            {t("pt.cardTroubleshooting.title")}
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
                      <span className="font-medium text-foreground">{t(item.title)}</span>
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
                        <h4 className="text-sm font-semibold text-red-400 mb-2">{t("pt.cardTroubleshooting.symptoms")}</h4>
                        <ul className="space-y-1">
                          {item.symptoms.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                              {t(s)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-2">{t("pt.cardTroubleshooting.solutions")}</h4>
                        <ul className="space-y-1">
                          {item.solutions.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                              {t(s)}
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
            {t("pt.cryptoTroubleshooting.title")}
          </h2>
          <div className="space-y-3">
            {[
              {
                title: t("pt.cryptoTroubleshooting.unconfirmed.title"),
                content:
                  t("pt.cryptoTroubleshooting.unconfirmed.content"),
              },
              {
                title: t("pt.cryptoTroubleshooting.wrongNetwork.title"),
                content:
                  t("pt.cryptoTroubleshooting.wrongNetwork.content"),
              },
              {
                title: t("pt.cryptoTroubleshooting.expired.title"),
                content:
                  t("pt.cryptoTroubleshooting.expired.content"),
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
            <h3 className="text-lg font-semibold mb-2">{t("pt.stillNeedHelp.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("pt.stillNeedHelp.description")}
            </p>
            <div className="bg-background/50 rounded-lg p-4 text-left mb-4 max-w-md mx-auto">
              <p className="text-sm font-medium mb-2">{t("pt.stillNeedHelp.info.title")}</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{t("pt.stillNeedHelp.info.item1")}</li>
                <li>{t("pt.stillNeedHelp.info.item2")}</li>
                <li>{t("pt.stillNeedHelp.info.item3")}</li>
                <li>{t("pt.stillNeedHelp.info.item4")}</li>
                <li>{t("pt.stillNeedHelp.info.item5")}</li>
              </ul>
            </div>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
              {t("pt.stillNeedHelp.contactButton")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
