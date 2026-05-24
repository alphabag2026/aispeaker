import { InsertCreatorPayout, InsertCreatorProfile, InsertCreditTransaction, InsertCreditUsageLog, InsertCryptoPayment, InsertMarketplaceListing, InsertMarketplacePurchase, InsertMarketplaceReview, InsertPayment, and, asc, creatorPayouts, creatorProfiles, creditTransactions, creditUsageLogs, cryptoPayments, desc, eq, getDb, gte, like, marketplaceListings, marketplacePurchases, marketplaceReviews, or, payments, sql, userSubscriptions } from "./shared";
import { getUserSubscription } from "./project";

export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const sub = await getUserSubscription(userId);
  return sub?.creditsRemaining ?? 0;
}

export async function addCreditTransaction(data: InsertCreditTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(creditTransactions).values(data);
  return { id: result[0].insertId };
}

export async function getUserCreditHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function deductCredits(userId: number, amount: number, description: string, resourceType?: string, resourceId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const sub = await getUserSubscription(userId);
  if (!sub) throw new Error("No active subscription");
  const remaining = (sub.creditsRemaining ?? 0) - amount;
  if (remaining < 0) throw new Error("Insufficient credits");
  await db.update(userSubscriptions).set({ creditsRemaining: remaining }).where(eq(userSubscriptions.id, sub.id));
  await addCreditTransaction({
    userId,
    type: "usage",
    amount: -amount,
    balanceAfter: remaining,
    description,
    resourceType,
    resourceId,
  });
  return remaining;
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(payments).values(data).$returningId();
  return result;
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return rows[0] || null;
}

export async function getPaymentByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(payments).where(eq(payments.externalId, externalId)).limit(1);
  return rows[0] || null;
}

export async function updatePaymentStatus(id: number, status: string, externalId?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (externalId) updateData.externalId = externalId;
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(payments).set(updateData).where(eq(payments.id, id));
}

export async function getUserPayments(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(limit);
}

export async function getAllPayments(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
}

export async function getPaymentStats() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalPayments: 0, completedPayments: 0 };
  const allPayments = await db.select().from(payments).where(eq(payments.status, "completed"));
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amountCents, 0);
  return {
    totalRevenue,
    totalPayments: allPayments.length,
    completedPayments: allPayments.length,
  };
}

export async function createCryptoPayment(data: InsertCryptoPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(cryptoPayments).values(data).$returningId();
  return result;
}

export async function getCryptoPaymentByPaymentId(paymentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(cryptoPayments).where(eq(cryptoPayments.paymentId, paymentId)).limit(1);
  return rows[0] || null;
}

export async function updateCryptoPayment(id: number, data: Partial<InsertCryptoPayment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cryptoPayments).set(data).where(eq(cryptoPayments.id, id));
}

export async function createCreditUsageLog(data: InsertCreditUsageLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(creditUsageLogs).values(data).$returningId();
  return result;
}

export async function getUserCreditUsageLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditUsageLogs).where(eq(creditUsageLogs.userId, userId)).orderBy(desc(creditUsageLogs.createdAt)).limit(limit);
}

export async function getCreditUsageStats() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditUsageLogs).orderBy(desc(creditUsageLogs.createdAt));
}

export async function getCreditConsumptionTrend() {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select().from(creditUsageLogs).orderBy(creditUsageLogs.createdAt);
  const dailyMap = new Map<string, { total: number; byFeature: Record<string, number> }>();
  for (const log of logs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, { total: 0, byFeature: {} });
    const entry = dailyMap.get(day)!;
    entry.total += log.creditsUsed;
    entry.byFeature[log.feature] = (entry.byFeature[log.feature] || 0) + log.creditsUsed;
  }
  return Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAdminCreditSalesStats(period: "day" | "week" | "month") {
  const db = await getDb(); if (!db) return [];
  const groupFormat = period === "day" ? "%Y-%m-%d" : period === "week" ? "%Y-%u" : "%Y-%m";
  const rows = await db.execute(sql`
    SELECT DATE_FORMAT(createdAt, ${groupFormat}) as period, 
           SUM(amount) as totalAmount, 
           COUNT(*) as txCount
    FROM credit_transactions 
    WHERE type = 'purchase'
    GROUP BY period 
    ORDER BY period DESC 
    LIMIT 30
  `);
  return (rows as any)[0] || [];
}

export async function getCreatorProfile(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId));
  return rows[0] || null;
}

export async function upsertCreatorProfile(userId: number, data: Partial<InsertCreatorProfile>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await getCreatorProfile(userId);
  if (existing) {
    await db.update(creatorProfiles).set(data).where(eq(creatorProfiles.userId, userId));
    return { ...existing, ...data };
  } else {
    const [result] = await db.insert(creatorProfiles).values({ userId, displayName: data.displayName || "Creator", ...data }).$returningId();
    return { id: result.id, userId, ...data };
  }
}

export async function createMarketplaceListing(data: InsertMarketplaceListing) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplaceListings).values(data).$returningId();
  return result;
}

export async function getMarketplaceListings(filters?: { category?: string; status?: string; search?: string; sellerId?: number; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const conditions = [eq(marketplaceListings.status, "active")];
  if (filters?.category && filters.category !== "all") {
    conditions.push(eq(marketplaceListings.category, filters.category as any));
  }
  if (filters?.sellerId) {
    conditions.push(eq(marketplaceListings.sellerId, filters.sellerId));
  }
  if (filters?.search) {
    conditions.push(like(marketplaceListings.title, `%${filters.search}%`));
  }
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  return db.select().from(marketplaceListings).where(and(...conditions)).orderBy(desc(marketplaceListings.createdAt)).limit(limit).offset(offset);
}

export async function getMarketplaceListingById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
  return rows[0] || null;
}

export async function updateMarketplaceListing(id: number, data: Partial<InsertMarketplaceListing>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(marketplaceListings).set(data).where(eq(marketplaceListings.id, id));
}

export async function createMarketplacePurchase(data: InsertMarketplacePurchase) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplacePurchases).values(data).$returningId();
  return result;
}

export async function createMarketplaceReview(data: InsertMarketplaceReview) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(marketplaceReviews).values(data).$returningId();
  // Update listing avg rating
  const reviews = await db.select({ avg: sql<number>`AVG(${marketplaceReviews.rating})`, count: sql<number>`COUNT(*)` }).from(marketplaceReviews).where(eq(marketplaceReviews.listingId, data.listingId));
  if (reviews[0]) {
    await db.update(marketplaceListings).set({ avgRating: Math.round((reviews[0].avg || 0) * 100), reviewCount: reviews[0].count }).where(eq(marketplaceListings.id, data.listingId));
  }
  return result;
}

export async function getCreatorPayouts(creatorId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(creatorPayouts).where(eq(creatorPayouts.creatorId, creatorId)).orderBy(desc(creatorPayouts.requestedAt));
}

export async function createPayout(data: InsertCreatorPayout) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(creatorPayouts).values(data).$returningId();
  return result;
}

export async function updatePayoutStatus(id: number, status: "pending" | "processing" | "completed" | "failed" | "cancelled", extra?: { stripeTransferId?: string; failureReason?: string; processedAt?: Date; completedAt?: Date }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(creatorPayouts).set({ status, ...extra }).where(eq(creatorPayouts.id, id));
}

export async function getPayoutById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorPayouts).where(eq(creatorPayouts.id, id));
  return rows[0];
}

export async function getPendingPayoutTotal(creatorId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ total: sql<number>`COALESCE(SUM(${creatorPayouts.netPayoutInCents}), 0)` }).from(creatorPayouts).where(and(eq(creatorPayouts.creatorId, creatorId), or(eq(creatorPayouts.status, "pending"), eq(creatorPayouts.status, "processing"))));
  return rows[0]?.total || 0;
}

export async function updateCreatorConnectAccount(creatorId: number, accountId: string, status: "not_started" | "pending" | "active" | "restricted") {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(creatorProfiles).set({ stripeConnectAccountId: accountId, stripeConnectStatus: status }).where(eq(creatorProfiles.id, creatorId));
}

export async function getCreatorProfileByUserId(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, userId));
  return rows[0];
}
