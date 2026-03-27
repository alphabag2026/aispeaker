import { eq, desc, and, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  voiceProfiles, InsertVoiceProfile, VoiceProfile,
  lectures, InsertLecture, Lecture,
  lectureMaterials, InsertLectureMaterial,
  lectureEnrollments, InsertLectureEnrollment,
  qaMessages, InsertQaMessage,
  whiteboardSnapshots,
  vodRecordings, InsertVodRecording,
  vodTimelineEvents, InsertVodTimelineEvent,
  translations, InsertTranslation,
  learningProgress, InsertLearningProgress,
  vodWatchHistory, InsertVodWatchHistory,
  qaBookmarks, InsertQaBookmark,
  aiContextTemplates, InsertAiContextTemplate,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ User helpers ============

export async function updateUserPlatformRole(userId: number, platformRole: "instructor" | "student") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ platformRole }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; bio?: string; avatarUrl?: string; preferredLang?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserPreferredLang(userId: number, lang: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ preferredLang: lang }).where(eq(users.id, userId));
}

// ============ Voice Profile helpers ============

export async function getVoiceProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voiceProfiles).where(eq(voiceProfiles.userId, userId)).orderBy(desc(voiceProfiles.createdAt));
}

export async function createVoiceProfile(data: InsertVoiceProfile) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(voiceProfiles).values(data);
  return result[0].insertId;
}

export async function updateVoiceProfile(id: number, userId: number, data: Partial<InsertVoiceProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(voiceProfiles).set(data).where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)));
}

export async function deleteVoiceProfile(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(voiceProfiles).where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)));
}

export async function getVoiceProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).limit(1);
  return result[0];
}

// ============ Lecture helpers ============

export async function getLectures(filters?: { category?: string; status?: string; instructorId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.category) conditions.push(eq(lectures.category, filters.category as any));
  if (filters?.status) conditions.push(eq(lectures.status, filters.status as any));
  if (filters?.instructorId) conditions.push(eq(lectures.instructorId, filters.instructorId));
  if (filters?.search) conditions.push(like(lectures.title, `%${filters.search}%`));

  const query = conditions.length > 0
    ? db.select().from(lectures).where(and(...conditions)).orderBy(desc(lectures.createdAt))
    : db.select().from(lectures).orderBy(desc(lectures.createdAt));
  return query;
}

export async function getLectureById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1);
  return result[0];
}

export async function createLecture(data: InsertLecture) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lectures).values(data);
  return result[0].insertId;
}

export async function updateLecture(id: number, instructorId: number, data: Partial<InsertLecture>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lectures).set(data).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}

export async function deleteLecture(id: number, instructorId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lectures).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}

export async function updateLectureStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(lectures).set({ status: status as any }).where(eq(lectures.id, id));
}

// ============ Lecture Material helpers ============

export async function getLectureMaterials(lectureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lectureMaterials).where(eq(lectureMaterials.lectureId, lectureId)).orderBy(lectureMaterials.sortOrder);
}

export async function createLectureMaterial(data: InsertLectureMaterial) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lectureMaterials).values(data);
  return result[0].insertId;
}

export async function deleteLectureMaterial(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lectureMaterials).where(eq(lectureMaterials.id, id));
}

// ============ Enrollment helpers ============

export async function enrollInLecture(lectureId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(lectureEnrollments).values({ lectureId, userId });
  return result[0].insertId;
}

export async function getLectureEnrollments(lectureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: lectureEnrollments,
    user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
  }).from(lectureEnrollments)
    .innerJoin(users, eq(lectureEnrollments.userId, users.id))
    .where(eq(lectureEnrollments.lectureId, lectureId));
}

export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: lectureEnrollments,
    lecture: lectures,
  }).from(lectureEnrollments)
    .innerJoin(lectures, eq(lectureEnrollments.lectureId, lectures.id))
    .where(eq(lectureEnrollments.userId, userId))
    .orderBy(desc(lectureEnrollments.joinedAt));
}

export async function isEnrolled(lectureId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  return result.length > 0;
}

// ============ Q&A Message helpers ============

export async function getQaMessages(lectureId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    message: qaMessages,
    user: { id: users.id, name: users.name },
  }).from(qaMessages)
    .leftJoin(users, eq(qaMessages.userId, users.id))
    .where(eq(qaMessages.lectureId, lectureId))
    .orderBy(qaMessages.createdAt)
    .limit(limit);
}

export async function createQaMessage(data: InsertQaMessage) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(qaMessages).values(data);
  return result[0].insertId;
}

export async function updateQaMessageAvatar(id: number, avatarVideoUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(qaMessages).set({ avatarVideoUrl }).where(eq(qaMessages.id, id));
}

// ============ Whiteboard helpers ============

export async function saveWhiteboardSnapshot(lectureId: number, snapshotData: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(whiteboardSnapshots).values({ lectureId, snapshotData });
}

export async function getLatestWhiteboardSnapshot(lectureId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.lectureId, lectureId))
    .orderBy(desc(whiteboardSnapshots.createdAt))
    .limit(1);
  return result[0];
}

export async function getWhiteboardSnapshots(lectureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.lectureId, lectureId))
    .orderBy(whiteboardSnapshots.createdAt);
}

// ============ Stats helpers ============

export async function getLectureStats(instructorId: number) {
  const db = await getDb();
  if (!db) return { totalLectures: 0, totalStudents: 0, liveLectures: 0, totalVods: 0 };
  const lectureList = await db.select().from(lectures).where(eq(lectures.instructorId, instructorId));
  let totalStudents = 0;
  let liveLectures = 0;
  for (const l of lectureList) {
    if (l.status === 'live') liveLectures++;
    const enrollments = await db.select().from(lectureEnrollments).where(eq(lectureEnrollments.lectureId, l.id));
    totalStudents += enrollments.length;
  }
  const vods = await db.select().from(vodRecordings)
    .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(lectures.instructorId, instructorId));
  return { totalLectures: lectureList.length, totalStudents, liveLectures, totalVods: vods.length };
}

// ============ VOD Recording helpers ============

export async function createVodRecording(data: InsertVodRecording) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(vodRecordings).values(data);
  return result[0].insertId;
}

export async function getVodRecordings(filters?: { lectureId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.lectureId) conditions.push(eq(vodRecordings.lectureId, filters.lectureId));
  if (filters?.status) conditions.push(eq(vodRecordings.status, filters.status as any));

  const query = conditions.length > 0
    ? db.select({ vod: vodRecordings, lecture: lectures })
      .from(vodRecordings)
      .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
      .where(and(...conditions))
      .orderBy(desc(vodRecordings.createdAt))
    : db.select({ vod: vodRecordings, lecture: lectures })
      .from(vodRecordings)
      .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
      .orderBy(desc(vodRecordings.createdAt));
  return query;
}

export async function getVodById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ vod: vodRecordings, lecture: lectures })
    .from(vodRecordings)
    .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(vodRecordings.id, id))
    .limit(1);
  return result[0];
}

export async function updateVodRecording(id: number, data: Partial<InsertVodRecording>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vodRecordings).set(data).where(eq(vodRecordings.id, id));
}

export async function incrementVodViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(vodRecordings).set({ viewCount: sql`${vodRecordings.viewCount} + 1` }).where(eq(vodRecordings.id, id));
}

export async function deleteVodRecording(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(vodTimelineEvents).where(eq(vodTimelineEvents.vodId, id));
  await db.delete(vodRecordings).where(eq(vodRecordings.id, id));
}

// ============ VOD Timeline Event helpers ============

export async function createVodTimelineEvent(data: InsertVodTimelineEvent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(vodTimelineEvents).values(data);
  return result[0].insertId;
}

export async function getVodTimelineEvents(vodId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    event: vodTimelineEvents,
    user: { id: users.id, name: users.name },
  }).from(vodTimelineEvents)
    .leftJoin(users, eq(vodTimelineEvents.userId, users.id))
    .where(eq(vodTimelineEvents.vodId, vodId))
    .orderBy(vodTimelineEvents.offsetSeconds);
}

// ============ Translation helpers ============

export async function getTranslation(sourceType: string, sourceId: number, targetLang: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(translations)
    .where(and(
      eq(translations.sourceType, sourceType as any),
      eq(translations.sourceId, sourceId),
      eq(translations.targetLang, targetLang),
    ))
    .limit(1);
  return result[0];
}

export async function createTranslation(data: InsertTranslation) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(translations).values(data);
  return result[0].insertId;
}

export async function getTranslationsForSource(sourceType: string, sourceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(translations)
    .where(and(
      eq(translations.sourceType, sourceType as any),
      eq(translations.sourceId, sourceId),
    ));
}

// ============ Learning Progress helpers ============

export async function getOrCreateLearningProgress(userId: number, lectureId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(learningProgress).values({ userId, lectureId });
  const created = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)))
    .limit(1);
  return created[0] || null;
}

export async function updateLearningProgress(userId: number, lectureId: number, data: Partial<InsertLearningProgress>) {
  const db = await getDb();
  if (!db) return;
  await db.update(learningProgress).set({ ...data, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function incrementQuestionCount(userId: number, lectureId: number) {
  const db = await getDb();
  if (!db) return;
  // Ensure record exists
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress)
    .set({
      questionsAsked: sql`${learningProgress.questionsAsked} + 1`,
      lastActivityAt: new Date(),
    })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function incrementAnswerCount(userId: number, lectureId: number) {
  const db = await getDb();
  if (!db) return;
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress)
    .set({
      answersReceived: sql`${learningProgress.answersReceived} + 1`,
      lastActivityAt: new Date(),
    })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function getUserLearningProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    progress: learningProgress,
    lecture: lectures,
  }).from(learningProgress)
    .innerJoin(lectures, eq(learningProgress.lectureId, lectures.id))
    .where(eq(learningProgress.userId, userId))
    .orderBy(desc(learningProgress.lastActivityAt));
}

export async function getLearningProgressForLecture(userId: number, lectureId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)))
    .limit(1);
  return result[0] || null;
}

// ============ VOD Watch History helpers ============

export async function getOrCreateVodWatchHistory(userId: number, vodId: number, totalSeconds: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(vodWatchHistory)
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(vodWatchHistory).values({ userId, vodId, totalSeconds });
  const created = await db.select().from(vodWatchHistory)
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId)))
    .limit(1);
  return created[0] || null;
}

export async function updateVodWatchProgress(userId: number, vodId: number, watchedSeconds: number, totalSeconds: number) {
  const db = await getDb();
  if (!db) return;
  await getOrCreateVodWatchHistory(userId, vodId, totalSeconds);
  const completionPercent = totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : 0;
  await db.update(vodWatchHistory)
    .set({
      watchedSeconds,
      totalSeconds,
      completionPercent,
      lastWatchedAt: new Date(),
    })
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId)));
}

export async function getUserVodWatchHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    history: vodWatchHistory,
    vod: vodRecordings,
    lecture: lectures,
  }).from(vodWatchHistory)
    .innerJoin(vodRecordings, eq(vodWatchHistory.vodId, vodRecordings.id))
    .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(vodWatchHistory.userId, userId))
    .orderBy(desc(vodWatchHistory.lastWatchedAt));
}

// ============ Q&A Bookmark helpers ============

export async function createQaBookmark(data: InsertQaBookmark) {
  const db = await getDb();
  if (!db) return null;
  // Check if already bookmarked
  const existing = await db.select().from(qaBookmarks)
    .where(and(eq(qaBookmarks.userId, data.userId), eq(qaBookmarks.messageId, data.messageId)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(qaBookmarks).values(data);
  return result[0].insertId;
}

export async function deleteQaBookmark(userId: number, messageId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(qaBookmarks).where(and(eq(qaBookmarks.userId, userId), eq(qaBookmarks.messageId, messageId)));
}

export async function getUserQaBookmarks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    bookmark: qaBookmarks,
    message: qaMessages,
    lecture: lectures,
  }).from(qaBookmarks)
    .innerJoin(qaMessages, eq(qaBookmarks.messageId, qaMessages.id))
    .innerJoin(lectures, eq(qaBookmarks.lectureId, lectures.id))
    .where(eq(qaBookmarks.userId, userId))
    .orderBy(desc(qaBookmarks.createdAt));
}

export async function isBookmarked(userId: number, messageId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(qaBookmarks)
    .where(and(eq(qaBookmarks.userId, userId), eq(qaBookmarks.messageId, messageId)))
    .limit(1);
  return result.length > 0;
}

// ============ AI Context Template helpers ============

export async function getAiContextTemplates(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(aiContextTemplates)
      .where(eq(aiContextTemplates.category, category as any))
      .orderBy(desc(aiContextTemplates.usageCount));
  }
  return db.select().from(aiContextTemplates).orderBy(desc(aiContextTemplates.usageCount));
}

export async function getAiContextTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiContextTemplates).where(eq(aiContextTemplates.id, id)).limit(1);
  return result[0];
}

export async function createAiContextTemplate(data: InsertAiContextTemplate) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiContextTemplates).values(data);
  return result[0].insertId;
}

export async function updateAiContextTemplate(id: number, data: Partial<InsertAiContextTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiContextTemplates).set(data).where(eq(aiContextTemplates.id, id));
}

export async function deleteAiContextTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(aiContextTemplates).where(and(eq(aiContextTemplates.id, id), eq(aiContextTemplates.isBuiltIn, false)));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiContextTemplates)
    .set({ usageCount: sql`${aiContextTemplates.usageCount} + 1` })
    .where(eq(aiContextTemplates.id, id));
}

export async function seedBuiltInTemplates() {
  const db = await getDb();
  if (!db) return;
  // Check if already seeded
  const existing = await db.select().from(aiContextTemplates).where(eq(aiContextTemplates.isBuiltIn, true)).limit(1);
  if (existing.length > 0) return;

  const templates: InsertAiContextTemplate[] = [
    {
      category: "web3",
      name: "Web3 기초 입문",
      description: "Web3의 기본 개념, 탈중앙화, 블록체인 기초를 다루는 입문 강의",
      systemPrompt: "당신은 Web3 전문 강사입니다. 블록체인, 탈중앙화, 스마트 컨트랙트, 지갑 사용법 등 Web3의 기초 개념을 쉽고 친절하게 설명합니다. 비유와 실생활 예시를 활용하여 초보자도 이해할 수 있도록 합니다. 항상 최신 트렌드를 반영하고, 실습 가능한 예제를 제공합니다.",
      topics: "블록체인 기초, 탈중앙화, 스마트 컨트랙트, 지갑, dApp",
      difficulty: "beginner",
      isBuiltIn: true,
    },
    {
      category: "web3",
      name: "Web3 개발자 과정",
      description: "Solidity, Hardhat, Ethers.js를 활용한 Web3 개발 실전",
      systemPrompt: "당신은 Web3 개발 전문 강사입니다. Solidity 스마트 컨트랙트 개발, Hardhat 프레임워크, Ethers.js, Web3.js 라이브러리 사용법을 가르칩니다. 코드 예제와 함께 설명하고, 보안 취약점과 가스 최적화도 다룹니다. 실전 프로젝트 기반으로 교육합니다.",
      topics: "Solidity, Hardhat, Ethers.js, 스마트 컨트랙트 보안, 가스 최적화",
      difficulty: "intermediate",
      isBuiltIn: true,
    },
    {
      category: "defi",
      name: "DeFi 프로토콜 이해",
      description: "탈중앙화 금융의 핵심 프로토콜과 메커니즘 분석",
      systemPrompt: "당신은 DeFi 전문 분석가이자 강사입니다. AMM, 유동성 풀, 이자 농사, 플래시론, 오라클 등 DeFi 핵심 메커니즘을 깊이 있게 설명합니다. Uniswap, Aave, Compound, Curve 등 주요 프로토콜의 작동 원리를 분석하고, 리스크 관리 방법도 함께 교육합니다.",
      topics: "AMM, 유동성 풀, 이자 농사, 플래시론, 오라클, TVL 분석",
      difficulty: "intermediate",
      isBuiltIn: true,
    },
    {
      category: "nft",
      name: "NFT 크리에이터 가이드",
      description: "NFT 제작, 민팅, 마켓플레이스 활용 완전 가이드",
      systemPrompt: "당신은 NFT 전문 강사입니다. NFT의 기술적 원리(ERC-721, ERC-1155), 디지털 아트 제작, 메타데이터 설정, IPFS 저장, 민팅 과정, OpenSea/Blur 등 마켓플레이스 활용법을 가르칩니다. 로열티 설정, 컬렉션 전략, 커뮤니티 빌딩까지 포괄적으로 다룹니다.",
      topics: "ERC-721, ERC-1155, IPFS, 민팅, 마켓플레이스, 로열티",
      difficulty: "beginner",
      isBuiltIn: true,
    },
    {
      category: "blockchain",
      name: "블록체인 아키텍처 심화",
      description: "합의 알고리즘, 레이어2, 크로스체인 기술 심화",
      systemPrompt: "당신은 블록체인 아키텍처 전문가입니다. PoW, PoS, DPoS 등 합의 알고리즘, 레이어2 솔루션(Rollup, Plasma, State Channel), 크로스체인 브릿지, 샤딩, 데이터 가용성 등 블록체인 인프라의 심화 주제를 다룹니다. 이더리움, 솔라나, 코스모스 등 주요 체인의 기술적 차이를 비교 분석합니다.",
      topics: "합의 알고리즘, 레이어2, 크로스체인, 샤딩, 데이터 가용성",
      difficulty: "advanced",
      isBuiltIn: true,
    },
    {
      category: "ai",
      name: "AI 기초와 ChatGPT 활용",
      description: "AI/ML 기초 개념과 ChatGPT, 프롬프트 엔지니어링",
      systemPrompt: "당신은 AI 교육 전문 강사입니다. 인공지능과 머신러닝의 기초 개념, ChatGPT와 같은 LLM의 작동 원리, 프롬프트 엔지니어링 기법, AI 도구 활용법을 가르칩니다. 실무에서 AI를 효과적으로 활용하는 방법과 최신 AI 트렌드를 쉽게 설명합니다.",
      topics: "AI/ML 기초, LLM, 프롬프트 엔지니어링, ChatGPT, AI 도구 활용",
      difficulty: "beginner",
      isBuiltIn: true,
    },
    {
      category: "ai",
      name: "AI 개발 실전",
      description: "Python, TensorFlow, LangChain을 활용한 AI 애플리케이션 개발",
      systemPrompt: "당신은 AI 개발 전문 강사입니다. Python 기반 AI 개발, TensorFlow/PyTorch 프레임워크, LangChain을 활용한 LLM 애플리케이션 개발, RAG 시스템 구축, 파인튜닝 등을 가르칩니다. 코드 예제와 함께 실전 프로젝트를 진행하며, 모델 배포와 최적화도 다룹니다.",
      topics: "Python, TensorFlow, PyTorch, LangChain, RAG, 파인튜닝",
      difficulty: "advanced",
      isBuiltIn: true,
    },
    {
      category: "metaverse",
      name: "메타버스 생태계 이해",
      description: "메타버스 플랫폼, 가상 경제, 디지털 트윈 개념",
      systemPrompt: "당신은 메타버스 전문 강사입니다. 메타버스의 개념과 발전 방향, 주요 플랫폼(Decentraland, The Sandbox, Roblox), 가상 경제 시스템, 디지털 트윈, XR(VR/AR/MR) 기술, 가상 부동산, 아바타 경제 등을 다룹니다. Web3와 메타버스의 융합 트렌드도 분석합니다.",
      topics: "메타버스 플랫폼, 가상 경제, 디지털 트윈, XR, 가상 부동산",
      difficulty: "beginner",
      isBuiltIn: true,
    },
    {
      category: "general",
      name: "범용 기술 강의",
      description: "다양한 기술 주제를 다루는 범용 템플릿",
      systemPrompt: "당신은 전문적인 기술 강사입니다. 학생들의 질문에 정확하고 이해하기 쉽게 답변합니다. 복잡한 개념은 단계적으로 설명하고, 실생활 예시와 비유를 활용합니다. 최신 기술 트렌드를 반영하며, 실습 가능한 예제를 제공합니다.",
      topics: "프로그래밍, 웹 개발, 데이터베이스, 클라우드, DevOps",
      difficulty: "beginner",
      isBuiltIn: true,
    },
  ];

  for (const template of templates) {
    await db.insert(aiContextTemplates).values(template);
  }
}
