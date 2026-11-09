// ============================================================================
// Platform Controller — the ONE integration point this backend exposes to
// the Administration System (the separate Super Admin panel that creates,
// suspends, and manages every Company in this shared database).
//
// Architecture note: because both apps share the SAME PostgreSQL database
// (see README section 11), the Administration System does almost
// everything by writing directly to the Company/User tables with its own
// Prisma client — creating a company, suspending it, recording payments,
// etc. are all just ordinary database writes there, no network call needed.
//
// The ONE thing that genuinely has to cross from the Administration
// System's frontend into THIS backend is "Enter System" (support access):
// the Super Admin's browser has to land on the Salon System's own frontend
// and get a real, working session — that's what ssoLogin below does.
// ============================================================================

const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");

/**
 * POST /api/platform/sso-login
 * Body: { token }  <- the short-lived JWT the Administration System put in
 * the redirect URL when a Super/Sub-Admin clicked "Enter System" for a
 * company.
 * Returns: { token, user }  <- SAME shape as /api/auth/login, so the
 * frontend can just call saveSession() with it and go straight to the
 * admin dashboard for that company. No real password is ever involved,
 * and no throwaway database user is created — the session is scoped
 * directly to the target companyId via the `isPlatformSupport` claim,
 * which authMiddleware.protect() recognizes.
 */
async function ssoLogin(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "token is required." });

    const secret = process.env.TENANT_SSO_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "TENANT_SSO_SECRET haijawekwa kwenye server hii." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ message: "Kiungo hiki cha kuingia si sahihi au kimeisha muda." });
    }

    if (decoded.purpose !== "ENTER_SYSTEM" || !decoded.companyId) {
      return res.status(401).json({ message: "Token si sahihi kwa kitendo hiki." });
    }

    const company = await prisma.company.findUnique({ where: { id: decoded.companyId } });
    if (!company) {
      return res.status(404).json({ message: "Kampuni hii haipo (tena)." });
    }
    if (company.status !== "ACTIVE") {
      return res.status(503).json({
        code: "SERVICE_SUSPENDED",
        message: "Kampuni hii imesimamishwa kwa sasa — haiwezekani kuingia kwenye mfumo wake.",
      });
    }

    const sessionToken = jwt.sign(
      {
        isPlatformSupport: true,
        companyId: company.id,
        actingAdminName: decoded.actingAdminName || "Platform Admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" } // deliberately shorter than a normal 12h login session
    );

    return res.status(200).json({
      message: "Umeingia kupitia Administration System.",
      token: sessionToken,
      user: {
        id: null,
        username: "platform_support",
        firstName: "Platform",
        lastName: `Support (${decoded.actingAdminName || "Admin"})`,
        role: "ADMIN",
        branchId: null,
        branchName: null,
        companyId: company.id,
        companyName: company.name,
        mustChangePassword: false,
        language: "sw",
      },
    });
  } catch (error) {
    console.error("ssoLogin error:", error);
    return res.status(500).json({ message: "Server error during SSO login." });
  }
}

module.exports = { ssoLogin };
