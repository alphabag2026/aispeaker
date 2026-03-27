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
