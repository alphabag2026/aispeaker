import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

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
  /** Interpreter mode: original lecture + interpretation */
  interpreterEnabled: boolean("interpreterEnabled").default(false),
  /** Interpreter target language */
  interpreterLanguage: varchar("interpreterLanguage", { length: 10 }),
  /** Interpreter sections as JSON array [{originalContent, interpretedContent, durationSec}] */
  interpreterSections: text("interpreterSections"),
  /** Interpreter TTS voice ID */
  interpreterVoiceId: varchar("interpreterVoiceId", { length: 128 }),
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
    "live_broadcast",
    "image_generation",
    "bg_remove",
    "voice_clone",
    "voice_change",
    "video_effects",
    "image_to_video",
    "face_swap",
    "talking_avatar",
    "video_translate"
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


// ============ v7.0 NEW TABLES - Manual Lecture Builder ============

/**
 * Lecture Projects - top-level container for the new step-based lecture builder
 * Each project goes through: avatar selection → script → slides → matching → preview
 */
export const lectureProjects = mysqlTable("lectureProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Project title */
  title: varchar("title", { length: 500 }).notNull(),
  /** Project description */
  description: text("description"),
  /** Current step in the builder flow (1-5) */
  currentStep: int("currentStep").default(1).notNull(),
  /** Project status */
  status: mysqlEnum("status", ["draft", "in_progress", "ready", "generating", "completed", "failed"]).default("draft").notNull(),
  /** Avatar layout position for final video */
  avatarPosition: mysqlEnum("avatarPosition", ["bottom-right", "bottom-left", "top-right", "top-left", "none"]).default("bottom-right").notNull(),
  /** Avatar size */
  avatarSize: mysqlEnum("avatarSize", ["small", "medium", "large"]).default("medium").notNull(),
  /** Avatar shape */
  avatarShape: mysqlEnum("avatarShape", ["circle", "rounded", "rectangle"]).default("circle").notNull(),
  /** Avatar opacity (0-100) */
  avatarOpacity: int("avatarOpacity").default(100).notNull(),
  /** Final generated video URL */
  finalVideoUrl: text("finalVideoUrl"),
  /** Thumbnail URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** Total estimated duration in seconds */
  totalDurationSec: int("totalDurationSec").default(0),
  /** Generation progress percentage (0-100) */
  generationProgress: int("generationProgress").default(0),
  /** Current generation step description */
  generationStep: varchar("generationStep", { length: 255 }),
  /** Error message if generation failed */
  errorMessage: text("errorMessage"),
  /** Interpreter mode enabled */
  interpreterEnabled: boolean("interpreterEnabled").default(false),
  /** Interpreter target language code */
  interpreterLanguage: varchar("interpreterLanguage", { length: 10 }),
  /** Interpreter voice ID */
  interpreterVoiceId: varchar("interpreterVoiceId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LectureProject = typeof lectureProjects.$inferSelect;
export type InsertLectureProject = typeof lectureProjects.$inferInsert;

/**
 * Project Avatars - avatars assigned to a lecture project (supports multiple)
 * Each avatar has a face image, voice, name, and role
 */
export const projectAvatars = mysqlTable("projectAvatars", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  /** Reference to sampleFaces table (optional, null if custom upload) */
  sampleFaceId: int("sampleFaceId"),
  /** Custom uploaded face image URL */
  customFaceUrl: text("customFaceUrl"),
  /** Display name for this avatar */
  name: varchar("name", { length: 255 }).notNull(),
  /** Role in the lecture */
  role: mysqlEnum("role", ["instructor", "host", "guest", "narrator"]).default("instructor").notNull(),
  /** TTS voice ID */
  ttsVoiceId: varchar("ttsVoiceId", { length: 128 }).default("Kore"),
  /** Sort order */
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectAvatar = typeof projectAvatars.$inferSelect;
export type InsertProjectAvatar = typeof projectAvatars.$inferInsert;

/**
 * Project Slides - individual slide images for a lecture project
 * Slides come from PPT/PDF upload or direct image upload
 */
export const projectSlides = mysqlTable("projectSlides", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  /** Slide image URL (S3) */
  imageUrl: text("imageUrl").notNull(),
  /** S3 file key */
  fileKey: text("fileKey").notNull(),
  /** Slide order (0-based) */
  slideOrder: int("slideOrder").default(0).notNull(),
  /** Original filename */
  originalFileName: varchar("originalFileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectSlide = typeof projectSlides.$inferSelect;
export type InsertProjectSlide = typeof projectSlides.$inferInsert;

/**
 * Slide Scripts - script text assigned to each slide
 * Links a slide to a script segment and an avatar speaker
 */
export const slideScripts = mysqlTable("slideScripts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  slideId: int("slideId").notNull(),
  /** Which avatar speaks this segment */
  avatarId: int("avatarId"),
  /** Script text for this slide */
  scriptText: text("scriptText").notNull(),
  /** Estimated duration in seconds */
  estimatedDurationSec: int("estimatedDurationSec").default(30),
  /** Sort order within the slide (for multiple scripts per slide) */
  sortOrder: int("sortOrder").default(0),
  /** Interpreter translated text for this slide */
  interpreterText: text("interpreterText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SlideScript = typeof slideScripts.$inferSelect;
export type InsertSlideScript = typeof slideScripts.$inferInsert;

/**
 * Slide Annotations - pen/drawing annotations on slides
 * Stores annotation type, position, and timing for playback
 */
export const slideAnnotations = mysqlTable("slideAnnotations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  slideId: int("slideId").notNull(),
  /** Annotation type */
  annotationType: mysqlEnum("annotationType", ["circle", "arrow", "check", "underline", "freehand"]).default("circle").notNull(),
  /** Pen color (hex) */
  penColor: varchar("penColor", { length: 7 }).default("#FF0000"),
  /** Pen thickness (1-10) */
  penThickness: int("penThickness").default(3),
  /** Position and path data as JSON: {x, y, width, height} or [{x,y},...] for freehand */
  pathData: json("pathData"),
  /** When to show this annotation (seconds from slide start) */
  showAtSec: int("showAtSec").default(0),
  /** How long to display (seconds, 0 = permanent) */
  durationSec: int("durationSec").default(3),
  /** Sort order for multiple annotations on same slide */
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SlideAnnotation = typeof slideAnnotations.$inferSelect;
export type InsertSlideAnnotation = typeof slideAnnotations.$inferInsert;

// ============ Video Generation History ============
export const videoGenerations = mysqlTable("video_generations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  /** Generation status */
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  /** Final video URL */
  videoUrl: text("videoUrl"),
  /** Total duration in seconds */
  totalDuration: int("totalDuration"),
  /** Configuration snapshot */
  config: json("config"),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** Number of slides included */
  slideCount: int("slideCount").default(0),
  /** Resolution */
  resolution: varchar("resolution", { length: 10 }).default("1080p"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type VideoGeneration = typeof videoGenerations.$inferSelect;
export type InsertVideoGeneration = typeof videoGenerations.$inferInsert;


/**
 * Script Improvement History - stores AI improvement before/after for undo
 */
export const scriptImprovementHistory = mysqlTable("scriptImprovementHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  /** Section ID that was improved */
  sectionId: varchar("sectionId", { length: 100 }).notNull(),
  /** Section index (order) */
  sectionIndex: int("sectionIndex").default(0),
  /** Original text before improvement */
  originalText: text("originalText").notNull(),
  /** Improved text after AI processing */
  improvedText: text("improvedText").notNull(),
  /** Style used for improvement */
  style: mysqlEnum("style", ["formal", "casual", "educational", "storytelling"]).default("educational").notNull(),
  /** Whether this improvement was applied */
  applied: boolean("applied").default(false),
  /** Whether this was part of a batch improvement */
  isBatch: boolean("isBatch").default(false),
  /** Batch group ID to link batch improvements together */
  batchId: varchar("batchId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScriptImprovementHistory = typeof scriptImprovementHistory.$inferSelect;
export type InsertScriptImprovementHistory = typeof scriptImprovementHistory.$inferInsert;

// ============ v7.6: Slide Script Version Snapshots ============
export const slideScriptVersions = mysqlTable("slideScriptVersions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  /** Version number (auto-incremented per project) */
  versionNumber: int("versionNumber").notNull(),
  /** JSON snapshot of all sections [{sortOrder, scriptText, avatarId}] */
  sectionsSnapshot: text("sectionsSnapshot").notNull(),
  /** Number of sections in this snapshot */
  sectionCount: int("sectionCount").default(0),
  /** What changed in this version */
  changeDescription: varchar("changeDescription", { length: 500 }),
  /** Change type: manual (explicit save), auto (auto-save) */
  changeType: mysqlEnum("changeType", ["manual", "auto"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SlideScriptVersion = typeof slideScriptVersions.$inferSelect;
export type InsertSlideScriptVersion = typeof slideScriptVersions.$inferInsert;

// ============ KLING AI Video Generation Tasks ============
/**
 * Tracks KLING API video generation tasks (image-to-video, text-to-video)
 * Used for creating custom AI instructor avatars
 */
export const klingTasks = mysqlTable("klingTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Task type: image2video, text2video */
  taskType: mysqlEnum("taskType", ["image2video", "text2video"]).notNull(),
  /** KLING API task ID */
  klingTaskId: varchar("klingTaskId", { length: 255 }).notNull(),
  /** Task status from KLING: submitted, processing, succeed, failed */
  status: varchar("status", { length: 64 }).default("submitted").notNull(),
  /** Status message */
  statusMsg: text("statusMsg"),
  /** Source image URL (for image2video) */
  sourceImageUrl: text("sourceImageUrl"),
  /** Prompt used */
  prompt: text("prompt"),
  /** Generated video URL */
  videoUrl: text("videoUrl"),
  /** Video duration in seconds */
  videoDuration: int("videoDuration"),
  /** Model used */
  model: varchar("model", { length: 64 }).default("kling-v1-6"),
  /** Mode: std or pro */
  mode: varchar("mode", { length: 10 }).default("std"),
  /** Duration setting: 5 or 10 */
  durationSetting: varchar("durationSetting", { length: 5 }).default("5"),
  /** Aspect ratio */
  aspectRatio: varchar("aspectRatio", { length: 10 }).default("16:9"),
  /** Purpose: avatar_preview, lecture_video, custom */
  purpose: varchar("purpose", { length: 64 }).default("avatar_preview"),
  /** Related project avatar ID (if creating for a project) */
  projectAvatarId: int("projectAvatarId"),
  /** Related sample face ID */
  sampleFaceId: int("sampleFaceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type KlingTask = typeof klingTasks.$inferSelect;
export type InsertKlingTask = typeof klingTasks.$inferInsert;

// ============ Lecture Format Templates ============
/**
 * Pre-defined lecture format templates for one-click setup
 * Covers personnel composition, lecture style, and insertable elements
 */
export const lectureFormatTemplates = mysqlTable("lectureFormatTemplates", {
  id: int("id").autoincrement().primaryKey(),
  /** Template name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Template description */
  description: text("description"),
  /** Category: personnel, style, insert */
  category: mysqlEnum("category", ["personnel", "style", "insert"]).notNull(),
  /** Icon name (lucide icon) */
  icon: varchar("icon", { length: 64 }),
  /** Color theme for the card */
  colorTheme: varchar("colorTheme", { length: 64 }).default("blue"),
  /** Personnel config: JSON array of roles [{role, label, count, required}] */
  personnelConfig: json("personnelConfig"),
  /** Style config: JSON {layoutType, hasSlides, hasWhiteboard, hasPIP, avatarPosition, avatarSize} */
  styleConfig: json("styleConfig"),
  /** Insert elements: JSON array [{type, label, defaultDuration, position}] */
  insertElements: json("insertElements"),
  /** Default script template text */
  defaultScriptTemplate: text("defaultScriptTemplate"),
  /** Preview image URL */
  previewImageUrl: text("previewImageUrl"),
  /** Sort order */
  sortOrder: int("sortOrder").default(0),
  /** Active/inactive */
  isActive: boolean("isActive").default(true),
  /** Is system template (non-deletable) */
  isSystem: boolean("isSystem").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LectureFormatTemplate = typeof lectureFormatTemplates.$inferSelect;
export type InsertLectureFormatTemplate = typeof lectureFormatTemplates.$inferInsert;

// ============ v6.0: Slide Avatar Overrides ============
/**
 * Per-slide avatar overlay settings (position, size, shape)
 * Overrides the project-level avatar settings for individual slides
 */
export const slideAvatarOverrides = mysqlTable("slideAvatarOverrides", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  slideId: int("slideId").notNull(),
  /** Avatar position override */
  avatarPosition: mysqlEnum("avatarPosition", ["bottom-right", "bottom-left", "top-right", "top-left", "center-right", "center-left", "none"]).default("bottom-right").notNull(),
  /** Avatar size as percentage of slide width (10-80) */
  avatarSizePercent: int("avatarSizePercent").default(25).notNull(),
  /** Custom X offset from position anchor (pixels, 0-based) */
  offsetX: int("offsetX").default(0),
  /** Custom Y offset from position anchor (pixels, 0-based) */
  offsetY: int("offsetY").default(0),
  /** Avatar shape override */
  avatarShape: mysqlEnum("avatarShape", ["circle", "rounded", "rectangle"]).default("circle").notNull(),
  /** Avatar opacity override (0-100) */
  avatarOpacity: int("avatarOpacity").default(100).notNull(),
  /** Whether avatar is hidden for this slide */
  isHidden: boolean("isHidden").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SlideAvatarOverride = typeof slideAvatarOverrides.$inferSelect;
export type InsertSlideAvatarOverride = typeof slideAvatarOverrides.$inferInsert;

// ============ v6.0: Slide Insert Content ============
/**
 * Insert content between slides (whiteboard, video, image, design element)
 * These appear as interstitial content during the lecture
 */
export const slideInsertContent = mysqlTable("slideInsertContent", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  /** Insert after this slide ID (0 = before first slide) */
  afterSlideId: int("afterSlideId").default(0).notNull(),
  /** Content type */
  contentType: mysqlEnum("contentType", ["whiteboard", "video", "image", "design"]).notNull(),
  /** Title/label for this insert */
  title: varchar("title", { length: 255 }),
  /** Content URL (video URL, image URL, or whiteboard data URL) */
  contentUrl: text("contentUrl"),
  /** S3 file key */
  fileKey: text("fileKey"),
  /** For whiteboard: JSON drawing data */
  drawingData: json("drawingData"),
  /** Background color for whiteboard/design */
  backgroundColor: varchar("backgroundColor", { length: 20 }).default("#ffffff"),
  /** Duration in seconds (for video/whiteboard display time) */
  durationSec: int("durationSec").default(5),
  /** Script text to narrate during this insert */
  scriptText: text("scriptText"),
  /** Avatar ID for narration */
  avatarId: int("avatarId"),
  /** Sort order among inserts after the same slide */
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SlideInsertContent = typeof slideInsertContent.$inferSelect;
export type InsertSlideInsertContent = typeof slideInsertContent.$inferInsert;

// ============ v6.1: Slide Transitions ============
/**
 * Transition effects between slides for video export
 */
export const slideTransitions = mysqlTable("slideTransitions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  /** The slide ID this transition applies AFTER (transition from this slide to the next) */
  slideId: int("slideId").notNull(),
  /** Transition type */
  transitionType: mysqlEnum("transitionType", ["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"]).default("none").notNull(),
  /** Duration of transition in milliseconds */
  durationMs: int("durationMs").default(500).notNull(),
  /** Easing function */
  easing: mysqlEnum("easing", ["linear", "ease_in", "ease_out", "ease_in_out"]).default("ease_in_out").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SlideTransition = typeof slideTransitions.$inferSelect;
export type InsertSlideTransition = typeof slideTransitions.$inferInsert;


// ============ v6.3: Whiteboard Collaboration Sessions ============
/**
 * Real-time whiteboard collaboration sessions
 */
export const whiteboardSessions = mysqlTable("whiteboardSessions", {
  id: int("id").autoincrement().primaryKey(),
  /** Project ID this session belongs to */
  projectId: int("projectId").notNull(),
  /** Insert content ID (whiteboard) this session is for */
  insertContentId: int("insertContentId"),
  /** Session creator */
  hostUserId: int("hostUserId").notNull(),
  /** Unique session code for joining */
  sessionCode: varchar("sessionCode", { length: 32 }).notNull().unique(),
  /** Session status */
  status: mysqlEnum("status", ["waiting", "active", "ended"]).default("waiting").notNull(),
  /** Max participants allowed */
  maxParticipants: int("maxParticipants").default(10).notNull(),
  /** Current participant count */
  currentParticipants: int("currentParticipants").default(0).notNull(),
  /** Session title */
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  endedAt: timestamp("endedAt"),
});
export type WhiteboardSession = typeof whiteboardSessions.$inferSelect;
export type InsertWhiteboardSession = typeof whiteboardSessions.$inferInsert;

// ============ v6.3: Whiteboard Session Participants ============
export const whiteboardParticipants = mysqlTable("whiteboardParticipants", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  /** Display name in session */
  displayName: varchar("displayName", { length: 100 }),
  /** Assigned color for this participant */
  cursorColor: varchar("cursorColor", { length: 20 }).default("#FF0000"),
  /** Is currently connected */
  isOnline: boolean("isOnline").default(true),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});
export type WhiteboardParticipant = typeof whiteboardParticipants.$inferSelect;

// ============ v6.3: Slide Layouts ============
/**
 * AI-recommended slide layouts for each slide
 */
export const slideLayouts = mysqlTable("slideLayouts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  slideId: int("slideId").notNull(),
  /** Layout type */
  layoutType: mysqlEnum("layoutType", [
    "title_only", "title_subtitle", "title_body", "title_bullets",
    "comparison", "image_left", "image_right", "image_full",
    "quote", "chart", "diagram", "timeline", "blank"
  ]).default("title_body").notNull(),
  /** AI-generated layout config JSON (positions, sizes, styles) */
  layoutConfig: json("layoutConfig"),
  /** AI reasoning for this layout choice */
  aiReasoning: text("aiReasoning"),
  /** Whether user has accepted/applied this layout */
  isApplied: boolean("isApplied").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SlideLayout = typeof slideLayouts.$inferSelect;
export type InsertSlideLayout = typeof slideLayouts.$inferInsert;

// ============ v6.3: Project Watermarks ============
/**
 * Watermark/branding settings for video export
 */
export const projectWatermarks = mysqlTable("projectWatermarks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  /** Watermark type */
  watermarkType: mysqlEnum("watermarkType", ["logo", "text", "both"]).default("text").notNull(),
  /** Logo image URL */
  logoUrl: text("logoUrl"),
  /** Logo S3 file key */
  logoFileKey: text("logoFileKey"),
  /** Text content for text watermark */
  textContent: varchar("textContent", { length: 255 }),
  /** Font size for text watermark */
  fontSize: int("fontSize").default(24),
  /** Font color (hex) */
  fontColor: varchar("fontColor", { length: 20 }).default("#FFFFFF"),
  /** Position on screen */
  position: mysqlEnum("position", [
    "top-left", "top-center", "top-right",
    "bottom-left", "bottom-center", "bottom-right"
  ]).default("bottom-right").notNull(),
  /** Opacity (0-100) */
  opacity: int("opacity").default(70).notNull(),
  /** Size percentage relative to video width (5-50) */
  sizePercent: int("sizePercent").default(15).notNull(),
  /** Margin from edge in pixels */
  marginPx: int("marginPx").default(20).notNull(),
  /** Is this watermark enabled */
  isEnabled: boolean("isEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProjectWatermark = typeof projectWatermarks.$inferSelect;
export type InsertProjectWatermark = typeof projectWatermarks.$inferInsert;

/**
 * v8.1 - Community Gallery Posts (extends existing faceSwapGallery system)
 * Uses existing galleryLikes and galleryComments tables.
 * New: galleryPosts table for multi-tool content sharing.
 */
export const galleryPosts = mysqlTable("galleryPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  mediaType: mysqlEnum("mediaType", ["image", "video", "audio"]).default("image").notNull(),
  mediaUrl: text("mediaUrl").notNull(),
  mediaFileKey: text("mediaFileKey"),
  thumbnailUrl: text("thumbnailUrl"),
  toolUsed: varchar("toolUsed", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  likeCount: int("likeCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GalleryPost = typeof galleryPosts.$inferSelect;
export type InsertGalleryPost = typeof galleryPosts.$inferInsert;


// v8.3 - AI Generations History
export const aiGenerations = mysqlTable("ai_generations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  tool: varchar("tool", { length: 50 }).notNull(), // tts, voice_clone, voice_change, image_gen, bg_remove, video_effects, image_to_video, face_swap, talking_avatar, video_translate
  inputSummary: text("inputSummary"), // brief description of input
  outputUrl: text("outputUrl"), // S3 URL of result
  outputType: varchar("outputType", { length: 20 }).notNull(), // audio, image, video
  creditsUsed: int("creditsUsed").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(), // completed, failed
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiGeneration = typeof aiGenerations.$inferSelect;
export type InsertAiGeneration = typeof aiGenerations.$inferInsert;


/**
 * PiP Position Presets - saved avatar position/size layouts
 */
export const pipPresets = mysqlTable("pipPresets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  position: mysqlEnum("position", ["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).default("custom").notNull(),
  size: mysqlEnum("size", ["small", "medium", "large"]).default("medium").notNull(),
  opacity: int("opacity").default(100).notNull(),
  shape: mysqlEnum("shape", ["circle", "rounded", "rectangle"]).default("rounded").notNull(),
  customX: int("customX").default(75),
  customY: int("customY").default(75),
  customWidth: int("customWidth").default(25),
  customHeight: int("customHeight").default(25),
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PipPreset = typeof pipPresets.$inferSelect;
export type InsertPipPreset = typeof pipPresets.$inferInsert;


// ============ Shared Presets (Community Gallery) ============
export const sharedPresets = mysqlTable("sharedPresets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  position: mysqlEnum("position", ["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).default("custom").notNull(),
  size: mysqlEnum("size", ["small", "medium", "large"]).default("medium").notNull(),
  opacity: int("opacity").default(100).notNull(),
  shape: mysqlEnum("shape", ["circle", "rounded", "rectangle"]).default("rounded").notNull(),
  customX: int("customX").default(75),
  customY: int("customY").default(75),
  customWidth: int("customWidth").default(25),
  customHeight: int("customHeight").default(25),
  likes: int("likes").default(0).notNull(),
  downloads: int("downloads").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SharedPreset = typeof sharedPresets.$inferSelect;
export type InsertSharedPreset = typeof sharedPresets.$inferInsert;

// ============ Shared Preset Likes (prevent duplicate likes) ============
export const sharedPresetLikes = mysqlTable("sharedPresetLikes", {
  id: int("id").autoincrement().primaryKey(),
  presetId: int("presetId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ Subtitle Styles ============
export const subtitleStyles = mysqlTable("subtitleStyles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fontSize: int("fontSize").default(16).notNull(),
  fontColor: varchar("fontColor", { length: 20 }).default("#FFFFFF").notNull(),
  bgColor: varchar("bgColor", { length: 20 }).default("rgba(0,0,0,0.7)").notNull(),
  position: mysqlEnum("position", ["top", "bottom", "custom"]).default("bottom").notNull(),
  customY: int("customY").default(90),
  fontFamily: varchar("fontFamily", { length: 50 }).default("sans-serif").notNull(),
  bold: boolean("bold").default(false).notNull(),
  italic: boolean("italic").default(false).notNull(),
  outline: boolean("outline").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SubtitleStyle = typeof subtitleStyles.$inferSelect;
export type InsertSubtitleStyle = typeof subtitleStyles.$inferInsert;


// ============ Shared Subtitle Style Presets (v8.8) ============
export const sharedSubtitlePresets = mysqlTable("sharedSubtitlePresets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  fontSize: int("fontSize").default(16).notNull(),
  fontColor: varchar("fontColor", { length: 20 }).default("#FFFFFF").notNull(),
  bgColor: varchar("bgColor", { length: 30 }).default("rgba(0,0,0,0.7)").notNull(),
  position: mysqlEnum("position", ["top", "bottom"]).default("bottom").notNull(),
  fontFamily: varchar("fontFamily", { length: 50 }).default("sans-serif").notNull(),
  bold: boolean("bold").default(false).notNull(),
  italic: boolean("italic").default(false).notNull(),
  outline: boolean("outline").default(true).notNull(),
  likes: int("likes").default(0).notNull(),
  downloads: int("downloads").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SharedSubtitlePreset = typeof sharedSubtitlePresets.$inferSelect;
export type InsertSharedSubtitlePreset = typeof sharedSubtitlePresets.$inferInsert;

// ============ Shared Subtitle Preset Likes (v8.8) ============
export const sharedSubtitlePresetLikes = mysqlTable("sharedSubtitlePresetLikes", {
  id: int("id").autoincrement().primaryKey(),
  presetId: int("presetId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ Preset Tags (v8.8) ============
export const presetTags = mysqlTable("presetTags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  category: mysqlEnum("category", ["avatar", "subtitle", "general"]).default("general").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PresetTag = typeof presetTags.$inferSelect;
export type InsertPresetTag = typeof presetTags.$inferInsert;

// ============ Preset-Tag Map (many-to-many) (v8.8) ============
export const presetTagMap = mysqlTable("presetTagMap", {
  id: int("id").autoincrement().primaryKey(),
  presetType: mysqlEnum("presetType", ["avatar", "subtitle"]).notNull(),
  presetId: int("presetId").notNull(),
  tagId: int("tagId").notNull(),
});

// ============ Preset Reports (v9.1) ============
export const presetReports = mysqlTable("presetReports", {
  id: int("id").autoincrement().primaryKey(),
  presetType: mysqlEnum("presetType", ["avatar", "subtitle"]).notNull(),
  presetId: int("presetId").notNull(),
  reporterId: int("reporterId").notNull(),
  reason: mysqlEnum("reason", ["inappropriate", "spam", "copyright", "offensive", "other"]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "blocked", "dismissed"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PresetReport = typeof presetReports.$inferSelect;
export type InsertPresetReport = typeof presetReports.$inferInsert;

// ============ Preset Versions (v9.1) ============
export const presetVersions = mysqlTable("presetVersions", {
  id: int("id").autoincrement().primaryKey(),
  presetType: mysqlEnum("presetType", ["avatar", "subtitle"]).notNull(),
  presetId: int("presetId").notNull(),
  version: int("version").default(1).notNull(),
  data: json("data").notNull(),
  changedBy: int("changedBy").notNull(),
  changeNote: varchar("changeNote", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PresetVersion = typeof presetVersions.$inferSelect;
export type InsertPresetVersion = typeof presetVersions.$inferInsert;

// ============ Blocked Presets (v9.1) ============
export const blockedPresets = mysqlTable("blockedPresets", {
  id: int("id").autoincrement().primaryKey(),
  presetType: mysqlEnum("presetType", ["avatar", "subtitle"]).notNull(),
  presetId: int("presetId").notNull(),
  blockedBy: int("blockedBy").notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BlockedPreset = typeof blockedPresets.$inferSelect;
export type InsertBlockedPreset = typeof blockedPresets.$inferInsert;

// ============ Notifications (v9.2) ============
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["like", "comment", "reply", "report_resolved", "system"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============ Preset Comments (v9.2) ============
export const presetComments = mysqlTable("presetComments", {
  id: int("id").autoincrement().primaryKey(),
  presetType: mysqlEnum("presetType", ["avatar", "subtitle"]).notNull(),
  presetId: int("presetId").notNull(),
  userId: int("userId").notNull(),
  parentId: int("parentId"),
  content: text("content").notNull(),
  rating: int("rating"),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type PresetComment = typeof presetComments.$inferSelect;
export type InsertPresetComment = typeof presetComments.$inferInsert;


// ============ SCORM/xAPI Export (v10.0) ============

/**
 * SCORM Packages - exported learning packages for LMS integration
 * Links to production pipelines and stores package metadata
 */
export const scormPackages = mysqlTable("scormPackages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pipelineId: int("pipelineId").notNull(),
  /** Package title */
  title: varchar("title", { length: 500 }).notNull(),
  /** SCORM version: 1.2 or 2004 */
  scormVersion: mysqlEnum("scormVersion", ["1.2", "2004"]).default("2004").notNull(),
  /** Package status */
  status: mysqlEnum("status", ["generating", "ready", "failed"]).default("generating").notNull(),
  /** Completion criteria: slide_view, quiz_pass, time_spent */
  completionCriteria: mysqlEnum("completionCriteria", ["slide_view", "quiz_pass", "time_spent"]).default("slide_view").notNull(),
  /** Minimum time (seconds) for time_spent criteria */
  minTimeSec: int("minTimeSec").default(0),
  /** Package file URL (ZIP) in S3 */
  packageUrl: text("packageUrl"),
  /** Package file size in bytes */
  fileSizeBytes: int("fileSizeBytes").default(0),
  /** xAPI endpoint URL (optional) */
  xapiEndpoint: text("xapiEndpoint"),
  /** Include subtitles in package */
  includeSubtitles: boolean("includeSubtitles").default(true),
  /** Include thumbnail */
  includeThumbnail: boolean("includeThumbnail").default(true),
  /** Language code */
  language: varchar("language", { length: 10 }).default("ko"),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** Download count */
  downloadCount: int("downloadCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScormPackage = typeof scormPackages.$inferSelect;
export type InsertScormPackage = typeof scormPackages.$inferInsert;

// ============ Marketplace (v10.2) ============

/**
 * Creator Profiles - extended profile for marketplace sellers
 */
export const creatorProfiles = mysqlTable("creatorProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  bannerUrl: text("bannerUrl"),
  specialties: text("specialties"),
  socialLinks: text("socialLinks"),
  totalSales: int("totalSales").default(0),
  totalRevenue: int("totalRevenue").default(0),
  rating: int("rating").default(0),
  isVerified: boolean("isVerified").default(false),
  /** Stripe Connect account ID for payouts */
  stripeConnectAccountId: varchar("stripeConnectAccountId", { length: 255 }),
  /** Stripe Connect onboarding status */
  stripeConnectStatus: mysqlEnum("stripeConnectStatus", ["not_started", "pending", "active", "restricted"]).default("not_started"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type InsertCreatorProfile = typeof creatorProfiles.$inferInsert;

/**
 * Marketplace Listings - lectures/courses for sale
 */
export const marketplaceListings = mysqlTable("marketplaceListings", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  pipelineId: int("pipelineId"),
  scriptId: int("scriptId"),
  /** Listing title */
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  /** Short description for cards */
  shortDescription: varchar("shortDescription", { length: 255 }),
  /** Category */
  category: mysqlEnum("category", ["web3", "ai", "blockchain", "defi", "nft", "metaverse", "programming", "business", "design", "other"]).default("other").notNull(),
  /** Price in cents (USD) */
  priceInCents: int("priceInCents").notNull(),
  /** Sale price in cents (optional) */
  salePriceInCents: int("salePriceInCents"),
  /** Currency */
  currency: varchar("currency", { length: 10 }).default("USD"),
  /** Thumbnail URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** Preview video URL */
  previewVideoUrl: text("previewVideoUrl"),
  /** Tags (comma-separated) */
  tags: text("tags"),
  /** Language */
  language: varchar("language", { length: 10 }).default("ko"),
  /** Duration in seconds */
  durationSec: int("durationSec").default(0),
  /** Listing status */
  status: mysqlEnum("status", ["draft", "pending", "active", "suspended", "archived"]).default("draft").notNull(),
  /** Total purchases */
  totalPurchases: int("totalPurchases").default(0),
  /** Average rating (0-500, divide by 100 for display) */
  avgRating: int("avgRating").default(0),
  /** Review count */
  reviewCount: int("reviewCount").default(0),
  /** View count */
  viewCount: int("viewCount").default(0),
  /** SCORM package ID (optional) */
  scormPackageId: int("scormPackageId"),
  /** Accept crypto payment */
  acceptCrypto: boolean("acceptCrypto").default(false),
  /** Featured listing */
  isFeatured: boolean("isFeatured").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListings.$inferInsert;

/**
 * Marketplace Purchases - purchase records
 */
export const marketplacePurchases = mysqlTable("marketplacePurchases", {
  id: int("id").autoincrement().primaryKey(),
  buyerId: int("buyerId").notNull(),
  listingId: int("listingId").notNull(),
  sellerId: int("sellerId").notNull(),
  /** Amount paid in cents */
  amountInCents: int("amountInCents").notNull(),
  /** Platform fee in cents (commission) */
  platformFeeInCents: int("platformFeeInCents").default(0),
  /** Seller payout in cents */
  sellerPayoutInCents: int("sellerPayoutInCents").default(0),
  /** Payment method */
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "crypto"]).default("stripe").notNull(),
  /** Stripe payment intent ID */
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  /** Crypto transaction hash */
  cryptoTxHash: varchar("cryptoTxHash", { length: 255 }),
  /** Purchase status */
  status: mysqlEnum("status", ["pending", "completed", "refunded", "disputed"]).default("pending").notNull(),
  /** Access granted */
  accessGranted: boolean("accessGranted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MarketplacePurchase = typeof marketplacePurchases.$inferSelect;
export type InsertMarketplacePurchase = typeof marketplacePurchases.$inferInsert;

/**
 * Marketplace Reviews - buyer reviews for listings
 */
export const marketplaceReviews = mysqlTable("marketplaceReviews", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  buyerId: int("buyerId").notNull(),
  purchaseId: int("purchaseId").notNull(),
  /** Rating 1-5 */
  rating: int("rating").notNull(),
  /** Review title */
  title: varchar("title", { length: 255 }),
  /** Review content */
  content: text("content"),
  /** Helpful count */
  helpfulCount: int("helpfulCount").default(0),
  /** Seller response */
  sellerResponse: text("sellerResponse"),
  sellerRespondedAt: timestamp("sellerRespondedAt"),
  isVerified: boolean("isVerified").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketplaceReview = typeof marketplaceReviews.$inferSelect;
export type InsertMarketplaceReview = typeof marketplaceReviews.$inferInsert;

/**
 * Creator Payouts - tracks payout requests and Stripe Connect transfers
 */
export const creatorPayouts = mysqlTable("creatorPayouts", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),
  /** Amount in cents to be paid out */
  amountInCents: int("amountInCents").notNull(),
  /** Platform fee deducted in cents */
  platformFeeInCents: int("platformFeeInCents").default(0),
  /** Net payout amount in cents */
  netPayoutInCents: int("netPayoutInCents").notNull(),
  /** Stripe Connect account ID */
  stripeConnectAccountId: varchar("stripeConnectAccountId", { length: 255 }),
  /** Stripe Transfer ID */
  stripeTransferId: varchar("stripeTransferId", { length: 255 }),
  /** Payout status */
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  /** Currency */
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  /** Failure reason if failed */
  failureReason: text("failureReason"),
  /** Period start (earnings from) */
  periodStart: timestamp("periodStart"),
  /** Period end (earnings to) */
  periodEnd: timestamp("periodEnd"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  completedAt: timestamp("completedAt"),
});
export type CreatorPayout = typeof creatorPayouts.$inferSelect;
export type InsertCreatorPayout = typeof creatorPayouts.$inferInsert;

/**
 * User Learning History - tracks what users have watched/completed
 */
export const userLearningHistory = mysqlTable("userLearningHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  listingId: int("listingId").notNull(),
  /** Progress percentage 0-100 */
  progressPercent: int("progressPercent").default(0),
  /** Total watch time in seconds */
  watchTimeSec: int("watchTimeSec").default(0),
  /** Last position in seconds */
  lastPositionSec: int("lastPositionSec").default(0),
  /** Whether completed */
  isCompleted: boolean("isCompleted").default(false),
  completedAt: timestamp("completedAt"),
  /** Number of times accessed */
  accessCount: int("accessCount").default(1),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserLearningHistory = typeof userLearningHistory.$inferSelect;
export type InsertUserLearningHistory = typeof userLearningHistory.$inferInsert;

/**
 * User Preferences - interests and preferences for recommendations
 */
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Preferred categories (JSON array) */
  preferredCategories: text("preferredCategories"),
  /** Preferred languages (JSON array) */
  preferredLanguages: text("preferredLanguages"),
  /** Preferred difficulty level */
  preferredDifficulty: mysqlEnum("preferredDifficulty", ["beginner", "intermediate", "advanced", "all"]).default("all"),
  /** Favorite creator IDs (JSON array) */
  favoriteCreators: text("favoriteCreators"),
  /** Topics of interest (JSON array) */
  interests: text("interests"),
  /** Learning goal */
  learningGoal: text("learningGoal"),
  /** Weekly learning time target in minutes */
  weeklyTargetMinutes: int("weeklyTargetMinutes").default(120),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

/**
 * Recommendation Cache - cached personalized recommendations
 */
export const recommendationCache = mysqlTable("recommendationCache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Recommendation type */
  type: mysqlEnum("type", ["personalized", "trending", "similar", "new_releases"]).notNull(),
  /** Source listing ID (for similar recommendations) */
  sourceListingId: int("sourceListingId"),
  /** Recommended listing IDs (JSON array with scores) */
  recommendations: text("recommendations").notNull(),
  /** Algorithm version used */
  algorithmVersion: varchar("algorithmVersion", { length: 50 }).default("v1"),
  /** Score/confidence of recommendations */
  confidenceScore: int("confidenceScore").default(0),
  /** Cache expiry */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecommendationCacheEntry = typeof recommendationCache.$inferSelect;
export type InsertRecommendationCacheEntry = typeof recommendationCache.$inferInsert;


/**
 * Real-time interpretation sessions
 */
export const interpretationSessions = mysqlTable("interpretationSessions", {
  id: int("id").autoincrement().primaryKey(),
  broadcastId: int("broadcastId"),
  pipelineId: int("pipelineId"),
  hostUserId: int("hostUserId").notNull(),
  sourceLanguage: varchar("sourceLanguage", { length: 10 }).default("ko").notNull(),
  targetLanguages: text("targetLanguages").notNull(), // JSON array of language codes
  status: mysqlEnum("status", ["active", "paused", "ended"]).default("active").notNull(),
  totalSegments: int("totalSegments").default(0),
  totalDurationSec: int("totalDurationSec").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});
export type InterpretationSession = typeof interpretationSessions.$inferSelect;
export type InsertInterpretationSession = typeof interpretationSessions.$inferInsert;

/**
 * Translation segments - individual translated chunks
 */
export const translationSegments = mysqlTable("translationSegments", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  sourceText: text("sourceText").notNull(),
  sourceLanguage: varchar("sourceLanguage", { length: 10 }).notNull(),
  targetLanguage: varchar("targetLanguage", { length: 10 }).notNull(),
  translatedText: text("translatedText").notNull(),
  startTimeSec: int("startTimeSec"),
  endTimeSec: int("endTimeSec"),
  confidence: int("confidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TranslationSegment = typeof translationSegments.$inferSelect;
export type InsertTranslationSegment = typeof translationSegments.$inferInsert;

/**
 * Supported languages configuration
 */
export const supportedLanguages = mysqlTable("supportedLanguages", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  nativeName: varchar("nativeName", { length: 100 }).notNull(),
  flag: varchar("flag", { length: 10 }).notNull(), // emoji flag
  ttsSupported: boolean("ttsSupported").default(true),
  sttSupported: boolean("sttSupported").default(true),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SupportedLanguage = typeof supportedLanguages.$inferSelect;
export type InsertSupportedLanguage = typeof supportedLanguages.$inferInsert;
