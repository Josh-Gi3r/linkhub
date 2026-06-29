import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { IconType } from "../../../shared/presetLinks";
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

/** Personal link types only — company links are managed via the presets section */
export const PERSONAL_LINK_TYPES: {
  value: IconType;
  label: string;
  defaultDescription: string;
  placeholder: string;
}[] = [
  { value: "phone",     label: "Phone",     defaultDescription: "Call me",                    placeholder: "+65 9123 4567" },
  { value: "whatsapp",  label: "WhatsApp",  defaultDescription: "Message me on WhatsApp",     placeholder: "https://wa.me/601234567890" },
  { value: "linkedin",  label: "LinkedIn",  defaultDescription: "Connect with me on LinkedIn", placeholder: "https://linkedin.com/in/yourhandle" },
  { value: "x",         label: "X",         defaultDescription: "Follow me on X",              placeholder: "https://x.com/yourhandle" },
  { value: "instagram", label: "Instagram", defaultDescription: "Follow me on Instagram",      placeholder: "https://instagram.com/yourhandle" },
  { value: "telegram",  label: "My Telegram", defaultDescription: "Message me on Telegram",      placeholder: "https://t.me/yourhandle" },
  { value: "email",     label: "Email",     defaultDescription: "Send me an email",             placeholder: "mailto:you@example.com" },
  { value: "calendar",  label: "Calendar",  defaultDescription: "Book a call with me",          placeholder: "https://cal.com/yourhandle" },
  { value: "link",      label: "Website",   defaultDescription: "Visit my website",             placeholder: "https://yourwebsite.com" },
];

const CUSTOM_TYPE = "__custom__" as const;
type LinkTypeSelection = IconType | typeof CUSTOM_TYPE;

export function LinkModal({
  link,
  onClose,
  onSaved,
}: {
  link?: Link | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !link || link.id === -1;
  const [step, setStep] = useState<1 | 2>(isNew ? 1 : 2);
  const [selectedType, setSelectedType] = useState<LinkTypeSelection>(
    (link?.iconType as IconType) ?? "link"
  );
  const [title, setTitle] = useState(link?.title ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [iconType, setIconType] = useState<IconType>((link?.iconType as IconType) ?? "link");

  const handleTypeSelect = (type: LinkTypeSelection) => {
    setSelectedType(type);
    if (type === CUSTOM_TYPE) {
      setIconType("link");
      setTitle("");
      setDescription("");
    } else {
      const preset = PERSONAL_LINK_TYPES.find((p) => p.value === type);
      setIconType(type);
      if (preset) {
        setTitle(preset.label);
        setDescription(preset.defaultDescription);
      }
    }
    setUrl("");
    setStep(2);
  };

  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => { toast.success("Link added"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => { toast.success("Link updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const formatUrl = (rawUrl: string, type: LinkTypeSelection): string => {
    const v = rawUrl.trim();
    if (type === "phone") {
      // If already a tel: URI, just strip internal spaces
      if (v.startsWith("tel:")) return v.replace(/\s/g, "");
      // Strip spaces, parentheses, dashes — keep + for country code
      const cleaned = v.replace(/[\s\-().]/g, "");
      return `tel:${cleaned}`;
    }
    if (type === "email") {
      return v.startsWith("mailto:") ? v : `mailto:${v}`;
    }
    if (type === "whatsapp") {
      if (v.startsWith("https://wa.me/") || v.startsWith("https://api.whatsapp.com")) return v;
      // Strip everything except digits and leading +
      const cleaned = v.replace(/[\s\-().]/g, "");
      const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
      return `https://wa.me/${digits}`;
    }
    return v;
  };

  const handleSave = () => {
    if (!title.trim() || !url.trim()) return;
    const finalUrl = formatUrl(url, selectedType);
    if (isNew) {
      createMutation.mutate({ title: title.trim(), url: finalUrl, description: description.trim(), iconType });
    } else {
      updateMutation.mutate({ id: link!.id, title: title.trim(), url: finalUrl, description: description.trim(), iconType });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const currentPreset = PERSONAL_LINK_TYPES.find((p) => p.value === selectedType);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-black w-full max-w-md" style={{ boxShadow: "8px 8px 0px #000" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black">
          <h2 className="font-bold text-sm uppercase tracking-widest">
            {isNew
              ? step === 1
                ? "ADD LINK — CHOOSE TYPE"
                : `ADD ${selectedType === CUSTOM_TYPE ? "CUSTOM" : (currentPreset?.label ?? "").toUpperCase()} LINK`
              : "EDIT LINK"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black font-mono text-lg leading-none">×</button>
        </div>

        {/* Step 1: Type picker */}
        {step === 1 && (
          <div className="p-6">
            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-4">Select your link type</p>
            <div className="grid grid-cols-3 gap-3">
              {PERSONAL_LINK_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeSelect(opt.value)}
                  className="flex flex-col items-center gap-2 p-4 border border-black hover:bg-[#00D26A] hover:border-black transition-all group"
                  style={{ boxShadow: "2px 2px 0px #000" }}
                >
                  <LinkIcon iconType={opt.value} size={36} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-center">{opt.label}</span>
                </button>
              ))}
              {/* Custom option */}
              <button
                type="button"
                onClick={() => handleTypeSelect(CUSTOM_TYPE)}
                className="flex flex-col items-center gap-2 p-4 border border-dashed border-black hover:border-solid hover:bg-[#F5F5F5] transition-all"
              >
                <div className="w-9 h-9 border border-black flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1V15M1 8H15" stroke="#000" strokeWidth="2" strokeLinecap="square" />
                  </svg>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-center">Custom</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: URL + details */}
        {step === 2 && (
          <div className="p-6 flex flex-col gap-4">
            {selectedType !== CUSTOM_TYPE && currentPreset && (
              <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] border border-black">
                <LinkIcon iconType={currentPreset.value} size={32} />
                <div>
                  <div className="font-bold text-sm">{currentPreset.label}</div>
                  <div className="font-mono text-xs text-gray-400">{currentPreset.defaultDescription}</div>
                </div>
              </div>
            )}
            <div>
              <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">
                {selectedType === "phone" ? "Phone Number *" :
                 selectedType === "email" ? "Email Address *" :
                 selectedType === "calendar" ? "Booking URL *" : "URL *"}
              </label>
              <input
                className="lh-input"
                placeholder={currentPreset?.placeholder ?? "https://..."}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              {selectedType === "phone" && (
                <p className="font-mono text-[10px] text-gray-400 mt-1">Enter number with country code, e.g. +65 9663 8538. Spaces are OK.</p>
              )}
              {selectedType === "whatsapp" && (
                <p className="font-mono text-[10px] text-gray-400 mt-1">Enter number with country code, e.g. +65 9663 8538. Spaces are OK.</p>
              )}
            </div>
            {selectedType === CUSTOM_TYPE && (
              <div>
                <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Title *</label>
                <input className="lh-input" placeholder="e.g. My Portfolio" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            )}
            {/* Description — always editable for all link types */}
            <div>
              <label className="font-mono text-xs font-bold uppercase tracking-widest block mb-1">Description</label>
              <input
                className="lh-input"
                placeholder="Short description shown under the link title"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {isNew && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-mono text-gray-400 hover:text-black underline text-left"
              >
                ← Change type
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-black flex justify-end gap-3">
          <button onClick={onClose} className="lh-btn-outline px-6 py-2">CANCEL</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !url.trim() || isPending}
            className="lh-btn-primary px-6 py-2 disabled:opacity-50"
            style={{ boxShadow: "4px 4px 0px #00D26A" }}
          >
            {isPending ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}
