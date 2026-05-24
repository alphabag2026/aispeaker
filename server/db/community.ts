import { InsertFaceSwapGalleryItem, InsertGalleryPost, InsertPipPreset, InsertPresetComment, InsertPresetReport, InsertPresetVersion, InsertSharedPreset, InsertSharedSubtitlePreset, and, asc, blockedPresets, desc, eq, faceSwapGallery, galleryComments, galleryLikes, galleryPosts, getDb, gte, like, or, pipPresets, presetComments, presetLikes, presetReports, presetTagMap, presetTags, presetVersions, scriptVersions, sharedPresetLikes, sharedPresets, sharedSubtitlePresetLikes, sharedSubtitlePresets, sql, users, voiceEffectPresets } from "./shared";

export async function getLatestVersionNumber(scriptId: number) {
  const db = await getDb();
  const rows = await db!.select({ maxVer: sql<number>`COALESCE(MAX(${scriptVersions.versionNumber}), 0)` })
    .from(scriptVersions)
    .where(eq(scriptVersions.scriptId, scriptId));
  return rows[0]?.maxVer || 0;
}

export async function getGalleryItems(limit = 20, offset = 0, method: "all" | "builtin" | "did" | "heygen" = "all", sort: "latest" | "likes" = "latest") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(faceSwapGallery.isPublic, true)];
  if (method !== "all") {
    conditions.push(eq(faceSwapGallery.method, method as "builtin" | "did" | "heygen"));
  }
  const orderByClause = sort === "likes" ? desc(faceSwapGallery.likesCount) : desc(faceSwapGallery.createdAt);
  return db.select().from(faceSwapGallery)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit).offset(offset);
}

export async function getGalleryItemsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faceSwapGallery)
    .where(eq(faceSwapGallery.userId, userId))
    .orderBy(desc(faceSwapGallery.createdAt));
}

export async function createGalleryItem(data: InsertFaceSwapGalleryItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(faceSwapGallery).values(data);
  return result.insertId;
}

export async function deleteGalleryItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(galleryComments).where(eq(galleryComments.galleryItemId, id));
  await db.delete(galleryLikes).where(eq(galleryLikes.galleryItemId, id));
  await db.delete(faceSwapGallery).where(and(eq(faceSwapGallery.id, id), eq(faceSwapGallery.userId, userId)));
}

export async function toggleGalleryLike(galleryItemId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(galleryLikes)
    .where(and(eq(galleryLikes.galleryItemId, galleryItemId), eq(galleryLikes.userId, userId)));
  if (existing.length > 0) {
    await db.delete(galleryLikes).where(and(eq(galleryLikes.galleryItemId, galleryItemId), eq(galleryLikes.userId, userId)));
    await db.update(faceSwapGallery).set({ likesCount: sql`likesCount - 1` }).where(eq(faceSwapGallery.id, galleryItemId));
    return false;
  } else {
    await db.insert(galleryLikes).values({ galleryItemId, userId });
    await db.update(faceSwapGallery).set({ likesCount: sql`likesCount + 1` }).where(eq(faceSwapGallery.id, galleryItemId));
    return true;
  }
}

export async function getGalleryComments(galleryItemId: number) {
  const db = await getDb();
  if (!db) return [];
  const comments = await db.select({
    id: galleryComments.id,
    content: galleryComments.content,
    userId: galleryComments.userId,
    createdAt: galleryComments.createdAt,
    userName: users.name,
    userAvatar: users.avatarUrl,
  }).from(galleryComments)
    .leftJoin(users, eq(galleryComments.userId, users.id))
    .where(eq(galleryComments.galleryItemId, galleryItemId))
    .orderBy(desc(galleryComments.createdAt));
  return comments;
}

export async function addGalleryComment(galleryItemId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(galleryComments).values({ galleryItemId, userId, content });
  await db.update(faceSwapGallery).set({ commentsCount: sql`commentsCount + 1` }).where(eq(faceSwapGallery.id, galleryItemId));
}

export async function getUserLikes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ galleryItemId: galleryLikes.galleryItemId }).from(galleryLikes).where(eq(galleryLikes.userId, userId));
}

export async function listGalleryPosts(opts: {
  limit?: number; offset?: number; toolUsed?: string; sort?: "latest" | "popular";
  userId?: number; tag?: string;
}) {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };
  const { limit = 20, offset = 0, toolUsed, sort = "latest", userId, tag } = opts;
  const conditions: any[] = [eq(galleryPosts.isPublic, true)];
  if (toolUsed) conditions.push(eq(galleryPosts.toolUsed, toolUsed));
  if (userId) conditions.push(eq(galleryPosts.userId, userId));
  const orderByClause = sort === "popular" ? desc(galleryPosts.likeCount) : desc(galleryPosts.createdAt);
  const posts = await db.select({
    id: galleryPosts.id,
    userId: galleryPosts.userId,
    title: galleryPosts.title,
    description: galleryPosts.description,
    mediaType: galleryPosts.mediaType,
    mediaUrl: galleryPosts.mediaUrl,
    thumbnailUrl: galleryPosts.thumbnailUrl,
    toolUsed: galleryPosts.toolUsed,
    tags: galleryPosts.tags,
    likeCount: galleryPosts.likeCount,
    commentCount: galleryPosts.commentCount,
    viewCount: galleryPosts.viewCount,
    isFeatured: galleryPosts.isFeatured,
    createdAt: galleryPosts.createdAt,
    userName: users.name,
    userAvatar: users.avatarUrl,
  }).from(galleryPosts)
    .leftJoin(users, eq(galleryPosts.userId, users.id))
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(galleryPosts).where(and(...conditions));
  return { posts, total: countRow?.count || 0 };
}

export async function getGalleryPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    id: galleryPosts.id,
    userId: galleryPosts.userId,
    title: galleryPosts.title,
    description: galleryPosts.description,
    mediaType: galleryPosts.mediaType,
    mediaUrl: galleryPosts.mediaUrl,
    thumbnailUrl: galleryPosts.thumbnailUrl,
    toolUsed: galleryPosts.toolUsed,
    tags: galleryPosts.tags,
    likeCount: galleryPosts.likeCount,
    commentCount: galleryPosts.commentCount,
    viewCount: galleryPosts.viewCount,
    isFeatured: galleryPosts.isFeatured,
    isPublic: galleryPosts.isPublic,
    createdAt: galleryPosts.createdAt,
    userName: users.name,
    userAvatar: users.avatarUrl,
  }).from(galleryPosts)
    .leftJoin(users, eq(galleryPosts.userId, users.id))
    .where(eq(galleryPosts.id, id)).limit(1);
  return rows[0] || null;
}

export async function createGalleryPost(data: InsertGalleryPost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(galleryPosts).values(data);
  return result.insertId;
}

export async function deleteGalleryPost(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(galleryPosts).where(and(eq(galleryPosts.id, id), eq(galleryPosts.userId, userId)));
}

export async function toggleGalleryPostLike(postId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Reuse existing galleryLikes table with galleryItemId = postId (shared)
  const existing = await db.select().from(galleryLikes)
    .where(and(eq(galleryLikes.galleryItemId, postId), eq(galleryLikes.userId, userId)));
  if (existing.length > 0) {
    await db.delete(galleryLikes).where(and(eq(galleryLikes.galleryItemId, postId), eq(galleryLikes.userId, userId)));
    await db.update(galleryPosts).set({ likeCount: sql`likeCount - 1` }).where(eq(galleryPosts.id, postId));
    return false;
  } else {
    await db.insert(galleryLikes).values({ galleryItemId: postId, userId });
    await db.update(galleryPosts).set({ likeCount: sql`likeCount + 1` }).where(eq(galleryPosts.id, postId));
    return true;
  }
}

export async function getGalleryPostComments(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: galleryComments.id,
    content: galleryComments.content,
    userId: galleryComments.userId,
    createdAt: galleryComments.createdAt,
    userName: users.name,
    userAvatar: users.avatarUrl,
  }).from(galleryComments)
    .leftJoin(users, eq(galleryComments.userId, users.id))
    .where(eq(galleryComments.galleryItemId, postId))
    .orderBy(desc(galleryComments.createdAt));
}

export async function addGalleryPostComment(postId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(galleryComments).values({ galleryItemId: postId, userId, content });
  await db.update(galleryPosts).set({ commentCount: sql`commentCount + 1` }).where(eq(galleryPosts.id, postId));
}

export async function incrementGalleryPostView(postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(galleryPosts).set({ viewCount: sql`viewCount + 1` }).where(eq(galleryPosts.id, postId));
}

export async function getMyGalleryPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(galleryPosts)
    .where(eq(galleryPosts.userId, userId))
    .orderBy(desc(galleryPosts.createdAt));
}

export async function getUserPostLikes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ galleryItemId: galleryLikes.galleryItemId }).from(galleryLikes).where(eq(galleryLikes.userId, userId));
}

export async function getGalleryPostsByUser(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(galleryPosts)
    .where(eq(galleryPosts.userId, userId))
    .orderBy(desc(galleryPosts.createdAt))
    .limit(limit);
}

export async function getPipPresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pipPresets)
    .where(or(eq(pipPresets.userId, userId), eq(pipPresets.isBuiltIn, true)))
    .orderBy(desc(pipPresets.isBuiltIn), pipPresets.name);
}

export async function createPipPreset(data: InsertPipPreset) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(pipPresets).values(data);
  return result[0].insertId;
}

export async function deletePipPreset(id: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(pipPresets).where(and(eq(pipPresets.id, id), eq(pipPresets.userId, userId), eq(pipPresets.isBuiltIn, false)));
}

export async function listSharedPresets(sortBy: "latest" | "popular" = "latest", limit = 50) {
  const db = await getDb(); if (!db) return [];
  if (sortBy === "popular") {
    return db.select().from(sharedPresets).orderBy(desc(sharedPresets.likes)).limit(limit);
  }
  return db.select().from(sharedPresets).orderBy(desc(sharedPresets.createdAt)).limit(limit);
}

export async function createSharedPreset(data: InsertSharedPreset) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(sharedPresets).values(data);
  return result.insertId;
}

export async function deleteSharedPreset(id: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(sharedPresets).where(and(eq(sharedPresets.id, id), eq(sharedPresets.userId, userId)));
}

export async function toggleSharedPresetLike(presetId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(sharedPresetLikes)
    .where(and(eq(sharedPresetLikes.presetId, presetId), eq(sharedPresetLikes.userId, userId)));
  if (existing.length > 0) {
    await db.delete(sharedPresetLikes).where(eq(sharedPresetLikes.id, existing[0].id));
    await db.update(sharedPresets).set({ likes: sql`likes - 1` }).where(eq(sharedPresets.id, presetId));
    return false;
  } else {
    await db.insert(sharedPresetLikes).values({ presetId, userId });
    await db.update(sharedPresets).set({ likes: sql`likes + 1` }).where(eq(sharedPresets.id, presetId));
    return true;
  }
}

export async function incrementSharedPresetDownloads(presetId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(sharedPresets).set({ downloads: sql`downloads + 1` }).where(eq(sharedPresets.id, presetId));
}

export async function getUserLikedPresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  const likes = await db.select({ presetId: sharedPresetLikes.presetId }).from(sharedPresetLikes).where(eq(sharedPresetLikes.userId, userId));
  return likes.map(l => l.presetId);
}

export async function listSharedSubtitlePresets(sortBy: "latest" | "popular" = "latest", tagId?: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  if (tagId) {
    // Join with tag map to filter by tag
    const rows = await db.select({
      preset: sharedSubtitlePresets,
    }).from(sharedSubtitlePresets)
      .innerJoin(presetTagMap, and(
        eq(presetTagMap.presetId, sharedSubtitlePresets.id),
        eq(presetTagMap.presetType, "subtitle"),
        eq(presetTagMap.tagId, tagId),
      ))
      .orderBy(sortBy === "popular" ? desc(sharedSubtitlePresets.likes) : desc(sharedSubtitlePresets.createdAt))
      .limit(limit);
    return rows.map(r => r.preset);
  }
  if (sortBy === "popular") {
    return db.select().from(sharedSubtitlePresets).orderBy(desc(sharedSubtitlePresets.likes)).limit(limit);
  }
  return db.select().from(sharedSubtitlePresets).orderBy(desc(sharedSubtitlePresets.createdAt)).limit(limit);
}

export async function createSharedSubtitlePreset(data: InsertSharedSubtitlePreset) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(sharedSubtitlePresets).values(data);
  return result.insertId;
}

export async function deleteSharedSubtitlePreset(id: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(sharedSubtitlePresets).where(and(eq(sharedSubtitlePresets.id, id), eq(sharedSubtitlePresets.userId, userId)));
  // Also clean up tag mappings
  await db.delete(presetTagMap).where(and(eq(presetTagMap.presetId, id), eq(presetTagMap.presetType, "subtitle")));
}

export async function toggleSharedSubtitlePresetLike(presetId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(sharedSubtitlePresetLikes)
    .where(and(eq(sharedSubtitlePresetLikes.presetId, presetId), eq(sharedSubtitlePresetLikes.userId, userId)));
  if (existing.length > 0) {
    await db.delete(sharedSubtitlePresetLikes).where(eq(sharedSubtitlePresetLikes.id, existing[0].id));
    await db.update(sharedSubtitlePresets).set({ likes: sql`likes - 1` }).where(eq(sharedSubtitlePresets.id, presetId));
    return false;
  } else {
    await db.insert(sharedSubtitlePresetLikes).values({ presetId, userId });
    await db.update(sharedSubtitlePresets).set({ likes: sql`likes + 1` }).where(eq(sharedSubtitlePresets.id, presetId));
    return true;
  }
}

export async function incrementSharedSubtitlePresetDownloads(presetId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(sharedSubtitlePresets).set({ downloads: sql`downloads + 1` }).where(eq(sharedSubtitlePresets.id, presetId));
}

export async function getUserLikedSubtitlePresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  const likes = await db.select({ presetId: sharedSubtitlePresetLikes.presetId }).from(sharedSubtitlePresetLikes).where(eq(sharedSubtitlePresetLikes.userId, userId));
  return likes.map(l => l.presetId);
}

export async function listPresetTags(category?: "avatar" | "subtitle" | "general") {
  const db = await getDb(); if (!db) return [];
  if (category) {
    return db.select().from(presetTags).where(eq(presetTags.category, category)).orderBy(desc(presetTags.usageCount));
  }
  return db.select().from(presetTags).orderBy(desc(presetTags.usageCount));
}

export async function getOrCreateTag(name: string, category: "avatar" | "subtitle" | "general" = "general") {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(presetTags).where(eq(presetTags.name, name.toLowerCase().trim())).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [result] = await db.insert(presetTags).values({ name: name.toLowerCase().trim(), category });
  return result.insertId;
}

export async function addTagsToPreset(presetType: "avatar" | "subtitle", presetId: number, tagIds: number[]) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  if (tagIds.length === 0) return;
  const values = tagIds.map(tagId => ({ presetType, presetId, tagId }));
  await db.insert(presetTagMap).values(values as any);
  // Increment usage count for each tag
  for (const tagId of tagIds) {
    await db.update(presetTags).set({ usageCount: sql`usageCount + 1` }).where(eq(presetTags.id, tagId));
  }
}

export async function getPresetTags(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ tag: presetTags })
    .from(presetTagMap)
    .innerJoin(presetTags, eq(presetTagMap.tagId, presetTags.id))
    .where(and(eq(presetTagMap.presetType, presetType), eq(presetTagMap.presetId, presetId)));
  return rows.map(r => r.tag);
}

export async function getPopularTags(category?: "avatar" | "subtitle" | "general", limit = 20) {
  const db = await getDb(); if (!db) return [];
  if (category) {
    return db.select().from(presetTags).where(eq(presetTags.category, category)).orderBy(desc(presetTags.usageCount)).limit(limit);
  }
  return db.select().from(presetTags).orderBy(desc(presetTags.usageCount)).limit(limit);
}

export async function addTagsToAvatarPreset(presetId: number, tagIds: number[]) {
  return addTagsToPreset("avatar", presetId, tagIds);
}

export async function getMySharedPresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(sharedPresets).where(eq(sharedPresets.userId, userId)).orderBy(desc(sharedPresets.createdAt));
}

export async function getMySharedSubtitlePresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(sharedSubtitlePresets).where(eq(sharedSubtitlePresets.userId, userId)).orderBy(desc(sharedSubtitlePresets.createdAt));
}

export async function updateSharedPreset(id: number, userId: number, data: {
  name?: string; description?: string | null;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom";
  size?: "small" | "medium" | "large";
  opacity?: number;
  shape?: "circle" | "rounded" | "rectangle";
  customX?: number; customY?: number; customWidth?: number; customHeight?: number;
}) {
  const db = await getDb(); if (!db) return;
  await db.update(sharedPresets).set(data).where(and(eq(sharedPresets.id, id), eq(sharedPresets.userId, userId)));
}

export async function updateSharedSubtitlePreset(id: number, userId: number, data: {
  name?: string; description?: string | null;
  fontSize?: number; fontColor?: string; bgColor?: string;
  position?: "top" | "bottom";
  fontFamily?: string;
  bold?: boolean; italic?: boolean; outline?: boolean;
}) {
  const db = await getDb(); if (!db) return;
  await db.update(sharedSubtitlePresets).set(data).where(and(eq(sharedSubtitlePresets.id, id), eq(sharedSubtitlePresets.userId, userId)));
}

export async function searchTags(query: string, category?: "avatar" | "subtitle" | "general", limit = 10) {
  const db = await getDb(); if (!db) return [];
  const conditions = [sql`${presetTags.name} LIKE ${`%${query}%`}`];
  if (category) conditions.push(eq(presetTags.category, category));
  return db.select().from(presetTags).where(and(...conditions)).orderBy(desc(presetTags.usageCount)).limit(limit);
}

export async function removeTagsFromPreset(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(presetTagMap).where(and(eq(presetTagMap.presetType, presetType), eq(presetTagMap.presetId, presetId)));
}

export async function listSharedPresetsPaginated(
  sortBy: "latest" | "popular" = "latest",
  tagId?: number,
  cursor?: number,
  limit = 20
) {
  const db = await getDb(); if (!db) return { items: [], nextCursor: null as number | null };
  const conditions: any[] = [];
  if (cursor) conditions.push(sql`${sharedPresets.id} < ${cursor}`);

  let query;
  if (tagId) {
    query = db.select({ preset: sharedPresets })
      .from(sharedPresets)
      .innerJoin(presetTagMap, and(
        eq(presetTagMap.presetId, sharedPresets.id),
        eq(presetTagMap.presetType, "avatar"),
        eq(presetTagMap.tagId, tagId),
      ));
  } else {
    query = db.select().from(sharedPresets);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const orderCol = sortBy === "popular" ? desc(sharedPresets.likes) : desc(sharedPresets.id);
  const rows = await (query as any).orderBy(orderCol).limit(limit + 1);

  const items = tagId ? rows.map((r: any) => r.preset) : rows;
  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
export async function listSharedSubtitlePresetsPaginated(
  sortBy: "latest" | "popular" = "latest",
  tagId?: number,
  cursor?: number,
  limit = 20
) {
  const db = await getDb(); if (!db) return { items: [], nextCursor: null as number | null };
  const conditions: any[] = [];
  if (cursor) conditions.push(sql`${sharedSubtitlePresets.id} < ${cursor}`);

  let query;
  if (tagId) {
    query = db.select({ preset: sharedSubtitlePresets })
      .from(sharedSubtitlePresets)
      .innerJoin(presetTagMap, and(
        eq(presetTagMap.presetId, sharedSubtitlePresets.id),
        eq(presetTagMap.presetType, "subtitle"),
        eq(presetTagMap.tagId, tagId),
      ));
  } else {
    query = db.select().from(sharedSubtitlePresets);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const orderCol = sortBy === "popular" ? desc(sharedSubtitlePresets.likes) : desc(sharedSubtitlePresets.id);
  const rows = await (query as any).orderBy(orderCol).limit(limit + 1);

  const items = tagId ? rows.map((r: any) => r.preset) : rows;
  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
export async function getSharedPresetById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(sharedPresets).where(eq(sharedPresets.id, id)).limit(1);
  return rows[0] || null;
}

export async function getSharedSubtitlePresetById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(sharedSubtitlePresets).where(eq(sharedSubtitlePresets.id, id)).limit(1);
  return rows[0] || null;
}

export async function searchSharedPresets(keyword: string, type: "avatar" | "subtitle", limit = 20) {
  const db = await getDb(); if (!db) return [];
  const table = type === "avatar" ? sharedPresets : sharedSubtitlePresets;
  const pattern = `%${keyword}%`;
  return db.select().from(table)
    .where(or(like(table.name, pattern), like(table.description, pattern)))
    .orderBy(desc(table.likes))
    .limit(limit);
}

export async function createPresetReport(data: InsertPresetReport) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(presetReports).values(data);
  return result[0].insertId;
}

export async function getPresetReports(filters?: { status?: string; presetType?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(presetReports.status, filters.status as any));
  if (filters?.presetType) conditions.push(eq(presetReports.presetType, filters.presetType as any));
  return db.select().from(presetReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(presetReports.createdAt));
}

export async function updatePresetReportStatus(id: number, status: "pending" | "reviewed" | "blocked" | "dismissed", reviewedBy: number) {
  const db = await getDb(); if (!db) return;
  await db.update(presetReports).set({ status, reviewedBy, reviewedAt: new Date() }).where(eq(presetReports.id, id));
}

export async function hasUserReported(presetType: "avatar" | "subtitle", presetId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select().from(presetReports)
    .where(and(
      eq(presetReports.presetType, presetType),
      eq(presetReports.presetId, presetId),
      eq(presetReports.reporterId, userId)
    )).limit(1);
  return rows.length > 0;
}

export async function blockPreset(presetType: "avatar" | "subtitle", presetId: number, blockedBy: number, reason?: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(blockedPresets).values({ presetType, presetId, blockedBy, reason });
  return result[0].insertId;
}

export async function unblockPreset(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(blockedPresets).where(and(
    eq(blockedPresets.presetType, presetType),
    eq(blockedPresets.presetId, presetId)
  ));
}

export async function isPresetBlocked(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select().from(blockedPresets)
    .where(and(eq(blockedPresets.presetType, presetType), eq(blockedPresets.presetId, presetId)))
    .limit(1);
  return rows.length > 0;
}

export async function getBlockedPresetIds(presetType: "avatar" | "subtitle") {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ presetId: blockedPresets.presetId }).from(blockedPresets)
    .where(eq(blockedPresets.presetType, presetType));
  return rows.map(r => r.presetId);
}

export async function createPresetVersion(data: InsertPresetVersion) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(presetVersions).values(data);
  return result[0].insertId;
}

export async function getPresetVersions(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(presetVersions)
    .where(and(eq(presetVersions.presetType, presetType), eq(presetVersions.presetId, presetId)))
    .orderBy(desc(presetVersions.version));
}

export async function getLatestPresetVersion(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(presetVersions)
    .where(and(eq(presetVersions.presetType, presetType), eq(presetVersions.presetId, presetId)))
    .orderBy(desc(presetVersions.version))
    .limit(1);
  return rows[0] || null;
}

export async function getPresetVersionById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(presetVersions).where(eq(presetVersions.id, id)).limit(1);
  return rows[0] || null;
}

export async function addPresetComment(data: InsertPresetComment) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(presetComments).values(data);
  return result[0].insertId;
}

export async function listPresetComments(presetType: "avatar" | "subtitle", presetId: number, limit = 20, offset = 0) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    comment: presetComments,
    userName: users.name,
    userAvatar: users.avatarUrl,
  }).from(presetComments)
    .leftJoin(users, eq(presetComments.userId, users.id))
    .where(and(
      eq(presetComments.presetType, presetType),
      eq(presetComments.presetId, presetId),
      eq(presetComments.isDeleted, false)
    ))
    .orderBy(desc(presetComments.createdAt))
    .limit(limit).offset(offset);
}

export async function getPresetCommentCount(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return 0;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(presetComments)
    .where(and(
      eq(presetComments.presetType, presetType),
      eq(presetComments.presetId, presetId),
      eq(presetComments.isDeleted, false)
    ));
  return rows[0]?.count || 0;
}

export async function deletePresetComment(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(presetComments).set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(presetComments.id, id), eq(presetComments.userId, userId)));
}

export async function getPresetAverageRating(presetType: "avatar" | "subtitle", presetId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select({
    avg: sql<number>`AVG(rating)`,
    count: sql<number>`COUNT(rating)`,
  }).from(presetComments)
    .where(and(
      eq(presetComments.presetType, presetType),
      eq(presetComments.presetId, presetId),
      eq(presetComments.isDeleted, false),
      sql`rating IS NOT NULL`
    ));
  return { average: rows[0]?.avg || 0, count: rows[0]?.count || 0 };
}

export async function listPresetReportsAdmin(status?: string, limit = 20, offset = 0) {
  const db = await getDb(); if (!db) return [];
  const conditions = status ? and(eq(presetReports.status, status as any)) : undefined;
  return db.select({
    report: presetReports,
    reporterName: users.name,
  }).from(presetReports)
    .leftJoin(users, eq(presetReports.reporterId, users.id))
    .where(conditions)
    .orderBy(desc(presetReports.createdAt))
    .limit(limit).offset(offset);
}

export async function getPresetReportCount(status?: string) {
  const db = await getDb(); if (!db) return 0;
  const conditions = status ? eq(presetReports.status, status as any) : undefined;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(presetReports).where(conditions);
  return rows[0]?.count || 0;
}

export async function getTopPresets(limit: number = 10, sortBy: "likes" | "downloads" = "likes") {
  const db = await getDb(); if (!db) return [];
  const orderCol = sortBy === "likes" ? sharedPresets.likes : sharedPresets.downloads;
  return db.select().from(sharedPresets).orderBy(desc(orderCol)).limit(limit);
}

export async function getTopSubtitlePresets(limit: number = 10, sortBy: "likes" | "downloads" = "likes") {
  const db = await getDb(); if (!db) return [];
  const orderCol = sortBy === "likes" ? sharedSubtitlePresets.likes : sharedSubtitlePresets.downloads;
  return db.select().from(sharedSubtitlePresets).orderBy(desc(orderCol)).limit(limit);
}

export async function getPresetCategoryStats() {
  const db = await getDb(); if (!db) return { avatar: 0, subtitle: 0 };
  const avatarCount = await db.select({ count: sql<number>`COUNT(*)` }).from(sharedPresets);
  const subtitleCount = await db.select({ count: sql<number>`COUNT(*)` }).from(sharedSubtitlePresets);
  return {
    avatar: avatarCount[0]?.count || 0,
    subtitle: subtitleCount[0]?.count || 0,
  };
}

export async function getPresetGrowthStats(days: number) {
  const db = await getDb(); if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const avatarRows = await db.select({
    date: sql<string>`DATE(createdAt)`,
    count: sql<number>`COUNT(*)`,
  }).from(sharedPresets).where(gte(sharedPresets.createdAt, since)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);
  return avatarRows;
}

export async function togglePresetLike(userId: number, presetId: number): Promise<boolean> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const existing = await db.select().from(presetLikes).where(and(eq(presetLikes.userId, userId), eq(presetLikes.presetId, presetId))).limit(1);
  if (existing.length > 0) {
    await db.delete(presetLikes).where(eq(presetLikes.id, existing[0].id));
    await db.update(voiceEffectPresets).set({ likes: sql`${voiceEffectPresets.likes} - 1` }).where(eq(voiceEffectPresets.id, presetId));
    return false; // unliked
  } else {
    await db.insert(presetLikes).values({ userId, presetId });
    await db.update(voiceEffectPresets).set({ likes: sql`${voiceEffectPresets.likes} + 1` }).where(eq(voiceEffectPresets.id, presetId));
    return true; // liked
  }
}

export async function getUserPresetLikes(userId: number): Promise<number[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({ presetId: presetLikes.presetId }).from(presetLikes).where(eq(presetLikes.userId, userId));
  return rows.map(r => r.presetId);
}

export async function getCommunityPresets(sortBy: "popular" | "newest" | "mostUsed" = "popular", search?: string) {
  const db = await getDb(); if (!db) return [];
  let query = db.select().from(voiceEffectPresets).where(eq(voiceEffectPresets.isPublic, true));
  if (search) {
    query = db.select().from(voiceEffectPresets).where(and(eq(voiceEffectPresets.isPublic, true), like(voiceEffectPresets.name, `%${search}%`)));
  }
  if (sortBy === "popular") return query.orderBy(desc(voiceEffectPresets.likes));
  if (sortBy === "mostUsed") return query.orderBy(desc(voiceEffectPresets.usageCount));
  return query.orderBy(desc(voiceEffectPresets.createdAt));
}

export async function publishPreset(id: number, userId: number, isPublic: boolean, userName?: string) {
  const db = await getDb(); if (!db) return;
  const data: Record<string, unknown> = { isPublic };
  if (userName) data.userName = userName;
  await db.update(voiceEffectPresets).set(data).where(and(eq(voiceEffectPresets.id, id), eq(voiceEffectPresets.userId, userId)));
}

export async function copyPreset(presetId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [original] = await db.select().from(voiceEffectPresets).where(eq(voiceEffectPresets.id, presetId)).limit(1);
  if (!original) throw new Error("Preset not found");
  // Increment usage count
  await db.update(voiceEffectPresets).set({ usageCount: sql`${voiceEffectPresets.usageCount} + 1` }).where(eq(voiceEffectPresets.id, presetId));
  // Create copy
  const [result] = await db.insert(voiceEffectPresets).values({
    userId,
    name: `${original.name} (copy)`,
    voiceId: original.voiceId,
    speed: original.speed,
    pitch: original.pitch,
    description: original.description,
    isPublic: false,
  }).$returningId();
  return result.id;
}
