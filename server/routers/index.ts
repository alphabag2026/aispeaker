import { systemRouter } from "../_core/systemRouter";
import { router } from "../_core/trpc";
import { authRouter, userRouter } from "./auth";
import { lectureRouter, materialRouter, enrollmentRouter, qaRouter, vodRouter, progressRouter, vodHistoryRouter, bookmarkRouter } from "./lecture";
import { voiceProfileRouter, ttsRouter, sttRouter, voiceCloneRouter, voiceEffectPresetRouter, voiceCloneSampleRouter } from "./voice";
import { avatarRouter, sampleFaceRouter, sampleVoiceRouter, userAvatarRouter, didHistoryRouter, didPipelineRouter } from "./avatar";
import { scriptTemplateRouter, scriptRouter } from "./script";
import { pipelineRouter, broadcastRouter, pipRouter, pptRouter, klingRouter, videoEffectsRouter } from "./pipeline";
import { lectureBuilderRouter, wbCollabRouter, slideLayoutRouter, watermarkRouter, interpretationRouter, collaborationRouter } from "./lectureBuilder";
import { planRouter, subscriptionRouter, creditRouter, paymentRouter, cryptoRouter, revenueRouter, payoutRouter } from "./payment";
import { galleryRouter, communityRouter, profileRouter, sharedPresetRouter, subtitleStyleRouter, sharedSubtitlePresetRouter, presetTagRouter, myPresetsRouter, presetSearchRouter, presetReportRouter, presetVersionRouter, presetCommentRouter, marketplaceRouter, recommendationRouter } from "./community";
import { adminRouter, adminAnalyticsRouter, adminReportRouter, adminStatsRouter } from "./admin";
import { whiteboardRouter, translationRouter, templateRouter, faceSwapRouter, voiceModRouter, platformRouter, certificateRouter, sessionRouter, akoolRouter, aiHistoryRouter, notificationRouter, scormRouter } from "./misc";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  user: userRouter,
  lecture: lectureRouter,
  material: materialRouter,
  enrollment: enrollmentRouter,
  qa: qaRouter,
  vod: vodRouter,
  progress: progressRouter,
  vodHistory: vodHistoryRouter,
  bookmark: bookmarkRouter,
  voiceProfile: voiceProfileRouter,
  tts: ttsRouter,
  stt: sttRouter,
  voiceClone: voiceCloneRouter,
  voiceEffectPreset: voiceEffectPresetRouter,
  voiceCloneSample: voiceCloneSampleRouter,
  avatar: avatarRouter,
  sampleFace: sampleFaceRouter,
  sampleVoice: sampleVoiceRouter,
  userAvatar: userAvatarRouter,
  didHistory: didHistoryRouter,
  didPipeline: didPipelineRouter,
  scriptTemplate: scriptTemplateRouter,
  script: scriptRouter,
  pipeline: pipelineRouter,
  broadcast: broadcastRouter,
  pip: pipRouter,
  ppt: pptRouter,
  kling: klingRouter,
  videoEffects: videoEffectsRouter,
  lectureBuilder: lectureBuilderRouter,
  wbCollab: wbCollabRouter,
  slideLayout: slideLayoutRouter,
  watermark: watermarkRouter,
  interpretation: interpretationRouter,
  collaboration: collaborationRouter,
  plan: planRouter,
  subscription: subscriptionRouter,
  credit: creditRouter,
  payment: paymentRouter,
  crypto: cryptoRouter,
  revenue: revenueRouter,
  payout: payoutRouter,
  gallery: galleryRouter,
  community: communityRouter,
  profile: profileRouter,
  sharedPreset: sharedPresetRouter,
  subtitleStyle: subtitleStyleRouter,
  sharedSubtitlePreset: sharedSubtitlePresetRouter,
  presetTag: presetTagRouter,
  myPresets: myPresetsRouter,
  presetSearch: presetSearchRouter,
  presetReport: presetReportRouter,
  presetVersion: presetVersionRouter,
  presetComment: presetCommentRouter,
  marketplace: marketplaceRouter,
  recommendation: recommendationRouter,
  admin: adminRouter,
  adminAnalytics: adminAnalyticsRouter,
  adminReport: adminReportRouter,
  adminStats: adminStatsRouter,
  whiteboard: whiteboardRouter,
  translation: translationRouter,
  template: templateRouter,
  faceSwap: faceSwapRouter,
  voiceMod: voiceModRouter,
  platform: platformRouter,
  certificate: certificateRouter,
  session: sessionRouter,
  akool: akoolRouter,
  aiHistory: aiHistoryRouter,
  notification: notificationRouter,
  scorm: scormRouter,
});

export type AppRouter = typeof appRouter;
