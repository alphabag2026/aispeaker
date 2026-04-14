import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  googleId: varchar("googleId", { length: 128 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  platformRole: mysqlEnum("platformRole", ["instructor", "student"]).default("student").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
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
  avatarImageUrl: text("avatarImageUrl"),
  avatarStyle: varchar("avatarStyle", { length: 64 }).default("rectangular"),
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
  autoRecord: boolean("autoRecord").default(true),
  /** Face swap profile to use for this lecture */
  faceSwapProfileId: int("faceSwapProfileId"),
  /** Voice modulation profile to use */
  voiceModProfileId: int("voiceModProfileId"),
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

/**
 * Learning progress - tracks student engagement per lecture
 */
export const learningProgress = mysqlTable("learningProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lectureId: int("lectureId").notNull(),
  questionsAsked: int("questionsAsked").default(0),
  answersReceived: int("answersReceived").default(0),
  timeSpentSeconds: int("timeSpentSeconds").default(0),
  lastSlideIndex: int("lastSlideIndex").default(0),
  completionPercent: int("completionPercent").default(0),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LearningProgress = typeof learningProgress.$inferSelect;
export type InsertLearningProgress = typeof learningProgress.$inferInsert;

/**
 * VOD watch history
 */
export const vodWatchHistory = mysqlTable("vodWatchHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vodId: int("vodId").notNull(),
  watchedSeconds: int("watchedSeconds").default(0),
  totalSeconds: int("totalSeconds").default(0),
  completionPercent: int("completionPercent").default(0),
  watchCount: int("watchCount").default(1),
  lastWatchedAt: timestamp("lastWatchedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VodWatchHistory = typeof vodWatchHistory.$inferSelect;
export type InsertVodWatchHistory = typeof vodWatchHistory.$inferInsert;

/**
 * Q&A Bookmarks
 */
export const qaBookmarks = mysqlTable("qaBookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageId: int("messageId").notNull(),
  lectureId: int("lectureId").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QaBookmark = typeof qaBookmarks.$inferSelect;
export type InsertQaBookmark = typeof qaBookmarks.$inferInsert;

/**
 * AI Context Templates
 */
export const aiContextTemplates = mysqlTable("aiContextTemplates", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(),
  topics: text("topics"),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  isBuiltIn: boolean("isBuiltIn").default(true),
  creatorId: int("creatorId"),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiContextTemplate = typeof aiContextTemplates.$inferSelect;
export type InsertAiContextTemplate = typeof aiContextTemplates.$inferInsert;

// ============ v2.0 NEW TABLES ============

/**
 * Face Swap Profiles - deepfake face transformation settings
 * Stores source face image and target face for D-ID/HeyGen face swap
 */
export const faceSwapProfiles = mysqlTable("faceSwapProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Original face image URL (instructor's real face) */
  sourceFaceUrl: text("sourceFaceUrl"),
  /** Target face image URL (the face to transform into) */
  targetFaceUrl: text("targetFaceUrl"),
  /** Face swap method: did (D-ID), heygen, or built-in simulation */
  method: mysqlEnum("method", ["did", "heygen", "builtin"]).default("builtin").notNull(),
  /** Additional settings JSON (age adjustment, gender, ethnicity hints) */
  settings: text("settings"),
  /** Preview image URL showing the face swap result */
  previewUrl: text("previewUrl"),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FaceSwapProfile = typeof faceSwapProfiles.$inferSelect;
export type InsertFaceSwapProfile = typeof faceSwapProfiles.$inferInsert;

/**
 * Voice Modulation Profiles - voice disguise settings
 * Transforms pitch, speed, tone, and speaking style
 */
export const voiceModProfiles = mysqlTable("voiceModProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Pitch shift in semitones (-12 to +12) */
  pitchShift: int("pitchShift").default(0),
  /** Speed multiplier (50-200, where 100 = normal) */
  speedPercent: int("speedPercent").default(100),
  /** Tone warmth (-100 cold to +100 warm) */
  toneWarmth: int("toneWarmth").default(0),
  /** Speaking style: formal, casual, academic, friendly, authoritative */
  speakingStyle: mysqlEnum("speakingStyle", ["formal", "casual", "academic", "friendly", "authoritative"]).default("formal").notNull(),
  /** Target voice character: male_deep, male_bright, female_warm, female_clear, neutral */
  voiceCharacter: mysqlEnum("voiceCharacter", ["male_deep", "male_bright", "female_warm", "female_clear", "neutral"]).default("neutral").notNull(),
  /** Custom TTS voice ID override */
  customTtsVoiceId: varchar("customTtsVoiceId", { length: 128 }),
  /** AI prompt for speaking style transformation */
  stylePrompt: text("stylePrompt"),
  /** Preview audio URL */
  previewAudioUrl: text("previewAudioUrl"),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VoiceModProfile = typeof voiceModProfiles.$inferSelect;
export type InsertVoiceModProfile = typeof voiceModProfiles.$inferInsert;

/**
 * Platform Integrations - external meeting platform settings
 * Stores credentials and settings for Zoom, Google Meet, Webex, Tencent Meeting
 */
export const platformIntegrations = mysqlTable("platformIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Platform type */
  platform: mysqlEnum("platform", ["zoom", "google_meet", "webex", "tencent", "obs"]).notNull(),
  /** Display name for this integration */
  name: varchar("name", { length: 255 }).notNull(),
  /** API key or access token (encrypted) */
  apiKey: text("apiKey"),
  /** API secret */
  apiSecret: text("apiSecret"),
  /** Meeting URL template or default meeting link */
  meetingUrl: text("meetingUrl"),
  /** Additional config JSON (e.g., OBS scene settings, virtual camera config) */
  config: text("config"),
  /** Whether this integration is active */
  isActive: boolean("isActive").default(true),
  /** Last successful connection test */
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformIntegration = typeof platformIntegrations.$inferSelect;
export type InsertPlatformIntegration = typeof platformIntegrations.$inferInsert;

/**
 * Certificates - auto-generated completion certificates
 */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lectureId: int("lectureId").notNull(),
  /** Certificate unique code for verification */
  certificateCode: varchar("certificateCode", { length: 64 }).notNull().unique(),
  /** Student name on certificate */
  studentName: varchar("studentName", { length: 255 }).notNull(),
  /** Lecture title on certificate */
  lectureTitle: varchar("lectureTitle", { length: 500 }).notNull(),
  /** Instructor name on certificate */
  instructorName: varchar("instructorName", { length: 255 }),
  /** Completion percentage at time of issue */
  completionPercent: int("completionPercent").default(100),
  /** Certificate PDF URL (stored in S3) */
  pdfUrl: text("pdfUrl"),
  /** Certificate design template name */
  templateName: varchar("templateName", { length: 128 }).default("default"),
  /** Issue date */
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Lecture Sessions - tracks live streaming sessions with face/voice mods
 * Used for WebRTC and external platform streaming
 */
export const lectureSessions = mysqlTable("lectureSessions", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId").notNull(),
  instructorId: int("instructorId").notNull(),
  /** Session status */
  status: mysqlEnum("status", ["preparing", "live", "paused", "ended"]).default("preparing").notNull(),
  /** Face swap profile used in this session */
  faceSwapProfileId: int("faceSwapProfileId"),
  /** Voice modulation profile used */
  voiceModProfileId: int("voiceModProfileId"),
  /** External platform being streamed to */
  platformIntegrationId: int("platformIntegrationId"),
  /** External meeting URL for this session */
  externalMeetingUrl: text("externalMeetingUrl"),
  /** WebRTC room ID for internal streaming */
  webrtcRoomId: varchar("webrtcRoomId", { length: 128 }),
  /** Session start time */
  startedAt: timestamp("startedAt"),
  /** Session end time */
  endedAt: timestamp("endedAt"),
  /** Duration in seconds */
  durationSeconds: int("durationSeconds").default(0),
  /** Number of viewers */
  viewerCount: int("viewerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LectureSession = typeof lectureSessions.$inferSelect;
export type InsertLectureSession = typeof lectureSessions.$inferInsert;

// ============ v2.1 NEW TABLES ============

/**
 * Lecture Scripts - AI-generated lecture scripts
 * Stores auto-generated scripts from prompts, used for TTS + avatar video production
 */
export const lectureScripts = mysqlTable("lectureScripts", {
  id: int("id").autoincrement().primaryKey(),
  lectureId: int("lectureId"),
  userId: int("userId").notNull(),
  /** Script title */
  title: varchar("title", { length: 500 }).notNull(),
  /** Original prompt used to generate the script */
  prompt: text("prompt").notNull(),
  /** Category for context */
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).default("web3").notNull(),
  /** Target audience level */
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  /** Target language */
  language: varchar("language", { length: 10 }).default("ko"),
  /** Target duration in minutes */
  targetDurationMin: int("targetDurationMin").default(10),
  /** Generated full script text */
  scriptContent: text("scriptContent"),
  /** Script sections as JSON array [{title, content, durationSec, slideNotes}] */
  sections: text("sections"),
  /** Total estimated duration in seconds */
  estimatedDurationSec: int("estimatedDurationSec").default(0),
  /** Number of sections/slides */
  sectionCount: int("sectionCount").default(0),
  /** Generation status */
  status: mysqlEnum("status", ["generating", "ready", "error"]).default("generating").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LectureScript = typeof lectureScripts.$inferSelect;
export type InsertLectureScript = typeof lectureScripts.$inferInsert;

/**
 * Production Pipelines - one-click lecture video production jobs
 * Orchestrates script -> TTS -> avatar -> final video pipeline
 */
export const productionPipelines = mysqlTable("productionPipelines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scriptId: int("scriptId").notNull(),
  /** Pipeline title */
  title: varchar("title", { length: 500 }).notNull(),
  /** Current pipeline status */
  status: mysqlEnum("status", ["queued", "script_gen", "tts_gen", "avatar_gen", "compositing", "completed", "failed", "cancelled"]).default("queued").notNull(),
  /** Overall progress percentage (0-100) */
  progressPercent: int("progressPercent").default(0),
  /** Current step description */
  currentStep: varchar("currentStep", { length: 255 }),
  /** Voice profile to use for TTS */
  voiceProfileId: int("voiceProfileId"),
  /** Voice modulation profile */
  voiceModProfileId: int("voiceModProfileId"),
  /** Face swap profile for avatar */
  faceSwapProfileId: int("faceSwapProfileId"),
  /** Sample face ID (from sampleFaces gallery) */
  sampleFaceId: int("sampleFaceId"),
  /** TTS voice ID override */
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).default("alloy"),
  /** Generated audio URLs as JSON array */
  audioUrls: text("audioUrls"),
  /** Generated avatar video URLs as JSON array */
  avatarVideoUrls: text("avatarVideoUrls"),
  /** Final combined video URL */
  finalVideoUrl: text("finalVideoUrl"),
  /** Thumbnail URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** Subtitle file URL (SRT) */
  subtitleUrl: text("subtitleUrl"),
  /** Intro video URL (Seedance 2.0) */
  introVideoUrl: text("introVideoUrl"),
  /** Outro video URL (Seedance 2.0) */
  outroVideoUrl: text("outroVideoUrl"),
  /** Avatar engine used (d-id or heygen) */
  avatarEngine: varchar("avatarEngine", { length: 32 }).default("d-id"),
  /** Total duration in seconds */
  totalDurationSec: int("totalDurationSec").default(0),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** Pipeline config JSON (quality, resolution, etc.) */
  config: text("config"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionPipeline = typeof productionPipelines.$inferSelect;
export type InsertProductionPipeline = typeof productionPipelines.$inferInsert;

// ============ v2.3 NEW TABLES ============

/**
 * Script Templates - reusable lecture structure templates
 * Stores predefined section structures that can be applied when creating new scripts
 */
export const scriptTemplates = mysqlTable("scriptTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  /** Template name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Template description */
  description: text("description"),
  /** Category for context */
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).default("general").notNull(),
  /** Target difficulty */
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  /** Template structure as JSON array [{title, description, durationPercent, slideNotes}] */
  structure: text("structure").notNull(),
  /** Number of sections in the template */
  sectionCount: int("sectionCount").default(0),
  /** Target duration in minutes */
  targetDurationMin: int("targetDurationMin").default(10),
  /** Whether this is a built-in system template */
  isBuiltIn: boolean("isBuiltIn").default(false),
  /** Tags for search (comma-separated) */
  tags: text("tags"),
  /** Usage count */
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScriptTemplate = typeof scriptTemplates.$inferSelect;
export type InsertScriptTemplate = typeof scriptTemplates.$inferInsert;


// ============ v2.4 NEW TABLES ============

/**
 * Script Versions - automatic version history for lecture scripts
 * Every edit creates a snapshot so users can rollback to any previous version
 */
export const scriptVersions = mysqlTable("scriptVersions", {
  id: int("id").autoincrement().primaryKey(),
  scriptId: int("scriptId").notNull(),
  userId: int("userId").notNull(),
  /** Version number (auto-incremented per script) */
  versionNumber: int("versionNumber").notNull(),
  /** Snapshot of script title at this version */
  title: varchar("title", { length: 500 }).notNull(),
  /** Snapshot of full script content */
  scriptContent: text("scriptContent"),
  /** Snapshot of sections JSON */
  sections: text("sections"),
  /** Number of sections */
  sectionCount: int("sectionCount").default(0),
  /** Estimated duration */
  estimatedDurationSec: int("estimatedDurationSec").default(0),
  /** What changed in this version */
  changeDescription: text("changeDescription"),
  /** Change type: auto (from edit), manual (explicit save), rollback */
  changeType: mysqlEnum("changeType", ["auto", "manual", "rollback"]).default("auto").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScriptVersion = typeof scriptVersions.$inferSelect;
export type InsertScriptVersion = typeof scriptVersions.$inferInsert;

/**
 * Content Analyses - AI-powered script quality analysis reports
 * Stores readability, difficulty, keyword density, and improvement suggestions
 */
export const contentAnalyses = mysqlTable("contentAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  scriptId: int("scriptId").notNull(),
  userId: int("userId").notNull(),
  /** Overall quality score (0-100) */
  overallScore: int("overallScore").default(0),
  /** Readability score (0-100) */
  readabilityScore: int("readabilityScore").default(0),
  /** Difficulty appropriateness score (0-100) */
  difficultyScore: int("difficultyScore").default(0),
  /** Keyword density score (0-100) */
  keywordScore: int("keywordScore").default(0),
  /** Structure balance score (0-100) */
  structureScore: int("structureScore").default(0),
  /** Engagement score (0-100) */
  engagementScore: int("engagementScore").default(0),
  /** Detailed analysis JSON */
  analysisDetail: text("analysisDetail"),
  /** AI improvement suggestions as JSON array */
  suggestions: text("suggestions"),
  /** Key metrics JSON */
  metrics: text("metrics"),
  /** Analysis status */
  status: mysqlEnum("status", ["analyzing", "completed", "failed"]).default("analyzing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentAnalysis = typeof contentAnalyses.$inferSelect;
export type InsertContentAnalysis = typeof contentAnalyses.$inferInsert;

// ============ v2.5 NEW TABLES ============

/**
 * Live Broadcasts - group broadcast sessions
 * Instructor creates a broadcast from a script, viewers join via unique room code
 * Slide state is synced via polling - instructor controls slide progression
 */
export const liveBroadcasts = mysqlTable("liveBroadcasts", {
  id: int("id").autoincrement().primaryKey(),
  /** Instructor who owns this broadcast */
  instructorId: int("instructorId").notNull(),
  /** Script used for this broadcast */
  scriptId: int("scriptId").notNull(),
  /** Broadcast title */
  title: varchar("title", { length: 500 }).notNull(),
  /** Broadcast description */
  description: text("description"),
  /** Unique room code for viewers to join */
  roomCode: varchar("roomCode", { length: 32 }).notNull().unique(),
  /** Broadcast status */
  status: mysqlEnum("status", ["scheduled", "live", "paused", "ended"]).default("scheduled").notNull(),
  /** Current slide index (0-based) */
  currentSlideIndex: int("currentSlideIndex").default(0),
  /** Whether TTS audio is currently playing */
  isAudioPlaying: boolean("isAudioPlaying").default(false),
  /** Audio playback position in seconds */
  audioPosition: int("audioPosition").default(0),
  /** Last state update timestamp (for sync) */
  stateUpdatedAt: timestamp("stateUpdatedAt").defaultNow().notNull(),
  /** TTS voice ID to use */
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).default("alloy"),
  /** Voice profile ID */
  voiceProfileId: int("voiceProfileId"),
  /** Scheduled start time */
  scheduledAt: timestamp("scheduledAt"),
  /** Actual start time */
  startedAt: timestamp("startedAt"),
  /** End time */
  endedAt: timestamp("endedAt"),
  /** Peak viewer count */
  peakViewers: int("peakViewers").default(0),
  /** Current viewer count */
  currentViewers: int("currentViewers").default(0),
  /** Generated TTS audio URLs as JSON array (per section) */
  audioUrls: text("audioUrls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LiveBroadcast = typeof liveBroadcasts.$inferSelect;
export type InsertLiveBroadcast = typeof liveBroadcasts.$inferInsert;

/**
 * Broadcast Viewers - tracks who is watching a broadcast
 */
export const broadcastViewers = mysqlTable("broadcastViewers", {
  id: int("id").autoincrement().primaryKey(),
  broadcastId: int("broadcastId").notNull(),
  userId: int("userId").notNull(),
  /** Display name in chat */
  displayName: varchar("displayName", { length: 255 }),
  /** Whether currently connected */
  isActive: boolean("isActive").default(true),
  /** Last heartbeat timestamp */
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow().notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});

export type BroadcastViewer = typeof broadcastViewers.$inferSelect;
export type InsertBroadcastViewer = typeof broadcastViewers.$inferInsert;

/**
 * Broadcast Chats - real-time chat messages during broadcasts
 */
export const broadcastChats = mysqlTable("broadcastChats", {
  id: int("id").autoincrement().primaryKey(),
  broadcastId: int("broadcastId").notNull(),
  userId: int("userId").notNull(),
  /** Sender display name */
  displayName: varchar("displayName", { length: 255 }),
  /** Chat message content */
  message: text("message").notNull(),
  /** Message type */
  messageType: mysqlEnum("messageType", ["chat", "question", "system"]).default("chat").notNull(),
  /** Whether this is pinned by instructor */
  isPinned: boolean("isPinned").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BroadcastChat = typeof broadcastChats.$inferSelect;
export type InsertBroadcastChat = typeof broadcastChats.$inferInsert;


/**
 * Sample Faces - pre-built AI face presets for instructors to choose from
 */
export const sampleFaces = mysqlTable("sampleFaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Category: professional, casual, academic, creative, corporate */
  category: varchar("category", { length: 64 }).notNull(),
  /** Gender: male, female, neutral */
  gender: varchar("gender", { length: 20 }).notNull(),
  /** Ethnicity/region for diversity */
  ethnicity: varchar("ethnicity", { length: 64 }),
  /** Age range: 20s, 30s, 40s, 50s */
  ageRange: varchar("ageRange", { length: 20 }),
  /** CDN URL to face image */
  imageUrl: text("imageUrl").notNull(),
  /** CDN URL to thumbnail */
  thumbnailUrl: text("thumbnailUrl"),
  /** Short description */
  description: text("description"),
  /** Specialty tags (JSON array of strings) */
  tags: json("tags"),
  /** Supported languages (JSON array of strings) */
  languages: json("languages"),
  /** Whether this is a premium face (Pro+ only) */
  isPremium: boolean("isPremium").default(false),
  /** Sort order */
  sortOrder: int("sortOrder").default(0),
  /** Active/inactive */
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SampleFace = typeof sampleFaces.$inferSelect;
export type InsertSampleFace = typeof sampleFaces.$inferInsert;

/**
 * Sample Voices - pre-built voice presets for instructors
 */
export const sampleVoices = mysqlTable("sampleVoices", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Language code (ko, en, ja, zh, etc.) */
  language: varchar("language", { length: 10 }).notNull(),
  /** Gender: male, female */
  gender: varchar("gender", { length: 20 }).notNull(),
  /** Voice tone: warm, professional, energetic, calm, authoritative */
  tone: varchar("tone", { length: 64 }).notNull(),
  /** TTS voice ID (OpenAI voice ID) */
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).notNull(),
  /** CDN URL to sample audio clip */
  sampleAudioUrl: text("sampleAudioUrl"),
  /** Short description */
  description: text("description"),
  /** Speaking speed (0.5 - 2.0) */
  speed: varchar("speed", { length: 10 }).default("1.0"),
  /** Pitch adjustment */
  pitch: varchar("pitch", { length: 10 }).default("0"),
  /** Whether this is a premium voice */
  isPremium: boolean("isPremium").default(false),
  /** Sort order */
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SampleVoice = typeof sampleVoices.$inferSelect;
export type InsertSampleVoice = typeof sampleVoices.$inferInsert;

/**
 * Subscription Plans - Free / Pro / Enterprise
 */
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  /** Slug for URL: free, pro, enterprise */
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  /** Monthly price in USD cents (0 for free) */
  priceMonthly: int("priceMonthly").default(0).notNull(),
  /** Yearly price in USD cents */
  priceYearly: int("priceYearly").default(0),
  /** Monthly credit allowance */
  monthlyCredits: int("monthlyCredits").default(0).notNull(),
  /** Max lectures per month (0 = unlimited) */
  maxLecturesPerMonth: int("maxLecturesPerMonth").default(3),
  /** Max video quality: 720p, 1080p, 4k */
  maxVideoQuality: varchar("maxVideoQuality", { length: 10 }).default("720p"),
  /** Number of face presets allowed */
  facePresetLimit: int("facePresetLimit").default(3),
  /** Number of voice presets allowed */
  voicePresetLimit: int("voicePresetLimit").default(5),
  /** Can use deepfake face swap */
  hasDeepfake: boolean("hasDeepfake").default(false),
  /** Can use voice modulation */
  hasVoiceMod: boolean("hasVoiceMod").default(false),
  /** Can use external platform integration */
  hasPlatformIntegration: boolean("hasPlatformIntegration").default(false),
  /** Can use live broadcast */
  hasLiveBroadcast: boolean("hasLiveBroadcast").default(false),
  /** Priority support */
  hasPrioritySupport: boolean("hasPrioritySupport").default(false),
  /** Custom AI model training */
  hasCustomModel: boolean("hasCustomModel").default(false),
  /** White label support */
  hasWhiteLabel: boolean("hasWhiteLabel").default(false),
  /** Description */
  description: text("description"),
  /** Feature list (JSON array of strings) */
  features: json("features"),
  /** Sort order */
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * User Subscriptions - tracks which plan each user is on
 */
export const userSubscriptions = mysqlTable("userSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  /** Status: active, cancelled, expired, trial */
  status: mysqlEnum("status", ["active", "cancelled", "expired", "trial"]).default("active").notNull(),
  /** Billing cycle: monthly, yearly */
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  /** Current period start */
  currentPeriodStart: timestamp("currentPeriodStart").defaultNow().notNull(),
  /** Current period end */
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  /** Credits remaining this period */
  creditsRemaining: int("creditsRemaining").default(0),
  /** Lectures created this period */
  lecturesUsedThisPeriod: int("lecturesUsedThisPeriod").default(0),
  /** External payment reference (Stripe, etc.) */
  externalPaymentId: varchar("externalPaymentId", { length: 255 }),
  /** Cancel at period end */
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Credit Transactions - tracks credit usage and purchases
 */
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Transaction type: usage, purchase, refund, bonus, monthly_reset */
  type: mysqlEnum("type", ["usage", "purchase", "refund", "bonus", "monthly_reset"]).notNull(),
  /** Amount (negative for usage, positive for purchase/bonus) */
  amount: int("amount").notNull(),
  /** Balance after transaction */
  balanceAfter: int("balanceAfter").notNull(),
  /** Description of what the credits were used for */
  description: text("description"),
  /** Related resource type: lecture, tts, avatar, deepfake, voicemod */
  resourceType: varchar("resourceType", { length: 64 }),
  /** Related resource ID */
  resourceId: int("resourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

/**
 * Payments - unified payment records for all payment methods
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Payment type: subscription, credit_package, one_time */
  paymentType: mysqlEnum("paymentType", ["subscription", "credit_package", "one_time"]).notNull(),
  /** Payment method: stripe, crypto */
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "crypto"]).notNull(),
  /** Amount in USD cents (e.g., 9900 = $99.00) */
  amountCents: int("amountCents").notNull(),
  /** Currency: usd, usdt, usdc, eth, btc */
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  /** Status: pending, processing, completed, failed, refunded, expired */
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded", "expired"]).default("pending").notNull(),
  /** Stripe payment intent ID or crypto tx hash */
  externalId: varchar("externalId", { length: 512 }),
  /** Related plan ID (for subscription payments) */
  planId: int("planId"),
  /** Related credit package info */
  creditAmount: int("creditAmount"),
  /** Description */
  description: text("description"),
  /** Metadata JSON (billing cycle, plan slug, etc.) */
  metadata: json("metadata"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Crypto Payments - detailed crypto payment tracking
 */
export const cryptoPayments = mysqlTable("cryptoPayments", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull(),
  /** Crypto currency: USDT, USDC, ETH, BTC */
  cryptoCurrency: mysqlEnum("cryptoCurrency", ["USDT", "USDC", "ETH", "BTC"]).notNull(),
  /** Blockchain network: ethereum, bsc, polygon, tron, bitcoin */
  network: mysqlEnum("network", ["ethereum", "bsc", "polygon", "tron", "bitcoin"]).default("ethereum").notNull(),
  /** Wallet address to send payment to */
  walletAddress: varchar("walletAddress", { length: 255 }).notNull(),
  /** Amount in crypto (stored as string for precision) */
  cryptoAmount: varchar("cryptoAmount", { length: 64 }).notNull(),
  /** USD equivalent at time of creation */
  usdEquivalent: int("usdEquivalent").notNull(),
  /** Transaction hash on blockchain */
  txHash: varchar("txHash", { length: 512 }),
  /** Number of confirmations */
  confirmations: int("confirmations").default(0),
  /** Required confirmations for this network */
  requiredConfirmations: int("requiredConfirmations").default(3),
  /** Expiry time for payment (usually 30 minutes) */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CryptoPayment = typeof cryptoPayments.$inferSelect;
export type InsertCryptoPayment = typeof cryptoPayments.$inferInsert;

/**
 * Credit Usage Logs - detailed per-feature credit consumption
 */
export const creditUsageLogs = mysqlTable("creditUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Feature that consumed credits */
  feature: mysqlEnum("feature", [
    "script_generation",
    "tts_conversion",
    "avatar_video",
    "deepfake_transform",
    "thumbnail_generation",
    "subtitle_generation",
    "voice_modulation",
    "live_broadcast"
  ]).notNull(),
  /** Credits consumed */
  creditsUsed: int("creditsUsed").notNull(),
  /** Balance before usage */
  balanceBefore: int("balanceBefore").notNull(),
  /** Balance after usage */
  balanceAfter: int("balanceAfter").notNull(),
  /** Related resource ID (lecture, script, etc.) */
  resourceId: int("resourceId"),
  /** Additional metadata */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditUsageLog = typeof creditUsageLogs.$inferSelect;
export type InsertCreditUsageLog = typeof creditUsageLogs.$inferInsert;

/**
 * Password reset tokens for email-based password recovery
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;


/**
 * API usage logs for monitoring Gemini API calls (LLM + TTS)
 */
export const apiUsageLogs = mysqlTable("apiUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  apiType: mysqlEnum("apiType", ["llm", "tts"]).notNull(),
  model: varchar("model", { length: 128 }),
  inputTokens: int("inputTokens").default(0),
  outputTokens: int("outputTokens").default(0),
  durationMs: int("durationMs").default(0),
  status: mysqlEnum("status", ["success", "error"]).default("success").notNull(),
  errorCode: varchar("errorCode", { length: 64 }),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = typeof apiUsageLogs.$inferInsert;


/**
 * Face swap gallery - user-generated results shared publicly
 */
export const faceSwapGallery = mysqlTable("faceSwapGallery", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  beforeImageUrl: text("beforeImageUrl").notNull(),
  afterImageUrl: text("afterImageUrl").notNull(),
  method: mysqlEnum("method", ["builtin", "did", "heygen"]).default("builtin").notNull(),
  likesCount: int("likesCount").default(0).notNull(),
  commentsCount: int("commentsCount").default(0).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FaceSwapGalleryItem = typeof faceSwapGallery.$inferSelect;
export type InsertFaceSwapGalleryItem = typeof faceSwapGallery.$inferInsert;

/**
 * Gallery likes
 */
export const galleryLikes = mysqlTable("galleryLikes", {
  id: int("id").autoincrement().primaryKey(),
  galleryItemId: int("galleryItemId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GalleryLike = typeof galleryLikes.$inferSelect;

/**
 * Gallery comments
 */
export const galleryComments = mysqlTable("galleryComments", {
  id: int("id").autoincrement().primaryKey(),
  galleryItemId: int("galleryItemId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GalleryComment = typeof galleryComments.$inferSelect;

/**
 * PIP (Picture-in-Picture) lecture mode settings
 */
export const pipSettings = mysqlTable("pipSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  position: mysqlEnum("position", ["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).default("bottom-right").notNull(),
  size: mysqlEnum("size", ["small", "medium", "large"]).default("medium").notNull(),
  opacity: int("opacity").default(100).notNull(),
  shape: mysqlEnum("shape", ["circle", "rounded", "rectangle"]).default("rounded").notNull(),
  customX: int("customX").default(75),
  customY: int("customY").default(75),
  isDefault: boolean("isDefault").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PipSetting = typeof pipSettings.$inferSelect;
export type InsertPipSetting = typeof pipSettings.$inferInsert;


/**
 * PPT uploads for PIP lecture mode
 */
export const pptUploads = mysqlTable("pptUploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalFileUrl: text("originalFileUrl").notNull(),
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  totalSlides: int("totalSlides").default(0).notNull(),
  /** JSON array of slide image URLs: ["url1","url2",...] */
  slideImages: json("slideImages").$type<string[]>().default([]),
  status: mysqlEnum("status", ["uploading", "processing", "ready", "error"]).default("uploading").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PptUpload = typeof pptUploads.$inferSelect;
export type InsertPptUpload = typeof pptUploads.$inferInsert;
