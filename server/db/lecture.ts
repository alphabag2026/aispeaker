import { InsertLecture, InsertLectureFormatTemplate, InsertLectureMaterial, InsertLectureProject, InsertLectureScript, InsertLectureSession, and, asc, certificates, desc, eq, getDb, gte, learningProgress, lectureEnrollments, lectureFormatTemplates, lectureMaterials, lectureProjects, lectureScripts, lectureSessions, lectures, like, or, projectAvatars, projectSlides, slideAnnotations, slideScripts, sql, users, vodRecordings } from "./shared";
import { listProjectAvatars, addProjectAvatar, listProjectSlides, addProjectSlide, listSlideScripts, setSlideScript, listSlideAnnotations, addSlideAnnotation, getSlideAvatarOverrides, upsertSlideAvatarOverride, listSlideInsertContent, createSlideInsertContent, getSlideTransitions, upsertSlideTransition } from "./project";

export async function getLectures(filters?: { category?: string; status?: string; instructorId?: number; search?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.category) conditions.push(eq(lectures.category, filters.category as any));
  if (filters?.status) conditions.push(eq(lectures.status, filters.status as any));
  if (filters?.instructorId) conditions.push(eq(lectures.instructorId, filters.instructorId));
  if (filters?.search) conditions.push(like(lectures.title, `%${filters.search}%`));
  const query = conditions.length > 0
    ? db.select().from(lectures).where(and(...conditions)).orderBy(desc(lectures.createdAt))
    : db.select().from(lectures).orderBy(desc(lectures.createdAt));
  return query;
}

export async function getLectureById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1);
  return result[0];
}

export async function createLecture(data: InsertLecture) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectures).values(data); return result[0].insertId;
}

export async function updateLecture(id: number, instructorId: number, data: Partial<InsertLecture>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectures).set(data).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}

export async function deleteLecture(id: number, instructorId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectures).where(and(eq(lectures.id, id), eq(lectures.instructorId, instructorId)));
}

export async function updateLectureStatus(id: number, status: string) {
  const db = await getDb(); if (!db) return;
  await db.update(lectures).set({ status: status as any }).where(eq(lectures.id, id));
}

export async function getLectureMaterials(lectureId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(lectureMaterials).where(eq(lectureMaterials.lectureId, lectureId)).orderBy(lectureMaterials.sortOrder);
}

export async function createLectureMaterial(data: InsertLectureMaterial) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureMaterials).values(data); return result[0].insertId;
}

export async function deleteLectureMaterial(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectureMaterials).where(eq(lectureMaterials.id, id));
}

export async function enrollInLecture(lectureId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(lectureEnrollments).values({ lectureId, userId });
  return result[0].insertId;
}

export async function getLectureEnrollments(lectureId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ enrollment: lectureEnrollments, user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl } })
    .from(lectureEnrollments).innerJoin(users, eq(lectureEnrollments.userId, users.id))
    .where(eq(lectureEnrollments.lectureId, lectureId));
}

export async function getUserEnrollments(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ enrollment: lectureEnrollments, lecture: lectures })
    .from(lectureEnrollments).innerJoin(lectures, eq(lectureEnrollments.lectureId, lectures.id))
    .where(eq(lectureEnrollments.userId, userId)).orderBy(desc(lectureEnrollments.joinedAt));
}

export async function isEnrolled(lectureId: number, userId: number) {
  const db = await getDb(); if (!db) return false;
  const result = await db.select().from(lectureEnrollments)
    .where(and(eq(lectureEnrollments.lectureId, lectureId), eq(lectureEnrollments.userId, userId))).limit(1);
  return result.length > 0;
}

export async function getLectureStats(instructorId: number) {
  const db = await getDb(); if (!db) return { totalLectures: 0, totalStudents: 0, liveLectures: 0, totalVods: 0 };
  const lectureList = await db.select().from(lectures).where(eq(lectures.instructorId, instructorId));
  let totalStudents = 0, liveLectures = 0;
  for (const l of lectureList) {
    if (l.status === 'live') liveLectures++;
    const enrollments = await db.select().from(lectureEnrollments).where(eq(lectureEnrollments.lectureId, l.id));
    totalStudents += enrollments.length;
  }
  const vods = await db.select().from(vodRecordings).innerJoin(lectures, eq(vodRecordings.lectureId, lectures.id))
    .where(eq(lectures.instructorId, instructorId));
  return { totalLectures: lectureList.length, totalStudents, liveLectures, totalVods: vods.length };
}

export async function getLearningProgressForLecture(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId))).limit(1);
  return result[0] || null;
}

export async function getCertificateForLecture(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.lectureId, lectureId))).limit(1);
  return result[0];
}

export async function createLectureSession(data: InsertLectureSession) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureSessions).values(data); return result[0].insertId;
}

export async function getLectureSession(lectureId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectureSessions)
    .where(eq(lectureSessions.lectureId, lectureId)).orderBy(desc(lectureSessions.createdAt)).limit(1);
  return result[0];
}

export async function updateLectureSession(id: number, data: Partial<InsertLectureSession>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectureSessions).set(data).where(eq(lectureSessions.id, id));
}

export async function endLectureSession(id: number) {
  const db = await getDb(); if (!db) return;
  const session = await db.select().from(lectureSessions).where(eq(lectureSessions.id, id)).limit(1);
  if (session[0]) {
    const startedAt = session[0].startedAt || session[0].createdAt;
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    await db.update(lectureSessions).set({ status: 'ended', endedAt: new Date(), durationSeconds }).where(eq(lectureSessions.id, id));
  }
}

export async function createLectureScript(data: InsertLectureScript) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(lectureScripts).values(data); return result[0].insertId;
}

export async function getLectureScripts(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(lectureScripts).where(eq(lectureScripts.userId, userId)).orderBy(desc(lectureScripts.createdAt));
}

export async function getLectureScriptById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(lectureScripts).where(eq(lectureScripts.id, id)).limit(1);
  return result[0];
}

export async function updateLectureScript(id: number, data: Partial<InsertLectureScript>) {
  const db = await getDb(); if (!db) return;
  await db.update(lectureScripts).set(data).where(eq(lectureScripts.id, id));
}

export async function deleteLectureScript(id: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(lectureScripts).where(and(eq(lectureScripts.id, id), eq(lectureScripts.userId, userId)));
}

export async function createLectureProject(data: InsertLectureProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(lectureProjects).values(data);
  return result.insertId;
}

export async function getLectureProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(lectureProjects).where(eq(lectureProjects.id, id));
  return rows[0] || null;
}

export async function listLectureProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select().from(lectureProjects).where(eq(lectureProjects.userId, userId)).orderBy(desc(lectureProjects.isPinned), desc(lectureProjects.updatedAt));
}

export async function updateLectureProject(id: number, data: Partial<InsertLectureProject>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lectureProjects).set(data).where(eq(lectureProjects.id, id));
}

export async function deleteLectureProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete all related data first
  await db.delete(slideAnnotations).where(eq(slideAnnotations.projectId, id));
  await db.delete(slideScripts).where(eq(slideScripts.projectId, id));
  await db.delete(projectSlides).where(eq(projectSlides.projectId, id));
  await db.delete(projectAvatars).where(eq(projectAvatars.projectId, id));
  await db.delete(lectureProjects).where(eq(lectureProjects.id, id));
}

export async function listLectureFormatTemplates(category?: "personnel" | "style" | "insert") {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(lectureFormatTemplates)
      .where(and(eq(lectureFormatTemplates.isActive, true), eq(lectureFormatTemplates.category, category as any)))
      .orderBy(lectureFormatTemplates.sortOrder);
  }
  return db.select().from(lectureFormatTemplates)
    .where(eq(lectureFormatTemplates.isActive, true))
    .orderBy(lectureFormatTemplates.sortOrder);
}

export async function getLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(lectureFormatTemplates).where(eq(lectureFormatTemplates.id, id)).limit(1);
  return rows[0];
}

export async function listAllLectureFormatTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lectureFormatTemplates).orderBy(lectureFormatTemplates.category, lectureFormatTemplates.sortOrder);
}

export async function createLectureFormatTemplate(data: InsertLectureFormatTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(lectureFormatTemplates).values(data);
  return { id: Number(result[0].insertId) };
}

export async function updateLectureFormatTemplate(id: number, data: Partial<InsertLectureFormatTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(lectureFormatTemplates).set(data).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

export async function deleteLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Soft delete - just set isActive to false
  await db.update(lectureFormatTemplates).set({ isActive: false }).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

export async function hardDeleteLectureFormatTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(lectureFormatTemplates).where(eq(lectureFormatTemplates.id, id));
  return { id };
}

export async function cloneLectureProject(sourceProjectId: number, userId: number, newTitle: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // 1. Get source project
  const source = await getLectureProject(sourceProjectId);
  if (!source) throw new Error("Source project not found");
  
  // 2. Create new project (copy settings, reset status)
  const newProjectId = await createLectureProject({
    userId,
    title: newTitle,
    description: source.description ? `[Clone] ${source.description}` : "[Cloned]",
    currentStep: source.currentStep,
    status: "draft",
    avatarPosition: source.avatarPosition,
    avatarSize: source.avatarSize,
    avatarShape: source.avatarShape,
    avatarOpacity: source.avatarOpacity,
  });
  
  // 3. Clone avatars (map old ID -> new ID)
  const avatarIdMap = new Map<number, number>();
  const sourceAvatars = await listProjectAvatars(sourceProjectId);
  for (const avatar of sourceAvatars) {
    const newAvatarId = await addProjectAvatar({
      projectId: newProjectId,
      sampleFaceId: avatar.sampleFaceId,
      customFaceUrl: avatar.customFaceUrl,
      name: avatar.name,
      role: avatar.role,
      ttsVoiceId: avatar.ttsVoiceId,
      sortOrder: avatar.sortOrder,
    });
    avatarIdMap.set(avatar.id, newAvatarId);
  }
  
  // 4. Clone slides (map old ID -> new ID)
  const slideIdMap = new Map<number, number>();
  const sourceSlides = await listProjectSlides(sourceProjectId);
  for (const slide of sourceSlides) {
    const newSlideId = await addProjectSlide({
      projectId: newProjectId,
      imageUrl: slide.imageUrl,
      fileKey: slide.fileKey,
      slideOrder: slide.slideOrder,
      originalFileName: slide.originalFileName,
    });
    slideIdMap.set(slide.id, newSlideId);
  }
  
  // 5. Clone scripts (remap slideId and avatarId)
  const sourceScripts = await listSlideScripts(sourceProjectId);
  for (const script of sourceScripts) {
    const newSlideId = slideIdMap.get(script.slideId);
    if (!newSlideId) continue;
    await setSlideScript({
      projectId: newProjectId,
      slideId: newSlideId,
      avatarId: script.avatarId ? (avatarIdMap.get(script.avatarId) || script.avatarId) : null,
      scriptText: script.scriptText,
      estimatedDurationSec: script.estimatedDurationSec,
      sortOrder: script.sortOrder,
    });
  }
  
  // 6. Clone annotations (remap slideId)
  const sourceAnnotations = await listSlideAnnotations(sourceProjectId);
  for (const ann of sourceAnnotations) {
    const newSlideId = slideIdMap.get(ann.slideId);
    if (!newSlideId) continue;
    await addSlideAnnotation({
      projectId: newProjectId,
      slideId: newSlideId,
      annotationType: ann.annotationType,
      penColor: ann.penColor,
      penThickness: ann.penThickness,
      pathData: ann.pathData,
      showAtSec: ann.showAtSec,
      durationSec: ann.durationSec,
      sortOrder: ann.sortOrder,
    });
  }
  
  // 7. Clone avatar overrides (remap slideId)
  const sourceOverrides = await getSlideAvatarOverrides(sourceProjectId);
  for (const ov of sourceOverrides) {
    const newSlideId = slideIdMap.get(ov.slideId);
    if (!newSlideId) continue;
    await upsertSlideAvatarOverride({
      projectId: newProjectId,
      slideId: newSlideId,
      avatarPosition: ov.avatarPosition,
      avatarSizePercent: ov.avatarSizePercent,
      offsetX: ov.offsetX,
      offsetY: ov.offsetY,
      avatarShape: ov.avatarShape,
      avatarOpacity: ov.avatarOpacity,
      isHidden: ov.isHidden,
    });
  }
  
  // 8. Clone insert content (remap afterSlideId and avatarId)
  const sourceInserts = await listSlideInsertContent(sourceProjectId);
  for (const ins of sourceInserts) {
    const newAfterSlideId = ins.afterSlideId ? (slideIdMap.get(ins.afterSlideId) || 0) : 0;
    await createSlideInsertContent({
      projectId: newProjectId,
      afterSlideId: newAfterSlideId,
      contentType: ins.contentType,
      title: ins.title,
      contentUrl: ins.contentUrl,
      fileKey: ins.fileKey,
      drawingData: ins.drawingData,
      backgroundColor: ins.backgroundColor,
      durationSec: ins.durationSec,
      scriptText: ins.scriptText,
      avatarId: ins.avatarId ? (avatarIdMap.get(ins.avatarId) || ins.avatarId) : null,
      sortOrder: ins.sortOrder,
    });
  }
  
  // 9. Clone transitions (remap slideId)
  const sourceTransitions = await getSlideTransitions(sourceProjectId);
  for (const tr of sourceTransitions) {
    const newSlideId = slideIdMap.get(tr.slideId);
    if (!newSlideId) continue;
    await upsertSlideTransition({
      projectId: newProjectId,
      slideId: newSlideId,
      transitionType: tr.transitionType as any,
      durationMs: tr.durationMs,
      easing: tr.easing as any,
    });
  }
  
  return { newProjectId, avatarCount: sourceAvatars.length, slideCount: sourceSlides.length, scriptCount: sourceScripts.length };
}

export async function updateLectureProjectInterpreter(projectId: number, userId: number, data: {
  interpreterEnabled?: boolean;
  interpreterLanguage?: string;
  interpreterVoiceId?: string;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(lectureProjects).set(data).where(and(eq(lectureProjects.id, projectId), eq(lectureProjects.userId, userId)));
}
