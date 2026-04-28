import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/* ═══════════════════════════════════════════════════════════
   v10.0 – SCORM/xAPI Export & Marketplace Tests
   ═══════════════════════════════════════════════════════════ */

// ── Helper ──
function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");
}

// ── 1. SCORM/xAPI Backend (routers.ts) ──
describe("v10.0 SCORM Backend", () => {
  const routers = readFile("server/routers.ts");

  it("should have scorm router in appRouter", () => {
    expect(routers).toContain("scorm:");
  });

  it("should have scorm.generate mutation", () => {
    expect(routers).toContain("generate:");
    expect(routers).toContain("scormVersion");
    expect(routers).toContain("completionCriteria");
  });

  it("should have scorm.list query", () => {
    expect(routers).toContain("list:");
  });

  it("should have scorm.download mutation", () => {
    expect(routers).toContain("download:");
  });

  it("should generate SCORM manifest", () => {
    expect(routers).toContain("generateScormManifest");
    expect(routers).toContain("manifest");
  });

  it("should generate SCO HTML content", () => {
    expect(routers).toContain("generateScoHtml");
  });

  it("should generate xAPI statements", () => {
    expect(routers).toContain("generateXapiStatements");
    expect(routers).toContain("xapi");
  });

  it("should support SCORM 1.2 and 2004 versions", () => {
    expect(routers).toContain('"1.2"');
    expect(routers).toContain('"2004"');
  });

  it("should support completion criteria: slide_view, quiz_pass, time_spent", () => {
    expect(routers).toContain("slide_view");
    expect(routers).toContain("quiz_pass");
    expect(routers).toContain("time_spent");
  });
});

// ── 2. SCORM DB Schema ──
describe("v10.0 SCORM DB Schema", () => {
  const schema = readFile("drizzle/schema.ts");

  it("should have scormPackages table", () => {
    expect(schema).toContain("scormPackages");
  });

  it("should have scormVersion column", () => {
    expect(schema).toContain("scormVersion");
  });

  it("should have completionCriteria column", () => {
    expect(schema).toContain("completionCriteria");
  });

  it("should have packageUrl column", () => {
    expect(schema).toContain("packageUrl");
  });

  it("should have status enum for scorm packages", () => {
    expect(schema).toContain("generating");
    expect(schema).toContain("ready");
  });
});

// ── 3. SCORM DB Helpers ──
describe("v10.0 SCORM DB Helpers", () => {
  const db = readFile("server/db.ts");

  it("should have createScormPackage helper", () => {
    expect(db).toContain("createScormPackage");
  });

  it("should have getScormPackagesByUser helper", () => {
    expect(db).toContain("getScormPackagesByUser");
  });

  it("should have updateScormPackage helper", () => {
    expect(db).toContain("updateScormPackage");
  });
});

// ── 4. SCORM Frontend Page ──
describe("v10.0 SCORM Export Page", () => {
  const page = readFile("client/src/pages/ScormExport.tsx");

  it("should import trpc for API calls", () => {
    expect(page).toContain("trpc");
  });

  it("should have SCORM version selector (1.2 and 2004)", () => {
    expect(page).toContain("SCORM 2004");
    expect(page).toContain("SCORM 1.2");
  });

  it("should have completion criteria selector", () => {
    expect(page).toContain("슬라이드 조회");
    expect(page).toContain("퀴즈 통과");
    expect(page).toContain("최소 시간");
  });

  it("should have subtitle and thumbnail toggles", () => {
    expect(page).toContain("자막 포함");
    expect(page).toContain("썸네일 포함");
  });

  it("should have download button", () => {
    expect(page).toContain("다운로드");
  });

  it("should show package status badges", () => {
    expect(page).toContain("완료");
    expect(page).toContain("생성 중");
    expect(page).toContain("실패");
  });

  it("should have info banner explaining SCORM", () => {
    expect(page).toContain("SCORM 패키지란");
    expect(page).toContain("Moodle");
  });
});

// ── 5. SCORM Route Registration ──
describe("v10.0 SCORM Route Registration", () => {
  const app = readFile("client/src/App.tsx");

  it("should have ScormExport lazy import", () => {
    expect(app).toContain("ScormExport");
  });

  it("should have /scorm-export route", () => {
    expect(app).toContain("/scorm-export");
  });
});

// ── 6. Marketplace Backend ──
describe("v10.0 Marketplace Backend", () => {
  const routers = readFile("server/routers.ts");

  it("should have marketplace router in appRouter", () => {
    expect(routers).toContain("marketplace:");
  });

  it("should have marketplace.list query", () => {
    expect(routers).toContain("marketplace");
    expect(routers).toContain("list:");
  });

  it("should have marketplace.publish mutation", () => {
    expect(routers).toContain("publish:");
  });

  it("should have marketplace.purchase mutation", () => {
    expect(routers).toContain("purchase:");
  });

  it("should have marketplace.get query", () => {
    expect(routers).toContain("get:");
  });

  it("should have marketplace.reviews query", () => {
    expect(routers).toContain("reviews:");
  });

  it("should have marketplace.earnings query", () => {
    expect(routers).toContain("earnings:");
  });
});

// ── 7. Marketplace DB Schema ──
describe("v10.0 Marketplace DB Schema", () => {
  const schema = readFile("drizzle/schema.ts");

  it("should have marketplaceListings table", () => {
    expect(schema).toContain("marketplaceListings");
  });

  it("should have marketplacePurchases table", () => {
    expect(schema).toContain("marketplacePurchases");
  });

  it("should have marketplaceReviews table", () => {
    expect(schema).toContain("marketplaceReviews");
  });

  it("should have priceInCents column", () => {
    expect(schema).toContain("priceInCents");
  });

  it("should have acceptCrypto column", () => {
    expect(schema).toContain("acceptCrypto");
  });

  it("should have category column", () => {
    expect(schema).toContain("category");
  });
});

// ── 8. Marketplace DB Helpers ──
describe("v10.0 Marketplace DB Helpers", () => {
  const db = readFile("server/db.ts");

  it("should have createMarketplaceListing helper", () => {
    expect(db).toContain("createMarketplaceListing");
  });

  it("should have getMarketplaceListings helper", () => {
    expect(db).toContain("getMarketplaceListings");
  });

  it("should have createMarketplacePurchase helper", () => {
    expect(db).toContain("createMarketplacePurchase");
  });

  it("should have marketplace review helpers", () => {
    expect(db).toContain("marketplace");
    expect(db).toContain("Review");
  });
});

// ── 9. Marketplace Frontend Pages ──
describe("v10.0 Marketplace Pages", () => {
  it("should have Marketplace page", () => {
    const page = readFile("client/src/pages/Marketplace.tsx");
    expect(page).toContain("AI 강의 마켓플레이스");
    expect(page).toContain("전체");
    expect(page).toContain("검색");
  });

  it("should have MarketplaceDetail page", () => {
    const page = readFile("client/src/pages/MarketplaceDetail.tsx");
    expect(page).toContain("강의 소개");
    expect(page).toContain("리뷰");
    expect(page).toContain("카드 결제");
  });

  it("should have CreatorDashboard page", () => {
    const page = readFile("client/src/pages/CreatorDashboard.tsx");
    expect(page).toContain("크리에이터 대시보드");
    expect(page).toContain("총 수익");
    expect(page).toContain("강의 등록");
  });
});

// ── 10. Marketplace Route Registration ──
describe("v10.0 Marketplace Route Registration", () => {
  const app = readFile("client/src/App.tsx");

  it("should have Marketplace lazy import", () => {
    expect(app).toContain("Marketplace");
  });

  it("should have /marketplace route", () => {
    expect(app).toContain("/marketplace");
  });

  it("should have /marketplace/:id route", () => {
    expect(app).toContain('"/marketplace/:id"');
  });

  it("should have CreatorDashboard lazy import", () => {
    expect(app).toContain("CreatorDashboard");
  });

  it("should have /creator-dashboard route", () => {
    expect(app).toContain("/creator-dashboard");
  });
});

// ── 11. Navbar Marketplace Link ──
describe("v10.0 Navbar Marketplace Link", () => {
  const navbar = readFile("client/src/components/Navbar.tsx");

  it("should have marketplace link in navbar", () => {
    expect(navbar).toContain("/marketplace");
  });

  it("should have marketplace label", () => {
    expect(navbar).toContain("마켓");
  });
});
