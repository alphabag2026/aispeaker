import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function readFile(relativePath: string): string {
  return readFileSync(resolve(__dirname, "..", relativePath), "utf-8");
}

describe("v3.7 Features Page i18n", () => {
  const featuresI18n = readFile("client/src/i18n/features.ts");

  it("should have Korean translations for features page", () => {
    expect(featuresI18n).toContain('"features.hero.badge"');
    expect(featuresI18n).toContain('"features.hero.title1"');
    expect(featuresI18n).toContain('"features.hero.title2"');
    expect(featuresI18n).toContain('"features.hero.desc"');
    expect(featuresI18n).toContain('"features.hero.explore"');
  });

  it("should have English translations for features page", () => {
    expect(featuresI18n).toContain('registerTranslations("en"');
    // Check English hero title
    expect(featuresI18n).toMatch(/features\.hero\.title.*?All Features/s);
  });

  it("should have Chinese translations for features page", () => {
    expect(featuresI18n).toContain('registerTranslations("zh"');
  });

  it("should have Japanese translations for features page", () => {
    expect(featuresI18n).toContain('registerTranslations("ja"');
  });

  it("should have detail page translations for all 4 languages", () => {
    expect(featuresI18n).toContain('"features.detail.not_found"');
    expect(featuresI18n).toContain('"features.detail.tutorial"');
    expect(featuresI18n).toContain('"features.detail.use_cases"');
    expect(featuresI18n).toContain('"features.detail.related"');
  });

  it("should have tutorial steps for all 18 features", () => {
    const featureIds = [
      "deepfake", "voice", "avatar", "pipeline", "editor", "template",
      "subtitle", "thumbnail", "platform", "broadcast", "vod", "qa",
      "whiteboard", "translate", "report", "preview", "certificate", "context"
    ];
    for (const id of featureIds) {
      expect(featuresI18n).toContain(`"features.detail.${id}.step1"`);
      expect(featuresI18n).toContain(`"features.detail.${id}.step4"`);
    }
  });

  it("should have use cases for all 18 features", () => {
    const featureIds = [
      "deepfake", "voice", "avatar", "pipeline", "editor", "template",
      "subtitle", "thumbnail", "platform", "broadcast", "vod", "qa",
      "whiteboard", "translate", "report", "preview", "certificate", "context"
    ];
    for (const id of featureIds) {
      expect(featuresI18n).toContain(`"features.usecase.${id}.1"`);
      expect(featuresI18n).toContain(`"features.usecase.${id}.3"`);
    }
  });

  it("should register features translations in i18n index", () => {
    const i18nIndex = readFile("client/src/i18n/index.ts");
    expect(i18nIndex).toContain("features");
  });
});

describe("v3.7 FeatureDetail Page", () => {
  const featureDetail = readFile("client/src/pages/FeatureDetail.tsx");

  it("should exist and import necessary components", () => {
    expect(featureDetail).toContain("FeatureDetail");
    expect(featureDetail).toContain("useLanguage");
  });

  it("should use route params to get feature id", () => {
    expect(featureDetail).toContain("useParams");
    // or useRoute
    expect(featureDetail).toMatch(/useParams|useRoute/);
  });

  it("should have tutorial section with steps", () => {
    expect(featureDetail).toContain("tutorial");
    expect(featureDetail).toContain("step");
  });

  it("should have use cases section", () => {
    expect(featureDetail).toMatch(/use.?case/i);
  });

  it("should have related features section", () => {
    expect(featureDetail).toMatch(/related/i);
  });

  it("should have navigation back to features list", () => {
    expect(featureDetail).toContain("/features");
  });

  it("should handle not found state", () => {
    expect(featureDetail).toContain("not_found");
  });
});

describe("v3.7 Features Page Updates", () => {
  const features = readFile("client/src/pages/Features.tsx");

  it("should use useLanguage for i18n", () => {
    expect(features).toContain("useLanguage");
  });

  it("should link to feature detail pages", () => {
    expect(features).toContain("/features/");
  });

  it("should have demo preview elements", () => {
    // Check for demo/preview related content
    expect(features).toMatch(/demo|preview|animation/i);
  });
});

describe("v3.7 Route Registration", () => {
  const appTsx = readFile("client/src/App.tsx");

  it("should have FeatureDetail route", () => {
    expect(appTsx).toContain("FeatureDetail");
    expect(appTsx).toContain("/features/:id");
  });
});
