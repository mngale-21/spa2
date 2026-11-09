"use client";

import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import CancelBookingModal from "./CancelBookingModal";
import { useLanguage } from "../lib/i18n";

function minutesAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/**
 * AdminOnHoldPanel
 * The Admin's view of on-hold customers, branch-selectable (unlike the
 * Cashier's OnHoldPanel, which only ever needs its own branch). This is
 * deliberately a list of *customers*, not rooms — going on hold releases
 * the room they were assigned to back to Free, so it no longer belongs to
 * them; clearing the hold resumes the customer, either back in that room
 * (if it's free again) or reassigned to a different available one.
 *
 * Props:
 *  - branches: [{ id, name }]
 */
export default function AdminOnHoldPanel({ branches }) {
  const { t } = useLanguage();
  const [branchId, setBranchId] = useState(branches?.[0]?.id || "");
  const [onHold, setOnHold] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [reassignId, setReassignId] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    if (!branchId) return;
    setIsLoading(true);
    setError("");
    try {
      const { data } = await api.get("/rooms", { params: { branchId } });
      setOnHold(data.onHold || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load on-hold customers.");
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResumeOriginal(session) {
    setBusyId(session.id);
    setError("");
    try {
      await api.post(`/sessions/${session.id}/clear-hold`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't clear the hold.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenReassign(session) {
    setReassignId(session.id);
    setOptions(null);
    try {
      const { data } = await api.get(`/services/${session.serviceId}/availability`, { params: { branchId } });
      setOptions(data.options.filter((o) => o.available));
    } catch {
      setOptions([]);
    }
  }

  async function handleReassign(session, option) {
    setBusyId(session.id);
    setError("");
    try {
      await api.post(`/sessions/${session.id}/clear-hold`, {
        roomId: option.room.id,
        serviceId: session.serviceId,
      });
      setReassignId(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't reassign that customer.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(reason, refund) {
    const session = cancelTarget;
    setBusyId(session.id);
    setError("");
    try {
      await api.post(`/sessions/${session.id}/cancel`, { reason, refund });
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't cancel that booking.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-ink-900/8">
        <h3 className="font-medium text-ink-950 flex items-center gap-2">
          {t("onHoldCustomers")}
          {onHold.length > 0 && (
            <span className="rounded-full bg-status-busy text-cream-50 text-xs px-2 py-0.5">{onHold.length}</span>
          )}
        </h3>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm"
        >
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 py-5">
        {error && <p className="text-xs text-status-busy mb-3">{error}</p>}

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-ink-900/5 animate-pulse" />
            ))}
          </div>
        ) : onHold.length === 0 ? (
          <p className="text-sm text-ink-700/50 py-4 text-center">
            {t("noOneOnHold")}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {onHold.map((session) => (
              <div key={session.id} className="rounded-xl2 bg-status-busy/5 border border-status-busy/30 p-4 space-y-3">
                <div>
                  <p className="font-medium text-ink-950 flex items-center gap-2">
                    {session.customerName}
                    {session.bookedRemotely && (
                      <span className="rounded-full bg-brass-500/15 text-brass-700 text-[10px] font-medium px-2 py-0.5">
                        {t("bookedAheadBadge")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-700/60">
                    {session.service?.name} ·{" "}
                    {session.bookedRemotely ? t("reservedFor") : t("originallyLabel")} {session.room?.name} #
                    {session.room?.roomNumber} with {session.staff?.firstName} {session.staff?.lastName}
                  </p>
                  <p className="text-xs text-status-busy font-medium mt-1">
                    {t("onHoldForMin")} {minutesAgo(session.holdStartedAt)} {t("minSuffix")} · {t("roomFreeAgain")}
                  </p>
                </div>

                {reassignId === session.id ? (
                  <div className="space-y-2">
                    {options === null ? (
                      <p className="text-xs text-ink-700/50">{t("checkingAvailability")}</p>
                    ) : options.length === 0 ? (
                      <p className="text-xs text-ink-700/50">{t("noOtherRoomFree")}</p>
                    ) : (
                      options.map((o) => (
                        <button
                          key={o.assignmentId}
                          onClick={() => handleReassign(session, o)}
                          disabled={busyId === session.id}
                          className="w-full text-left rounded-lg border border-ink-900/12 px-3 py-2 text-xs hover:bg-ink-900/5 transition disabled:opacity-50"
                        >
                          {o.room.name} #{o.room.roomNumber} with {o.staff.firstName} {o.staff.lastName}
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => setReassignId(null)}
                      className="w-full rounded-lg border border-ink-900/12 py-2 text-xs text-ink-700 hover:bg-ink-900/5 transition"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResumeOriginal(session)}
                        disabled={busyId === session.id}
                        className="flex-1 rounded-lg bg-terracotta-600 text-cream-50 text-xs font-medium py-2 hover:bg-terracotta-700 transition disabled:opacity-50"
                      >
                        {t("clearHoldResume")}
                      </button>
                      <button
                        onClick={() => handleOpenReassign(session)}
                        disabled={busyId === session.id}
                        className="flex-1 rounded-lg border border-ink-900/12 text-ink-800 text-xs font-medium py-2 hover:bg-ink-900/5 transition disabled:opacity-50"
                      >
                        {t("reassign")}
                      </button>
                    </div>
                    <button
                      onClick={() => setCancelTarget(session)}
                      disabled={busyId === session.id}
                      className="w-full rounded-lg border border-status-busy/40 text-status-busy text-xs font-medium py-2 hover:bg-status-busy/5 transition disabled:opacity-50"
                    >
                      {t("cancelBookingBtn")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelBookingModal
          session={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
