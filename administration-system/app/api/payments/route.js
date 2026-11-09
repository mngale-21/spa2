const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");

// GET /api/payments?companyId=... - historia ya malipo (yote, au ya kampuni moja)
async function GET(req) {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  const where = {};
  if (companyId) where.companyId = companyId;

  if (check.user.role === "SUB_ADMIN") {
    const assigned = await prisma.platformAdminCompany.findMany({
      where: { platformAdminId: check.user.id },
      select: { companyId: true },
    });
    const ids = assigned.map((a) => a.companyId);
    where.companyId = companyId ? (ids.includes(companyId) ? companyId : "__none__") : { in: ids.length ? ids : ["__none__"] };
  }

  const payments = await prisma.payment.findMany({ where, orderBy: { paidAt: "desc" } });
  const companies = await prisma.company.findMany({
    where: { id: { in: [...new Set(payments.map((p) => p.companyId))] } },
    select: { id: true, name: true },
  });
  const nameById = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  return NextResponse.json(payments.map((p) => ({ ...p, companyName: nameById[p.companyId] || "?" })));
}

// POST /api/payments - kurekodi malipo mapya ya kampuni + ku-renew subscription yake
async function POST(req) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { companyId, amount, currency, method, reference, extendMonths, planName } = await req.json();
  if (!companyId || !amount) {
    return NextResponse.json({ error: "companyId na amount ni lazima." }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Kampuni haipo." }, { status: 404 });

  const payment = await prisma.payment.create({
    data: { companyId, amount, currency: currency || "TZS", method: method || "MANUAL", reference: reference || null },
  });

  let updatedCompany = company;
  if (extendMonths) {
    const base = company.subscriptionEnd && company.subscriptionEnd > new Date() ? company.subscriptionEnd : new Date();
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + Number(extendMonths));

    updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { subscriptionEnd: newEnd, subscriptionType: planName || company.subscriptionType },
    });

    await prisma.subscription.create({
      data: {
        companyId,
        planName: planName || company.subscriptionType || "Kifurushi cha Kawaida",
        amount,
        currency: currency || "TZS",
        startDate: new Date(),
        endDate: newEnd,
        status: "ACTIVE",
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      platformAdminId: check.user.id,
      companyId,
      action: "RECORD_PAYMENT",
      details: `Malipo ya ${amount} ${currency || "TZS"} yamerekodiwa kwa "${company.name}".`,
    },
  });

  return NextResponse.json({ payment, company: updatedCompany }, { status: 201 });
}

module.exports = { GET, POST };
