"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "../../lib/api";

function ActivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [checking, setChecking] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("Kiungo hiki hakina token sahihi.");
      setChecking(false);
      return;
    }
    api
      .get(`/auth/activate/${token}`)
      .then(({ data }) => setTokenInfo(data))
      .catch((err) => setTokenError(err?.response?.data?.message || "Kiungo hiki si sahihi au kimeisha muda."))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Password hazifanani.");
      return;
    }
    if (password.length < 6) {
      setError("Password lazima iwe na herufi/namba angalau 6.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/activate", { token, password });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Imeshindikana kuwezesha akaunti. Jaribu tena.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8">
      {checking ? (
        <div className="h-40 flex items-center justify-center text-ink-700/60 text-sm">Inaangalia kiungo...</div>
      ) : done ? (
        <div className="space-y-4">
          <h1 className="font-display text-lg text-ink-950">Akaunti Imewezeshwa!</h1>
          <div className="rounded-lg bg-status-available/10 border border-status-available/30 px-4 py-3 text-sm text-ink-800">
            Password yako imewekwa. Sasa unaweza kuingia kwenye mfumo wako.
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-3 font-medium hover:bg-terracotta-700 transition"
          >
            Nenda kwenye Login
          </button>
        </div>
      ) : tokenError ? (
        <div className="space-y-4">
          <h1 className="font-display text-lg text-ink-950">Kiungo Hakifanyi Kazi</h1>
          <div className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-4 py-3 text-sm text-status-busy">
            {tokenError}
          </div>
          <p className="text-sm text-ink-700/70">
            Wasiliana na msimamizi wa mfumo (Administration System) ili apate kukutumia kiungo kipya.
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-lg text-ink-950 mb-1.5">
            Karibu{tokenInfo?.companyName ? `, ${tokenInfo.companyName}` : ""}!
          </h1>
          <p className="text-sm text-ink-700/60 mb-5">
            {tokenInfo?.firstName ? `${tokenInfo.firstName}, ` : ""}
            weka password yako ili kukamilisha uwezeshaji wa akaunti
            {tokenInfo?.username ? ` (${tokenInfo.username})` : ""}.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-800 mb-1.5">
                Password Mpya
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl2 border border-ink-900/12 bg-cream-50 px-4 py-3 pr-16 text-ink-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-700/60 hover:text-ink-900"
                >
                  {showPassword ? "Ficha" : "Onesha"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-800 mb-1.5">
                Rudia Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl2 border border-ink-900/12 bg-cream-50 px-4 py-3 text-ink-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 transition"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-4 py-3 text-sm text-status-busy">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-3 font-medium hover:bg-terracotta-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Inawezesha..." : "Wezesha Akaunti"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/**
 * /activate-account?token=...
 * Landing page for the email link sent when the Administration System
 * creates a brand-new Company — the Company Admin follows this link to set
 * their own password for the first time (see authController.activateAccount).
 */
export default function ActivateAccountPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 animate-slow-drift"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(199,154,75,0.22), transparent 45%), radial-gradient(circle at 80% 75%, rgba(181,96,63,0.20), transparent 45%), radial-gradient(circle at 50% 50%, rgba(47,158,107,0.10), transparent 55%)",
          backgroundSize: "180% 180%",
        }}
      />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/login-bg.jpg')" }} />
      <div className="absolute inset-0 bg-ink-950/75" />

      <div className="w-full max-w-sm relative">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl text-cream-50 tracking-wide">Salon System</span>
          <div className="h-px w-10 bg-brass-500/60 mx-auto mt-3" />
        </div>
        <Suspense fallback={<div className="h-64 rounded-xl2 bg-cream-50/50 animate-pulse" />}>
          <ActivateAccountForm />
        </Suspense>
      </div>
    </main>
  );
}
