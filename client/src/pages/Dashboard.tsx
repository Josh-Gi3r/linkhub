import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardShell from "@/components/DashboardShell";
import { ExternalLink, BarChart2, User, QrCode } from "lucide-react";
import { useRef, useState } from "react";
import QRWithLogo, { type QRWithLogoHandle } from "@/components/QRWithLogo";
import { PUBLIC_BASE_URL } from "@/const";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<QRWithLogoHandle>(null);

  const profileQuery = trpc.profile.mine.useQuery();
  const linksQuery = trpc.links.mine.useQuery();
  const statsQuery = trpc.analytics.myStats.useQuery();

  const profile = profileQuery.data;
  const links = linksQuery.data ?? [];
  const stats = statsQuery.data;
  const activeLinks = links.filter((l) => l.isActive).length;
  const publicUrl = profile?.slug ? `${PUBLIC_BASE_URL}/u/${profile.slug}` : null;

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadQR = () => {
    if (!profile) return;
    qrRef.current?.downloadPNG(`linkhub-qr-${profile.slug}.png`);
  };

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 border-b border-black pb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            {profile ? "Your LinkHub profile is live." : "Set up your profile to get started."}
          </p>
        </div>

        {/* Profile not set up yet */}
        {!profileQuery.isLoading && !profile && (
          <div
            className="border border-black p-8 mb-8 bg-[#00D26A]"
            style={{ boxShadow: "6px 6px 0px #000" }}
          >
            <div className="font-black text-lg uppercase tracking-tight mb-2">Set up your profile first</div>
            <p className="text-sm mb-4">
              Create your public LinkHub page — add your bio, photo, and links so the team can share it.
            </p>
            <button
              onClick={() => navigate("/dashboard/profile")}
              className="lh-btn-primary px-6 py-3"
              style={{ boxShadow: "4px 4px 0px #000" }}
            >
              SET UP PROFILE →
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black mb-8" style={{ boxShadow: "6px 6px 0px #000" }}>
          {[
            { label: "Total Links", value: links.length, sub: `${activeLinks} active` },
            { label: "Page Views", value: stats?.totalViews ?? 0, sub: "all time" },
            { label: "Link Clicks", value: stats?.totalClicks ?? 0, sub: "all time" },
            {
              label: "Click Rate",
              value: stats?.totalViews ? `${Math.round(((stats.totalClicks ?? 0) / stats.totalViews) * 100)}%` : "—",
              sub: "CTR",
            },
          ].map((s, i) => (
            <div key={i} className="p-5 border-r border-black last:border-r-0">
              <div className="text-2xl font-black mb-0.5">{s.value}</div>
              <div className="font-mono text-xs font-bold uppercase tracking-widest">{s.label}</div>
              <div className="font-mono text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard/profile")}
            className="flex items-center gap-4 p-5 border border-black bg-white hover:bg-[#F5F5F5] transition-colors text-left group"
            style={{ boxShadow: "4px 4px 0px #000" }}
          >
            <div className="w-10 h-10 border border-black flex items-center justify-center bg-[#00D26A] shrink-0">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm uppercase tracking-wide">Edit Profile & Links</div>
              <div className="font-mono text-xs text-gray-500 mt-0.5">
                {links.length === 0 ? "Add your first link" : `${links.length} links — drag to reorder`}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0 text-gray-400 group-hover:text-black">
              <path d="M2 7H12M7 2L12 7L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>

          <button
            onClick={() => navigate("/dashboard/analytics")}
            className="flex items-center gap-4 p-5 border border-black bg-white hover:bg-[#F5F5F5] transition-colors text-left group"
            style={{ boxShadow: "4px 4px 0px #000" }}
          >
            <div className="w-10 h-10 border border-black flex items-center justify-center bg-black shrink-0">
              <BarChart2 size={18} className="text-[#00D26A]" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm uppercase tracking-wide">View Analytics</div>
              <div className="font-mono text-xs text-gray-500 mt-0.5">
                {stats?.totalViews ? `${stats.totalViews} views this month` : "No data yet"}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto shrink-0 text-gray-400 group-hover:text-black">
              <path d="M2 7H12M7 2L12 7L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>

        {/* Public page link */}
        {publicUrl && (
          <div className="border border-black p-5" style={{ boxShadow: "4px 4px 0px #000" }}>
            <div className="font-mono text-xs font-bold uppercase tracking-widest mb-3 text-gray-500">Your Public Page</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0 font-mono text-sm bg-[#F5F5F5] border border-black px-3 py-2 truncate">
                {publicUrl}
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 lh-btn-primary px-4 py-2 text-xs shrink-0"
                style={{ boxShadow: "3px 3px 0px #00D26A" }}
              >
                <ExternalLink size={12} /> VIEW
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 lh-btn-outline px-4 py-2 text-xs shrink-0 transition-colors"
                style={copied ? { background: "#00D26A", borderColor: "#00D26A" } : {}}
              >
                {copied ? "COPIED!" : "COPY"}
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 lh-btn-outline px-4 py-2 text-xs shrink-0"
              >
                <QrCode size={12} /> QR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && publicUrl && profile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black w-full max-w-sm" style={{ boxShadow: "8px 8px 0px #00D26A" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black">
              <h2 className="font-bold text-sm uppercase tracking-widest">QR CODE</h2>
              <button onClick={() => setShowQR(false)} className="text-gray-500 hover:text-black font-mono text-lg leading-none">x</button>
            </div>
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="p-4 border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
                <QRWithLogo
                  ref={qrRef}
                  value={publicUrl}
                  size={200}
                  logoVariant="dark-square"
                />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm uppercase tracking-wide mb-1">{profile.displayName ?? user?.name}</div>
                <div className="font-mono text-xs text-gray-400 break-all">{publicUrl}</div>
              </div>
            </div>
            <div className="px-6 pb-6 flex flex-col gap-2">
              <button
                onClick={handleCopy}
                className="w-full lh-btn-accent py-2 transition-colors"
                style={copied ? { background: "#00D26A", color: "#000" } : {}}
              >
                {copied ? "COPIED!" : "COPY LINK"}
              </button>
              <button onClick={handleDownloadQR} className="w-full lh-btn-outline py-2">
                DOWNLOAD PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
