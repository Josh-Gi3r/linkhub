import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  analyticsEvents,
  companyLinks,
  companyProfiles,
  companyTeamMembers,
  linkCollections,
  links,
  profiles,
  userEmailAliases,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ─── Users ────────────────────────────────────────────────────────────────────

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
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const alias = await db.select().from(userEmailAliases).where(eq(userEmailAliases.email, email.toLowerCase())).limit(1);
  if (alias.length > 0) {
    const user = await db.select().from(users).where(eq(users.id, alias[0].userId)).limit(1);
    return user.length > 0 ? user[0] : undefined;
  }
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProfileBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertProfile(
  userId: number,
  data: { slug?: string; displayName?: string; jobTitle?: string; bio?: string; avatarUrl?: string }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getProfileByUserId(userId);
  if (existing) {
    await db.update(profiles).set(data).where(eq(profiles.userId, userId));
  } else {
    const slug = data.slug ?? `user${userId}`;
    await db.insert(profiles).values({ userId, slug, ...data });
  }
  return getProfileByUserId(userId);
}

// ─── Link Collections ─────────────────────────────────────────────────────────

export async function getCollectionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(linkCollections).where(eq(linkCollections.userId, userId)).orderBy(linkCollections.createdAt);
}

export async function getCollectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(linkCollections).where(eq(linkCollections.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCollection(data: {
  userId: number; title: string; slug: string; description?: string; isDefault?: boolean; isPublic?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(linkCollections).values({
    userId: data.userId, title: data.title, slug: data.slug,
    description: data.description, isDefault: data.isDefault ?? true, isPublic: data.isPublic ?? true,
  });
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  if (!insertId) return undefined;
  return getCollectionById(insertId);
}

// ─── Links ────────────────────────────────────────────────────────────────────

export async function getLinksByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(links).where(and(eq(links.collectionId, collectionId), eq(links.isActive, true))).orderBy(links.sortOrder, links.createdAt);
}

export async function getAllLinksByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(links).where(eq(links.collectionId, collectionId)).orderBy(links.sortOrder, links.createdAt);
}

export async function getLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLink(data: {
  collectionId: number; userId: number; title: string; url: string;
  description?: string; iconType?: string; presetId?: string; sortOrder?: number; isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(links).values({
    collectionId: data.collectionId, userId: data.userId,
    title: data.title, url: data.url, description: data.description,
    iconType: data.iconType ?? "link", presetId: data.presetId,
    sortOrder: data.sortOrder ?? 0, isActive: data.isActive ?? true,
  });
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  if (!insertId) return undefined;
  return getLinkById(insertId);
}

export async function updateLink(
  id: number,
  data: Partial<{ title: string; url: string; description: string; isActive: boolean; sortOrder: number; iconType: string }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(links).set(data).where(eq(links.id, id));
}

export async function deleteLink(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(links).where(eq(links.id, id));
}

export async function reorderLinks(orderedIds: number[]) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(orderedIds.map((id, index) =>
    db.update(links).set({ sortOrder: index }).where(eq(links.id, id))
  ));
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function recordEvent(data: {
  eventType: "page_view" | "link_click"; collectionId: number; linkId?: number;
  referrer?: string; userAgent?: string; ip?: string; country?: string; city?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(analyticsEvents).values(data);
}

export async function getCollectionStats(collectionId: number) {
  const db = await getDb();
  if (!db) return { totalViews: 0, totalClicks: 0 };
  const [views, clicks] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(and(eq(analyticsEvents.collectionId, collectionId), eq(analyticsEvents.eventType, "page_view"))),
    db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(and(eq(analyticsEvents.collectionId, collectionId), eq(analyticsEvents.eventType, "link_click"))),
  ]);
  return { totalViews: Number(views[0]?.count ?? 0), totalClicks: Number(clicks[0]?.count ?? 0) };
}

export async function getLinkClickCounts(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ linkId: analyticsEvents.linkId, count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.collectionId, collectionId), eq(analyticsEvents.eventType, "link_click")))
    .groupBy(analyticsEvents.linkId);
  return result.map((r) => ({ linkId: r.linkId, count: Number(r.count) }));
}

export async function updateCollection(id: number, data: Partial<{ title: string; isPublic: boolean; slug: string; isDefault: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(linkCollections).set(data).where(eq(linkCollections.id, id));
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(links).where(eq(links.collectionId, id));
  await db.delete(linkCollections).where(eq(linkCollections.id, id));
}

export async function getAllCollections() {
  const db = await getDb();
  if (!db) return [];
  const cols = await db
    .select({ id: linkCollections.id, userId: linkCollections.userId, title: linkCollections.title, slug: linkCollections.slug, isPublic: linkCollections.isPublic, createdAt: linkCollections.createdAt })
    .from(linkCollections)
    .orderBy(desc(linkCollections.createdAt));
  return Promise.all(cols.map(async (c) => ({ ...c, ...(await getCollectionStats(c.id)) })));
}

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalCollections: 0, totalLinks: 0, totalViews: 0, totalClicks: 0 };
  const [userCount, colCount, linkCount, viewCount, clickCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(linkCollections),
    db.select({ count: sql<number>`count(*)` }).from(links).where(eq(links.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(eq(analyticsEvents.eventType, "page_view")),
    db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(eq(analyticsEvents.eventType, "link_click")),
  ]);
  return {
    totalUsers: Number(userCount[0]?.count ?? 0), totalCollections: Number(colCount[0]?.count ?? 0),
    totalLinks: Number(linkCount[0]?.count ?? 0), totalViews: Number(viewCount[0]?.count ?? 0),
    totalClicks: Number(clickCount[0]?.count ?? 0),
  };
}

/**
 * Daily view/click counts for the last `days` days.
 * SECURITY: uses Drizzle's sql tagged template — all params are bound values, not interpolated strings.
 */
export async function getDailyStats(collectionId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = (await db.execute(sql`
    SELECT DATE(createdAt) AS date, eventType, count(*) AS count
    FROM analytics_events
    WHERE collectionId = ${collectionId} AND createdAt >= ${since}
    GROUP BY DATE(createdAt), eventType
    ORDER BY DATE(createdAt)
  `)) as unknown as Array<{ date: string; eventType: string; count: number }>;
  return rows.map((r) => ({ date: r.date, eventType: r.eventType as "page_view" | "link_click", count: Number(r.count) }));
}

export async function getLocationStats(collectionId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = (await db.execute(sql`
    SELECT country, city, count(*) AS count
    FROM analytics_events
    WHERE collectionId = ${collectionId}
      AND country IS NOT NULL AND country != ''
      AND createdAt >= ${since}
    GROUP BY country, city
    ORDER BY count DESC
    LIMIT 20
  `)) as unknown as Array<{ country: string; city: string; count: number }>;
  return rows.map((r) => ({ country: r.country, city: r.city, count: Number(r.count) }));
}

export async function getReferrerStats(collectionId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = (await db.execute(sql`
    SELECT referrer, count(*) AS count
    FROM analytics_events
    WHERE collectionId = ${collectionId}
      AND referrer IS NOT NULL AND referrer != ''
      AND createdAt >= ${since}
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 20
  `)) as unknown as Array<{ referrer: string; count: number }>;
  return rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) }));
}

export async function getPublicProfileData(profileSlug: string): Promise<{
  collectionId: number;
  profile: { displayName: string | null; bio: string | null; avatarUrl: string | null; jobTitle: string | null; slug: string };
  links: { id: number; title: string; url: string; description: string | null; iconType: string | null; isActive: boolean; sortOrder: number }[];
} | null> {
  const db = await getDb();
  if (!db) return null;
  const profile = await getProfileBySlug(profileSlug);
  if (!profile) return null;
  const cols = await db.select().from(linkCollections)
    .where(and(eq(linkCollections.userId, profile.userId), eq(linkCollections.isPublic, true)))
    .orderBy(linkCollections.createdAt);
  if (cols.length === 0) return null;
  const allLinks = (await Promise.all(cols.map((c) => getLinksByCollectionId(c.id))))
    .flat().sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    collectionId: cols[0].id,
    profile: {
      displayName: profile.displayName ?? null, bio: profile.bio ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      jobTitle: (profile as { jobTitle?: string | null }).jobTitle ?? null,
      slug: profile.slug,
    },
    links: allLinks.map((l) => ({
      id: l.id, title: l.title, url: l.url, description: l.description ?? null,
      iconType: l.iconType ?? null, isActive: l.isActive, sortOrder: l.sortOrder,
    })),
  };
}

// ─── Company Profile ──────────────────────────────────────────────────────────

export async function getCompanyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyProfiles).where(eq(companyProfiles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyProfiles).where(eq(companyProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCompanyProfile(data: {
  slug: string; displayName: string; tagline?: string; bio?: string; avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getCompanyBySlug(data.slug);
  if (existing) {
    await db.update(companyProfiles).set(data).where(eq(companyProfiles.slug, data.slug));
  } else {
    await db.insert(companyProfiles).values(data);
  }
  return getCompanyBySlug(data.slug);
}

// ─── Company Links ────────────────────────────────────────────────────────────

export async function getCompanyLinks(companyId: number, category?: "main" | "partner" | "product") {
  const db = await getDb();
  if (!db) return [];
  const conditions = category
    ? and(eq(companyLinks.companyId, companyId), eq(companyLinks.category, category))
    : eq(companyLinks.companyId, companyId);
  return db.select().from(companyLinks).where(conditions).orderBy(companyLinks.sortOrder, companyLinks.createdAt);
}

export async function getActiveCompanyLinks(companyId: number, category?: "main" | "partner" | "product") {
  const db = await getDb();
  if (!db) return [];
  const conditions = category
    ? and(eq(companyLinks.companyId, companyId), eq(companyLinks.category, category), eq(companyLinks.isActive, true))
    : and(eq(companyLinks.companyId, companyId), eq(companyLinks.isActive, true));
  return db.select().from(companyLinks).where(conditions).orderBy(companyLinks.sortOrder, companyLinks.createdAt);
}

export async function getCompanyLinkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyLinks).where(eq(companyLinks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompanyLink(data: {
  companyId: number; category: "main" | "partner" | "product"; title: string; url: string;
  description?: string; iconType?: string; sortOrder?: number; isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(companyLinks).values({
    companyId: data.companyId, category: data.category, title: data.title, url: data.url,
    description: data.description, iconType: data.iconType ?? "link",
    sortOrder: data.sortOrder ?? 0, isActive: data.isActive ?? true,
  });
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  if (!insertId) return undefined;
  return getCompanyLinkById(insertId);
}

export async function updateCompanyLink(
  id: number,
  data: Partial<{ title: string; url: string; description: string; isActive: boolean; sortOrder: number; iconType: string }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(companyLinks).set(data).where(eq(companyLinks.id, id));
}

export async function deleteCompanyLink(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(companyLinks).where(eq(companyLinks.id, id));
}

export async function reorderCompanyLinks(orderedIds: number[]) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(orderedIds.map((id, index) =>
    db.update(companyLinks).set({ sortOrder: index }).where(eq(companyLinks.id, id))
  ));
}

// ─── Company Team Members ─────────────────────────────────────────────────────

export async function getCompanyTeamMembers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: companyTeamMembers.id, companyId: companyTeamMembers.companyId, userId: companyTeamMembers.userId,
      sortOrder: companyTeamMembers.sortOrder, isVisible: companyTeamMembers.isVisible,
      displayName: profiles.displayName, jobTitle: profiles.jobTitle, avatarUrl: profiles.avatarUrl, slug: profiles.slug,
    })
    .from(companyTeamMembers)
    .leftJoin(profiles, eq(companyTeamMembers.userId, profiles.userId))
    .where(eq(companyTeamMembers.companyId, companyId))
    .orderBy(companyTeamMembers.sortOrder, companyTeamMembers.createdAt);
}

export async function addCompanyTeamMember(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(companyTeamMembers)
    .where(and(eq(companyTeamMembers.companyId, companyId), eq(companyTeamMembers.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0];
  const members = await db.select().from(companyTeamMembers).where(eq(companyTeamMembers.companyId, companyId));
  const maxOrder = members.reduce((max, m) => Math.max(max, m.sortOrder), -1);
  const result = await db.insert(companyTeamMembers).values({ companyId, userId, sortOrder: maxOrder + 1, isVisible: true });
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  if (!insertId) return undefined;
  const rows = await db.select().from(companyTeamMembers).where(eq(companyTeamMembers.id, insertId)).limit(1);
  return rows[0];
}

export async function removeCompanyTeamMember(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(companyTeamMembers).where(
    and(eq(companyTeamMembers.companyId, companyId), eq(companyTeamMembers.userId, userId))
  );
}

export async function updateCompanyTeamMember(id: number, data: Partial<{ sortOrder: number; isVisible: boolean }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(companyTeamMembers).set(data).where(eq(companyTeamMembers.id, id));
}

export async function reorderCompanyTeamMembers(orderedIds: number[]) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(orderedIds.map((id, index) =>
    db.update(companyTeamMembers).set({ sortOrder: index }).where(eq(companyTeamMembers.id, id))
  ));
}

// ─── User deletion ────────────────────────────────────────────────────────────

export async function deleteUserAndAllData(userId: number) {
  const db = await getDb();
  if (!db) return;
  const cols = await db.select({ id: linkCollections.id }).from(linkCollections).where(eq(linkCollections.userId, userId));
  for (const col of cols) {
    await db.delete(analyticsEvents).where(eq(analyticsEvents.collectionId, col.id));
    await db.delete(links).where(eq(links.collectionId, col.id));
  }
  await db.delete(linkCollections).where(eq(linkCollections.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.delete(companyTeamMembers).where(eq(companyTeamMembers.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateCompanyAvatarUrl(companyId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(companyProfiles).set({ avatarUrl }).where(eq(companyProfiles.id, companyId));
}
