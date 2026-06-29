import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { PRESET_LINKS } from "../shared/presetLinks";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { generateApplePass, generateGoogleWalletJwt } from "./walletPass";
import { nanoid } from "nanoid";
import { extractIp, geoLookup } from "./geo";
import {
  upsertUser,
  getUserByOpenId,
  getProfileByUserId,
  getProfileBySlug,
  upsertProfile,
  getPublicProfileData,
  getCollectionsByUserId,
  createCollection,
  getCollectionById,
  getLinksByCollectionId,
  getAllLinksByCollectionId,
  createLink,
  getLinkById,
  updateLink,
  deleteLink,
  reorderLinks,
  recordEvent,
  getCollectionStats,
  getLinkClickCounts,
  getDailyStats,
  getLocationStats,
  getReferrerStats,
  getAllUsers,
  updateUserRole,
  getPlatformStats,
  getAllCollections,
  updateCollection,
  deleteCollection,
  getCompanyBySlug,
  getCompanyById,
  upsertCompanyProfile,
  updateCompanyAvatarUrl,
  getCompanyLinks,
  getActiveCompanyLinks,
  getCompanyLinkById,
  createCompanyLink,
  updateCompanyLink,
  deleteCompanyLink,
  reorderCompanyLinks,
  getCompanyTeamMembers,
  addCompanyTeamMember,
  removeCompanyTeamMember,
  updateCompanyTeamMember,
  reorderCompanyTeamMembers,
  deleteUserAndAllData,
} from "./db";

// - Helpers -

import { ENV } from "./_core/env";

/** Returns true if this email is allowed to get preset links seeded (domain restriction). */
function isUserEmailAllowed(email: string | null | undefined): boolean {
  const domain = ENV.allowedEmailDomain.trim().toLowerCase();
  if (!domain) return true; // no restriction
  return (email ?? "").toLowerCase().endsWith(`@${domain}`);
}


/** Ensure a user has exactly one default collection (their "page"). Creates it if missing.
 * If a default collection already exists, updates its slug to match the profile slug.
 * Returns { collection, isNew } so callers can seed links on first creation.
 */
async function ensureUserCollection(userId: number, slug: string) {
  const existing = await getCollectionsByUserId(userId);
  // Prefer an explicitly-flagged default; fall back to the oldest collection
  const defaultCol = existing.find((c) => c.isDefault) ?? existing[0];
  if (defaultCol) {
    // Keep the slug in sync with the profile slug so public URLs stay consistent
    if (defaultCol.slug !== slug) {
      await updateCollection(defaultCol.id, { slug, isDefault: true });
    }
    return { collection: { ...defaultCol, slug }, isNew: false };
  }
  // No collection at all — create the first one and seed it
  const collection = await createCollection({
    userId,
    title: "My Links",
    slug,
    isDefault: true,
    isPublic: true,
  });
  return { collection, isNew: true };
}

/** Seed preset company links and personal placeholder links into a brand-new collection. */
async function seedPresetLinks(collectionId: number, userId: number) {
  const companyLinks = PRESET_LINKS.filter((p) => p.isCompany && p.url);
  // Seed personal placeholder links (inactive) for LinkedIn, X, and Email only.
  const personalLinks = PRESET_LINKS.filter(
    (p) => p.isPersonal && ["linkedin", "x", "email"].includes(p.icon)
  );
  const allSeedLinks = [...companyLinks, ...personalLinks];
  for (let i = 0; i < allSeedLinks.length; i++) {
    const p = allSeedLinks[i];
    await createLink({
      collectionId,
      userId,
      title: p.title,
      url: p.url || "https://",
      description: p.description,
      iconType: p.icon,
      presetId: p.id,
      sortOrder: i,
      isActive: p.isCompany,
    });
  }
}

// URL validation — shared between user and admin link procedures
const urlSchema = z.string().min(1).max(2048).refine(
  (v) => /^(https?|mailto|tel|sms|whatsapp):/.test(v) || v.startsWith("https://"),
  { message: "Invalid URL" }
);

// ─── Company Router ──────────────────────────────────────────────────────────
const companyRouter = router({
  /** Public: get the full company profile page data (profile + all sections + team) */
  getPublic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const company = await getCompanyBySlug(input.slug);
      if (!company) return null;
      const [primaryLinks, partnerLinks, productLinks, teamMembers] = await Promise.all([
        getActiveCompanyLinks(company.id, "main"),
        getActiveCompanyLinks(company.id, "partner"),
        getActiveCompanyLinks(company.id, "product"),
        getCompanyTeamMembers(company.id),
      ]);
      return {
        company,
        primaryLinks,
        partnerLinks,
        productLinks,
        teamMembers: teamMembers.filter((m) => m.isVisible),
      };
    }),

  /** Admin: get full company data including hidden team members (for builder) */
  getForBuilder: adminProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const company = await getCompanyBySlug(input.slug);
      if (!company) return null;
      const [primaryLinks, partnerLinks, productLinks, teamMembers] = await Promise.all([
        getCompanyLinks(company.id, "main"),
        getCompanyLinks(company.id, "partner"),
        getCompanyLinks(company.id, "product"),
        getCompanyTeamMembers(company.id),
      ]);
      return { company, primaryLinks, partnerLinks, productLinks, teamMembers };
    }),

  /** Admin: save company profile (name, tagline, bio, avatar) */
  save: adminProcedure
    .input(z.object({
      slug: z.string().min(2).max(64),
      displayName: z.string().min(1).max(128),
      tagline: z.string().max(256).optional(),
      bio: z.string().max(1000).optional(),
      avatarUrl: z.string().url().optional().or(z.literal("")),
    }))
    .mutation(async ({ input }) => {
      const company = await upsertCompanyProfile(input);
      return company;
    }),

  /** Admin: upload company avatar */
  uploadAvatar: adminProcedure
    .input(z.object({ slug: z.string(), base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      const buf = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `company-avatars/${input.slug}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buf, input.mimeType);
      // Save the new avatar URL to the company profile
      const company = await getCompanyBySlug(input.slug);
      if (company) {
        await updateCompanyAvatarUrl(company.id, url);
      }
      return { url };
    }),

  // ── Company Links ──────────────────────────────────────────────────────────

  links: router({
    /** Admin: list all links for a company by category */
    list: adminProcedure
      .input(z.object({ slug: z.string(), category: z.enum(["main", "partner", "product"]).optional() }))
      .query(async ({ input }) => {
        const company = await getCompanyBySlug(input.slug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        return getCompanyLinks(company.id, input.category);
      }),

    /** Admin: create a link */
    create: adminProcedure
      .input(z.object({
        slug: z.string(),
        category: z.enum(["main", "partner", "product"]),
        title: z.string().min(1).max(128),
        url: z.string().url(),
        description: z.string().max(256).optional(),
        iconType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const company = await getCompanyBySlug(input.slug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        const existingLinks = await getCompanyLinks(company.id, input.category);
        const link = await createCompanyLink({
          companyId: company.id,
          category: input.category,
          title: input.title,
          url: input.url,
          description: input.description,
          iconType: input.iconType ?? "link",
          sortOrder: existingLinks.length,
        });
        return link;
      }),

    /** Admin: update a link */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(128).optional(),
        url: z.string().url().optional(),
        description: z.string().max(256).optional(),
        iconType: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const link = await getCompanyLinkById(id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        await updateCompanyLink(id, data);
        return { success: true };
      }),

    /** Admin: delete a link */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const link = await getCompanyLinkById(input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        await deleteCompanyLink(input.id);
        return { success: true };
      }),

    /** Admin: reorder links within a category */
    reorder: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await reorderCompanyLinks(input.orderedIds);
        return { success: true };
      }),
  }),

  // ── Company Team Members ───────────────────────────────────────────────────

  team: router({
    /** Admin: list all team members with profile data */
    list: adminProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const company = await getCompanyBySlug(input.slug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        return getCompanyTeamMembers(company.id);
      }),

    /** Admin: add a user to the team by their profile slug */
    add: adminProcedure
      .input(z.object({ companySlug: z.string(), userSlug: z.string() }))
      .mutation(async ({ input }) => {
        const company = await getCompanyBySlug(input.companySlug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
        const profile = await getProfileBySlug(input.userSlug);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found" });
        const member = await addCompanyTeamMember(company.id, profile.userId);
        return member;
      }),

    /** Admin: remove a user from the team */
    remove: adminProcedure
      .input(z.object({ companySlug: z.string(), userId: z.number() }))
      .mutation(async ({ input }) => {
        const company = await getCompanyBySlug(input.companySlug);
        if (!company) throw new TRPCError({ code: "NOT_FOUND" });
        await removeCompanyTeamMember(company.id, input.userId);
        return { success: true };
      }),

    /** Admin: toggle visibility of a team member */
    setVisible: adminProcedure
      .input(z.object({ memberId: z.number(), isVisible: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateCompanyTeamMember(input.memberId, { isVisible: input.isVisible });
        return { success: true };
      }),

    /** Admin: reorder team members */
    reorder: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await reorderCompanyTeamMembers(input.orderedIds);
        return { success: true };
      }),
  }),
});

// - Router -

export const appRouter = router({
  system: systemRouter,
  company: companyRouter,

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Profile ───────────────────────────────────────────────────────────────
  profile: router({
    /** Get the current user's profile (null if not set up yet) */
    mine: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      return profile ?? null;
    }),

    /** Public: get a profile by slug (for public page) */
    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const profile = await getProfileBySlug(input.slug);
        return profile ?? null;
      }),

    /** Public: get all public collections + their links for a profile slug */
    publicCollections: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getPublicProfileData(input.slug);
      }),

    /** Save / update the current user's profile */
    save: protectedProcedure
      .input(
        z.object({
          slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
          displayName: z.string().min(1).max(128).optional(),
          jobTitle: z.string().max(128).optional(),
          bio: z.string().max(500).optional(),
          avatarUrl: z.string().url().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { slug, displayName, jobTitle, bio, avatarUrl } = input;
        const existing = await getProfileBySlug(slug);
        if (existing && existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "This URL is already taken" });
        }
        await upsertProfile(ctx.user.id, { slug, displayName, jobTitle, bio, avatarUrl });
        const { collection, isNew } = await ensureUserCollection(ctx.user.id, input.slug);
        // Seed company links for new users (configure via ALLOWED_EMAIL_DOMAIN + AUTO_ADMIN_EMAILS)
        const userEmailAllowed = isUserEmailAllowed(ctx.user.email);
        if (isNew && collection && userEmailAllowed) {
          await seedPresetLinks(collection.id, ctx.user.id);
        }
        const profile = await getProfileByUserId(ctx.user.id);
        return { ...profile, isNew };
      }),

    /** Generate Apple Wallet .pkpass for the user's digital card */
    appleWalletPass: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile?.slug) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set up your profile first" });
      const profileUrl = `${process.env.PUBLIC_BASE_URL ?? "https://example.com"}/u/${profile.slug}`;
      const passBuffer = await generateApplePass({
        displayName: profile.displayName ?? ctx.user.name ?? "Team Member",
        jobTitle: profile.jobTitle,
        profileUrl,
        slug: profile.slug,
      });
      return { pkpassBase64: passBuffer.toString("base64") };
    }),

    /** Generate Google Wallet JWT URL for the user's digital card */
    googleWalletUrl: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile?.slug) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set up your profile first" });
      const profileUrl = `${process.env.PUBLIC_BASE_URL ?? "https://example.com"}/u/${profile.slug}`;
      const result = generateGoogleWalletJwt({
        displayName: profile.displayName ?? ctx.user.name ?? "Team Member",
        jobTitle: profile.jobTitle,
        profileUrl,
        slug: profile.slug,
      });
      return result;
    }),

    /**
     * Complete profile for first-time users (called from /welcome page).
     * Takes firstName + lastName, derives slug from email, seeds preset links.
     */
    complete: protectedProcedure
      .input(
        z.object({
          firstName: z.string().min(1).max(64).trim(),
          lastName: z.string().min(1).max(64).trim(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;
        // Derive slug from email local part, fallback to userId
        const emailLocal = (ctx.user.email ?? ctx.user.openId)
          .split("@")[0]
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        const slug = emailLocal || `user${ctx.user.id}`;
        // Check slug collision — append id suffix if taken by another user
        const existing = await getProfileBySlug(slug);
        const finalSlug = existing && existing.userId !== ctx.user.id ? `${slug}${ctx.user.id}` : slug;
        // Save profile
        await upsertProfile(ctx.user.id, { slug: finalSlug, displayName: fullName });
        // Update name on the user record so session reflects it
        await upsertUser({ openId: ctx.user.openId, name: fullName });
        // Ensure collection exists and seed company links for new allowed users
        const { collection, isNew } = await ensureUserCollection(ctx.user.id, finalSlug);
        const userEmailAllowed = isUserEmailAllowed(ctx.user.email);
        if (isNew && collection && userEmailAllowed) {
          await seedPresetLinks(collection.id, ctx.user.id);
        }
        return { slug: finalSlug, displayName: fullName };
      }),

    /** Upload avatar image to S3, returns CDN URL */
    uploadAvatar: protectedProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `avatars/${ctx.user.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ── Links ─────────────────────────────────────────────────────────────────
  links: router({
    /** Get all links (active + inactive) for the current user's default collection — used by the editor */
    mine: protectedProcedure.query(async ({ ctx }) => {
      const collections = await getCollectionsByUserId(ctx.user.id);
      const defaultCol = collections.find((c) => c.isDefault) ?? collections[0];
      if (!defaultCol) return [];
      return getAllLinksByCollectionId(defaultCol.id);
    }),

    /** Public: get active links for a collection (for public profile page) */
    byCollection: publicProcedure
      .input(z.object({ collectionId: z.number() }))
      .query(async ({ input }) => {
        return getLinksByCollectionId(input.collectionId);
      }),

    /** Protected: get ALL links for a collection including inactive — for the editor */
    allByCollection: protectedProcedure
      .input(z.object({ collectionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const collections = await getCollectionsByUserId(ctx.user.id);
        const owns = collections.some((c) => c.id === input.collectionId);
        if (!owns) throw new TRPCError({ code: "FORBIDDEN" });
        return getAllLinksByCollectionId(input.collectionId);
      }),

    /** Add a link to the current user's default collection */
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(128),
          url: urlSchema,
          description: z.string().max(300).optional(),
          iconType: z.string().max(32).optional(),
          presetId: z.string().max(64).optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getProfileByUserId(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Set up your profile first" });
        const { collection } = await ensureUserCollection(ctx.user.id, profile.slug);
        if (!collection) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create collection" });
        return createLink({
          collectionId: collection.id,
          userId: ctx.user.id,
          title: input.title,
          url: input.url,
          description: input.description,
          iconType: input.iconType ?? "link",
          presetId: input.presetId,
          sortOrder: input.sortOrder ?? 0,
        });
      }),

    /** Update a link's title, url, description, isActive, or iconType */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(128).optional(),
          url: urlSchema.optional().or(z.literal("")),
          description: z.string().max(300).optional(),
          isActive: z.boolean().optional(),
          iconType: z.string().max(32).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const link = await getLinkById(id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (link.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await updateLink(id, data);
        return getLinkById(id);
      }),

    /** Delete a link */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const link = await getLinkById(input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (link.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await deleteLink(input.id);
        return { success: true };
      }),

    /** Reorder links by providing new ordered array of IDs */
    reorder: protectedProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await reorderLinks(input.orderedIds);
        return { success: true };
      }),
  }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: router({
    /** Public: record a page view (called from PublicProfile on mount) */
    recordPageView: publicProcedure
      .input(z.object({ collectionId: z.number(), referrer: z.string().max(2048).optional() }))
      .mutation(async ({ ctx, input }) => {
        const ip = extractIp(ctx.req.headers as Record<string, string | string[] | undefined>);
        const geo = ip ? await geoLookup(ip) : { country: null, city: null };
        await recordEvent({
          eventType: "page_view",
          collectionId: input.collectionId,
          referrer: input.referrer,
          userAgent: ctx.req.headers["user-agent"],
          ip: ip ?? undefined,
          country: geo.country ?? undefined,
          city: geo.city ?? undefined,
        });
        return { success: true };
      }),

    /** Public: record a link click (called from PublicProfile on link tap) */
    recordLinkClick: publicProcedure
      .input(z.object({ collectionId: z.number(), linkId: z.number(), referrer: z.string().max(2048).optional() }))
      .mutation(async ({ ctx, input }) => {
        const ip = extractIp(ctx.req.headers as Record<string, string | string[] | undefined>);
        const geo = ip ? await geoLookup(ip) : { country: null, city: null };
        await recordEvent({
          eventType: "link_click",
          collectionId: input.collectionId,
          linkId: input.linkId,
          referrer: input.referrer,
          userAgent: ctx.req.headers["user-agent"],
          ip: ip ?? undefined,
          country: geo.country ?? undefined,
          city: geo.city ?? undefined,
        });
        return { success: true };
      }),

    /** Stats for the current user's default collection */
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const collections = await getCollectionsByUserId(ctx.user.id);
      const defaultCol = collections.find((c) => c.isDefault) ?? collections[0];
      if (!defaultCol) return { totalViews: 0, totalClicks: 0, daily: [], linkClicks: [], locations: [], referrers: [] };
      const [stats, linkClicks, daily, locations, referrers] = await Promise.all([
        getCollectionStats(defaultCol.id),
        getLinkClickCounts(defaultCol.id),
        getDailyStats(defaultCol.id, 30),
        getLocationStats(defaultCol.id, 30),
        getReferrerStats(defaultCol.id, 30),
      ]);
      return { ...stats, linkClicks, daily, locations, referrers };
    }),
  }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    /** List all users */
    users: adminProcedure.query(async () => getAllUsers()),

    /** Platform-wide stats */
    platformStats: adminProcedure.query(async () => getPlatformStats()),

    /** All collections across all users */
    allCollections: adminProcedure.query(async () => getAllCollections()),

    /** Promote or demote a user's role */
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // ── Admin: per-user profile management ──────────────────────────────────

    /** Get any user's profile by userId */
    userProfile: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const profile = await getProfileByUserId(input.userId);
        return profile ?? null;
      }),

    /** Update any user's profile (admin override — no ownership check) */
    saveUserProfile: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
          displayName: z.string().min(1).max(128).optional(),
          jobTitle: z.string().max(128).optional(),
          bio: z.string().max(500).optional(),
          avatarUrl: z.string().url().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        // Check slug uniqueness against other users
        const existing = await getProfileBySlug(data.slug);
        if (existing && existing.userId !== userId) {
          throw new TRPCError({ code: "CONFLICT", message: "This URL is already taken by another user" });
        }
        await upsertProfile(userId, data);
        return getProfileByUserId(userId);
      }),

    /** Upload avatar for any user (admin) */
    uploadUserAvatar: adminProcedure
      .input(z.object({ userId: z.number(), base64: z.string(), mimeType: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `avatars/${input.userId}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // ── Admin: per-user collection management ───────────────────────────────

    /** List all collections for a specific user */
    userCollections: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getCollectionsByUserId(input.userId);
      }),

    /** Create an additional collection for any user */
    createCollection: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          title: z.string().min(1).max(128),
          slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
          isPublic: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        // Ensure slug is globally unique
        const existing = await getProfileBySlug(input.slug);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "This slug is already in use by a profile" });
        }
        const col = await createCollection({
          userId: input.userId,
          title: input.title,
          slug: input.slug,
          isDefault: false,
          isPublic: input.isPublic,
        });
        if (!col) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create collection" });
        return col;
      }),

    /** Update a collection's title or visibility */
    updateCollection: adminProcedure
      .input(
        z.object({
          collectionId: z.number(),
          title: z.string().min(1).max(128).optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { collectionId, ...data } = input;
        await updateCollection(collectionId, data);
        return getCollectionById(collectionId);
      }),

    /** Delete a non-default collection and all its links */
    deleteCollection: adminProcedure
      .input(z.object({ collectionId: z.number() }))
      .mutation(async ({ input }) => {
        const col = await getCollectionById(input.collectionId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND" });
        if (col.isDefault) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete the default collection" });
        await deleteCollection(input.collectionId);
        return { success: true };
      }),

    // ── Admin: per-collection link management ───────────────────────────────

    /** Get all links (active + inactive) for any collection */
    collectionLinks: adminProcedure
      .input(z.object({ collectionId: z.number() }))
      .query(async ({ input }) => {
        return getAllLinksByCollectionId(input.collectionId);
      }),

    /** Create a link in any collection */
    createLink: adminProcedure
      .input(
        z.object({
          collectionId: z.number(),
          title: z.string().min(1).max(128),
          url: urlSchema,
          description: z.string().max(300).optional(),
          iconType: z.string().max(32).optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const col = await getCollectionById(input.collectionId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND" });
        return createLink({
          collectionId: input.collectionId,
          userId: col.userId,
          title: input.title,
          url: input.url,
          description: input.description,
          iconType: input.iconType ?? "link",
          sortOrder: input.sortOrder ?? 0,
          isActive: true,
        });
      }),

    /** Update any link (admin override — no ownership check) */
    updateLink: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(128).optional(),
          url: urlSchema.optional().or(z.literal("")),
          description: z.string().max(300).optional(),
          isActive: z.boolean().optional(),
          iconType: z.string().max(32).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const link = await getLinkById(id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        await updateLink(id, data);
        return getLinkById(id);
      }),

    /** Delete any link */
    deleteLink: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const link = await getLinkById(input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        await deleteLink(input.id);
        return { success: true };
      }),

    /** Reorder links in any collection */
    reorderLinks: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await reorderLinks(input.orderedIds);
        return { success: true };
      }),

    // ── Admin: per-user analytics ────────────────────────────────────────────

    /** Get analytics stats for any user by userId */
    userAnalytics: adminProcedure
      .input(z.object({ userId: z.number(), days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        const collections = await getCollectionsByUserId(input.userId);
        const defaultCol = collections.find((c) => c.isDefault) ?? collections[0];
        if (!defaultCol) return { totalViews: 0, totalClicks: 0, daily: [], linkClicks: [], locations: [], referrers: [] };
        const [stats, linkClicks, daily, locations, referrers] = await Promise.all([
          getCollectionStats(defaultCol.id),
          getLinkClickCounts(defaultCol.id),
          getDailyStats(defaultCol.id, input.days),
          getLocationStats(defaultCol.id, input.days),
          getReferrerStats(defaultCol.id, input.days),
        ]);
        return { ...stats, linkClicks, daily, locations, referrers };
      }),
    /** Delete a user and all their data (profile, collections, links, analytics) */
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete your own account" });
        }
        await deleteUserAndAllData(input.userId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
