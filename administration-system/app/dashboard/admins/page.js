"use client";
import { useEffect, useState } from "react";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", companyIds: [] });
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const [a, c] = await Promise.all([
      fetch("/api/admins").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
    ]);
    setAdmins(Array.isArray(a) ? a : []);
    setCompanies(Array.isArray(c) ? c : []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleCompany(id) {
    setForm((f) => ({
      ...f,
      companyIds: f.companyIds.includes(id)
        ? f.companyIds.filter((x) => x !== id)
        : [...f.companyIds, id],
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setForm({ name: "", email: "", password: "", companyIds: [] });
    loadAll();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Sub-Admins Waliopo</h1>
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.id} className="card">
              <p className="font-semibold">{a.name} <span className="text-xs text-gray-400">({a.email})</span></p>
              <p className="text-sm text-gray-500 mt-1">
                Anasimamia: {a.managedCompanies.map((mc) => mc.companyName).join(", ") || "Hakuna bado"}
              </p>
            </div>
          ))}
          {admins.length === 0 && <p className="text-gray-400 text-sm">Bado hakuna sub-admin.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Ongeza Sub-Admin Mpya</h2>
        <form onSubmit={handleCreate} className="card space-y-3">
          <input
            className="input"
            placeholder="Jina kamili"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Password ya awali"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <div>
            <p className="text-sm font-medium mb-2">Chagua makampuni atakayosimamia:</p>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {companies.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.companyIds.includes(c.id)}
                    onChange={() => toggleCompany(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Inaunda..." : "Unda Sub-Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
