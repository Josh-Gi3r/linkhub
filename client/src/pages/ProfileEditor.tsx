import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PUBLIC_BASE_URL } from "@/const";
import DashboardShell from "@/components/DashboardShell";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { PRESET_LINKS } from "../../../shared/presetLinks";
import { ExternalLink, GripVertical, Plus, Pencil, Trash2, X, Check, QrCode, CreditCard, Smartphone, Sparkles } from "lucide-react";
import QRWithLogo, { type QRWithLogoHandle } from "@/components/QRWithLogo";
import { LinkModal } from "@/components/LinkModal";
import { LinkIcon } from "@/components/LinkIcon";
import type { IconType } from "../../../shared/presetLinks";
import DigitalBusinessCard, { type DigitalBusinessCardHandle } from "@/components/DigitalBusinessCard";
import AppLogo from "@/components/AppLogo";
import AvatarCropModal from "@/components/AvatarCropModal";

// ── Types ─────────────────────────────────────────────────────────────────────
type LinkItem = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  iconType: string | null;
  sortOrder: number;
  isActive: boolean;
};

// ── Inline link edit row ──────────────────────────────────────────────────────
function SortableLinkRow({
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : "auto",
      }}
      className={`flex items-center gap-2 px-3 py-2.5 bg-white border-b border-black/10 last:border-0 group ${
        !link.isActive ? "opacity-50" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={14} />
      </button>
      <button
        onClick={() => onToggle(link.id, !link.isActive)}
        className={`w-7 h-4 shrink-0 border border-black flex items-center justify-center transition-colors ${
          link.isActive ? "bg-[#00D26A]" : "bg-white"
        }`}
        title={link.isActive ? "Disable" : "Enable"}
      >
        {link.isActive && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-xs truncate">{link.title}</div>
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

// ── Link edit modal ───────────────────────────────────────────────────────────
function LinkEditModal({
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

  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => { toast.success("Link added"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => { toast.success("Link updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;
    if (isNew) {
      createMutation.mutate({ title: title.trim(), url: url.trim(), description: description.trim() });
    } else {
      updateMutation.mutate({ id: link!.id, title: title.trim(), url: url.trim(), description: description.trim() });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
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
        </div>
        <div className="px-5 py-4 border-t border-black flex justify-end gap-3">
          <button onClick={onClose} className="lh-btn-outline px-5 py-2">CANCEL</button>
          <button onClick={handleSave} disabled={!title.trim() || !url.trim() || isPending} className="lh-btn-primary px-5 py-2 disabled:opacity-50" style={{ boxShadow: "3px 3px 0px #00D26A" }}>
            {isPending ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Phone preview ─────────────────────────────────────────────────────────────
function PhonePreview({
  displayName,
  jobTitle,
  bio,
  avatarSrc,
  links,
  slug,
}: {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatarSrc: string;
  links: LinkItem[];
  slug: string;
}) {
  const [primaryOpen, setPrimaryOpen] = useState(true);
  const [personalOpen, setPersonalOpen] = useState(true);
  const GREEN = "#00D26A";
  const activeLinks = links.filter((l) => l.isActive);
  const COMPANY_URLS = new Set(
    PRESET_LINKS.filter((p) => p.isCompany && p.url).map((p) => p.url)
  );
  const primaryLinks = activeLinks.filter((l) => COMPANY_URLS.has(l.url));
  const personalLinks = activeLinks.filter((l) => !COMPANY_URLS.has(l.url));
  const firstName = (displayName || "User").split(" ")[0];

  return (
    <div className="flex flex-col items-center">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-3">LIVE PREVIEW</div>
      <div
        className="relative border-2 border-black overflow-hidden"
        style={{ width: 280, height: 560, boxShadow: "6px 6px 0px #000", background: "linear-gradient(160deg, #1a1a1a 0%, #111 55%, #0d0d0d 100%)" }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black z-10" style={{ borderRadius: "0 0 8px 8px" }} />
        <div className="absolute inset-0 overflow-y-auto" style={{ paddingTop: 20 }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <AppLogo height={14} />
            <span className="font-mono text-[8px] text-gray-600">QR</span>
          </div>
          {/* Profile header */}
          <div className="flex flex-col items-center text-center px-4 pt-4 pb-3">
            <div
              className="w-14 h-14 rounded-full overflow-hidden mb-2.5"
              style={{ border: `2px solid ${GREEN}`, boxShadow: `0 0 14px rgba(0,210,106,0.2)` }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-xl" style={{ background: GREEN, color: "#000" }}>
                  {(displayName || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="font-black text-sm text-white tracking-tight leading-tight">{displayName || "Your Name"}</div>
            {jobTitle && (
              <div className="font-mono text-[8px] uppercase tracking-widest mt-0.5" style={{ color: GREEN }}>{jobTitle}</div>
            )}
            {bio && (
              <div className="font-mono text-[8px] text-gray-400 mt-1 leading-relaxed max-w-[200px]">
                {bio.slice(0, 70)}{bio.length > 70 ? "..." : ""}
              </div>
            )}
            <div className="w-8 h-0.5 mt-3" style={{ background: GREEN }} />
          </div>
          {/* Links */}
          <div className="px-3 pb-6 flex flex-col gap-1">
            {activeLinks.length === 0 ? (
              <div className="text-center py-6">
                <span className="font-mono text-[9px] text-gray-600 uppercase">No active links</span>
              </div>
            ) : (
              <>
                {/* Company links section */}
                {primaryLinks.length > 0 && (
                  <div className="mb-1">
                    <button
                      onClick={() => setPrimaryOpen((v) => !v)}
                      className="w-full flex items-center gap-1.5 py-1.5 px-1"
                      style={{ background: "transparent", border: "none" }}
                    >
                      <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ background: GREEN }}>
                        <span className="font-mono text-[5px] font-black leading-none text-black">S</span>
                      </div>
                      <span className="font-mono text-[7px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-left">Company Links</span>
                      <span className="font-mono text-[7px] text-gray-600 mr-0.5">{primaryLinks.length}</span>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ transform: primaryOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#555" }}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                      </svg>
                    </button>
                    {primaryOpen && (
                      <div className="flex flex-col gap-1.5 mt-0.5">
                        {primaryLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-2 px-3 py-2"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <LinkIcon iconType={(link.iconType as IconType) ?? "link"} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[9px] text-white truncate tracking-wide">{link.title}</div>
                              {link.description && (
                                <div className="font-mono text-[7px] text-gray-500 truncate">{link.description}</div>
                              )}
                            </div>
                            <ExternalLink size={8} style={{ color: "#555", flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Divider */}
                {primaryLinks.length > 0 && personalLinks.length > 0 && (
                  <div className="my-0.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
                )}
                {/* Personal section */}
                {personalLinks.length > 0 && (
                  <div className="mb-1">
                    <button
                      onClick={() => setPersonalOpen((v) => !v)}
                      className="w-full flex items-center gap-1.5 py-1.5 px-1"
                      style={{ background: "transparent", border: "none" }}
                    >
                      <div className="w-3 h-3 flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <span className="font-mono text-[5px] font-black leading-none text-gray-400">✦</span>
                      </div>
                      <span className="font-mono text-[7px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-left">{firstName}'s Links</span>
                      <span className="font-mono text-[7px] text-gray-600 mr-0.5">{personalLinks.length}</span>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ transform: personalOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#555" }}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                      </svg>
                    </button>
                    {personalOpen && (
                      <div className="flex flex-col gap-1.5 mt-0.5">
                        {personalLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-2 px-3 py-2"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <LinkIcon iconType={(link.iconType as IconType) ?? "link"} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[9px] text-white truncate tracking-wide">{link.title}</div>
                              {link.description && (
                                <div className="font-mono text-[7px] text-gray-500 truncate">{link.description}</div>
                              )}
                            </div>
                            <ExternalLink size={8} style={{ color: "#555", flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="text-center pb-4">
            <span className="font-mono text-[7px] text-gray-700 uppercase tracking-widest">POWERED BY LINKHUB</span>
          </div>
        </div>
      </div>
      {slug && (
        <a href={`/u/${slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 font-mono text-xs text-gray-500 hover:text-black transition-colors underline underline-offset-2">
          Open live page
        </a>
      )}
    </div>
  );
}

// ── QR Preview panel ──────────────────────────────────────────────────────────
function QRPreview({ profileUrl, displayName, slug }: { profileUrl: string; displayName: string; slug: string }) {
  const qrRef = useRef<QRWithLogoHandle>(null);
  if (!slug) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-3">QR CODE</div>
        <div className="border border-dashed border-black/20 p-8 text-center">
          <div className="font-mono text-xs text-gray-400">Set a profile slug to generate your QR code</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">QR CODE</div>
      <div className="p-4 border border-black bg-white" style={{ boxShadow: "4px 4px 0px #000" }}>
        <QRWithLogo ref={qrRef} value={profileUrl} size={220} logoVariant="dark-square" />
      </div>
      <div className="text-center">
        <div className="font-bold text-sm uppercase tracking-wide">{displayName || "Your Name"}</div>
        <div className="font-mono text-[10px] text-gray-400 mt-1">{profileUrl}</div>
      </div>
      <button
        onClick={() => qrRef.current?.downloadPNG(`linkhub-qr-${slug}.png`)}
        className="lh-btn-primary px-6 py-2 text-xs flex items-center gap-2"
        style={{ boxShadow: "3px 3px 0px #00D26A" }}
      >
        <QrCode size={12} /> DOWNLOAD QR PNG
      </button>
    </div>
  );
}

// ── Business Card Preview panel ───────────────────────────────────────────────
function CardPreview({
  profileUrl,
  displayName,
  jobTitle,
  avatarUrl,
  slug,
}: {
  profileUrl: string;
  displayName: string;
  jobTitle: string;
  avatarUrl: string;
  slug: string;
}) {
  const cardRef = useRef<DigitalBusinessCardHandle>(null);
  const applePassMutation = trpc.profile.appleWalletPass.useMutation();
  const googleWalletMutation = trpc.profile.googleWalletUrl.useMutation();

  const handleAppleWallet = async () => {
    try {
      const result = await applePassMutation.mutateAsync();
      const bytes = Uint8Array.from(atob(result.pkpassBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.apple.pkpass" });
      const a = document.createElement("a");
      a.download = `linkhub-${slug}.pkpass`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Apple Wallet: ${msg}`);
    }
  };

  const handleGoogleWallet = async () => {
    try {
      const result = await googleWalletMutation.mutateAsync();
      window.open(result.addToWalletUrl, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Google Wallet: ${msg}`);
    }
  };

  if (!slug) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-3">BUSINESS CARD</div>
        <div className="border border-dashed border-black/20 p-8 text-center">
          <div className="font-mono text-xs text-gray-400">Set a profile slug to generate your card</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">BUSINESS CARD</div>
      <div className="border border-black" style={{ boxShadow: "4px 4px 0px #00D26A" }}>
        <DigitalBusinessCard
          ref={cardRef}
          displayName={displayName || "Your Name"}
          jobTitle={jobTitle}
          profileUrl={profileUrl}
          width={340}
        />
      </div>
      {/* Download PNG */}
      <button
        onClick={() => cardRef.current?.downloadPNG(`lh-card-${slug}.png`)}
        className="lh-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
        style={{ boxShadow: "3px 3px 0px #00D26A" }}
      >
        <CreditCard size={12} /> DOWNLOAD CARD PNG
      </button>

      {/* Wallet buttons */}
      <div className="w-full flex flex-col gap-2">
        <button
          onClick={handleAppleWallet}
          disabled={applePassMutation.isPending}
          className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ background: "#000", color: "#fff" }}
        >
          <Smartphone size={12} />
          {applePassMutation.isPending ? "GENERATING..." : "SAVE TO APPLE WALLET"}
        </button>
        <button
          onClick={handleGoogleWallet}
          disabled={googleWalletMutation.isPending}
          className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ background: "#fff", color: "#000" }}
        >
          <Smartphone size={12} />
          {googleWalletMutation.isPending ? "GENERATING..." : "ADD TO GOOGLE WALLET"}
        </button>
        <div className="font-mono text-[9px] text-gray-400 text-center leading-relaxed">
          Requires Apple Developer certificate + Google Wallet API credentials.
        </div>
      </div>
    </div>
  );
}

// ── Onboarding welcome popup (shown once on first profile save) ──
function WelcomePopup({ onClose }: { onClose: () => void }) {
  const GREEN = "#00D26A";
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4">
      <div
        className="bg-white border-2 border-black w-full max-w-md"
        style={{ boxShadow: "10px 10px 0px #00D26A" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b-2 border-black flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0"
            style={{ background: GREEN }}
          >
            <Sparkles size={18} color="#000" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">WELCOME TO</div>
            <div className="font-black text-lg uppercase tracking-tight leading-tight">LinkHub</div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-black">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="font-mono text-sm text-gray-700 leading-relaxed">
            Your profile has been created and your <strong>company links</strong> have been automatically added.
          </p>
          <div className="border border-black p-4 flex flex-col gap-2.5" style={{ background: "#F9F9F9" }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">What's been set up for you</div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 mt-1.5 shrink-0" style={{ background: GREEN }} />
              <span className="font-mono text-xs text-gray-700">company links pre-loaded in your profile</span>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 mt-1.5 shrink-0" style={{ background: GREEN }} />
              <span className="font-mono text-xs text-gray-700">Your public page is live at <code className="text-black font-bold">/u/{'{your-slug}'}</code></span>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 mt-1.5 shrink-0" style={{ background: GREEN }} />
              <span className="font-mono text-xs text-gray-700">QR code and digital business card ready to share</span>
            </div>
          </div>
          <p className="font-mono text-xs text-gray-500 leading-relaxed">
            Add your personal links below, toggle any links on or off, and drag to reorder. Your changes save instantly.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black">
          <button
            onClick={onClose}
            className="w-full py-3 font-mono text-sm font-bold uppercase tracking-widest text-black border-2 border-black transition-all hover:bg-black hover:text-white"
            style={{ boxShadow: "3px 3px 0px #00D26A" }}
          >
            GET STARTED
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileEditor() {
  const { user } = useAuth();
  const profileQuery = trpc.profile.mine.useQuery();
  const profile = profileQuery.data;

  // ── Form state ────────────────────────────────────────────────────────────
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null); // source for crop modal
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Preview tab ───────────────────────────────────────────────────────────
  const [previewTab, setPreviewTab] = useState<"phone" | "qr" | "card">("phone");

  // ── Links ─────────────────────────────────────────────────────────────────
  const linksQuery = trpc.links.mine.useQuery();
  const [localLinks, setLocalLinks] = useState<LinkItem[]>([]);
  const [editingLink, setEditingLink] = useState<LinkItem | null | undefined>(undefined);

  // ── Preset links ──────────────────────────────────────────────────────────
  const [showPresets, setShowPresets] = useState(false);
  const [showMyLinks, setShowMyLinks] = useState(true);

  // ── Onboarding popup ──────────────────────────────────────────────────────
  const [showWelcome, setShowWelcome] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation();
  const upsertMutation = trpc.profile.save.useMutation({
    onSuccess: (data) => {
      toast.success("Profile saved");
      profileQuery.refetch();
      linksQuery.refetch();
      setAvatarPreview(null);
      // Show welcome popup on first-ever profile creation
      if ((data as { isNew?: boolean }).isNew) {
        setShowWelcome(true);
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const reorderMutation = trpc.links.reorder.useMutation();
  const toggleMutation = trpc.links.update.useMutation({ onSuccess: () => linksQuery.refetch() });
  const deleteMutation = trpc.links.delete.useMutation({ onSuccess: () => linksQuery.refetch() });
  const addPresetMutation = trpc.links.create.useMutation({ onSuccess: () => linksQuery.refetch() });

  // ── Sensors ───────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Sync profile data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setSlug(profile.slug ?? "");
      setDisplayName(profile.displayName ?? user?.name ?? "");
      setJobTitle((profile as { jobTitle?: string | null }).jobTitle ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
    } else if (user) {
      setDisplayName(user.name ?? "");
      setSlug(
        (user.name ?? "user")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 32)
      );
    }
  }, [profile, user]);

  // ── Sync links ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (linksQuery.data) setLocalLinks(linksQuery.data as LinkItem[]);
  }, [linksQuery.data]);

  // ── Avatar file handling ──────────────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected after cancel
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Open crop modal instead of setting preview directly
      setRawImageSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ── Drag end ──────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = localLinks.findIndex((l) => l.id === active.id);
      const newIndex = localLinks.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(localLinks, oldIndex, newIndex);
      setLocalLinks(reordered);
      reorderMutation.mutate({ orderedIds: reordered.map((l) => l.id) });
    },
    [localLinks, reorderMutation]
  );

  const handleToggle = (id: number, val: boolean) => {
    setLocalLinks((prev) => prev.map((l) => (l.id === id ? { ...l, isActive: val } : l)));
    toggleMutation.mutate({ id, isActive: val });
  };

  const handleDelete = (id: number) => {
    setLocalLinks((prev) => prev.filter((l) => l.id !== id));
    deleteMutation.mutate({ id });
  };

  const addedUrls = new Set(localLinks.map((l) => l.url));
  const handleAddPreset = (preset: (typeof PRESET_LINKS)[0]) => {
    addPresetMutation.mutate({ title: preset.title, url: preset.url, description: preset.description });
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!slug) return;
    let finalAvatarUrl = avatarUrl;
    if (avatarPreview) {
      try {
        const mimeType = avatarPreview.split(";")[0].replace("data:", "");
        const base64 = avatarPreview.split(",")[1] ?? avatarPreview;
        const result = await uploadAvatarMutation.mutateAsync({ base64, mimeType });
        finalAvatarUrl = result.url;
        setAvatarUrl(result.url);
      } catch {
        toast.error("Failed to upload avatar");
        return;
      }
    }
    upsertMutation.mutate({
      slug,
      displayName: displayName || undefined,
      jobTitle: jobTitle || undefined,
      bio: bio || undefined,
      avatarUrl: finalAvatarUrl || undefined,
    });
  };

  const isSaving = uploadAvatarMutation.isPending || upsertMutation.isPending;
  const displayAvatar = avatarPreview ?? avatarUrl;
  // Always use the canonical public domain for QR codes and business cards
  const publicUrl = slug ? `${PUBLIC_BASE_URL}/u/${slug}` : "";

  const presetsByCategory = PRESET_LINKS.reduce<Record<string, typeof PRESET_LINKS>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <DashboardShell>
      {showWelcome && <WelcomePopup onClose={() => setShowWelcome(false)} />}
      {rawImageSrc && (
        <AvatarCropModal
          imageSrc={rawImageSrc}
          onConfirm={(cropped) => {
            setAvatarPreview(cropped);
            setAvatarUrl("");
            setRawImageSrc(null);
          }}
          onCancel={() => setRawImageSrc(null)}
        />
      )}
      <div className="flex h-full min-h-screen">
        {/* ── LEFT: Edit panel ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-black" style={{ maxWidth: 520 }}>
          <span className="lh-tag-green mb-2 block">PROFILE EDITOR</span>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-6">BUILD YOUR PROFILE</h1>

          {/* Avatar */}
          <div className="mb-6">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-2">Photo</label>
            <div className="flex items-center gap-4">
              <button onClick={handleAvatarClick} className="relative group shrink-0" title="Click to upload photo">
                <div className="w-20 h-20 border-2 border-black overflow-hidden flex items-center justify-center" style={{ boxShadow: "3px 3px 0px #00D26A" }}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" onError={() => { setAvatarUrl(""); setAvatarPreview(null); }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-2xl" style={{ background: "#00D26A", color: "#000" }}>
                      {(displayName || user?.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-mono text-[9px] text-white uppercase tracking-widest">CHANGE</span>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              <div className="flex-1">
                <div className="font-mono text-xs text-gray-500 mb-1">Click the photo to upload</div>
                <div className="font-mono text-[10px] text-gray-400">JPG, PNG, WebP — max 5MB</div>
                {avatarPreview && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-[10px] text-[#00D26A]">New photo ready</span>
                    <button onClick={() => setAvatarPreview(null)} className="font-mono text-[10px] text-gray-400 hover:text-black">x remove</button>
                  </div>
                )}
                <input className="lh-input mt-2 text-xs py-1.5" placeholder="Or paste image URL..." value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setAvatarPreview(null); }} />
              </div>
            </div>
          </div>

          {/* Slug */}
          <div className="mb-4">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Public URL *</label>
            <div className="flex items-center border border-black focus-within:shadow-[3px_3px_0px_#00D26A]">
              <span className="px-2 py-2 bg-[#F5F5F5] font-mono text-[10px] text-gray-500 border-r border-black shrink-0">/u/</span>
              <input
                className="flex-1 px-3 py-2 font-mono text-sm outline-none bg-white"
                placeholder="your-name"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
            </div>
          </div>

          {/* Display name */}
          <div className="mb-4">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Display Name</label>
            <input className="lh-input" placeholder="Your full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          {/* Job title */}
          <div className="mb-4">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Job Title</label>
            <input className="lh-input" placeholder="e.g. Creative Director" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={128} />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Bio</label>
            <textarea className="lh-input resize-none" rows={2} placeholder="Short description about yourself or your role..." value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            <p className="font-mono text-[10px] text-gray-400 mt-0.5">{bio.length}/500</p>
          </div>

          {/* Links section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="font-mono text-xs font-bold uppercase tracking-widest">Links</label>
              <button onClick={() => setEditingLink(null)} className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 border border-black bg-black text-white hover:bg-[#00D26A] hover:text-black transition-colors uppercase">
                <Plus size={10} /> ADD LINK
              </button>
            </div>

            {linksQuery.isLoading ? (
              <div className="border border-black p-4 text-center">
                <div className="font-mono text-xs text-gray-400 animate-pulse">Loading links...</div>
              </div>
            ) : (
              <div className="space-y-2">

                {/* ── Company Links accordion ──────────────────────────────── */}
                <div className="border border-black" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <button
                    onClick={() => setShowPresets((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-[#00D26A] border border-black flex items-center justify-center shrink-0">
                        <span className="font-mono text-[8px] font-black leading-none">S</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Company Links</span>
                      <span className="font-mono text-[9px] text-gray-400">
                        ({localLinks.filter((l) => addedUrls.has(l.url) && PRESET_LINKS.some((p) => p.isCompany && p.url === l.url)).length})
                      </span>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform shrink-0 ${showPresets ? "rotate-180" : ""}`}>
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                  </button>
                  {showPresets && (
                    <div className="border-t border-black">
                      {(() => {
                        const primaryLinks = localLinks.filter((l) => PRESET_LINKS.some((p) => p.isCompany && p.url === l.url));
                        return primaryLinks.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <div className="font-mono text-[10px] text-gray-400">No company links added yet.</div>
                            <div className="mt-3 pt-3 border-t border-black/10">
                              <div className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-2">Add from presets</div>
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {PRESET_LINKS.filter((p) => p.isCompany).map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleAddPreset(p)}
                                    disabled={addPresetMutation.isPending}
                                    className="font-mono text-[9px] px-2 py-1 border border-black bg-white hover:bg-[#00D26A] transition-colors uppercase tracking-wide"
                                  >
                                    + {p.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          primaryLinks.map((link) => (
                            <SortableLinkRow key={link.id} link={link} onToggle={handleToggle} onEdit={(l) => setEditingLink(l)} onDelete={handleDelete} />
                          ))
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* ── My Links accordion ───────────────────────────────── */}
                <div className="border border-black" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <button
                    onClick={() => setShowMyLinks((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-black flex items-center justify-center shrink-0">
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="3.5" r="2.5" /><path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" /></svg>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest">My Links</span>
                      <span className="font-mono text-[9px] text-gray-400">
                        ({localLinks.filter((l) => !PRESET_LINKS.some((p) => p.isCompany && p.url === l.url)).length})
                      </span>
                    </div>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform shrink-0 ${showMyLinks ? "rotate-180" : ""}`}>
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                    </svg>
                  </button>
                  {showMyLinks && (
                    <div className="border-t border-black">
                      {(() => {
                        const myLinks = localLinks.filter((l) => !PRESET_LINKS.some((p) => p.isCompany && p.url === l.url));
                        return myLinks.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <div className="font-mono text-[10px] text-gray-400">No personal links yet.</div>
                            <button
                              onClick={() => setEditingLink(null)}
                              className="mt-2 font-mono text-[9px] px-3 py-1.5 border border-black bg-black text-white hover:bg-[#00D26A] hover:text-black transition-colors uppercase"
                            >
                              + Add your first link
                            </button>
                          </div>
                        ) : (
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext
                              items={myLinks.map((l) => l.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {myLinks.map((link) => (
                                <SortableLinkRow key={link.id} link={link} onToggle={handleToggle} onEdit={(l) => setEditingLink(l)} onDelete={handleDelete} />
                              ))}
                            </SortableContext>
                          </DndContext>
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={!slug || isSaving} className="w-full lh-btn-primary py-3 disabled:opacity-50 text-sm" style={{ boxShadow: "4px 4px 0px #00D26A" }}>
            {isSaving ? "SAVING..." : "SAVE PROFILE"}
          </button>
          {profile && (
            <div className="mt-3 text-center font-mono text-[10px] text-gray-400">
              Last saved: {new Date(profile.updatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview panel ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col flex-1 bg-[#F5F5F5] border-l border-black sticky top-0 h-screen overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-black shrink-0">
            {(["phone", "qr", "card"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPreviewTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  previewTab === tab ? "bg-black text-[#00D26A]" : "bg-[#F5F5F5] text-gray-500 hover:bg-white"
                }`}
              >
                {tab === "phone" && <Smartphone size={11} />}
                {tab === "qr" && <QrCode size={11} />}
                {tab === "card" && <CreditCard size={11} />}
                {tab === "phone" ? "PREVIEW" : tab === "qr" ? "QR CODE" : "CARD"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto flex items-start justify-center pt-10 px-6 pb-10">
            {previewTab === "phone" && (
              <PhonePreview displayName={displayName} jobTitle={jobTitle} bio={bio} avatarSrc={displayAvatar} links={localLinks} slug={slug} />
            )}
            {previewTab === "qr" && (
              <QRPreview profileUrl={publicUrl} displayName={displayName} slug={slug} />
            )}
            {previewTab === "card" && (
              <CardPreview profileUrl={publicUrl} displayName={displayName} jobTitle={jobTitle} avatarUrl={displayAvatar} slug={slug} />
            )}
          </div>
        </div>
      </div>

      {/* Link edit modal */}
      {editingLink !== undefined && (
        <LinkModal link={editingLink} onClose={() => setEditingLink(undefined)} onSaved={() => linksQuery.refetch()} />
      )}
    </DashboardShell>
  );
}
