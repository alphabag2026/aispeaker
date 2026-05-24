import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

// Instructor-only procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor permission required." });
  }
  return next({ ctx });
});

export const galleryRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional(),
      offset: z.number().min(0).optional(),
      method: z.enum(["all", "builtin", "did", "heygen"]).optional(),
      sort: z.enum(["latest", "likes"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getGalleryItems(input?.limit ?? 20, input?.offset ?? 0, input?.method ?? "all", input?.sort ?? "latest");
    }),
  myItems: protectedProcedure.query(async ({ ctx }) => {
    return db.getGalleryItemsByUser(ctx.user.id);
  }),
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      beforeImageUrl: z.string().url(),
      afterImageUrl: z.string().url(),
      method: z.enum(["builtin", "did", "heygen"]).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createGalleryItem({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        beforeImageUrl: input.beforeImageUrl,
        afterImageUrl: input.afterImageUrl,
        method: input.method ?? "builtin",
        isPublic: input.isPublic ?? true,
      });
      return { id };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteGalleryItem(input.id, ctx.user.id);
      return { success: true };
    }),
  like: protectedProcedure
    .input(z.object({ galleryItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const liked = await db.toggleGalleryLike(input.galleryItemId, ctx.user.id);
      return { liked };
    }),
  comments: publicProcedure
    .input(z.object({ galleryItemId: z.number() }))
    .query(async ({ input }) => {
      return db.getGalleryComments(input.galleryItemId);
    }),
  addComment: protectedProcedure
    .input(z.object({ galleryItemId: z.number(), content: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await db.addGalleryComment(input.galleryItemId, ctx.user.id, input.content);
      return { success: true };
    }),
  myLikes: protectedProcedure.query(async ({ ctx }) => {
    const likes = await db.getUserLikes(ctx.user.id);
    return likes.map(l => l.galleryItemId);
  }),
  uploadImage: protectedProcedure
    .input(z.object({
      imageData: z.string(), // base64
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.imageData, "base64");
      const fileKey = `gallery/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { url };
    }),
});

export const communityRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      toolUsed: z.string().optional(),
      sort: z.enum(["latest", "popular"]).default("latest"),
      tag: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.listGalleryPosts({
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
        toolUsed: input?.toolUsed,
        sort: input?.sort ?? "latest",
        tag: input?.tag,
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const post = await db.getGalleryPostById(input.id);
      if (post) await db.incrementGalleryPostView(input.id);
      return post;
    }),

  myPosts: protectedProcedure.query(async ({ ctx }) => {
    return db.getMyGalleryPosts(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      mediaType: z.enum(["image", "video", "audio"]).default("image"),
      mediaUrl: z.string().url(),
      mediaFileKey: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      toolUsed: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createGalleryPost({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl,
        mediaFileKey: input.mediaFileKey,
        thumbnailUrl: input.thumbnailUrl,
        toolUsed: input.toolUsed,
        tags: input.tags,
        isPublic: input.isPublic,
      });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteGalleryPost(input.id, ctx.user.id);
      return { success: true };
    }),

  like: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const liked = await db.toggleGalleryPostLike(input.postId, ctx.user.id);
      return { liked };
    }),

  comments: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      return db.getGalleryPostComments(input.postId);
    }),

  addComment: protectedProcedure
    .input(z.object({ postId: z.number(), content: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await db.addGalleryPostComment(input.postId, ctx.user.id, input.content);
      return { success: true };
    }),

  myLikes: protectedProcedure.query(async ({ ctx }) => {
    const likes = await db.getUserPostLikes(ctx.user.id);
    return likes.map(l => l.galleryItemId);
  }),

  upload: protectedProcedure
    .input(z.object({
      fileData: z.string(), // base64
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `community/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { url, fileKey };
    }),
});

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    const credits = await db.getUserCredits(ctx.user.id);
    const genCount = await db.getAiGenerationCount(ctx.user.id);
    const galleryPosts = await db.getGalleryPostsByUser(ctx.user.id, 6);
    return { user, credits, generationCount: genCount, recentGallery: galleryPosts };
  }),
  update: protectedProcedure
    .input(z.object({ name: z.string().optional(), bio: z.string().optional(), avatarUrl: z.string().optional(), preferredLang: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
});

export const sharedPresetRouter = router({
  list: publicProcedure
    .input(z.object({ sortBy: z.enum(["latest", "popular"]).optional() }).optional())
    .query(async ({ input }) => {
      return db.listSharedPresets(input?.sortBy || "latest");
    }),
  listPaginated: publicProcedure
    .input(z.object({
      sortBy: z.enum(["latest", "popular"]).optional(),
      tagId: z.number().optional(),
      cursor: z.number().optional(),
      limit: z.number().min(1).max(50).optional(),
    }).optional())
    .query(async ({ input }) => {
      const result = await db.listSharedPresetsPaginated(
        input?.sortBy || "latest",
        input?.tagId,
        input?.cursor,
        input?.limit || 20
      );
      const itemsWithTags = await Promise.all(result.items.map(async (p: any) => {
        const tags = await db.getPresetTags("avatar", p.id);
        return { ...p, tags };
      }));
      return { items: itemsWithTags, nextCursor: result.nextCursor };
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const preset = await db.getSharedPresetById(input.id);
      if (!preset) return null;
      const tags = await db.getPresetTags("avatar", preset.id);
      return { ...preset, tags };
    }),
  share: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
      size: z.enum(["small", "medium", "large"]).optional(),
      opacity: z.number().min(0).max(100).optional(),
      shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
      customX: z.number().optional(),
      customY: z.number().optional(),
      customWidth: z.number().optional(),
      customHeight: z.number().optional(),
      tagIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { tagIds, ...presetInput } = input;
      const id = await db.createSharedPreset({
        userId: ctx.user.id,
        userName: ctx.user.name || "Anonymous",
        name: presetInput.name,
        description: presetInput.description,
        position: presetInput.position || "custom",
        size: presetInput.size || "medium",
        opacity: presetInput.opacity ?? 100,
        shape: presetInput.shape || "rounded",
        customX: presetInput.customX ?? 75,
        customY: presetInput.customY ?? 75,
        customWidth: presetInput.customWidth ?? 25,
        customHeight: presetInput.customHeight ?? 25,
      });
      if (tagIds && tagIds.length > 0) {
        await db.addTagsToPreset("avatar", id, tagIds);
      }
      return { id };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteSharedPreset(input.id, ctx.user.id);
      return { success: true };
    }),
  like: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const liked = await db.toggleSharedPresetLike(input.id, ctx.user.id);
      return { liked };
    }),
  download: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.incrementSharedPresetDownloads(input.id);
      return { success: true };
    }),
  myLikes: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserLikedPresets(ctx.user.id);
  }),
});

export const subtitleStyleRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getSubtitleStyle(ctx.user.id);
  }),
  update: protectedProcedure
    .input(z.object({
      fontSize: z.number().min(8).max(48).optional(),
      fontColor: z.string().max(20).optional(),
      bgColor: z.string().max(30).optional(),
      position: z.enum(["top", "bottom", "custom"]).optional(),
      customY: z.number().min(0).max(100).optional(),
      fontFamily: z.string().max(50).optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      outline: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertSubtitleStyle(ctx.user.id, input);
      return { success: true };
    }),
});

export const sharedSubtitlePresetRouter = router({
  list: publicProcedure
    .input(z.object({
      sortBy: z.enum(["latest", "popular"]).optional(),
      tagId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const presets = await db.listSharedSubtitlePresets(input?.sortBy || "latest", input?.tagId);
      const presetsWithTags = await Promise.all(presets.map(async (p) => {
        const tags = await db.getPresetTags("subtitle", p.id);
        return { ...p, tags };
      }));
      return presetsWithTags;
    }),
  listPaginated: publicProcedure
    .input(z.object({
      sortBy: z.enum(["latest", "popular"]).optional(),
      tagId: z.number().optional(),
      cursor: z.number().optional(),
      limit: z.number().min(1).max(50).optional(),
    }).optional())
    .query(async ({ input }) => {
      const result = await db.listSharedSubtitlePresetsPaginated(
        input?.sortBy || "latest",
        input?.tagId,
        input?.cursor,
        input?.limit || 20
      );
      const itemsWithTags = await Promise.all(result.items.map(async (p: any) => {
        const tags = await db.getPresetTags("subtitle", p.id);
        return { ...p, tags };
      }));
      return { items: itemsWithTags, nextCursor: result.nextCursor };
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const preset = await db.getSharedSubtitlePresetById(input.id);
      if (!preset) return null;
      const tags = await db.getPresetTags("subtitle", preset.id);
      return { ...preset, tags };
    }),
  share: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      fontSize: z.number().min(8).max(48).optional(),
      fontColor: z.string().max(20).optional(),
      bgColor: z.string().max(30).optional(),
      position: z.enum(["top", "bottom"]).optional(),
      fontFamily: z.string().max(50).optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      outline: z.boolean().optional(),
      tagIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { tagIds, ...presetData } = input;
      const id = await db.createSharedSubtitlePreset({
        userId: ctx.user.id,
        userName: ctx.user.name || "Anonymous",
        name: presetData.name,
        description: presetData.description,
        fontSize: presetData.fontSize ?? 16,
        fontColor: presetData.fontColor ?? "#FFFFFF",
        bgColor: presetData.bgColor ?? "rgba(0,0,0,0.7)",
        position: presetData.position ?? "bottom",
        fontFamily: presetData.fontFamily ?? "sans-serif",
        bold: presetData.bold ?? false,
        italic: presetData.italic ?? false,
        outline: presetData.outline ?? true,
      });
      if (tagIds && tagIds.length > 0) {
        await db.addTagsToPreset("subtitle", id, tagIds);
      }
      return { id };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteSharedSubtitlePreset(input.id, ctx.user.id);
      return { success: true };
    }),
  like: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const liked = await db.toggleSharedSubtitlePresetLike(input.id, ctx.user.id);
      return { liked };
    }),
  download: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.incrementSharedSubtitlePresetDownloads(input.id);
      return { success: true };
    }),
  myLikes: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserLikedSubtitlePresets(ctx.user.id);
  }),
});

export const presetTagRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.enum(["avatar", "subtitle", "general"]).optional() }).optional())
    .query(async ({ input }) => {
      return db.listPresetTags(input?.category);
    }),
  popular: publicProcedure
    .input(z.object({
      category: z.enum(["avatar", "subtitle", "general"]).optional(),
      limit: z.number().min(1).max(50).optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getPopularTags(input?.category, input?.limit || 20);
    }),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50),
      category: z.enum(["avatar", "subtitle", "general"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.getOrCreateTag(input.name, input.category || "general");
      return { id };
    }),
  addToPreset: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
      tagIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      await db.addTagsToPreset(input.presetType, input.presetId, input.tagIds);
      return { success: true };
    }),
  getForPreset: publicProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getPresetTags(input.presetType, input.presetId);
    }),
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(50),
      category: z.enum(["avatar", "subtitle", "general"]).optional(),
    }))
    .query(async ({ input }) => {
      return db.searchTags(input.query, input.category);
    }),
  removeFromPreset: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db.removeTagsFromPreset(input.presetType, input.presetId);
      return { success: true };
    }),
});

export const myPresetsRouter = router({
  avatarList: protectedProcedure.query(async ({ ctx }) => {
    const presets = await db.getMySharedPresets(ctx.user.id);
    const presetsWithTags = await Promise.all(presets.map(async (p) => {
      const tags = await db.getPresetTags("avatar", p.id);
      return { ...p, tags };
    }));
    return presetsWithTags;
  }),
  subtitleList: protectedProcedure.query(async ({ ctx }) => {
    const presets = await db.getMySharedSubtitlePresets(ctx.user.id);
    const presetsWithTags = await Promise.all(presets.map(async (p) => {
      const tags = await db.getPresetTags("subtitle", p.id);
      return { ...p, tags };
    }));
    return presetsWithTags;
  }),
  updateAvatar: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
      size: z.enum(["small", "medium", "large"]).optional(),
      opacity: z.number().min(0).max(100).optional(),
      shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
      tagIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tagIds, ...data } = input;
      await db.updateSharedPreset(id, ctx.user.id, data);
      if (tagIds !== undefined) {
        await db.removeTagsFromPreset("avatar", id);
        if (tagIds.length > 0) await db.addTagsToPreset("avatar", id, tagIds);
      }
      return { success: true };
    }),
  updateSubtitle: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      fontSize: z.number().min(8).max(48).optional(),
      fontColor: z.string().max(20).optional(),
      bgColor: z.string().max(30).optional(),
      position: z.enum(["top", "bottom"]).optional(),
      fontFamily: z.string().max(50).optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      outline: z.boolean().optional(),
      tagIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tagIds, ...data } = input;
      await db.updateSharedSubtitlePreset(id, ctx.user.id, data);
      if (tagIds !== undefined) {
        await db.removeTagsFromPreset("subtitle", id);
        if (tagIds.length > 0) await db.addTagsToPreset("subtitle", id, tagIds);
      }
      return { success: true };
    }),
  deleteAvatar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeTagsFromPreset("avatar", input.id);
      await db.deleteSharedPreset(input.id, ctx.user.id);
      return { success: true };
    }),
  deleteSubtitle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeTagsFromPreset("subtitle", input.id);
      await db.deleteSharedSubtitlePreset(input.id, ctx.user.id);
      return { success: true };
    }),
});

export const presetSearchRouter = router({
  search: publicProcedure
    .input(z.object({
      keyword: z.string().min(1).max(100),
      type: z.enum(["avatar", "subtitle"]),
      limit: z.number().min(1).max(50).optional(),
    }))
    .query(async ({ input }) => {
      const results = await db.searchSharedPresets(input.keyword, input.type, input.limit || 20);
      const blockedIds = await db.getBlockedPresetIds(input.type);
      return results.filter((r: any) => !blockedIds.includes(r.id));
    }),
});

export const presetReportRouter = router({
  report: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
      reason: z.enum(["inappropriate", "spam", "copyright", "offensive", "other"]),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const alreadyReported = await db.hasUserReported(input.presetType, input.presetId, ctx.user.id);
      if (alreadyReported) return { success: false, error: "already_reported" };
      const id = await db.createPresetReport({ ...input, reporterId: ctx.user.id });
      return { success: true, id };
    }),
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "reviewed", "blocked", "dismissed"]).optional(),
      presetType: z.enum(["avatar", "subtitle"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") return [];
      return db.getPresetReports(input || {});
    }),
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "reviewed", "blocked", "dismissed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") return { success: false };
      await db.updatePresetReportStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),
  block: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") return { success: false };
      await db.blockPreset(input.presetType, input.presetId, ctx.user.id, input.reason);
      return { success: true };
    }),
  unblock: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") return { success: false };
      await db.unblockPreset(input.presetType, input.presetId);
      return { success: true };
    }),
});

export const presetVersionRouter = router({
  list: publicProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
    }))
    .query(async ({ input }) => {
      return db.getPresetVersions(input.presetType, input.presetId);
    }),
  restore: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const version = await db.getPresetVersionById(input.versionId);
      if (!version) return { success: false, error: "version_not_found" };
      const data = version.data as any;
      if (version.presetType === "avatar") {
        await db.updateSharedPreset(version.presetId, ctx.user.id, data);
      } else {
        await db.updateSharedSubtitlePreset(version.presetId, ctx.user.id, data);
      }
      return { success: true };
    }),
});

export const presetCommentRouter = router({
  list: publicProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const comments = await db.listPresetComments(input.presetType, input.presetId, input.limit, input.offset);
      const count = await db.getPresetCommentCount(input.presetType, input.presetId);
      const rating = await db.getPresetAverageRating(input.presetType, input.presetId);
      return { comments, total: count, rating };
    }),
  add: protectedProcedure
    .input(z.object({
      presetType: z.enum(["avatar", "subtitle"]),
      presetId: z.number(),
      content: z.string().min(1).max(1000),
      rating: z.number().min(1).max(5).optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const commentId = await db.addPresetComment({
        presetType: input.presetType,
        presetId: input.presetId,
        userId: ctx.user.id,
        content: input.content,
        rating: input.rating ?? null,
        parentId: input.parentId ?? null,
      });
      // Create notification for reply
      if (input.parentId) {
        const parentComments = await db.listPresetComments(input.presetType, input.presetId, 1000, 0);
        const parent = parentComments.find((c: any) => c.comment.id === input.parentId);
        if (parent && parent.comment.userId !== ctx.user.id) {
          await db.createNotification({
            userId: parent.comment.userId,
            type: "reply",
            title: "\uc0c8 \ub2f5\uae00",
            message: `${ctx.user.name || '\uc0ac\uc6a9\uc790'}\ub2d8\uc774 \ud68c\uc6d0\ub2d8\uc758 \ub313\uae00\uc5d0 \ub2f5\uae00\uc744 \ub2ec\uc558\uc2b5\ub2c8\ub2e4.`,
            link: `/studio?presetType=${input.presetType}&presetId=${input.presetId}`,
          });
        }
      }
      return { success: true, commentId };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deletePresetComment(input.id, ctx.user.id);
      return { success: true };
    }),
});

export const marketplaceRouter = router({
  list: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      return db.getMarketplaceListings(input || {});
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const listing = await db.getMarketplaceListingById(input.id);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      await db.incrementListingViewCount(input.id);
      return listing;
    }),

  publish: instructorProcedure
    .input(z.object({
      pipelineId: z.number().optional(),
      scriptId: z.number().optional(),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      shortDescription: z.string().max(255).optional(),
      category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "programming", "business", "design", "other"]).default("other"),
      priceInCents: z.number().min(50),
      salePriceInCents: z.number().optional(),
      thumbnailUrl: z.string().optional(),
      previewVideoUrl: z.string().optional(),
      tags: z.string().optional(),
      language: z.string().default("ko"),
      durationSec: z.number().default(0),
      acceptCrypto: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await db.createMarketplaceListing({
        sellerId: ctx.user.id,
        ...input,
        status: "active",
      });
      return listing;
    }),

  update: instructorProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      shortDescription: z.string().max(255).optional(),
      category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "programming", "business", "design", "other"]).optional(),
      priceInCents: z.number().min(50).optional(),
      salePriceInCents: z.number().nullable().optional(),
      tags: z.string().optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
      acceptCrypto: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await db.getMarketplaceListingById(input.id);
      if (!listing || listing.sellerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      }
      const { id, ...data } = input;
      await db.updateMarketplaceListing(id, data);
      return { success: true };
    }),

  myListings: instructorProcedure.query(async ({ ctx }) => {
    return db.getMyListings(ctx.user.id);
  }),

  purchase: protectedProcedure
    .input(z.object({
      listingId: z.number(),
      paymentMethod: z.enum(["stripe", "crypto"]).default("stripe"),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await db.getMarketplaceListingById(input.listingId);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      if (listing.sellerId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot purchase your own product." });
      }
      const alreadyPurchased = await db.hasPurchased(ctx.user.id, input.listingId);
      if (alreadyPurchased) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already purchased." });
      }
      const price = listing.salePriceInCents || listing.priceInCents;
      const platformFee = Math.round(price * 0.15); // 15% platform fee
      const sellerPayout = price - platformFee;

      if (input.paymentMethod === "stripe") {
        // Create Stripe checkout session
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: listing.currency || "usd",
              product_data: { name: listing.title },
              unit_amount: price,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${ctx.req.headers.origin}/marketplace?purchased=${listing.id}`,
          cancel_url: `${ctx.req.headers.origin}/marketplace/${listing.id}`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            type: "marketplace_purchase",
            listing_id: listing.id.toString(),
            seller_id: listing.sellerId.toString(),
            buyer_id: ctx.user.id.toString(),
            platform_fee: platformFee.toString(),
            seller_payout: sellerPayout.toString(),
          },
        });
        return { checkoutUrl: session.url, sessionId: session.id };
      } else {
        // Crypto payment - create pending purchase
        const purchase = await db.createMarketplacePurchase({
          buyerId: ctx.user.id,
          listingId: input.listingId,
          sellerId: listing.sellerId,
          amountInCents: price,
          platformFeeInCents: platformFee,
          sellerPayoutInCents: sellerPayout,
          paymentMethod: "crypto",
          status: "pending",
        });
        return { purchaseId: purchase.id, amount: price, currency: listing.currency };
      }
    }),

  myPurchases: protectedProcedure.query(async ({ ctx }) => {
    return db.getMyPurchases(ctx.user.id);
  }),

  hasPurchased: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.hasPurchased(ctx.user.id, input.listingId);
    }),

  earnings: instructorProcedure.query(async ({ ctx }) => {
    return db.getSellerEarnings(ctx.user.id);
  }),

  review: protectedProcedure
    .input(z.object({
      listingId: z.number(),
      purchaseId: z.number(),
      rating: z.number().min(1).max(5),
      title: z.string().max(255).optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await db.getPurchaseById(input.purchaseId);
      if (!purchase || purchase.buyerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase record not found." });
      }
      return db.createMarketplaceReview({
        listingId: input.listingId,
        buyerId: ctx.user.id,
        purchaseId: input.purchaseId,
        rating: input.rating,
        title: input.title,
        content: input.content,
      });
    }),

  reviews: publicProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      return db.getListingReviews(input.listingId);
    }),

  creatorProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.getCreatorProfile(input.userId);
    }),

  updateCreatorProfile: instructorProcedure
    .input(z.object({
      displayName: z.string().min(1).max(255).optional(),
      bio: z.string().optional(),
      specialties: z.string().optional(),
      socialLinks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.upsertCreatorProfile(ctx.user.id, input);
    }),
});

export const recommendationRouter = router({
  getPersonalized: protectedProcedure.query(async ({ ctx }) => {
    // Check cache first
    const cached = await db.getCachedRecommendations(ctx.user.id, "personalized");
    if (cached) return { recommendations: JSON.parse(cached.recommendations), fromCache: true };
    // Get user history and preferences
    const history = await db.getUserLearningHistoryList(ctx.user.id, 50);
    const prefs = await db.getUserPreferences(ctx.user.id);
    // Collaborative filtering: get popular items user hasn't seen
    const viewedIds = history.map(h => h.listingId);
    const popular = await db.getPopularListings(20);
    let recommendations = popular.filter(p => !viewedIds.includes(p.id));
    // Content-based: if user has preferences, boost matching categories
    if (prefs?.preferredCategories) {
      const cats = JSON.parse(prefs.preferredCategories) as string[];
      recommendations.sort((a, b) => {
        const aMatch = cats.includes(a.category || "") ? 1 : 0;
        const bMatch = cats.includes(b.category || "") ? 1 : 0;
        return bMatch - aMatch;
      });
    }
    const result = recommendations.slice(0, 10).map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases }));
    // Cache for 1 hour
    await db.setCachedRecommendations({ userId: ctx.user.id, type: "personalized", recommendations: JSON.stringify(result), expiresAt: new Date(Date.now() + 3600000) });
    return { recommendations: result, fromCache: false };
  }),
  getTrending: publicProcedure.query(async () => {
    const popular = await db.getPopularListings(10);
    return popular.map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases, thumbnailUrl: r.thumbnailUrl }));
  }),
  getSimilar: publicProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const listings = await db.getMarketplaceListings({ category: "" }); const listing = listings.find(l => l.id === input.listingId);
      if (!listing) return [];
      // Get listings in same category
      const similar = await db.getListingsByCategory(listing.category || "general", 10);
      return similar.filter(s => s.id !== input.listingId).map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases, thumbnailUrl: r.thumbnailUrl }));
    }),
  trackProgress: protectedProcedure
    .input(z.object({ listingId: z.number(), progressPercent: z.number().min(0).max(100), watchTimeSec: z.number().min(0).optional(), lastPositionSec: z.number().min(0).optional(), isCompleted: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      return db.trackLearningProgress({ userId: ctx.user.id, ...input });
    }),
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserLearningHistoryList(ctx.user.id);
  }),
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserPreferences(ctx.user.id);
  }),
  updatePreferences: protectedProcedure
    .input(z.object({
      preferredCategories: z.array(z.string()).optional(),
      preferredLanguages: z.array(z.string()).optional(),
      preferredDifficulty: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
      interests: z.array(z.string()).optional(),
      learningGoal: z.string().optional(),
      weeklyTargetMinutes: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: any = {};
      if (input.preferredCategories) data.preferredCategories = JSON.stringify(input.preferredCategories);
      if (input.preferredLanguages) data.preferredLanguages = JSON.stringify(input.preferredLanguages);
      if (input.preferredDifficulty) data.preferredDifficulty = input.preferredDifficulty;
      if (input.interests) data.interests = JSON.stringify(input.interests);
      if (input.learningGoal) data.learningGoal = input.learningGoal;
      if (input.weeklyTargetMinutes !== undefined) data.weeklyTargetMinutes = input.weeklyTargetMinutes;
      return db.upsertUserPreferences(ctx.user.id, data);
    }),
});

