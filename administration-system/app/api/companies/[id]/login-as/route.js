const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");
const { generateEnterSystemUrl } = require("@/lib/enterSystem");

/**
 * POST /api/companies/:id/login-as
 * "Enter System" (spec section 10) - inatengeneza kiungo cha kumfungulia
 * Super/Sub-Admin moja kwa moja kwenye mfumo wa saloon ukiwa na ruhusa za
 * Company Admin za kampuni hii, BILA password. Kila matumizi yanarekodiwa
 * kwenye ActivityLog (nani, kampuni gani, saa ngapi) kama inavyotakiwa.
 */
async function POST(req, { params }) {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  if (check.user.role === "SUB_ADMIN") {
    const link = await prisma.platformAdminCompany.findUnique({
      where: { platformAdminId_companyId: { platformAdminId: check.user.id, companyId: params.id } },
    });
    if (!link) return NextResponse.json({ error: "Huna ruhusa kwa kampuni hii." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) return NextResponse.json({ error: "Kampuni haipo." }, { status: 404 });

  if (company.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Kampuni hii haipo ACTIVE - haiwezekani kuingia kwenye mfumo wake." },
      { status: 400 }
    );
  }

  try {
    const url = generateEnterSystemUrl({ company, actingAdmin: check.user });

    await prisma.activityLog.create({
      data: {
        platformAdminId: check.user.id,
        companyId: company.id,
        action: "ENTER_SYSTEM",
        details: `${check.user.name} (${check.user.role}) aliingia kwenye mfumo wa "${company.name}" saa ${new Date().toLocaleString()}.`,
      },
    });

    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

module.exports = { POST };
