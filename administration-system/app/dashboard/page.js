"use client";
import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink-900 text-white text-xs px-3 py-2 shadow-lift">
      <p className="text-sand-100/60 mb-0.5">{label}</p>
      <p className="font-semibold">TZS {Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
}

export default function DashboardHome() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <p className="text-ink-700/60">Inapakia takwimu...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-950 mb-6">Takwimu za Jumla (Dashboard)</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Jumla ya Makampuni" value={stats.totalCompanies} />
        <StatCard label="Wateja Active" value={stats.active} tone="green" />
        <StatCard label="Wamesimamishwa" value={stats.suspended} tone="amber" />
        <StatCard label="Waliofutwa" value={stats.deleted} tone="red" />
        <StatCard label="Makampuni Mapya (Mwezi Huu)" value={stats.newCompaniesThisMonth} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Jumla ya Subscriptions" value={stats.totalSubscriptions} />
        <StatCard label="Subscriptions Zilizoisha" value={stats.expiredSubscriptions} tone="red" />
        <StatCard label="Mapato Yote (TZS)" value={stats.totalRevenue.toLocaleString()} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="font-display text-lg text-ink-950 mb-4">Mwenendo wa Mapato kwa Mwezi</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.monthlyRevenue}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C79A4B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C79A4B" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#12161D" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#12161D99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12161D99" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#C79A4B", strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#A97F35"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                dot={{ r: 3, fill: "#A97F35", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {stats.monthlyRevenue.length === 0 && (
            <p className="text-sm text-ink-700/40 mt-2">Bado hakuna malipo yaliyorekodiwa.</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg text-ink-950 mb-4">Subscriptions Zinazokaribia Kuisha (Siku 7)</h2>
          {stats.expiringSoon.length === 0 ? (
            <p className="text-sm text-ink-700/40">Hakuna kampuni inayokaribia kuisha subscription wiki hii.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.expiringSoon.map((c) => (
                <li key={c.id} className="flex justify-between items-center border-b border-ink-900/8 pb-2 last:border-0">
                  <span className="text-ink-800">{c.name}</span>
                  <span className="badge badge-suspended">{new Date(c.subscriptionEnd).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg text-ink-950 mb-4">Matukio ya Hivi Karibuni (Recent Activities)</h2>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-ink-700/40">Hakuna matukio bado.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {stats.recentActivity.map((a) => (
              <li key={a.id} className="border-b border-ink-900/8 pb-2 last:border-0">
                <span className="font-medium text-ink-900">{a.action}</span>
                <span className="text-ink-700/70"> — {a.details}</span>
                <div className="text-xs text-ink-700/40">
                  {a.by} • {new Date(a.at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
