import { trpc } from "@/lib/trpc";
import DashboardShell from "@/components/DashboardShell";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function Analytics() {
  const statsQuery = trpc.analytics.myStats.useQuery();
  const linksQuery = trpc.links.mine.useQuery();
  const profileQuery = trpc.profile.mine.useQuery();

  const stats = statsQuery.data;
  const links = linksQuery.data ?? [];
  const profile = profileQuery.data;

  const totalViews = stats?.totalViews ?? 0;
  const totalClicks = stats?.totalClicks ?? 0;
  const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

  // Daily chart data — getDailyStats returns { date, eventType, count }
  // Pivot into { date, Views, Clicks } for recharts
  const dailyMap = new Map<string, { date: string; Views: number; Clicks: number }>();
  for (const row of (stats?.daily ?? []) as { date: string; eventType: "page_view" | "link_click"; count: number }[]) {
    if (!dailyMap.has(row.date)) dailyMap.set(row.date, { date: row.date, Views: 0, Clicks: 0 });
    const entry = dailyMap.get(row.date)!;
    if (row.eventType === "page_view") entry.Views = Number(row.count);
    if (row.eventType === "link_click") entry.Clicks = Number(row.count);
  }
  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Per-link click data — getLinkClickCounts returns { linkId, count }
  const linkClickMap = new Map<number, number>(
    (stats?.linkClicks ?? [])
      .filter((lc: { linkId: number | null; count: number }) => lc.linkId != null)
      .map((lc: { linkId: number | null; count: number }) => [lc.linkId as number, Number(lc.count)])
  );
  const linkBarData = links
    .map((l) => ({ name: l.title.length > 22 ? l.title.slice(0, 22) + "…" : l.title, clicks: linkClickMap.get(l.id) ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return (
    <DashboardShell>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 border-b border-black pb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">Analytics</h1>
          <p className="text-sm text-gray-500 font-mono">
            {profile?.slug ? `Stats for /u/${profile.slug}` : "Set up your profile to see analytics"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-0 border border-black mb-8" style={{ boxShadow: "6px 6px 0px #000" }}>
          {[
            { label: "Total Views", value: totalViews.toLocaleString(), accent: false },
            { label: "Total Clicks", value: totalClicks.toLocaleString(), accent: true },
            { label: "Click Rate", value: `${ctr}%`, accent: false },
          ].map((s, i) => (
            <div key={i} className={`p-6 border-r border-black last:border-r-0 ${s.accent ? "bg-[#00D26A]" : ""}`}>
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{s.label}</div>
              <div className="text-4xl font-black">{s.value}</div>
            </div>
          ))}
        </div>

        {statsQuery.isLoading ? (
          <div className="border border-black p-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
          </div>
        ) : totalViews === 0 ? (
          <div className="border border-black p-12 text-center" style={{ boxShadow: "6px 6px 0px #000" }}>
            <div className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-4">NO DATA YET</div>
            <p className="text-sm text-gray-500">Share your public page link to start collecting analytics.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Daily views & clicks */}
            {dailyData.length > 0 && (
              <div className="border border-black p-6" style={{ boxShadow: "4px 4px 0px #000" }}>
                <div className="font-mono text-xs font-bold uppercase tracking-widest mb-4">Daily Views & Clicks (30 days)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <Tooltip contentStyle={{ border: "1px solid #000", borderRadius: 0, fontFamily: "monospace", fontSize: 11 }} />
                    <Line type="monotone" dataKey="Views" stroke="#000000" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Clicks" stroke="#00D26A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-black" /><span className="font-mono text-xs text-gray-500">VIEWS</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#00D26A]" /><span className="font-mono text-xs text-gray-500">CLICKS</span></div>
                </div>
              </div>
            )}

            {/* Per-link clicks */}
            {linkBarData.length > 0 && (
              <div className="border border-black p-6" style={{ boxShadow: "4px 4px 0px #000" }}>
                <div className="font-mono text-xs font-bold uppercase tracking-widest mb-4">Top Links by Clicks</div>
                <ResponsiveContainer width="100%" height={Math.max(160, linkBarData.length * 36)}>
                  <BarChart data={linkBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <Tooltip contentStyle={{ border: "1px solid #000", borderRadius: 0, fontFamily: "monospace", fontSize: 11 }} />
                    <Bar dataKey="clicks" fill="#00D26A" stroke="#000" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Location breakdown */}
            {(stats?.locations ?? []).length > 0 && (
              <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
                <div className="px-5 py-3 border-b border-black font-mono text-xs font-bold uppercase tracking-widest bg-[#F5F5F5]">
                  Visitors by Location (30 days)
                </div>
                <div className="divide-y divide-black/10">
                  {(stats!.locations as { country: string; city: string; count: number }[]).map((loc, i) => {
                    const totalLoc = (stats!.locations as { count: number }[]).reduce((s, r) => s + Number(r.count), 0);
                    const pct = totalLoc > 0 ? Math.round((Number(loc.count) / totalLoc) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{loc.city ? `${loc.city}, ${loc.country}` : loc.country}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-sm">{loc.count}</div>
                          <div className="font-mono text-[10px] text-gray-400">{pct}%</div>
                        </div>
                        <div className="w-20 h-2 bg-gray-100 border border-black shrink-0">
                          <div className="h-full bg-[#00D26A]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Referrer breakdown */}
            {(stats?.referrers ?? []).length > 0 && (
              <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
                <div className="px-5 py-3 border-b border-black font-mono text-xs font-bold uppercase tracking-widest bg-[#F5F5F5]">
                  Traffic Sources (30 days)
                </div>
                <div className="divide-y divide-black/10">
                  {(stats!.referrers as { referrer: string; count: number }[]).map((ref, i) => {
                    const totalRef = (stats!.referrers as { count: number }[]).reduce((s, r) => s + Number(r.count), 0);
                    const pct = totalRef > 0 ? Math.round((Number(ref.count) / totalRef) * 100) : 0;
                    // Shorten referrer URL for display
                    let displayRef = ref.referrer;
                    try { displayRef = new URL(ref.referrer).hostname.replace(/^www\./, ""); } catch {}
                    return (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{displayRef}</div>
                          <div className="font-mono text-xs text-gray-400 truncate">{ref.referrer}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-sm">{ref.count}</div>
                          <div className="font-mono text-[10px] text-gray-400">{pct}%</div>
                        </div>
                        <div className="w-20 h-2 bg-gray-100 border border-black shrink-0">
                          <div className="h-full bg-[#00D26A]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link table */}
            <div className="border border-black" style={{ boxShadow: "4px 4px 0px #000" }}>
              <div className="px-5 py-3 border-b border-black font-mono text-xs font-bold uppercase tracking-widest bg-[#F5F5F5]">
                All Links
              </div>
              <div className="divide-y divide-black/10">
                {links.map((link) => {
                  const clicks = linkClickMap.get(link.id) ?? 0;
                  const pct = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
                  return (
                    <div key={link.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{link.title}</div>
                        <div className="font-mono text-xs text-gray-400 truncate">{link.url}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm">{clicks}</div>
                        <div className="font-mono text-[10px] text-gray-400">{pct}% of clicks</div>
                      </div>
                      <div className="w-20 h-2 bg-gray-100 border border-black shrink-0">
                        <div className="h-full bg-[#00D26A]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
