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
  voiceEffectPresets, InsertVoiceEffectPreset,
  voiceCloneSamples, InsertVoiceCloneSample,
  presetLikes, InsertPresetLike,
  pronunciationGuides, InsertPronunciationGuide,
  voiceCloneApplyLogs, InsertVoiceCloneApplyLog,
} from "../../drizzle/schema";
import { ENV } from '../_core/env';
export { ENV };

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

// Re-export all schema items for domain files
export * from "../../drizzle/schema";
export { eq, desc, asc, and, like, sql, gte, or } from "drizzle-orm";
