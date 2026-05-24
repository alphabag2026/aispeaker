import { InsertBroadcastAnalytic, InsertBroadcastChat, InsertBroadcastRecording, InsertDidVideoHistory, InsertFaceSwapProfile, InsertKlingTask, InsertLiveBroadcast, InsertPipSetting, InsertPptUpload, InsertProductionPipeline, InsertSubtitleStyle, InsertUserAvatar, InsertVideoGeneration, InsertVodRecording, InsertVodTimelineEvent, InsertWhiteboardSession, and, asc, broadcastAnalytics, broadcastChats, broadcastRecordings, broadcastViewers, desc, didVideoHistory, eq, faceSwapProfiles, getDb, gte, klingTasks, lectureProjects, lectureScripts, lectures, like, liveBroadcasts, or, pipSettings, pptUploads, productionPipelines, projectAvatars, qaMessages, sql, subtitleStyles, userAvatars, users, videoGenerations, vodRecordings, vodTimelineEvents, vodWatchHistory, whiteboardParticipants, whiteboardSessions, whiteboardSnapshots } from "./shared";

export async function updateQaMessageAvatar(id: number, avatarVideoUrl: string) {
  const db = await getDb(); if (!db) return;
  await db.update(qaMessages).set({ avatarVideoUrl }).where(eq(qaMessages.id, id));
}

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

export async function listAvatarsBySampleFace(userId: number, sampleFaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select({
    id: projectAvatars.id,
    projectId: projectAvatars.projectId,
    name: projectAvatars.name,
    role: projectAvatars.role,
    ttsVoiceId: projectAvatars.ttsVoiceId,
    voiceCloneId: projectAvatars.voiceCloneId,
    voiceSpeed: projectAvatars.voiceSpeed,
    voicePitch: projectAvatars.voicePitch,
    projectTitle: lectureProjects.title,
  }).from(projectAvatars)
    .innerJoin(lectureProjects, eq(projectAvatars.projectId, lectureProjects.id))
    .where(and(
      eq(projectAvatars.sampleFaceId, sampleFaceId),
      eq(lectureProjects.userId, userId)
    ));
}

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

export async function getFavoriteUserAvatarsWithVoice(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userAvatars)
    .where(and(
      eq(userAvatars.userId, userId),
      eq(userAvatars.isFavorite, true)
    ))
    .orderBy(desc(userAvatars.lastUsedAt));
}
