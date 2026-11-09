"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Imeshindikana kuingia.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm bg-white/95 backdrop-blur">
        <span className="text-[11px] uppercase tracking-[0.25em] text-brass-600">Salon SaaS</span>
        <h1 className="font-display text-2xl text-ink-950 mt-1 mb-1">Control Center</h1>
        <p className="text-sm text-ink-700/60 mb-5">Ingia kwenye Admin Panel</p>

        {error && (
          <div className="bg-status-deleted/10 border border-status-deleted/30 text-status-deleted text-sm rounded-lg p-2 mb-4">{error}</div>
        )}

        <label className="text-sm font-medium text-ink-800">Email</label>
        <input
          type="email"
          className="input mb-3 mt-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="text-sm font-medium text-ink-800">Password</label>
        <input
          type="password"
          className="input mb-5 mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Inaingia..." : "Ingia"}
        </button>

        <p className="text-xs text-ink-700/40 mt-4">
          Default: tumia email na password ulizoweka wakati wa "seed" (default password: 54321)
        </p>
      </form>
    </div>
  );
}
