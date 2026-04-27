import Stripe from "stripe";

// Stripe instance (server-side only)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export function getStripe(): Stripe | null {
  if (!stripeSecretKey) {
    console.warn("[Stripe] STRIPE_SECRET_KEY not configured");
    return null;
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2025-03-31.basil" as any });
}

// ========== Product Definitions ==========

export const SUBSCRIPTION_PRODUCTS = {
  starter: {
    name: "Starter",
    slug: "starter",
    priceMonthly: 2900, // $29.00 in cents
    priceYearly: 27800, // $278.00 in cents (20% off)
    credits: 100,
    description: "개인 강사를 위한 기본 플랜",
  },
  professional: {
    name: "Professional",
    slug: "professional",
    priceMonthly: 9900, // $99.00
    priceYearly: 95000, // $950.00 (20% off)
    credits: 500,
    description: "전문 강사를 위한 완전한 도구",
  },
  business: {
    name: "Business",
    slug: "business",
    priceMonthly: 29900, // $299.00
    priceYearly: 287000, // $2,870.00 (20% off)
    credits: 2000,
    description: "교육 기관을 위한 팀 플랜",
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    priceMonthly: 79900, // $799.00
    priceYearly: 767000, // $7,670.00 (20% off)
    credits: 10000,
    description: "대규모 기업 교육 솔루션",
  },
} as const;

export const CREDIT_PACKAGES = [
  { id: "credits_50", name: "50 크레딧", credits: 50, priceCents: 1500, perCredit: "$0.30" },
  { id: "credits_200", name: "200 크레딧", credits: 200, priceCents: 5000, perCredit: "$0.25" },
  { id: "credits_500", name: "500 크레딧", credits: 500, priceCents: 10000, perCredit: "$0.20" },
  { id: "credits_2000", name: "2,000 크레딧", credits: 2000, priceCents: 30000, perCredit: "$0.15" },
] as const;

// ========== Credit Costs per Feature ==========

export const CREDIT_COSTS = {
  script_generation: 5,    // AI 스크립트 생성 1건
  tts_conversion: 3,       // TTS 변환 1건 (1000자 기준)
  avatar_video: 20,        // 아바타 영상 1분
  deepfake_transform: 30,  // 딥페이크 얼굴 변환 1분
  thumbnail_generation: 2, // 썸네일 생성 1건
  subtitle_generation: 3,  // 자막 생성 1건
  voice_modulation: 5,     // 음성 변조 1건
  live_broadcast: 10,      // 라이브 방송 10분당
  // v8.1 AI Studio features
  image_generation: 5,     // AI 이미지 생성 1건
  bg_remove: 3,            // 배경 제거/교체 1건
  voice_clone: 5,          // 음성 복제 1건
  voice_change: 3,         // 음성 변환 1건
  video_effects: 15,       // 비디오 이펙트 1건
  image_to_video: 20,      // 이미지→비디오 1건
  face_swap: 25,           // 페이스 스왑 1건
  talking_avatar: 20,      // 토킹 아바타 1건
  video_translate: 30,     // 비디오 번역 1건
} as const;

export type CreditFeature = keyof typeof CREDIT_COSTS;
