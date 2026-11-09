"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const UNCATEGORIZED = "__uncategorized__";

/**
 * ServicesManager
 * Admin-only panel for maintaining the per-branch service catalog that
 * Cashiers pick from. A service can optionally belong to a `category` —
 * e.g. several variants ("Full Body Massage", "Four-Hand Massage") can
 * share category "Massage", each with its own price and duration — or
 * leave the category blank for a standalone service like "Haircut",
 * exactly as before. The list groups by category automatically.
 *
 * Props:
 *  - branches: [{ id, name }]
 */
export default function ServicesManager({ branches }) {
  const [branchId, setBranchId] = useState(branches?.[0]?.id || "");
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ name: "", category: "", price: "", durationMins: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState(null); // service being edited

  useEffect(() => {
    if (branchId) loadServices(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function loadServices(id) {
    setIsLoading(true);
    try {
      const { data } = await api.get("/services", { params: { branchId: id } });
      setServices(data.services);
    } catch (err) {
      if (err?.response?.status !== 401) {
        setError(err?.response?.data?.message || "Couldn't load services.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.price || !form.durationMins) {
      setError("Fill in name, price, and duration.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/services", {
        name: form.name,
        category: form.category.trim() || undefined,
        price: Number(form.price),
        durationMins: Number(form.durationMins),
        branchId,
      });
      setForm((f) => ({ name: "", category: f.category, price: "", durationMins: "" }));
      await loadServices(branchId);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't add the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/services/${id}`);
      await loadServices(branchId);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't remove that service.");
    }
  }

  // Group services by category — uncategorized ones fall into their own
  // bucket, shown last, exactly like a plain flat list used to look.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of services) {
      const key = s.category || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    const entries = [...map.entries()];
    entries.sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [services]);

  const existingCategories = useMemo(
    () => [...new Set(services.map((s) => s.category).filter(Boolean))],
    [services]
  );

  return (
    <div className="rounded-xl2 bg-cream-50 border border-ink-900/8 shadow-soft">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-900/8">
        <h3 className="font-medium text-ink-950">Service catalog</h3>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
        >
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-ink-800/5 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-ink-700/50 py-2">No services yet for this branch.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-medium text-brass-700 uppercase tracking-wide mb-1">
                  {category === UNCATEGORIZED ? "Other services" : category}
                </p>
                <ul className="divide-y divide-ink-800/10">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-ink-900">{s.name}</p>
                        <p className="text-xs text-ink-700/50">{s.durationMins} min</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-ink-800 font-medium">
                          TZS {Number(s.price).toLocaleString()}
                        </span>
                        <button
                          onClick={() => setEditTarget(s)}
                          className="text-xs text-ink-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs text-status-busy hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="mt-4 space-y-2 border-t border-ink-900/8 pt-4">
          <p className="text-xs font-medium text-ink-700/60 uppercase tracking-wide">Add a service</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Service name (e.g. Full Body Massage)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <input
              list="service-categories"
              placeholder="Category (optional, e.g. Massage)"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <datalist id="service-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-ink-700/50">
            Leave category blank for a standalone service. Give several services the same category (e.g. "Massage")
            to group variants with their own price and duration — like "Full Body" and "Four-Hand".
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Price"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <input
              placeholder="Duration (mins)"
              type="number"
              min="1"
              value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))}
              className="rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-terracotta-600 text-cream-50 text-sm font-medium py-2 hover:bg-terracotta-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "+ Add service"}
          </button>
        </form>

        {error && <p className="mt-2 text-xs text-status-busy">{error}</p>}
      </div>

      {editTarget && (
        <EditServiceModal
          service={editTarget}
          existingCategories={existingCategories}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            loadServices(branchId);
          }}
        />
      )}
    </div>
  );
}

/**
 * EditServiceModal
 * Name / category / price / duration. Editing a service never touches
 * past sessions or reports — those keep whatever amount was actually
 * charged at the time (see updateService in serviceController.js) — so
 * it's safe to correct a price here even for a service with a long
 * history, unlike deleting it.
 */
function EditServiceModal({ service, existingCategories, onClose, onSaved }) {
  const [name, setName] = useState(service.name);
  const [category, setCategory] = useState(service.category || "");
  const [price, setPrice] = useState(String(service.price));
  const [durationMins, setDurationMins] = useState(String(service.durationMins));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !price || !durationMins) {
      setError("Fill in name, price, and duration.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/services/${service.id}`, {
        name: name.trim(),
        category: category.trim() || null,
        price: Number(price),
        durationMins: Number(durationMins),
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
          <h2 className="font-display text-lg text-ink-950">Edit service</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink-900 text-sm" aria-label="Close">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-800 mb-1">Service name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-800 mb-1">Category (optional)</label>
            <input
              list="edit-service-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            />
            <datalist id="edit-service-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-800 mb-1">Price</label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-800 mb-1">Duration (mins)</label>
              <input
                type="number"
                min="1"
                required
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </div>
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
