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
  /** Platform role: instructor or student */
  platformRole: mysqlEnum("platformRole", ["instructor", "student"]).default("student").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
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
  /** URL to the uploaded voice sample */
  sampleUrl: text("sampleUrl"),
  /** Description of voice characteristics */
  voiceDescription: text("voiceDescription"),
  /** Teaching style notes (pace, tone, habits) */
  teachingStyle: text("teachingStyle"),
  /** System prompt for AI to mimic this instructor */
  systemPrompt: text("systemPrompt"),
  /** OpenAI TTS voice ID or custom voice ID */
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).default("alloy"),
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
  /** AI presentation mode */
  aiMode: mysqlEnum("aiMode", ["voice", "text", "avatar"]).default("voice").notNull(),
  /** Voice profile to use for this lecture */
  voiceProfileId: int("voiceProfileId"),
  /** Lecture status */
  status: mysqlEnum("status", ["draft", "scheduled", "live", "completed", "archived"]).default("draft").notNull(),
  /** Scheduled start time */
  scheduledAt: timestamp("scheduledAt"),
  /** Cover image URL */
  coverImageUrl: text("coverImageUrl"),
  /** Max participants (0 = unlimited) */
  maxParticipants: int("maxParticipants").default(0),
  /** AI knowledge base / context for Q&A */
  aiContext: text("aiContext"),
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
  /** File type */
  fileType: mysqlEnum("fileType", ["pdf", "ppt", "image", "video", "other"]).default("pdf").notNull(),
  /** S3 file URL */
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  /** Number of pages/slides */
  pageCount: int("pageCount").default(0),
  /** Sort order */
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
  /** Last active timestamp */
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
  /** Question or answer */
  messageType: mysqlEnum("messageType", ["question", "answer", "system"]).default("question").notNull(),
  /** Input method */
  inputMethod: mysqlEnum("inputMethod", ["text", "voice"]).default("text").notNull(),
  content: text("content").notNull(),
  /** AI-generated audio URL for the answer */
  audioUrl: text("audioUrl"),
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
  /** tldraw snapshot data (JSON) */
  snapshotData: text("snapshotData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhiteboardSnapshot = typeof whiteboardSnapshots.$inferSelect;
export type InsertWhiteboardSnapshot = typeof whiteboardSnapshots.$inferInsert;
