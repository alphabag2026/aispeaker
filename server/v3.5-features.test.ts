import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("v3.5 Brand Rename: Virtual Speaker → AI Speaker", () => {
  const clientFiles = [
    "client/index.html",
    "client/src/components/Navbar.tsx",
    "client/src/pages/Home.tsx",
    "client/src/pages/Pricing.tsx",
    "client/src/pages/AdminDashboard.tsx",
    "client/src/pages/OnboardingTutorial.tsx",
  ];

  it("should not contain 'Virtual Speaker' in any client file", () => {
    for (const file of clientFiles) {
      const filePath = path.resolve(__dirname, "..", file);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).not.toContain("Virtual Speaker");
    }
  });

  it("should contain 'AI Speaker' in Navbar", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/components/Navbar.tsx"),
      "utf-8"
    );
    expect(content).toContain("AI Speaker");
  });

  it("should contain 'AI Speaker' in Home page", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/pages/Home.tsx"),
      "utf-8"
    );
    expect(content).toContain("AI Speaker");
  });

  it("should contain 'AI Speaker' in index.html title", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/index.html"),
      "utf-8"
    );
    expect(content).toContain("AI Speaker");
  });

  it("should contain 'AI Speaker' in Stripe product names", () => {
    const content = (() => { const dir = path.resolve(__dirname, "routers"); if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); return fs.readFileSync(path.resolve(__dirname, "routers.ts"), "utf-8"); })();
    expect(content).toContain("AI Speaker ${product.name}");
    expect(content).toContain("AI Speaker ${pkg.name}");
    expect(content).not.toContain("Virtual Speaker ${product.name}");
  });
});

describe("v3.5 Payment Notification System", () => {
  it("should have notifyOwner calls in webhook handler for subscription", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("New subscription payment completed");
    expect(content).toContain("notifyOwner");
  });

  it("should have notifyOwner calls for credit package purchase", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("Credit package purchased");
  });

  it("should handle payment_intent.payment_failed event", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("payment_intent.payment_failed");
    expect(content).toContain("payment_intent.payment_failed");
    expect(content).toContain("notifyOwner");
  });

  it("should handle invoice.payment_succeeded for subscription renewal", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("invoice.payment_succeeded");
    expect(content).toContain("invoice.payment_succeeded");
    expect(content).toContain("subscription_cycle");
    expect(content).toContain("notifyOwner");
  });

  it("should handle customer.subscription.deleted event", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "_core/index.ts"),
      "utf-8"
    );
    expect(content).toContain("customer.subscription.deleted");
    expect(content).toContain("customer.subscription.deleted");
    expect(content).toContain("notifyOwner");
  });
});

describe("v3.5 i18n System", () => {
  it("should have LanguageContext with 4 supported languages", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/contexts/LanguageContext.tsx"),
      "utf-8"
    );
    expect(content).toContain("ko");
    expect(content).toContain("en");
    expect(content).toContain("zh");
    expect(content).toContain("ja");
    expect(content).toContain("SUPPORTED_LANGUAGES");
    expect(content).toContain("LanguageProvider");
    expect(content).toContain("useLanguage");
  });

  it("should have LanguageSwitcher component", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/components/LanguageSwitcher.tsx"),
      "utf-8"
    );
    expect(content).toContain("LanguageSwitcher");
    expect(content).toContain("Globe");
    expect(content).toContain("DropdownMenu");
  });

  it("should have LanguageProvider in main.tsx", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/main.tsx"),
      "utf-8"
    );
    expect(content).toContain("LanguageProvider");
    expect(content).toContain("@/i18n");
  });

  it("should have LanguageSwitcher in Navbar", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/components/Navbar.tsx"),
      "utf-8"
    );
    expect(content).toContain("LanguageSwitcher");
  });
});

describe("v3.5 Translation Files", () => {
  it("should have pricing translations for all 4 languages", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/i18n/pricing.ts"),
      "utf-8"
    );
    expect(content).toContain('registerTranslations("ko"');
    expect(content).toContain('registerTranslations("en"');
    expect(content).toContain('registerTranslations("zh"');
    expect(content).toContain('registerTranslations("ja"');
    expect(content).toContain("pricing.title");
    expect(content).toContain("Pricing");
    expect(content).toContain("价格方案");
    expect(content).toContain("料金プラン");
  });

  it("should have troubleshooting translations for all 4 languages", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/i18n/troubleshooting.ts"),
      "utf-8"
    );
    expect(content).toContain('registerTranslations("ko"');
    expect(content).toContain('registerTranslations("en"');
    expect(content).toContain('registerTranslations("zh"');
    expect(content).toContain('registerTranslations("ja"');
    expect(content).toContain("trouble.title");
    expect(content).toContain("Payment Troubleshooting Guide");
    expect(content).toContain("支付问题解决指南");
    expect(content).toContain("決済トラブルシューティングガイド");
  });

  it("should have onboarding translations for all 4 languages", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/i18n/onboarding.ts"),
      "utf-8"
    );
    expect(content).toContain('registerTranslations("ko"');
    expect(content).toContain('registerTranslations("en"');
    expect(content).toContain('registerTranslations("zh"');
    expect(content).toContain('registerTranslations("ja"');
    expect(content).toContain("onboard.title");
    expect(content).toContain("Getting Started Guide");
    expect(content).toContain("入门指南");
    expect(content).toContain("スタートガイド");
  });

  it("should have i18n index file importing all translations", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/i18n/index.ts"),
      "utf-8"
    );
    expect(content).toContain("./pricing");
    expect(content).toContain("./troubleshooting");
    expect(content).toContain("./onboarding");
  });
});
