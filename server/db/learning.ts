import { InsertCertificate, InsertLearningProgress, InsertQaBookmark, InsertQaMessage, InsertRecommendationCacheEntry, InsertScormPackage, InsertUserLearningHistory, and, asc, certificates, desc, eq, getDb, gte, learningProgress, lectureSessions, lectures, like, or, qaBookmarks, qaMessages, recommendationCache, scormPackages, sql, userLearningHistory, userPreferences, users } from "./shared";

export async function getQaMessages(lectureId: number, limit = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select({ message: qaMessages, user: { id: users.id, name: users.name } })
    .from(qaMessages).leftJoin(users, eq(qaMessages.userId, users.id))
    .where(eq(qaMessages.lectureId, lectureId)).orderBy(qaMessages.createdAt).limit(limit);
}

export async function createQaMessage(data: InsertQaMessage) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(qaMessages).values(data); return result[0].insertId;
}

export async function getOrCreateLearningProgress(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId))).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(learningProgress).values({ userId, lectureId });
  const created = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId))).limit(1);
  return created[0] || null;
}

export async function updateLearningProgress(userId: number, lectureId: number, data: Partial<InsertLearningProgress>) {
  const db = await getDb(); if (!db) return;
  await db.update(learningProgress).set({ ...data, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function getUserLearningProgress(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ progress: learningProgress, lecture: lectures })
    .from(learningProgress).innerJoin(lectures, eq(learningProgress.lectureId, lectures.id))
    .where(eq(learningProgress.userId, userId)).orderBy(desc(learningProgress.lastActivityAt));
}

export async function createQaBookmark(data: InsertQaBookmark) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(qaBookmarks)
    .where(and(eq(qaBookmarks.userId, data.userId), eq(qaBookmarks.messageId, data.messageId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(qaBookmarks).values(data); return result[0].insertId;
}

export async function deleteQaBookmark(userId: number, messageId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(qaBookmarks).where(and(eq(qaBookmarks.userId, userId), eq(qaBookmarks.messageId, messageId)));
}

export async function getUserQaBookmarks(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ bookmark: qaBookmarks, message: qaMessages, lecture: lectures })
    .from(qaBookmarks).innerJoin(qaMessages, eq(qaBookmarks.messageId, qaMessages.id))
    .innerJoin(lectures, eq(qaBookmarks.lectureId, lectures.id))
    .where(eq(qaBookmarks.userId, userId)).orderBy(desc(qaBookmarks.createdAt));
}

export async function isBookmarked(userId: number, messageId: number) {
  const db = await getDb(); if (!db) return false;
  const result = await db.select().from(qaBookmarks)
    .where(and(eq(qaBookmarks.userId, userId), eq(qaBookmarks.messageId, messageId))).limit(1);
  return result.length > 0;
}

export async function createCertificate(data: InsertCertificate) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(certificates).values(data); return result[0].insertId;
}

export async function getCertificateByCode(code: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(certificates).where(eq(certificates.certificateCode, code)).limit(1);
  return result[0];
}

export async function getUserCertificates(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
}

export async function getSessionHistory(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ session: lectureSessions, lecture: lectures })
    .from(lectureSessions).innerJoin(lectures, eq(lectureSessions.lectureId, lectures.id))
    .where(eq(lectureSessions.instructorId, instructorId))
    .orderBy(desc(lectureSessions.createdAt));
}

export async function createScormPackage(data: InsertScormPackage) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(scormPackages).values(data).$returningId();
  return result;
}

export async function getScormPackagesByUser(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(scormPackages).where(eq(scormPackages.userId, userId)).orderBy(desc(scormPackages.createdAt));
}

export async function getScormPackageById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(scormPackages).where(eq(scormPackages.id, id));
  return rows[0] || null;
}

export async function updateScormPackage(id: number, data: Partial<InsertScormPackage>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(scormPackages).set(data).where(eq(scormPackages.id, id));
}

export async function incrementScormDownloadCount(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(scormPackages).set({ downloadCount: sql`${scormPackages.downloadCount} + 1` }).where(eq(scormPackages.id, id));
}

export async function trackLearningProgress(data: InsertUserLearningHistory) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  // Upsert: update if exists, insert if not
  const existing = await db.select().from(userLearningHistory).where(and(eq(userLearningHistory.userId, data.userId), eq(userLearningHistory.listingId, data.listingId)));
  if (existing.length > 0) {
    await db.update(userLearningHistory).set({
      progressPercent: data.progressPercent,
      watchTimeSec: sql`${userLearningHistory.watchTimeSec} + ${data.watchTimeSec || 0}`,
      lastPositionSec: data.lastPositionSec,
      isCompleted: data.isCompleted,
      completedAt: data.isCompleted ? new Date() : undefined,
      accessCount: sql`${userLearningHistory.accessCount} + 1`,
      lastAccessedAt: new Date(),
    }).where(eq(userLearningHistory.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(userLearningHistory).values(data).$returningId();
  return result.id;
}

export async function getUserLearningHistoryList(userId: number, limit = 20) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(userLearningHistory).where(eq(userLearningHistory.userId, userId)).orderBy(desc(userLearningHistory.lastAccessedAt)).limit(limit);
}

export async function getUserPreferences(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  return rows[0];
}

export async function getCachedRecommendations(userId: number, type: "personalized" | "trending" | "similar" | "new_releases", sourceListingId?: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const conditions = [eq(recommendationCache.userId, userId), eq(recommendationCache.type, type), gte(recommendationCache.expiresAt, new Date())];
  if (sourceListingId) conditions.push(eq(recommendationCache.sourceListingId, sourceListingId));
  const rows = await db.select().from(recommendationCache).where(and(...conditions)).orderBy(desc(recommendationCache.createdAt)).limit(1);
  return rows[0];
}

export async function setCachedRecommendations(data: InsertRecommendationCacheEntry) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  // Delete old cache for same user+type
  await db.delete(recommendationCache).where(and(eq(recommendationCache.userId, data.userId), eq(recommendationCache.type, data.type)));
  const [result] = await db.insert(recommendationCache).values(data).$returningId();
  return result.id;
}
