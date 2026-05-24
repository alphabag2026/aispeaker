import { ENV, InsertUser, InsertUserPreference, User, and, asc, desc, eq, getDb, gte, like, or, passwordResetTokens, sql, userPreferences, users } from "./shared";

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminCount() {
  const db = await getDb(); if (!db) return 1; // assume admin exists if db unavailable
  const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin'));
  return result[0]?.count ?? 0;
}

export async function createUserWithEmail(data: { email: string; passwordHash: string; name: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // First user becomes admin automatically
  const adminCount = await getAdminCount();
  const isFirstUser = adminCount === 0;
  const result = await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    loginMethod: "email",
    role: isFirstUser ? "admin" : "user",
    platformRole: isFirstUser ? "instructor" : "student",
    openId: `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

export async function createUserWithGoogle(data: { googleId: string; email: string; name: string; avatarUrl?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // First user becomes admin automatically
  const adminCount = await getAdminCount();
  const isFirstUser = adminCount === 0;
  const result = await db.insert(users).values({
    googleId: data.googleId,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatarUrl || null,
    loginMethod: "google",
    role: isFirstUser ? "admin" : "user",
    platformRole: isFirstUser ? "instructor" : "student",
    openId: `google_${data.googleId}`,
    lastSignedIn: new Date(),
  });
  return result[0].insertId;
}

export async function savePasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  // Delete any existing tokens for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  return result[0];
}

export async function deletePasswordResetToken(token: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function linkGoogleToUser(userId: number, googleId: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ googleId }).where(eq(users.id, userId));
}

export async function updateUserPlatformRole(userId: number, platformRole: "instructor" | "student") {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ platformRole }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; bio?: string; avatarUrl?: string; preferredLang?: string }) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserPreferredLang(userId: number, lang: string) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ preferredLang: lang }).where(eq(users.id, userId));
}

export async function getUserActivityStats(days: number) {
  const db = await getDb(); if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    date: sql<string>`DATE(lastSignedIn)`,
    count: sql<number>`COUNT(*)`,
  }).from(users).where(gte(users.lastSignedIn, since)).groupBy(sql`DATE(lastSignedIn)`).orderBy(sql`DATE(lastSignedIn)`);
  return rows;
}

export async function upsertUserPreferences(userId: number, data: Partial<InsertUserPreference>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (existing.length > 0) {
    await db.update(userPreferences).set(data).where(eq(userPreferences.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(userPreferences).values({ userId, ...data }).$returningId();
  return result.id;
}
