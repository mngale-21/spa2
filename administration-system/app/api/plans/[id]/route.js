const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");

// PATCH /api/plans/:id — SUPER_ADMIN pekee. Hariri bei, kikomo cha
// matawi/wafanyakazi, au zima kifurushi (isActive:false, hakitatolewa tena
// kwa kampuni mpya, lakini makampuni yaliyokwishakuwa nacho hayaguswi).
async function PATCH(req, { params }) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const body = await req.json();
    const data = {};
    if (body.label !== undefined) data.label = String(body.label).trim();
    if (body.maxBranches !== undefined) data.maxBranches = Number(body.maxBranches);
    if (body.maxStaff !== undefined) data.maxStaff = Number(body.maxStaff);
    if (body.whatsappEnabled !== undefined) data.whatsappEnabled = Boolean(body.whatsappEnabled);
    if (body.prioritySupport !== undefined) data.prioritySupport = Boolean(body.prioritySupport);
    if (body.advancedReports !== undefined) data.advancedReports = Boolean(body.advancedReports);
    if (body.priceTzs !== undefined) data.priceTzs = Number(body.priceTzs);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

    const plan = await prisma.plan.update({ where: { id: params.id }, data });

    await prisma.activityLog.create({
      data: { platformAdminId: check.user.id, action: "PLAN_UPDATED", details: `Kifurushi "${plan.label}" (${plan.key}) kimebadilishwa.` },
    });

    return NextResponse.json({ plan: { ...plan, priceTzs: Number(plan.priceTzs) } });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Kifurushi hakipatikani." }, { status: 404 });
    }
    console.error("PATCH /api/plans/:id error:", error);
    return NextResponse.json({ error: "Imeshindwa kuhariri kifurushi." }, { status: 500 });
  }
}

module.exports = { PATCH };
