import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// User profile — one per user
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  displayName: varchar("displayName", { length: 128 }),
  jobTitle: varchar("jobTitle", { length: 128 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// A link collection — each user has exactly ONE (auto-created on first login)
// Keeping the table for analytics foreign keys, but UX hides "collections" entirely
export const linkCollections = mysqlTable("link_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  isDefault: boolean("isDefault").default(true).notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LinkCollection = typeof linkCollections.$inferSelect;
export type InsertLinkCollection = typeof linkCollections.$inferInsert;

// Individual links — belong to a user's collection
export const links = mysqlTable("links", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  // icon: either a preset icon type (brand, linkedin, x, etc.) or "custom"
  iconType: varchar("iconType", { length: 32 }).default("link").notNull(),
  // presetId: links back to PRESET_LINKS[].id — null for custom links
  presetId: varchar("presetId", { length: 64 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;

// ─── Company / Business Profile ─────────────────────────────────────────────
// A company profile is a standalone public page (e.g. /c/company) managed by admins.
// It is NOT tied to any individual user account.
export const companyProfiles = mysqlTable("company_profiles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 256 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = typeof companyProfiles.$inferInsert;

// Company links — belong to a company profile, grouped by category
// category: 'main' | 'partner' | 'product'
export const companyLinks = mysqlTable("company_links", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  category: mysqlEnum("category", ["main", "partner", "product"]).notNull().default("main"),
  title: varchar("title", { length: 128 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  iconType: varchar("iconType", { length: 32 }).default("link").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyLink = typeof companyLinks.$inferSelect;
export type InsertCompanyLink = typeof companyLinks.$inferInsert;

// Company team members — users shown on the company profile page
export const companyTeamMembers = mysqlTable("company_team_members", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CompanyTeamMember = typeof companyTeamMembers.$inferSelect;
export type InsertCompanyTeamMember = typeof companyTeamMembers.$inferInsert;

// Email aliases — multiple emails that map to the same user account
export const userEmailAliases = mysqlTable("user_email_aliases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserEmailAlias = typeof userEmailAliases.$inferSelect;
export type InsertUserEmailAlias = typeof userEmailAliases.$inferInsert;

// Magic link tokens — one-time login tokens sent via email
export const magicLinkTokens = mysqlTable("magic_link_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

// Analytics events
export const analyticsEvents = mysqlTable("analytics_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", ["page_view", "link_click"]).notNull(),
  collectionId: int("collectionId").notNull(),
  linkId: int("linkId"),
  referrer: text("referrer"),
  userAgent: text("userAgent"),
  ip: varchar("ip", { length: 64 }),
  country: varchar("country", { length: 64 }),
  city: varchar("city", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
