"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { groupServicesByCategory } from "../lib/groupServices";
import { useLanguage } from "../lib/i18n";

/**
 * RemoteBookingModal
 * "Book ahead" — for a customer who has already paid/ordered but isn't
 * physically at the salon yet (phoned in, or asked to be booked for a
 * little later). Unlike a normal walk-in registration, this never starts
 * the 10-minute "walking to the room" countdown — the booking is created
 * straight into On Hold, reserved against a specific room + provider, and
 * simply waits there (visible in the On-Hold panel, marked "Booked
 * ahead") until a cashier checks the customer in when they actually show
 * up — clearing the hold into that same room, or reassigning to a
 * different one if it's since gotten busy.
 *
 * Because the customer isn't arriving right now, EVERY provider who
 * offers the chosen service is shown — including ones currently busy with
 * someone else — since that has no bearing on a booking for later. This
 * is also where a customer's preference for a specific service provider
 * is captured: the cashier picks exactly who the booking is reserved
 * for.
 *
 * Props:
 *  - branchId: string
 *  - services: [{ id, name, durationMins, price }]
 *  - onClose: () => void
 *  - onConfirm: ({ serviceId, roomId, customerName, customerPhone, paymentMethod, paymentAmount }) => Promise<void>
 */
export default function RemoteBookingModal({ branchId, services, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [serviceId, setServiceId] = useState(services?.[0]?.id || "");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(String(services?.[0]?.price ?? ""));
  const [options, setOptions] = useState(null);
  const [isCheckingOptions, setIsCheckingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setIsCheckingOptions(true);
    setSelectedAssignmentId("");
    api
      .get(`/services/${serviceId}/availability`, { params: { branchId } })
      .then(({ data }) => {
        if (!cancelled) setOptions(data.options);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, branchId]);

  const selectedOption = (options || []).find((o) => o.assignmentId === selectedAssignmentId) || null;

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
      setError(err?.response?.data?.message || "Couldn't book that customer in.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="w-full max-w-md rounded-xl2 bg-cream-50 shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-900/8">
          <div>
            <h2 className="font-display text-xl text-ink-950">{t("remoteBookingTitle")}</h2>
            <p className="text-sm text-ink-700/60 mt-0.5">{t("remoteBookingSubtitle")}</p>
          </div>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink-900 text-sm shrink-0" aria-label="Close">
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
            <label className="block text-sm font-medium text-ink-800 mb-1.5">{t("preferredProviderLabel")}</label>
            {isCheckingOptions ? (
              <p className="rounded-lg bg-sage-50 border border-ink-900/8 px-3 py-2.5 text-xs text-ink-700/70">
                {t("checkingWhosFree")}
              </p>
            ) : (options || []).length === 0 ? (
              <p className="rounded-lg bg-status-busy/10 border border-status-busy/30 px-3 py-2.5 text-xs text-status-busy">
                {t("noProviderForService")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {options.map((o) => (
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
                    {!o.available && (
                      <span className="ml-2 rounded-full bg-status-busy/10 text-status-busy text-[10px] px-2 py-0.5 align-middle">
                        {t("busyNowFineForLater")}
                      </span>
                    )}
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
              <p className="text-xs text-status-busy">{t("unpaidWarning")}</p>
            )}
          </div>

          <p className="text-xs text-ink-700/50">{t("remoteBookingNote")}</p>

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
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedOption}
              className="flex-1 rounded-xl2 bg-terracotta-600 text-cream-50 py-2.5 font-medium hover:bg-terracotta-700 transition disabled:opacity-50"
            >
              {isSubmitting ? t("confirming") : t("confirmBookAhead")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
