import { InsertProjectAvatar, InsertProjectSlide, InsertProjectWatermark, InsertScriptImprovementHistory, InsertScriptTemplate, InsertSlideAnnotation, InsertSlideAvatarOverride, InsertSlideInsertContent, InsertSlideLayout, InsertSlideScript, InsertSlideTransition, InsertSubscriptionPlan, InsertUserSubscription, and, asc, desc, didVideoHistory, eq, getDb, gte, lectureProjects, lectureScripts, like, liveBroadcasts, or, projectAvatars, projectCollaborators, projectSlides, projectWatermarks, scriptImprovementHistory, scriptTemplates, scriptVersions, slideAnnotations, slideAvatarOverrides, slideInsertContent, slideLayouts, slideScriptVersions, slideScripts, slideTransitions, sql, subscriptionPlans, translations, userSubscriptions, users, videoGenerations } from "./shared";
import { getLatestVersionNumber } from "./community";

export async function getScriptTemplates(category?: string, userId?: number) {
  const db = await getDb(); if (!db) return [];
  if (category) {
    return db.select().from(scriptTemplates).where(eq(scriptTemplates.category, category as any)).orderBy(desc(scriptTemplates.usageCount));
  }
  return db.select().from(scriptTemplates).orderBy(desc(scriptTemplates.usageCount));
}

export async function getScriptTemplateById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(scriptTemplates).where(eq(scriptTemplates.id, id));
  return rows[0] || null;
}

export async function createScriptTemplate(data: InsertScriptTemplate) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(scriptTemplates).values(data);
  return result[0].insertId;
}

export async function updateScriptTemplate(id: number, data: Partial<InsertScriptTemplate>) {
  const db = await getDb(); if (!db) return;
  await db.update(scriptTemplates).set(data).where(eq(scriptTemplates.id, id));
}

export async function deleteScriptTemplate(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(scriptTemplates).where(and(eq(scriptTemplates.id, id), eq(scriptTemplates.userId, userId)));
}

export async function incrementScriptTemplateUsage(id: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(scriptTemplates).where(eq(scriptTemplates.id, id));
  if (existing[0]) {
    await db.update(scriptTemplates).set({ usageCount: (existing[0].usageCount || 0) + 1 }).where(eq(scriptTemplates.id, id));
  }
}

export async function saveScriptAsTemplate(scriptId: number, userId: number, name: string, description?: string, tags?: string) {
  const db = await getDb(); if (!db) return null;
  const script = await db.select().from(lectureScripts).where(eq(lectureScripts.id, scriptId));
  if (!script[0]) return null;
  const s = script[0];
  const sections = s.sections ? JSON.parse(s.sections) : [];
  // Convert sections to template structure (remove content, keep structure)
  const structure = sections.map((sec: any) => ({
    title: sec.title,
    description: sec.slideNotes || "",
    durationPercent: Math.round((sec.durationSec / (s.estimatedDurationSec || 1)) * 100),
    slideNotes: sec.slideNotes || "",
  }));
  const templateId = await createScriptTemplate({
    userId,
    name,
    description: description || `Template generated from "${s.title}" script`,
    category: s.category || "general",
    difficulty: s.difficulty || "beginner",
    structure: JSON.stringify(structure),
    sectionCount: sections.length,
    targetDurationMin: s.targetDurationMin || 10,
    isBuiltIn: false,
    tags,
  });
  return templateId;
}

export async function createScriptVersion(data: {
  scriptId: number;
  userId: number;
  versionNumber: number;
  title: string;
  scriptContent?: string | null;
  sections?: string | null;
  sectionCount?: number;
  estimatedDurationSec?: number;
  changeDescription?: string | null;
  changeType?: "auto" | "manual" | "rollback";
}) {
  const db = await getDb();
  const result = await db!.insert(scriptVersions).values({
    scriptId: data.scriptId,
    userId: data.userId,
    versionNumber: data.versionNumber,
    title: data.title,
    scriptContent: data.scriptContent,
    sections: data.sections,
    sectionCount: data.sectionCount || 0,
    estimatedDurationSec: data.estimatedDurationSec || 0,
    changeDescription: data.changeDescription,
    changeType: data.changeType || "auto",
  });
  return (result as any)[0].insertId as number;
}

export async function getScriptVersions(scriptId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(scriptVersions)
    .where(and(eq(scriptVersions.scriptId, scriptId), eq(scriptVersions.userId, userId)))
    .orderBy(desc(scriptVersions.versionNumber));
}

export async function getScriptVersionById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(scriptVersions).where(eq(scriptVersions.id, id));
  return rows[0] || null;
}

export async function autoSaveScriptVersion(scriptId: number, userId: number, changeDescription?: string) {
  const db = await getDb();
  // Get current script data
  const scripts = await db!.select().from(lectureScripts).where(eq(lectureScripts.id, scriptId));
  const script = scripts[0];
  if (!script) return null;

  const latestVer = await getLatestVersionNumber(scriptId);
  const newVer = latestVer + 1;

  return createScriptVersion({
    scriptId,
    userId,
    versionNumber: newVer,
    title: script.title,
    scriptContent: script.scriptContent,
    sections: script.sections,
    sectionCount: script.sectionCount || 0,
    estimatedDurationSec: script.estimatedDurationSec || 0,
    changeDescription: changeDescription || `Auto-saved version ${newVer}`,
    changeType: "auto",
  });
}

export async function rollbackScriptToVersion(scriptId: number, versionId: number, userId: number) {
  const db = await getDb();
  const version = await getScriptVersionById(versionId);
  if (!version || version.scriptId !== scriptId) return null;

  // Update the script with version data
  await db!.update(lectureScripts).set({
    title: version.title,
    scriptContent: version.scriptContent,
    sections: version.sections,
    sectionCount: version.sectionCount || 0,
    estimatedDurationSec: version.estimatedDurationSec || 0,
  }).where(eq(lectureScripts.id, scriptId));

  // Create a new version recording the rollback
  const latestVer = await getLatestVersionNumber(scriptId);
  await createScriptVersion({
    scriptId,
    userId,
    versionNumber: latestVer + 1,
    title: version.title,
    scriptContent: version.scriptContent,
    sections: version.sections,
    sectionCount: version.sectionCount || 0,
    estimatedDurationSec: version.estimatedDurationSec || 0,
    changeDescription: `Rolled back to version ${version.versionNumber}`,
    changeType: "rollback",
  });

  return true;
}

export async function updateBroadcastSlideState(id: number, slideIndex: number, isAudioPlaying: boolean, audioPosition: number) {
  const db = await getDb(); if (!db) return;
  await db.update(liveBroadcasts).set({
    currentSlideIndex: slideIndex,
    isAudioPlaying,
    audioPosition,
    stateUpdatedAt: new Date(),
  }).where(eq(liveBroadcasts.id, id));
}

export async function listSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder);
}

export async function getSubscriptionPlan(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return rows[0] || null;
}

export async function getSubscriptionPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug)).limit(1);
  return rows[0] || null;
}

export async function updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)).limit(1);
  return rows[0] || null;
}

export async function createUserSubscription(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Remove existing subscription first
  await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, data.userId));
  const result = await db.insert(userSubscriptions).values(data);
  return { id: result[0].insertId };
}

export async function updateUserSubscription(id: number, data: Partial<InsertUserSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, id));
}

export async function listAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userSubscriptions).orderBy(desc(userSubscriptions.createdAt));
}

export async function toggleProjectPin(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [project] = await db.select({ isPinned: lectureProjects.isPinned }).from(lectureProjects).where(eq(lectureProjects.id, projectId));
  if (!project) throw new Error("Project not found");
  const newValue = !project.isPinned;
  await db.update(lectureProjects).set({ isPinned: newValue }).where(eq(lectureProjects.id, projectId));
  return newValue;
}

export async function addProjectAvatar(data: InsertProjectAvatar) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projectAvatars).values(data);
  return result.insertId;
}

export async function listProjectAvatars(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(projectAvatars).where(eq(projectAvatars.projectId, projectId)).orderBy(projectAvatars.sortOrder);
}

export async function updateProjectAvatar(id: number, data: Partial<InsertProjectAvatar>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectAvatars).set(data).where(eq(projectAvatars.id, id));
}

export async function deleteProjectAvatar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectAvatars).where(eq(projectAvatars.id, id));
}

export async function addProjectSlide(data: InsertProjectSlide) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(projectSlides).values(data);
  return result.insertId;
}

export async function listProjectSlides(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(projectSlides).where(eq(projectSlides.projectId, projectId)).orderBy(projectSlides.slideOrder);
}

export async function updateProjectSlide(id: number, data: Partial<InsertProjectSlide>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projectSlides).set(data).where(eq(projectSlides.id, id));
}

export async function deleteProjectSlide(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.slideId, id));
  await db.delete(slideScripts).where(eq(slideScripts.slideId, id));
  await db.delete(projectSlides).where(eq(projectSlides.id, id));
}

export async function reorderProjectSlides(projectId: number, slideIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (let i = 0; i < slideIds.length; i++) {
    await db.update(projectSlides).set({ slideOrder: i }).where(eq(projectSlides.id, slideIds[i]));
  }
}

export async function setSlideScript(data: InsertSlideScript) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideScripts).values(data);
  return result.insertId;
}

export async function listSlideScripts(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideScripts).where(eq(slideScripts.projectId, projectId)).orderBy(slideScripts.slideId, slideScripts.sortOrder);
}

export async function updateSlideScript(id: number, data: Partial<InsertSlideScript>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideScripts).set(data).where(eq(slideScripts.id, id));
}

export async function deleteSlideScript(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideScripts).where(eq(slideScripts.id, id));
}

export async function deleteSlideScriptsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideScripts).where(eq(slideScripts.slideId, slideId));
}

export async function deleteSlideScripts(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideScripts).where(eq(slideScripts.projectId, projectId));
}

export async function addSlideAnnotation(data: InsertSlideAnnotation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideAnnotations).values(data);
  return result.insertId;
}

export async function listSlideAnnotations(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideAnnotations).where(eq(slideAnnotations.projectId, projectId)).orderBy(slideAnnotations.slideId, slideAnnotations.sortOrder);
}

export async function listSlideAnnotationsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(slideAnnotations).where(eq(slideAnnotations.slideId, slideId)).orderBy(slideAnnotations.sortOrder);
}

export async function updateSlideAnnotation(id: number, data: Partial<InsertSlideAnnotation>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideAnnotations).set(data).where(eq(slideAnnotations.id, id));
}

export async function deleteSlideAnnotation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.id, id));
}

export async function deleteSlideAnnotationsBySlide(slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAnnotations).where(eq(slideAnnotations.slideId, slideId));
}

export async function listUserVideoGenerationsWithProject(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select({
    id: videoGenerations.id,
    projectId: videoGenerations.projectId,
    status: videoGenerations.status,
    videoUrl: videoGenerations.videoUrl,
    totalDuration: videoGenerations.totalDuration,
    slideCount: videoGenerations.slideCount,
    resolution: videoGenerations.resolution,
    config: videoGenerations.config,
    errorMessage: videoGenerations.errorMessage,
    createdAt: videoGenerations.createdAt,
    completedAt: videoGenerations.completedAt,
    projectTitle: lectureProjects.title,
    projectThumbnail: lectureProjects.thumbnailUrl,
  }).from(videoGenerations)
    .leftJoin(lectureProjects, eq(videoGenerations.projectId, lectureProjects.id))
    .where(eq(videoGenerations.userId, userId))
    .orderBy(desc(videoGenerations.createdAt));
}

export async function addScriptImprovementHistory(data: InsertScriptImprovementHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(scriptImprovementHistory).values(data);
  return result.insertId;
}

export async function addBatchScriptImprovementHistory(data: InsertScriptImprovementHistory[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(scriptImprovementHistory).values(data);
}

export async function getScriptImprovementHistory(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptImprovementHistory)
    .where(and(
      eq(scriptImprovementHistory.projectId, projectId),
      eq(scriptImprovementHistory.userId, userId),
    ))
    .orderBy(desc(scriptImprovementHistory.createdAt))
    .limit(100);
}

export async function getScriptImprovementBatch(batchId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scriptImprovementHistory)
    .where(eq(scriptImprovementHistory.batchId, batchId))
    .orderBy(scriptImprovementHistory.sectionIndex);
}

export async function createSlideScriptVersion(data: {
  projectId: number;
  userId: number;
  versionNumber: number;
  sectionsSnapshot: string;
  sectionCount: number;
  changeDescription?: string;
  changeType: "manual" | "auto";
}) {
  const db = await getDb();
  const result = await db!.insert(slideScriptVersions).values(data);
  return result[0].insertId;
}

export async function getSlideScriptVersions(projectId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(slideScriptVersions)
    .where(and(eq(slideScriptVersions.projectId, projectId), eq(slideScriptVersions.userId, userId)))
    .orderBy(desc(slideScriptVersions.versionNumber))
    .limit(50);
}

export async function getSlideScriptVersionById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(slideScriptVersions).where(eq(slideScriptVersions.id, id));
  return rows[0] || null;
}

export async function getLatestSlideScriptVersionNumber(projectId: number) {
  const db = await getDb();
  const rows = await db!.select({ maxVer: sql<number>`COALESCE(MAX(${slideScriptVersions.versionNumber}), 0)` })
    .from(slideScriptVersions)
    .where(eq(slideScriptVersions.projectId, projectId));
  return rows[0]?.maxVer || 0;
}

export async function getSlideAvatarOverrides(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideAvatarOverrides)
    .where(eq(slideAvatarOverrides.projectId, projectId))
    .orderBy(slideAvatarOverrides.slideId);
}

export async function getSlideAvatarOverride(projectId: number, slideId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, projectId), eq(slideAvatarOverrides.slideId, slideId)));
  return rows[0] || null;
}

export async function upsertSlideAvatarOverride(data: InsertSlideAvatarOverride) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if exists
  const existing = await db.select().from(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, data.projectId), eq(slideAvatarOverrides.slideId, data.slideId)));
  if (existing.length > 0) {
    await db.update(slideAvatarOverrides).set(data).where(eq(slideAvatarOverrides.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideAvatarOverrides).values(data);
  return result.insertId;
}

export async function deleteSlideAvatarOverride(projectId: number, slideId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideAvatarOverrides)
    .where(and(eq(slideAvatarOverrides.projectId, projectId), eq(slideAvatarOverrides.slideId, slideId)));
}

export async function listSlideInsertContent(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideInsertContent)
    .where(eq(slideInsertContent.projectId, projectId))
    .orderBy(slideInsertContent.afterSlideId, slideInsertContent.sortOrder);
}

export async function getSlideInsertContentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(slideInsertContent).where(eq(slideInsertContent.id, id));
  return rows[0] || null;
}

export async function createSlideInsertContent(data: InsertSlideInsertContent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(slideInsertContent).values(data);
  return result.insertId;
}

export async function updateSlideInsertContent(id: number, data: Partial<InsertSlideInsertContent>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(slideInsertContent).set(data).where(eq(slideInsertContent.id, id));
}

export async function deleteSlideInsertContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideInsertContent).where(eq(slideInsertContent.id, id));
}

export async function getSlideTransitions(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideTransitions).where(eq(slideTransitions.projectId, projectId));
}

export async function upsertSlideTransition(data: InsertSlideTransition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if exists
  const existing = await db.select().from(slideTransitions)
    .where(and(eq(slideTransitions.projectId, data.projectId), eq(slideTransitions.slideId, data.slideId!)));
  if (existing.length > 0) {
    await db.update(slideTransitions).set(data).where(eq(slideTransitions.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideTransitions).values(data);
  return result.insertId;
}

export async function setProjectTransitions(projectId: number, transitionType: string, durationMs: number, easing: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Get all slides for this project
  const slides = await db.select().from(projectSlides).where(eq(projectSlides.projectId, projectId));
  for (const slide of slides) {
    await upsertSlideTransition({
      projectId,
      slideId: slide.id,
      transitionType: transitionType as any,
      durationMs,
      easing: easing as any,
    });
  }
  return slides.length;
}

export async function deleteSlideTransition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(slideTransitions).where(eq(slideTransitions.id, id));
}

export async function upsertSlideLayout(data: InsertSlideLayout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check existing
  const existing = await db.select().from(slideLayouts)
    .where(and(eq(slideLayouts.projectId, data.projectId), eq(slideLayouts.slideId, data.slideId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(slideLayouts).set(data).where(eq(slideLayouts.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(slideLayouts).values(data).$returningId();
  return result.id;
}

export async function getSlideLayouts(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slideLayouts)
    .where(eq(slideLayouts.projectId, projectId))
    .orderBy(slideLayouts.slideId);
}

export async function applySlideLayout(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(slideLayouts).set({ isApplied: true }).where(eq(slideLayouts.id, id));
}

export async function deleteSlideLayouts(projectId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(slideLayouts).where(eq(slideLayouts.projectId, projectId));
}

export async function upsertProjectWatermark(data: InsertProjectWatermark) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(projectWatermarks)
    .where(and(eq(projectWatermarks.projectId, data.projectId), eq(projectWatermarks.userId, data.userId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(projectWatermarks).set(data).where(eq(projectWatermarks.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(projectWatermarks).values(data).$returningId();
  return result.id;
}

export async function getProjectWatermark(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(projectWatermarks)
    .where(eq(projectWatermarks.projectId, projectId))
    .limit(1);
  return rows[0] || null;
}

export async function deleteProjectWatermark(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectWatermarks).where(eq(projectWatermarks.id, id));
}

export async function updateScriptInterpreter(scriptId: number, userId: number, data: {
  interpreterEnabled?: boolean;
  interpreterLanguage?: string;
  interpreterSections?: string;
  interpreterVoiceId?: string;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(lectureScripts).set(data).where(and(eq(lectureScripts.id, scriptId), eq(lectureScripts.userId, userId)));
}

export async function updateSlideScriptInterpreterText(scriptId: number, interpreterText: string) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(slideScripts).set({ interpreterText }).where(eq(slideScripts.id, scriptId));
}

export async function bulkUpdateSlideScriptInterpreterTexts(projectId: number, translations: Array<{ slideId: number; interpreterText: string }>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const scripts = await db.select().from(slideScripts).where(eq(slideScripts.projectId, projectId));
  for (const t of translations) {
    const script = scripts.find(s => s.slideId === t.slideId);
    if (script) {
      await db.update(slideScripts).set({ interpreterText: t.interpreterText }).where(eq(slideScripts.id, script.id));
    }
  }
}

export async function getProjectCollaborators(projectId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    userId: projectCollaborators.userId,
    role: projectCollaborators.role,
    inviteStatus: projectCollaborators.inviteStatus,
    inviteEmail: projectCollaborators.inviteEmail,
    createdAt: projectCollaborators.createdAt,
    userName: users.name,
    userEmail: users.email,
    userAvatar: users.avatarUrl,
  }).from(projectCollaborators)
    .leftJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, projectId))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function isProjectCollaborator(projectId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select({ id: projectCollaborators.id }).from(projectCollaborators)
    .where(and(
      eq(projectCollaborators.projectId, projectId),
      eq(projectCollaborators.userId, userId),
      eq(projectCollaborators.inviteStatus, "accepted")
    )).limit(1);
  return rows.length > 0;
}

export async function listDidVideosByScript(scriptId: number, userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(didVideoHistory).where(and(eq(didVideoHistory.scriptId, scriptId), eq(didVideoHistory.userId, userId))).orderBy(asc(didVideoHistory.sectionIndex));
}
