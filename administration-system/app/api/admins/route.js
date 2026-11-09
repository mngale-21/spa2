const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { requireUser, hashPassword } = require("@/lib/auth");
const { sendEmail } = require("@/lib/mailer");

// GET: Orodha ya Sub-Admins (Super Admin pekee)
async function GET() {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const admins = await prisma.platformAdmin.findMany({
    where: { role: "SUB_ADMIN" },
    include: { managedCompanies: true },
    orderBy: { createdAt: "desc" },
  });

  // Jaza majina ya makampuni kwa kila Sub-Admin (Company iko kwenye
  // model tofauti hapa - hakuna Prisma relation kati ya PlatformAdminCompany
  // na Company, kwa makusudi - angalia maelezo kwenye schema.prisma).
  const allCompanyIds = [...new Set(admins.flatMap((a) => a.managedCompanies.map((m) => m.companyId)))];
  const companies = allCompanyIds.length
    ? await prisma.company.findMany({ where: { id: { in: allCompanyIds } }, select: { id: true, name: true } })
    : [];
  const nameById = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const result = admins.map((a) => ({
    ...a,
    managedCompanies: a.managedCompanies.map((m) => ({ ...m, companyName: nameById[m.companyId] || "?" })),
  }));

  return NextResponse.json(result);
}

// POST: Kuunda Sub-Admin mpya na kumpa makampuni ya kusimamia
async function POST(req) {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { name, email, password, companyIds } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Jina, email na password ni lazima." }, { status: 400 });
  }

  const existing = await prisma.platformAdmin.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Sub-Admin mwenye email hii tayari yupo." }, { status: 409 });

  const passwordHash = await hashPassword(password);

  const admin = await prisma.platformAdmin.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SUB_ADMIN",
      managedCompanies: {
        create: (companyIds || []).map((companyId) => ({ companyId })),
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      platformAdminId: check.user.id,
      action: "CREATE_SUB_ADMIN",
      details: `Sub-Admin "${name}" ameundwa na amepewa makampuni ${(companyIds || []).length}.`,
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "Akaunti yako ya Usimamizi (Sub-Admin) imeundwa",
      html: `<p>Habari ${name},</p><p>Umetengenezewa akaunti ya Sub-Admin kwenye Administration System.</p>
             <p>Email: ${email}<br/>Password: ${password}</p>
             <p>Tafadhali badilisha password yako baada ya kuingia.</p>`,
    });
  } catch (e) {
    console.error("Email ya sub-admin haikutumwa:", e.message);
  }

  return NextResponse.json(admin, { status: 201 });
}

module.exports = { GET, POST };
