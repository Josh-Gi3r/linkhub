import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ExternalLink, ChevronDown, Users } from "lucide-react";
import QRWithLogo, { type QRWithLogoHandle } from "@/components/QRWithLogo";
import { LinkIcon } from "@/components/LinkIcon";
import AppLogo from "@/components/AppLogo";

const GREEN = "#00D26A";

// ─── Types ────────────────────────────────────────────────────────────────────
type CompanyLinkData = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  iconType: string | null;
  isActive: boolean;
  sortOrder: number;
};

type TeamMemberData = {
  id: number;
  userId: number;
  isVisible: boolean;
  sortOrder: number;
  displayName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  slug: string | null;
};

// ─── Link button ──────────────────────────────────────────────────────────────
function LinkButton({ link }: { link: CompanyLinkData }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative w-full">
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
        style={{
          background: hovered ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 0,
          transform: hovered ? "translateY(-1px)" : "none",
          boxShadow: hovered ? `0 4px 0 0 ${GREEN}` : "none",
        }}
      >
        <LinkIcon iconType={link.iconType ?? "link"} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-white truncate tracking-wide">{link.title}</div>
          {link.description && (
            <div className="text-xs text-gray-500 truncate mt-0.5">{link.description}</div>
          )}
        </div>
        <ExternalLink
          size={13}
          className="shrink-0 transition-colors duration-150"
          style={{ color: hovered ? GREEN : "#555" }}
        />
      </button>
      {hovered && link.url && (
        <div
          className="absolute left-0 right-0 -bottom-7 z-10 px-3 py-1 font-mono text-[10px] text-gray-400 truncate pointer-events-none"
          style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {link.url.replace(/^https?:\/\//, "")}
        </div>
      )}
    </div>
  );
}

// ─── Team member card ─────────────────────────────────────────────────────────
function TeamMemberCard({ member }: { member: TeamMemberData }) {
  const [hovered, setHovered] = useState(false);
  const name = member.displayName ?? "Team Member";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleClick = () => {
    if (member.slug) {
      window.open(`/u/${member.slug}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
      style={{
        background: hovered ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 0,
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? `0 4px 0 0 ${GREEN}` : "none",
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 shrink-0 overflow-hidden"
        style={{ border: `1.5px solid ${hovered ? GREEN : "rgba(255,255,255,0.15)"}`, borderRadius: 0 }}
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

      {/* Name + title */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-white truncate tracking-wide">{name}</div>
        {member.jobTitle && (
          <div className="text-xs truncate mt-0.5" style={{ color: GREEN }}>{member.jobTitle}</div>
        )}
      </div>

      {/* Arrow */}
      <ExternalLink
        size={13}
        className="shrink-0 transition-colors duration-150"
        style={{ color: hovered ? GREEN : "#555" }}
      />
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
  variant = "default",
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  variant?: "primary" | "team" | "default";
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 px-1 transition-opacity hover:opacity-80"
      style={{ background: "transparent", border: "none" }}
    >
      {variant === "primary" ? (
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          style={{ background: GREEN, border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <span className="font-mono text-[7px] font-black leading-none text-black">S</span>
        </div>
      ) : variant === "team" ? (
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <Users size={8} className="text-gray-400" />
        </div>
      ) : (
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <span className="font-mono text-[7px] font-black leading-none text-gray-400">✦</span>
        </div>
      )}
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-left">
        {label}
      </span>
      <span className="font-mono text-[9px] text-gray-600 mr-1">{count}</span>
      <ChevronDown
        size={12}
        className="shrink-0 text-gray-600 transition-transform duration-200"
        style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
      />
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CompanyProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [primaryExpanded, setPrimaryExpanded] = useState(true);
  const [teamExpanded, setTeamExpanded] = useState(true);
  const [partnerExpanded, setPartnerExpanded] = useState(true);
  const [productExpanded, setProductExpanded] = useState(true);
  const qrRef = useRef<QRWithLogoHandle>(null);

  const companyQuery = trpc.company.getPublic.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, retry: false }
  );

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Loading ──
  if (companyQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#111" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${GREEN} transparent transparent transparent` }}
        />
      </div>
    );
  }

  // ── Not found ──
  if (!companyQuery.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8" style={{ background: "#111" }}>
        <AppLogo height={24} />
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-gray-500 mb-2">404</div>
          <h1 className="text-2xl font-black text-white uppercase">Page Not Found</h1>
          <p className="text-sm text-gray-500 mt-2">/{slug} doesn't exist</p>
        </div>
        <a href="/" className="font-mono text-xs hover:underline" style={{ color: GREEN }}>← Back to home</a>
      </div>
    );
  }

  const { company, primaryLinks, partnerLinks, productLinks, teamMembers } = companyQuery.data;
  const displayName = company.displayName;

  const hasPrimaryLinks = primaryLinks.length > 0;
  const hasTeam = teamMembers.length > 0;
  const hasPartnerLinks = partnerLinks.length > 0;
  const hasProductLinks = productLinks.length > 0;
  const hasContent = hasPrimaryLinks || hasTeam || hasPartnerLinks || hasProductLinks;

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "linear-gradient(160deg, #1a1a1a 0%, #111 55%, #0d0d0d 100%)" }}
    >
      {/* Top bar */}
      <div className="w-full max-w-md flex items-center justify-between px-5 pt-5 pb-2">
        <AppLogo height={18} />
        <button
          onClick={() => setShowQR(true)}
          className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500 uppercase tracking-widest transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.color = GREEN)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="0.5" y="0.5" width="4" height="4" stroke="currentColor" strokeWidth="1.2" />
            <rect x="7.5" y="0.5" width="4" height="4" stroke="currentColor" strokeWidth="1.2" />
            <rect x="0.5" y="7.5" width="4" height="4" stroke="currentColor" strokeWidth="1.2" />
            <rect x="8" y="8" width="1.2" height="1.2" fill="currentColor" />
            <rect x="10" y="8" width="1.2" height="1.2" fill="currentColor" />
            <rect x="8" y="10" width="1.2" height="1.2" fill="currentColor" />
            <rect x="10" y="10" width="1.2" height="1.2" fill="currentColor" />
          </svg>
          QR
        </button>
      </div>

      {/* Company header */}
      <div className="w-full max-w-md px-5 pt-8 pb-4 flex flex-col items-center text-center">
        {/* Avatar / Logo */}
        <div
          className="w-20 h-20 overflow-hidden mb-4"
          style={{ border: `2px solid ${GREEN}`, boxShadow: `0 0 24px rgba(0,210,106,0.2)` }}
        >
          {company.avatarUrl ? (
            <img src={company.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-black text-2xl"
              style={{ background: GREEN, color: "#000" }}
            >
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-white font-black text-xl tracking-tight leading-tight">{displayName}</h1>

        {company.tagline && (
          <div className="font-mono text-xs uppercase tracking-widest mt-1" style={{ color: GREEN }}>
            {company.tagline}
          </div>
        )}

        {company.bio && (
          <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-xs">{company.bio}</p>
        )}

        <div className="w-12 h-0.5 mt-5" style={{ background: GREEN }} />
      </div>

      {/* Sections */}
      <div className="w-full max-w-md px-5 pb-16 flex flex-col gap-1">
        {!hasContent ? (
          <div className="text-center py-10">
            <div className="text-gray-600 text-sm font-mono">No links yet</div>
          </div>
        ) : (
          <>
            {/* Company Links */}
            {hasPrimaryLinks && (
              <div className="mb-2">
                <SectionHeader
                  label="Company Links"
                  count={primaryLinks.length}
                  expanded={primaryExpanded}
                  onToggle={() => setPrimaryExpanded((v) => !v)}
                  variant="primary"
                />
                {primaryExpanded && (
                  <div className="flex flex-col gap-2 mt-1">
                    {primaryLinks.map((link) => (
                      <LinkButton key={link.id} link={link} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {hasPrimaryLinks && hasTeam && (
              <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
            )}

            {/* Team */}
            {hasTeam && (
              <div className="mb-2">
                <SectionHeader
                  label="Team"
                  count={teamMembers.length}
                  expanded={teamExpanded}
                  onToggle={() => setTeamExpanded((v) => !v)}
                  variant="team"
                />
                {teamExpanded && (
                  <div className="flex flex-col gap-2 mt-1">
                    {teamMembers.map((member) => (
                      <TeamMemberCard key={member.id} member={member} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {(hasPrimaryLinks || hasTeam) && hasPartnerLinks && (
              <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
            )}

            {/* Partner Links */}
            {hasPartnerLinks && (
              <div className="mb-2">
                <SectionHeader
                  label="Partner Links"
                  count={partnerLinks.length}
                  expanded={partnerExpanded}
                  onToggle={() => setPartnerExpanded((v) => !v)}
                  variant="default"
                />
                {partnerExpanded && (
                  <div className="flex flex-col gap-2 mt-1">
                    {partnerLinks.map((link) => (
                      <LinkButton key={link.id} link={link} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            {(hasPrimaryLinks || hasTeam || hasPartnerLinks) && hasProductLinks && (
              <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
            )}

            {/* Product Links */}
            {hasProductLinks && (
              <div className="mb-2">
                <SectionHeader
                  label="Product Links"
                  count={productLinks.length}
                  expanded={productExpanded}
                  onToggle={() => setProductExpanded((v) => !v)}
                  variant="default"
                />
                {productExpanded && (
                  <div className="flex flex-col gap-2 mt-1">
                    {productLinks.map((link) => (
                      <LinkButton key={link.id} link={link} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <div className="text-gray-700 font-mono text-[10px] uppercase tracking-widest">
          POWERED BY LINKHUB
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white border border-black w-full max-w-xs"
            style={{ boxShadow: `8px 8px 0px ${GREEN}` }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-black">
              <h2 className="font-bold text-xs uppercase tracking-widest">QR CODE</h2>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-black font-mono text-xl leading-none">×</button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="p-3 border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
                <QRWithLogo
                  ref={qrRef}
                  value={pageUrl}
                  size={160}
                  logoVariant="dark-square"
                />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm uppercase tracking-wide">{displayName}</div>
                <div className="font-mono text-[10px] text-gray-400 mt-1 break-all">{pageUrl}</div>
              </div>
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black transition-colors"
                style={copied ? { background: GREEN, color: "#000" } : { background: "#fff", color: "#000" }}
              >
                {copied ? "✓ COPIED!" : "COPY LINK"}
              </button>
              <button
                onClick={() => qrRef.current?.downloadPNG(`linkhub-qr-${slug}.png`)}
                className="w-full py-2.5 font-mono text-xs font-bold uppercase tracking-widest border border-black bg-white text-black hover:bg-gray-50 transition-colors"
              >
                DOWNLOAD PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
