"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { useLanguage } from "../lib/i18n";

/**
 * EmployeesManager
 * Admin-only. Every Cashier and Staff member, grouped by branch — edit a
 * name or move someone to a different branch, reset a forgotten password
 * (shown once, same as at registration), reactivate an account that had
 * to be deactivated rather than deleted (because it has historical
 * sessions attached), or remove one entirely.
 *
 * Props:
 *  - branches: [{ id, name }] — needed for the "move to branch" picker
 */
export default function EmployeesManager({ branches }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState(null); // employee being edited
  const [resetNotice, setResetNotice] = useState(null); // { name, notice }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  async function load() {
    setIsLoading(true);
    try {
      const { data } = await api.get("/employees", { params: includeInactive ? { includeInactive: true } : {} });
      setGroups(data.branches);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load employees.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(employeeId, name) {
    if (!window.confirm(`Remove ${name}? This can't be undone.`)) return;
    try {
      await api.delete(`/employees/${employeeId}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't remove that employee.");
    }
  }

  async function handleReactivate(employeeId, name) {
    try {
      await api.patch(`/employees/${employeeId}`, { isActive: true });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || `Couldn't reactivate ${name}.`);
    }
  }

  async function handleResetPassword(employeeId, name) {
    if (!window.confirm(`Reset ${name}'s password to the default (their last name)?`)) return;
    try {
      const { data } = await api.patch(`/employees/${employeeId}/reset-password`);
      setResetNotice({ name, notice: data.notice });
    } catch (err) {
      setError(err?.response?.data?.message || `Couldn't reset ${name}'s password.`);
    }
  }

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl2 bg-cream-50 border border-ink-900/8 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-status-busy">{error}</p>}
        <label className="ml-auto flex items-center gap-2 text-xs text-ink-700/60">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-ink-900/20"
          />
          Show deactivated accounts
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.branchId} className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-soft">
            <div className="px-4 py-3 border-b border-ink-900/8 flex items-center justify-between">
              <p className="font-medium text-ink-950">{group.branchName}</p>
              <span className="text-xs rounded-full bg-brass-500/10 text-brass-600 px-2 py-0.5 font-medium">
                {group.branchCode}
              </span>
            </div>
            {group.employees.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-700/50">No employees yet.</p>
            ) : (
              <ul className="divide-y divide-ink-800/10">
                {group.employees.map((e) => (
                  <li key={e.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900 truncate">
                          {e.firstName} {e.lastName}
                        </p>
                        <p className="text-xs text-ink-700/50 capitalize">
                          {e.role === "STAFF" ? t("roleStaff") : e.role === "ADMIN" ? t("roleAdmin") : t("roleCashier")} · @{e.username}
                          {e.email ? ` · ${e.email}` : ""}
                          {!e.isActive && (
                            <span className="text-status-busy font-medium"> · deactivated</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {e.isActive ? (
                        <>
                          <button onClick={() => setEditTarget({ ...e, branchId: group.branchId })} className="text-ink-700 hover:underline">
                            Edit
                          </button>
                          <button
                            onClick={() => handleResetPassword(e.id, `${e.firstName} ${e.lastName}`)}
                            className="text-brass-700 hover:underline"
                          >
                            Reset password
                          </button>
                          <button
                            onClick={() => handleDelete(e.id, `${e.firstName} ${e.lastName}`)}
                            className="text-status-busy hover:underline ml-auto"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReactivate(e.id, `${e.firstName} ${e.lastName}`)}
                          className="text-status-available hover:underline"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {editTarget && (
        <EditEmployeeModal
          employee={editTarget}
          branches={branches}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {resetNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-sm rounded-xl2 bg-cream-50 shadow-xl p-6 space-y-4">
            <h3 className="font-display text-lg text-ink-950">Password reset</h3>
            <p className="text-sm text-ink-700">{resetNotice.notice}</p>
            <p className="text-xs text-status-busy">
              This is shown once — write it down now. You won't be able to see it again after closing this.
            </p>
            <button
              onClick={() => setResetNotice(null)}
              className="w-full rounded-xl2 bg-terracotta-600 text-cream-50 py-2.5 font-medium hover:bg-terracotta-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EditEmployeeModal
 * Name + branch reassignment. Role is intentionally not editable (see the
 * note in employeeController.js's updateEmployee) — remove and re-register
 * instead if a Cashier truly needs to become Staff or vice versa.
 */
function EditEmployeeModal({ employee, branches, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [branchId, setBranchId] = useState(employee.branchId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/employees/${employee.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        branchId: branchId || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't save those changes.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl2 bg-cream-50 shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-900/8">
          <h2 className="font-display text-lg text-ink-950">Edit employee</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink-900 text-sm" aria-label="Close">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-800 mb-1">First name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-800 mb-1">Last name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </div>
          </div>
          {employee.role !== "ADMIN" && (
            <div>
              <label className="block text-xs font-medium text-ink-800 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              >
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-700/50 mt-1">
                Moving branches clears their current room/service roster assignment — reassign it after saving.
              </p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl2 bg-terracotta-600 text-cream-50 py-2.5 font-medium hover:bg-terracotta-700 transition disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
