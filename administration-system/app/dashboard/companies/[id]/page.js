"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditCompanyPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState({ amount: "", extendMonths: 1, method: "MANUAL", reference: "" });
  const [payMsg, setPayMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/companies/${id}`);
    const data = await res.json();
    setForm(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        subscriptionType: form.subscriptionType,
        subscriptionEnd: form.subscriptionEnd,
      }),
    });
    setSaving(false);
    router.push("/dashboard/companies");
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setPayMsg("");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: id, ...payment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPayMsg(data.error || "Imeshindwa.");
      return;
    }
    setPayMsg("Malipo yamerekodiwa na subscription imeongezwa.");
    load();
  }

  if (!form) return <p>Inapakia...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Hariri Kampuni: {form.name}</h1>
        <form onSubmit={handleSave} className="card space-y-4">
          <div>
            <label className="text-sm font-medium">Jina la Kampuni</label>
            <input className="input mt-1" value={form.name || ""} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Jina la Mmiliki</label>
            <input className="input mt-1" value={form.ownerName || ""} onChange={(e) => update("ownerName", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Namba ya Simu / WhatsApp</label>
            <input className="input mt-1" value={form.phone || ""} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Aina ya Subscription</label>
              <select className="input mt-1" value={form.subscriptionType || "Monthly"} onChange={(e) => update("subscriptionType", e.target.value)}>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Subscription Inaisha</label>
              <input
                type="date"
                className="input mt-1"
                value={form.subscriptionEnd ? new Date(form.subscriptionEnd).toISOString().slice(0, 10) : ""}
                onChange={(e) => update("subscriptionEnd", e.target.value)}
              />
            </div>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? "Inahifadhi..." : "Hifadhi Mabadiliko"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Rekodi Malipo (Renew Subscription)</h2>
        <form onSubmit={handleRecordPayment} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Kiasi (TZS)</label>
              <input
                type="number"
                className="input mt-1"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ongeza Miezi Ngapi</label>
              <input
                type="number"
                className="input mt-1"
                value={payment.extendMonths}
                onChange={(e) => setPayment({ ...payment, extendMonths: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Njia ya Malipo</label>
            <select className="input mt-1" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              <option value="MANUAL">Manual</option>
              <option value="MPESA">M-Pesa</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CARD">Card</option>
            </select>
          </div>
          {payMsg && <p className="text-sm text-emerald-600">{payMsg}</p>}
          <button className="btn-success w-full">Rekodi Malipo</button>
        </form>
      </div>

      {form.admins?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Company Admin</h2>
          <div className="card text-sm space-y-1">
            {form.admins.map((a) => (
              <p key={a.id}>
                {a.firstName} {a.lastName} ({a.username}) —{" "}
                {a.isActivated ? "Amewezesha akaunti" : "Bado hajawezesha akaunti (activation pending)"}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
