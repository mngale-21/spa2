"use client";
import { useEffect, useState } from "react";

const FIELDS = [
  { key: "label", label: "Jina la Kifurushi", type: "text" },
  { key: "priceTzs", label: "Bei (TZS / mwezi)", type: "number" },
  { key: "maxBranches", label: "Kikomo cha Matawi", type: "number" },
  { key: "maxStaff", label: "Kikomo cha Wafanyakazi", type: "number" },
  { key: "whatsappEnabled", label: "WhatsApp Notifications", type: "bool" },
  { key: "advancedReports", label: "Ripoti za Kina", type: "bool" },
  { key: "prioritySupport", label: "Usaidizi wa Kipaumbele", type: "bool" },
  { key: "isActive", label: "Kinatolewa kwa Wateja Wapya", type: "bool" },
];

function EditRow({ plan, onSave, onCancel }) {
  const [form, setForm] = useState(plan);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(plan.id, form);
    setSaving(false);
  }

  return (
    <tr className="bg-brass-300/10">
      {FIELDS.map((f) => (
        <td key={f.key} className="px-3 py-2">
          {f.type === "bool" ? (
            <input
              type="checkbox"
              checked={!!form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
            />
          ) : (
            <input
              className="input py-1 text-sm"
              type={f.type}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </td>
      ))}
      <td className="px-3 py-2 whitespace-nowrap">
        <button className="btn-success py-1 px-2 text-xs mr-1" onClick={save} disabled={saving}>
          {saving ? "..." : "Hifadhi"}
        </button>
        <button className="btn-outline py-1 px-2 text-xs" onClick={onCancel}>
          Ghairi
        </button>
      </td>
    </tr>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newPlan, setNewPlan] = useState({
    key: "",
    label: "",
    priceTzs: 0,
    maxBranches: 1,
    maxStaff: 5,
    whatsappEnabled: true,
    advancedReports: false,
    prioritySupport: false,
  });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/plans");
    const data = await res.json();
    setPlans(data.plans || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(id, form) {
    setError("");
    const res = await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Imeshindwa kuhifadhi.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlan),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Imeshindwa kuongeza kifurushi.");
      return;
    }
    setShowNew(false);
    setNewPlan({ key: "", label: "", priceTzs: 0, maxBranches: 1, maxStaff: 5, whatsappEnabled: true, advancedReports: false, prioritySupport: false });
    load();
  }

  if (!plans) return <p className="text-ink-700/60">Inapakia vifurushi...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl text-ink-950">Vifurushi (Plans)</h1>
        <button className="btn-primary" onClick={() => setShowNew((s) => !s)}>
          {showNew ? "Funga" : "+ Ongeza Kifurushi"}
        </button>
      </div>
      <p className="text-sm text-ink-700/60 mb-4">
        Hariri bei na vikomo hapa — mabadiliko yanaathiri makampuni yote yanayotumia kifurushi husika mara moja
        (mf. kikomo kipya cha matawi kinatumika mara hiyo hiyo kwenye Salon System).
      </p>

      {error && <div className="bg-status-deletedTint text-status-deleted text-sm rounded-lg p-2 mb-4">{error}</div>}

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium">Key (mf. GOLD)</label>
            <input className="input mt-1" value={newPlan.key} onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium">Jina</label>
            <input className="input mt-1" value={newPlan.label} onChange={(e) => setNewPlan({ ...newPlan, label: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium">Bei (TZS)</label>
            <input type="number" className="input mt-1" value={newPlan.priceTzs} onChange={(e) => setNewPlan({ ...newPlan, priceTzs: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Kikomo cha Matawi</label>
            <input type="number" className="input mt-1" value={newPlan.maxBranches} onChange={(e) => setNewPlan({ ...newPlan, maxBranches: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Kikomo cha Wafanyakazi</label>
            <input type="number" className="input mt-1" value={newPlan.maxStaff} onChange={(e) => setNewPlan({ ...newPlan, maxStaff: e.target.value })} />
          </div>
          <div className="flex items-end gap-3 col-span-2 md:col-span-1">
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={newPlan.whatsappEnabled} onChange={(e) => setNewPlan({ ...newPlan, whatsappEnabled: e.target.checked })} />
              WhatsApp
            </label>
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={newPlan.advancedReports} onChange={(e) => setNewPlan({ ...newPlan, advancedReports: e.target.checked })} />
              Ripoti za Kina
            </label>
          </div>
          <div className="col-span-2 md:col-span-4">
            <button className="btn-primary">Hifadhi Kifurushi Kipya</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-700/50 border-b border-sand-200">
              {FIELDS.map((f) => (
                <th key={f.key} className="px-3 py-2">{f.label}</th>
              ))}
              <th className="px-3 py-2">Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) =>
              editingId === plan.id ? (
                <EditRow key={plan.id} plan={plan} onSave={handleSave} onCancel={() => setEditingId(null)} />
              ) : (
                <tr key={plan.id} className="border-b border-sand-200 last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-medium text-ink-900">{plan.label}</span>
                    <span className="text-ink-700/40 text-xs ml-1">({plan.key})</span>
                  </td>
                  <td className="px-3 py-2">TZS {Number(plan.priceTzs).toLocaleString()}</td>
                  <td className="px-3 py-2">{plan.maxBranches >= 999 ? "Bila kikomo" : plan.maxBranches}</td>
                  <td className="px-3 py-2">{plan.maxStaff >= 999 ? "Bila kikomo" : plan.maxStaff}</td>
                  <td className="px-3 py-2">{plan.whatsappEnabled ? "✅" : "—"}</td>
                  <td className="px-3 py-2">{plan.advancedReports ? "✅" : "—"}</td>
                  <td className="px-3 py-2">{plan.prioritySupport ? "✅" : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${plan.isActive ? "badge-active" : "badge-suspended"}`}>
                      {plan.isActive ? "Active" : "Imezimwa"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button className="btn-outline py-1 px-2 text-xs" onClick={() => setEditingId(plan.id)}>
                      Hariri
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
