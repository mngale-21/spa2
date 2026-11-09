// ==========================================================
// "ENTER SYSTEM" (spec section 10 - Support Access)
//
// Because there is now only ONE shared Salon Management System deployment
// for every company (not one per client), there's only ONE URL to send the
// browser to (SALON_SYSTEM_URL) — never a per-company tenantBaseUrl. We
// still need a short-lived signed token so that ONE deployment's backend
// can verify the request really came from this Administration System and
// knows which companyId to open, without any password ever changing hands.
// ==========================================================

const jwt = require("jsonwebtoken");

function generateEnterSystemUrl({ company, actingAdmin }) {
  const baseUrl = process.env.SALON_SYSTEM_URL;
  if (!baseUrl) {
    throw new Error("SALON_SYSTEM_URL haijawekwa kwenye .env ya Administration System.");
  }

  const token = jwt.sign(
    {
      purpose: "ENTER_SYSTEM",
      companyId: company.id,
      actingAdminId: actingAdmin.id,
      actingAdminName: actingAdmin.name,
    },
    process.env.TENANT_SSO_SECRET,
    { expiresIn: "5m" }
  );

  return `${baseUrl.replace(/\/$/, "")}/sso/admin-login?token=${token}`;
}

module.exports = { generateEnterSystemUrl };
