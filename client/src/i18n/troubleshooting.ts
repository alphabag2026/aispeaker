import { registerTranslations } from "@/contexts/LanguageContext";

// Korean
registerTranslations("ko", {
  "trouble.title": "결제 문제 해결 가이드",
  "trouble.subtitle": "결제 관련 문제를 빠르게 해결할 수 있도록 도와드립니다",
  "trouble.test_card_title": "테스트 카드 정보",
  "trouble.test_card_desc": "테스트 환경에서 사용할 수 있는 카드 번호입니다",
  "trouble.test_card_number": "테스트 카드 번호",
  "trouble.copy": "복사",
  "trouble.copied": "복사됨!",
  "trouble.common_issues": "일반적인 결제 문제",
  "trouble.failure_scenarios": "Stripe 테스트 카드 실패 시나리오",
  "trouble.failure_scenarios_desc": "다양한 결제 실패 상황을 테스트할 수 있는 카드 번호입니다",
  "trouble.card_number": "카드 번호",
  "trouble.error_message": "에러 메시지",
  "trouble.description": "설명",
  "trouble.solution": "해결 방법",
  "trouble.symptom": "증상",
  "trouble.cause": "원인",
  "trouble.back_to_pricing": "요금제 페이지로 돌아가기",
  "trouble.need_help": "추가 도움이 필요하신가요?",
  "trouble.contact_support": "고객 지원에 문의하세요",
});

// English
registerTranslations("en", {
  "trouble.title": "Payment Troubleshooting Guide",
  "trouble.subtitle": "We'll help you resolve payment issues quickly",
  "trouble.test_card_title": "Test Card Information",
  "trouble.test_card_desc": "Card numbers available for testing environment",
  "trouble.test_card_number": "Test Card Number",
  "trouble.copy": "Copy",
  "trouble.copied": "Copied!",
  "trouble.common_issues": "Common Payment Issues",
  "trouble.failure_scenarios": "Stripe Test Card Failure Scenarios",
  "trouble.failure_scenarios_desc": "Card numbers to test various payment failure situations",
  "trouble.card_number": "Card Number",
  "trouble.error_message": "Error Message",
  "trouble.description": "Description",
  "trouble.solution": "Solution",
  "trouble.symptom": "Symptom",
  "trouble.cause": "Cause",
  "trouble.back_to_pricing": "Back to Pricing",
  "trouble.need_help": "Need more help?",
  "trouble.contact_support": "Contact customer support",
});

// Chinese
registerTranslations("zh", {
  "trouble.title": "支付问题解决指南",
  "trouble.subtitle": "帮助您快速解决支付相关问题",
  "trouble.test_card_title": "测试卡信息",
  "trouble.test_card_desc": "可在测试环境中使用的卡号",
  "trouble.test_card_number": "测试卡号",
  "trouble.copy": "复制",
  "trouble.copied": "已复制！",
  "trouble.common_issues": "常见支付问题",
  "trouble.failure_scenarios": "Stripe测试卡模拟失败场景",
  "trouble.failure_scenarios_desc": "用于测试各种支付失败情况的卡号",
  "trouble.card_number": "卡号",
  "trouble.error_message": "错误消息",
  "trouble.description": "说明",
  "trouble.solution": "解决方案",
  "trouble.symptom": "症状",
  "trouble.cause": "原因",
  "trouble.back_to_pricing": "返回价格页面",
  "trouble.need_help": "需要更多帮助？",
  "trouble.contact_support": "联系客服",
});

// Japanese
registerTranslations("ja", {
  "trouble.title": "決済トラブルシューティングガイド",
  "trouble.subtitle": "決済関連の問題を迅速に解決するお手伝いをします",
  "trouble.test_card_title": "テストカード情報",
  "trouble.test_card_desc": "テスト環境で使用できるカード番号",
  "trouble.test_card_number": "テストカード番号",
  "trouble.copy": "コピー",
  "trouble.copied": "コピー済み！",
  "trouble.common_issues": "一般的な決済の問題",
  "trouble.failure_scenarios": "Stripeテストカード失敗シナリオ",
  "trouble.failure_scenarios_desc": "様々な決済失敗状況をテストできるカード番号",
  "trouble.card_number": "カード番号",
  "trouble.error_message": "エラーメッセージ",
  "trouble.description": "説明",
  "trouble.solution": "解決方法",
  "trouble.symptom": "症状",
  "trouble.cause": "原因",
  "trouble.back_to_pricing": "料金ページに戻る",
  "trouble.need_help": "さらにサポートが必要ですか？",
  "trouble.contact_support": "カスタマーサポートにお問い合わせ",
});

// Other languages (fallback to English)
const otherLanguages = ["vi","th","es","fr","de","pt","ru","ar","hi","id","ms","tr","it","nl","pl","sv"];
otherLanguages.forEach(lang => {
  registerTranslations(lang, {
    "trouble.title": "Payment Troubleshooting Guide",
    "trouble.subtitle": "We'll help you resolve payment issues quickly",
    "trouble.test_card_title": "Test Card Information",
    "trouble.test_card_desc": "Card numbers available for testing environment",
    "trouble.test_card_number": "Test Card Number",
    "trouble.copy": "Copy",
    "trouble.copied": "Copied!",
    "trouble.common_issues": "Common Payment Issues",
    "trouble.failure_scenarios": "Stripe Test Card Failure Scenarios",
    "trouble.failure_scenarios_desc": "Card numbers to test various payment failure situations",
    "trouble.card_number": "Card Number",
    "trouble.error_message": "Error Message",
    "trouble.description": "Description",
    "trouble.solution": "Solution",
    "trouble.symptom": "Symptom",
    "trouble.cause": "Cause",
    "trouble.back_to_pricing": "Back to Pricing",
    "trouble.need_help": "Need more help?",
    "trouble.contact_support": "Contact customer support",
  });
});
