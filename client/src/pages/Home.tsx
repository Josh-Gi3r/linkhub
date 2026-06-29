import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLogo from "@/components/AppLogo";

type Step = "login" | "sent" | "onboarding" | "verifying" | "error";

export default function Home() {
  const { loading, isAuthenticated, refresh } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Onboarding fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [onboardingError, setOnboardingError] = useState("");
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  const saveProfileMutation = trpc.profile.save.useMutation();

  // Handle magic link callback: /?magic=1 or /?magic=new
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get("magic");
    const error = params.get("error");

    if (error) {
      const messages: Record<string, string> = {
        invalid_token: "This login link is invalid or has already been used. Please request a new one.",
        server_error: "Something went wrong. Please try again.",
      };
      setErrorMessage(messages[error] ?? "Login failed. Please try again.");
      setStep("error");
      // Clean URL
      window.history.replaceState({}, "", "/");
      return;
    }

    if (magic) {
      // Token was verified server-side — session cookie is now set
      window.history.replaceState({}, "", "/");
      if (magic === "new") {
        setStep("onboarding");
      } else {
        // Existing user — refresh auth state and go to dashboard
        refresh().then(() => navigate("/dashboard"));
      }
    }
  }, []);

  // Redirect already-authenticated users straight to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && step === "login") {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, step, navigate]);

  async function handleRequestMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to send login email. Please try again.");
        return;
      }
      setStep("sent");
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setOnboardingError("");

    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setOnboardingError("Please enter both your first and last name.");
      return;
    }

    setOnboardingSubmitting(true);
    try {
      const fullName = `${first} ${last}`;
      // Derive slug from the email stored in state, or fall back to a timestamp
      const emailLocal = email.split("@")[0] || `user${Date.now()}`;
      const slug = emailLocal.replace(/[^a-z0-9]/gi, "").toLowerCase();
      await saveProfileMutation.mutateAsync({
        slug,
        displayName: fullName,
        jobTitle: "",
        bio: "",
        avatarUrl: "",
      });
      await refresh();
      navigate("/dashboard");
    } catch {
      setOnboardingError("Failed to save your name. Please try again.");
    } finally {
      setOnboardingSubmitting(false);
    }
  }

  if (loading || step === "verifying") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
            {step === "verifying" ? "Signing you in..." : "Loading..."}
          </span>
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
            <span className="px-2 py-0.5 bg-[#00D26A] text-black font-mono text-xs font-bold uppercase tracking-widest">LINKSHARE</span>
            <span className="px-2 py-0.5 border border-white/30 text-white/60 font-mono text-xs uppercase tracking-widest">INTERNAL</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-none tracking-tight uppercase text-white mb-6">
            YOUR LINKS.<br />
            <span style={{ color: "#00D26A" }}>YOUR WAY.</span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Your team's link management platform. Create shareable collections, generate QR codes, and track engagement.
          </p>

          <div className="flex flex-wrap gap-2 mt-8">
            {["Link Collections", "QR Codes", "Analytics", "Team Admin"].map((f) => (
              <span key={f} className="px-3 py-1 border border-white/20 text-white/50 font-mono text-xs uppercase tracking-widest">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="font-mono text-xs text-white/30 uppercase tracking-widest">
          © 2026 LINKHUB
        </div>
      </div>

      {/* Right panel — sign in / sent / onboarding / error */}
      <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-16 bg-white">
        <div className="w-full max-w-sm">

          {/* ── Step: Login ── */}
          {step === "login" && (
            <>
              <div className="border border-black p-8" style={{ boxShadow: "8px 8px 0px #000" }}>
                <div className="mb-6">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 block mb-2">TEAM ACCESS</span>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Sign In</h2>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    Enter your email address — we'll send you a magic link.
                  </p>
                </div>

                <div className="border-t border-black/10 mb-6" />

                <form onSubmit={handleRequestMagicLink} className="flex flex-col gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full border border-black px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                    />
                    {emailError && (
                      <p className="mt-2 text-xs font-mono text-red-600">{emailError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-widest border border-black hover:bg-[#00D26A] hover:text-black transition-colors disabled:opacity-50"
                    style={{ boxShadow: "4px 4px 0px #00D26A" }}
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin inline-block" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="3" width="14" height="10" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M1 3L8 9L15 3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                    {submitting ? "SENDING..." : "SEND MAGIC LINK"}
                  </button>
                </form>
              </div>

              <p className="text-center font-mono text-xs text-gray-400 mt-6 leading-relaxed">
                Access is restricted to authorized users.<br />
                Contact your admin if you need access.
              </p>
            </>
          )}

          {/* ── Step: Sent ── */}
          {step === "sent" && (
            <div className="border border-black p-8" style={{ boxShadow: "8px 8px 0px #00D26A" }}>
              <div className="mb-6 flex flex-col items-center text-center">
                {/* Envelope icon */}
                <div className="w-16 h-16 bg-[#00D26A] flex items-center justify-center mb-6" style={{ boxShadow: "4px 4px 0px #000" }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="6" width="28" height="20" stroke="#000" strokeWidth="2" />
                    <path d="M2 6L16 18L30 6" stroke="#000" strokeWidth="2" />
                  </svg>
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00D26A] block mb-2">CHECK YOUR EMAIL</span>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Magic Link Sent</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We sent a sign-in link to<br />
                  <strong className="text-black font-mono">{email}</strong>
                </p>
                <p className="text-xs text-gray-400 font-mono mt-4 leading-relaxed">
                  The link expires in 30 minutes.<br />
                  Check your spam folder if you don't see it.
                </p>
              </div>

              <div className="border-t border-black/10 mb-6" />

              <button
                onClick={() => { setStep("login"); setEmailError(""); }}
                className="w-full px-6 py-3 border border-black text-black font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors font-mono"
              >
                ← USE A DIFFERENT EMAIL
              </button>
            </div>
          )}

          {/* ── Step: Onboarding (first-time user) ── */}
          {step === "onboarding" && (
            <div className="border border-black p-8" style={{ boxShadow: "8px 8px 0px #00D26A" }}>
              <div className="mb-6">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00D26A] block mb-2">WELCOME</span>
                <h2 className="text-2xl font-black uppercase tracking-tight">One Last Step</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Tell us your name so your teammates can find you.
                </p>
              </div>

              <div className="border-t border-black/10 mb-6" />

              <form onSubmit={handleOnboarding} className="flex flex-col gap-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setOnboardingError(""); }}
                    placeholder="Joshua"
                    autoComplete="given-name"
                    className="w-full border border-black px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs uppercase tracking-widest text-gray-500 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setOnboardingError(""); }}
                    placeholder="Gier"
                    autoComplete="family-name"
                    className="w-full border border-black px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00D26A]"
                  />
                </div>

                {onboardingError && (
                  <p className="text-xs font-mono text-red-600">{onboardingError}</p>
                )}

                <button
                  type="submit"
                  disabled={onboardingSubmitting}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-[#00D26A] text-black font-bold text-sm uppercase tracking-widest border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  style={{ boxShadow: "4px 4px 0px #000" }}
                >
                  {onboardingSubmitting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent animate-spin inline-block" />
                  ) : null}
                  {onboardingSubmitting ? "SAVING..." : "LET'S GO →"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step: Error ── */}
          {step === "error" && (
            <div className="border border-red-500 p-8" style={{ boxShadow: "8px 8px 0px #ef4444" }}>
              <div className="mb-6 text-center">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-red-500 block mb-2">LOGIN ERROR</span>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Link Invalid</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                onClick={() => { setStep("login"); setErrorMessage(""); }}
                className="w-full px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-widest border border-black hover:bg-[#00D26A] hover:text-black transition-colors font-mono"
              >
                TRY AGAIN →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
