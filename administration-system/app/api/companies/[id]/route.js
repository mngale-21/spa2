const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");
const { sendEmail, companySuspendedEmail, companyReactivatedEmail } = require("@/lib/mailer");

async function assertAccess(user, companyId) {
  if (user.role === "SUPER_ADMIN") return true;
  const link = await prisma.platformAdminCompany.findUnique({
    where: { platformAdminId_companyId: { platformAdminId: user.id, companyId } },
  });
  return !!link;
}

// GET: taarifa za kampuni moja (pamoja na branch count na admin wake)
async function GET(req, { params }) {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const allowed = await assertAccess(check.user, params.id);
  if (!allowed) return NextResponse.json({ error: "Huna ruhusa kwa kampuni hii." }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) return NextResponse.json({ error: "Haipo." }, { status: 404 });

  const [branchCount, admins, subscriptions] = await Promise.all([
    prisma.branch.count({ where: { companyId: company.id } }),
    prisma.user.findMany({
      where: { companyId: company.id, role: "ADMIN" },
      select: { id: true, username: true, firstName: true, lastName: true, isActivated: true, isActive: true },
    }),
    prisma.subscription.findMany({ where: { companyId: company.id }, orderBy: { endDate: "desc" } }),
  ]);

  return NextResponse.json({ ...company, branchCount, admins, subscriptions });
}

// PATCH: EDIT taarifa, au SUSPEND/ACTIVATE - moja kwa moja kwenye Company.status.
// Kwa sababu Admin System na mfumo wa saloon vinatumia DATABASE MOJA, hii
// pekee ndiyo inayohitajika - hakuna webhook/API call ya nje inayohitajika.
async function PATCH(req, { params }) {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const allowed = await assertAccess(check.user, params.id);
  if (!allowed) return NextResponse.json({ error: "Huna ruhusa kwa kampuni hii." }, { status: 403 });

  const body = await req.json();
  const { action, name, ownerName, phone, subscriptionType, subscriptionEnd, reason } = body;

  const existing = await prisma.company.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Haipo." }, { status: 404 });

  let data = {};
  let logAction = "EDIT_COMPANY";

  if (action === "SUSPEND") {
    if (check.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sub-Admin hawezi ku-suspend kampuni." }, { status: 403 });
    }
    data.status = "SUSPENDED";
    logAction = "SUSPEND_COMPANY";
  } else if (action === "ACTIVATE") {
    if (check.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sub-Admin hawezi ku-activate kampuni." }, { status: 403 });
    }
    data.status = "ACTIVE";
    logAction = "ACTIVATE_COMPANY";
  } else {
    if (name) data.name = name;
    if (ownerName !== undefined) data.ownerName = ownerName;
    if (phone !== undefined) data.phone = phone;
    if (subscriptionType !== undefined) data.subscriptionType = subscriptionType;
    if (subscriptionEnd !== undefined) data.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
  }

  const updated = await prisma.company.update({ where: { id: params.id }, data });

  await prisma.activityLog.create({
    data: {
      platformAdminId: check.user.id,
      companyId: updated.id,
      action: logAction,
      details: reason || `${logAction} kwa "${updated.name}"`,
    },
  });

  if (action === "SUSPEND") {
    const { subject, html } = companySuspendedEmail({ companyName: updated.name, reason });
    try {
      await sendEmail({ to: updated.email, subject, html });
    } catch (e) {
      console.error("Email haikutumwa:", e.message);
    }
  } else if (action === "ACTIVATE") {
    const { subject, html } = companyReactivatedEmail({ companyName: updated.name });
    try {
      await sendEmail({ to: updated.email, subject, html });
    } catch (e) {
      console.error("Email haikutumwa:", e.message);
    }
  }

  return NextResponse.json(updated);
}

// DELETE: soft-delete salama - kampuni na WATUMIAJI WAKE wote wanazuiwa
// mara moja (Salon backend inaangalia Company.status kwenye kila request),
// lakini taarifa zote zinabaki kwenye database kwa historia/ripoti.
async function DELETE(req, { params }) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: { status: "DELETED", deletedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: { platformAdminId: check.user.id, companyId: updated.id, action: "DELETE_COMPANY" },
  });

  return NextResponse.json({ ok: true });
}

module.exports = { GET, PATCH, DELETE };
