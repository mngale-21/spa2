const { NextResponse } = require("next/server");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { prisma } = require("@/lib/db");
const { requireUser } = require("@/lib/auth");
const { sendEmail, companyActivationEmail, subscriptionExpiringEmail } = require("@/lib/mailer");
const { sendWhatsAppMessage } = require("@/lib/whatsapp");

// Huzalisha username ya kipekee kwa Company Admin, mf. "admin.abc-salon-x7q2"
// (globally unique kwenye database moja inayoshirikiwa na mfumo wa saloon).
function generateUsername(companyName) {
  const slug = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `admin.${slug}-${suffix}`;
}

/**
 * GET /api/companies?status=ACTIVE|SUSPENDED|DELETED
 * Super Admin -> makampuni yote. Sub-Admin -> aliyopewa tu.
 */
async function GET(req) {
  const check = requireUser(["SUPER_ADMIN", "SUB_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = {};
  if (status) where.status = status;

  if (check.user.role === "SUB_ADMIN") {
    const assigned = await prisma.platformAdminCompany.findMany({
      where: { platformAdminId: check.user.id },
      select: { companyId: true },
    });
    const ids = assigned.map((a) => a.companyId);
    where.id = { in: ids.length ? ids : ["__none__"] };
  }

  const companies = await prisma.company.findMany({ where, orderBy: { createdAt: "desc" } });

  // Kuzima kiotomatiki subscription zilizoisha muda (mteja hajalipa) - kabla
  // ya kuonyesha orodha, ili dashboard ionyeshe "SUSPENDED" mara moja badala
  // ya kusubiri mtu ajaribu login upande wa Salon System.
  const now = new Date();
  const expiredIds = companies
    .filter((c) => c.status === "ACTIVE" && c.subscriptionEnd && new Date(c.subscriptionEnd) < now)
    .map((c) => c.id);
  if (expiredIds.length) {
    await prisma.company.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "SUSPENDED" },
    });
    companies.forEach((c) => {
      if (expiredIds.includes(c.id)) c.status = "SUSPENDED";
    });
  }

  // Ukumbusho wa moja kwa moja kwa barua pepe: makampuni ambayo subscription
  // yao itaisha ndani ya siku 3 zijazo bado ni "ACTIVE". Email inatumwa kwa
  // mmiliki wa kampuni (Company Admin), moja kwa mara kwa siku - tunachunguza
  // activity_logs kuepuka kutuma mara nyingi kwa siku moja.
  const soonThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringSoon = companies.filter(
    (c) => c.status === "ACTIVE" && c.subscriptionEnd && new Date(c.subscriptionEnd) >= now && new Date(c.subscriptionEnd) <= soonThreshold
  );
  if (expiringSoon.length) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const alreadyNotified = await prisma.activityLog.findMany({
      where: { action: "EXPIRY_REMINDER_SENT", companyId: { in: expiringSoon.map((c) => c.id) }, createdAt: { gte: since } },
      select: { companyId: true },
    });
    const alreadyNotifiedIds = new Set(alreadyNotified.map((a) => a.companyId));

    for (const company of expiringSoon) {
      if (alreadyNotifiedIds.has(company.id)) continue;
      const daysLeft = Math.max(0, Math.ceil((new Date(company.subscriptionEnd) - now) / (24 * 60 * 60 * 1000)));
      const { subject, html } = subscriptionExpiringEmail({
        companyName: company.name,
        daysLeft,
        endDate: company.subscriptionEnd,
      });
      sendEmail({ to: company.email, subject, html }).catch((e) => {
        console.error(`Imeshindikana kutuma ukumbusho wa subscription kwa ${company.email}:`, e.message);
      });
      await prisma.activityLog.create({
        data: {
          companyId: company.id,
          action: "EXPIRY_REMINDER_SENT",
          details: `Ukumbusho wa siku ${daysLeft} kabla ya kuisha ulitumwa kwa ${company.email}.`,
        },
      });
    }
  }

  // Branch count per company - purely informational (this app never edits
  // branches, only counts them; see prisma/schema.prisma note on Branch).
  const branchCounts = await prisma.branch.groupBy({ by: ["companyId"], _count: { _all: true } });
  const countByCompany = Object.fromEntries(branchCounts.map((b) => [b.companyId, b._count._all]));

  const result = companies.map((c) => ({ ...c, branchCount: countByCompany[c.id] || 0 }));

  return NextResponse.json(result);
}

/**
 * POST /api/companies
 * Super Admin PEKEE. Hii ndiyo "Hitaji Kuu Zaidi" la mfumo mzima:
 * moja kwa moja, bila developer, huundwa: Company + Company Admin (User) +
 * activation token, kisha email (na WhatsApp ikiwa namba imetolewa) inatumwa.
 */
async function POST(req) {
  try {
  const check = requireUser(["SUPER_ADMIN"]);
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  // Session iliyopo bado inaweza kuwa na ID ya PlatformAdmin isiyopo tena
  // kwenye database (mf. baada ya database reset/reseed) - tuangalie hapa,
  // badala ya kuruhusu ActivityLog.create ishindwe kimya kimya chini.
  const currentAdmin = await prisma.platformAdmin.findUnique({ where: { id: check.user.id } });
  if (!currentAdmin) {
    return NextResponse.json(
      { error: "Session yako si sahihi tena (huenda database ilibadilishwa). Tafadhali toka (logout) kisha ingia tena." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const {
    name, ownerName, email, phone, subscriptionType, subscriptionStart, subscriptionEnd,
    paymentAmount, paymentMethod, paymentReference,
  } = body;

  if (!name || !ownerName || !email) {
    return NextResponse.json({ error: "Jina la kampuni, jina la mmiliki na email ni lazima." }, { status: 400 });
  }

  // Mteja LAZIMA alipie kabla ya kuwezeshwa - kiasi kinategemea kifurushi
  // alichochagua (kinaweza kubadilishwa kidogo kwa punguzo/makubaliano maalum,
  // lakini hakiwezi kuwa sifuri au hasi).
  const amountPaid = Number(paymentAmount);
  if (!amountPaid || amountPaid <= 0) {
    return NextResponse.json({ error: "Kiasi cha malipo ni lazima (mteja anatakiwa alipie kabla ya kusajiliwa)." }, { status: 400 });
  }

  const existingCompany = await prisma.company.findUnique({ where: { email } });
  if (existingCompany) {
    return NextResponse.json({ error: "Kampuni yenye email hii tayari ipo." }, { status: 409 });
  }

  const plan = await prisma.plan.findUnique({ where: { key: subscriptionType } });
  if (!plan) {
    return NextResponse.json({ error: "Kifurushi ulichochagua hakipatikani (huenda kimefutwa). Chagua kingine." }, { status: 400 });
  }

  const username = generateUsername(name);
  const activationToken = crypto.randomBytes(32).toString("hex");
  const activationExpires = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // siku 5
  // Password isiyoweza kutumika - Company Admin ataweka yake mwenyewe kupitia
  // activation link. Hakuna mtu anayejua hii, wala haitumiki kuingia popote.
  const unusablePassword = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

  const nameParts = ownerName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "Admin";

  const { company, adminUser } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        ownerName,
        email,
        phone: phone || null,
        subscriptionType: subscriptionType || null,
        subscriptionStart: subscriptionStart ? new Date(subscriptionStart) : null,
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : null,
        status: "ACTIVE",
      },
    });

    const adminUser = await tx.user.create({
      data: {
        username,
        password: unusablePassword,
        companyId: company.id,
        email,
        firstName,
        lastName,
        role: "ADMIN",
        isActivated: false,
        activationToken,
        activationExpires,
        mustChangePassword: true,
      },
    });

    if (subscriptionStart && subscriptionEnd) {
      await tx.subscription.create({
        data: {
          companyId: company.id,
          planName: plan.label,
          amount: amountPaid,
          startDate: new Date(subscriptionStart),
          endDate: new Date(subscriptionEnd),
          status: "ACTIVE",
        },
      });
    }

    // Rekodi ya malipo halisi - mteja analipia kifurushi chote wakati wa
    // usajili, si baadaye. Hii inaonekana kwenye "Mapato" (Revenue) na
    // historia ya malipo ya kampuni hii.
    await tx.payment.create({
      data: {
        companyId: company.id,
        amount: amountPaid,
        method: paymentMethod || "CASH",
        reference: paymentReference || null,
      },
    });

    await tx.activityLog.create({
      data: {
        platformAdminId: check.user.id,
        companyId: company.id,
        action: "CREATE_COMPANY",
        details: `Kampuni "${company.name}" imeundwa na Company Admin "${username}". Kifurushi: ${plan.label}. Malipo: TZS ${amountPaid.toLocaleString()}.`,
      },
    });

    return { company, adminUser };
  });

  const activationUrl = `${(process.env.SALON_SYSTEM_URL || "").replace(/\/$/, "")}/activate-account?token=${activationToken}`;
  const { subject, html } = companyActivationEmail({
    companyName: company.name,
    ownerName,
    username,
    activationUrl,
    planLabel: plan.label,
    maxBranches: plan.maxBranches,
  });

  // MUHIMU: hatuzuii (await) jibu la request lisubiri email/WhatsApp itumwe.
  // Kampuni tayari imeshaundwa kwenye database kabla ya hapa - kama SMTP
  // ikichukua muda mrefu au ikashindwa (mtandao, password mbaya, n.k.),
  // Super Admin asipate alert ya "imeshindwa" wakati kampuni ipo tayari.
  // Error yoyote ya kutuma inarekodiwa kwenye console ya server.
  sendEmail({ to: email, subject, html }).catch((e) => {
    console.error("Imeshindikana kutuma email ya activation:", e.message);
  });

  if (phone) {
    sendWhatsAppMessage({
      to: phone,
      message: `Habari ${ownerName}, akaunti ya ${company.name} imeundwa. Wezesha akaunti: ${activationUrl}`,
    }).catch((e) => {
      console.error("Imeshindikana kutuma WhatsApp:", e.message);
    });
  }

  return NextResponse.json(
    { company, adminUsername: username, activationUrl },
    { status: 201 }
  );
  } catch (error) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json(
      { error: "Imeshindwa kuongeza kampuni. Tafadhali jaribu tena." },
      { status: 500 }
    );
  }
}

module.exports = { GET, POST };
