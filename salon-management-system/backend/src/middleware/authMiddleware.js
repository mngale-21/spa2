// ============================================================================
// Auth Middleware
// - protect: verifies the Bearer JWT, re-checks the user is still active
//   AND their Company is still ACTIVE (multi-tenant suspension check lives
//   HERE so every single protected route gets it automatically, with no
//   need to add it route-by-route), then attaches { id, username, role,
//   branchId, companyId } to req.user.
// - authorize(...roles): restricts a route to one or more Roles.
// - restrictToOwnBranch(source): as before for CASHIER/STAFF, PLUS (new)
//   verifies an ADMIN's branchId actually belongs to their OWN company —
//   this is what stops a Company Admin from passing another company's
//   branchId and reading/writing its data.
// ============================================================================

const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");
const { assertBranchInCompany } = require("../utils/companyScope");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided." });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token invalid or expired." });
    }

    // Support-access sessions (Administration System "Enter System") carry
    // isPlatformSupport instead of a real user row — see platformController.
    if (decoded.isPlatformSupport) {
      let company = await prisma.company.findUnique({ where: { id: decoded.companyId } });
      if (company && company.status === "ACTIVE" && company.subscriptionEnd && new Date(company.subscriptionEnd) < new Date()) {
        company = await prisma.company.update({ where: { id: company.id }, data: { status: "SUSPENDED" } });
      }
      if (!company || company.status !== "ACTIVE") {
        return res.status(503).json({
          code: "SERVICE_SUSPENDED",
          message: "Kampuni hii imesimamishwa au haipo tena.",
        });
      }
      req.user = {
        id: decoded.id || null,
        username: decoded.username || "platform_support",
        role: "ADMIN",
        branchId: null,
        companyId: decoded.companyId,
        firstName: "Platform",
        lastName: `Support (${decoded.actingAdminName || "Admin"})`,
        isPlatformSupport: true,
      };
      return next();
    }

    // Re-check the user still exists and is active. Guards against tokens
    // that were issued before a user was deactivated.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        companyId: true,
        isActive: true,
        isActivated: true,
        firstName: true,
        lastName: true,
        company: { select: { id: true, status: true, name: true, subscriptionEnd: true, subscriptionType: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Not authorized, user no longer active." });
    }

    if (!user.isActivated) {
      return res.status(401).json({ message: "Account not activated yet. Check your email for the activation link." });
    }

    // Kuzima kiotomatiki subscription iliyoisha muda - inagusa kila request
    // ya mtu ambaye tayari ameingia (token bado ni sahihi), si login tu.
    if (
      user.company &&
      user.company.status === "ACTIVE" &&
      user.company.subscriptionEnd &&
      new Date(user.company.subscriptionEnd) < new Date()
    ) {
      user.company = await prisma.company.update({
        where: { id: user.company.id },
        data: { status: "SUSPENDED" },
      });
    }

    if (!user.company || user.company.status !== "ACTIVE") {
      return res.status(503).json({
        code: "SERVICE_SUSPENDED",
        message:
          user.company?.status === "DELETED"
            ? "Akaunti ya kampuni yako imefutwa. Wasiliana na msimamizi wa mfumo."
            : "Huduma ya kampuni yako imesimamishwa kwa sasa. Tafadhali wasiliana na msimamizi wako.",
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      companyId: user.companyId,
      companyPlan: user.company.subscriptionType,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    console.error("protect middleware error:", error);
    return res.status(500).json({ message: "Server error during authentication." });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: requires one of [${allowedRoles.join(", ")}] role(s).`,
      });
    }
    next();
  };
}

function restrictToOwnBranch(source = "query") {
  return async (req, res, next) => {
    const branchId = source === "body" ? req.body?.branchId : req.query?.branchId;

    if (req.user.role === "ADMIN") {
      if (branchId) {
        const branch = await assertBranchInCompany(branchId, req.user.companyId);
        if (!branch) {
          return res.status(404).json({ message: "Branch not found." });
        }
      }
      return next();
    }

    if (!req.user.branchId) {
      return res.status(403).json({ message: "Your account isn't assigned to a branch yet — ask an admin to assign one." });
    }
    if (branchId && branchId !== req.user.branchId) {
      return res.status(403).json({ message: "You can only access the branch you're assigned to." });
    }

    if (!branchId) {
      if (source === "body") req.body.branchId = req.user.branchId;
      else req.query.branchId = req.user.branchId;
    }

    next();
  };
}

module.exports = { protect, authorize, restrictToOwnBranch };
