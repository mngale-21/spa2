"use client";

import { useEffect, useState } from "react";

/**
 * Shown whenever the backend responds with 503 / SERVICE_SUSPENDED — i.e.
 * the Administration System (platform) has suspended this company's
 * subscription. lib/api.js redirects here automatically on that response
 * code, stashing the human-readable reason in sessionStorage first (this
 * page has no session/token of its own to ask the backend for one).
 */
export default function ServiceSuspendedPage() {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason(sessionStorage.getItem("salon_suspended_reason") || "");
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 p-6">
      <div className="max-w-md w-full rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8 text-center">
        <p className="text-3xl mb-3">⛔</p>
        <h1 className="font-display text-xl text-ink-950 mb-2">Huduma Imesimamishwa</h1>
        <p className="text-sm text-ink-700/80">
          {reason || "Akaunti ya kampuni yako imesimamishwa kwa sasa - labda subscription imeisha."}
        </p>
        <p className="text-sm text-ink-700/80 mt-3">
          Tafadhali wasiliana na msimamizi wa mfumo (Admin) ili kuendelea kutumia huduma.
        </p>
      </div>
    </main>
  );
}
