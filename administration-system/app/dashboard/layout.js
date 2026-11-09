import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const ICONS = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z",
  companies: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01M9 8h.01M15 8h.01",
  revenue: "M2 9h20M6 15h4M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z",
  addCompany: "M12 5v14M5 12h14",
  subAdmins: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  plans: "M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 100 4 2 2 0 000-4z",
};

function NavIcon({ d, filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" width="18" height="18">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={filled ? "0" : "1.6"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export default function DashboardLayout({ children }) {
  const user = getSessionUser();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gradient-to-b from-ink-950 to-ink-800 text-sand-50 flex flex-col p-4 sticky top-0 h-screen overflow-y-auto">
        <div className="px-2 pt-2 pb-6 border-b border-white/10 mb-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-brass-400">Salon SaaS</span>
          <h2 className="font-display text-xl mt-1">Control Center</h2>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sand-100/85 hover:bg-white/8 hover:text-white transition" href="/dashboard">
            <NavIcon d={ICONS.dashboard} filled />
            Dashboard / Takwimu
          </Link>
          <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sand-100/85 hover:bg-white/8 hover:text-white transition" href="/dashboard/companies">
            <NavIcon d={ICONS.companies} />
            Makampuni (Wateja)
          </Link>
          <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sand-100/85 hover:bg-white/8 hover:text-white transition" href="/dashboard/revenue">
            <NavIcon d={ICONS.revenue} />
            Mapato (Revenue)
          </Link>
          <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sand-100/85 hover:bg-white/8 hover:text-white transition" href="/dashboard/plans">
            <NavIcon d={ICONS.plans} />
            Vifurushi (Plans)
          </Link>
          {user?.role === "SUPER_ADMIN" && (
            <>
              <div className="mt-2 pt-2 border-t border-white/10" />
              <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-brass-300 hover:bg-brass-500/10 hover:text-brass-200 transition" href="/dashboard/companies/new">
                <NavIcon d={ICONS.addCompany} />
                Ongeza Kampuni Mpya
              </Link>
              <Link className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sand-100/85 hover:bg-white/8 hover:text-white transition" href="/dashboard/admins">
                <NavIcon d={ICONS.subAdmins} />
                Sub-Admins
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10 text-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-8 w-8 rounded-full bg-brass-500/20 border border-brass-400/40 text-brass-300 flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.name?.[0] || "A"}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-sand-100/50 text-xs">{user?.role === "SUPER_ADMIN" ? "Admin Mkuu" : "Sub-Admin"}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 p-6 bg-sand-100">{children}</main>
    </div>
  );
}
