"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TABS = [
  { key: "", label: "Wote" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "DELETED", label: "Deleted" },
];

function Badge({ status }) {
  const map = {
    ACTIVE: "badge-active",
    SUSPENDED: "badge-suspended",
    DELETED: "badge-deleted",
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

export default function CompaniesPage() {
  const [tab, setTab] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = tab ? `/api/companies?status=${tab}` : "/api/companies";
    const res = await fetch(url);
    const data = await res.json();
    setCompanies(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [tab]);

  async function handleSuspendToggle(company) {
    const action = company.status === "ACTIVE" ? "SUSPEND" : "ACTIVATE";
    const reason =
      action === "SUSPEND" ? prompt("Sababu ya kusimamisha (mf. subscription imeisha):") : undefined;
    await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    load();
  }

  async function handleDelete(company) {
    if (!confirm(`Una uhakika unataka ku-delete "${company.name}"?`)) return;
    await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    load();
  }

  async function handleLoginAs(company) {
    const res = await fetch(`/api/companies/${company.id}/login-as`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    window.open(data.url, "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Makampuni (Wateja)</h1>
        <Link href="/dashboard/companies/new" className="btn-primary">
          ➕ Ongeza Kampuni Mpya
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn-outline ${tab === t.key ? "bg-gray-900 text-white" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p>Inapakia...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Jina la Kampuni</th>
                <th>Mmiliki</th>
                <th>Email</th>
                <th>Matawi</th>
                <th>Hali</th>
                <th>Subscription Inaisha</th>
                <th>Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td>{c.ownerName}</td>
                  <td>{c.email}</td>
                  <td>{c.branchCount ?? 0}</td>
                  <td>
                    <Badge status={c.status} />
                  </td>
                  <td>
                    {c.subscriptionEnd ? new Date(c.subscriptionEnd).toLocaleDateString() : "-"}
                  </td>
                  <td className="flex gap-2 py-2 flex-wrap">
                    <Link href={`/dashboard/companies/${c.id}`} className="btn-outline text-xs">
                      ✏️ Edit
                    </Link>
                    {c.status !== "DELETED" && (
                      <button
                        onClick={() => handleSuspendToggle(c)}
                        className={`text-xs ${c.status === "ACTIVE" ? "btn-warning" : "btn-success"}`}
                      >
                        {c.status === "ACTIVE" ? "⛔ Suspend" : "✅ Activate"}
                      </button>
                    )}
                    {c.status === "ACTIVE" && (
                      <button onClick={() => handleLoginAs(c)} className="btn-outline text-xs">
                        🔑 Ingia kwenye Mfumo Wake
                      </button>
                    )}
                    {c.status !== "DELETED" && (
                      <button onClick={() => handleDelete(c)} className="btn-danger text-xs">
                        🗑️ Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-6">
                    Hakuna makampuni ya kuonesha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
