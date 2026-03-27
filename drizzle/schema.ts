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
  /** Duration in seconds */
  duration: int("duration").default(0),
  /** Total Q&A messages archived */
  messageCount: int("messageCount").default(0),
  /** Total whiteboard snapshots */
  snapshotCount: int("snapshotCount").default(0),
  /** Status of VOD processing */
  status: mysqlEnum("status", ["processing", "ready", "failed"]).default("processing").notNull(),
  /** Thumbnail URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** View count */
  viewCount: int("viewCount").default(0),
  /** Recording start/end timestamps */
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VodRecording = typeof vodRecordings.$inferSelect;
export type InsertVodRecording = typeof vodRecordings.$inferInsert;

/**
 * VOD Timeline Events - Q&A messages and whiteboard snapshots with timestamps for replay
 */
export const vodTimelineEvents = mysqlTable("vodTimelineEvents", {
  id: int("id").autoincrement().primaryKey(),
  vodId: int("vodId").notNull(),
  /** Event type: qa_question, qa_answer, whiteboard_snapshot, slide_change */
  eventType: mysqlEnum("eventType", ["qa_question", "qa_answer", "whiteboard_snapshot", "slide_change"]).default("qa_question").notNull(),
  /** Offset in seconds from recording start */
  offsetSeconds: int("offsetSeconds").default(0),
  /** Event content (message text, snapshot data, slide index) */
  content: text("content"),
  /** Optional: user who triggered the event */
  userId: int("userId"),
  /** Optional: audio URL for TTS answers */
  audioUrl: text("audioUrl"),
  /** Optional: avatar video URL */
  avatarVideoUrl: text("avatarVideoUrl"),
  /** Optional: slide index for slide_change events */
  slideIndex: int("slideIndex"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VodTimelineEvent = typeof vodTimelineEvents.$inferSelect;
export type InsertVodTimelineEvent = typeof vodTimelineEvents.$inferInsert;

/**
 * Translations - cached AI translations for Q&A answers and lecture content
 */
export const translations = mysqlTable("translations", {
  id: int("id").autoincrement().primaryKey(),
  /** Source type: qa_message, lecture_title, lecture_description */
  sourceType: mysqlEnum("sourceType", ["qa_message", "lecture_title", "lecture_description"]).default("qa_message").notNull(),
  /** Source record ID */
  sourceId: int("sourceId").notNull(),
  /** Source language (ISO 639-1) */
  sourceLang: varchar("sourceLang", { length: 10 }).default("ko").notNull(),
  /** Target language (ISO 639-1) */
  targetLang: varchar("targetLang", { length: 10 }).notNull(),
  /** Original text */
  originalText: text("originalText").notNull(),
  /** Translated text */
  translatedText: text("translatedText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;
