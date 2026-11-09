const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");

// PATCH: Kubadilisha makampuni aliyopewa Sub-Admin, au ku-deactivate akaunti yake
async function PATCH(req, { params }) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { companyIds, isActive, name } = await req.json();

  if (Array.isArray(companyIds)) {
    await prisma.platformAdminCompany.deleteMany({ where: { platformAdminId: params.id } });
    if (companyIds.length) {
      await prisma.platformAdminCompany.createMany({
        data: companyIds.map((companyId) => ({ platformAdminId: params.id, companyId })),
      });
    }
  }

  const data = {};
  if (typeof isActive === "boolean") data.isActive = isActive;
  if (name) data.name = name;

  const updated = await prisma.platformAdmin.update({ where: { id: params.id }, data });

  await prisma.activityLog.create({
    data: {
      platformAdminId: check.user.id,
      action: "UPDATE_SUB_ADMIN",
      details: `Sub-Admin ${updated.name} amebadilishwa.`,
    },
  });

  return NextResponse.json(updated);
}

module.exports = { PATCH };
