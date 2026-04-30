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
    description: "Basic plan for individual instructors",
  },
  professional: {
    name: "Professional",
    slug: "professional",
    priceMonthly: 9900, // $99.00
    priceYearly: 95000, // $950.00 (20% off)
    credits: 500,
    description: "Complete tools for professional instructors",
  },
  business: {
    name: "Business",
    slug: "business",
    priceMonthly: 29900, // $299.00
    priceYearly: 287000, // $2,870.00 (20% off)
    credits: 2000,
    description: "Team plan for educational institutions",
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    priceMonthly: 79900, // $799.00
    priceYearly: 767000, // $7,670.00 (20% off)
    credits: 10000,
    description: "Enterprise-scale education solution",
  },
} as const;

export const CREDIT_PACKAGES = [
  { id: "credits_50", name: "50 Credits", credits: 50, priceCents: 1500, perCredit: "$0.30" },
  { id: "credits_200", name: "200 Credits", credits: 200, priceCents: 5000, perCredit: "$0.25" },
  { id: "credits_500", name: "500 Credits", credits: 500, priceCents: 10000, perCredit: "$0.20" },
  { id: "credits_2000", name: "2,000 Credits", credits: 2000, priceCents: 30000, perCredit: "$0.15" },
] as const;

// ========== Credit Costs per Feature ==========

export const CREDIT_COSTS = {
  script_generation: 5,    // AI script generation per item
  tts_conversion: 3,       // TTS conversion per item (1000 chars)
  avatar_video: 20,        // Avatar video per minute
  deepfake_transform: 30,  // Deepfake face transform per minute
  thumbnail_generation: 2, // Thumbnail generation per item
  subtitle_generation: 3,  // Subtitle generation per item
  voice_modulation: 5,     // Voice modulation per item
  live_broadcast: 10,      // Live broadcast per 10 minutes
  // v8.1 AI Studio features
  image_generation: 5,     // AI image generation per item
  bg_remove: 3,            // Background remove/replace per item
  voice_clone: 5,          // Voice clone per item
  voice_change: 3,         // Voice change per item
  video_effects: 15,       // Video effects per item
  image_to_video: 20,      // Image to video per item
  face_swap: 25,           // Face swap per item
  talking_avatar: 20,      // Talking avatar per item
  video_translate: 30,     // Video translate per item
} as const;

export type CreditFeature = keyof typeof CREDIT_COSTS;
