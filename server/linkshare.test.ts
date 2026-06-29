import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";
import * as db from "./db";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn(),
  getAllCollections: vi.fn().mockResolvedValue([]),
  getPlatformStats: vi.fn().mockResolvedValue({ totalUsers: 0, totalCollections: 0, totalLinks: 0, totalViews: 0, totalClicks: 0 }),
  getProfileByUserId: vi.fn().mockResolvedValue(null),
  getProfileBySlug: vi.fn().mockResolvedValue(null),
  upsertProfile: vi.fn(),
  getCollectionsByUserId: vi.fn().mockResolvedValue([]),
  getCollectionById: vi.fn().mockResolvedValue(null),
  createCollection: vi.fn(),
  getLinksByCollectionId: vi.fn().mockResolvedValue([]),
  getLinkById: vi.fn().mockResolvedValue(null),
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  reorderLinks: vi.fn(),
  recordEvent: vi.fn(),
  getCollectionStats: vi.fn().mockResolvedValue({ totalViews: 0, totalClicks: 0 }),
  getLinkClickCounts: vi.fn().mockResolvedValue([]),
  getDailyStats: vi.fn().mockResolvedValue([]),
  getLocationStats: vi.fn().mockResolvedValue([]),
  getReferrerStats: vi.fn().mockResolvedValue([]),
  getPublicProfileData: vi.fn().mockResolvedValue(null),
  getAllLinksByCollectionId: vi.fn().mockResolvedValue([]),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

// Reset all mocks to their default resolved values before each test so that
// `mockResolvedValueOnce` calls from one test do not bleed into the next.
beforeEach(() => {
  // Reset all mocks fully (clears implementations + call history + return queues)
  // then re-apply sensible defaults so tests start from a clean state.
  vi.mocked(db.getAllUsers).mockReset().mockResolvedValue([]);
  vi.mocked(db.getAllCollections).mockReset().mockResolvedValue([]);
  vi.mocked(db.getPlatformStats).mockReset().mockResolvedValue({ totalUsers: 0, totalCollections: 0, totalLinks: 0, totalViews: 0, totalClicks: 0 });
  vi.mocked(db.getProfileByUserId).mockReset().mockResolvedValue(undefined);
  vi.mocked(db.getProfileBySlug).mockReset().mockResolvedValue(undefined);
  vi.mocked(db.upsertProfile).mockReset();
  vi.mocked(db.getCollectionsByUserId).mockReset().mockResolvedValue([]);
  vi.mocked(db.getCollectionById).mockReset().mockResolvedValue(null);
  vi.mocked(db.createCollection).mockReset();
  vi.mocked(db.getLinksByCollectionId).mockReset().mockResolvedValue([]);
  vi.mocked(db.getAllLinksByCollectionId).mockReset().mockResolvedValue([]);
  vi.mocked(db.getLinkById).mockReset().mockResolvedValue(null);
  vi.mocked(db.createLink).mockReset();
  vi.mocked(db.updateLink).mockReset();
  vi.mocked(db.deleteLink).mockReset();
  vi.mocked(db.reorderLinks).mockReset();
  vi.mocked(db.recordEvent).mockReset();
  vi.mocked(db.updateUserRole).mockReset();
  vi.mocked(db.updateCollection).mockReset();
  vi.mocked(db.deleteCollection).mockReset();
  vi.mocked(db.getCollectionStats).mockReset().mockResolvedValue({ totalViews: 0, totalClicks: 0 });
  vi.mocked(db.getLinkClickCounts).mockReset().mockResolvedValue([]);
  vi.mocked(db.getDailyStats).mockReset().mockResolvedValue([]);
  vi.mocked(db.getLocationStats).mockReset().mockResolvedValue([]);
  vi.mocked(db.getReferrerStats).mockReset().mockResolvedValue([]);
  vi.mocked(db.getPublicProfileData).mockReset().mockResolvedValue(null);
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeCtx(overrides?: Partial<TrpcContext>): TrpcContext {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      _clearedCookies: clearedCookies,
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeUser(overrides = {}): NonNullable<TrpcContext["user"]> {
  return {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "magic-link",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeAdminUser(): NonNullable<TrpcContext["user"]> {
  return makeUser({ id: 99, openId: "admin-user", role: "admin" });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated requests", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    const result = await caller.auth.me();
    expect(result?.id).toBe(1);
    expect(result?.name).toBe("Test User");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const user = makeUser();
    const ctx = makeCtx({ user });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    const cleared = (ctx.res as unknown as { _clearedCookies: { name: string }[] })._clearedCookies;
    expect(cleared[0]?.name).toBe(COOKIE_NAME);
  });
});

// ─── Profile ──────────────────────────────────────────────────────────────────
describe("profile.mine", () => {
  it("returns null when no profile exists", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValueOnce(undefined);
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    const result = await caller.profile.mine();
    expect(result).toBeNull();
  });
});

describe("profile.save", () => {
  it("throws CONFLICT if slug is taken by another user", async () => {
    vi.mocked(db.getProfileBySlug).mockResolvedValueOnce({
      id: 99,
      userId: 999, // different user
      slug: "taken",
      displayName: null,
      bio: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.profile.save({ slug: "taken", displayName: "Test" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("validates slug format", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.profile.save({ slug: "INVALID SLUG!" })
    ).rejects.toThrow();
  });
});

// ─── Links (simplified — no collections router in new model) ─────────────────
// The collections router was removed in favour of a single auto-managed collection per user.

// ─── Links ────────────────────────────────────────────────────────────────────
describe("links.create", () => {
  it("requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.links.create({ title: "Test", url: "https://example.com" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws PRECONDITION_FAILED if user has no profile yet", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValueOnce(undefined);
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.links.create({ title: "Test", url: "https://example.com" })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("validates URL format", async () => {
    vi.mocked(db.getCollectionById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "My Collection",
      description: null,
      slug: "my-collection",
      isDefault: false,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.links.create({ collectionId: 1, title: "Test", url: "not-a-url" })
    ).rejects.toThrow();
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
describe("analytics.recordPageView", () => {
  it("records a page view event", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.analytics.recordPageView({ collectionId: 1 });
    expect(result).toEqual({ success: true });
    expect(db.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "page_view", collectionId: 1 })
    );
  });
});

describe("analytics.recordLinkClick", () => {
  it("records a link click event", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.analytics.recordLinkClick({ collectionId: 1, linkId: 5 });
    expect(result).toEqual({ success: true });
    expect(db.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "link_click", collectionId: 1, linkId: 5 })
    );
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
describe("admin.users", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.users()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns user list for admin", async () => {
    vi.mocked(db.getAllUsers).mockResolvedValueOnce([makeUser(), makeAdminUser()]);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.users();
    expect(result).toHaveLength(2);
  });
});

describe("admin.updateRole", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.updateRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin to update roles", async () => {
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.updateRole({ userId: 2, role: "user" });
    expect(result).toEqual({ success: true });
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "user");
  });
});

// ─── Admin: per-user profile management ──────────────────────────────────────

describe("admin.userProfile", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.userProfile({ userId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns null when user has no profile", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValueOnce(undefined);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.userProfile({ userId: 2 });
    expect(result).toBeNull();
  });

  it("returns profile for admin", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValueOnce({
      id: 1,
      userId: 2,
      slug: "test-user",
      displayName: "Test User",
      bio: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.userProfile({ userId: 2 });
    expect(result?.slug).toBe("test-user");
  });
});

describe("admin.saveUserProfile", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.admin.saveUserProfile({ userId: 2, slug: "test-slug" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws CONFLICT if slug is taken by another user", async () => {
    vi.mocked(db.getProfileBySlug).mockResolvedValueOnce({
      id: 99,
      userId: 999,
      slug: "taken",
      displayName: null,
      bio: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(
      caller.admin.saveUserProfile({ userId: 2, slug: "taken" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows admin to save a profile for any user", async () => {
    vi.mocked(db.getProfileBySlug).mockResolvedValueOnce(null);
    vi.mocked(db.upsertProfile).mockResolvedValueOnce(undefined);
    vi.mocked(db.getProfileByUserId).mockResolvedValueOnce({
      id: 1,
      userId: 2,
      slug: "new-slug",
      displayName: "New Name",
      bio: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.saveUserProfile({ userId: 2, slug: "new-slug", displayName: "New Name" });
    expect(db.upsertProfile).toHaveBeenCalledWith(2, expect.objectContaining({ slug: "new-slug" }));
    expect(result?.slug).toBe("new-slug");
  });
});

// ─── Admin: per-user collection management ────────────────────────────────────

describe("admin.userCollections", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.userCollections({ userId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns collections for a user", async () => {
    vi.mocked(db.getCollectionsByUserId).mockResolvedValueOnce([
      { id: 1, userId: 2, title: "My Links", slug: "my-links", isDefault: true, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.userCollections({ userId: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("my-links");
  });
});

describe("admin.createCollection", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.admin.createCollection({ userId: 2, title: "Extra", slug: "extra", isPublic: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws CONFLICT if slug is already in use", async () => {
    vi.mocked(db.getProfileBySlug).mockResolvedValueOnce({
      id: 1, userId: 1, slug: "taken", displayName: null, bio: null, avatarUrl: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(
      caller.admin.createCollection({ userId: 2, title: "Extra", slug: "taken", isPublic: true })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates a new collection for a user", async () => {
    vi.mocked(db.getProfileBySlug).mockResolvedValueOnce(null);
    vi.mocked(db.createCollection).mockResolvedValueOnce({
      id: 5, userId: 2, title: "Extra", slug: "extra-slug", isDefault: false, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.createCollection({ userId: 2, title: "Extra", slug: "extra-slug", isPublic: true });
    expect(result.slug).toBe("extra-slug");
    expect(result.isDefault).toBe(false);
  });
});

describe("admin.deleteCollection", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.deleteCollection({ collectionId: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND if collection does not exist", async () => {
    vi.mocked(db.getCollectionById).mockImplementation(async () => null);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(caller.admin.deleteCollection({ collectionId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN if trying to delete the default collection", async () => {
    const defaultCol = { id: 1, userId: 2, title: "My Links", slug: "my-links", isDefault: true, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.getCollectionById).mockImplementation(async () => defaultCol as Awaited<ReturnType<typeof db.getCollectionById>>);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(caller.admin.deleteCollection({ collectionId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deletes a non-default collection", async () => {
    const extraCol = { id: 5, userId: 2, title: "Extra", slug: "extra", isDefault: false, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.getCollectionById).mockImplementation(async () => extraCol as Awaited<ReturnType<typeof db.getCollectionById>>);
    vi.mocked(db.deleteCollection).mockResolvedValue(undefined);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.deleteCollection({ collectionId: 5 });
    expect(result).toEqual({ success: true });
    expect(db.deleteCollection).toHaveBeenCalledWith(5);
  });
});

// ─── Admin: per-collection link management ────────────────────────────────────

describe("admin.collectionLinks", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.collectionLinks({ collectionId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns all links for a collection", async () => {
    vi.mocked(db.getAllLinksByCollectionId).mockResolvedValueOnce([
      { id: 1, collectionId: 1, userId: 2, title: "Test Link", url: "https://example.com", description: null, iconType: "link", presetId: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.collectionLinks({ collectionId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Link");
  });
});

describe("admin.createLink", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(
      caller.admin.createLink({ collectionId: 1, title: "Test", url: "https://example.com" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND if collection does not exist", async () => {
    vi.mocked(db.getCollectionById).mockImplementation(async () => null);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(
      caller.admin.createLink({ collectionId: 999, title: "Test", url: "https://example.com" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates a link in any collection", async () => {
    const col = { id: 1, userId: 2, title: "My Links", slug: "my-links", isDefault: true, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.getCollectionById).mockImplementation(async () => col as Awaited<ReturnType<typeof db.getCollectionById>>);
    vi.mocked(db.createLink).mockResolvedValueOnce({
      id: 10, collectionId: 1, userId: 2, title: "Admin Link", url: "https://example.com", description: null, iconType: "link", presetId: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.createLink({ collectionId: 1, title: "Admin Link", url: "https://example.com" });
    expect(result?.title).toBe("Admin Link");
    expect(db.createLink).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 1, userId: 2 }));
  });
});

describe("admin.deleteLink", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.deleteLink({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND if link does not exist", async () => {
    vi.mocked(db.getLinkById).mockResolvedValueOnce(null);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    await expect(caller.admin.deleteLink({ id: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes any link without ownership check", async () => {
    vi.mocked(db.getLinkById).mockResolvedValueOnce({
      id: 7, collectionId: 1, userId: 2, title: "Test", url: "https://example.com", description: null, iconType: "link", presetId: null, sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.deleteLink).mockResolvedValueOnce(undefined);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.deleteLink({ id: 7 });
    expect(result).toEqual({ success: true });
    expect(db.deleteLink).toHaveBeenCalledWith(7);
  });
});

// ─── Admin: per-user analytics ────────────────────────────────────────────────

describe("admin.userAnalytics", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.userAnalytics({ userId: 2, days: 30 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns zero stats when user has no collections", async () => {
    vi.mocked(db.getCollectionsByUserId).mockResolvedValueOnce([]);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.userAnalytics({ userId: 2, days: 30 });
    expect(result.totalViews).toBe(0);
    expect(result.totalClicks).toBe(0);
  });

  it("returns stats for a user's default collection", async () => {
    vi.mocked(db.getCollectionsByUserId).mockResolvedValueOnce([
      { id: 1, userId: 2, title: "My Links", slug: "my-links", isDefault: true, isPublic: true, description: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    vi.mocked(db.getCollectionStats).mockResolvedValueOnce({ totalViews: 100, totalClicks: 25 });
    vi.mocked(db.getLinkClickCounts).mockResolvedValueOnce([]);
    vi.mocked(db.getDailyStats).mockResolvedValueOnce([]);
    vi.mocked(db.getLocationStats).mockResolvedValueOnce([]);
    vi.mocked(db.getReferrerStats).mockResolvedValueOnce([]);
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeCtx({ user: admin }));
    const result = await caller.admin.userAnalytics({ userId: 2, days: 30 });
    expect(result.totalViews).toBe(100);
    expect(result.totalClicks).toBe(25);
  });
});
