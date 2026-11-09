"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../lib/api";
import { saveSession } from "../../../lib/auth";

/**
 * /sso/admin-login?token=...
 *
 * Landing page the Admin System (platform Super Admin panel) redirects the
 * browser to when someone there clicks "Ingia kwenye Mfumo Wake" (Login as
 * Tenant). We exchange the short-lived signed token for a REAL session on
 * this system (via /api/platform/sso-login), save it exactly like a normal
 * login, then go straight to the admin dashboard — no password involved.
 */
export default function SsoAdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Kiungo hiki hakina token sahihi.");
      return;
    }

    api
      .post("/platform/sso-login", { token })
      .then(({ data }) => {
        saveSession(data.token, data.user);
        router.push("/dashboard/admin");
      })
      .catch((err) => {
        setError(err?.response?.data?.message || "Imeshindikana kuingia kupitia Admin System.");
      });
    // eslint-disable-next-line
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 p-6">
      <div className="max-w-sm w-full rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-lift p-8 text-center">
        {error ? (
          <>
            <p className="text-status-busy font-medium mb-2">Hitilafu</p>
            <p className="text-sm text-ink-800">{error}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink-900 mb-1">Inaingia kupitia Admin System...</p>
            <p className="text-sm text-ink-700/70">Tafadhali subiri kidogo.</p>
          </>
        )}
      </div>
    </main>
  );
}
