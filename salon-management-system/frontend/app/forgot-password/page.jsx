"use client";

import { useState } from "react";
import Link from "next/link";
import api from "../../lib/api";
import { useLanguage } from "../../lib/i18n";

/**
 * ForgotPasswordPage
 * Same background/card visual language as the login page. Always shows
 * the same success message regardless of whether the identifier matched
 * an account — the backend is deliberately silent on that (see
 * requestPasswordReset in authController.js) so this page can't be used
 * to probe which usernames/emails exist.
 */
export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { identifier });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

        <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8">
          {sent ? (
            <div className="space-y-4">
              <h1 className="font-display text-lg text-ink-950">{t("forgotPasswordTitle")}</h1>
              <div className="rounded-lg bg-status-available/10 border border-status-available/30 px-4 py-3 text-sm text-ink-800">
                If that account exists and has an email on file, a reset link has been sent to it. Check your inbox
                (and spam folder) — the link expires in 30 minutes.
              </div>
              <Link
                href="/login"
                className="block text-center w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-3 font-medium hover:bg-terracotta-700 transition"
              >
                {t("forgotPasswordBackToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-lg text-ink-950 mb-1.5">{t("forgotPasswordTitle")}</h1>
              <p className="text-sm text-ink-700/60 mb-5">{t("forgotPasswordSubtitle")}</p>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-ink-800 mb-1.5">
                    {t("forgotPasswordIdentifierLabel")}
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
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
                  {isSubmitting ? t("forgotPasswordSending") : t("forgotPasswordSubmit")}
                </button>
              </form>
              <p className="text-center mt-5">
                <Link href="/login" className="text-xs text-brass-700 hover:underline">
                  {t("forgotPasswordBackToLogin")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
