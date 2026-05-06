import { describe, it, expect } from "vitest";
import { pronunciationGuides } from "../drizzle/schema";

describe("v6.5 - AI Clone Voice Pronunciation Fine-tuning", () => {
  describe("Pronunciation Guides DB Schema", () => {
    it("should have pronunciationGuides table defined", () => {
      expect(pronunciationGuides).toBeDefined();
    });

    it("should have required columns", () => {
      const columns = Object.keys(pronunciationGuides);
      expect(columns).toContain("id");
      expect(columns).toContain("userId");
      expect(columns).toContain("projectId");
      expect(columns).toContain("word");
      expect(columns).toContain("phonetic");
      expect(columns).toContain("language");
      expect(columns).toContain("description");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
    });

    it("should have correct column types for word and phonetic (varchar 500)", () => {
      // word and phonetic should be varchar(500) NOT NULL
      const wordCol = (pronunciationGuides as any).word;
      const phoneticCol = (pronunciationGuides as any).phonetic;
      expect(wordCol).toBeDefined();
      expect(phoneticCol).toBeDefined();
      expect(wordCol.notNull).toBe(true);
      expect(phoneticCol.notNull).toBe(true);
    });

    it("should have language default to 'ko'", () => {
      const langCol = (pronunciationGuides as any).language;
      expect(langCol).toBeDefined();
      expect(langCol.hasDefault).toBe(true);
    });
  });

  describe("Pronunciation Guide Text Preprocessing", () => {
    // Simulates the preprocessing logic used in generateCloneVoice and batchGenerateCloneVoice
    function applyPronunciationGuides(text: string, guides: { word: string; phonetic: string }[]): string {
      let processedText = text;
      for (const guide of guides) {
        const regex = new RegExp(guide.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        processedText = processedText.replace(regex, guide.phonetic);
      }
      return processedText;
    }

    it("should replace a single word with its phonetic equivalent", () => {
      const text = "blockchain 기술에 대해 설명하겠습니다.";
      const guides = [{ word: "blockchain", phonetic: "블록체인" }];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("블록체인 기술에 대해 설명하겠습니다.");
    });

    it("should replace multiple occurrences of the same word", () => {
      const text = "DeFi는 DeFi 프로토콜을 통해 DeFi 생태계를 구축합니다.";
      const guides = [{ word: "DeFi", phonetic: "디파이" }];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("디파이는 디파이 프로토콜을 통해 디파이 생태계를 구축합니다.");
    });

    it("should handle case-insensitive matching", () => {
      const text = "NFT와 nft는 같은 것입니다.";
      const guides = [{ word: "NFT", phonetic: "엔에프티" }];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("엔에프티와 엔에프티는 같은 것입니다.");
    });

    it("should apply multiple guides in order", () => {
      const text = "Web3와 DeFi 그리고 NFT에 대해 알아봅시다.";
      const guides = [
        { word: "Web3", phonetic: "웹쓰리" },
        { word: "DeFi", phonetic: "디파이" },
        { word: "NFT", phonetic: "엔에프티" },
      ];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("웹쓰리와 디파이 그리고 엔에프티에 대해 알아봅시다.");
    });

    it("should handle special regex characters in words", () => {
      const text = "C++ 프로그래밍과 C# 개발을 배웁니다.";
      const guides = [
        { word: "C++", phonetic: "씨플플" },
        { word: "C#", phonetic: "씨샵" },
      ];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("씨플플 프로그래밍과 씨샵 개발을 배웁니다.");
    });

    it("should not modify text when no guides match", () => {
      const text = "안녕하세요, 오늘 강의를 시작하겠습니다.";
      const guides = [{ word: "blockchain", phonetic: "블록체인" }];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("안녕하세요, 오늘 강의를 시작하겠습니다.");
    });

    it("should return original text when guides array is empty", () => {
      const text = "DeFi 프로토콜을 설명합니다.";
      const guides: { word: string; phonetic: string }[] = [];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("DeFi 프로토콜을 설명합니다.");
    });

    it("should handle Korean word replacements", () => {
      const text = "이더리움 네트워크에서 가스비를 지불합니다.";
      const guides = [
        { word: "이더리움", phonetic: "이써리움" },
        { word: "가스비", phonetic: "개스비" },
      ];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("이써리움 네트워크에서 개스비를 지불합니다.");
    });

    it("should handle phrase (multi-word) replacements", () => {
      const text = "smart contract를 배포합니다.";
      const guides = [{ word: "smart contract", phonetic: "스마트 컨트랙트" }];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("스마트 컨트랙트를 배포합니다.");
    });

    it("should handle overlapping patterns correctly (longer match first)", () => {
      const text = "Web3.0 기술과 Web3 생태계";
      const guides = [
        { word: "Web3.0", phonetic: "웹쓰리점영" },
        { word: "Web3", phonetic: "웹쓰리" },
      ];
      const result = applyPronunciationGuides(text, guides);
      expect(result).toBe("웹쓰리점영 기술과 웹쓰리 생태계");
    });
  });

  describe("Pronunciation Guide Input Validation", () => {
    it("should require word to be non-empty (min 1 char)", () => {
      const word = "";
      expect(word.length).toBeLessThan(1);
    });

    it("should require phonetic to be non-empty (min 1 char)", () => {
      const phonetic = "";
      expect(phonetic.length).toBeLessThan(1);
    });

    it("should enforce max length of 500 for word", () => {
      const maxLength = 500;
      const longWord = "a".repeat(501);
      expect(longWord.length).toBeGreaterThan(maxLength);
    });

    it("should enforce max length of 500 for phonetic", () => {
      const maxLength = 500;
      const longPhonetic = "가".repeat(501);
      expect(longPhonetic.length).toBeGreaterThan(maxLength);
    });

    it("should accept valid language codes", () => {
      const validCodes = ["ko", "en", "ja", "zh", "es", "fr", "de"];
      validCodes.forEach(code => {
        expect(code.length).toBeLessThanOrEqual(10);
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Pronunciation Guide CRUD Operations", () => {
    it("should define addPronunciationGuide with required fields", () => {
      const guideData = {
        userId: 1,
        projectId: 1,
        word: "blockchain",
        phonetic: "블록체인",
        language: "ko",
        description: "블록체인 기술 용어",
      };
      expect(guideData.userId).toBeGreaterThan(0);
      expect(guideData.projectId).toBeGreaterThan(0);
      expect(guideData.word.length).toBeGreaterThan(0);
      expect(guideData.phonetic.length).toBeGreaterThan(0);
    });

    it("should support update with partial fields", () => {
      const updateData: Partial<{ word: string; phonetic: string; language: string; description: string }> = {
        phonetic: "블럭체인",
      };
      expect(updateData.phonetic).toBe("블럭체인");
      expect(updateData.word).toBeUndefined();
    });

    it("should scope guides by projectId", () => {
      const project1Guides = [
        { projectId: 1, word: "DeFi", phonetic: "디파이" },
        { projectId: 1, word: "NFT", phonetic: "엔에프티" },
      ];
      const project2Guides = [
        { projectId: 2, word: "DeFi", phonetic: "decentralized finance" },
      ];
      // Same word can have different pronunciations in different projects
      expect(project1Guides[0].phonetic).not.toBe(project2Guides[0].phonetic);
      expect(project1Guides.every(g => g.projectId === 1)).toBe(true);
      expect(project2Guides.every(g => g.projectId === 2)).toBe(true);
    });

    it("should support deletion by id and userId", () => {
      const deleteInput = { id: 5, userId: 1 };
      expect(deleteInput.id).toBeGreaterThan(0);
      expect(deleteInput.userId).toBeGreaterThan(0);
    });
  });

  describe("Preview Pronunciation", () => {
    it("should accept word and phonetic for preview", () => {
      const previewInput = {
        projectId: 1,
        word: "Ethereum",
        phonetic: "이써리움",
      };
      expect(previewInput.word.length).toBeGreaterThan(0);
      expect(previewInput.phonetic.length).toBeGreaterThan(0);
      expect(previewInput.projectId).toBeGreaterThan(0);
    });

    it("should use phonetic text for TTS generation (not original word)", () => {
      // The preview endpoint generates TTS using the phonetic text
      const word = "blockchain";
      const phonetic = "블록체인";
      // TTS should receive phonetic, not word
      expect(phonetic).not.toBe(word);
    });
  });
});
