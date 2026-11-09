"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { saveSession } from "../../lib/auth";
import { useLanguage } from "../../lib/i18n";

/**
 * LoginPage
 * A warm, welcoming sign-in: a short kicker + tagline above the mark, and
 * a heading inside the card — enough to feel like an entrance rather than
 * a bare form, without turning into a marketing page.
 */
export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { data } = await api.post("/auth/login", { username, password });
      saveSession(data.token, data.user);

      if (data.user.role === "ADMIN") router.push("/dashboard/admin");
      else if (data.user.role === "STAFF") router.push("/dashboard/staff");
      else router.push("/dashboard/cashier");
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 p-6 relative overflow-hidden">
      {/* A very slow-drifting glow (40s per cycle, position-only) is the
          actual finished background — it alone looks intentional, not a
          placeholder waiting for a photo. Optionally drop login-bg.jpg into
          frontend/public/ to layer a photo on top of it (behind a dark
          wash so the card stays fully readable); if that file isn't
          there, this layer is simply transparent and the glow underneath
          shows through — nothing ever looks broken either way. */}
      <div
        className="absolute inset-0 animate-slow-drift"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(199,154,75,0.22), transparent 45%), radial-gradient(circle at 80% 75%, rgba(181,96,63,0.20), transparent 45%), radial-gradient(circle at 50% 50%, rgba(47,158,107,0.10), transparent 55%)",
          backgroundSize: "180% 180%",
        }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-ink-950/75" />
      <div className="w-full max-w-sm relative">
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brass-400/90 mb-2">{t("loginWelcomeKicker")}</p>
          <span className="font-display text-3xl text-cream-50 tracking-wide">Salon System</span>
          <div className="h-px w-10 bg-brass-500/60 mx-auto mt-3 mb-3" />
          <p className="text-sm text-cream-50/70 max-w-[280px] mx-auto">{t("loginTagline")}</p>
        </div>

        <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8">
          <h1 className="font-display text-lg text-ink-950 mb-5">{t("loginCardHeading")}</h1>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink-800 mb-1.5">
                {t("username")}
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl2 border border-ink-900/12 bg-cream-50 px-4 py-3 text-ink-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-800 mb-1.5">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl2 border border-ink-900/12 bg-cream-50 px-4 py-3 pr-16 text-ink-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-700/60 hover:text-ink-900"
                >
                  {showPassword ? t("hide") : t("show")}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link href="/forgot-password" className="text-xs text-brass-700 hover:underline">
                  {t("forgotPasswordLink")}
                </Link>
              </div>
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
              {isSubmitting ? t("signingIn") : t("signIn")}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-cream-50/50 mt-5">{t("loginFooterNote")}</p>
      </div>
    </main>
  );
}
