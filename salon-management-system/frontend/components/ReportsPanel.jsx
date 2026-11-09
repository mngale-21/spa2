"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";

const STATUS_STYLES = {
  COMPLETED: "bg-[#e7f0ea] text-[#2f6b4f]",
  CANCELLED: "bg-[#f5e4e4] text-[#a13f3f]",
  EXPIRED: "bg-[#f5e4e4] text-[#a13f3f]",
  ON_HOLD: "bg-[#fbf0dd] text-[#a3711a]",
  ACTIVE: "bg-status-pending/10 text-status-pending",
  PENDING_ARRIVAL: "bg-status-pending/10 text-status-pending",
  AWAITING_CASHIER: "bg-brass-500/10 text-brass-600",
};

const FINANCIAL_STYLES = {
  paid: "text-status-available",
  unpaid: "text-status-busy",
  partial: "text-status-busy",
  refunded: "text-ink-700",
  "n/a": "text-ink-700/40",
};

function formatMoney(n) {
  return `TZS ${Number(n || 0).toLocaleString()}`;
}

const DOWNLOAD_FORMATS = [
  { kind: "pdf", label: "PDF", mime: "application/pdf" },
  { kind: "csv", label: "CSV", mime: "text/csv" },
];

/**
 * ReportsPanel
 * Admin sees every branch; a Cashier sees only their own (the backend
 * enforces this independently either way — see restrictToOwnBranch — so
 * this component never has to trust its own branch selector). Filters
 * every service scenario by branch and by date, then presents it as one
 * clean, letterhead-style table — matching the look of the downloadable
 * PDF/Excel/CSV rather than a scattered dashboard of separate stat cards —
 * so what's on screen is exactly a preview of what gets downloaded.
 *
 * Props:
 *  - branches: [{ id, name }]
 *  - showBranchSelector?: boolean — hidden for a Cashier, who only has one
 */
export default function ReportsPanel({ branches, showBranchSelector = true }) {
  const today = () => new Date().toISOString().slice(0, 10);

  const [branchId, setBranchId] = useState("");
  const [dateMode, setDateMode] = useState("all"); // "all" | "day" | "range"
  const [day, setDay] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [scenario, setScenario] = useState("all");
  const [scenarios, setScenarios] = useState([{ key: "all", label: "All" }]);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [refundTarget, setRefundTarget] = useState(null); // row

  // The list of scenario filters comes from the backend (SCENARIOS in
  // reportController.js) so the dropdown can never drift out of sync with
  // what the server actually knows how to filter by.
  useEffect(() => {
    api
      .get("/reports/scenarios")
      .then(({ data }) => setScenarios(data.scenarios))
      .catch(() => {});
  }, []);

  const filters = () => {
    const params = {};
    if (branchId) params.branchId = branchId;
    if (scenario !== "all") params.scenario = scenario;
    if (dateMode === "day" && day) {
      params.from = day;
      params.to = day;
    }
    if (dateMode === "range" && rangeFrom && rangeTo) {
      // Swap so a person picking the dates in either order still gets a
      // valid range instead of an empty result.
      params.from = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      params.to = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
    }
    return params;
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await api.get("/reports/detailed", { params: filters() });
      setData(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load the report.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, scenario, dateMode, day, rangeFrom, rangeTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Shared by all three download buttons. Each click computes its own
  // snapshot straight from the backend (no shared client-side state is
  // written), so it's safe for more than one person signed into the same
  // account to download reports — even overlapping date ranges — at the
  // same time.
  async function handleDownload(kind, mime) {
    setIsDownloading(kind);
    setError("");
    try {
      const response = await api.get(`/reports/${kind}`, { params: filters(), responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: mime }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `salon-system-report-${Date.now()}.${kind}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      setError(`Couldn't generate the ${kind.toUpperCase()} report.`);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleRefund(row, amount, reason) {
    try {
      await api.post(`/rooms/transactions/${row.transactionId}/refund`, {
        amount: amount ? Number(amount) : undefined,
        reason: reason || undefined,
      });
      setRefundTarget(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't record the refund.");
    }
  }

  const periodText = data?.range?.from
    ? `${data.range.from}${data.range.to && data.range.to !== data.range.from ? ` → ${data.range.to}` : ""}`
    : "All time since launch";

  return (
    <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-soft overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-ink-900/8">
        <h3 className="font-medium text-ink-950">Service & financial report</h3>
        <div className="flex flex-wrap items-center gap-2">
          {showBranchSelector && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="">All branches</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-ink-900/12 overflow-hidden text-sm">
            <button
              onClick={() => setDateMode("all")}
              className={`px-3 py-1.5 transition ${dateMode === "all" ? "bg-ink-950 text-cream-50" : "bg-transparent text-ink-700 hover:bg-ink-900/5"}`}
            >
              All time
            </button>
            <button
              onClick={() => setDateMode("day")}
              className={`px-3 py-1.5 transition ${dateMode === "day" ? "bg-ink-950 text-cream-50" : "bg-transparent text-ink-700 hover:bg-ink-900/5"}`}
            >
              Specific day
            </button>
            <button
              onClick={() => setDateMode("range")}
              className={`px-3 py-1.5 transition ${dateMode === "range" ? "bg-ink-950 text-cream-50" : "bg-transparent text-ink-700 hover:bg-ink-900/5"}`}
            >
              Date range
            </button>
          </div>
          {dateMode === "day" && (
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          )}
          {dateMode === "range" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
              <span className="text-ink-700/40 text-xs">to</span>
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scenario filter — pills built from the backend's SCENARIOS list */}
      <div className="flex flex-wrap items-center gap-1.5 px-5 py-3 border-b border-ink-900/8 bg-sage-50/40">
        <span className="text-[11px] uppercase tracking-wide text-ink-700/50 mr-1">Scenario:</span>
        {scenarios.map((s) => (
          <button
            key={s.key}
            onClick={() => setScenario(s.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              scenario === s.key
                ? "bg-terracotta-600 text-cream-50"
                : "bg-cream-50 text-ink-700 border border-ink-900/12 hover:bg-ink-900/5"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-status-busy px-5 pt-3">{error}</p>}

      {isLoading ? (
        <div className="p-5">
          <div className="h-64 rounded-lg bg-ink-900/5 animate-pulse" />
        </div>
      ) : (
        data && (
          <>
            {/* Letterhead band — same brand colour + layout as the PDF/Excel export */}
            <div className="bg-terracotta-700 text-cream-50 px-5 py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <p className="font-display text-base leading-tight">{data.branchName}</p>
                <p className="text-[11px] text-cream-50/70">
                  {data.scenario !== "all" ? `Filtered: ${data.scenarioLabel} · ` : ""}
                  {periodText}
                </p>
              </div>
              <p className="text-[11px] text-cream-50/70">Generated {new Date(data.generatedAt).toLocaleString()}</p>
            </div>

            {/* One tidy summary strip instead of two separate stat sections */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-ink-900/8 border-b border-ink-900/8">
              {[
                ["Total sessions", data.totals.totalSessions, false],
                ["Completed", data.totals.completedCount, false],
                ["Cancelled", data.totals.cancelledCount, false],
                ["No-show / expired", data.totals.expiredCount, false],
                ["Ended early", data.totals.earlyEndedCount, false],
                ["Received", formatMoney(data.totals.received), true],
                ["Uncollected", formatMoney(data.totals.uncollected), true],
                ["Refunded", formatMoney(data.totals.refunded), true],
                ["Net revenue", formatMoney(data.totals.net), true],
                ["Delayed arrivals", data.totals.delayedCount, false],
              ].map(([label, value, money]) => (
                <div key={label} className="bg-cream-50 px-3 py-2.5 border-l-2 border-terracotta-600">
                  <p className="text-[10px] uppercase tracking-wide text-ink-700/50">{label}</p>
                  <p className={`font-display mt-0.5 ${money ? "text-base text-ink-950" : "text-lg text-ink-950"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* The table itself — the report */}
            <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-cream-50 bg-terracotta-700">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Room</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Staff</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Financial</th>
                    <th className="px-3 py-2 font-medium">Details</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/8">
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-ink-700/50">
                        No sessions in this period.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((r, idx) => (
                      <tr key={r.id} className={idx % 2 === 1 ? "bg-[#faf7f0]" : "bg-cream-50"}>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-800">{new Date(r.registeredAt).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-800">{r.room}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-800">{r.customerName}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-800">{r.service}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-800">{r.staff}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[r.status] || "bg-ink-900/5 text-ink-700"}`}>
                            {r.status}
                            {r.delayed ? " · delayed" : ""}
                            {r.endedEarly ? " · early" : ""}
                          </span>
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap font-medium ${FINANCIAL_STYLES[r.financialOutcome] || ""}`}>
                          {r.financialOutcome === "n/a" ? "—" : `${r.financialOutcome} · ${formatMoney(r.amount)}`}
                        </td>
                        <td className="px-3 py-2 text-ink-800 max-w-[220px]">{r.details}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.financialOutcome === "paid" && (
                            <button onClick={() => setRefundTarget(r)} className="text-status-busy hover:underline">
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {/* Downloads — same three formats, same underlying data */}
      <div className="flex flex-wrap gap-3 px-5 py-4 border-t border-ink-900/8">
        {DOWNLOAD_FORMATS.map((f) => (
          <button
            key={f.kind}
            onClick={() => handleDownload(f.kind, f.mime)}
            disabled={!!isDownloading}
            className={
              f.kind === "pdf"
                ? "rounded-xl2 bg-terracotta-600 text-cream-50 text-sm font-medium px-5 py-2.5 hover:bg-terracotta-700 transition disabled:opacity-50"
                : "rounded-xl2 border border-ink-900/12 text-ink-800 text-sm font-medium px-5 py-2.5 hover:bg-ink-900/5 transition disabled:opacity-50"
            }
          >
            {isDownloading === f.kind ? "Preparing…" : `Download ${f.label} report`}
          </button>
        ))}
      </div>

      {refundTarget && (
        <RefundModal row={refundTarget} onClose={() => setRefundTarget(null)} onConfirm={handleRefund} />
      )}
    </div>
  );
}

function RefundModal({ row, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(row.amount));
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    await onConfirm(row, amount, reason);
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-cream-50 shadow-lift">
        <div className="px-6 py-5 border-b border-ink-900/8">
          <h2 className="font-display text-xl text-ink-950">Refund payment</h2>
          <p className="text-sm text-ink-700/60 mt-0.5">
            {row.customerName} · {row.service} · originally paid {formatMoney(row.amount)}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">Refund amount</label>
            <input
              type="number"
              min="0"
              max={row.amount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <p className="text-xs text-ink-700/50 mt-1">Leave as the full amount, or lower it for a partial refund.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              placeholder="e.g. customer dissatisfied"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl2 border border-ink-900/12 py-2.5 font-medium text-ink-800 hover:bg-ink-900/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl2 bg-status-busy text-cream-50 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? "Processing…" : "Issue refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
