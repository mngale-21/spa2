"use client";

import { useAdminSession } from "../../../../lib/useAdminSession";
import DashboardShell from "../../../../components/DashboardShell";
import RoomsManager from "../../../../components/RoomsManager";

/**
 * Admin Rooms
 * Room & staff roster management only (create/edit rooms, assign which
 * staff member delivers which service where). Live status — room
 * analytics and the on-hold customer list — moved to the Overview page
 * (the sidebar's first item), so this page stays focused purely on
 * configuration rather than mixing it with day-to-day monitoring.
 */
export default function AdminRoomsPage() {
  const { user, branches, isLoading } = useAdminSession();

  return (
    <DashboardShell user={user} title="Rooms">
      {isLoading || branches.length === 0 ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 rounded-xl2 bg-cream-50 border border-ink-900/8 animate-pulse" />
          ))}
        </div>
      ) : (
        <section>
          <h2 className="font-display text-xl text-ink-950 mb-4">Rooms & staff roster</h2>
          <RoomsManager branches={branches} />
        </section>
      )}
    </DashboardShell>
  );
}
