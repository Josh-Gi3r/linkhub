import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  X, Plus, Pencil, Trash2, Check, GripVertical, ChevronDown, ChevronRight,
  BarChart2, User, Layers, ArrowLeft, ExternalLink,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LinkIcon } from "@/components/LinkIcon";
import { PUBLIC_BASE_URL } from "@/const";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "collections";
type UserDetailView = "profile" | "analytics" | "collections";

type LinkItem = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  iconType: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CollectionItem = {
  id: number;
  userId: number;
  title: string;
  slug: string;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
};

// ── Sortable link row (for admin collection editor) ────────────────────────────

function AdminSortableLinkRow({
  link,
  onToggle,
  onEdit,
  onDelete,
}: {
  link: LinkItem;
  onToggle: (id: number, val: boolean) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-2 px-3 py-2.5 bg-white border-b border-black/10 last:border-0 group ${!link.isActive ? "opacity-50" : ""}`}
    >
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 touch-none">
        <GripVertical size={14} />
      </button>
      <button
        onClick={() => onToggle(link.id, !link.isActive)}
        className={`w-7 h-4 shrink-0 border border-black flex items-center justify-center transition-colors ${link.isActive ? "bg-[#00D26A]" : "bg-white"}`}
        title={link.isActive ? "Disable" : "Enable"}
      >
        {link.isActive && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <LinkIcon iconType={link.iconType ?? "link"} className="w-3 h-3 shrink-0 text-gray-500" />
          <span className="font-semibold text-xs truncate">{link.title}</span>
        </div>
        <div className="font-mono text-[10px] text-gray-400 truncate">{link.url}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(link)} className="p-1 hover:bg-black hover:text-white transition-colors" title="Edit">
          <Pencil size={11} />
        </button>
        <button onClick={() => onDelete(link.id)} className="p-1 hover:bg-red-500 hover:text-white transition-colors" title="Delete">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Admin link edit modal ──────────────────────────────────────────────────────

function AdminLinkModal({
  link,
  collectionId,
  onClose,
  onSaved,
}: {
  link: LinkItem | null;
  collectionId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !link || link.id === -1;
  const [title, setTitle] = useState(link?.title ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [iconType, setIconType] = useState(link?.iconType ?? "link");

  const createMutation = trpc.admin.createLink.useMutation({
    onSuccess: () => { toast.success("Link added"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.updateLink.useMutation({
    onSuccess: () => { toast.success("Link updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;
    if (isNew) {
      createMutation.mutate({ collectionId, title: title.trim(), url: url.trim(), description: description.trim(), iconType });
    } else {
      updateMutation.mutate({ id: link!.id, title: title.trim(), url: url.trim(), description: description.trim(), iconType });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4">
      <div className="bg-white border border-black w-full max-w-md" style={{ boxShadow: "8px 8px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black">
          <h2 className="font-bold text-sm uppercase tracking-widest">{isNew ? "ADD LINK" : "EDIT LINK"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Title *</label>
            <input className="lh-input" placeholder="e.g. Our Website" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">URL *</label>
            <input className="lh-input" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Description</label>
            <input className="lh-input" placeholder="Optional short description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Icon Type</label>
            <select className="lh-input" value={iconType} onChange={(e) => setIconType(e.target.value)}>
              {["link", "brand", "phone", "whatsapp", "linkedin", "x", "instagram", "telegram", "email", "calendar", "youtube", "github", "tiktok", "discord", "website"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-black flex justify-end gap-3">
          <button onClick={onClose} className="lh-btn-outline px-5 py-2">CANCEL</button>
          <button onClick={handleSave} disabled={!title.trim() || !url.trim() || isPending} className="lh-btn-primary px-5 py-2 disabled:opacity-50">
            {isPending ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin collection editor panel ──────────────────────────────────────────────

function AdminCollectionEditor({
  collectionId,
  collectionTitle,
  collectionSlug,
  onBack,
}: {
  collectionId: number;
  collectionTitle: string;
  collectionSlug: string;
  onBack: () => void;
}) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [editingLink, setEditingLink] = useState<LinkItem | null | undefined>(undefined);
  const utils = trpc.useUtils();

  const linksQuery = trpc.admin.collectionLinks.useQuery({ collectionId });

  useEffect(() => {
    if (linksQuery.data) setLinks(linksQuery.data as LinkItem[]);
  }, [linksQuery.data]);

  const toggleMutation = trpc.admin.updateLink.useMutation({
    onMutate: async ({ id, isActive }) => {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, isActive: isActive ?? l.isActive } : l));
    },
    onError: () => { toast.error("Failed to update link"); linksQuery.refetch(); },
  });

  const deleteMutation = trpc.admin.deleteLink.useMutation({
    onSuccess: () => { toast.success("Link deleted"); linksQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = trpc.admin.reorderLinks.useMutation({
    onError: () => { toast.error("Failed to reorder"); linksQuery.refetch(); },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex);
    setLinks(reordered);
    reorderMutation.mutate({ orderedIds: reordered.map((l) => l.id) });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this link?")) return;
    deleteMutation.mutate({ id });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-black text-sm uppercase tracking-widest">{collectionTitle}</span>
        <a
          href={`${PUBLIC_BASE_URL}/u/${collectionSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 font-mono text-xs text-gray-400 hover:text-black transition-colors"
        >
          /u/{collectionSlug} <ExternalLink size={11} />
        </a>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs uppercase tracking-widest text-gray-500">{links.length} LINKS</span>
        <button
          onClick={() => setEditingLink({ id: -1, title: "", url: "", description: null, iconType: "link", sortOrder: links.length, isActive: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-black font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
          style={{ boxShadow: "2px 2px 0px #000" }}
        >
          <Plus size={12} /> ADD LINK
        </button>
      </div>

      {linksQuery.isLoading ? (
        <div className="border border-black p-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="border border-black p-8 text-center font-mono text-xs text-gray-400 uppercase tracking-widest">
          No links in this collection
        </div>
      ) : (
        <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {links.map((link) => (
                <AdminSortableLinkRow
                  key={link.id}
                  link={link}
                  onToggle={(id, val) => toggleMutation.mutate({ id, isActive: val })}
                  onEdit={(l) => setEditingLink(l)}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {editingLink !== undefined && (
        <AdminLinkModal
          link={editingLink}
          collectionId={collectionId}
          onClose={() => setEditingLink(undefined)}
          onSaved={() => linksQuery.refetch()}
        />
      )}
    </div>
  );
}

// ── Admin: per-user collections manager ───────────────────────────────────────

function AdminUserCollections({ userId, userName }: { userId: number; userName: string }) {
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const utils = trpc.useUtils();

  const collectionsQuery = trpc.admin.userCollections.useQuery({ userId });
  const collections = (collectionsQuery.data ?? []) as CollectionItem[];

  const createMutation = trpc.admin.createCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection created");
      collectionsQuery.refetch();
      setShowNewForm(false);
      setNewTitle("");
      setNewSlug("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection updated");
      collectionsQuery.refetch();
      setEditingCollection(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteCollection.useMutation({
    onSuccess: () => { toast.success("Collection deleted"); collectionsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (selectedCollection) {
    return (
      <AdminCollectionEditor
        collectionId={selectedCollection.id}
        collectionTitle={selectedCollection.title}
        collectionSlug={selectedCollection.slug}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm uppercase tracking-widest">{userName}'s Collections</h3>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-black font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
          style={{ boxShadow: "2px 2px 0px #000" }}
        >
          <Plus size={12} /> NEW COLLECTION
        </button>
      </div>

      {showNewForm && (
        <div className="border border-black p-4 mb-4 bg-[#F5F5F5]" style={{ boxShadow: "4px 4px 0px #000" }}>
          <div className="font-mono text-xs font-bold uppercase tracking-widest mb-3">New Collection</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">Title *</label>
              <input className="lh-input" placeholder="e.g. Event Links" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">Slug * (used in URL: /u/slug)</label>
              <input className="lh-input font-mono" placeholder="e.g. joshua-event" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewIsPublic(!newIsPublic)}
                className={`w-7 h-4 border border-black flex items-center justify-center transition-colors ${newIsPublic ? "bg-[#00D26A]" : "bg-white"}`}
              >
                {newIsPublic && <Check size={10} strokeWidth={3} />}
              </button>
              <span className="font-mono text-xs text-gray-600">Public (visible at /u/{newSlug || "slug"})</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewForm(false)} className="lh-btn-outline px-4 py-1.5 text-xs">CANCEL</button>
              <button
                onClick={() => createMutation.mutate({ userId, title: newTitle, slug: newSlug, isPublic: newIsPublic })}
                disabled={!newTitle.trim() || !newSlug.trim() || createMutation.isPending}
                className="lh-btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
              >
                {createMutation.isPending ? "CREATING..." : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {collectionsQuery.isLoading ? (
        <div className="border border-black p-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin" />
        </div>
      ) : collections.length === 0 ? (
        <div className="border border-black p-8 text-center font-mono text-xs text-gray-400 uppercase tracking-widest">
          No collections yet
        </div>
      ) : (
        <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
          {collections.map((col) => (
            <div key={col.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/10 last:border-b-0 hover:bg-[#F5F5F5] transition-colors group">
              <div className="flex-1 min-w-0">
                {editingCollection?.id === col.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="lh-input text-xs py-1 flex-1"
                      value={editingCollection.title}
                      onChange={(e) => setEditingCollection({ ...editingCollection, title: e.target.value })}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMutation.mutate({ collectionId: col.id, title: editingCollection.title, isPublic: editingCollection.isPublic });
                        if (e.key === "Escape") setEditingCollection(null);
                      }}
                    />
                    <button
                      onClick={() => setEditingCollection({ ...editingCollection, isPublic: !editingCollection.isPublic })}
                      className={`w-6 h-3.5 border border-black flex items-center justify-center shrink-0 ${editingCollection.isPublic ? "bg-[#00D26A]" : "bg-white"}`}
                    >
                      {editingCollection.isPublic && <Check size={8} strokeWidth={3} />}
                    </button>
                    <button onClick={() => updateMutation.mutate({ collectionId: col.id, title: editingCollection.title, isPublic: editingCollection.isPublic })} className="p-1 hover:bg-black hover:text-white transition-colors">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingCollection(null)} className="p-1 hover:bg-black hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{col.title}</span>
                      {col.isDefault && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-black text-white uppercase tracking-widest">DEFAULT</span>
                      )}
                      {col.isPublic ? (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#00D26A] border border-black uppercase tracking-widest">PUBLIC</span>
                      ) : (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 border border-black/30 text-gray-400 uppercase tracking-widest">PRIVATE</span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-gray-400">/u/{col.slug}</div>
                  </>
                )}
              </div>
              {editingCollection?.id !== col.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setSelectedCollection(col)}
                    className="px-2 py-1 border border-black font-mono text-[10px] font-bold uppercase hover:bg-black hover:text-white transition-colors"
                    title="Edit links"
                  >
                    LINKS
                  </button>
                  <button onClick={() => setEditingCollection(col)} className="p-1 hover:bg-black hover:text-white transition-colors" title="Rename">
                    <Pencil size={12} />
                  </button>
                  {!col.isDefault && (
                    <button
                      onClick={() => { if (confirm(`Delete "${col.title}" and all its links?`)) deleteMutation.mutate({ collectionId: col.id }); }}
                      className="p-1 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin: per-user analytics panel ───────────────────────────────────────────

function AdminUserAnalytics({ userId, userName }: { userId: number; userName: string }) {
  const statsQuery = trpc.admin.userAnalytics.useQuery({ userId, days: 30 });
  const stats = statsQuery.data;

  const totalViews = stats?.totalViews ?? 0;
  const totalClicks = stats?.totalClicks ?? 0;
  const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

  const dailyMap = new Map<string, { date: string; Views: number; Clicks: number }>();
  for (const row of (stats?.daily ?? []) as { date: string; eventType: string; count: number }[]) {
    if (!dailyMap.has(row.date)) dailyMap.set(row.date, { date: row.date, Views: 0, Clicks: 0 });
    const entry = dailyMap.get(row.date)!;
    if (row.eventType === "page_view") entry.Views = Number(row.count);
    if (row.eventType === "link_click") entry.Clicks = Number(row.count);
  }
  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const locations = (stats?.locations ?? []) as { country: string; city: string; count: number }[];
  const referrers = (stats?.referrers ?? []) as { referrer: string; count: number }[];

  if (statsQuery.isLoading) {
    return (
      <div className="border border-black p-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-black text-sm uppercase tracking-widest mb-4">{userName}'s Analytics (Last 30 Days)</h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-0 border border-black mb-6" style={{ boxShadow: "4px 4px 0px #000" }}>
        {[
          { label: "Page Views", value: totalViews.toLocaleString(), accent: false },
          { label: "Link Clicks", value: totalClicks.toLocaleString(), accent: true },
          { label: "Click Rate", value: `${ctr}%`, accent: false },
        ].map((s, i) => (
          <div key={i} className={`p-4 border-r border-black last:border-r-0 ${s.accent ? "bg-[#00D26A]" : "bg-white"}`}>
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{s.label}</div>
            <div className="text-2xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      {dailyData.length > 0 ? (
        <div className="border border-black p-4 mb-6" style={{ boxShadow: "4px 4px 0px #000" }}>
          <div className="font-mono text-xs font-bold uppercase tracking-widest mb-3">Daily Activity</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: "monospace" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fontFamily: "monospace" }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: "monospace", fontSize: 11, border: "1px solid #000" }} />
              <Line type="monotone" dataKey="Views" stroke="#000" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Clicks" stroke="#00D26A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-black" /><span className="font-mono text-[10px] text-gray-500">Views</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#00D26A]" /><span className="font-mono text-[10px] text-gray-500">Clicks</span></div>
          </div>
        </div>
      ) : (
        <div className="border border-black p-8 text-center font-mono text-xs text-gray-400 uppercase tracking-widest mb-6">
          No activity in the last 30 days
        </div>
      )}

      {/* Location + Referrer tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
          <div className="px-4 py-2 border-b border-black bg-[#F5F5F5]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">Visitors by Location</span>
          </div>
          {locations.length === 0 ? (
            <div className="p-4 font-mono text-xs text-gray-400 text-center">No location data</div>
          ) : (
            <div className="divide-y divide-black/10">
              {locations.slice(0, 8).map((loc, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <span className="font-mono text-xs text-gray-700">{loc.city ? `${loc.city}, ${loc.country}` : loc.country}</span>
                  <span className="font-black text-sm">{loc.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
          <div className="px-4 py-2 border-b border-black bg-[#F5F5F5]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">Traffic Sources</span>
          </div>
          {referrers.length === 0 ? (
            <div className="p-4 font-mono text-xs text-gray-400 text-center">No referrer data</div>
          ) : (
            <div className="divide-y divide-black/10">
              {referrers.slice(0, 8).map((ref, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 gap-2">
                  <span className="font-mono text-xs text-gray-700 truncate">{ref.referrer || "Direct"}</span>
                  <span className="font-black text-sm shrink-0">{ref.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin: per-user profile editor ────────────────────────────────────────────

function AdminUserProfile({ userId, userName }: { userId: number; userName: string }) {
  const utils = trpc.useUtils();
  const profileQuery = trpc.admin.userProfile.useQuery({ userId });
  const profile = profileQuery.data;

  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setSlug(profile.slug ?? "");
      setDisplayName(profile.displayName ?? "");
      setJobTitle(profile.jobTitle ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
    }
  }, [profile]);

  const saveMutation = trpc.admin.saveUserProfile.useMutation({
    onSuccess: () => { toast.success("Profile saved"); profileQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const uploadAvatarMutation = trpc.admin.uploadUserAvatar.useMutation({
    onSuccess: ({ url }) => { setAvatarUrl(url); toast.success("Avatar uploaded"); },
    onError: (e) => toast.error(e.message),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadAvatarMutation.mutate({ userId, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!slug.trim()) return;
    saveMutation.mutate({ userId, slug: slug.trim(), displayName: displayName.trim(), jobTitle: jobTitle.trim(), bio: bio.trim(), avatarUrl: avatarUrl.trim() });
  };

  if (profileQuery.isLoading) {
    return (
      <div className="border border-black p-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-black text-sm uppercase tracking-widest mb-4">{userName}'s Profile</h3>

      {!profile && (
        <div className="border border-black border-l-4 border-l-[#00D26A] p-3 mb-4 font-mono text-xs text-gray-600">
          This user has not set up their profile yet. You can create it for them below.
        </div>
      )}

      <div className="border border-black p-5" style={{ boxShadow: "4px 4px 0px #000" }}>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-black/10">
          <div
            className="w-16 h-16 border border-black bg-[#F5F5F5] overflow-hidden cursor-pointer relative shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change avatar"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl text-gray-300">
                {(displayName || userName || "U")[0].toUpperCase()}
              </div>
            )}
            {uploadAvatarMutation.isPending && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <div className="font-semibold text-sm">{userName}</div>
            <button onClick={() => fileInputRef.current?.click()} className="font-mono text-xs text-gray-400 hover:text-black transition-colors mt-0.5">
              Click avatar to change photo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Profile URL Slug *</label>
            <div className="flex items-center border border-black">
              <span className="px-2 py-2 font-mono text-xs text-gray-400 bg-[#F5F5F5] border-r border-black shrink-0">/u/</span>
              <input
                className="flex-1 px-2 py-2 font-mono text-xs bg-white outline-none"
                placeholder="your-name"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Display Name</label>
            <input className="lh-input" placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Job Title</label>
            <input className="lh-input" placeholder="e.g. Head of Growth" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Avatar URL</label>
            <input className="lh-input font-mono text-xs" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Bio</label>
            <textarea
              className="lh-input resize-none"
              rows={3}
              placeholder="Short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
            <div className="text-right font-mono text-[10px] text-gray-400 mt-0.5">{bio.length}/500</div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!slug.trim() || saveMutation.isPending}
            className="lh-btn-primary px-6 py-2 disabled:opacity-50"
            style={{ boxShadow: "3px 3px 0px #00D26A" }}
          >
            {saveMutation.isPending ? "SAVING..." : "SAVE PROFILE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin: user detail panel (profile / analytics / collections) ───────────────

function AdminUserDetail({
  userId,
  userName,
  onBack,
}: {
  userId: number;
  userName: string;
  onBack: () => void;
}) {
  const [view, setView] = useState<UserDetailView>("profile");

  const views: { id: UserDetailView; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={13} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={13} /> },
    { id: "collections", label: "Collections", icon: <Layers size={13} /> },
  ];

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
          <ArrowLeft size={14} /> All Users
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-black text-sm uppercase tracking-widest">{userName}</span>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border border-black mb-6" style={{ boxShadow: "3px 3px 0px #000" }}>
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border-r border-black last:border-r-0 transition-colors ${
              view === v.id ? "bg-black text-white" : "bg-white hover:bg-[#F5F5F5]"
            }`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {view === "profile" && <AdminUserProfile userId={userId} userName={userName} />}
      {view === "analytics" && <AdminUserAnalytics userId={userId} userName={userName} />}
      {view === "collections" && <AdminUserCollections userId={userId} userName={userName} />}
    </div>
  );
}

// ── Main AdminPanel ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  const usersQuery = trpc.admin.users.useQuery(undefined, { enabled: user?.role === "admin" });
  const platformStatsQuery = trpc.admin.platformStats.useQuery(undefined, { enabled: user?.role === "admin" });
  const allCollectionsQuery = trpc.admin.allCollections.useQuery(undefined, { enabled: user?.role === "admin" && tab === "collections" });

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "admin") {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, user, navigate]);

  const updateRole = trpc.admin.updateRole.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); utils.admin.platformStats.invalidate(); toast.success("Role updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { utils.admin.users.invalidate(); utils.admin.platformStats.invalidate(); toast.success("User deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const users = usersQuery.data ?? [];
  const stats = platformStatsQuery.data;
  const allCollections = allCollectionsQuery.data ?? [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "users", label: "USERS" },
    { id: "collections", label: "COLLECTIONS" },
  ];

  // If a user is selected in the Users tab, show their detail panel
  if (tab === "users" && selectedUserId !== null) {
    return (
      <DashboardShell>
        <div className="p-6 md:p-8">
          <AdminUserDetail
            userId={selectedUserId}
            userName={selectedUserName}
            onBack={() => { setSelectedUserId(null); setSelectedUserName(""); }}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <span className="lh-tag mb-2 block">ADMIN</span>
          <h1 className="text-3xl font-black uppercase tracking-tight">PLATFORM ADMIN</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage team members, view analytics, and oversee all link collections.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex border border-black mb-8" style={{ boxShadow: "4px 4px 0px #000" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 font-mono text-xs font-bold uppercase tracking-widest border-r border-black last:border-r-0 transition-colors ${
                tab === t.id ? "bg-black text-white" : "bg-white hover:bg-[#F5F5F5]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-0 mb-8 border border-black" style={{ boxShadow: "6px 6px 0px #000" }}>
              {[
                { label: "USERS", value: stats?.totalUsers },
                { label: "COLLECTIONS", value: stats?.totalCollections },
                { label: "LINKS", value: stats?.totalLinks },
                { label: "TOTAL VIEWS", value: stats?.totalViews, accent: true },
                { label: "TOTAL CLICKS", value: stats?.totalClicks },
              ].map((s, i) => (
                <div key={i} className={`p-5 border-r border-black last:border-r-0 ${s.accent ? "bg-[#00D26A]" : "bg-white"}`}>
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{s.label}</div>
                  <div className="text-3xl font-black">
                    {platformStatsQuery.isLoading ? (
                      <div className="w-10 h-7 bg-gray-200 animate-pulse rounded" />
                    ) : s.value !== undefined ? s.value.toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-black p-5" style={{ boxShadow: "4px 4px 0px #000" }}>
                <h3 className="font-black text-sm uppercase tracking-widest mb-4">USER BREAKDOWN</h3>
                <div className="space-y-3">
                  {[
                    { label: "ADMINS", value: users.filter((u) => u.role === "admin").length },
                    { label: "MEMBERS", value: users.filter((u) => u.role === "user").length },
                    { label: "TOTAL", value: users.length },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-widest text-gray-500">{row.label}</span>
                        <span className="font-black text-xl">{row.value}</span>
                      </div>
                      <div className="w-full h-px bg-black/10 mt-3" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-black p-5" style={{ boxShadow: "4px 4px 0px #000" }}>
                <h3 className="font-black text-sm uppercase tracking-widest mb-4">CLICK-THROUGH RATE</h3>
                {stats && stats.totalViews > 0 ? (
                  <div>
                    <div className="text-4xl font-black mb-1">
                      {((stats.totalClicks / stats.totalViews) * 100).toFixed(1)}%
                    </div>
                    <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-4">PLATFORM-WIDE CTR</div>
                    <div className="w-full bg-[#F5F5F5] border border-black h-4">
                      <div className="h-full bg-[#00D26A] transition-all" style={{ width: `${Math.min(100, (stats.totalClicks / stats.totalViews) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-xs text-gray-400">{stats.totalClicks.toLocaleString()} clicks</span>
                      <span className="font-mono text-xs text-gray-400">{stats.totalViews.toLocaleString()} views</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 font-mono text-xs uppercase tracking-widest">No analytics data yet</div>
                )}
              </div>
            </div>

            {/* Recent members */}
            <div className="mt-6">
              <h3 className="font-black text-sm uppercase tracking-widest mb-3">RECENT MEMBERS</h3>
              <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
                {usersQuery.isLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <>
                    {users.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-black last:border-b-0 hover:bg-[#F5F5F5] transition-colors">
                        <div className="w-8 h-8 flex items-center justify-center text-xs font-black border border-black shrink-0" style={{ background: u.id === user?.id ? "#00D26A" : "#F5F5F5" }}>
                          {(u.name ?? "U")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{u.name ?? "—"}{u.id === user?.id && <span className="text-gray-400 font-normal ml-1">(you)</span>}</div>
                          <div className="font-mono text-xs text-gray-400 truncate">{u.email ?? "—"}</div>
                        </div>
                        <span className={`font-mono text-xs font-bold uppercase px-2 py-0.5 border ${u.role === "admin" ? "bg-[#00D26A] border-black" : "bg-white border-black/30 text-gray-400"}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                    {users.length > 5 && (
                      <button onClick={() => setTab("users")} className="w-full py-3 font-mono text-xs uppercase tracking-widest text-gray-400 hover:bg-[#F5F5F5] transition-colors">
                        VIEW ALL {users.length} USERS →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-sm uppercase tracking-widest">ALL TEAM MEMBERS</h2>
              <span className="font-mono text-xs text-gray-400">{users.length} TOTAL</span>
            </div>

            {usersQuery.isLoading ? (
              <div className="border border-black p-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="border border-black overflow-x-auto" style={{ boxShadow: "6px 6px 0px #000" }}>
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-black bg-[#F5F5F5]">
                      {["User", "Email", "Joined", "Last Sign In", "Role", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3 font-mono text-xs uppercase tracking-widest ${h === "Actions" ? "text-right" : "text-left"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-black/10 last:border-b-0 hover:bg-[#F5F5F5] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center text-xs font-black border border-black shrink-0" style={{ background: u.id === user?.id ? "#00D26A" : "#F5F5F5" }}>
                              {(u.name ?? "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">
                                {u.name ?? "—"}
                                {u.id === user?.id && <span className="ml-1 font-mono text-xs text-gray-400">(you)</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.email ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(u.lastSignedIn).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {u.role === "admin" ? <span className="lh-tag-green">ADMIN</span> : <span className="lh-tag-outline">USER</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Manage button — opens per-user detail panel */}
                            <button
                              onClick={() => { setSelectedUserId(u.id); setSelectedUserName(u.name ?? `User ${u.id}`); }}
                              className="px-3 py-1 bg-black text-white font-mono text-xs font-bold uppercase hover:bg-[#00D26A] hover:text-black transition-colors"
                            >
                              MANAGE
                            </button>
                            {/* Role toggle */}
                            {u.id !== user?.id && (
                              <button
                                onClick={() => {
                                  const newRole = u.role === "admin" ? "user" : "admin";
                                  if (confirm(`Change ${u.name ?? "this user"}'s role to ${newRole.toUpperCase()}?`)) {
                                    updateRole.mutate({ userId: u.id, role: newRole });
                                  }
                                }}
                                disabled={updateRole.isPending}
                                className="px-3 py-1 border border-black font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                              >
                                {u.role === "admin" ? "DEMOTE" : "PROMOTE"}
                              </button>
                            )}
                            {/* Delete user */}
                            {u.id !== user?.id && (
                              <button
                                onClick={() => {
                                  if (confirm(`Permanently delete ${u.name ?? "this user"} and all their data? This cannot be undone.`)) {
                                    deleteUser.mutate({ userId: u.id });
                                  }
                                }}
                                disabled={deleteUser.isPending}
                                className="p-1.5 border border-red-300 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── COLLECTIONS TAB ──────────────────────────────────────────────── */}
        {tab === "collections" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-sm uppercase tracking-widest">ALL COLLECTIONS</h2>
              <span className="font-mono text-xs text-gray-400">{allCollections.length} TOTAL</span>
            </div>

            {allCollectionsQuery.isLoading ? (
              <div className="border border-black p-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
              </div>
            ) : allCollections.length === 0 ? (
              <div className="border border-black p-12 text-center">
                <div className="font-mono text-xs uppercase tracking-widest text-gray-400">No collections created yet</div>
              </div>
            ) : (
              <div className="border border-black overflow-x-auto" style={{ boxShadow: "6px 6px 0px #000" }}>
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-black bg-[#F5F5F5]">
                      {["Collection", "Slug", "Visibility", "Created", "Link"].map((h) => (
                        <th key={h} className={`px-4 py-3 font-mono text-xs uppercase tracking-widest ${h === "Link" ? "text-right" : "text-left"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allCollections.map((col) => (
                      <tr key={col.id} className="border-b border-black/10 last:border-b-0 hover:bg-[#F5F5F5] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm">{col.title}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">/u/{col.slug}</td>
                        <td className="px-4 py-3">
                          {col.isPublic ? (
                            <span className="lh-tag-green" style={{ fontSize: "0.6rem" }}>PUBLIC</span>
                          ) : (
                            <span className="lh-tag" style={{ fontSize: "0.6rem" }}>PRIVATE</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(col.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {col.isPublic && (
                            <a href={`${PUBLIC_BASE_URL}/u/${col.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-400 hover:text-black transition-colors">
                              VIEW ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
