// ============================================================================
// Branch Controller
// Exposes the list of branches belonging to the logged-in user's OWN
// company. Every function here is company-scoped — this is the top-level
// isolation boundary for the whole multi-tenant system.
// ============================================================================

const prisma = require("../config/prismaClient");
const { assertBranchInCompany } = require("../utils/companyScope");
const { getPlanFromDb } = require("../config/plans");

/**
 * GET /api/branches?includeInactive=true
 * Requires a valid logged-in user via `protect`. Admins see every active
 * branch IN THEIR OWN COMPANY by default (they have full cross-branch
 * access within their company, never across companies) — pass
 * ?includeInactive=true (ADMIN only) to also see suspended/archived
 * branches. A Cashier or Staff member only ever sees the single branch an
 * Admin assigned them to, and only if it's currently active.
 */
async function getActiveBranches(req, res) {
  try {
    const includeInactive = req.user.role === "ADMIN" && req.query.includeInactive === "true";
    const where = { companyId: req.user.companyId };
    if (!includeInactive) where.isActive = true;

    if (req.user.role !== "ADMIN") {
      if (!req.user.branchId) {
        return res.status(200).json({ branches: [] });
      }
      where.id = req.user.branchId;
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, address: true, isActive: true },
    });

    return res.status(200).json({ branches });
  } catch (error) {
    console.error("getActiveBranches error:", error);
    return res.status(500).json({ message: "Server error fetching branches." });
  }
}

/**
 * GET /api/branches/:id
 * A Cashier/Staff member may only look up their own assigned branch. An
 * Admin may look up any branch belonging to their own company — never
 * another company's, even if they somehow know its id.
 */
async function getBranchById(req, res) {
  try {
    const { id } = req.params;
    if (req.user.role !== "ADMIN" && id !== req.user.branchId) {
      return res.status(403).json({ message: "You can only access the branch you're assigned to." });
    }

    const branch = await assertBranchInCompany(id, req.user.companyId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    return res.status(200).json({ branch });
  } catch (error) {
    console.error("getBranchById error:", error);
    return res.status(500).json({ message: "Server error fetching branch." });
  }
}

/**
 * GET /api/branches/:id/summary
 * ADMIN-only high-level stats for one branch of their OWN company.
 */
async function getBranchSummary(req, res) {
  try {
    const { id } = req.params;

    const branch = await assertBranchInCompany(id, req.user.companyId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    const [totalRooms, totalAssignments, totalRevenueResult, activeSessions, pendingSessions] = await Promise.all([
      prisma.room.count({ where: { branchId: id } }),
      prisma.roomAssignment.count({ where: { room: { branchId: id } } }),
      prisma.transaction.aggregate({
        where: { branchId: id, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.session.count({ where: { branchId: id, status: "ACTIVE" } }),
      prisma.session.count({ where: { branchId: id, status: { in: ["PENDING_ARRIVAL", "AWAITING_CASHIER"] } } }),
    ]);

    return res.status(200).json({
      branch: { id: branch.id, name: branch.name, code: branch.code },
      totalRooms,
      totalAssignments,
      busyRooms: activeSessions,
      availableRooms: Math.max(0, totalAssignments - activeSessions - pendingSessions),
      activeSessions,
      pendingSessions,
      totalRevenue: totalRevenueResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("getBranchSummary error:", error);
    return res.status(500).json({ message: "Server error building branch summary." });
  }
}

/**
 * POST /api/branches
 * ADMIN only. Body: { name, code, address? }
 * Always created under the caller's OWN company — a company can never
 * create a branch "for" another company.
 */
async function createBranch(req, res) {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "name and code are required." });
    }

    // Kikomo cha matawi kinategemea kifurushi (plan) alichonunua mteja -
    // kinasomwa moja kwa moja kutoka database (linaloweza kuhaririwa na
    // Super Admin), si faili tuli.
    const plan = await getPlanFromDb(prisma, req.user.companyPlan);
    const currentBranchCount = await prisma.branch.count({ where: { companyId: req.user.companyId } });
    if (currentBranchCount >= plan.maxBranches) {
      return res.status(403).json({
        code: "BRANCH_LIMIT_REACHED",
        message: `Umefikia kikomo cha matawi ${plan.maxBranches} kwa "${plan.label}". Wasiliana na msimamizi wa mfumo (Administration System) ili kupandisha kifurushi.`,
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address?.trim() || null,
        companyId: req.user.companyId,
      },
    });

    return res.status(201).json({ message: "Branch created.", branch });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A branch with that name or code already exists in your company." });
    }
    console.error("createBranch error:", error);
    return res.status(500).json({ message: "Server error creating the branch." });
  }
}

/**
 * DELETE /api/branches/:id
 * ADMIN only, and only within their own company (see 404 below).
 */
async function deleteBranch(req, res) {
  try {
    const { id } = req.params;
    const branch = await assertBranchInCompany(id, req.user.companyId);
    if (!branch) return res.status(404).json({ message: "Branch not found." });

    const [employeeCount, liveSessionCount, historicalSessionCount] = await Promise.all([
      prisma.user.count({ where: { branchId: id } }),
      prisma.session.count({
        where: { branchId: id, status: { in: ["PENDING_ARRIVAL", "ACTIVE", "AWAITING_CASHIER"] } },
      }),
      prisma.session.count({ where: { branchId: id } }),
    ]);

    if (employeeCount > 0) {
      return res.status(409).json({
        message: `This branch still has ${employeeCount} employee${employeeCount > 1 ? "s" : ""} assigned — reassign or remove them first.`,
      });
    }
    if (liveSessionCount > 0) {
      return res.status(409).json({ message: "This branch has a service in progress right now — finish it before removing the branch." });
    }

    if (historicalSessionCount === 0) {
      await prisma.branch.delete({ where: { id } });
      return res.status(200).json({ message: "Branch removed." });
    }

    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    return res.status(200).json({
      message: "Branch archived. Its historical records were kept for reporting, so it was deactivated rather than deleted.",
    });
  } catch (error) {
    console.error("deleteBranch error:", error);
    return res.status(500).json({ message: "Server error removing the branch." });
  }
}

/**
 * PATCH /api/branches/:id/status
 * ADMIN only, own company only.
 */
async function setBranchStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive (true/false) is required." });
    }

    const branch = await assertBranchInCompany(id, req.user.companyId);
    if (!branch) return res.status(404).json({ message: "Branch not found." });

    const updated = await prisma.branch.update({ where: { id }, data: { isActive } });
    return res.status(200).json({
      message: isActive ? "Branch reactivated." : "Branch suspended — no new bookings will be taken there until it's reactivated.",
      branch: updated,
    });
  } catch (error) {
    console.error("setBranchStatus error:", error);
    return res.status(500).json({ message: "Server error updating the branch." });
  }
}

/**
 * PATCH /api/branches/:id
 * ADMIN only, own company only.
 */
async function updateBranch(req, res) {
  try {
    const { id } = req.params;
    const { name, code, address } = req.body;

    const existing = await assertBranchInCompany(id, req.user.companyId);
    if (!existing) return res.status(404).json({ message: "Branch not found." });

    const data = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "name can't be empty." });
      data.name = name.trim();
    }
    if (code !== undefined) {
      if (!code.trim()) return res.status(400).json({ message: "code can't be empty." });
      data.code = code.trim().toUpperCase();
    }
    if (address !== undefined) data.address = address?.trim() || null;

    const branch = await prisma.branch.update({ where: { id }, data });
    return res.status(200).json({ message: "Branch updated.", branch });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A branch with that name or code already exists in your company." });
    }
    console.error("updateBranch error:", error);
    return res.status(500).json({ message: "Server error updating the branch." });
  }
}

module.exports = { getActiveBranches, getBranchById, getBranchSummary, createBranch, updateBranch, deleteBranch, setBranchStatus };
