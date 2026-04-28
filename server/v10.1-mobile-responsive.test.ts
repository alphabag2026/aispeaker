import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const PAGES_DIR = join(__dirname, "../client/src/pages");

describe("v10.1 Mobile Responsive", () => {
  const pageFiles = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".tsx"));

  describe("All pages have responsive classes", () => {
    const responsivePattern = /sm:|md:|lg:|xl:/g;

    // Pages that are exempt from responsive requirements (very small pages)
    const exemptPages = ["NotFound.tsx"];

    for (const file of pageFiles) {
      if (exemptPages.includes(file)) continue;

      it(`${file} should have at least 1 responsive class`, () => {
        const content = readFileSync(join(PAGES_DIR, file), "utf-8");
        const matches = content.match(responsivePattern) || [];
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe("Key pages have adequate responsive coverage", () => {
    const keyPages = [
      { file: "Home.tsx", minClasses: 10 },
      { file: "Marketplace.tsx", minClasses: 5 },
      { file: "ScormExport.tsx", minClasses: 5 },
      { file: "CreatorDashboard.tsx", minClasses: 5 },
      { file: "MarketplaceDetail.tsx", minClasses: 5 },
      { file: "Features.tsx", minClasses: 5 },
      { file: "Pricing.tsx", minClasses: 3 },
      { file: "BroadcastViewer.tsx", minClasses: 3 },
      { file: "BroadcastStudio.tsx", minClasses: 3 },
    ];

    for (const { file, minClasses } of keyPages) {
      it(`${file} should have at least ${minClasses} responsive classes`, () => {
        const content = readFileSync(join(PAGES_DIR, file), "utf-8");
        const matches = content.match(/sm:|md:|lg:|xl:/g) || [];
        expect(matches.length).toBeGreaterThanOrEqual(minClasses);
      });
    }
  });

  describe("Critical mobile patterns", () => {
    it("BroadcastViewer should have flex-col for mobile layout", () => {
      const content = readFileSync(join(PAGES_DIR, "BroadcastViewer.tsx"), "utf-8");
      expect(content).toContain("flex-col");
      expect(content).toContain("lg:flex-row");
    });

    it("BroadcastStudio should have flex-col for mobile layout", () => {
      const content = readFileSync(join(PAGES_DIR, "BroadcastStudio.tsx"), "utf-8");
      expect(content).toContain("flex-col");
      expect(content).toContain("lg:flex-row");
    });

    it("ScormExport dialog should be mobile-friendly", () => {
      const content = readFileSync(join(PAGES_DIR, "ScormExport.tsx"), "utf-8");
      expect(content).toContain("max-w-[95vw]");
    });

    it("CreatorDashboard dialog should be mobile-friendly", () => {
      const content = readFileSync(join(PAGES_DIR, "CreatorDashboard.tsx"), "utf-8");
      expect(content).toContain("max-w-[95vw]");
    });

    it("Marketplace should have responsive grid", () => {
      const content = readFileSync(join(PAGES_DIR, "Marketplace.tsx"), "utf-8");
      expect(content).toContain("sm:grid-cols-2");
      expect(content).toContain("lg:grid-cols-3");
    });
  });

  describe("Navbar mobile menu", () => {
    it("Navbar should have mobile menu with marketplace link", () => {
      const content = readFileSync(join(PAGES_DIR, "../components/Navbar.tsx"), "utf-8");
      expect(content).toContain("/marketplace");
      // Should have mobile menu toggle
      expect(content).toContain("mobileOpen");
    });
  });
});
