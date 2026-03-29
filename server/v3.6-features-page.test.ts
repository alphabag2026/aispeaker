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

    it("핵심 기능들을 포함해야 한다", () => {
      expect(content).toContain("딥페이크 얼굴 변환");
      expect(content).toContain("음성 변조 & 말투 변환");
      expect(content).toContain("D-ID AI 아바타");
      expect(content).toContain("원클릭 강의 영상 제작");
      expect(content).toContain("AI 스크립트 에디터");
      expect(content).toContain("라이브 방송 시스템");
      expect(content).toContain("실시간 AI Q&A");
      expect(content).toContain("다국어 자동 번역");
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
      expect(content).toContain("99.2%");
    });

    it("플랜별 기능 비교 테이블이 있어야 한다", () => {
      expect(content).toContain("Starter");
      expect(content).toContain("Professional");
      expect(content).toContain("Business");
      expect(content).toContain("플랜별 기능 비교");
    });

    it("CTA 섹션이 있어야 한다", () => {
      expect(content).toContain("지금 바로 AI 강사로 변신하세요");
      expect(content).toContain("무료로 시작하기");
      expect(content).toContain("getLoginUrl");
    });

    it("각 기능에 details 배열이 있어야 한다", () => {
      expect(content).toContain("details:");
      expect(content).toContain("feature.details.map");
    });

    it("CORE, POPULAR 배지가 있어야 한다", () => {
      expect(content).toContain('"CORE"');
      expect(content).toContain('"POPULAR"');
    });

    it("전체 기능 한눈에 보기 섹션이 있어야 한다", () => {
      expect(content).toContain("전체 기능 한눈에 보기");
    });

    it("브랜드명이 AI Speaker여야 한다", () => {
      expect(content).toContain("AI Speaker");
      expect(content).not.toContain("Virtual Speaker");
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
      expect(navContent).toContain('href: "/features"');
      expect(navContent).toContain('label: "기능"');
    });

    it("Layers 아이콘을 사용해야 한다", () => {
      expect(navContent).toContain("Layers");
      expect(navContent).toContain("icon: Layers");
    });
  });

  describe("Home 페이지 연결", () => {
    const homeContent = readFile("client/src/pages/Home.tsx");

    it("Home 페이지에서 기능 페이지로 연결하는 링크가 있어야 한다", () => {
      expect(homeContent).toContain('href="/features"');
      expect(homeContent).toContain("전체 기능 상세 보기");
    });
  });
});
