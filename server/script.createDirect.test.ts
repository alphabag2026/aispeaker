import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  createLectureScript: vi.fn().mockResolvedValue(42),
  updateLectureScript: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import * as db from "./db";

describe("script.createDirect - section splitting logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test the section splitting logic directly (extracted from the router)
  function splitIntoSections(rawText: string, durationMin: number) {
    const numberedPattern = /(?:^|\n)\s*(?:\d+[.、)\s]|第[一二三四五六七八九十]+)/;
    let rawSections: string[];

    if (numberedPattern.test(rawText)) {
      rawSections = rawText.split(/\n\s*(?=\d+[.、)\s]|第[一二三四五六七八九十]+)/).filter(s => s.trim().length > 0);
    } else {
      rawSections = rawText.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    }

    if (rawSections.length <= 1) {
      const lines = rawText.split(/\n/).filter(l => l.trim().length > 0);
      if (lines.length > 3) {
        const chunkSize = Math.ceil(lines.length / Math.max(3, Math.ceil(durationMin / 3)));
        rawSections = [];
        for (let i = 0; i < lines.length; i += chunkSize) {
          rawSections.push(lines.slice(i, i + chunkSize).join('\n'));
        }
      }
    }

    const totalChars = rawSections.reduce((sum, s) => sum + s.length, 0);
    const sections = rawSections.map((text, idx) => {
      const firstLine = text.split('\n')[0].trim();
      const titleMatch = firstLine.match(/^\d+[.、)\s]\s*(.+)/) || firstLine.match(/^第[一二三四五六七八九十]+[.、\s]\s*(.+)/);
      const title = titleMatch ? titleMatch[1].substring(0, 100) : `섹션 ${idx + 1}`;
      const content = text.trim();
      const charRatio = content.length / totalChars;
      const durationSec = Math.round(durationMin * 60 * charRatio);

      return { title, content, durationSec, slideNotes: content.substring(0, 200) };
    });

    return sections;
  }

  it("should split numbered Chinese text into sections", () => {
    const text = `1. 大家好，今天我来给大家分享一下关于Xplay的内容。
2. 会员每天拿到的分成，都会通过一套完整的机制把利润打入各位投资者的钱包。
3. 其实Xplay这里不只是让大家投资的地方，也是一个可以成为大家事业以及做生意的地方。`;

    const sections = splitIntoSections(text, 10);
    expect(sections.length).toBe(3);
    expect(sections[0].title).toContain("大家好");
    expect(sections[1].title).toContain("会员每天");
    expect(sections[2].title).toContain("其实Xplay");
  });

  it("should split double-newline separated text into sections", () => {
    const text = `블록체인의 기본 개념에 대해 설명하겠습니다. 블록체인은 분산 원장 기술입니다.

이더리움은 스마트 컨트랙트를 지원하는 블록체인 플랫폼입니다.

DeFi는 탈중앙화 금융을 의미합니다.`;

    const sections = splitIntoSections(text, 10);
    expect(sections.length).toBe(3);
  });

  it("should split long single-paragraph text into chunks", () => {
    const lines = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}: This is content for the lecture.`);
    const text = lines.join('\n');

    const sections = splitIntoSections(text, 10);
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it("should handle Chinese numbered pattern with 、", () => {
    const text = `1、Xplay平台介绍和基本概念
2、收益模式详解
3、如何获取XP代币`;

    const sections = splitIntoSections(text, 5);
    expect(sections.length).toBe(3);
    expect(sections[0].title).toContain("Xplay");
  });

  it("should calculate duration proportionally based on content length", () => {
    const text = `1. Short section
2. This is a much longer section with a lot more content that should take more time to read through and present to the audience during the lecture.
3. Medium section content here.`;

    const sections = splitIntoSections(text, 10);
    expect(sections.length).toBe(3);
    // Longer section should have more duration
    expect(sections[1].durationSec).toBeGreaterThan(sections[0].durationSec);
    // Total should be approximately 10 minutes
    const totalSec = sections.reduce((sum, s) => sum + s.durationSec, 0);
    expect(totalSec).toBe(600); // 10 min = 600 sec
  });

  it("should handle the Xplay-style Chinese script from the screenshot", () => {
    const text = `7. 会员每天拿到的分成，都会通过一套完整的机制把利润打入各位投资者的钱包。现在跟大家解释我们的机制：每天获取利润后，机制自动扣取20%作为社区建设以及公司运营费用，剩下的利润累计超过5美金的话，自动打入投资人钱包。
8. 其实Xplay这里不只是让大家投资的地方，也是一个可以成为大家事业以及做生意的地方。
9. 第二种收益是等级奖。这里总共有8个等级，从V1到V8。
10. 这里也为大家做了一个算法：当大家达到V5后，日收入可达15,790美金，月收入473,700美金。
11. 以上跟大家讲的都是我们Xplay正在做的。
12. 我们不止把现在做好，也把未来规划明确执行。
13. 甚至Xplay也即将推出自己的U卡。
14. 最后，需要让大家明白的部分都分享完毕了。`;

    const sections = splitIntoSections(text, 10);
    expect(sections.length).toBe(8);
    expect(sections[0].title).toContain("会员每天");
  });

  it("should generate slideNotes from content (max 200 chars)", () => {
    const longContent = "A".repeat(300);
    const text = `1. ${longContent}`;

    const sections = splitIntoSections(text, 5);
    expect(sections[0].slideNotes.length).toBeLessThanOrEqual(200);
  });

  it("should use default section title when no numbered pattern found", () => {
    const text = `이것은 첫 번째 단락입니다.

이것은 두 번째 단락입니다.`;

    const sections = splitIntoSections(text, 5);
    expect(sections[0].title).toBe("섹션 1");
    expect(sections[1].title).toBe("섹션 2");
  });
});
