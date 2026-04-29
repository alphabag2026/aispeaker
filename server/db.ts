import { eq, desc, asc, and, like, sql, gte, or } from "drizzle-orm";
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
  faceSwapProfiles, InsertFaceSwapProfile,
  voiceModProfiles, InsertVoiceModProfile,
  platformIntegrations, InsertPlatformIntegration,
  certificates, InsertCertificate,
  lectureSessions, InsertLectureSession,
  lectureScripts, InsertLectureScript,
  productionPipelines, InsertProductionPipeline,
  scriptTemplates, InsertScriptTemplate,
  scriptVersions, InsertScriptVersion,
  contentAnalyses, InsertContentAnalysis,
  liveBroadcasts, InsertLiveBroadcast,
  broadcastViewers, InsertBroadcastViewer,
  broadcastChats, InsertBroadcastChat,
  sampleFaces, InsertSampleFace,
  sampleVoices, InsertSampleVoice,
  subscriptionPlans, InsertSubscriptionPlan,
  userSubscriptions, InsertUserSubscription,
  creditTransactions, InsertCreditTransaction,
  payments, InsertPayment,
  cryptoPayments, InsertCryptoPayment,
  creditUsageLogs, InsertCreditUsageLog,
  passwordResetTokens,
  apiUsageLogs, InsertApiUsageLog,
  faceSwapGallery, InsertFaceSwapGalleryItem,
  galleryLikes, galleryComments,
  pipSettings, InsertPipSetting,
  pptUploads, InsertPptUpload,
  lectureProjects, InsertLectureProject,
  videoGenerations, InsertVideoGeneration,
  projectAvatars, InsertProjectAvatar,
  projectSlides, InsertProjectSlide,
  slideScripts, InsertSlideScript,
  slideAnnotations, InsertSlideAnnotation,
  slideScriptVersions, InsertSlideScriptVersion,
  lectureFormatTemplates, InsertLectureFormatTemplate,
  slideTransitions, InsertSlideTransition,
  whiteboardSessions, InsertWhiteboardSession,
  whiteboardParticipants,
  slideLayouts, InsertSlideLayout,
  projectWatermarks, InsertProjectWatermark,
  galleryPosts, InsertGalleryPost,
  pipPresets, InsertPipPreset,
  sharedPresets, InsertSharedPreset,
  sharedPresetLikes,
  subtitleStyles, InsertSubtitleStyle,
  sharedSubtitlePresets, InsertSharedSubtitlePreset,
  sharedSubtitlePresetLikes,
  presetTags, InsertPresetTag,
  presetTagMap,
  presetReports, InsertPresetReport,
  presetVersions, InsertPresetVersion,
  blockedPresets,
  notifications, InsertNotification,
  presetComments, InsertPresetComment,
  scormPackages, InsertScormPackage,
  creatorProfiles, InsertCreatorProfile,
  marketplaceListings, InsertMarketplaceListing,
  marketplacePurchases, InsertMarketplacePurchase,
  marketplaceReviews, InsertMarketplaceReview,
  creatorPayouts, InsertCreatorPayout,
  userLearningHistory, InsertUserLearningHistory,
  userPreferences, InsertUserPreference,
  recommendationCache, InsertRecommendationCacheEntry,
  interpretationSessions, InsertInterpretationSession,
  translationSegments, InsertTranslationSegment,
  supportedLanguages, InsertSupportedLanguage,
  systemSettings, InsertSystemSetting,
  projectCollaborators, InsertProjectCollaborator,
  voiceClones, InsertVoiceClone,
  broadcastRecordings, InsertBroadcastRecording,
  broadcastAnalytics, InsertBroadcastAnalytic,
  userAvatars, InsertUserAvatar,
  didVideoHistory, InsertDidVideoHistory,
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
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Email/Google Auth helpers ============
export async function getUserByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminCount() {
  const db = await getDb(); if (!db) return 1; // assume admin exists if db unavailable
  const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin'));
  return result[0]?.count ?? 0;
}

export async function createUserWithEmail(data: { email: string; passwordHash: string; name: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // First user becomes admin automatically
  const adminCount = await getAdminCount();
  const isFirstUser = adminCount === 0;
  const result = await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    loginMethod: "email",
    role: isFirstUser ? "admin" : "user",
    platformRole: isFirstUser ? "instructor" : "student",
    openId: `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

export async function createUserWithGoogle(data: { googleId: string; email: string; name: string; avatarUrl?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // First user becomes admin automatically
  const adminCount = await getAdminCount();
  const isFirstUser = adminCount === 0;
  const result = await db.insert(users).values({
    googleId: data.googleId,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatarUrl || null,
    loginMethod: "google",
    role: isFirstUser ? "admin" : "user",
    platformRole: isFirstUser ? "instructor" : "student",
    openId: `google_${data.googleId}`,
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

// ============ Password Reset ============
export async function savePasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // Delete any existing tokens for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  return result[0];
}

export async function deletePasswordResetToken(token: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function linkGoogleToUser(userId: number, googleId: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ googleId }).where(eq(users.id, userId));
}

// ============ User helpers ============
export async function updateUserPlatformRole(userId: number, platformRole: "instructor" | "student") {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ platformRole }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; bio?: string; avatarUrl?: string; preferredLang?: string }) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserPreferredLang(userId: number, lang: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ preferredLang: lang }).where(eq(users.id, userId));
}

// ============ Voice Profile helpers ============
export async function getVoiceProfiles(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(voiceProfiles).where(eq(voiceProfiles.userId, userId)).orderBy(desc(voiceProfiles.createdAt));
}
export async function createVoiceProfile(data: InsertVoiceProfile) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(voiceProfiles).values(data); return result[0].insertId;
}
export async function updateVoiceProfile(id: number, userId: number, data: Partial<InsertVoiceProfile>) {
  const db = await getDb(); if (!db) return;
  await db.update(voiceProfiles).set(data).where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)));
}
export async function deleteVoiceProfile(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(voiceProfiles).where(and(eq(voiceProfiles.id, id), eq(voiceProfiles.userId, userId)));
}
export async function getVoiceProfileById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).limit(1);
  return result[0];
}

// ============ Lecture helpers ============
export async function getLectures(filters?: { category?: string; status?: string; instructorId?: number; search?: string }) {
  const db = await getDb(); if (!db) return [];
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
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1);
  return result[0];
}
export async function createLecture(data: InsertLecture) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectures).values(data); return result[0].insertId;
}
export async function updateLecture(id: number, instructorId: number, data: Partial<InsertLecture>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectures).set(data).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}
export async function deleteLecture(id: number, instructorId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectures).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}
export async function updateLectureStatus(id: number, status: string) {
  const db = await getDb(); if (!db) return;
  await db.update(lectures).set({ status: status as any }).where(eq(lectures.id, id));
}

// ============ Lecture Material helpers ============
export async function getLectureMaterials(lectureId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(lectureMaterials).where(eq(lectureMaterials.lectureId, lectureId)).orderBy(lectureMaterials.sortOrder);
}
export async function createLectureMaterial(data: InsertLectureMaterial) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureMaterials).values(data); return result[0].insertId;
}
export async function deleteLectureMaterial(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectureMaterials).where(eq(lectureMaterials.id, id));
}

// ============ Enrollment helpers ============
export async function enrollInLecture(lectureId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(lectureEnrollments).values({ lectureId, userId });
  return result[0].insertId;
}
export async function getLectureEnrollments(lectureId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ enrollment: lectureEnrollments, user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl } })
    .from(lectureEnrollments).innerJoin(users, eq(lectureEnrollments.userId, users.id))
    .where(eq(lectureEnrollments.lectureId, lectureId));
}
export async function getUserEnrollments(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ enrollment: lectureEnrollments, lecture: lectures })
    .from(lectureEnrollments).innerJoin(lectures, eq(lectureEnrollments.lectureId, lectures.id))
    .where(eq(lectureEnrollments.userId, userId)).orderBy(desc(lectureEnrollments.joinedAt));
}
export async function isEnrolled(lectureId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const result = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  return result.length > 0;
}

// ============ Q&A Message helpers ============
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
export async function updateQaMessageAvatar(id: number, avatarVideoUrl: string) {
  const db = await getDb(); if (!db) return;
  await db.update(qaMessages).set({ avatarVideoUrl }).where(eq(qaMessages.id, id));
}

// ============ Whiteboard helpers ============
export async function saveWhiteboardSnapshot(lectureId: number, snapshotData: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(whiteboardSnapshots).values({ lectureId, snapshotData });
}
export async function getLatestWhiteboardSnapshot(lectureId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.lectureId, lectureId)).orderBy(desc(whiteboardSnapshots.createdAt)).limit(1);
  return result[0];
}
export async function getWhiteboardSnapshots(lectureId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(whiteboardSnapshots)
    .where(eq(whiteboardSnapshots.lectureId, lectureId)).orderBy(whiteboardSnapshots.createdAt);
}

// ============ Stats helpers ============
export async function getLectureStats(instructorId: number) {
  const db = await getDb(); if (!db) return { totalLectures: 0, totalStudents: 0, liveLectures: 0, totalVods: 0 };
  const lectureList = await db.select().from(lectures).where(eq(lectures.instructorId, instructorId));
  let totalStudents = 0, liveLectures = 0;
  for (const l of lectureList) {
    if (l.status === 'live') liveLectures++;
    const enrollments = await db.select().from(lectureEnrollments).where(eq(lectureEnrollments.lectureId, l.id));
    totalStudents += enrollments.length;
  }
  const vods = await db.select().from(vodRecordings).innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(lectures.instructorId, instructorId));
  return { totalLectures: lectureList.length, totalStudents, liveLectures, totalVods: vods.length };
}

// ============ VOD Recording helpers ============
export async function createVodRecording(data: InsertVodRecording) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(vodRecordings).values(data); return result[0].insertId;
}
export async function getVodRecordings(filters?: { lectureId?: number; status?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.lectureId) conditions.push(eq(vodRecordings.lectureId, filters.lectureId));
  if (filters?.status) conditions.push(eq(vodRecordings.status, filters.status as any));
  const query = conditions.length > 0
    ? db.select({ vod: vodRecordings, lecture: lectures }).from(vodRecordings)
      .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id)).where(and(...conditions)).orderBy(desc(vodRecordings.createdAt))
    : db.select({ vod: vodRecordings, lecture: lectures }).from(vodRecordings)
      .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id)).orderBy(desc(vodRecordings.createdAt));
  return query;
}
export async function getVodById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select({ vod: vodRecordings, lecture: lectures }).from(vodRecordings)
    .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id)).where(eq(vodRecordings.id, id)).limit(1);
  return result[0];
}
export async function updateVodRecording(id: number, data: Partial<InsertVodRecording>) {
  const db = await getDb(); if (!db) return;
  await db.update(vodRecordings).set(data).where(eq(vodRecordings.id, id));
}
export async function incrementVodViewCount(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(vodRecordings).set({ viewCount: sql`${vodRecordings.viewCount} + 1` }).where(eq(vodRecordings.id, id));
}
export async function deleteVodRecording(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(vodTimelineEvents).where(eq(vodTimelineEvents.vodId, id));
  await db.delete(vodRecordings).where(eq(vodRecordings.id, id));
}

// ============ VOD Timeline Event helpers ============
export async function createVodTimelineEvent(data: InsertVodTimelineEvent) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(vodTimelineEvents).values(data); return result[0].insertId;
}
export async function getVodTimelineEvents(vodId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ event: vodTimelineEvents, user: { id: users.id, name: users.name } })
    .from(vodTimelineEvents).leftJoin(users, eq(vodTimelineEvents.userId, users.id))
    .where(eq(vodTimelineEvents.vodId, vodId)).orderBy(vodTimelineEvents.offsetSeconds);
}

// ============ Translation helpers ============
export async function getTranslation(sourceType: string, sourceId: number, targetLang: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(translations)
    .where(and(eq(translations.sourceType, sourceType as any), eq(translations.sourceId, sourceId), eq(translations.targetLang, targetLang))).limit(1);
  return result[0];
}
export async function createTranslation(data: InsertTranslation) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(translations).values(data); return result[0].insertId;
}
export async function getTranslationsForSource(sourceType: string, sourceId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(translations).where(and(eq(translations.sourceType, sourceType as any), eq(translations.sourceId, sourceId)));
}

// ============ Learning Progress helpers ============
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
export async function incrementQuestionCount(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return;
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress).set({ questionsAsked: sql`${learningProgress.questionsAsked} + 1`, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}
export async function incrementAnswerCount(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return;
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress).set({ answersReceived: sql`${learningProgress.answersReceived} + 1`, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}
export async function getUserLearningProgress(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ progress: learningProgress, lecture: lectures })
    .from(learningProgress).innerJoin(lectures, eq(learningProgress.lectureId, lectures.id))
    .where(eq(learningProgress.userId, userId)).orderBy(desc(learningProgress.lastActivityAt));
}
export async function getLearningProgressForLecture(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId))).limit(1);
  return result[0] || null;
}

// ============ VOD Watch History helpers ============
export async function getOrCreateVodWatchHistory(userId: number, vodId: number, totalSeconds: number) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(vodWatchHistory)
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId))).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(vodWatchHistory).values({ userId, vodId, totalSeconds });
  const created = await db.select().from(vodWatchHistory)
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId))).limit(1);
  return created[0] || null;
}
export async function updateVodWatchProgress(userId: number, vodId: number, watchedSeconds: number, totalSeconds: number) {
  const db = await getDb(); if (!db) return;
  await getOrCreateVodWatchHistory(userId, vodId, totalSeconds);
  const completionPercent = totalSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100)) : 0;
  await db.update(vodWatchHistory).set({ watchedSeconds, totalSeconds, completionPercent, lastWatchedAt: new Date() })
    .where(and(eq(vodWatchHistory.userId, userId), eq(vodWatchHistory.vodId, vodId)));
}
export async function getUserVodWatchHistory(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ history: vodWatchHistory, vod: vodRecordings, lecture: lectures })
    .from(vodWatchHistory).innerJoin(vodRecordings, eq(vodWatchHistory.vodId, vodRecordings.id))
    .innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(vodWatchHistory.userId, userId)).orderBy(desc(vodWatchHistory.lastWatchedAt));
}

// ============ Q&A Bookmark helpers ============
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

// ============ AI Context Template helpers ============
export async function getAiContextTemplates(category?: string) {
  const db = await getDb(); if (!db) return [];
  if (category) return db.select().from(aiContextTemplates).where(eq(aiContextTemplates.category, category as any)).orderBy(desc(aiContextTemplates.usageCount));
  return db.select().from(aiContextTemplates).orderBy(desc(aiContextTemplates.usageCount));
}
export async function getAiContextTemplateById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(aiContextTemplates).where(eq(aiContextTemplates.id, id)).limit(1);
  return result[0];
}
export async function createAiContextTemplate(data: InsertAiContextTemplate) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(aiContextTemplates).values(data); return result[0].insertId;
}
export async function updateAiContextTemplate(id: number, data: Partial<InsertAiContextTemplate>) {
  const db = await getDb(); if (!db) return;
  await db.update(aiContextTemplates).set(data).where(eq(aiContextTemplates.id, id));
}
export async function deleteAiContextTemplate(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(aiContextTemplates).where(and(eq(aiContextTemplates.id, id), eq(aiContextTemplates.isBuiltIn, false)));
}
export async function incrementTemplateUsage(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(aiContextTemplates).set({ usageCount: sql`${aiContextTemplates.usageCount} + 1` }).where(eq(aiContextTemplates.id, id));
}
export async function seedBuiltInTemplates() {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(aiContextTemplates).where(eq(aiContextTemplates.isBuiltIn, true)).limit(1);
  if (existing.length > 0) return;
  const templates: InsertAiContextTemplate[] = [
    { category: "web3", name: "Web3 기초 입문", description: "Web3의 기본 개념, 탈중앙화, 블록체인 기초를 다루는 입문 강의", systemPrompt: "당신은 Web3 전문 강사입니다. 블록체인, 탈중앙화, 스마트 컨트랙트, 지갑 사용법 등 Web3의 기초 개념을 쉽고 친절하게 설명합니다.", topics: "블록체인 기초, 탈중앙화, 스마트 컨트랙트, 지갑, dApp", difficulty: "beginner", isBuiltIn: true },
    { category: "web3", name: "Web3 개발자 과정", description: "Solidity, Hardhat, Ethers.js를 활용한 Web3 개발 실전", systemPrompt: "당신은 Web3 개발 전문 강사입니다. Solidity 스마트 컨트랙트 개발, Hardhat 프레임워크, Ethers.js 사용법을 가르칩니다.", topics: "Solidity, Hardhat, Ethers.js, 스마트 컨트랙트 보안", difficulty: "intermediate", isBuiltIn: true },
    { category: "defi", name: "DeFi 프로토콜 이해", description: "탈중앙화 금융의 핵심 프로토콜과 메커니즘 분석", systemPrompt: "당신은 DeFi 전문 분석가이자 강사입니다. AMM, 유동성 풀, 이자 농사, 플래시론 등 DeFi 핵심 메커니즘을 설명합니다.", topics: "AMM, 유동성 풀, 이자 농사, 플래시론, 오라클", difficulty: "intermediate", isBuiltIn: true },
    { category: "nft", name: "NFT 크리에이터 가이드", description: "NFT 제작, 민팅, 마켓플레이스 활용 가이드", systemPrompt: "당신은 NFT 전문 강사입니다. NFT의 기술적 원리, 디지털 아트 제작, 민팅, 마켓플레이스 활용법을 가르칩니다.", topics: "ERC-721, ERC-1155, IPFS, 민팅, 마켓플레이스", difficulty: "beginner", isBuiltIn: true },
    { category: "blockchain", name: "블록체인 아키텍처 심화", description: "합의 알고리즘, 레이어2, 크로스체인 기술 심화", systemPrompt: "당신은 블록체인 아키텍처 전문가입니다. 합의 알고리즘, 레이어2, 크로스체인 브릿지 등을 다룹니다.", topics: "합의 알고리즘, 레이어2, 크로스체인, 샤딩", difficulty: "advanced", isBuiltIn: true },
    { category: "ai", name: "AI 기초와 ChatGPT 활용", description: "AI/ML 기초 개념과 ChatGPT, 프롬프트 엔지니어링", systemPrompt: "당신은 AI 교육 전문 강사입니다. AI/ML 기초, LLM, 프롬프트 엔지니어링을 가르칩니다.", topics: "AI/ML 기초, LLM, 프롬프트 엔지니어링, ChatGPT", difficulty: "beginner", isBuiltIn: true },
    { category: "ai", name: "AI 개발 실전", description: "Python, TensorFlow, LangChain을 활용한 AI 개발", systemPrompt: "당신은 AI 개발 전문 강사입니다. Python 기반 AI 개발, LangChain, RAG 시스템 구축을 가르칩니다.", topics: "Python, TensorFlow, LangChain, RAG, 파인튜닝", difficulty: "advanced", isBuiltIn: true },
    { category: "metaverse", name: "메타버스 생태계 이해", description: "메타버스 플랫폼, 가상 경제, 디지털 트윈", systemPrompt: "당신은 메타버스 전문 강사입니다. 메타버스 플랫폼, 가상 경제, XR 기술을 다룹니다.", topics: "메타버스 플랫폼, 가상 경제, 디지털 트윈, XR", difficulty: "beginner", isBuiltIn: true },
    { category: "general", name: "범용 기술 강의", description: "다양한 기술 주제를 다루는 범용 템플릿", systemPrompt: "당신은 전문적인 기술 강사입니다. 학생들의 질문에 정확하고 이해하기 쉽게 답변합니다.", topics: "프로그래밍, 웹 개발, 데이터베이스, 클라우드", difficulty: "beginner", isBuiltIn: true },
  ];
  for (const template of templates) await db.insert(aiContextTemplates).values(template);
}

// ============ Face Swap Profile helpers (v2.0) ============
export async function getFaceSwapProfiles(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(faceSwapProfiles).where(eq(faceSwapProfiles.userId, userId)).orderBy(desc(faceSwapProfiles.createdAt));
}
export async function createFaceSwapProfile(data: InsertFaceSwapProfile) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(faceSwapProfiles).values(data); return result[0].insertId;
}
export async function updateFaceSwapProfile(id: number, userId: number, data: Partial<InsertFaceSwapProfile>) {
  const db = await getDb(); if (!db) return;
  await db.update(faceSwapProfiles).set(data).where(and(eq(faceSwapProfiles.id, id), eq(faceSwapProfiles.userId, userId)));
}
export async function deleteFaceSwapProfile(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(faceSwapProfiles).where(and(eq(faceSwapProfiles.id, id), eq(faceSwapProfiles.userId, userId)));
}
export async function getFaceSwapProfileById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(faceSwapProfiles).where(eq(faceSwapProfiles.id, id)).limit(1);
  return result[0];
}

// ============ Voice Modulation Profile helpers (v2.0) ============
export async function getVoiceModProfiles(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(voiceModProfiles).where(eq(voiceModProfiles.userId, userId)).orderBy(desc(voiceModProfiles.createdAt));
}
export async function createVoiceModProfile(data: InsertVoiceModProfile) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(voiceModProfiles).values(data); return result[0].insertId;
}
export async function updateVoiceModProfile(id: number, userId: number, data: Partial<InsertVoiceModProfile>) {
  const db = await getDb(); if (!db) return;
  await db.update(voiceModProfiles).set(data).where(and(eq(voiceModProfiles.id, id), eq(voiceModProfiles.userId, userId)));
}
export async function deleteVoiceModProfile(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(voiceModProfiles).where(and(eq(voiceModProfiles.id, id), eq(voiceModProfiles.userId, userId)));
}
export async function getVoiceModProfileById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(voiceModProfiles).where(eq(voiceModProfiles.id, id)).limit(1);
  return result[0];
}

// ============ Platform Integration helpers (v2.0) ============
export async function getPlatformIntegrations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformIntegrations).where(eq(platformIntegrations.userId, userId)).orderBy(desc(platformIntegrations.createdAt));
}
export async function createPlatformIntegration(data: InsertPlatformIntegration) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(platformIntegrations).values(data); return result[0].insertId;
}
export async function updatePlatformIntegration(id: number, userId: number, data: Partial<InsertPlatformIntegration>) {
  const db = await getDb(); if (!db) return;
  await db.update(platformIntegrations).set(data).where(and(eq(platformIntegrations.id, id), eq(platformIntegrations.userId, userId)));
}
export async function deletePlatformIntegration(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(platformIntegrations).where(and(eq(platformIntegrations.id, id), eq(platformIntegrations.userId, userId)));
}
export async function getPlatformIntegrationById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(platformIntegrations).where(eq(platformIntegrations.id, id)).limit(1);
  return result[0];
}

// ============ Certificate helpers (v2.0) ============
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
export async function getCertificateForLecture(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.lectureId, lectureId))).limit(1);
  return result[0];
}

// ============ Lecture Session helpers (v2.0) ============
export async function createLectureSession(data: InsertLectureSession) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureSessions).values(data); return result[0].insertId;
}
export async function getLectureSession(lectureId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectureSessions)
    .where(eq(lectureSessions.lectureId, lectureId)).orderBy(desc(lectureSessions.createdAt)).limit(1);
  return result[0];
}
export async function getActiveSessions(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ session: lectureSessions, lecture: lectures })
    .from(lectureSessions).innerJoin(lectures, eq(lectureSessions.lectureId, lectures.id))
    .where(and(eq(lectureSessions.instructorId, instructorId), eq(lectureSessions.status, 'live' as any)))
    .orderBy(desc(lectureSessions.startedAt));
}
export async function updateLectureSession(id: number, data: Partial<InsertLectureSession>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectureSessions).set(data).where(eq(lectureSessions.id, id));
}
export async function endLectureSession(id: number) {
  const db = await getDb(); if (!db) return;
  const session = await db.select().from(lectureSessions).where(eq(lectureSessions.id, id)).limit(1);
  if (session[0]) {
    const startedAt = session[0].startedAt || session[0].createdAt;
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    await db.update(lectureSessions).set({ status: 'ended', endedAt: new Date(), durationSeconds }).where(eq(lectureSessions.id, id));
  }
}
export async function getSessionHistory(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ session: lectureSessions, lecture: lectures })
    .from(lectureSessions).innerJoin(lectures, eq(lectureSessions.lectureId, lectures.id))
    .where(eq(lectureSessions.instructorId, instructorId))
    .orderBy(desc(lectureSessions.createdAt));
}

// ============ Lecture Script helpers (v2.1) ============
export async function createLectureScript(data: InsertLectureScript) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureScripts).values(data); return result[0].insertId;
}
export async function getLectureScripts(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(lectureScripts).where(eq(lectureScripts.userId, userId)).orderBy(desc(lectureScripts.createdAt));
}
export async function getLectureScriptById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectureScripts).where(eq(lectureScripts.id, id)).limit(1);
  return result[0];
}
export async function updateLectureScript(id: number, data: Partial<InsertLectureScript>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectureScripts).set(data).where(eq(lectureScripts.id, id));
}
export async function deleteLectureScript(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectureScripts).where(and(eq(lectureScripts.id, id), eq(lectureScripts.userId, userId)));
}

// ============ Production Pipeline helpers (v2.1) ============
export async function createProductionPipeline(data: InsertProductionPipeline) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(productionPipelines).values(data); return result[0].insertId;
}
export async function getProductionPipelines(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ pipeline: productionPipelines, script: lectureScripts })
    .from(productionPipelines).innerJoin(lectureScripts, eq(productionPipelines.scriptId, lectureScripts.id))
    .where(eq(productionPipelines.userId, userId)).orderBy(desc(productionPipelines.createdAt));
}
export async function getProductionPipelineById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select({ pipeline: productionPipelines, script: lectureScripts })
    .from(productionPipelines).innerJoin(lectureScripts, eq(productionPipelines.scriptId, lectureScripts.id))
    .where(eq(productionPipelines.id, id)).limit(1);
  return result[0];
}
export async function updateProductionPipeline(id: number, data: Partial<InsertProductionPipeline>) {
  const db = await getDb(); if (!db) return;
  await db.update(productionPipelines).set(data).where(eq(productionPipelines.id, id));
}
export async function deleteProductionPipeline(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(productionPipelines).where(and(eq(productionPipelines.id, id), eq(productionPipelines.userId, userId)));
}

// ============ Pipeline Statistics helpers (v2.2) ============
export async function getPipelineStats(userId: number) {
  const db = await getDb(); if (!db) return null;
  const allPipelines = await db.select().from(productionPipelines).where(eq(productionPipelines.userId, userId));
  const allScripts = await db.select().from(lectureScripts).where(eq(lectureScripts.userId, userId));

  const totalPipelines = allPipelines.length;
  const completedPipelines = allPipelines.filter(p => p.status === "completed").length;
  const failedPipelines = allPipelines.filter(p => p.status === "failed").length;
  const totalDurationSec = allPipelines.reduce((sum, p) => sum + (p.totalDurationSec || 0), 0);
  const totalScripts = allScripts.length;

  // Category distribution from scripts
  const categoryMap: Record<string, number> = {};
  for (const s of allScripts) {
    const cat = s.category || "general";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

  // Monthly production counts (last 6 months)
  const monthlyProduction: { month: string; count: number; durationSec: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthPipelines = allPipelines.filter(p => {
      const created = new Date(p.createdAt);
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
    });
    monthlyProduction.push({
      month: monthStr,
      count: monthPipelines.length,
      durationSec: monthPipelines.reduce((sum, p) => sum + (p.totalDurationSec || 0), 0),
    });
  }

  // Difficulty distribution from scripts
  const difficultyMap: Record<string, number> = {};
  for (const s of allScripts) {
    const diff = s.difficulty || "beginner";
    difficultyMap[diff] = (difficultyMap[diff] || 0) + 1;
  }
  const difficultyDistribution = Object.entries(difficultyMap).map(([difficulty, count]) => ({ difficulty, count }));

  return {
    totalPipelines, completedPipelines, failedPipelines, totalDurationSec, totalScripts,
    categoryDistribution, monthlyProduction, difficultyDistribution,
    successRate: totalPipelines > 0 ? Math.round((completedPipelines / totalPipelines) * 100) : 0,
  };
}

// ============ Script Templates (v2.3) ============

export async function getScriptTemplates(category?: string, userId?: number) {
  const db = await getDb(); if (!db) return [];
  if (category) {
    return db.select().from(scriptTemplates).where(eq(scriptTemplates.category, category as any)).orderBy(desc(scriptTemplates.usageCount));
  }
  return db.select().from(scriptTemplates).orderBy(desc(scriptTemplates.usageCount));
}

export async function getScriptTemplateById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(scriptTemplates).where(eq(scriptTemplates.id, id));
  return rows[0] || null;
}

export async function createScriptTemplate(data: InsertScriptTemplate) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(scriptTemplates).values(data);
  return result[0].insertId;
}

export async function updateScriptTemplate(id: number, data: Partial<InsertScriptTemplate>) {
  const db = await getDb(); if (!db) return;
  await db.update(scriptTemplates).set(data).where(eq(scriptTemplates.id, id));
}

export async function deleteScriptTemplate(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(scriptTemplates).where(and(eq(scriptTemplates.id, id), eq(scriptTemplates.userId, userId)));
}

export async function incrementScriptTemplateUsage(id: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(scriptTemplates).where(eq(scriptTemplates.id, id));
  if (existing[0]) {
    await db.update(scriptTemplates).set({ usageCount: (existing[0].usageCount || 0) + 1 }).where(eq(scriptTemplates.id, id));
  }
}

export async function saveScriptAsTemplate(scriptId: number, userId: number, name: string, description?: string, tags?: string) {
  const db = await getDb(); if (!db) return null;
  const script = await db.select().from(lectureScripts).where(eq(lectureScripts.id, scriptId));
  if (!script[0]) return null;
  const s = script[0];
  const sections = s.sections ? JSON.parse(s.sections) : [];
  // Convert sections to template structure (remove content, keep structure)
  const structure = sections.map((sec: any) => ({
    title: sec.title,
    description: sec.slideNotes || "",
    durationPercent: Math.round((sec.durationSec / (s.estimatedDurationSec || 1)) * 100),
    slideNotes: sec.slideNotes || "",
  }));
  const templateId = await createScriptTemplate({
    userId,
    name,
    description: description || `"${s.title}" 스크립트에서 생성된 템플릿`,
    category: s.category || "general",
    difficulty: s.difficulty || "beginner",
    structure: JSON.stringify(structure),
    sectionCount: sections.length,
    targetDurationMin: s.targetDurationMin || 10,
    isBuiltIn: false,
    tags,
  });
  return templateId;
}


// ============ v2.4: Script Version Management ============

export async function createScriptVersion(data: {
  scriptId: number;
  userId: number;
  versionNumber: number;
  title: string;
  scriptContent?: string | null;
  sections?: string | null;
  sectionCount?: number;
  estimatedDurationSec?: number;
  changeDescription?: string | null;
  changeType?: "auto" | "manual" | "rollback";
}) {
  const db = await getDb();
  const result = await db!.insert(scriptVersions).values({
    scriptId: data.scriptId,
    userId: data.userId,
    versionNumber: data.versionNumber,
    title: data.title,
    scriptContent: data.scriptContent,
    sections: data.sections,
    sectionCount: data.sectionCount || 0,
    estimatedDurationSec: data.estimatedDurationSec || 0,
    changeDescription: data.changeDescription,
    changeType: data.changeType || "auto",
  });
  return (result as any)[0].insertId as number;
}

export async function getScriptVersions(scriptId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(scriptVersions)
    .where(and(eq(scriptVersions.scriptId, scriptId), eq(scriptVersions.userId, userId)))
    .orderBy(desc(scriptVersions.versionNumber));
}

export async function getScriptVersionById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(scriptVersions).where(eq(scriptVersions.id, id));
  return rows[0] || null;
}

export async function getLatestVersionNumber(scriptId: number) {
  const db = await getDb();
  const rows = await db!.select({ maxVer: sql<number>`COALESCE(MAX(${scriptVersions.versionNumber}), 0)` })
    .from(scriptVersions)
    .where(eq(scriptVersions.scriptId, scriptId));
  return rows[0]?.maxVer || 0;
}

export async function autoSaveScriptVersion(scriptId: number, userId: number, changeDescription?: string) {
  const db = await getDb();
  // Get current script data
  const scripts = await db!.select().from(lectureScripts).where(eq(lectureScripts.id, scriptId));
  const script = scripts[0];
  if (!script) return null;

  const latestVer = await getLatestVersionNumber(scriptId);
  const newVer = latestVer + 1;

  return createScriptVersion({
    scriptId,
    userId,
    versionNumber: newVer,
    title: script.title,
    scriptContent: script.scriptContent,
    sections: script.sections,
    sectionCount: script.sectionCount || 0,
    estimatedDurationSec: script.estimatedDurationSec || 0,
    changeDescription: changeDescription || `버전 ${newVer} 자동 저장`,
    changeType: "auto",
  });
}

export async function rollbackScriptToVersion(scriptId: number, versionId: number, userId: number) {
  const db = await getDb();
  const version = await getScriptVersionById(versionId);
  if (!version || version.scriptId !== scriptId) return null;

  // Update the script with version data
  await db!.update(lectureScripts).set({
    title: version.title,
    scriptContent: version.scriptContent,
    sections: version.sections,
    sectionCount: version.sectionCount || 0,
    estimatedDurationSec: version.estimatedDurationSec || 0,
  }).where(eq(lectureScripts.id, scriptId));

  // Create a new version recording the rollback
  const latestVer = await getLatestVersionNumber(scriptId);
  await createScriptVersion({
    scriptId,
    userId,
    versionNumber: latestVer + 1,
    title: version.title,
    scriptContent: version.scriptContent,
    sections: version.sections,
    sectionCount: version.sectionCount || 0,
    estimatedDurationSec: version.estimatedDurationSec || 0,
    changeDescription: `버전 ${version.versionNumber}으로 롤백`,
    changeType: "rollback",
  });

  return true;
}

// ============ v2.4: Content Analysis ============

export async function createContentAnalysis(data: {
  scriptId: number;
  userId: number;
  overallScore?: number;
  readabilityScore?: number;
  difficultyScore?: number;
  keywordScore?: number;
  structureScore?: number;
  engagementScore?: number;
  analysisDetail?: string | null;
  suggestions?: string | null;
  metrics?: string | null;
  status?: "analyzing" | "completed" | "failed";
}) {
  const db = await getDb();
  const result = await db!.insert(contentAnalyses).values({
    scriptId: data.scriptId,
    userId: data.userId,
    overallScore: data.overallScore || 0,
    readabilityScore: data.readabilityScore || 0,
    difficultyScore: data.difficultyScore || 0,
    keywordScore: data.keywordScore || 0,
    structureScore: data.structureScore || 0,
    engagementScore: data.engagementScore || 0,
    analysisDetail: data.analysisDetail,
    suggestions: data.suggestions,
    metrics: data.metrics,
    status: data.status || "analyzing",
  });
  return (result as any)[0].insertId as number;
}

export async function getContentAnalyses(scriptId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(contentAnalyses)
    .where(and(eq(contentAnalyses.scriptId, scriptId), eq(contentAnalyses.userId, userId)))
    .orderBy(desc(contentAnalyses.createdAt));
}

export async function getContentAnalysisById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(contentAnalyses).where(eq(contentAnalyses.id, id));
  return rows[0] || null;
}

export async function updateContentAnalysis(id: number, data: Partial<{
  overallScore: number;
  readabilityScore: number;
  difficultyScore: number;
  keywordScore: number;
  structureScore: number;
  engagementScore: number;
  analysisDetail: string | null;
  suggestions: string | null;
  metrics: string | null;
  status: "analyzing" | "completed" | "failed";
}>) {
  const db = await getDb();
  await db!.update(contentAnalyses).set(data).where(eq(contentAnalyses.id, id));
}

// ============ Live Broadcast helpers (v2.5) ============

export async function createBroadcast(data: InsertLiveBroadcast) {
  const db = await getDb(); if (!db) return 0;
  const result = await db.insert(liveBroadcasts).values(data);
  return result[0].insertId;
}

export async function getBroadcastById(id: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(liveBroadcasts).where(eq(liveBroadcasts.id, id)).limit(1);
  return result[0] || null;
}

export async function getBroadcastByRoomCode(roomCode: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(liveBroadcasts).where(eq(liveBroadcasts.roomCode, roomCode)).limit(1);
  return result[0] || null;
}

export async function getInstructorBroadcasts(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ broadcast: liveBroadcasts, script: lectureScripts })
    .from(liveBroadcasts)
    .leftJoin(lectureScripts, eq(liveBroadcasts.scriptId, lectureScripts.id))
    .where(eq(liveBroadcasts.instructorId, instructorId))
    .orderBy(desc(liveBroadcasts.createdAt));
}

export async function getLiveBroadcasts() {
  const db = await getDb(); if (!db) return [];
  return db.select({ broadcast: liveBroadcasts, instructor: users })
    .from(liveBroadcasts)
    .leftJoin(users, eq(liveBroadcasts.instructorId, users.id))
    .where(eq(liveBroadcasts.status, 'live' as any))
    .orderBy(desc(liveBroadcasts.startedAt));
}

export async function updateBroadcast(id: number, data: Partial<InsertLiveBroadcast>) {
  const db = await getDb(); if (!db) return;
  await db.update(liveBroadcasts).set(data).where(eq(liveBroadcasts.id, id));
}

export async function updateBroadcastSlideState(id: number, slideIndex: number, isAudioPlaying: boolean, audioPosition: number) {
  const db = await getDb(); if (!db) return;
  await db.update(liveBroadcasts).set({
    currentSlideIndex: slideIndex,
    isAudioPlaying,
    audioPosition,
    stateUpdatedAt: new Date(),
  }).where(eq(liveBroadcasts.id, id));
}

export async function getBroadcastState(id: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select({
    currentSlideIndex: liveBroadcasts.currentSlideIndex,
    isAudioPlaying: liveBroadcasts.isAudioPlaying,
    audioPosition: liveBroadcasts.audioPosition,
    stateUpdatedAt: liveBroadcasts.stateUpdatedAt,
    status: liveBroadcasts.status,
    currentViewers: liveBroadcasts.currentViewers,
  }).from(liveBroadcasts).where(eq(liveBroadcasts.id, id)).limit(1);
  return result[0] || null;
}

// Viewer helpers
export async function joinBroadcast(broadcastId: number, userId: number, displayName: string) {
  const db = await getDb(); if (!db) return 0;
  // Check if already joined
  const existing = await db.select().from(broadcastViewers)
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.userId, userId)))
    .limit(1);
  if (existing[0]) {
    await db.update(broadcastViewers).set({ isActive: true, lastHeartbeat: new Date(), leftAt: null })
      .where(eq(broadcastViewers.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(broadcastViewers).values({ broadcastId, userId, displayName, isActive: true });
  // Update viewer count
  const activeCount = await db.select({ count: sql<number>`COUNT(*)` }).from(broadcastViewers)
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.isActive, true)));
  const count = activeCount[0]?.count || 0;
  await db.update(liveBroadcasts).set({
    currentViewers: count,
    peakViewers: sql`GREATEST(peakViewers, ${count})`,
  }).where(eq(liveBroadcasts.id, broadcastId));
  return result[0].insertId;
}

export async function leaveBroadcast(broadcastId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(broadcastViewers).set({ isActive: false, leftAt: new Date() })
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.userId, userId)));
  const activeCount = await db.select({ count: sql<number>`COUNT(*)` }).from(broadcastViewers)
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.isActive, true)));
  const count = activeCount[0]?.count || 0;
  await db.update(liveBroadcasts).set({ currentViewers: count }).where(eq(liveBroadcasts.id, broadcastId));
}

export async function heartbeatViewer(broadcastId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(broadcastViewers).set({ lastHeartbeat: new Date() })
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.userId, userId)));
}

export async function getActiveViewers(broadcastId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(broadcastViewers)
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.isActive, true)))
    .orderBy(desc(broadcastViewers.joinedAt));
}

// Chat helpers
export async function createBroadcastChat(data: InsertBroadcastChat) {
  const db = await getDb(); if (!db) return 0;
  const result = await db.insert(broadcastChats).values(data);
  return result[0].insertId;
}

export async function getBroadcastChats(broadcastId: number, afterId?: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(broadcastChats.broadcastId, broadcastId)];
  if (afterId) {
    conditions.push(sql`${broadcastChats.id} > ${afterId}` as any);
  }
  return db.select().from(broadcastChats)
    .where(and(...conditions))
    .orderBy(broadcastChats.id)
    .limit(limit);
}

export async function pinBroadcastChat(chatId: number, isPinned: boolean) {
  const db = await getDb(); if (!db) return;
  await db.update(broadcastChats).set({ isPinned }).where(eq(broadcastChats.id, chatId));
}


// ========== Sample Faces ==========

export async function listSampleFaces(filters?: { category?: string; gender?: string; isPremium?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(sampleFaces).where(eq(sampleFaces.isActive, true));
  const rows = await query.orderBy(sampleFaces.sortOrder);
  let result = rows;
  if (filters?.category) result = result.filter(r => r.category === filters.category);
  if (filters?.gender) result = result.filter(r => r.gender === filters.gender);
  if (filters?.isPremium !== undefined) result = result.filter(r => r.isPremium === filters.isPremium);
  return result;
}

export async function getSampleFace(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sampleFaces).where(eq(sampleFaces.id, id)).limit(1);
  return rows[0] || null;
}

export async function createSampleFace(data: InsertSampleFace) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sampleFaces).values(data);
  return { id: result[0].insertId };
}

export async function updateSampleFace(id: number, data: Partial<InsertSampleFace>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleFaces).set(data).where(eq(sampleFaces.id, id));
}

export async function deleteSampleFace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleFaces).set({ isActive: false }).where(eq(sampleFaces.id, id));
}

// ========== Sample Voices ==========

export async function listSampleVoices(filters?: { language?: string; gender?: string; tone?: string; isPremium?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(sampleVoices).where(eq(sampleVoices.isActive, true));
  const rows = await query.orderBy(sampleVoices.sortOrder);
  let result = rows;
  if (filters?.language) result = result.filter(r => r.language === filters.language);
  if (filters?.gender) result = result.filter(r => r.gender === filters.gender);
  if (filters?.tone) result = result.filter(r => r.tone === filters.tone);
  if (filters?.isPremium !== undefined) result = result.filter(r => r.isPremium === filters.isPremium);
  return result;
}

export async function getSampleVoice(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sampleVoices).where(eq(sampleVoices.id, id)).limit(1);
  return rows[0] || null;
}

export async function createSampleVoice(data: InsertSampleVoice) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sampleVoices).values(data);
  return { id: result[0].insertId };
}

export async function updateSampleVoice(id: number, data: Partial<InsertSampleVoice>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleVoices).set(data).where(eq(sampleVoices.id, id));
}

export async function deleteSampleVoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleVoices).set({ isActive: false }).where(eq(sampleVoices.id, id));
}

// ========== Subscription Plans ==========

export async function listSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder);
}

export async function getSubscriptionPlan(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return rows[0] || null;
}

export async function getSubscriptionPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug)).limit(1);
  return rows[0] || null;
}

export async function updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
}

// ========== User Subscriptions ==========

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)).limit(1);
  return rows[0] || null;
}

export async function createUserSubscription(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Remove existing subscription first
  await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, data.userId));
  const result = await db.insert(userSubscriptions).values(data);
  return { id: result[0].insertId };
}

export async function updateUserSubscription(id: number, data: Partial<InsertUserSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, id));
}

export async function listAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userSubscriptions).orderBy(desc(userSubscriptions.createdAt));
}

// ========== Credit Transactions ==========

export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const sub = await getUserSubscription(userId);
  return sub?.creditsRemaining ?? 0;
}

export async function addCreditTransaction(data: InsertCreditTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(creditTransactions).values(data);
  return { id: result[0].insertId };
}

export async function getUserCreditHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function deductCredits(userId: number, amount: number, description: string, resourceType?: string, resourceId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const sub = await getUserSubscription(userId);
  if (!sub) throw new Error("No active subscription");
  const remaining = (sub.creditsRemaining ?? 0) - amount;
  if (remaining < 0) throw new Error("Insufficient credits");
  await db.update(userSubscriptions).set({ creditsRemaining: remaining }).where(eq(userSubscriptions.id, sub.id));
  await addCreditTransaction({
    userId,
    type: "usage",
    amount: -amount,
    balanceAfter: remaining,
    description,
    resourceType,
    resourceId,
  });
  return remaining;
}

// ========== Payments ==========

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(payments).values(data).$returningId();
  return result;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return rows[0] || null;
}

export async function getPaymentByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.externalId, externalId)).limit(1);
  return rows[0] || null;
}

export async function updatePaymentStatus(id: number, status: string, externalId?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (externalId) updateData.externalId = externalId;
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(payments).set(updateData).where(eq(payments.id, id));
}

export async function getUserPayments(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(limit);
}

export async function getAllPayments(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
}

export async function getPaymentStats() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalPayments: 0, completedPayments: 0 };
  const allPayments = await db.select().from(payments).where(eq(payments.status, "completed"));
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amountCents, 0);
  return {
    totalRevenue,
    totalPayments: allPayments.length,
    completedPayments: allPayments.length,
  };
}

// ========== Crypto Payments ==========

export async function createCryptoPayment(data: InsertCryptoPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cryptoPayments).values(data).$returningId();
  return result;
}

export async function getCryptoPaymentByPaymentId(paymentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(cryptoPayments).where(eq(cryptoPayments.paymentId, paymentId)).limit(1);
  return rows[0] || null;
}

export async function updateCryptoPayment(id: number, data: Partial<InsertCryptoPayment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cryptoPayments).set(data).where(eq(cryptoPayments.id, id));
}

// ========== Credit Usage Logs ==========

export async function createCreditUsageLog(data: InsertCreditUsageLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(creditUsageLogs).values(data).$returningId();
  return result;
}

export async function getUserCreditUsageLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditUsageLogs).where(eq(creditUsageLogs.userId, userId)).orderBy(desc(creditUsageLogs.createdAt)).limit(limit);
}

export async function getCreditUsageStats() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditUsageLogs).orderBy(desc(creditUsageLogs.createdAt));
}

// ========== Revenue Dashboard Helpers ==========

export async function getMonthlyRevenue() {
  const db = await getDb();
  if (!db) return [];
  const completedPayments = await db.select().from(payments).where(eq(payments.status, "completed"));
  // Group by month
  const monthlyMap = new Map<string, number>();
  for (const p of completedPayments) {
    const month = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amountCents);
  }
  return Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amountCents: amount })).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getPlanDistribution() {
  const db = await getDb();
  if (!db) return [];
  const subs = await db.select().from(userSubscriptions).where(eq(userSubscriptions.status, "active"));
  const plans = await db.select().from(subscriptionPlans);
  const planMap = new Map(plans.map(p => [p.id, p.name]));
  const distribution = new Map<string, number>();
  for (const sub of subs) {
    const planName = planMap.get(sub.planId) || "Unknown";
    distribution.set(planName, (distribution.get(planName) || 0) + 1);
  }
  return Array.from(distribution.entries()).map(([name, count]) => ({ name, count }));
}

export async function getCreditConsumptionTrend() {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select().from(creditUsageLogs).orderBy(creditUsageLogs.createdAt);
  const dailyMap = new Map<string, { total: number; byFeature: Record<string, number> }>();
  for (const log of logs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, { total: 0, byFeature: {} });
    const entry = dailyMap.get(day)!;
    entry.total += log.creditsUsed;
    entry.byFeature[log.feature] = (entry.byFeature[log.feature] || 0) + log.creditsUsed;
  }
  return Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
}


// ============ API Usage Logging (v4.5) ============
export async function logApiUsage(data: {
  userId?: number;
  apiType: "llm" | "tts";
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status: "success" | "error";
  errorCode?: string;
  errorMessage?: string;
  metadata?: string;
}) {
  try {
    const db = await getDb(); if (!db) return;
    await db.insert(apiUsageLogs).values(data);
  } catch (e) {
    // Silently fail - logging should never break main flow
    console.error("[API Usage Log] Failed to log:", e);
  }
}

export async function getApiUsageStats(days = 30) {
  const db = await getDb(); if (!db) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await db.select().from(apiUsageLogs).where(
    gte(apiUsageLogs.createdAt, since)
  ).orderBy(desc(apiUsageLogs.createdAt));

  const totalCalls = logs.length;
  const llmCalls = logs.filter(l => l.apiType === "llm").length;
  const ttsCalls = logs.filter(l => l.apiType === "tts").length;
  const errorCalls = logs.filter(l => l.status === "error").length;
  const totalInputTokens = logs.reduce((sum, l) => sum + (l.inputTokens || 0), 0);
  const totalOutputTokens = logs.reduce((sum, l) => sum + (l.outputTokens || 0), 0);
  const avgDurationMs = totalCalls > 0 ? Math.round(logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / totalCalls) : 0;

  // Daily breakdown
  const dailyMap = new Map<string, { llm: number; tts: number; errors: number }>();
  for (const log of logs) {
    const day = log.createdAt.toISOString().split("T")[0];
    if (!dailyMap.has(day)) dailyMap.set(day, { llm: 0, tts: 0, errors: 0 });
    const entry = dailyMap.get(day)!;
    if (log.apiType === "llm") entry.llm++;
    else entry.tts++;
    if (log.status === "error") entry.errors++;
  }
  const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, counts]) => ({ date, ...counts }));

  return {
    totalCalls,
    llmCalls,
    ttsCalls,
    errorCalls,
    errorRate: totalCalls > 0 ? ((errorCalls / totalCalls) * 100).toFixed(1) : "0",
    totalInputTokens,
    totalOutputTokens,
    avgDurationMs,
    dailyBreakdown,
    recentLogs: logs.slice(0, 50),
  };
}


// ── Gallery helpers ──────────────────────────────────────
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

// ── PIP Settings helpers ──────────────────────────────────
export async function getPipSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pipSettings).where(eq(pipSettings.userId, userId));
  return rows[0] || null;
}

export async function upsertPipSettings(userId: number, data: Partial<InsertPipSetting>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(pipSettings).where(eq(pipSettings.userId, userId));
  if (existing.length > 0) {
    await db.update(pipSettings).set(data).where(eq(pipSettings.userId, userId));
  } else {
    await db.insert(pipSettings).values({ userId, ...data } as InsertPipSetting);
  }
}


// ── PPT Uploads ──
export async function createPptUpload(data: InsertPptUpload) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pptUploads).values(data);
  return result[0].insertId;
}

export async function getPptUploadsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pptUploads).where(eq(pptUploads.userId, userId)).orderBy(desc(pptUploads.createdAt));
}

export async function getPptUploadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pptUploads).where(eq(pptUploads.id, id));
  return rows[0] || null;
}

export async function updatePptUpload(id: number, data: Partial<InsertPptUpload>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pptUploads).set(data).where(eq(pptUploads.id, id));
}

export async function deletePptUpload(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pptUploads).where(eq(pptUploads.id, id));
}


// ============ v7.0 Lecture Builder Helpers ============

// --- Lecture Projects ---
export async function createLectureProject(data: InsertLectureProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(lectureProjects).values(data);
  return result.insertId;
}

export async function getLectureProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(lectureProjects).where(eq(lectureProjects.id, id));
  return rows[0] || null;
}

export async function listLectureProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(lectureProjects).where(eq(lectureProjects.userId, userId)).orderBy(desc(lectureProjects.updatedAt));
}

export async function updateLectureProject(id: number, data: Partial<InsertLectureProject>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lectureProjects).set(data).where(eq(lectureProjects.id, id));
}

export async function deleteLectureProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete all related data first
  await db.delete(slideAnnotations).where(eq(slideAnnotations.projectId, id));
  await db.delete(slideScripts).where(eq(slideScripts.projectId, id));
  await db.delete(projectSlides).where(eq(projectSlides.projectId, id));
  await db.delete(projectAvatars).where(eq(projectAvatars.projectId, id));
  await db.delete(lectureProjects).where(eq(lectureProjects.id, id));
}

// --- Project Avatars ---
export async function addProjectAvatar(data: InsertProjectAvatar) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projectAvatars).values(data);
  return result.insertId;
}

export async function listProjectAvatars(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(projectAvatars).where(eq(projectAvatars.projectId, projectId)).orderBy(projectAvatars.sortOrder);
}

export async function updateProjectAvatar(id: number, data: Partial<InsertProjectAvatar>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectAvatars).set(data).where(eq(projectAvatars.id, id));
}

export async function deleteProjectAvatar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectAvatars).where(eq(projectAvatars.id, id));
}

// --- Project Slides ---
export async function addProjectSlide(data: InsertProjectSlide) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projectSlides).values(data);
  return result.insertId;
}

export async function listProjectSlides(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(projectSlides).where(eq(projectSlides.projectId, projectId)).orderBy(projectSlides.slideOrder);
}

export async function updateProjectSlide(id: number, data: Partial<InsertProjectSlide>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectSlides).set(data).where(eq(projectSlides.id, id));
}

export async function deleteProjectSlide(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.slideId, id));
  await db.delete(slideScripts).where(eq(slideScripts.slideId, id));
  await db.delete(projectSlides).where(eq(projectSlides.id, id));
}

export async function reorderProjectSlides(projectId: number, slideIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (let i = 0; i < slideIds.length; i++) {
    await db.update(projectSlides).set({ slideOrder: i }).where(eq(projectSlides.id, slideIds[i]));
  }
}

// --- Slide Scripts ---
export async function setSlideScript(data: InsertSlideScript) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideScripts).values(data);
  return result.insertId;
}

export async function listSlideScripts(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideScripts).where(eq(slideScripts.projectId, projectId)).orderBy(slideScripts.slideId, slideScripts.sortOrder);
}

export async function updateSlideScript(id: number, data: Partial<InsertSlideScript>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideScripts).set(data).where(eq(slideScripts.id, id));
}

export async function deleteSlideScript(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideScripts).where(eq(slideScripts.id, id));
}

export async function deleteSlideScriptsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideScripts).where(eq(slideScripts.slideId, slideId));
}

// --- Slide Annotations ---
export async function addSlideAnnotation(data: InsertSlideAnnotation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideAnnotations).values(data);
  return result.insertId;
}

export async function listSlideAnnotations(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideAnnotations).where(eq(slideAnnotations.projectId, projectId)).orderBy(slideAnnotations.slideId, slideAnnotations.sortOrder);
}

export async function listSlideAnnotationsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideAnnotations).where(eq(slideAnnotations.slideId, slideId)).orderBy(slideAnnotations.sortOrder);
}

export async function updateSlideAnnotation(id: number, data: Partial<InsertSlideAnnotation>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideAnnotations).set(data).where(eq(slideAnnotations.id, id));
}

export async function deleteSlideAnnotation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.id, id));
}

export async function deleteSlideAnnotationsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.slideId, slideId));
}


// ============ Video Generation History ============
export async function createVideoGeneration(data: InsertVideoGeneration) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(videoGenerations).values(data);
  return result.insertId;
}

export async function getVideoGeneration(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(videoGenerations).where(eq(videoGenerations.id, id));
  return rows[0] || null;
}

export async function listVideoGenerations(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(videoGenerations)
    .where(eq(videoGenerations.projectId, projectId))
    .orderBy(desc(videoGenerations.createdAt));
}

export async function listUserVideoGenerations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(videoGenerations)
    .where(eq(videoGenerations.userId, userId))
    .orderBy(desc(videoGenerations.createdAt));
}

export async function updateVideoGeneration(id: number, data: Partial<InsertVideoGeneration>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(videoGenerations).set(data).where(eq(videoGenerations.id, id));
}


// --- Script Improvement History ---
import { scriptImprovementHistory, type InsertScriptImprovementHistory } from "../drizzle/schema";

export async function addScriptImprovementHistory(data: InsertScriptImprovementHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(scriptImprovementHistory).values(data);
  return result.insertId;
}

export async function addBatchScriptImprovementHistory(data: InsertScriptImprovementHistory[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(scriptImprovementHistory).values(data);
}

export async function getScriptImprovementHistory(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptImprovementHistory)
    .where(and(
      eq(scriptImprovementHistory.projectId, projectId),
      eq(scriptImprovementHistory.userId, userId),
    ))
    .orderBy(desc(scriptImprovementHistory.createdAt))
    .limit(100);
}

export async function getScriptImprovementBatch(batchId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptImprovementHistory)
    .where(eq(scriptImprovementHistory.batchId, batchId))
    .orderBy(scriptImprovementHistory.sectionIndex);
}


// ============ v7.6: Slide Script Version Snapshots ============

export async function createSlideScriptVersion(data: {
  projectId: number;
  userId: number;
  versionNumber: number;
  sectionsSnapshot: string;
  sectionCount: number;
  changeDescription?: string;
  changeType: "manual" | "auto";
}) {
  const db = await getDb();
  const result = await db!.insert(slideScriptVersions).values(data);
  return result[0].insertId;
}

export async function getSlideScriptVersions(projectId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(slideScriptVersions)
    .where(and(eq(slideScriptVersions.projectId, projectId), eq(slideScriptVersions.userId, userId)))
    .orderBy(desc(slideScriptVersions.versionNumber))
    .limit(50);
}

export async function getSlideScriptVersionById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(slideScriptVersions).where(eq(slideScriptVersions.id, id));
  return rows[0] || null;
}

export async function getLatestSlideScriptVersionNumber(projectId: number) {
  const db = await getDb();
  const rows = await db!.select({ maxVer: sql<number>`COALESCE(MAX(${slideScriptVersions.versionNumber}), 0)` })
    .from(slideScriptVersions)
    .where(eq(slideScriptVersions.projectId, projectId));
  return rows[0]?.maxVer || 0;
}

// ========== Admin Functions ==========
export async function listAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ============ KLING Tasks ============
import { klingTasks, type InsertKlingTask } from "../drizzle/schema";

export async function createKlingTask(data: InsertKlingTask) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(klingTasks).values(data);
  return result.insertId;
}

export async function getKlingTask(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(klingTasks).where(eq(klingTasks.id, id));
  return rows[0] || null;
}

export async function getKlingTaskByKlingId(klingTaskId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(klingTasks).where(eq(klingTasks.klingTaskId, klingTaskId));
  return rows[0] || null;
}

export async function updateKlingTask(id: number, data: Partial<InsertKlingTask>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(klingTasks).set(data).where(eq(klingTasks.id, id));
}

export async function listKlingTasks(userId: number, purpose?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(klingTasks.userId, userId)];
  if (purpose) conditions.push(eq(klingTasks.purpose, purpose));
  return db.select().from(klingTasks)
    .where(and(...conditions))
    .orderBy(desc(klingTasks.createdAt))
    .limit(50);
}

export async function deleteKlingTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(klingTasks).where(eq(klingTasks.id, id));
}

// ============ Lecture Format Templates ============
export async function listLectureFormatTemplates(category?: "personnel" | "style" | "insert") {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(lectureFormatTemplates)
      .where(and(eq(lectureFormatTemplates.isActive, true), eq(lectureFormatTemplates.category, category as any)))
      .orderBy(lectureFormatTemplates.sortOrder);
  }
  return db.select().from(lectureFormatTemplates)
    .where(eq(lectureFormatTemplates.isActive, true))
    .orderBy(lectureFormatTemplates.sortOrder);
}

export async function getLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lectureFormatTemplates).where(eq(lectureFormatTemplates.id, id)).limit(1);
  return rows[0];
}

// ============ Admin Format Template CRUD ============
export async function listAllLectureFormatTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lectureFormatTemplates).orderBy(lectureFormatTemplates.category, lectureFormatTemplates.sortOrder);
}

export async function createLectureFormatTemplate(data: InsertLectureFormatTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(lectureFormatTemplates).values(data);
  return { id: Number(result[0].insertId) };
}

export async function updateLectureFormatTemplate(id: number, data: Partial<InsertLectureFormatTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lectureFormatTemplates).set(data).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

export async function deleteLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Soft delete - just set isActive to false
  await db.update(lectureFormatTemplates).set({ isActive: false }).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

export async function hardDeleteLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(lectureFormatTemplates).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

// ============ v6.0: Slide Avatar Overrides ============
import { slideAvatarOverrides, type InsertSlideAvatarOverride, slideInsertContent, type InsertSlideInsertContent } from "../drizzle/schema";

export async function getSlideAvatarOverrides(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideAvatarOverrides)
    .where(eq(slideAvatarOverrides.projectId, projectId))
    .orderBy(slideAvatarOverrides.slideId);
}

export async function getSlideAvatarOverride(projectId: number, slideId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, projectId), eq(slideAvatarOverrides.slideId, slideId)));
  return rows[0] || null;
}

export async function upsertSlideAvatarOverride(data: InsertSlideAvatarOverride) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if exists
  const existing = await db.select().from(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, data.projectId), eq(slideAvatarOverrides.slideId, data.slideId)));
  if (existing.length > 0) {
    await db.update(slideAvatarOverrides).set(data).where(eq(slideAvatarOverrides.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideAvatarOverrides).values(data);
  return result.insertId;
}

export async function deleteSlideAvatarOverride(projectId: number, slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, projectId), eq(slideAvatarOverrides.slideId, slideId)));
}

// ============ v6.0: Slide Insert Content ============
export async function listSlideInsertContent(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideInsertContent)
    .where(eq(slideInsertContent.projectId, projectId))
    .orderBy(slideInsertContent.afterSlideId, slideInsertContent.sortOrder);
}

export async function getSlideInsertContentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(slideInsertContent).where(eq(slideInsertContent.id, id));
  return rows[0] || null;
}

export async function createSlideInsertContent(data: InsertSlideInsertContent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideInsertContent).values(data);
  return result.insertId;
}

export async function updateSlideInsertContent(id: number, data: Partial<InsertSlideInsertContent>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideInsertContent).set(data).where(eq(slideInsertContent.id, id));
}

export async function deleteSlideInsertContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideInsertContent).where(eq(slideInsertContent.id, id));
}


// ============ Slide Transitions ============
export async function getSlideTransitions(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideTransitions).where(eq(slideTransitions.projectId, projectId));
}

export async function upsertSlideTransition(data: InsertSlideTransition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if exists
  const existing = await db.select().from(slideTransitions)
    .where(and(eq(slideTransitions.projectId, data.projectId), eq(slideTransitions.slideId, data.slideId!)));
  if (existing.length > 0) {
    await db.update(slideTransitions).set(data).where(eq(slideTransitions.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideTransitions).values(data);
  return result.insertId;
}

export async function setProjectTransitions(projectId: number, transitionType: string, durationMs: number, easing: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Get all slides for this project
  const slides = await db.select().from(projectSlides).where(eq(projectSlides.projectId, projectId));
  for (const slide of slides) {
    await upsertSlideTransition({
      projectId,
      slideId: slide.id,
      transitionType: transitionType as any,
      durationMs,
      easing: easing as any,
    });
  }
  return slides.length;
}

export async function deleteSlideTransition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideTransitions).where(eq(slideTransitions.id, id));
}

// --- Clone Lecture Project ---
export async function cloneLectureProject(sourceProjectId: number, userId: number, newTitle: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // 1. Get source project
  const source = await getLectureProject(sourceProjectId);
  if (!source) throw new Error("Source project not found");
  
  // 2. Create new project (copy settings, reset status)
  const newProjectId = await createLectureProject({
    userId,
    title: newTitle,
    description: source.description ? `[복제] ${source.description}` : "[복제됨]",
    currentStep: source.currentStep,
    status: "draft",
    avatarPosition: source.avatarPosition,
    avatarSize: source.avatarSize,
    avatarShape: source.avatarShape,
    avatarOpacity: source.avatarOpacity,
  });
  
  // 3. Clone avatars (map old ID -> new ID)
  const avatarIdMap = new Map<number, number>();
  const sourceAvatars = await listProjectAvatars(sourceProjectId);
  for (const avatar of sourceAvatars) {
    const newAvatarId = await addProjectAvatar({
      projectId: newProjectId,
      sampleFaceId: avatar.sampleFaceId,
      customFaceUrl: avatar.customFaceUrl,
      name: avatar.name,
      role: avatar.role,
      ttsVoiceId: avatar.ttsVoiceId,
      sortOrder: avatar.sortOrder,
    });
    avatarIdMap.set(avatar.id, newAvatarId);
  }
  
  // 4. Clone slides (map old ID -> new ID)
  const slideIdMap = new Map<number, number>();
  const sourceSlides = await listProjectSlides(sourceProjectId);
  for (const slide of sourceSlides) {
    const newSlideId = await addProjectSlide({
      projectId: newProjectId,
      imageUrl: slide.imageUrl,
      fileKey: slide.fileKey,
      slideOrder: slide.slideOrder,
      originalFileName: slide.originalFileName,
    });
    slideIdMap.set(slide.id, newSlideId);
  }
  
  // 5. Clone scripts (remap slideId and avatarId)
  const sourceScripts = await listSlideScripts(sourceProjectId);
  for (const script of sourceScripts) {
    const newSlideId = slideIdMap.get(script.slideId);
    if (!newSlideId) continue;
    await setSlideScript({
      projectId: newProjectId,
      slideId: newSlideId,
      avatarId: script.avatarId ? (avatarIdMap.get(script.avatarId) || script.avatarId) : null,
      scriptText: script.scriptText,
      estimatedDurationSec: script.estimatedDurationSec,
      sortOrder: script.sortOrder,
    });
  }
  
  // 6. Clone annotations (remap slideId)
  const sourceAnnotations = await listSlideAnnotations(sourceProjectId);
  for (const ann of sourceAnnotations) {
    const newSlideId = slideIdMap.get(ann.slideId);
    if (!newSlideId) continue;
    await addSlideAnnotation({
      projectId: newProjectId,
      slideId: newSlideId,
      annotationType: ann.annotationType,
      penColor: ann.penColor,
      penThickness: ann.penThickness,
      pathData: ann.pathData,
      showAtSec: ann.showAtSec,
      durationSec: ann.durationSec,
      sortOrder: ann.sortOrder,
    });
  }
  
  // 7. Clone avatar overrides (remap slideId)
  const sourceOverrides = await getSlideAvatarOverrides(sourceProjectId);
  for (const ov of sourceOverrides) {
    const newSlideId = slideIdMap.get(ov.slideId);
    if (!newSlideId) continue;
    await upsertSlideAvatarOverride({
      projectId: newProjectId,
      slideId: newSlideId,
      avatarPosition: ov.avatarPosition,
      avatarSizePercent: ov.avatarSizePercent,
      offsetX: ov.offsetX,
      offsetY: ov.offsetY,
      avatarShape: ov.avatarShape,
      avatarOpacity: ov.avatarOpacity,
      isHidden: ov.isHidden,
    });
  }
  
  // 8. Clone insert content (remap afterSlideId and avatarId)
  const sourceInserts = await listSlideInsertContent(sourceProjectId);
  for (const ins of sourceInserts) {
    const newAfterSlideId = ins.afterSlideId ? (slideIdMap.get(ins.afterSlideId) || 0) : 0;
    await createSlideInsertContent({
      projectId: newProjectId,
      afterSlideId: newAfterSlideId,
      contentType: ins.contentType,
      title: ins.title,
      contentUrl: ins.contentUrl,
      fileKey: ins.fileKey,
      drawingData: ins.drawingData,
      backgroundColor: ins.backgroundColor,
      durationSec: ins.durationSec,
      scriptText: ins.scriptText,
      avatarId: ins.avatarId ? (avatarIdMap.get(ins.avatarId) || ins.avatarId) : null,
      sortOrder: ins.sortOrder,
    });
  }
  
  // 9. Clone transitions (remap slideId)
  const sourceTransitions = await getSlideTransitions(sourceProjectId);
  for (const tr of sourceTransitions) {
    const newSlideId = slideIdMap.get(tr.slideId);
    if (!newSlideId) continue;
    await upsertSlideTransition({
      projectId: newProjectId,
      slideId: newSlideId,
      transitionType: tr.transitionType as any,
      durationMs: tr.durationMs,
      easing: tr.easing as any,
    });
  }
  
  return { newProjectId, avatarCount: sourceAvatars.length, slideCount: sourceSlides.length, scriptCount: sourceScripts.length };
}


// ============ v6.3: Whiteboard Collaboration Sessions ============

export async function createWhiteboardSession(data: InsertWhiteboardSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(whiteboardSessions).values(data).$returningId();
  return result;
}

export async function getWhiteboardSession(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(whiteboardSessions).where(eq(whiteboardSessions.id, id)).limit(1);
  return rows[0] || null;
}

export async function getWhiteboardSessionByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(whiteboardSessions).where(eq(whiteboardSessions.sessionCode, code)).limit(1);
  return rows[0] || null;
}

export async function listWhiteboardSessions(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whiteboardSessions)
    .where(eq(whiteboardSessions.projectId, projectId))
    .orderBy(desc(whiteboardSessions.createdAt));
}

export async function updateWhiteboardSession(id: number, data: Partial<InsertWhiteboardSession> & { endedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(whiteboardSessions).set(data).where(eq(whiteboardSessions.id, id));
}

export async function addWhiteboardParticipant(data: { sessionId: number; userId: number; displayName?: string; cursorColor: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(whiteboardParticipants).values(data).$returningId();
  return result;
}

export async function getSessionParticipants(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whiteboardParticipants)
    .where(and(eq(whiteboardParticipants.sessionId, sessionId), eq(whiteboardParticipants.isOnline, true)));
}

export async function updateParticipantStatus(id: number, isOnline: boolean) {
  const db = await getDb();
  if (!db) return;
  const data: any = { isOnline };
  if (!isOnline) data.leftAt = new Date();
  await db.update(whiteboardParticipants).set(data).where(eq(whiteboardParticipants.id, id));
}

// ============ v6.3: Slide Layouts ============

export async function upsertSlideLayout(data: InsertSlideLayout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check existing
  const existing = await db.select().from(slideLayouts)
    .where(and(eq(slideLayouts.projectId, data.projectId), eq(slideLayouts.slideId, data.slideId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(slideLayouts).set(data).where(eq(slideLayouts.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideLayouts).values(data).$returningId();
  return result.id;
}

export async function getSlideLayouts(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideLayouts)
    .where(eq(slideLayouts.projectId, projectId))
    .orderBy(slideLayouts.slideId);
}

export async function applySlideLayout(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(slideLayouts).set({ isApplied: true }).where(eq(slideLayouts.id, id));
}

export async function deleteSlideLayouts(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(slideLayouts).where(eq(slideLayouts.projectId, projectId));
}

// ============ v6.3: Project Watermarks ============

export async function upsertProjectWatermark(data: InsertProjectWatermark) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(projectWatermarks)
    .where(and(eq(projectWatermarks.projectId, data.projectId), eq(projectWatermarks.userId, data.userId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(projectWatermarks).set(data).where(eq(projectWatermarks.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(projectWatermarks).values(data).$returningId();
  return result.id;
}

export async function getProjectWatermark(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(projectWatermarks)
    .where(eq(projectWatermarks.projectId, projectId))
    .limit(1);
  return rows[0] || null;
}

export async function deleteProjectWatermark(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectWatermarks).where(eq(projectWatermarks.id, id));
}


// ── v8.1 Community Gallery Posts helpers ──────────────────────────────────
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

// ═══════════ v8.3 - AI Generations History ═══════════
import { aiGenerations, type InsertAiGeneration } from "../drizzle/schema";

export async function createAiGeneration(data: InsertAiGeneration) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(aiGenerations).values(data);
  return result.insertId;
}

export async function getAiGenerationsByUser(userId: number, opts?: { tool?: string; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) return [];
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const conditions = [eq(aiGenerations.userId, userId)];
  if (opts?.tool) conditions.push(eq(aiGenerations.tool, opts.tool));
  return db.select().from(aiGenerations)
    .where(and(...conditions))
    .orderBy(desc(aiGenerations.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAiGenerationCount(userId: number) {
  const db = await getDb(); if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(aiGenerations).where(eq(aiGenerations.userId, userId));
  return result?.count ?? 0;
}

// ═══════════ v8.3 - Admin Analytics ═══════════
export async function getAdminCreditSalesStats(period: "day" | "week" | "month") {
  const db = await getDb(); if (!db) return [];
  const groupFormat = period === "day" ? "%Y-%m-%d" : period === "week" ? "%Y-%u" : "%Y-%m";
  const rows = await db.execute(sql`
    SELECT DATE_FORMAT(createdAt, ${groupFormat}) as period, 
           SUM(amount) as totalAmount, 
           COUNT(*) as txCount
    FROM credit_transactions 
    WHERE type = 'purchase'
    GROUP BY period 
    ORDER BY period DESC 
    LIMIT 30
  `);
  return (rows as any)[0] || [];
}

export async function getAdminToolUsageStats() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.execute(sql`
    SELECT tool, COUNT(*) as useCount, SUM(creditsUsed) as totalCredits
    FROM ai_generations
    GROUP BY tool
    ORDER BY useCount DESC
  `);
  return (rows as any)[0] || [];
}

export async function getAdminUserStats() {
  const db = await getDb(); if (!db) return { totalUsers: 0, dau: 0, wau: 0, mau: 0, newToday: 0 };
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const todayActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE DATE(createdAt) = CURDATE()
  `);
  const weekActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `);
  const monthActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);
  const newToday = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM users WHERE DATE(createdAt) = CURDATE()
  `);
  return {
    totalUsers: totalUsers?.count ?? 0,
    dau: (todayActive as any)?.[0]?.[0]?.cnt ?? 0,
    wau: (weekActive as any)?.[0]?.[0]?.cnt ?? 0,
    mau: (monthActive as any)?.[0]?.[0]?.cnt ?? 0,
    newToday: (newToday as any)?.[0]?.[0]?.cnt ?? 0,
  };
}

export async function getGalleryPostsByUser(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(galleryPosts)
    .where(eq(galleryPosts.userId, userId))
    .orderBy(desc(galleryPosts.createdAt))
    .limit(limit);
}


// ── PiP Presets (v8.5) ──
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

// ── Interpreter Script Translation (v8.5) ──
export async function updateScriptInterpreter(scriptId: number, userId: number, data: {
  interpreterEnabled?: boolean;
  interpreterLanguage?: string;
  interpreterSections?: string;
  interpreterVoiceId?: string;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(lectureScripts).set(data).where(and(eq(lectureScripts.id, scriptId), eq(lectureScripts.userId, userId)));
}


// ── Shared Presets (Community Gallery) (v8.7) ──
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

// ── Subtitle Styles (v8.7) ──
export async function getSubtitleStyle(userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(subtitleStyles).where(eq(subtitleStyles.userId, userId)).limit(1);
  return rows[0] || null;
}

export async function upsertSubtitleStyle(userId: number, data: Partial<InsertSubtitleStyle>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(subtitleStyles).where(eq(subtitleStyles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(subtitleStyles).set({ ...data, updatedAt: new Date() }).where(eq(subtitleStyles.userId, userId));
  } else {
    await db.insert(subtitleStyles).values({ userId, ...data } as InsertSubtitleStyle);
  }
}

// ── Shared Subtitle Presets (v8.8) ──
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

// ── Preset Tags (v8.8) ──
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

// ── Add tags to existing avatar presets (v8.8) ──
export async function addTagsToAvatarPreset(presetId: number, tagIds: number[]) {
  return addTagsToPreset("avatar", presetId, tagIds);
}

// ── v8.9: My Presets Management ──
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

// ── v9.0: Cursor-based Pagination for Presets ──
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


// ============ Preset Search (v9.1) ============
export async function searchSharedPresets(keyword: string, type: "avatar" | "subtitle", limit = 20) {
  const db = await getDb(); if (!db) return [];
  const table = type === "avatar" ? sharedPresets : sharedSubtitlePresets;
  const pattern = `%${keyword}%`;
  return db.select().from(table)
    .where(or(like(table.name, pattern), like(table.description, pattern)))
    .orderBy(desc(table.likes))
    .limit(limit);
}

// ============ Preset Reports (v9.1) ============
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

// ============ Blocked Presets (v9.1) ============
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

// ============ Preset Versions (v9.1) ============
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

// ============ Notifications (v9.2) ============
export async function createNotification(data: InsertNotification) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function listNotifications(userId: number, limit = 20, offset = 0) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit).offset(offset);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb(); if (!db) return 0;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows[0]?.count || 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ============ Preset Comments (v9.2) ============
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

// ============ Admin Report Management (v9.2) ============
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

// updatePresetReportStatus already defined above (line ~3091)

export async function getPresetReportCount(status?: string) {
  const db = await getDb(); if (!db) return 0;
  const conditions = status ? eq(presetReports.status, status as any) : undefined;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(presetReports).where(conditions);
  return rows[0]?.count || 0;
}

// ============ v9.3: User Statistics ============
export async function getUserSignupStats(days: number) {
  const db = await getDb(); if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    date: sql<string>`DATE(createdAt)`,
    count: sql<number>`COUNT(*)`,
  }).from(users).where(gte(users.createdAt, since)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);
  return rows;
}

export async function getUserActivityStats(days: number) {
  const db = await getDb(); if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    date: sql<string>`DATE(lastSignedIn)`,
    count: sql<number>`COUNT(*)`,
  }).from(users).where(gte(users.lastSignedIn, since)).groupBy(sql`DATE(lastSignedIn)`).orderBy(sql`DATE(lastSignedIn)`);
  return rows;
}

export async function getUserTotalStats() {
  const db = await getDb(); if (!db) return { total: 0, instructors: 0, students: 0, admins: 0 };
  const total = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const instructors = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.platformRole, "instructor"));
  const students = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.platformRole, "student"));
  const admins = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.role, "admin"));
  return {
    total: total[0]?.count || 0,
    instructors: instructors[0]?.count || 0,
    students: students[0]?.count || 0,
    admins: admins[0]?.count || 0,
  };
}

// ============ v9.3: Preset Popularity Stats ============
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


// ── LectureBuilder Interpreter (v9.4) ──
export async function updateLectureProjectInterpreter(projectId: number, userId: number, data: {
  interpreterEnabled?: boolean;
  interpreterLanguage?: string;
  interpreterVoiceId?: string;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(lectureProjects).set(data).where(and(eq(lectureProjects.id, projectId), eq(lectureProjects.userId, userId)));
}

export async function updateSlideScriptInterpreterText(scriptId: number, interpreterText: string) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(slideScripts).set({ interpreterText }).where(eq(slideScripts.id, scriptId));
}

export async function bulkUpdateSlideScriptInterpreterTexts(projectId: number, translations: Array<{ slideId: number; interpreterText: string }>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const scripts = await db.select().from(slideScripts).where(eq(slideScripts.projectId, projectId));
  for (const t of translations) {
    const script = scripts.find(s => s.slideId === t.slideId);
    if (script) {
      await db.update(slideScripts).set({ interpreterText: t.interpreterText }).where(eq(slideScripts.id, script.id));
    }
  }
}


// ============ SCORM Packages (v10.0) ============

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

// ============ Creator Profiles (v10.2) ============

export async function getCreatorProfile(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId));
  return rows[0] || null;
}

export async function upsertCreatorProfile(userId: number, data: Partial<InsertCreatorProfile>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await getCreatorProfile(userId);
  if (existing) {
    await db.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId, userId));
    return { ...existing, ...data };
  } else {
    const [result] = await db.insert(creatorProfiles).values({ userId, displayName: data.displayName || "Creator", ...data }).$returningId();
    return { id: result.id, userId, ...data };
  }
}

// ============ Marketplace Listings (v10.2) ============

export async function createMarketplaceListing(data: InsertMarketplaceListing) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplaceListings).values(data).$returningId();
  return result;
}

export async function getMarketplaceListings(filters?: { category?: string; status?: string; search?: string; sellerId?: number; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const conditions = [eq(marketplaceListings.status, "active")];
  if (filters?.category && filters.category !== "all") {
    conditions.push(eq(marketplaceListings.category, filters.category as any));
  }
  if (filters?.sellerId) {
    conditions.push(eq(marketplaceListings.sellerId, filters.sellerId));
  }
  if (filters?.search) {
    conditions.push(like(marketplaceListings.title, `%${filters.search}%`));
  }
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  return db.select().from(marketplaceListings).where(and(...conditions)).orderBy(desc(marketplaceListings.createdAt)).limit(limit).offset(offset);
}

export async function getMarketplaceListingById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
  return rows[0] || null;
}

export async function updateMarketplaceListing(id: number, data: Partial<InsertMarketplaceListing>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(marketplaceListings).set(data).where(eq(marketplaceListings.id, id));
}

export async function getMyListings(sellerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.sellerId, sellerId)).orderBy(desc(marketplaceListings.createdAt));
}

export async function incrementListingViewCount(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(marketplaceListings).set({ viewCount: sql`${marketplaceListings.viewCount} + 1` }).where(eq(marketplaceListings.id, id));
}

// ============ Marketplace Purchases (v10.2) ============

export async function createMarketplacePurchase(data: InsertMarketplacePurchase) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplacePurchases).values(data).$returningId();
  return result;
}

export async function getMyPurchases(buyerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplacePurchases).where(eq(marketplacePurchases.buyerId, buyerId)).orderBy(desc(marketplacePurchases.createdAt));
}

export async function getPurchaseById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplacePurchases).where(eq(marketplacePurchases.id, id));
  return rows[0] || null;
}

export async function hasPurchased(buyerId: number, listingId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplacePurchases).where(and(eq(marketplacePurchases.buyerId, buyerId), eq(marketplacePurchases.listingId, listingId), eq(marketplacePurchases.status, "completed")));
  return rows.length > 0;
}

export async function getSellerEarnings(sellerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ total: sql<number>`COALESCE(SUM(${marketplacePurchases.sellerPayoutInCents}), 0)`, count: sql<number>`COUNT(*)` }).from(marketplacePurchases).where(and(eq(marketplacePurchases.sellerId, sellerId), eq(marketplacePurchases.status, "completed")));
  return rows[0] || { total: 0, count: 0 };
}

// ============ Marketplace Reviews (v10.2) ============

export async function createMarketplaceReview(data: InsertMarketplaceReview) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplaceReviews).values(data).$returningId();
  // Update listing avg rating
  const reviews = await db.select({ avg: sql<number>`AVG(${marketplaceReviews.rating})`, count: sql<number>`COUNT(*)` }).from(marketplaceReviews).where(eq(marketplaceReviews.listingId, data.listingId));
  if (reviews[0]) {
    await db.update(marketplaceListings).set({ avgRating: Math.round((reviews[0].avg || 0) * 100), reviewCount: reviews[0].count }).where(eq(marketplaceListings.id, data.listingId));
  }
  return result;
}

export async function getListingReviews(listingId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceReviews).where(eq(marketplaceReviews.listingId, listingId)).orderBy(desc(marketplaceReviews.createdAt));
}


// ============ Creator Payouts / Stripe Connect (v10.3) ============
export async function getCreatorPayouts(creatorId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(creatorPayouts).where(eq(creatorPayouts.creatorId, creatorId)).orderBy(desc(creatorPayouts.requestedAt));
}
export async function createPayout(data: InsertCreatorPayout) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(creatorPayouts).values(data).$returningId();
  return result;
}
export async function updatePayoutStatus(id: number, status: "pending" | "processing" | "completed" | "failed" | "cancelled", extra?: { stripeTransferId?: string; failureReason?: string; processedAt?: Date; completedAt?: Date }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(creatorPayouts).set({ status, ...extra }).where(eq(creatorPayouts.id, id));
}
export async function getPayoutById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorPayouts).where(eq(creatorPayouts.id, id));
  return rows[0];
}
export async function getPendingPayoutTotal(creatorId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ total: sql<number>`COALESCE(SUM(${creatorPayouts.netPayoutInCents}), 0)` }).from(creatorPayouts).where(and(eq(creatorPayouts.creatorId, creatorId), or(eq(creatorPayouts.status, "pending"), eq(creatorPayouts.status, "processing"))));
  return rows[0]?.total || 0;
}
export async function updateCreatorConnectAccount(creatorId: number, accountId: string, status: "not_started" | "pending" | "active" | "restricted") {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(creatorProfiles).set({ stripeConnectAccountId: accountId, stripeConnectStatus: status }).where(eq(creatorProfiles.id, creatorId));
}
export async function getCreatorProfileByUserId(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId));
  return rows[0];
}

// ============ User Learning History (v10.4) ============
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
export async function getUserCompletedListings(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(userLearningHistory).where(and(eq(userLearningHistory.userId, userId), eq(userLearningHistory.isCompleted, true)));
}

// ============ User Preferences (v10.4) ============
export async function getUserPreferences(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  return rows[0];
}
export async function upsertUserPreferences(userId: number, data: Partial<InsertUserPreference>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (existing.length > 0) {
    await db.update(userPreferences).set(data).where(eq(userPreferences.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(userPreferences).values({ userId, ...data }).$returningId();
  return result.id;
}

// ============ Recommendation Cache (v10.4) ============
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
export async function getPopularListings(limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.status, "active")).orderBy(desc(marketplaceListings.totalPurchases)).limit(limit);
}
export async function getRecentListings(limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.status, "active")).orderBy(desc(marketplaceListings.createdAt)).limit(limit);
}
export async function getListingsByCategory(category: string, limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(and(eq(marketplaceListings.status, "active"), eq(marketplaceListings.category, category as any))).orderBy(desc(marketplaceListings.totalPurchases)).limit(limit);
}

// ============ Real-time AI Interpretation (v12.0) ============
export async function getSupportedLanguages() {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(supportedLanguages).where(eq(supportedLanguages.isActive, true)).orderBy(supportedLanguages.sortOrder);
}

export async function createInterpretationSession(data: InsertInterpretationSession) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(interpretationSessions).values(data).$returningId();
  return result.id;
}

export async function getInterpretationSession(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(interpretationSessions).where(eq(interpretationSessions.id, id)).limit(1);
  return rows[0];
}

export async function getUserInterpretationSessions(userId: number, limit = 20) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(interpretationSessions).where(eq(interpretationSessions.hostUserId, userId)).orderBy(desc(interpretationSessions.createdAt)).limit(limit);
}

export async function endInterpretationSession(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(interpretationSessions).set({ status: "ended", endedAt: new Date() }).where(eq(interpretationSessions.id, id));
}

export async function updateInterpretationSessionStats(id: number, totalSegments: number, totalDurationSec: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(interpretationSessions).set({ totalSegments, totalDurationSec }).where(eq(interpretationSessions.id, id));
}

export async function addTranslationSegment(data: InsertTranslationSegment) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(translationSegments).values(data).$returningId();
  return result.id;
}

export async function getSessionSegments(sessionId: number, targetLang?: string, limit = 100) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const conditions = [eq(translationSegments.sessionId, sessionId)];
  if (targetLang) conditions.push(eq(translationSegments.targetLanguage, targetLang));
  return db.select().from(translationSegments).where(and(...conditions)).orderBy(translationSegments.createdAt).limit(limit);
}

export async function getSessionSegmentCount(sessionId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ count: sql<number>`count(*)` }).from(translationSegments).where(eq(translationSegments.sessionId, sessionId));
  return rows[0]?.count ?? 0;
}


// ============ System Settings helpers ============
export async function getSystemSetting(key: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
  return rows[0]?.settingValue ?? null;
}

export async function setSystemSetting(key: string, value: string, userId?: number) {
  const db = await getDb(); if (!db) return;
  await db.insert(systemSettings).values({ settingKey: key, settingValue: value, updatedBy: userId ?? null })
    .onDuplicateKeyUpdate({ set: { settingValue: value, updatedBy: userId ?? null } });
}

// ============ Project Collaboration helpers ============
export async function addCollaborator(data: InsertProjectCollaborator) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(projectCollaborators).values(data);
  return result[0].insertId;
}

export async function getProjectCollaborators(projectId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    userId: projectCollaborators.userId,
    role: projectCollaborators.role,
    inviteStatus: projectCollaborators.inviteStatus,
    inviteEmail: projectCollaborators.inviteEmail,
    createdAt: projectCollaborators.createdAt,
    userName: users.name,
    userEmail: users.email,
    userAvatar: users.avatarUrl,
  }).from(projectCollaborators)
    .leftJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, projectId))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function getMyCollaborations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    role: projectCollaborators.role,
    inviteStatus: projectCollaborators.inviteStatus,
    projectTitle: lectureProjects.title,
    createdAt: projectCollaborators.createdAt,
  }).from(projectCollaborators)
    .leftJoin(lectureProjects, eq(projectCollaborators.projectId, lectureProjects.id))
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.inviteStatus, "accepted")))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function getPendingInvitations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    role: projectCollaborators.role,
    inviteEmail: projectCollaborators.inviteEmail,
    projectTitle: lectureProjects.title,
    inviterName: users.name,
    createdAt: projectCollaborators.createdAt,
  }).from(projectCollaborators)
    .leftJoin(lectureProjects, eq(projectCollaborators.projectId, lectureProjects.id))
    .leftJoin(users, eq(projectCollaborators.invitedBy, users.id))
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.inviteStatus, "pending")))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function updateCollaboratorStatus(id: number, status: "accepted" | "rejected") {
  const db = await getDb(); if (!db) return;
  await db.update(projectCollaborators).set({ inviteStatus: status }).where(eq(projectCollaborators.id, id));
}

export async function removeCollaborator(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(projectCollaborators).where(eq(projectCollaborators.id, id));
}

export async function isProjectCollaborator(projectId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select({ id: projectCollaborators.id }).from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId),
      eq(projectCollaborators.inviteStatus, "accepted")
    )).limit(1);
  return rows.length > 0;
}

export async function getCollaboratorRole(projectId: number, userId: number): Promise<string | null> {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select({ role: projectCollaborators.role }).from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId),
      eq(projectCollaborators.inviteStatus, "accepted")
    )).limit(1);
  return rows[0]?.role ?? null;
}

export async function findUserByEmail(email: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}


// ─── Voice Clones ─────────────────────────────────────────────
export async function createVoiceClone(data: {
  userId: number;
  name: string;
  sampleUrl: string;
  sampleDurationSec?: number;
  language?: string;
  description?: string;
}) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(voiceClones).values({
    userId: data.userId,
    name: data.name,
    sampleUrl: data.sampleUrl,
    sampleDurationSec: data.sampleDurationSec,
    language: data.language || "ko",
    description: data.description,
    status: "processing",
  });
  return result.insertId;
}

export async function getVoiceClonesByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(voiceClones).where(eq(voiceClones.userId, userId)).orderBy(desc(voiceClones.createdAt));
}

export async function getVoiceCloneById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(voiceClones).where(eq(voiceClones.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateVoiceClone(id: number, data: Partial<{
  name: string;
  status: "uploading" | "processing" | "ready" | "failed";
  cloneVoiceId: string;
  errorMessage: string;
  description: string;
}>) {
  const db = await getDb(); if (!db) return;
  await db.update(voiceClones).set(data).where(eq(voiceClones.id, id));
}

export async function deleteVoiceClone(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(voiceClones).where(eq(voiceClones.id, id));
}

// ============ Broadcast Recordings ============
export async function createBroadcastRecording(data: InsertBroadcastRecording) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(broadcastRecordings).values(data);
  return result[0].insertId;
}

export async function getBroadcastRecording(broadcastId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(broadcastRecordings).where(eq(broadcastRecordings.broadcastId, broadcastId)).limit(1);
  return rows[0] || null;
}

export async function updateBroadcastRecording(id: number, data: Partial<InsertBroadcastRecording>) {
  const db = await getDb();
  if (!db) return;
  await db.update(broadcastRecordings).set(data).where(eq(broadcastRecordings.id, id));
}

export async function listBroadcastRecordings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(broadcastRecordings)
    .innerJoin(liveBroadcasts, eq(broadcastRecordings.broadcastId, liveBroadcasts.id))
    .where(eq(liveBroadcasts.instructorId, userId))
    .orderBy(desc(broadcastRecordings.createdAt));
}

// ============ Broadcast Analytics ============
export async function createBroadcastAnalytics(data: InsertBroadcastAnalytic) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(broadcastAnalytics).values(data);
  return result[0].insertId;
}

export async function getBroadcastAnalytics(broadcastId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(broadcastAnalytics).where(eq(broadcastAnalytics.broadcastId, broadcastId)).limit(1);
  return rows[0] || null;
}

export async function updateBroadcastAnalytics(id: number, data: Partial<InsertBroadcastAnalytic>) {
  const db = await getDb();
  if (!db) return;
  await db.update(broadcastAnalytics).set(data).where(eq(broadcastAnalytics.id, id));
}

export async function listBroadcastAnalytics(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(broadcastAnalytics)
    .innerJoin(liveBroadcasts, eq(broadcastAnalytics.broadcastId, liveBroadcasts.id))
    .where(eq(liveBroadcasts.instructorId, userId))
    .orderBy(desc(broadcastAnalytics.createdAt));
}

export async function generateBroadcastAnalytics(broadcastId: number) {
  const db = await getDb();
  if (!db) return null;
  // Aggregate stats from viewers and chats
  const viewers = await db.select().from(broadcastViewers).where(eq(broadcastViewers.broadcastId, broadcastId));
  const chats = await db.select().from(broadcastChats).where(eq(broadcastChats.broadcastId, broadcastId));
  const broadcast = await db.select().from(liveBroadcasts).where(eq(liveBroadcasts.id, broadcastId)).limit(1);
  if (!broadcast[0]) return null;

  const totalViewers = viewers.length;
  const peakConcurrentViewers = broadcast[0].peakViewers || 0;
  const totalChatMessages = chats.length;
  const totalQuestions = chats.filter(c => c.messageType === "question").length;

  // Calculate avg watch duration
  let totalWatchSec = 0;
  for (const v of viewers) {
    const joinTime = v.joinedAt?.getTime() || 0;
    const leftTime = v.leftAt?.getTime() || broadcast[0].endedAt?.getTime() || Date.now();
    totalWatchSec += Math.floor((leftTime - joinTime) / 1000);
  }
  const avgWatchDurationSec = totalViewers > 0 ? Math.floor(totalWatchSec / totalViewers) : 0;

  // Retention: viewers who stayed till end
  const endTime = broadcast[0].endedAt?.getTime() || Date.now();
  const stayedTillEnd = viewers.filter(v => !v.leftAt || v.leftAt.getTime() >= endTime - 60000).length;
  const retentionRate = totalViewers > 0 ? Math.round((stayedTillEnd / totalViewers) * 100) : 0;

  // Engagement score (0-100)
  const chatRate = totalViewers > 0 ? totalChatMessages / totalViewers : 0;
  const engagementScore = Math.min(100, Math.round(retentionRate * 0.5 + Math.min(chatRate * 10, 50)));

  const analyticsData: InsertBroadcastAnalytic = {
    broadcastId,
    totalViewers,
    peakConcurrentViewers,
    avgWatchDurationSec,
    totalChatMessages,
    totalQuestions,
    retentionRate,
    engagementScore,
  };

  // Check if analytics already exist
  const existing = await db.select().from(broadcastAnalytics).where(eq(broadcastAnalytics.broadcastId, broadcastId)).limit(1);
  if (existing[0]) {
    await db.update(broadcastAnalytics).set(analyticsData).where(eq(broadcastAnalytics.id, existing[0].id));
    return { ...existing[0], ...analyticsData };
  } else {
    const result = await db.insert(broadcastAnalytics).values(analyticsData);
    return { id: result[0].insertId, ...analyticsData };
  }
}


// ============ User Custom Avatars ============
export async function listUserAvatars(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userAvatars).where(eq(userAvatars.userId, userId)).orderBy(desc(userAvatars.createdAt));
}

export async function createUserAvatar(data: InsertUserAvatar) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const result = await db.insert(userAvatars).values(data);
  return result[0].insertId;
}

export async function getUserAvatar(id: number, userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(userAvatars).where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId))).limit(1);
  return result[0];
}

export async function updateUserAvatar(id: number, userId: number, data: Partial<InsertUserAvatar>) {
  const db = await getDb(); if (!db) return;
  await db.update(userAvatars).set(data).where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId)));
}

export async function deleteUserAvatar(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(userAvatars).where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId)));
}

export async function toggleUserAvatarFavorite(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  const [row] = await db.select({ isFavorite: userAvatars.isFavorite }).from(userAvatars)
    .where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId))).limit(1);
  if (!row) return;
  const newVal = !row.isFavorite;
  await db.update(userAvatars).set({ isFavorite: newVal }).where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId)));
  return newVal;
}

export async function recordUserAvatarUsage(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(userAvatars).set({
    lastUsedAt: new Date(),
    useCount: sql`useCount + 1`,
  }).where(and(eq(userAvatars.id, id), eq(userAvatars.userId, userId)));
}

export async function listUserAvatarsSorted(userId: number, sortBy: "favorite" | "recent" | "name" | "created") {
  const db = await getDb(); if (!db) return [];
  let orderClauses;
  switch (sortBy) {
    case "favorite":
      orderClauses = [desc(userAvatars.isFavorite), desc(userAvatars.lastUsedAt), desc(userAvatars.createdAt)];
      break;
    case "recent":
      orderClauses = [desc(userAvatars.lastUsedAt), desc(userAvatars.createdAt)];
      break;
    case "name":
      orderClauses = [asc(userAvatars.name), desc(userAvatars.createdAt)];
      break;
    case "created":
    default:
      orderClauses = [desc(userAvatars.createdAt)];
      break;
  }
  return db.select().from(userAvatars).where(eq(userAvatars.userId, userId)).orderBy(...orderClauses);
}

// ========== D-ID Video History ==========
export async function createDidVideoRecord(data: InsertDidVideoHistory) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(didVideoHistory).values(data).$returningId();
  return result?.id ?? null;
}
export async function updateDidVideoRecord(id: number, userId: number, data: Partial<InsertDidVideoHistory>) {
  const db = await getDb(); if (!db) return;
  await db.update(didVideoHistory).set(data).where(and(eq(didVideoHistory.id, id), eq(didVideoHistory.userId, userId)));
}
export async function listDidVideoHistory(userId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(didVideoHistory).where(eq(didVideoHistory.userId, userId)).orderBy(desc(didVideoHistory.createdAt)).limit(limit);
}
export async function getDidVideoById(id: number, userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(didVideoHistory).where(and(eq(didVideoHistory.id, id), eq(didVideoHistory.userId, userId))).limit(1);
  return rows[0] ?? null;
}
export async function deleteDidVideo(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(didVideoHistory).where(and(eq(didVideoHistory.id, id), eq(didVideoHistory.userId, userId)));
}
export async function listDidVideosByScript(scriptId: number, userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(didVideoHistory).where(and(eq(didVideoHistory.scriptId, scriptId), eq(didVideoHistory.userId, userId))).orderBy(asc(didVideoHistory.sectionIndex));
}
