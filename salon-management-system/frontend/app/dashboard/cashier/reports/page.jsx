"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, isLoggedIn } from "../../../../lib/auth";
import DashboardShell from "../../../../components/DashboardShell";
import ReportsPanel from "../../../../components/ReportsPanel";

/**
 * Cashier Reports
 * Same report — same table, same PDF/Excel/CSV downloads — as the Admin
 * version, but scoped to the Cashier's own branch only. There's no branch
 * selector (they only have the one), and the backend independently
 * enforces the same restriction on every request regardless of what the
 * client sends (see restrictToOwnBranch on the reports routes), so this
 * is a genuine access boundary, not just a hidden dropdown.
 */
export default function CashierReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    const currentUser = getCurrentUser();
    if (currentUser?.role === "ADMIN") {
      router.push("/dashboard/admin/reports");
      return;
    }
    if (currentUser?.role === "STAFF") {
      router.push("/dashboard/staff");
      return;
    }
    setUser(currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownBranch = user?.branchId ? [{ id: user.branchId, name: user.branchName }] : [];

  return (
    <DashboardShell user={user} title="Reports">
      {!user ? (
        <div className="h-48 rounded-xl2 bg-cream-50 border border-ink-900/8 animate-pulse" />
      ) : (
        <ReportsPanel branches={ownBranch} showBranchSelector={false} />
      )}
    </DashboardShell>
  );
}
