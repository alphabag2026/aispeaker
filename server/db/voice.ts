import { InsertPronunciationGuide, InsertVoiceCloneApplyLog, InsertVoiceCloneSample, InsertVoiceEffectPreset, InsertVoiceModProfile, InsertVoiceProfile, and, asc, desc, eq, getDb, gte, like, or, pronunciationGuides, sql, voiceCloneApplyLogs, voiceCloneSamples, voiceClones, voiceEffectPresets, voiceModProfiles, voiceProfiles } from "./shared";

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
  matchedVoiceId: string;
  voiceAnalysis: string;
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

export async function listVoiceEffectPresets(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(voiceEffectPresets).where(eq(voiceEffectPresets.userId, userId)).orderBy(desc(voiceEffectPresets.createdAt));
}

export async function createVoiceEffectPreset(data: InsertVoiceEffectPreset) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(voiceEffectPresets).values(data).$returningId();
  return result?.id ?? null;
}

export async function deleteVoiceEffectPreset(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(voiceEffectPresets).where(and(eq(voiceEffectPresets.id, id), eq(voiceEffectPresets.userId, userId)));
}

export async function addVoiceCloneSample(data: InsertVoiceCloneSample) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(voiceCloneSamples).values(data).$returningId();
  return result.id;
}

export async function getVoiceCloneSamples(voiceCloneId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(voiceCloneSamples).where(eq(voiceCloneSamples.voiceCloneId, voiceCloneId)).orderBy(asc(voiceCloneSamples.orderIndex));
}

export async function deleteVoiceCloneSample(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(voiceCloneSamples).where(and(eq(voiceCloneSamples.id, id), eq(voiceCloneSamples.userId, userId)));
}

export async function updateVoiceCloneSampleAnalysis(id: number, analysis: string) {
  const db = await getDb(); if (!db) return;
  await db.update(voiceCloneSamples).set({ analysis }).where(eq(voiceCloneSamples.id, id));
}

export async function addPronunciationGuide(data: InsertPronunciationGuide) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(pronunciationGuides).values(data).$returningId();
  return result.id;
}

export async function getPronunciationGuides(projectId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(pronunciationGuides)
    .where(and(eq(pronunciationGuides.projectId, projectId), eq(pronunciationGuides.userId, userId)))
    .orderBy(pronunciationGuides.createdAt);
}

export async function updatePronunciationGuide(id: number, userId: number, data: Partial<Pick<InsertPronunciationGuide, "word" | "phonetic" | "language" | "description">>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(pronunciationGuides).where(and(eq(pronunciationGuides.id, id), eq(pronunciationGuides.userId, userId))).limit(1);
  if (!existing) throw new Error("Pronunciation guide not found");
  await db.update(pronunciationGuides).set(data).where(eq(pronunciationGuides.id, id));
  return true;
}

export async function deletePronunciationGuide(id: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(pronunciationGuides).where(and(eq(pronunciationGuides.id, id), eq(pronunciationGuides.userId, userId))).limit(1);
  if (!existing) throw new Error("Pronunciation guide not found");
  await db.delete(pronunciationGuides).where(eq(pronunciationGuides.id, id));
  return true;
}

export async function getPronunciationGuidesByProject(projectId: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(pronunciationGuides)
    .where(eq(pronunciationGuides.projectId, projectId))
    .orderBy(pronunciationGuides.createdAt);
}

export async function addVoiceCloneApplyLog(data: InsertVoiceCloneApplyLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(voiceCloneApplyLogs).values(data);
  return result.insertId;
}

export async function listVoiceCloneApplyLogs(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(voiceCloneApplyLogs)
    .where(eq(voiceCloneApplyLogs.userId, userId))
    .orderBy(desc(voiceCloneApplyLogs.createdAt))
    .limit(limit);
}
