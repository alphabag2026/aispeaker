import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf-8");
}

describe("v3.6 Features 페이지", () => {
  describe("Features.tsx 페이지 구조", () => {
    const content = readFile("client/src/pages/Features.tsx");

    it("Navbar 컴포넌트를 포함해야 한다", () => {
      expect(content).toContain("import Navbar");
      expect(content).toContain("<Navbar");
    });

    it("5개 카테고리를 포함해야 한다 (identity, content, delivery, interactive, analytics)", () => {
      expect(content).toContain('id: "identity"');
      expect(content).toContain('id: "content"');
      expect(content).toContain('id: "delivery"');
      expect(content).toContain('id: "interactive"');
      expect(content).toContain('id: "analytics"');
    });

    it("핵심 기능 ID들을 포함해야 한다", () => {
      // After i18n, feature names are in translation files, check feature IDs instead
      expect(content).toContain('"deepfake"');
      expect(content).toContain('"voice"');
      expect(content).toContain('"avatar"');
      expect(content).toContain('"pipeline"');
      expect(content).toContain('"editor"');
      expect(content).toContain('"broadcast"');
      expect(content).toContain('"qa"');
      expect(content).toContain('"translate"');
    });

    it("카테고리 탭 전환 기능이 있어야 한다", () => {
      expect(content).toContain("activeCategory");
      expect(content).toContain("setActiveCategory");
      expect(content).toContain("useState");
    });

    it("Stats 섹션이 있어야 한다", () => {
      expect(content).toContain("50+");
      expect(content).toContain("20+");
      expect(content).toContain("18+");
    });

    it("플랜별 기능 비교 테이블이 있어야 한다 (i18n 키 사용)", () => {
      expect(content).toContain("Starter");
      expect(content).toContain("Professional");
      expect(content).toContain("Business");
      // After i18n, section title uses t() function
      expect(content).toContain("features.compare.title");
    });

    it("CTA 섹션이 있어야 한다 (i18n 키 사용)", () => {
      expect(content).toContain("features.cta.title");
      expect(content).toContain("getLoginUrl");
    });

    it("기능 데이터 구조에 detailKeys 또는 details가 있어야 한다", () => {
      // After i18n refactor, details may use translation keys
      expect(content).toMatch(/detailKeys|details/);
    });

    it("CORE, POPULAR 배지가 있어야 한다", () => {
      expect(content).toContain('"CORE"');
      expect(content).toContain('"POPULAR"');
    });

    it("전체 기능 한눈에 보기 섹션이 있어야 한다 (i18n 키 사용)", () => {
      expect(content).toContain("features.all.title");
    });

    it("i18n 다국어 시스템을 사용해야 한다", () => {
      expect(content).toContain("useLanguage");
      expect(content).toContain("t(");
    });
  });

  describe("i18n 번역 파일에 한국어 원문이 있어야 한다", () => {
    const i18nContent = readFile("client/src/i18n/features.ts");

    it("한국어 기능명이 번역 파일에 있어야 한다", () => {
      expect(i18nContent).toContain("딥페이크 얼굴 변환");
      expect(i18nContent).toContain("음성 변조");
      expect(i18nContent).toContain("D-ID AI 아바타");
      expect(i18nContent).toContain("라이브 방송");
      expect(i18nContent).toContain("실시간 AI Q&A");
      expect(i18nContent).toContain("다국어");
    });

    it("AI Speaker 브랜드명이 번역 파일에 있어야 한다", () => {
      expect(i18nContent).toContain("AI Speaker");
      expect(i18nContent).not.toContain("Virtual Speaker");
    });
  });

  describe("라우트 등록", () => {
    const appContent = readFile("client/src/App.tsx");

    it("App.tsx에 /features 라우트가 등록되어야 한다", () => {
      expect(appContent).toContain('path="/features"');
      expect(appContent).toContain("component={Features}");
    });

    it("Features import가 있어야 한다", () => {
      expect(appContent).toContain('import Features from "./pages/Features"');
    });
  });

  describe("Navbar 메뉴", () => {
    const navContent = readFile("client/src/components/Navbar.tsx");

    it("Navbar에 기능 메뉴가 있어야 한다", () => {
      expect(navContent).toContain('/features');
      expect(navContent).toContain('navbar.links.features');
    });

    it("Layers 아이콘을 사용해야 한다", () => {
      expect(navContent).toContain("Layers");
    });
  });

  describe("Home 페이지 연결", () => {
    const homeContent = readFile("client/src/pages/Home.tsx");

    it("Home 페이지에서 기능 페이지로 연결하는 링크가 있어야 한다", () => {
      expect(homeContent).toContain('href="/features"');
    });
  });
});
