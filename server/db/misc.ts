import { InsertAiContextTemplate, InsertSampleFace, InsertSampleVoice, Lecture, aiContextTemplates, and, asc, broadcastViewers, contentAnalyses, desc, eq, getDb, gte, learningProgress, lectureProjects, lectureSessions, lectures, like, marketplaceListings, marketplacePurchases, marketplaceReviews, or, payments, projectCollaborators, sampleFaces, sampleVoices, sql, subscriptionPlans, translationSegments, userLearningHistory, userSubscriptions, users, whiteboardParticipants } from "./shared";
import { getOrCreateLearningProgress } from "./learning";



export async function incrementQuestionCount(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return;
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress).set({ questionsAsked: sql`${learningProgress.questionsAsked} + 1`, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function incrementAnswerCount(userId: number, lectureId: number) {
  const db = await getDb(); if (!db) return;
  await getOrCreateLearningProgress(userId, lectureId);
  await db.update(learningProgress).set({ answersReceived: sql`${learningProgress.answersReceived} + 1`, lastActivityAt: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.lectureId, lectureId)));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb(); if (!db) return;
  await db.update(aiContextTemplates).set({ usageCount: sql`${aiContextTemplates.usageCount} + 1` }).where(eq(aiContextTemplates.id, id));
}

export async function seedBuiltInTemplates() {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(aiContextTemplates).where(eq(aiContextTemplates.isBuiltIn, true)).limit(1);
  if (existing.length > 0) return;
  const templates: InsertAiContextTemplate[] = [
    { category: "web3", name: "Web3 Fundamentals", description: "Introduction to Web3 basics: decentralization, blockchain fundamentals", systemPrompt: "You are a Web3 expert instructor. Explain blockchain, decentralization, smart contracts, wallet usage and other Web3 basics clearly and kindly.", topics: "Blockchain basics, Decentralization, Smart contracts, Wallets, dApp", difficulty: "beginner", isBuiltIn: true },
    { category: "web3", name: "Web3 Developer Course", description: "Hands-on Web3 development with Solidity, Hardhat, Ethers.js", systemPrompt: "You are a Web3 development instructor. Teach Solidity smart contract development, Hardhat framework, and Ethers.js usage.", topics: "Solidity, Hardhat, Ethers.js, Smart contract security", difficulty: "intermediate", isBuiltIn: true },
    { category: "defi", name: "Understanding DeFi Protocols", description: "Analysis of core DeFi protocols and mechanisms", systemPrompt: "You are a DeFi analyst and instructor. Explain AMM, liquidity pools, yield farming, flash loans and other core DeFi mechanisms.", topics: "AMM, Liquidity pools, Yield farming, Flash loans, Oracles", difficulty: "intermediate", isBuiltIn: true },
    { category: "nft", name: "NFT Creator Guide", description: "Guide to NFT creation, minting, and marketplace usage", systemPrompt: "You are an NFT expert instructor. Teach the technical principles of NFTs, digital art creation, minting, and marketplace usage.", topics: "ERC-721, ERC-1155, IPFS, Minting, Marketplaces", difficulty: "beginner", isBuiltIn: true },
    { category: "blockchain", name: "Advanced Blockchain Architecture", description: "Deep dive into consensus algorithms, Layer 2, cross-chain technology", systemPrompt: "You are a blockchain architecture expert. Cover consensus algorithms, Layer 2 solutions, cross-chain bridges and more.", topics: "Consensus algorithms, Layer 2, Cross-chain, Sharding", difficulty: "advanced", isBuiltIn: true },
    { category: "ai", name: "AI Basics & ChatGPT", description: "AI/ML fundamentals, ChatGPT, and prompt engineering", systemPrompt: "You are an AI education instructor. Teach AI/ML basics, LLMs, and prompt engineering.", topics: "AI/ML basics, LLM, Prompt engineering, ChatGPT", difficulty: "beginner", isBuiltIn: true },
    { category: "ai", name: "AI Development in Practice", description: "AI development with Python, TensorFlow, LangChain", systemPrompt: "You are an AI development instructor. Teach Python-based AI development, LangChain, and RAG system building.", topics: "Python, TensorFlow, LangChain, RAG, Fine-tuning", difficulty: "advanced", isBuiltIn: true },
    { category: "metaverse", name: "Metaverse Ecosystem", description: "Metaverse platforms, virtual economy, digital twins", systemPrompt: "You are a metaverse expert instructor. Cover metaverse platforms, virtual economies, and XR technology.", topics: "Metaverse platforms, Virtual economy, Digital twins, XR", difficulty: "beginner", isBuiltIn: true },
    { category: "general", name: "General Technology Lecture", description: "General-purpose template covering various tech topics", systemPrompt: "You are a professional technology instructor. Answer students' questions accurately and in an easy-to-understand manner.", topics: "Programming, Web development, Databases, Cloud", difficulty: "beginner", isBuiltIn: true },
  ];
  for (const template of templates) await db.insert(aiContextTemplates).values(template);
}

export async function getActiveSessions(instructorId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ session: lectureSessions, lecture: lectures })
    .from(lectureSessions).innerJoin(lectures, eq(lectureSessions.lectureId, lectures.id))
    .where(and(eq(lectureSessions.instructorId, instructorId), eq(lectureSessions.status, 'live' as any)))
    .orderBy(desc(lectureSessions.startedAt));
}

export async function getContentAnalyses(scriptId: number, userId: number) {
  const db = await getDb();
  return db!.select().from(contentAnalyses)
    .where(and(eq(contentAnalyses.scriptId, scriptId), eq(contentAnalyses.userId, userId)))
    .orderBy(desc(contentAnalyses.createdAt));
}

export async function heartbeatViewer(broadcastId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(broadcastViewers).set({ lastHeartbeat: new Date() })
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.userId, userId)));
}

export async function getActiveViewers(broadcastId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(broadcastViewers)
    .where(and(eq(broadcastViewers.broadcastId, broadcastId), eq(broadcastViewers.isActive, true)))
    .orderBy(desc(broadcastViewers.joinedAt));
}

export async function listSampleFaces(filters?: { category?: string; gender?: string; isPremium?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(sampleFaces).where(eq(sampleFaces.isActive, true));
  const rows = await query.orderBy(sampleFaces.sortOrder);
  let result = rows;
  if (filters?.category) result = result.filter(r => r.category === filters.category);
  if (filters?.gender) result = result.filter(r => r.gender === filters.gender);
  if (filters?.isPremium !== undefined) result = result.filter(r => r.isPremium === filters.isPremium);
  return result;
}

export async function getSampleFace(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sampleFaces).where(eq(sampleFaces.id, id)).limit(1);
  return rows[0] || null;
}

export async function createSampleFace(data: InsertSampleFace) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sampleFaces).values(data);
  return { id: result[0].insertId };
}

export async function updateSampleFace(id: number, data: Partial<InsertSampleFace>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleFaces).set(data).where(eq(sampleFaces.id, id));
}

export async function deleteSampleFace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleFaces).set({ isActive: false }).where(eq(sampleFaces.id, id));
}

export async function listSampleVoices(filters?: { language?: string; gender?: string; tone?: string; isPremium?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(sampleVoices).where(eq(sampleVoices.isActive, true));
  const rows = await query.orderBy(sampleVoices.sortOrder);
  let result = rows;
  if (filters?.language) result = result.filter(r => r.language === filters.language);
  if (filters?.gender) result = result.filter(r => r.gender === filters.gender);
  if (filters?.tone) result = result.filter(r => r.tone === filters.tone);
  if (filters?.isPremium !== undefined) result = result.filter(r => r.isPremium === filters.isPremium);
  return result;
}

export async function getSampleVoice(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sampleVoices).where(eq(sampleVoices.id, id)).limit(1);
  return rows[0] || null;
}

export async function createSampleVoice(data: InsertSampleVoice) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sampleVoices).values(data);
  return { id: result[0].insertId };
}

export async function updateSampleVoice(id: number, data: Partial<InsertSampleVoice>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleVoices).set(data).where(eq(sampleVoices.id, id));
}

export async function deleteSampleVoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sampleVoices).set({ isActive: false }).where(eq(sampleVoices.id, id));
}

export async function getMonthlyRevenue() {
  const db = await getDb();
  if (!db) return [];
  const completedPayments = await db.select().from(payments).where(eq(payments.status, "completed"));
  // Group by month
  const monthlyMap = new Map<string, number>();
  for (const p of completedPayments) {
    const month = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amountCents);
  }
  return Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amountCents: amount })).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getPlanDistribution() {
  const db = await getDb();
  if (!db) return [];
  const subs = await db.select().from(userSubscriptions).where(eq(userSubscriptions.status, "active"));
  const plans = await db.select().from(subscriptionPlans);
  const planMap = new Map(plans.map(p => [p.id, p.name]));
  const distribution = new Map<string, number>();
  for (const sub of subs) {
    const planName = planMap.get(sub.planId) || "Unknown";
    distribution.set(planName, (distribution.get(planName) || 0) + 1);
  }
  return Array.from(distribution.entries()).map(([name, count]) => ({ name, count }));
}

export async function listAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getSessionParticipants(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whiteboardParticipants)
    .where(and(eq(whiteboardParticipants.sessionId, sessionId), eq(whiteboardParticipants.isOnline, true)));
}

export async function updateParticipantStatus(id: number, isOnline: boolean) {
  const db = await getDb();
  if (!db) return;
  const data: any = { isOnline };
  if (!isOnline) data.leftAt = new Date();
  await db.update(whiteboardParticipants).set(data).where(eq(whiteboardParticipants.id, id));
}

export async function getAdminToolUsageStats() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.execute(sql`
    SELECT tool, COUNT(*) as useCount, SUM(creditsUsed) as totalCredits
    FROM ai_generations
    GROUP BY tool
    ORDER BY useCount DESC
  `);
  return (rows as any)[0] || [];
}

export async function getAdminUserStats() {
  const db = await getDb(); if (!db) return { totalUsers: 0, dau: 0, wau: 0, mau: 0, newToday: 0 };
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const todayActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE DATE(createdAt) = CURDATE()
  `);
  const weekActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `);
  const monthActive = await db.execute(sql`
    SELECT COUNT(DISTINCT userId) as cnt FROM ai_generations WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);
  const newToday = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM users WHERE DATE(createdAt) = CURDATE()
  `);
  return {
    totalUsers: totalUsers?.count ?? 0,
    dau: (todayActive as any)?.[0]?.[0]?.cnt ?? 0,
    wau: (weekActive as any)?.[0]?.[0]?.cnt ?? 0,
    mau: (monthActive as any)?.[0]?.[0]?.cnt ?? 0,
    newToday: (newToday as any)?.[0]?.[0]?.cnt ?? 0,
  };
}

export async function getUserSignupStats(days: number) {
  const db = await getDb(); if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    date: sql<string>`DATE(createdAt)`,
    count: sql<number>`COUNT(*)`,
  }).from(users).where(gte(users.createdAt, since)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);
  return rows;
}

export async function getUserTotalStats() {
  const db = await getDb(); if (!db) return { total: 0, instructors: 0, students: 0, admins: 0 };
  const total = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const instructors = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.platformRole, "instructor"));
  const students = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.platformRole, "student"));
  const admins = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.role, "admin"));
  return {
    total: total[0]?.count || 0,
    instructors: instructors[0]?.count || 0,
    students: students[0]?.count || 0,
    admins: admins[0]?.count || 0,
  };
}

export async function getMyListings(sellerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.sellerId, sellerId)).orderBy(desc(marketplaceListings.createdAt));
}

export async function incrementListingViewCount(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(marketplaceListings).set({ viewCount: sql`${marketplaceListings.viewCount} + 1` }).where(eq(marketplaceListings.id, id));
}

export async function getMyPurchases(buyerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplacePurchases).where(eq(marketplacePurchases.buyerId, buyerId)).orderBy(desc(marketplacePurchases.createdAt));
}

export async function getPurchaseById(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplacePurchases).where(eq(marketplacePurchases.id, id));
  return rows[0] || null;
}

export async function hasPurchased(buyerId: number, listingId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(marketplacePurchases).where(and(eq(marketplacePurchases.buyerId, buyerId), eq(marketplacePurchases.listingId, listingId), eq(marketplacePurchases.status, "completed")));
  return rows.length > 0;
}

export async function getSellerEarnings(sellerId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ total: sql<number>`COALESCE(SUM(${marketplacePurchases.sellerPayoutInCents}), 0)`, count: sql<number>`COUNT(*)` }).from(marketplacePurchases).where(and(eq(marketplacePurchases.sellerId, sellerId), eq(marketplacePurchases.status, "completed")));
  return rows[0] || { total: 0, count: 0 };
}

export async function getListingReviews(listingId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceReviews).where(eq(marketplaceReviews.listingId, listingId)).orderBy(desc(marketplaceReviews.createdAt));
}

export async function getUserCompletedListings(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(userLearningHistory).where(and(eq(userLearningHistory.userId, userId), eq(userLearningHistory.isCompleted, true)));
}

export async function getPopularListings(limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.status, "active")).orderBy(desc(marketplaceListings.totalPurchases)).limit(limit);
}

export async function getRecentListings(limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(eq(marketplaceListings.status, "active")).orderBy(desc(marketplaceListings.createdAt)).limit(limit);
}

export async function getListingsByCategory(category: string, limit = 10) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.select().from(marketplaceListings).where(and(eq(marketplaceListings.status, "active"), eq(marketplaceListings.category, category as any))).orderBy(desc(marketplaceListings.totalPurchases)).limit(limit);
}

export async function getSessionSegments(sessionId: number, targetLang?: string, limit = 100) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const conditions = [eq(translationSegments.sessionId, sessionId)];
  if (targetLang) conditions.push(eq(translationSegments.targetLanguage, targetLang));
  return db.select().from(translationSegments).where(and(...conditions)).orderBy(translationSegments.createdAt).limit(limit);
}

export async function getSessionSegmentCount(sessionId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select({ count: sql<number>`count(*)` }).from(translationSegments).where(eq(translationSegments.sessionId, sessionId));
  return rows[0]?.count ?? 0;
}

export async function getMyCollaborations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    role: projectCollaborators.role,
    inviteStatus: projectCollaborators.inviteStatus,
    projectTitle: lectureProjects.title,
    createdAt: projectCollaborators.createdAt,
  }).from(projectCollaborators)
    .leftJoin(lectureProjects, eq(projectCollaborators.projectId, lectureProjects.id))
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.inviteStatus, "accepted")))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function getPendingInvitations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    id: projectCollaborators.id,
    projectId: projectCollaborators.projectId,
    role: projectCollaborators.role,
    inviteEmail: projectCollaborators.inviteEmail,
    projectTitle: lectureProjects.title,
    inviterName: users.name,
    createdAt: projectCollaborators.createdAt,
  }).from(projectCollaborators)
    .leftJoin(lectureProjects, eq(projectCollaborators.projectId, lectureProjects.id))
    .leftJoin(users, eq(projectCollaborators.invitedBy, users.id))
    .where(and(eq(projectCollaborators.userId, userId), eq(projectCollaborators.inviteStatus, "pending")))
    .orderBy(desc(projectCollaborators.createdAt));
}

export async function findUserByEmail(email: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}
