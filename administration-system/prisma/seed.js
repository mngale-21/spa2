const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || "admin@localhost.test";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "54321";

  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: {},
    create: {
      name: "Super Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // Add demo subscription history for companies that already exist in the
  // shared database. This does not create salon users or operational data.
  const companies = await prisma.company.findMany({ select: { id: true, name: true, subscriptionStart: true, subscriptionEnd: true } });
  for (const company of companies) {
    if (company.subscriptionStart && company.subscriptionEnd) {
      const existing = await prisma.subscription.findFirst({ where: { companyId: company.id } });
      if (!existing) {
        await prisma.subscription.create({
          data: {
            companyId: company.id,
            planName: "Monthly",
            amount: 50000,
            currency: "TZS",
            startDate: company.subscriptionStart,
            endDate: company.subscriptionEnd,
            status: "ACTIVE",
          },
        });
      }
    }
  }

  console.log("Administration seed complete.");
  console.log(`  Super Admin: ${admin.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Existing companies available: ${companies.length}`);
}

main()
  .catch((e) => {
    console.error("Administration seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
