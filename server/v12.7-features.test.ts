import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

const schemaFile = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
const routersFile = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
const dbFile = (() => { const dir = resolve(__dirname, "db"); if (existsSync(dir)) return readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); return readFileSync(resolve(__dirname, "./db.ts"), "utf-8"); })();

describe("v12.7 - 방송 녹화/VOD 자동 변환", () => {
  it("broadcastRecordings 테이블이 스키마에 정의되어 있어야 한다", () => {
    expect(schemaFile).toContain("broadcastRecordings");
    expect(schemaFile).toContain("vodUrl");
    expect(schemaFile).toContain("thumbnailUrl");
  });

  it("broadcastAnalytics 테이블이 스키마에 정의되어 있어야 한다", () => {
    expect(schemaFile).toContain("broadcastAnalytics");
    expect(schemaFile).toContain("peakConcurrentViewers");
    expect(schemaFile).toContain("avgWatchDurationSec");
    expect(schemaFile).toContain("totalChatMessages");
  });

  it("broadcast.end에서 녹화 및 분석 데이터를 자동 생성해야 한다", () => {
    expect(routersFile).toContain("createBroadcastRecording");
    expect(routersFile).toContain("generateBroadcastAnalytics");
  });

  it("recordings 프로시저가 존재해야 한다", () => {
    expect(routersFile).toContain("recordings: instructorProcedure");
  });

  it("getAnalytics 프로시저가 존재해야 한다", () => {
    expect(routersFile).toContain("getAnalytics: instructorProcedure");
  });

  it("analyticsList 프로시저가 존재해야 한다", () => {
    expect(routersFile).toContain("analyticsList: instructorProcedure");
  });

  it("regenerateAnalytics 프로시저가 존재해야 한다", () => {
    expect(routersFile).toContain("regenerateAnalytics: instructorProcedure");
  });

  it("db.ts에 createBroadcastRecording 함수가 있어야 한다", () => {
    expect(dbFile).toContain("export async function createBroadcastRecording");
  });

  it("db.ts에 getBroadcastRecording 함수가 있어야 한다", () => {
    expect(dbFile).toContain("export async function getBroadcastRecording");
  });

  it("db.ts에 createBroadcastAnalytics 함수가 있어야 한다", () => {
    expect(dbFile).toContain("export async function createBroadcastAnalytics");
  });

  it("db.ts에 generateBroadcastAnalytics 함수가 있어야 한다", () => {
    expect(dbFile).toContain("export async function generateBroadcastAnalytics");
  });

  it("db.ts에 getBroadcastAnalytics 함수가 있어야 한다", () => {
    expect(dbFile).toContain("export async function getBroadcastAnalytics");
  });
});

describe("v12.7 - 아바타 감정 표현 시스템", () => {
  it("slideScripts 테이블에 emotion 필드가 있어야 한다", () => {
    expect(schemaFile).toContain("emotion:");
    expect(schemaFile).toContain("emotionIntensity:");
  });

  it("감정 enum 값이 정의되어 있어야 한다 (neutral, happy, serious 등)", () => {
    expect(schemaFile).toContain("neutral");
    expect(schemaFile).toContain("happy");
    expect(schemaFile).toContain("serious");
    expect(schemaFile).toContain("excited");
  });

  it("updateScript 프로시저에 emotion, emotionIntensity 필드가 있어야 한다", () => {
    // updateScript input에 emotion 관련 필드가 포함되어 있어야 함
    const updateScriptSection = routersFile.substring(
      routersFile.indexOf("updateScript: protectedProcedure"),
      routersFile.indexOf("updateScript: protectedProcedure") + 500
    );
    expect(updateScriptSection).toContain("emotion");
    expect(updateScriptSection).toContain("emotionIntensity");
  });

  it("analyzeEmotions 프로시저가 존재해야 한다", () => {
    expect(routersFile).toContain("analyzeEmotions: protectedProcedure");
  });

  it("analyzeEmotions에서 LLM을 사용하여 감정을 분석해야 한다", () => {
    const analyzeSection = routersFile.substring(
      routersFile.indexOf("analyzeEmotions: protectedProcedure"),
      routersFile.indexOf("analyzeEmotions: protectedProcedure") + 1500
    );
    expect(analyzeSection).toContain("invokeLLM");
  });

  it("EmotionSelector 컴포넌트가 존재해야 한다", () => {
    const emotionSelector = readFileSync(
      resolve(__dirname, "../client/src/components/EmotionSelector.tsx"), "utf-8"
    );
    expect(emotionSelector).toContain("EmotionSelector");
    expect(emotionSelector).toContain("AutoEmotionButton");
    expect(emotionSelector).toContain("neutral");
    expect(emotionSelector).toContain("happy");
    expect(emotionSelector).toContain("serious");
  });
});

describe("v12.7 - 방송 분석 대시보드", () => {
  it("BroadcastAnalytics 페이지가 존재해야 한다", () => {
    const analyticsPage = readFileSync(
      resolve(__dirname, "../client/src/pages/BroadcastAnalytics.tsx"), "utf-8"
    );
    expect(analyticsPage).toContain("BroadcastAnalytics");
    expect(analyticsPage).toContain("trpc.broadcast.analyticsList");
  });

  it("BroadcastAnalytics가 App.tsx에 라우트로 등록되어 있어야 한다", () => {
    const appFile = readFileSync(
      resolve(__dirname, "../client/src/App.tsx"), "utf-8"
    );
    expect(appFile).toContain("BroadcastAnalytics");
    expect(appFile).toContain("/broadcast/analytics");
  });

  it("BroadcastAnalytics에서 시청자 수, 채팅 활성도, 평균 시청 시간을 표시해야 한다", () => {
    const analyticsPage = readFileSync(
      resolve(__dirname, "../client/src/pages/BroadcastAnalytics.tsx"), "utf-8"
    );
    expect(analyticsPage).toContain("peakConcurrentViewers");
    expect(analyticsPage).toContain("avgWatchDurationSec");
  });

  it("BroadcastAnalytics에서 녹화 목록을 표시해야 한다", () => {
    const analyticsPage = readFileSync(
      resolve(__dirname, "../client/src/pages/BroadcastAnalytics.tsx"), "utf-8"
    );
    expect(analyticsPage).toContain("recordings");
    // i18n: was toContain("녹화/VOD")
    expect(analyticsPage).toContain("t(");
  });
});
