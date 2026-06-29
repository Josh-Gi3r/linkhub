import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PUBLIC_BASE_URL } from "@/const";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QRCode from "react-qr-code";
import { PRESET_LINKS, IconType } from "../../../shared/presetLinks";
import { LinkIcon } from "@/components/LinkIcon";

type Link = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  iconType: string | null;
  sortOrder: number;
  isActive: boolean;
};

import { LinkModal } from "@/components/LinkModal";

// ─── Sortable Link Row ────────────────────────────────────────────────────────
function SortableLink({
  link,
  onEdit,
  onDelete,
  onToggle,
}: {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, isActive: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border-b border-black last:border-b-0 group ${!link.isActive ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-black cursor-grab active:cursor-grabbing shrink-0 touch-none"
        title="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>
      <button
        onClick={() => onToggle(link.id, !link.isActive)}
        title={link.isActive ? "Disable link" : "Enable link"}
        className={`w-8 h-5 border border-black shrink-0 flex items-center justify-center transition-colors ${link.isActive ? "bg-[#00D26A]" : "bg-white"}`}
      >
        <span className="font-mono text-xs font-bold">{link.isActive ? "ON" : "\u2014"}</span>
      </button>
      <div className="shrink-0">
        <LinkIcon iconType={link.iconType ?? "link"} size={32} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{link.title}</div>
        <div className="font-mono text-xs text-gray-400 truncate">{link.url}</div>
        {link.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{link.description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(link)}
          className="px-3 py-1 border border-black font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
        >
          EDIT
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="px-3 py-1 border border-black font-mono text-xs font-bold uppercase hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
        >
          \u00d7
        </button>
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    canvas.width = 400;
    canvas.height = 400;
    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement("a");
      a.download = `qr-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border border-black w-full max-w-sm"
        style={{ boxShadow: "8px 8px 0px #00D26A" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black">
          <h2 className="font-bold text-sm uppercase tracking-widest">QR CODE</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black font-mono text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-8 flex flex-col items-center gap-6">
          <div className="p-4 border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
            <QRCode id="qr-code-svg" value={url} size={200} fgColor="#000000" bgColor="#FFFFFF" />
          </div>
          <div className="text-center">
            <div className="font-bold text-sm uppercase tracking-wide mb-1">{title}</div>
            <div className="font-mono text-xs text-gray-400 break-all">{url}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black flex flex-col gap-2">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 lh-btn-outline py-2">
              CLOSE
            </button>
            <button onClick={handleDownload} className="flex-1 lh-btn-accent py-2">
              DOWNLOAD PNG
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-2 border border-black font-mono text-xs font-bold uppercase tracking-widest transition-colors"
            style={copied ? { background: "#00D26A", color: "#000" } : { background: "#fff", color: "#000" }}
          >
            {copied ? "COPIED!" : "COPY LINK"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CollectionEditor() {
  const params = useParams<{ id: string }>();
  const collectionId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [editingLink, setEditingLink] = useState<Link | null | undefined>(undefined);
  const [showQR, setShowQR] = useState(false);
  const [localLinks, setLocalLinks] = useState<Link[] | null>(null);
  const [showPresets, setShowPresets] = useState(true);

  // In the simplified model, we just use the collectionId from the URL
  const collection = { id: collectionId, title: "My Links", slug: String(collectionId), isPublic: true };

  // Use allByCollection so inactive placeholder links (e.g. personal LinkedIn, X) are visible in the editor
  const linksQuery = trpc.links.allByCollection.useQuery(
    { collectionId },
    { enabled: !!collectionId }
  );
  const utils = trpc.useUtils();

  const displayLinks = localLinks ?? ((linksQuery.data as Link[]) ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorderMutation = trpc.links.reorder.useMutation({
    onError: () => {
      setLocalLinks(null);
      utils.links.allByCollection.invalidate({ collectionId });
    },
  });

  const deleteLink = trpc.links.delete.useMutation({
    onSuccess: () => {
      setLocalLinks(null);
      utils.links.allByCollection.invalidate({ collectionId });
      toast.success("Link deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleLink = trpc.links.update.useMutation({
    onSuccess: () => {
      utils.links.allByCollection.invalidate({ collectionId });
    },
    onError: (e) => toast.error(e.message),
  });

  const addPresetLink = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.allByCollection.invalidate({ collectionId });
      toast.success("Link added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = displayLinks.findIndex((l) => l.id === active.id);
      const newIndex = displayLinks.findIndex((l) => l.id === over.id);
      const newOrder = arrayMove(displayLinks, oldIndex, newIndex);
      setLocalLinks(newOrder);
      reorderMutation.mutate({ orderedIds: newOrder.map((l) => l.id) });
    },
    [displayLinks, reorderMutation]
  );

  const publicUrl = `${PUBLIC_BASE_URL}/u/${collection?.slug ?? ""}`;

  // Group presets by category
  const presetsByCategory = PRESET_LINKS.reduce(
    (acc, l) => {
      if (!acc[l.category]) acc[l.category] = [];
      acc[l.category].push(l);
      return acc;
    },
    {} as Record<string, typeof PRESET_LINKS>
  );

  if (!collectionId) {
    return (
      <DashboardShell>
        <div className="p-8 text-center">
          <p className="font-mono text-sm uppercase text-gray-500">Collection not found.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="lh-btn-outline mt-4 px-6 py-2"
          >
            BACK
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 md:p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← BACK TO DASHBOARD
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <span className="lh-tag mb-2 block">COLLECTION EDITOR</span>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              {collection?.title ?? "Loading..."}
            </h1>
            {collection && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="font-mono text-xs text-gray-400">/c/{collection.slug}</span>
                {collection.isPublic ? (
                  <span className="lh-tag-green" style={{ fontSize: "0.6rem" }}>
                    PUBLIC
                  </span>
                ) : (
                  <span className="lh-tag" style={{ fontSize: "0.6rem" }}>
                    PRIVATE
                  </span>
                )}
                {collection.isPublic && (
                  <a
                    href={`/u/${collection.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#00D26A] hover:underline"
                  >
                    VIEW PUBLIC PAGE ↗
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(true)}
              className="lh-btn-outline flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="9" width="1.5" height="1.5" fill="currentColor" />
                <rect x="11.5" y="9" width="1.5" height="1.5" fill="currentColor" />
                <rect x="9" y="11.5" width="1.5" height="1.5" fill="currentColor" />
                <rect x="11.5" y="11.5" width="1.5" height="1.5" fill="currentColor" />
              </svg>
              QR CODE
            </button>
            <button
              onClick={() => setEditingLink(null)}
              className="lh-btn-primary flex items-center gap-2"
              style={{ boxShadow: "4px 4px 0px #00D26A" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1V11M1 6H11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
              ADD LINK
            </button>
          </div>
        </div>

        {/* Links list */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-widest">LINKS</h2>
          <span className="font-mono text-xs text-gray-400">
            {displayLinks.length} LINKS
            {displayLinks.length > 1 ? " — DRAG TO REORDER" : ""}
          </span>
        </div>

        {linksQuery.isLoading ? (
          <div className="border border-black p-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
          </div>
        ) : displayLinks.length === 0 ? (
          <div
            className="border border-black p-12 text-center"
            style={{ boxShadow: "6px 6px 0px #000" }}
          >
            <div className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-4">
              NO LINKS YET
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Add your first link, or pick from the presets below.
            </p>
            <button
              onClick={() => setEditingLink(null)}
              className="lh-btn-accent px-6 py-3"
            >
              ADD FIRST LINK
            </button>
          </div>
        ) : (
          <div className="border border-black" style={{ boxShadow: "6px 6px 0px #000" }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayLinks.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {displayLinks.map((link) => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onEdit={(l) => setEditingLink(l)}
                    onDelete={(id) => {
                      if (confirm("Delete this link?")) deleteLink.mutate({ id });
                    }}
                    onToggle={(id, isActive) => toggleLink.mutate({ id, isActive })}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ── Preset Links ─────────────────────────────────────────────────── */}
        <div className="mt-12">
          <button
            onClick={() => setShowPresets((v) => !v)}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 bg-[#00D26A] border border-black flex items-center justify-center"
              >
                <span className="font-mono text-xs font-black">S</span>
              </div>
              <h2 className="font-black text-sm uppercase tracking-widest">PRESET LINKS</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-400">
                {showPresets ? "HIDE" : "SHOW"} PRESETS
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform ${showPresets ? "rotate-180" : ""}`}
              >
                <path
                  d="M2 4L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="square"
                />
              </svg>
            </div>
          </button>

          {showPresets && (
            <div className="space-y-4">
              <p className="font-mono text-xs text-gray-400">
                Click <strong>+ ADD</strong> to add a preset link to this collection. Toggle it on/off from the links list above.
              </p>
              {Object.entries(presetsByCategory).map(([category, presets]) => (
                <div key={category}>
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {category}
                  </div>
                  <div
                    className="border border-black"
                    style={{ boxShadow: "4px 4px 0px #000" }}
                  >
                    {presets.map((preset) => {
                      const alreadyAdded = displayLinks.some(
                        (l) => l.url === preset.url
                      );
                      return (
                        <div
                          key={preset.id}
                          className="flex items-center gap-3 p-3 border-b border-black last:border-b-0 hover:bg-[#F5F5F5] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{preset.title}</div>
                            <div className="font-mono text-xs text-gray-400 truncate">
                              {preset.url}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {preset.description}
                            </div>
                          </div>
                          {alreadyAdded ? (
                            <span className="px-3 py-1 font-mono text-xs font-bold uppercase text-gray-400 border border-black/20 shrink-0 bg-[#F5F5F5]">
                              ✓ ADDED
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                addPresetLink.mutate({
                                  title: preset.title,
                                  url: preset.url,
                                  description: preset.description,
                                })
                              }
                              disabled={addPresetLink.isPending}
                              className="px-3 py-1 border border-black font-mono text-xs font-bold uppercase hover:bg-[#00D26A] hover:border-[#00D26A] transition-colors shrink-0 disabled:opacity-50"
                            >
                              + ADD
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Link Modal */}
      {editingLink !== undefined && (
        <LinkModal
          link={editingLink}
          onClose={() => setEditingLink(undefined)}
          onSaved={() => {
            setLocalLinks(null);
            utils.links.allByCollection.invalidate({ collectionId });
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQR && collection && (
        <QRModal
          url={publicUrl}
          title={collection.title}
          onClose={() => setShowQR(false)}
        />
      )}
    </DashboardShell>
  );
}
