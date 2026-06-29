import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink,
  Upload, Users, Link2, Briefcase, Package, Edit2, Check, X,
  QrCode, Smartphone
} from "lucide-react";
import { LinkIcon } from "@/components/LinkIcon";
import AvatarCropModal from "@/components/AvatarCropModal";
import QRWithLogo, { type QRWithLogoHandle } from "@/components/QRWithLogo";

// Brand accent: matches CSS --brand variable
const GREEN = "var(--brand, #22c55e)";
const COMPANY_SLUG = import.meta.env.VITE_COMPANY_SLUG ?? "company";

// ─── Inline editable field ────────────────────────────────────────────────────
function InlineField({
  label,
  value,
  onSave,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="mb-4">
      <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {editing ? (
        <div className="flex gap-2 items-start">
          {multiline ? (
            <textarea
              className="flex-1 border border-black px-3 py-2 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              className="flex-1 border border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            />
          )}
          <button onClick={commit} className="p-2 border border-black hover:bg-black hover:text-white transition-colors">
            <Check size={14} />
          </button>
          <button onClick={cancel} className="p-2 border border-gray-300 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="w-full text-left px-3 py-2 border border-dashed border-gray-300 hover:border-black transition-colors group"
        >
          <span className={`font-mono text-sm ${value ? "text-black" : "text-gray-400"}`}>
            {value || placeholder || "Click to edit"}
          </span>
          <Edit2 size={11} className="inline ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>
      )}
    </div>
  );
}

// ─── Company link row ─────────────────────────────────────────────────────────
type CLinkData = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  iconType: string | null;
  isActive: boolean;
  sortOrder: number;
  category: "main" | "partner" | "product";
};

function CompanyLinkRow({
  link,
  onEdit,
  onDelete,
  onToggle,
}: {
  link: CLinkData;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : link.isActive ? 1 : 0.5, zIndex: isDragging ? 10 : undefined };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 bg-white group"
    >
      <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" {...attributes} {...listeners} />
      <LinkIcon iconType={link.iconType ?? "link"} size={32} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{link.title}</div>
        {link.description && <div className="text-xs text-gray-400 truncate">{link.description}</div>}
        <div className="font-mono text-[10px] text-gray-400 truncate">{link.url.replace(/^https?:\/\//, "")}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 transition-colors" title={link.isActive ? "Hide" : "Show"}>
          {link.isActive ? <Eye size={13} /> : <EyeOff size={13} className="text-gray-400" />}
        </button>
        <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 transition-colors" title="Edit">
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-400 transition-colors" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Team member row ──────────────────────────────────────────────────────────
type TeamMember = {
  id: number;
  userId: number;
  isVisible: boolean;
  sortOrder: number;
  displayName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  slug: string | null;
};

function TeamMemberRow({
  member,
  onRemove,
  onToggle,
}: {
  member: TeamMember;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : member.isVisible ? 1 : 1, zIndex: isDragging ? 10 : undefined };
  const name = member.displayName ?? "Team Member";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 bg-white"
    >
      <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" {...attributes} {...listeners} />
      <div
        className="w-9 h-9 shrink-0 overflow-hidden border border-gray-200"
      >
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-black text-xs"
            style={{ background: GREEN, color: "#000" }}
          >
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{name}</div>
        {member.jobTitle && <div className="text-xs text-gray-400 truncate">{member.jobTitle}</div>}
        {member.slug && (
          <a
            href={`/u/${member.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-gray-400 hover:text-black transition-colors"
          >
            /u/{member.slug} <ExternalLink size={9} className="inline" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 transition-colors" title={member.isVisible ? "Hide" : "Show"}>
          {member.isVisible ? <Eye size={13} /> : <EyeOff size={13} className="text-gray-400" />}
        </button>
        <button onClick={onRemove} className="p-1.5 hover:bg-red-50 text-red-400 transition-colors" title="Remove">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-black bg-white mb-6" style={{ boxShadow: "4px 4px 0px #000" }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-black bg-black text-white">
        {icon}
        <span className="font-mono text-xs font-bold uppercase tracking-widest flex-1">{title}</span>
        {badge && (
          <span
            className="font-mono text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest"
            style={{ background: GREEN, color: "#000" }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Add team member dialog ───────────────────────────────────────────────────
function AddTeamMemberDialog({
  onAdd,
  onClose,
}: {
  onAdd: (slug: string) => void;
  onClose: () => void;
}) {
  const [slug, setSlug] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black w-full max-w-sm" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black">
          <span className="font-mono text-xs font-bold uppercase tracking-widest">Add Team Member</span>
          <button onClick={onClose} className="text-gray-400 hover:text-black font-mono text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Profile Slug</label>
          <div className="flex gap-2">
            <div className="flex items-center border border-black px-2 font-mono text-sm text-gray-400">/u/</div>
            <input
              className="flex-1 border border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="joshua"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && slug) onAdd(slug); if (e.key === "Escape") onClose(); }}
            />
          </div>
          <p className="font-mono text-[10px] text-gray-400 mt-2">Enter the profile slug of the team member to add.</p>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => slug && onAdd(slug)}
            disabled={!slug}
            className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black transition-colors disabled:opacity-40"
            style={{ background: slug ? GREEN : "#fff", color: slug ? "#000" : "#000" }}
          >
            Add Member
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-gray-300 hover:border-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Company link dialog ─────────────────────────────────────────────────────
function CompanyLinkDialog({
  link,
  onSave,
  onClose,
}: {
  link?: CLinkData;
  onSave: (data: { title: string; url: string; description?: string; iconType?: string; isActive?: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(link?.title ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [isActive, setIsActive] = useState(link?.isActive ?? true);

  const canSave = title.trim() && url.trim();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black w-full max-w-md" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black">
          <span className="font-mono text-xs font-bold uppercase tracking-widest">{link ? "Edit Link" : "Add Link"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-black font-mono text-xl leading-none">×</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Title *</label>
            <input
              className="w-full border border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="COMPANY: Example Link Title"
              autoFocus
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">URL *</label>
            <input
              className="w-full border border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Description</label>
            <input
              className="w-full border border-black px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description..."
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="font-mono text-xs uppercase tracking-widest">Visible on public page</span>
          </label>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => canSave && onSave({ title: title.trim(), url: url.trim(), description: description.trim() || undefined, isActive })}
            disabled={!canSave}
            className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black transition-colors disabled:opacity-40"
            style={{ background: canSave ? "#00D26A" : "#fff" }}
          >
            {link ? "Save Changes" : "Add Link"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-gray-300 hover:border-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CompanyBuilder() {
  const utils = trpc.useUtils();

  // Company profile query
  const companyQuery = trpc.company.getForBuilder.useQuery({ slug: COMPANY_SLUG });
  const builderData = companyQuery.data;
  const company = builderData?.company;

  // Links queries per category — use data from getForBuilder directly
  const primaryLinksQ = trpc.company.links.list.useQuery({ slug: COMPANY_SLUG, category: "main" }, { enabled: !!company });
  const partnerLinksQ = trpc.company.links.list.useQuery({ slug: COMPANY_SLUG, category: "partner" }, { enabled: !!company });
  const productLinksQ = trpc.company.links.list.useQuery({ slug: COMPANY_SLUG, category: "product" }, { enabled: !!company });

  // Team query
  const teamQ = trpc.company.team.list.useQuery({ slug: COMPANY_SLUG }, { enabled: !!company });

  // Mutations
  const updateProfile = trpc.company.save.useMutation({
    onSuccess: () => { utils.company.getForBuilder.invalidate(); toast.success("Profile updated"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const uploadAvatar = trpc.company.uploadAvatar.useMutation({
    onSuccess: () => { utils.company.getForBuilder.invalidate(); toast.success("Photo updated"); },
    onError: (e) => toast.error(e.message),
  });

  const createLink = trpc.company.links.create.useMutation({
    onSuccess: () => { utils.company.links.list.invalidate(); toast.success("Link added"); },
    onError: (e) => toast.error(e.message),
  });

  const updateLink = trpc.company.links.update.useMutation({
    onSuccess: () => { utils.company.links.list.invalidate(); toast.success("Link updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteLink = trpc.company.links.delete.useMutation({
    onSuccess: () => { utils.company.links.list.invalidate(); toast.success("Link removed"); },
    onError: (e) => toast.error(e.message),
  });

  const addMember = trpc.company.team.add.useMutation({
    onSuccess: () => { utils.company.team.list.invalidate(); toast.success("Team member added"); },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = trpc.company.team.remove.useMutation({
    onSuccess: () => { utils.company.team.list.invalidate(); toast.success("Team member removed"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMember = trpc.company.team.setVisible.useMutation({
    onSuccess: () => { utils.company.team.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const reorderTeam = trpc.company.team.reorder.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const reorderLinks = trpc.company.links.reorder.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Local UI state
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview tab state
  const [previewTab, setPreviewTab] = useState<"phone" | "qr">("phone");
  const qrRef = useRef<QRWithLogoHandle>(null);

  // Link modal state
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    category: "main" | "partner" | "product";
    link?: CLinkData;
  }>({ open: false, category: "main" });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImageSrc(ev.target?.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = (dataUrl: string) => {
    setShowCrop(false);
    setRawImageSrc(null);
    const [header, base64] = dataUrl.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    uploadAvatar.mutate({ slug: COMPANY_SLUG, base64, mimeType });
  };

  if (companyQuery.isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!builderData || !company) {
    return (
      <DashboardShell>
        <div className="p-8 text-center">
          <p className="font-mono text-sm text-gray-500">Company profile not found. Please contact support.</p>
        </div>
      </DashboardShell>
    );
  }

  const primaryLinks = (primaryLinksQ.data ?? []) as CLinkData[];
  const partnerLinks = (partnerLinksQ.data ?? []) as CLinkData[];
  const productLinks = (productLinksQ.data ?? []) as CLinkData[];
  const teamMembers = (teamQ.data ?? []) as TeamMember[];

  const handleSaveField = (field: "displayName" | "tagline" | "bio" | "avatarUrl", value: string) => {
    updateProfile.mutate({
      slug: COMPANY_SLUG,
      displayName: company.displayName,
      [field]: value,
    });
  };

  const handleLinkSave = (data: {
    title: string;
    url: string;
    description?: string;
    iconType?: string;
    isActive?: boolean;
  }) => {
    if (linkModal.link) {
      updateLink.mutate({ id: linkModal.link.id, ...data });
    } else {
      createLink.mutate({ slug: COMPANY_SLUG, category: linkModal.category, ...data });
    }
    setLinkModal({ open: false, category: "main" });
  };

  const renderLinkSection = (
    title: string,
    icon: React.ReactNode,
    category: "main" | "partner" | "product",
    links: CLinkData[],
    badge?: string
  ) => {
    const handleLinkDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(links, oldIndex, newIndex);
      reorderLinks.mutate({ orderedIds: reordered.map((l) => l.id) });
    };
    return (
      <Section icon={icon} title={title} badge={badge}>
        <div className="flex flex-col gap-2 mb-3">
          {links.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200">
              <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">No links yet</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLinkDragEnd}>
              <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {links.map((link) => (
                  <CompanyLinkRow
                    key={link.id}
                    link={link}
                    onEdit={() => setLinkModal({ open: true, category, link })}
                    onDelete={() => {
                      if (confirm(`Remove "${link.title}"?`)) deleteLink.mutate({ id: link.id });
                    }}
                    onToggle={() => updateLink.mutate({ id: link.id, isActive: !link.isActive })}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <button
          onClick={() => setLinkModal({ open: true, category })}
          className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors"
        >
          <Plus size={13} />
          Add Link
        </button>
      </Section>
    );
  };

  const companyUrl = `${window.location.origin}/c/${COMPANY_SLUG}`;

  return (
    <DashboardShell>
      <div className="flex h-full min-h-screen">
        {/* ── LEFT: Edit panel ─────────────────────────────────────────── */}
        <div className="overflow-y-auto p-8 border-r border-black" style={{ width: 640, minWidth: 640 }}>

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-black text-2xl uppercase tracking-tight">Company Builder</h1>
            <p className="font-mono text-xs text-gray-500 mt-1 uppercase tracking-widest">
              Manage the company profile at{" "}
              <a
                href={`/c/${COMPANY_SLUG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: GREEN }}
              >
                /c/{COMPANY_SLUG}
              </a>
            </p>
          </div>
          <a
            href={`/c/${COMPANY_SLUG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
            View Live
          </a>
        </div>

        {/* Company identity */}
        <Section icon={<Briefcase size={14} />} title="Company Identity">
          {/* Photo */}
          <div className="flex items-start gap-5 mb-5">
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 overflow-hidden border-2 border-black cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                style={{ boxShadow: "3px 3px 0px #000" }}
              >
                {company.avatarUrl ? (
                  <img src={company.avatarUrl} alt="Company logo" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-black text-2xl"
                    style={{ background: GREEN, color: "#000" }}
                  >
                    S
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center border border-black bg-white hover:bg-black hover:text-white transition-colors"
                style={{ boxShadow: "2px 2px 0px #000" }}
              >
                <Upload size={11} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Company Logo</p>
              <p className="text-xs text-gray-400">Click the photo to upload. JPG, PNG, WebP — max 5MB.</p>
            </div>
          </div>

          <InlineField
            label="Display Name"
            value={company.displayName}
            onSave={(v) => handleSaveField("displayName", v)}
            placeholder="Your Company"
          />
          <InlineField
            label="Tagline"
            value={company.tagline ?? ""}
            onSave={(v) => handleSaveField("tagline", v)}
            placeholder="The future of stablecoin payments"
          />
          <InlineField
            label="Bio"
            value={company.bio ?? ""}
            onSave={(v) => handleSaveField("bio", v)}
            placeholder="Short description about the company..."
            multiline
          />
          <div className="mt-2">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Public URL</label>
            <div className="flex items-center border border-dashed border-gray-300 px-3 py-2 bg-gray-50">
              <span className="font-mono text-sm text-gray-400">/c/</span>
              <span className="font-mono text-sm text-black font-bold">{COMPANY_SLUG}</span>
              <span className="font-mono text-[10px] text-gray-400 ml-2">(fixed)</span>
            </div>
          </div>
        </Section>

        {/* Team */}
        <Section icon={<Users size={14} />} title="Team" badge={`${teamMembers.filter((m) => m.isVisible).length} visible`}>
          <div className="flex flex-col gap-2 mb-3">
            {teamMembers.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200">
                <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">No team members yet</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const oldIndex = teamMembers.findIndex((m) => m.id === active.id);
                  const newIndex = teamMembers.findIndex((m) => m.id === over.id);
                  const reordered = arrayMove(teamMembers, oldIndex, newIndex);
                  reorderTeam.mutate({ orderedIds: reordered.map((m) => m.id) });
                }}
              >
                <SortableContext items={teamMembers.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  {teamMembers.map((member) => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      onRemove={() => {
                        if (confirm(`Remove ${member.displayName ?? "this member"} from the team?`)) {
                          removeMember.mutate({ companySlug: COMPANY_SLUG, userId: member.userId });
                        }
                      }}
                      onToggle={() => toggleMember.mutate({ memberId: member.id, isVisible: !member.isVisible })}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
          <button
            onClick={() => setShowAddTeam(true)}
            className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors"
          >
            <Plus size={13} />
            Add Team Member
          </button>
        </Section>

        {/* Primary Links */}
        {renderLinkSection(
          "Main Links",
          <Link2 size={14} />,
          "main",
          primaryLinks,
          "seeded to all users"
        )}

        {/* Partner Links */}
        {renderLinkSection(
          "Partner Links",
          <Briefcase size={14} />,
          "partner",
          partnerLinks
        )}

        {/* Product Links */}
        {renderLinkSection(
          "Product Links",
          <Package size={14} />,
          "product",
          productLinks
        )}
        </div>{/* end left panel */}

        {/* ── RIGHT: Preview panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col flex-1 bg-[#F5F5F5] border-l border-black sticky top-0 h-screen overflow-hidden" style={{ minWidth: 480 }}>
          {/* Tab bar */}
          <div className="flex border-b border-black shrink-0">
            {(["phone", "qr"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPreviewTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  previewTab === tab ? "bg-black text-[#00D26A]" : "bg-[#F5F5F5] text-gray-500 hover:bg-white"
                }`}
              >
                {tab === "phone" ? <Smartphone size={11} /> : <QrCode size={11} />}
                {tab === "phone" ? "PREVIEW" : "QR CODE"}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-y-auto flex items-start justify-center pt-10 px-6 pb-10">
            {previewTab === "phone" && (
              <div className="flex flex-col items-center gap-4">
                {/* Phone mockup */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: 390,
                    height: 780,
                    border: "3px solid #000",
                    borderRadius: 40,
                    background: "#111",
                    boxShadow: "8px 8px 0px #000",
                    flexShrink: 0,
                  }}
                >
                  <div className="absolute inset-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <div className="flex flex-col items-center pt-10 pb-8 px-4">
                      {/* Avatar */}
                      <div className="w-24 h-24 border-2 overflow-hidden mb-3" style={{ borderColor: GREEN }}>
                        {company.avatarUrl ? (
                          <img src={company.avatarUrl} alt="logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-3xl" style={{ background: GREEN, color: "#000" }}>{COMPANY_SLUG[0]?.toUpperCase() ?? "C"}</div>
                        )}
                      </div>
                      {/* Name + tagline */}
                      <div className="font-black text-white text-xl text-center tracking-tight mb-1">{company.displayName}</div>
                      {company.tagline && (
                        <div className="font-mono text-[11px] uppercase tracking-widest text-center mb-2" style={{ color: GREEN }}>{company.tagline}</div>
                      )}
                      <div className="w-10 h-0.5 mb-5" style={{ background: GREEN }} />
                      {/* Company links section */}
                      {primaryLinks.filter(l => l.isActive).length > 0 && (
                        <div className="w-full mb-4">
                          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Company Links</div>
                          <div className="flex flex-col gap-2">
                            {primaryLinks.filter(l => l.isActive).map(link => (
                              <div key={link.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <LinkIcon iconType={link.iconType ?? "link"} size={32} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm text-white truncate">{link.title}</div>
                                </div>
                                <ExternalLink size={11} style={{ color: "#555", flexShrink: 0 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Team section */}
                      {teamMembers.filter(m => m.isVisible).length > 0 && (
                        <div className="w-full mb-4">
                          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Team</div>
                          <div className="flex flex-col gap-2">
                            {teamMembers.filter(m => m.isVisible).map(member => {
                              const initials = (member.displayName ?? "T").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                              return (
                                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                  <div className="w-8 h-8 shrink-0 overflow-hidden" style={{ border: `1px solid ${GREEN}` }}>
                                    {member.avatarUrl ? (
                                      <img src={member.avatarUrl} alt={member.displayName ?? ""} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center font-black text-[9px]" style={{ background: GREEN, color: "#000" }}>{initials}</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-sm text-white truncate">{member.displayName ?? "Team Member"}</div>
                                    {member.jobTitle && <div className="font-mono text-[10px] text-gray-500 truncate">{member.jobTitle}</div>}
                                  </div>
                                  <ExternalLink size={11} style={{ color: "#555", flexShrink: 0 }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Partner links */}
                      {partnerLinks.filter(l => l.isActive).length > 0 && (
                        <div className="w-full mb-4">
                          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Partners</div>
                          <div className="flex flex-col gap-2">
                            {partnerLinks.filter(l => l.isActive).map(link => (
                              <div key={link.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <LinkIcon iconType={link.iconType ?? "link"} size={32} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm text-white truncate">{link.title}</div>
                                </div>
                                <ExternalLink size={11} style={{ color: "#555", flexShrink: 0 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Product links */}
                      {productLinks.filter(l => l.isActive).length > 0 && (
                        <div className="w-full mb-4">
                          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Products</div>
                          <div className="flex flex-col gap-2">
                            {productLinks.filter(l => l.isActive).map(link => (
                              <div key={link.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <LinkIcon iconType={link.iconType ?? "link"} size={32} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm text-white truncate">{link.title}</div>
                                </div>
                                <ExternalLink size={11} style={{ color: "#555", flexShrink: 0 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-center mt-4">
                        <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={`/c/${COMPANY_SLUG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-gray-500 hover:text-black transition-colors underline underline-offset-2"
                >
                  Open live page
                </a>
              </div>
            )}
            {previewTab === "qr" && (
              <div className="flex flex-col items-center gap-4">
                <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">QR CODE</div>
                <QRWithLogo ref={qrRef} value={companyUrl} size={220} logoVariant="dark-square" />
                <button
                  onClick={() => qrRef.current?.downloadPNG(`qr-${COMPANY_SLUG}.png`)}
                  className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors"
                >
                  <QrCode size={12} /> DOWNLOAD QR PNG
                </button>
                <p className="font-mono text-[10px] text-gray-400 text-center">{companyUrl}</p>
              </div>
            )}
          </div>
        </div>{/* end right panel */}
      </div>{/* end flex row */}

      {/* Add team member dialog */}
      {showAddTeam && (
        <AddTeamMemberDialog
          onAdd={(slug) => {
            addMember.mutate({ companySlug: COMPANY_SLUG, userSlug: slug });
            setShowAddTeam(false);
          }}
          onClose={() => setShowAddTeam(false)}
        />
      )}

      {/* Link modal */}
      {linkModal.open && (
        <CompanyLinkDialog
          link={linkModal.link}
          onSave={handleLinkSave}
          onClose={() => setLinkModal({ open: false, category: "main" })}
        />
      )}

      {/* Avatar crop modal */}
      {showCrop && rawImageSrc && (
        <AvatarCropModal
          imageSrc={rawImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => { setShowCrop(false); setRawImageSrc(null); }}
        />
      )}
    </DashboardShell>
  );
}
