import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

import AppLogo from "@/components/AppLogo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const profileQuery = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest text-gray-500">Authenticating...</span>
        </div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "DASHBOARD",
      icon: <NavIcon d="M1 1H7V7H1V1ZM9 1H15V7H9V1ZM1 9H7V15H1V9ZM9 9H15V15H9V9Z" />,
    },
    {
      href: "/dashboard/profile",
      label: "PROFILE",
      icon: <NavIcon d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7ZM2 15C2 11.6863 4.68629 9 8 9C11.3137 9 14 11.6863 14 15" />,
    },
    {
      href: "/dashboard/analytics",
      label: "ANALYTICS",
      icon: <NavIcon d="M1 15V9H5V15H1ZM6 15V5H10V15H6ZM11 15V1H15V15H11Z" />,
    },
  ];

  if (user?.role === "admin") {
    navItems.push({
      href: "/admin",
      label: "ADMIN",
      icon: <NavIcon d="M8 1L10 5H14L11 8L12 12L8 10L4 12L5 8L2 5H6L8 1Z" />,
    });
    navItems.push({
      href: "/admin/company-builder",
      label: "COMPANY PAGE",
      icon: <NavIcon d="M1 8C1 4.13 4.13 1 8 1C11.87 1 15 4.13 15 8C15 11.87 11.87 15 8 15C4.13 15 1 11.87 1 8ZM8 5V8L10 10" />,
    });
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-56 bg-black text-white flex flex-col border-r border-black shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <AppLogo height={22} />
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {profileQuery.data?.avatarUrl ? (
              <img
                src={profileQuery.data.avatarUrl}
                alt="avatar"
                className="w-8 h-8 object-cover border border-white/20"
              />
            ) : (
              <div
                className="w-8 h-8 flex items-center justify-center text-xs font-bold border border-white/20"
                style={{ background: "#00D26A", color: "#000" }}
              >
                {(user?.name ?? "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name ?? "Team Member"}</div>
              {user?.role === "admin" && (
                <span className="lh-tag-green" style={{ fontSize: "0.55rem", padding: "1px 5px" }}>ADMIN</span>
              )}
            </div>
          </div>
          {profileQuery.data?.slug && (
            <div className="mt-2">
              <a
                href={`/u/${profileQuery.data.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-white/50 hover:text-[#00D26A] transition-colors"
              >
                /u/{profileQuery.data.slug} ↗
              </a>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const pathname = location.split("?")[0];
            // Dashboard root should only match exactly, not prefix-match /dashboard/profile etc.
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#00D26A] text-black"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <NavIcon d="M6 1H1V15H6M10 11L14 8L10 5M14 8H5" />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
