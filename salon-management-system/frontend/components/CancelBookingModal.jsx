"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";

/**
 * CancelBookingModal
 * The one place a booking gets cancelled from, everywhere in the app —
 * always requires a reason (a cancellation is never a silent click), and
 * if the booking was already paid, forces an explicit refund decision
 * right here rather than leaving it ambiguous.
 *
 * Props:
 *  - session: { customerName, service, transaction }
 *  - onClose: () => void
 *  - onConfirm: (reason, refund) => Promise<void>
 */
export default function CancelBookingModal({ session, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(null); // null until chosen, when relevant
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const wasPaid = session?.transaction?.status === "PAID";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) {
      setError(t("reasonRequiredError"));
      return;
    }
    if (wasPaid && refund === null) {
      setError(t("chooseRefundError"));
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim(), wasPaid ? refund : false);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't cancel the booking.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-cream-50 shadow-lift">
        <div className="px-6 py-5 border-b border-ink-900/8">
          <h2 className="font-display text-xl text-ink-950">{t("cancelBookingTitle")}</h2>
          <p className="text-sm text-ink-700/60 mt-0.5">
            {session?.customerName} · {session?.service?.name}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("reasonRequiredLabel")}</label>
            <textarea
              autoFocus
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. customer called to say they can't make it"
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>

          {wasPaid && (
            <div className="rounded-lg border border-brass-500/30 bg-brass-500/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-brass-700 uppercase tracking-wide">
                {t("refundQuestion")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefund(true)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    refund === true
                      ? "border-status-busy bg-status-busy/10 text-status-busy"
                      : "border-ink-900/12 text-ink-700 hover:bg-ink-900/5"
                  }`}
                >
                  {t("yesRefund")}
                </button>
                <button
                  type="button"
                  onClick={() => setRefund(false)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    refund === false
                      ? "border-ink-800 bg-ink-800/10 text-ink-800"
                      : "border-ink-900/12 text-ink-700 hover:bg-ink-900/5"
                  }`}
                >
                  {t("noKeepIt")}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-4 py-2.5 text-sm text-status-busy">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl2 border border-ink-900/12 py-2.5 font-medium text-ink-800 hover:bg-ink-900/5 transition"
            >
              {t("back")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl2 bg-status-busy text-cream-50 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? t("cancelling") : t("confirmCancellation")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
