import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  platformRole: mysqlEnum("platformRole", ["instructor", "student"]).default("student").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  /** Preferred language for translations */
  preferredLang: varchar("preferredLang", { length: 10 }).default("ko"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Voice profiles for instructors (voice cloning)
 */
export const voiceProfiles = mysqlTable("voiceProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sampleUrl: text("sampleUrl"),
  voiceDescription: text("voiceDescription"),
  teachingStyle: text("teachingStyle"),
  systemPrompt: text("systemPrompt"),
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).default("alloy"),
  /** D-ID avatar image URL for avatar mode */
  avatarImageUrl: text("avatarImageUrl"),
  /** D-ID presenter style */
  avatarStyle: varchar("avatarStyle", { length: 64 }).default("rectangular"),
  /** D-ID API key for this profile (optional, falls back to global) */
  didApiKey: text("didApiKey"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type InsertVoiceProfile = typeof voiceProfiles.$inferInsert;

/**
 * Lectures (courses/classes)
 */
export const lectures = mysqlTable("lectures", {
  id: int("id").autoincrement().primaryKey(),
  instructorId: int("instructorId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).default("web3").notNull(),
  aiMode: mysqlEnum("aiMode", ["voice", "text", "avatar"]).default("voice").notNull(),
  voiceProfileId: int("voiceProfileId"),
  status: mysqlEnum("status", ["draft", "scheduled", "live", "completed", "archived"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  coverImageUrl: text("coverImageUrl"),
  maxParticipants: int("maxParticipants").default(0),
  aiContext: text("aiContext"),
  /** Enable auto-recording for VOD */
  autoRecord: boolean("autoRecord").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lecture = typeof lectures.$inferSelect;
export type InsertLecture = typeof lectures.$inferInsert;

/**
 * Lecture materials (PPT slides, PDFs, etc.)
 */
export const lectureMaterials = mysqlTable("lectureMaterials", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "ppt", "image", "video", "other"]).default("pdf").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  pageCount: int("pageCount").default(0),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LectureMaterial = typeof lectureMaterials.$inferSelect;
export type InsertLectureMaterial = typeof lectureMaterials.$inferInsert;

/**
 * Lecture enrollments (student participation)
 */
export const lectureEnrollments = mysqlTable("lectureEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
});

export type LectureEnrollment = typeof lectureEnrollments.$inferSelect;
export type InsertLectureEnrollment = typeof lectureEnrollments.$inferInsert;

/**
 * Q&A messages in lecture rooms
 */
export const qaMessages = mysqlTable("qaMessages", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  userId: int("userId"),
  messageType: mysqlEnum("messageType", ["question", "answer", "system"]).default("question").notNull(),
  inputMethod: mysqlEnum("inputMethod", ["text", "voice"]).default("text").notNull(),
  content: text("content").notNull(),
  audioUrl: text("audioUrl"),
  /** Avatar video URL (D-ID generated) */
  avatarVideoUrl: text("avatarVideoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QaMessage = typeof qaMessages.$inferSelect;
export type InsertQaMessage = typeof qaMessages.$inferInsert;

/**
 * Whiteboard snapshots
 */
export const whiteboardSnapshots = mysqlTable("whiteboardSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  snapshotData: text("snapshotData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhiteboardSnapshot = typeof whiteboardSnapshots.$inferSelect;
export type InsertWhiteboardSnapshot = typeof whiteboardSnapshots.$inferInsert;

/**
 * VOD Recordings - archived lecture sessions
 */
export const vodRecordings = mysqlTable("vodRecordings", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  duration: int("duration").default(0),
  messageCount: int("messageCount").default(0),
  snapshotCount: int("snapshotCount").default(0),
  status: mysqlEnum("status", ["processing", "ready", "failed"]).default("processing").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  viewCount: int("viewCount").default(0),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VodRecording = typeof vodRecordings.$inferSelect;
export type InsertVodRecording = typeof vodRecordings.$inferInsert;

/**
 * VOD Timeline Events
 */
export const vodTimelineEvents = mysqlTable("vodTimelineEvents", {
  id: int("id").autoincrement().primaryKey(),
  vodId: int("vodId").notNull(),
  eventType: mysqlEnum("eventType", ["qa_question", "qa_answer", "whiteboard_snapshot", "slide_change"]).default("qa_question").notNull(),
  offsetSeconds: int("offsetSeconds").default(0),
  content: text("content"),
  userId: int("userId"),
  audioUrl: text("audioUrl"),
  avatarVideoUrl: text("avatarVideoUrl"),
  slideIndex: int("slideIndex"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VodTimelineEvent = typeof vodTimelineEvents.$inferSelect;
export type InsertVodTimelineEvent = typeof vodTimelineEvents.$inferInsert;

/**
 * Translations - cached AI translations
 */
export const translations = mysqlTable("translations", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["qa_message", "lecture_title", "lecture_description"]).default("qa_message").notNull(),
  sourceId: int("sourceId").notNull(),
  sourceLang: varchar("sourceLang", { length: 10 }).default("ko").notNull(),
  targetLang: varchar("targetLang", { length: 10 }).notNull(),
  originalText: text("originalText").notNull(),
  translatedText: text("translatedText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

// ============ v1.2 NEW TABLES ============

/**
 * Learning progress - tracks student engagement per lecture
 */
export const learningProgress = mysqlTable("learningProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lectureId: int("lectureId").notNull(),
  /** Number of Q&A questions asked */
  questionsAsked: int("questionsAsked").default(0),
  /** Number of Q&A answers received */
  answersReceived: int("answersReceived").default(0),
  /** Total time spent in lecture (seconds) */
  timeSpentSeconds: int("timeSpentSeconds").default(0),
  /** Last slide index viewed */
  lastSlideIndex: int("lastSlideIndex").default(0),
  /** Completion percentage (0-100) */
  completionPercent: int("completionPercent").default(0),
  /** Last activity timestamp */
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = typeof learningProgress.$inferInsert;

/**
 * VOD watch history - tracks student VOD viewing
 */
export const vodWatchHistory = mysqlTable("vodWatchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vodId: int("vodId").notNull(),
  /** Watch progress in seconds */
  watchedSeconds: int("watchedSeconds").default(0),
  /** Total duration of VOD */
  totalSeconds: int("totalSeconds").default(0),
  /** Watch completion percentage (0-100) */
  completionPercent: int("completionPercent").default(0),
  /** Number of times watched */
  watchCount: int("watchCount").default(1),
  lastWatchedAt: timestamp("lastWatchedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VodWatchHistory = typeof vodWatchHistory.$inferSelect;
export type InsertVodWatchHistory = typeof vodWatchHistory.$inferInsert;

/**
 * Q&A Bookmarks - students can bookmark useful Q&A exchanges
 */
export const qaBookmarks = mysqlTable("qaBookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageId: int("messageId").notNull(),
  lectureId: int("lectureId").notNull(),
  /** Optional note from the student */
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QaBookmark = typeof qaBookmarks.$inferSelect;
export type InsertQaBookmark = typeof qaBookmarks.$inferInsert;

/**
 * AI Context Templates - pre-built templates for different lecture categories
 */
export const aiContextTemplates = mysqlTable("aiContextTemplates", {
  id: int("id").autoincrement().primaryKey(),
  /** Category this template belongs to */
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).notNull(),
  /** Template name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Description of what this template covers */
  description: text("description"),
  /** The AI system prompt template */
  systemPrompt: text("systemPrompt").notNull(),
  /** Key topics covered */
  topics: text("topics"),
  /** Difficulty level */
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  /** Is this a built-in template (not deletable) */
  isBuiltIn: boolean("isBuiltIn").default(true),
  /** Creator user ID (null for built-in) */
  creatorId: int("creatorId"),
  /** Usage count */
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiContextTemplate = typeof aiContextTemplates.$inferSelect;
export type InsertAiContextTemplate = typeof aiContextTemplates.$inferInsert;
