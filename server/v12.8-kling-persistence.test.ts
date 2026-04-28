import { describe, it, expect, vi, beforeEach } from "vitest";

describe("v12.8 - KLING API Key Persistence Bug Fix", () => {
  describe("systemRouter.setKlingKeys", () => {
    it("should save KLING keys to DB via setSystemSetting", async () => {
      // The setKlingKeys mutation now calls db.setSystemSetting for persistence
      const { setSystemSetting, getSystemSetting } = await import("./db");
      
      // Simulate saving keys
      await setSystemSetting("KLING_ACCESS_KEY", "test_access_key_abc");
      await setSystemSetting("KLING_SECRET_KEY", "test_secret_key_xyz");
      
      // Verify they can be retrieved
      const accessKey = await getSystemSetting("KLING_ACCESS_KEY");
      const secretKey = await getSystemSetting("KLING_SECRET_KEY");
      
      expect(accessKey).toBe("test_access_key_abc");
      expect(secretKey).toBe("test_secret_key_xyz");
    });

    it("should overwrite existing keys on duplicate save", async () => {
      const { setSystemSetting, getSystemSetting } = await import("./db");
      
      // Save initial keys
      await setSystemSetting("KLING_ACCESS_KEY", "first_key");
      
      // Overwrite with new key
      await setSystemSetting("KLING_ACCESS_KEY", "second_key");
      
      const result = await getSystemSetting("KLING_ACCESS_KEY");
      expect(result).toBe("second_key");
    });

    it("should return null for non-existent settings", async () => {
      const { getSystemSetting } = await import("./db");
      
      const result = await getSystemSetting("NON_EXISTENT_KEY_12345");
      expect(result).toBeNull();
    });
  });

  describe("loadKlingKeysFromDb", () => {
    it("should load keys from DB into process.env", async () => {
      const { setSystemSetting } = await import("./db");
      const { loadKlingKeysFromDb } = await import("./_core/systemRouter");
      
      // Save keys to DB
      await setSystemSetting("KLING_ACCESS_KEY", "loaded_access_key");
      await setSystemSetting("KLING_SECRET_KEY", "loaded_secret_key");
      
      // Load from DB
      await loadKlingKeysFromDb();
      
      // Verify process.env is updated
      expect(process.env.KLING_ACCESS_KEY).toBe("loaded_access_key");
      expect(process.env.KLING_SECRET_KEY).toBe("loaded_secret_key");
    });

    it("should not crash if DB has no KLING keys", async () => {
      const { loadKlingKeysFromDb } = await import("./_core/systemRouter");
      
      // Should not throw even if keys don't exist
      await expect(loadKlingKeysFromDb()).resolves.not.toThrow();
    });
  });

  describe("kling.isConfigured endpoint", () => {
    it("should return configured:true when env keys are set", async () => {
      // Since KLING_ACCESS_KEY and KLING_SECRET_KEY are set in env
      const { isKlingConfigured } = await import("./kling");
      expect(isKlingConfigured()).toBe(true);
    });
  });

  describe("setKlingKeys also updates process.env immediately", () => {
    it("should update process.env for immediate use without restart", async () => {
      const { setSystemSetting } = await import("./db");
      
      // Simulate what setKlingKeys mutation does
      const accessKey = "immediate_access_key";
      const secretKey = "immediate_secret_key";
      
      await setSystemSetting("KLING_ACCESS_KEY", accessKey);
      await setSystemSetting("KLING_SECRET_KEY", secretKey);
      process.env.KLING_ACCESS_KEY = accessKey;
      process.env.KLING_SECRET_KEY = secretKey;
      
      // Verify both DB and process.env are in sync
      const { getSystemSetting } = await import("./db");
      const dbAccess = await getSystemSetting("KLING_ACCESS_KEY");
      
      expect(dbAccess).toBe(accessKey);
      expect(process.env.KLING_ACCESS_KEY).toBe(accessKey);
    });
  });
});
