"use client";

import { useLanguage } from "../lib/i18n";

const STATUS_STYLES = {
  AVAILABLE: { key: "available", dot: "bg-status-available", text: "text-status-available", bg: "bg-status-available/10" },
  BUSY: { key: "busy", dot: "bg-status-busy", text: "text-status-busy", bg: "bg-status-busy/10" },
  PENDING: { key: "pending", dot: "bg-status-pending", text: "text-status-pending", bg: "bg-status-pending/10" },
  AWAITING_CASHIER: { key: "awaitingCashier", dot: "bg-brass-500", text: "text-brass-600", bg: "bg-brass-500/10" },
  AWAITING_PAYMENT: { key: "awaitingPayment", dot: "bg-status-pending", text: "text-status-pending", bg: "bg-status-pending/10" },
  BUSY_ELSEWHERE: { key: "busyElsewhere", dot: "bg-ink-700", text: "text-ink-700", bg: "bg-ink-700/10" },
  MAINTENANCE: { key: "maintenance", dot: "bg-ink-700", text: "text-ink-700", bg: "bg-ink-700/10" },
};

/**
 * StatusBadge — small colored pill + dot indicator.
 * Green = Available, Red = Busy, Yellow = Pending, Grey = Maintenance.
 * Labels come from the shared i18n dictionary, so they switch with the
 * app's language setting along with everything else.
 */
export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] || STATUS_STYLES.AVAILABLE;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} ${style.text} px-2.5 py-1 text-xs font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(style.key)}
    </span>
  );
}
