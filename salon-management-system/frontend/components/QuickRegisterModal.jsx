"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { groupServicesByCategory } from "../lib/groupServices";
import { useLanguage } from "../lib/i18n";

/**
 * QuickRegisterModal
 * "Register by task": the cashier picks a service, then picks EXACTLY
 * which free room/staff member should take the customer — same service
 * can be delivered by different staff in different rooms, so every
 * currently-free option is shown as its own clickable card (this used to
 * silently auto-assign the first free one; now the cashier always makes
 * the actual choice, same as picking a card straight off the room grid).
 *
 * Props:
 *  - branchId: string
 *  - services: [{ id, name, durationMins, price }]
 *  - onClose: () => void
 *  - onConfirm: ({ serviceId, roomId, customerName, customerPhone, paymentMethod, paymentAmount }) => Promise<void>
 */
export default function QuickRegisterModal({ branchId, services, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [serviceId, setServiceId] = useState(services?.[0]?.id || "");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(String(services?.[0]?.price ?? ""));
  const [availability, setAvailability] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setIsCheckingAvailability(true);
    setSelectedAssignmentId("");
    api
      .get(`/services/${serviceId}/availability`, { params: { branchId } })
      .then(({ data }) => {
        if (!cancelled) setAvailability(data.options);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, branchId]);

  const freeOptions = (availability || []).filter((o) => o.available);
  const selectedOption = freeOptions.find((o) => o.assignmentId === selectedAssignmentId) || null;

  function handleServiceChange(id) {
    setServiceId(id);
    const svc = (services || []).find((s) => s.id === id);
    if (svc) setPaymentAmount(String(svc.price));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!serviceId) {
      setError(t("pickAService"));
      return;
    }
    if (!selectedOption) {
      setError(t("pickAProvider"));
      return;
    }
    if (!customerName.trim()) {
      setError(t("customerNameRequired"));
      return;
    }
    if (!(Number(paymentAmount) > 0)) {
      setError("Enter the payment amount received.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm({
        serviceId,
        roomId: selectedOption.room.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
        paymentAmount,
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't register the customer.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="w-full max-w-md rounded-xl2 bg-cream-50 shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-900/8">
          <h2 className="font-display text-xl text-ink-950">{t("quickRegisterTitle")}</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink-900 text-sm" aria-label="Close">
            {t("close")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("serviceTaskLabel")}</label>
            <select
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              {groupServicesByCategory(services).map(([label, items]) => (
                <optgroup key={label} label={label}>
                  {items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — TZS {Number(s.price).toLocaleString()} ({s.durationMins} min)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("chooseProviderLabel")}</label>
            {isCheckingAvailability ? (
              <p className="rounded-lg bg-sage-50 border border-ink-900/8 px-3 py-2.5 text-xs text-ink-700/70">
                {t("checkingWhosFree")}
              </p>
            ) : freeOptions.length === 0 ? (
              <p className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-3 py-2.5 text-xs text-status-busy">
                {t("everyoneBusyNote")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {freeOptions.map((o) => (
                  <button
                    key={o.assignmentId}
                    type="button"
                    onClick={() => setSelectedAssignmentId(o.assignmentId)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition ${
                      selectedAssignmentId === o.assignmentId
                        ? "border-terracotta-600 bg-terracotta-600/10 text-ink-950"
                        : "border-ink-900/12 hover:bg-ink-900/5 text-ink-800"
                    }`}
                  >
                    <span className="font-medium">
                      {o.room.name} #{o.room.roomNumber}
                    </span>{" "}
                    <span className="text-ink-700/60">— {o.staff.firstName} {o.staff.lastName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("customerNameLabel")}</label>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              placeholder="e.g. Grace Mwakalinga"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("phoneOptionalLabel")}</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              placeholder="e.g. 0712 345 678"
            />
          </div>

          <div className="rounded-lg border border-brass-500/30 bg-brass-500/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-brass-700 uppercase tracking-wide">
              {t("paymentSectionTitle")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-800 mb-1">{t("amountLabel")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-800 mb-1">{t("paymentTypeLabel")}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                >
                  <option value="cash">{t("cash")}</option>
                  <option value="mobile_money">{t("mobileMoney")}</option>
                  <option value="card">{t("card")}</option>
                  <option value="unpaid">{t("unpaidPayLater")}</option>
                </select>
              </div>
            </div>
            {paymentMethod === "unpaid" && (
              <p className="text-xs text-status-busy">
                {t("unpaidWarning")}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-4 py-2.5 text-sm text-status-busy">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl2 border border-ink-900/12 py-2.5 font-medium text-ink-800 hover:bg-ink-800/5 transition"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedOption}
              className="flex-1 rounded-xl2 bg-terracotta-600 text-cream-50 py-2.5 font-medium hover:bg-terracotta-700 transition disabled:opacity-50"
            >
              {isSubmitting ? t("confirming") : t("confirmAndRegister")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
