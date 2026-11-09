"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { useLanguage } from "../../lib/i18n";

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(t("resetPasswordMissingToken"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("resetPasswordMismatch"));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8">
      {done ? (
        <div className="space-y-4">
          <h1 className="font-display text-lg text-ink-950">{t("resetPasswordSuccessTitle")}</h1>
          <div className="rounded-lg bg-status-available/10 border border-status-available/30 px-4 py-3 text-sm text-ink-800">
            Your password has been reset. You can sign in with it now.
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-3 font-medium hover:bg-terracotta-700 transition"
          >
            {t("resetPasswordGoToLogin")}
          </button>
        </div>
      ) : (
        <>
          <h1 className="font-display text-lg text-ink-950 mb-1.5">{t("resetPasswordTitle")}</h1>
          <p className="text-sm text-ink-700/60 mb-5">{t("resetPasswordSubtitle")}</p>

          {!token && (
            <div className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-4 py-3 text-sm text-status-busy mb-5">
              {t("resetPasswordMissingToken")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink-800 mb-1.5">
                {t("resetPasswordNewLabel")}
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-800 mb-1.5">
                {t("resetPasswordConfirmLabel")}
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
              disabled={isSubmitting || !token}
              className="w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-3 font-medium hover:bg-terracotta-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("resetPasswordResetting") : t("resetPasswordSubmit")}
            </button>
          </form>
          <p className="text-center mt-5">
            <Link href="/forgot-password" className="text-xs text-brass-700 hover:underline">
              {t("forgotPasswordLink")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

/**
 * ResetPasswordPage
 * Reads the one-time token from ?token=... (see requestPasswordReset in
 * authController.js) and lets the person set a new password. Same
 * background/card visual language as login. useSearchParams needs a
 * Suspense boundary in the app router, hence the wrapper below.
 */
export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
