import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLogo from "@/components/AppLogo";

export default function Welcome() {
  const { loading, isAuthenticated, refresh } = useAuth();
  const [, navigate] = useLocation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Read email from query param for display purposes only
  const email = new URLSearchParams(window.location.search).get("email") ?? "";

  const completeProfile = trpc.profile.complete.useMutation();

  // If not authenticated (e.g. token expired), redirect to login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // If already has a profile (e.g. back-button), redirect to dashboard
  const profileQuery = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });
  useEffect(() => {
    if (profileQuery.data?.displayName) {
      navigate("/dashboard");
    }
  }, [profileQuery.data, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("Please enter both your first and last name.");
      return;
    }

    setSubmitting(true);
    try {
      await completeProfile.mutateAsync({ firstName: first, lastName: last });
      await refresh();
      navigate("/dashboard");
    } catch {
      setError("Failed to save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Left panel — branding */}
      <div className="flex-1 bg-black flex flex-col justify-between p-10 md:p-16 min-h-[40vh] md:min-h-screen">
        <AppLogo height={28} />

        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="px-2 py-0.5 bg-[#00D26A] text-black font-mono text-xs font-bold uppercase tracking-widest">WELCOME</span>
            <span className="px-2 py-0.5 border border-white/30 text-white/60 font-mono text-xs uppercase tracking-widest">YOUR TEAM</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-none tracking-tight uppercase text-white mb-6">
            GLAD TO<br />
            <span style={{ color: "#00D26A" }}>HAVE YOU.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            One quick step before you get started — tell us your name so your teammates can find you.
          </p>
        </div>

        <div className="font-mono text-xs text-white/30 uppercase tracking-widest">
          © 2026 LINKHUB
        </div>
      </div>

      {/* Right panel — name form */}
      <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-16 bg-white">
        <div className="w-full max-w-sm">
          <div className="border border-black p-8" style={{ boxShadow: "8px 8px 0px #00D26A" }}>
            <div className="mb-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00D26A] block mb-2">WELCOME</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">Set Up Your Profile</h2>
              {email && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Signed in as <strong className="font-mono text-black">{email}</strong>
                </p>
              )}
            </div>

            <div className="border-t border-black/10 mb-6" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                  placeholder="First Name"
                  autoComplete="given-name"
                  autoFocus
                  className="w-full border border-black px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setError(""); }}
                  placeholder="Last Name"
                  autoComplete="family-name"
                  className="w-full border border-black px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                />
              </div>

              {error && (
                <p className="text-xs font-mono text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-[#00D26A] text-black font-bold text-sm uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                style={{ boxShadow: "4px 4px 0px #000" }}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin inline-block" />
                ) : null}
                {submitting ? "SAVING..." : "LET'S GO →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
