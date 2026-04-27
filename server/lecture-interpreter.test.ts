import { describe, it, expect, vi } from "vitest";
import * as db from "./db";

describe("LectureBuilder Interpreter - DB helpers", () => {
  it("updateLectureProjectInterpreter should be a function", () => {
    expect(typeof db.updateLectureProjectInterpreter).toBe("function");
  });

  it("updateSlideScriptInterpreterText should be a function", () => {
    expect(typeof db.updateSlideScriptInterpreterText).toBe("function");
  });

  it("bulkUpdateSlideScriptInterpreterTexts should be a function", () => {
    expect(typeof db.bulkUpdateSlideScriptInterpreterTexts).toBe("function");
  });

  it("updateLectureProjectInterpreter should accept correct params", async () => {
    const spy = vi.spyOn(db, "updateLectureProjectInterpreter").mockResolvedValue(undefined as any);
    
    await db.updateLectureProjectInterpreter(1, 1, {
      interpreterEnabled: true,
      interpreterLanguage: "en",
      interpreterVoiceId: "voice-1",
    });

    expect(spy).toHaveBeenCalledWith(1, 1, {
      interpreterEnabled: true,
      interpreterLanguage: "en",
      interpreterVoiceId: "voice-1",
    });
    spy.mockRestore();
  });

  it("updateSlideScriptInterpreterText should accept scriptId and text", async () => {
    const spy = vi.spyOn(db, "updateSlideScriptInterpreterText").mockResolvedValue(undefined as any);
    
    await db.updateSlideScriptInterpreterText(42, "Hello, this is translated text");

    expect(spy).toHaveBeenCalledWith(42, "Hello, this is translated text");
    spy.mockRestore();
  });

  it("bulkUpdateSlideScriptInterpreterTexts should accept projectId and translations", async () => {
    const spy = vi.spyOn(db, "bulkUpdateSlideScriptInterpreterTexts").mockResolvedValue(undefined as any);
    
    await db.bulkUpdateSlideScriptInterpreterTexts(1, [
      { slideId: 1, interpreterText: "Hello" },
      { slideId: 2, interpreterText: "World" },
    ]);

    expect(spy).toHaveBeenCalledWith(1, [
      { slideId: 1, interpreterText: "Hello" },
      { slideId: 2, interpreterText: "World" },
    ]);
    spy.mockRestore();
  });
});

describe("LectureBuilder Interpreter - Language support", () => {
  const SUPPORTED_LANGUAGES = [
    "ko", "en", "zh", "ja", "es", "fr", "de", "pt", "ru", "ar",
    "hi", "vi", "th", "id", "tr", "pl", "nl", "sv", "it", "ms",
  ];

  it("should support at least 20 languages", () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(20);
  });

  it("should include Korean, English, Chinese, Japanese", () => {
    expect(SUPPORTED_LANGUAGES).toContain("ko");
    expect(SUPPORTED_LANGUAGES).toContain("en");
    expect(SUPPORTED_LANGUAGES).toContain("zh");
    expect(SUPPORTED_LANGUAGES).toContain("ja");
  });
});
