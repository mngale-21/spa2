const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");

async function GET() {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  let companyIdFilter = {};
  if (check.user.role === "SUB_ADMIN") {
    const assigned = await prisma.platformAdminCompany.findMany({
      where: { platformAdminId: check.user.id },
      select: { companyId: true },
    });
    const ids = assigned.map((a) => a.companyId);
    companyIdFilter = { id: { in: ids.length ? ids : ["__none__"] } };
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Dashboard isicrash wakati hakuna data - kila query hapa inarudisha 0 au
  // [] kwa asili ikiwa database ni tupu, hivyo hakuna ulinzi wa ziada
  // unaohitajika kwa "empty state" (angalia spec sehemu 11).
  const [
    totalCompanies,
    active,
    suspended,
    deleted,
    totalSubscriptions,
    expiredSubscriptions,
    expiringSoon,
    revenueAgg,
    newCompaniesThisMonth,
    recentActivity,
  ] = await Promise.all([
    prisma.company.count({ where: companyIdFilter }),
    prisma.company.count({ where: { ...companyIdFilter, status: "ACTIVE" } }),
    prisma.company.count({ where: { ...companyIdFilter, status: "SUSPENDED" } }),
    prisma.company.count({ where: { ...companyIdFilter, status: "DELETED" } }),
    prisma.company.count({ where: { ...companyIdFilter, subscriptionEnd: { not: null } } }),
    prisma.company.count({ where: { ...companyIdFilter, subscriptionEnd: { lt: now }, status: { not: "DELETED" } } }),
    prisma.company.findMany({
      where: { ...companyIdFilter, subscriptionEnd: { gte: now, lte: in7Days }, status: "ACTIVE" },
      select: { id: true, name: true, subscriptionEnd: true },
      orderBy: { subscriptionEnd: "asc" },
    }),
    prisma.payment.aggregate({
      where: companyIdFilter.id ? { companyId: companyIdFilter.id } : {},
      _sum: { amount: true },
    }),
    prisma.company.count({
      where: {
        ...companyIdFilter,
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    prisma.activityLog.findMany({
      where: companyIdFilter.id ? { companyId: companyIdFilter.id } : {},
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { platformAdmin: { select: { name: true } } },
    }),
  ]);

  // Mapato ya kila mwezi (miezi 6 iliyopita) - kwa chati
  const payments = await prisma.payment.findMany({
    where: companyIdFilter.id ? { companyId: companyIdFilter.id } : {},
    orderBy: { paidAt: "asc" },
  });
  const monthly = {};
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + Number(p.amount);
  }
  const monthlyRevenue = Object.entries(monthly).map(([month, total]) => ({ month, total }));

  return NextResponse.json({
    totalCompanies,
    active,
    suspended,
    deleted,
    totalSubscriptions,
    expiredSubscriptions,
    expiringSoon,
    totalRevenue: Number(revenueAgg._sum.amount || 0),
    monthlyRevenue,
    newCompaniesThisMonth,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      by: a.platformAdmin?.name || "System",
      at: a.createdAt,
    })),
  });
}

module.exports = { GET };
