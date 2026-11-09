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

module.exports = { PLANS, DEFAULT_PLAN_KEY, getPlan, getMaxBranches };
