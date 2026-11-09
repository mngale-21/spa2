// ============================================================================
// Vifurushi vya Salon SaaS - kila kifurushi kina kikomo cha matawi
// (branches) mteja anaruhusiwa kuwa nayo. Jina la kifurushi linahifadhiwa
// kwenye Company.subscriptionType (safu iliyokuwepo tayari - hakuna
// database migration mpya inayohitajika kwa hili).
//
// Bei ni TZS kwa mwezi - mfano wa kihalisia kwa biashara ndogo/kati ya
// saloon Tanzania. Badilisha kadri unavyohitaji.
// ============================================================================

const PLANS = {
  BASIC: {
    key: "BASIC",
    label: "Kifurushi cha Kawaida",
    maxBranches: 3,
    priceTzs: 45000,
    description: "Sawa kwa saloon inayoanza - hadi matawi 3.",
  },
  STANDARD: {
    key: "STANDARD",
    label: "Kifurushi cha Kati",
    maxBranches: 5,
    priceTzs: 85000,
    description: "Kwa saloon inayokua - hadi matawi 5.",
  },
  PREMIUM: {
    key: "PREMIUM",
    label: "Kifurushi cha Premium",
    maxBranches: 10,
    priceTzs: 150000,
    description: "Kwa mnyororo mkubwa wa saloon - hadi matawi 10.",
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    label: "Kifurushi cha Enterprise",
    maxBranches: Infinity,
    priceTzs: 300000,
    description: "Matawi bila kikomo - kwa minyororo mikubwa ya kitaifa.",
  },
};

const DEFAULT_PLAN_KEY = "BASIC";

function getPlan(planKey) {
  return PLANS[planKey] || PLANS[DEFAULT_PLAN_KEY];
}

function getMaxBranches(planKey) {
  return getPlan(planKey).maxBranches;
}

// ----------------------------------------------------------------------------
// Vifurushi VYA HALISI vinasomwa kutoka kwenye jedwali la "plans" (database),
// linalohaririwa na Super Admin kupitia Administration System > Vifurushi.
// Backend HAITANGAZI model "Plan" kwenye schema.prisma yake kabisa (kwa
// makusudi) - tunasoma jedwali hilo kwa raw SQL badala yake, ili kuepuka
// mgongano wa "migration history" kati ya app hizi mbili zinazoshiriki
// database moja (tulipitia tatizo hili awali na majedwali mengine).
// Ikiwa jedwali la plans halijaundwa bado, au halina safu husika, tunarudi
// kwenye maadili ya PLANS hapo juu kama "fallback" salama.
// ----------------------------------------------------------------------------
async function getPlanFromDb(prisma, planKey) {
  const fallback = getPlan(planKey);
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "label", "maxBranches", "maxStaff" FROM "plans" WHERE "key" = $1 LIMIT 1`,
      planKey
    );
    if (rows && rows[0]) {
      return {
        label: rows[0].label,
        maxBranches: rows[0].maxBranches,
        maxStaff: rows[0].maxStaff,
      };
    }
  } catch (e) {
    console.error("Imeshindwa kusoma jedwali la 'plans' (raw SQL) - kutumia maadili ya default:", e.message);
  }
  return { label: fallback.label, maxBranches: fallback.maxBranches, maxStaff: 10 };
}

module.exports = { PLANS, DEFAULT_PLAN_KEY, getPlan, getMaxBranches, getPlanFromDb };
