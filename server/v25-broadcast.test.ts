import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";

// Mock authenticated instructor context
function createInstructorCtx(userId = 1) {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      name: "Test Instructor",
      email: "test@test.com",
      role: "admin" as const,
      platformRole: "instructor" as const,
      avatarUrl: null,
      bio: null,
      language: "ko",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

function createViewerCtx(userId = 2) {
  return {
    user: {
      id: userId,
      openId: "viewer-open-id",
      name: "Test Viewer",
      email: "viewer@test.com",
      role: "user" as const,
      platformRole: "student" as const,
      avatarUrl: null,
      bio: null,
      language: "ko",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

describe("v2.5 - Live Broadcast System", () => {
  const instructorCtx = createInstructorCtx();
  const instructorCaller = appRouter.createCaller(instructorCtx);

  describe("broadcast.create", () => {
    it("should have create procedure defined", () => {
      expect(instructorCaller.broadcast.create).toBeDefined();
    });

    it("should require scriptId and title", async () => {
      // Calling with missing required fields should throw
      await expect(
        (instructorCaller.broadcast.create as any)({ title: "" })
      ).rejects.toThrow();
    });
  });

  describe("broadcast.list", () => {
    it("should have list procedure defined", () => {
      expect(instructorCaller.broadcast.list).toBeDefined();
    });

    it("should return an array", async () => {
      const result = await instructorCaller.broadcast.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("broadcast.liveList", () => {
    it("should have liveList procedure defined", () => {
      expect(instructorCaller.broadcast.liveList).toBeDefined();
    });

    it("should return an array of live broadcasts", async () => {
      const result = await instructorCaller.broadcast.liveList();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("broadcast.start", () => {
    it("should have start procedure defined", () => {
      expect(instructorCaller.broadcast.start).toBeDefined();
    });
  });

  describe("broadcast.pause", () => {
    it("should have pause procedure defined", () => {
      expect(instructorCaller.broadcast.pause).toBeDefined();
    });
  });

  describe("broadcast.resume", () => {
    it("should have resume procedure defined", () => {
      expect(instructorCaller.broadcast.resume).toBeDefined();
    });
  });

  describe("broadcast.end", () => {
    it("should have end procedure defined", () => {
      expect(instructorCaller.broadcast.end).toBeDefined();
    });
  });

  describe("broadcast.updateSlide", () => {
    it("should have updateSlide procedure defined", () => {
      expect(instructorCaller.broadcast.updateSlide).toBeDefined();
    });
  });

  describe("broadcast.chat", () => {
    it("should have chat procedure defined", () => {
      expect(instructorCaller.broadcast.chat).toBeDefined();
    });
  });

  describe("broadcast.chatHistory", () => {
    it("should have chatHistory procedure defined", () => {
      expect(instructorCaller.broadcast.chatHistory).toBeDefined();
    });
  });

  describe("broadcast.join", () => {
    it("should have join procedure defined", () => {
      const viewerCaller = appRouter.createCaller(createViewerCtx());
      expect(viewerCaller.broadcast.join).toBeDefined();
    });
  });

  describe("broadcast.leave", () => {
    it("should have leave procedure defined", () => {
      const viewerCaller = appRouter.createCaller(createViewerCtx());
      expect(viewerCaller.broadcast.leave).toBeDefined();
    });
  });

  describe("broadcast.heartbeat", () => {
    it("should have heartbeat procedure defined", () => {
      const viewerCaller = appRouter.createCaller(createViewerCtx());
      expect(viewerCaller.broadcast.heartbeat).toBeDefined();
    });
  });

  describe("broadcast.viewers", () => {
    it("should have viewers procedure defined", () => {
      expect(instructorCaller.broadcast.viewers).toBeDefined();
    });
  });

  describe("broadcast.syncState", () => {
    it("should have syncState procedure defined", () => {
      expect(instructorCaller.broadcast.syncState).toBeDefined();
    });
  });

  describe("broadcast.pinChat", () => {
    it("should have pinChat procedure defined", () => {
      expect(instructorCaller.broadcast.pinChat).toBeDefined();
    });
  });

  describe("broadcast.get", () => {
    it("should have get procedure defined", () => {
      expect(instructorCaller.broadcast.get).toBeDefined();
    });
  });

  describe("broadcast.getByRoom", () => {
    it("should have getByRoom procedure defined", () => {
      expect(instructorCaller.broadcast.getByRoom).toBeDefined();
    });
  });
});

describe("v2.5 - Route Structure", () => {
  it("should have broadcast router with all required procedures", () => {
    const ctx = createInstructorCtx();
    const caller = appRouter.createCaller(ctx);
    
    // Verify all broadcast procedures exist
    const broadcastProcedures = [
      "create", "list", "liveList", "get", "getByRoom",
      "start", "pause", "resume", "end",
      "updateSlide", "syncState",
      "join", "leave", "heartbeat", "viewers",
      "chat", "chatHistory", "pinChat"
    ];

    for (const proc of broadcastProcedures) {
      expect((caller.broadcast as any)[proc]).toBeDefined();
    }
  });
});
