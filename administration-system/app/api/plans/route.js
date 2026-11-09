const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");

// GET /api/plans
// Kila mtu aliye-login anaweza kuona vifurushi (SUB_ADMIN anavihitaji pia
// wakati wa kuongeza kampuni). Wanaoweza kuhariri ni SUPER_ADMIN tu (chini).
async function GET() {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  const serialized = plans.map((p) => ({ ...p, priceTzs: Number(p.priceTzs) }));
  return NextResponse.json({ plans: serialized });
}

// POST /api/plans — SUPER_ADMIN pekee. Kuongeza kifurushi kipya
// (mf. "kifurushi maalum" cha mteja fulani).
async function POST(req) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const body = await req.json();
    const { key, label, maxBranches, maxStaff, whatsappEnabled, prioritySupport, advancedReports, priceTzs, sortOrder } = body;

    if (!key || !label) {
      return NextResponse.json({ error: "key na label ni lazima." }, { status: 400 });
    }
    const normalizedKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");

    const plan = await prisma.plan.create({
      data: {
        key: normalizedKey,
        label: label.trim(),
        maxBranches: Number(maxBranches) || 1,
        maxStaff: Number(maxStaff) || 5,
        whatsappEnabled: Boolean(whatsappEnabled),
        prioritySupport: Boolean(prioritySupport),
        advancedReports: Boolean(advancedReports),
        priceTzs: Number(priceTzs) || 0,
        sortOrder: Number(sortOrder) || 0,
      },
    });

    await prisma.activityLog.create({
      data: { platformAdminId: check.user.id, action: "PLAN_CREATED", details: `Kifurushi "${plan.label}" (${plan.key}) kimeongezwa.` },
    });

    return NextResponse.json({ plan: { ...plan, priceTzs: Number(plan.priceTzs) } }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Kuna kifurushi chenye 'key' hii tayari." }, { status: 409 });
    }
    console.error("POST /api/plans error:", error);
    return NextResponse.json({ error: "Imeshindwa kuongeza kifurushi." }, { status: 500 });
  }
}

module.exports = { GET, POST };
