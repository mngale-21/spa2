"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCompanyPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [plans, setPlans] = useState(null);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
    subscriptionType: "",
    subscriptionStart: today,
    subscriptionEnd: in30Days,
    paymentAmount: "",
    paymentMethod: "CASH",
    paymentReference: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        const activePlans = (data.plans || []).filter((p) => p.isActive);
        setPlans(activePlans);
        if (activePlans[0]) {
          setForm((f) => ({ ...f, subscriptionType: activePlans[0].key, paymentAmount: activePlans[0].priceTzs }));
        }
      });
  }, []);

  const selectedPlan = plans?.find((p) => p.key === form.subscriptionType);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePlanChange(key) {
    const plan = plans.find((p) => p.key === key);
    setForm((f) => ({ ...f, subscriptionType: key, paymentAmount: plan ? plan.priceTzs : f.paymentAmount }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Imeshindwa kuongeza kampuni.");
      return;
    }
    setSuccess(data);
  }

  if (success) {
    return (
      <div className="max-w-2xl card space-y-4">
        <h1 className="font-display text-2xl text-ink-950">Kampuni Imeundwa! ✅</h1>
        <p className="text-sm text-ink-700/70">
          Mchakato wa moja kwa moja umekamilika: Company + Company Admin account + activation
          link + malipo vimerekodiwa, na email imetumwa kwa <strong>{form.email}</strong>.
        </p>
        <div className="bg-sand-100 rounded-lg p-4 text-sm space-y-1">
          <p><span className="text-ink-700/50">Username ya Company Admin:</span> <strong>{success.adminUsername}</strong></p>
          <p><span className="text-ink-700/50">Malipo yaliyorekodiwa:</span> <strong>TZS {Number(form.paymentAmount).toLocaleString()}</strong></p>
          <p className="break-all"><span className="text-ink-700/50">Activation link:</span> <a className="text-brass-600 underline" href={success.activationUrl} target="_blank">{success.activationUrl}</a></p>
        </div>
        <button onClick={() => router.push("/dashboard/companies")} className="btn-primary">
          Rudi kwenye Orodha ya Makampuni
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl text-ink-950 mb-1">Ongeza Kampuni Mpya</h1>
      <p className="text-sm text-ink-700/60 mb-4">
        Baada ya kubonyeza "Sajili", mfumo utafanya kila kitu wenyewe: kutengeneza akaunti ya
        Company Admin, kiungo cha activation, kurekodi malipo, na kutuma email kwa mteja.
      </p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-status-deletedTint text-status-deleted text-sm rounded-lg p-2">{error}</div>}

        <div>
          <label className="text-sm font-medium">Jina la Kampuni (Saloon)</label>
          <input className="input mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium">Jina la Mmiliki</label>
          <input className="input mt-1" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email ya Mteja</label>
            <input type="email" className="input mt-1" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Namba ya Simu / WhatsApp</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Kifurushi (Plan)</label>
            {!plans ? (
              <p className="text-xs text-ink-700/50 mt-2">Inapakia vifurushi...</p>
            ) : (
              <select className="input mt-1" value={form.subscriptionType} onChange={(e) => handlePlanChange(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} — matawi {p.maxBranches >= 999 ? "bila kikomo" : `hadi ${p.maxBranches}`}
                  </option>
                ))}
              </select>
            )}
            {selectedPlan && (
              <p className="text-xs text-ink-700/50 mt-1">
                Bei rasmi: TZS {Number(selectedPlan.priceTzs).toLocaleString()} / mwezi
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Tarehe ya Kuanza</label>
            <input type="date" className="input mt-1" value={form.subscriptionStart} onChange={(e) => update("subscriptionStart", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Tarehe ya Kuisha</label>
            <input type="date" className="input mt-1" value={form.subscriptionEnd} onChange={(e) => update("subscriptionEnd", e.target.value)} />
          </div>
        </div>

        <div className="border-t border-sand-200 pt-4">
          <p className="text-sm font-semibold text-ink-900 mb-2">Malipo ya Usajili (mteja analipia kabla ya kuwezeshwa)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Kiasi Kilicholipwa (TZS)</label>
              <input
                type="number"
                className="input mt-1"
                value={form.paymentAmount}
                onChange={(e) => update("paymentAmount", e.target.value)}
                required
              />
              <p className="text-xs text-ink-700/40 mt-1">Umejazwa kiotomatiki kutoka bei ya kifurushi — badilisha kama kuna punguzo/makubaliano tofauti.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Njia ya Malipo</label>
              <select className="input mt-1" value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
                <option value="CASH">Fedha Taslimu (Cash)</option>
                <option value="MOBILE_MONEY">Mobile Money (M-Pesa/Tigo/Airtel)</option>
                <option value="BANK_TRANSFER">Uhamisho wa Benki</option>
                <option value="OTHER">Nyingine</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Kumbukumbu ya Malipo (Reference)</label>
              <input className="input mt-1" placeholder="Namba ya muamala, n.k." value={form.paymentReference} onChange={(e) => update("paymentReference", e.target.value)} />
            </div>
          </div>
        </div>

        <button className="btn-primary" disabled={loading || !plans}>
          {loading ? "Inasajili..." : "Sajili Kampuni (Create Company)"}
        </button>
      </form>
    </div>
  );
}
