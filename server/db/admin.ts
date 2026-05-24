import { InsertAiContextTemplate, InsertAiGeneration, InsertInterpretationSession, InsertNotification, InsertPlatformIntegration, InsertProjectCollaborator, InsertTranslation, InsertTranslationSegment, aiContextTemplates, aiGenerations, and, apiUsageLogs, asc, contentAnalyses, desc, eq, getDb, gte, interpretationSessions, like, notifications, or, platformIntegrations, projectCollaborators, sql, supportedLanguages, systemSettings, translationSegments, translations } from "./shared";

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

export async function addCollaborator(data: InsertProjectCollaborator) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(projectCollaborators).values(data);
  return result[0].insertId;
}

export async function updateCollaboratorStatus(id: number, status: "accepted" | "rejected") {
  const db = await getDb(); if (!db) return;
  await db.update(projectCollaborators).set({ inviteStatus: status }).where(eq(projectCollaborators.id, id));
}

export async function removeCollaborator(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(projectCollaborators).where(eq(projectCollaborators.id, id));
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
