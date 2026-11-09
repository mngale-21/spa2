// ============================================================================
// Database Seed Script
// Seeds exactly the multi-tenant test scenario from the project spec
// (section 20): two independent companies sharing this ONE deployment —
//   Company A: "ABC Salon"       -> branches: Kariakoo, Mbezi
//   Company B: "XYZ Beauty Spa"  -> branch: Dodoma
// plus one PlatformAdmin (Super Admin) for the Administration System, which
// reads/writes this same database.
//
// Run with: npm run seed
// ============================================================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const SERVICE_SEEDS = [
  { name: "Haircut", price: 15000, durationMins: 30 },
  { name: "Full Body Massage", price: 45000, durationMins: 60 },
  { name: "Manicure", price: 12000, durationMins: 40 },
  { name: "Facial Treatment", price: 25000, durationMins: 45 },
];
const ROOM_SEEDS = [
  { roomNumber: "R-01", name: "Room 1" },
  { roomNumber: "R-02", name: "Room 2" },
  { roomNumber: "R-03", name: "Room 3" },
];

async function seedBranch(companyId, { name, code, address }, staffSeeds) {
  const branch = await prisma.branch.upsert({
    where: { companyId_name: { companyId, name } },
    update: {},
    create: { companyId, name, code, address },
  });

  const services = [];
  for (const svc of SERVICE_SEEDS) {
    services.push(
      await prisma.service.upsert({
        where: { branchId_name: { branchId: branch.id, name: svc.name } },
        update: {},
        create: { ...svc, branchId: branch.id },
      })
    );
  }

  const rooms = [];
  for (const r of ROOM_SEEDS) {
    rooms.push(
      await prisma.room.upsert({
        where: { branchId_name: { branchId: branch.id, name: r.name } },
        update: { roomNumber: r.roomNumber },
        create: { branchId: branch.id, name: r.name, roomNumber: r.roomNumber, status: "AVAILABLE" },
      })
    );
  }

  const cashierUsername = `cashier.${branch.code.toLowerCase()}`;
  await prisma.user.upsert({
    where: { username: cashierUsername },
    update: {},
    create: {
      username: cashierUsername,
      password: await bcrypt.hash("cashier", SALT_ROUNDS),
      firstName: "Front",
      lastName: "Cashier",
      role: "CASHIER",
      branchId: branch.id,
      companyId,
      mustChangePassword: true,
    },
  });

  const staff = [];
  for (const s of staffSeeds) {
    const username = `${s.firstName.toLowerCase()}.${branch.code.toLowerCase()}`;
    staff.push(
      await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          username,
          password: await bcrypt.hash(s.lastName.toLowerCase(), SALT_ROUNDS),
          firstName: s.firstName,
          lastName: s.lastName,
          role: "STAFF",
          branchId: branch.id,
          companyId,
          mustChangePassword: true,
        },
      })
    );
  }

  for (const room of rooms) {
    for (let i = 0; i < Math.min(2, services.length, staff.length); i++) {
      await prisma.roomAssignment.upsert({
        where: { roomId_serviceId: { roomId: room.id, serviceId: services[i].id } },
        update: { staffId: staff[i].id },
        create: { roomId: room.id, serviceId: services[i].id, staffId: staff[i].id },
      });
    }
  }

  console.log(`    ✓ Branch "${branch.name}" (${branch.code}) — ${services.length} services, ${rooms.length} rooms, cashier "${cashierUsername}", ${staff.length} staff`);
  return branch;
}

async function seedCompany({ name, ownerName, email, phone, adminUsername, branches }) {
  const company = await prisma.company.upsert({
    where: { email },
    update: {},
    create: {
      name,
      ownerName,
      email,
      phone,
      subscriptionType: "Monthly",
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Company ready: ${company.name}`);

  // Already-activated demo admin (a REAL new company created via the
  // Administration System would instead have isActivated:false plus an
  // activationToken — see authController.activateAccount) so this seed
  // data is immediately usable for testing without an email step.
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: await bcrypt.hash("admin123", SALT_ROUNDS),
      firstName: ownerName.split(" ")[0],
      lastName: ownerName.split(" ").slice(1).join(" ") || "Admin",
      role: "ADMIN",
      companyId: company.id,
      isActivated: true,
      mustChangePassword: true,
    },
  });
  console.log(`    ✓ Company Admin ready: ${admin.username} (password: "admin123")`);

  for (const b of branches) {
    await seedBranch(company.id, b.branch, b.staff);
  }

  return company;
}

async function main() {
  // NOTE: This seed belongs to the Salon Management System only.
  // PlatformAdmin/subscription administration is seeded by the separate
  // Administration System (administration-system/prisma/seed.js).
  console.log("Seeding Salon Management System operational demo data...");

  console.log("Seeding Company A: ABC Salon...");
  await seedCompany({
    name: "ABC Salon",
    ownerName: "Amina Juma",
    email: "owner@abcsalon.test",
    phone: "+255700000001",
    adminUsername: "admin.abc",
    branches: [
      {
        branch: { name: "Kariakoo Branch", code: "ABC-KRK", address: "Kariakoo, Dar es Salaam" },
        staff: [
          { firstName: "Baraka", lastName: "Mushi" },
          { firstName: "Zainab", lastName: "Hassan" },
        ],
      },
      {
        branch: { name: "Mbezi Branch", code: "ABC-MBZ", address: "Mbezi, Dar es Salaam" },
        staff: [
          { firstName: "Godfrey", lastName: "Temba" },
          { firstName: "Halima", lastName: "Rajabu" },
        ],
      },
    ],
  });

  console.log("Seeding Company B: XYZ Beauty Spa...");
  await seedCompany({
    name: "XYZ Beauty Spa",
    ownerName: "Neema Kapinga",
    email: "owner@xyzspa.test",
    phone: "+255700000002",
    adminUsername: "admin.xyz",
    branches: [
      {
        branch: { name: "Dodoma Branch", code: "XYZ-DOD", address: "Dodoma, Tanzania" },
        staff: [
          { firstName: "Elias", lastName: "Mwakalindile" },
          { firstName: "Furaha", lastName: "Ngowi" },
        ],
      },
    ],
  });

  console.log("\nSalon seed complete.");
  console.log('  Salon Admin ABC: username "admin.abc", password "admin123"');
  console.log('  Salon Admin XYZ: username "admin.xyz", password "admin123"');
  console.log('  Cashiers: cashier.<branch-code>, password "cashier"');
  console.log('  Platform Admin is seeded separately from administration-system.');
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
