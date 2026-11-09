// ============================================================================
// Service Controller
// Services are what a Cashier picks from when starting a room session (e.g.
// "Haircut", "Full Body Massage"). Admins manage the catalog per branch;
// Cashiers/Staff only need to read it.
// ============================================================================

const prisma = require("../config/prismaClient");
const { assertBranchInCompany, assertServiceInCompany } = require("../utils/companyScope");

/**
 * GET /api/services?branchId=...
 * Any authenticated user — powers the "select a service" step when starting
 * a session. Ordered by category first (uncategorized services last) so
 * the frontend can group variants (e.g. several kinds of "Massage")
 * together without extra client-side work.
 */
async function getServicesByBranch(req, res) {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({ message: "branchId query param is required." });
    }

    const services = await prisma.service.findMany({
      where: { branchId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return res.status(200).json({ services });
  } catch (error) {
    console.error("getServicesByBranch error:", error);
    return res.status(500).json({ message: "Server error fetching services." });
  }
}

/**
 * POST /api/services
 * ADMIN only. Body: { name, price, durationMins, branchId, category? }
 * `category` is optional — e.g. several variants ("Full Body Massage",
 * "Four-Hand Massage") can share category "Massage", each with its own
 * price/duration; leave it blank for a standalone service like "Haircut".
 */
async function createService(req, res) {
  try {
    const { name, price, durationMins, branchId, category } = req.body;

    if (!name || price === undefined || !durationMins || !branchId) {
      return res.status(400).json({
        message: "name, price, durationMins and branchId are required.",
      });
    }

    const branch = await assertBranchInCompany(branchId, req.user.companyId);
    if (!branch) {
      return res.status(404).json({ message: "branchId does not match any known branch." });
    }

    const service = await prisma.service.create({
      data: {
        name,
        price,
        durationMins: Number(durationMins),
        branchId,
        category: category?.trim() || null,
      },
    });

    return res.status(201).json({ message: "Service created.", service });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "That service name already exists for this branch." });
    }
    console.error("createService error:", error);
    return res.status(500).json({ message: "Server error creating service." });
  }
}

/**
 * PATCH /api/services/:id
 * ADMIN only. Body: any of { name, price, durationMins, category }.
 * Lets prices/duration/name be corrected after the fact — a service that
 * has already been used in a session could never be deleted (it's tied
 * to historical reports) and, until this endpoint existed, could never be
 * edited either, so a wrong price was permanent. Editing never touches
 * past sessions/reports — those keep the amount that was actually charged
 * at the time (Transaction.amount), independent of the service's current
 * list price.
 */
async function updateService(req, res) {
  try {
    const { id } = req.params;
    const { name, price, durationMins, category } = req.body;

    const existing = await assertServiceInCompany(id, req.user.companyId);
    if (!existing) return res.status(404).json({ message: "Service not found." });

    const data = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) {
      if (!(Number(price) > 0)) return res.status(400).json({ message: "price must be greater than zero." });
      data.price = Number(price);
    }
    if (durationMins !== undefined) {
      if (!(Number(durationMins) > 0)) return res.status(400).json({ message: "durationMins must be greater than zero." });
      data.durationMins = Number(durationMins);
    }
    if (category !== undefined) data.category = category?.trim() || null;

    const service = await prisma.service.update({ where: { id }, data });
    return res.status(200).json({ message: "Service updated.", service });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "That service name already exists for this branch." });
    }
    console.error("updateService error:", error);
    return res.status(500).json({ message: "Server error updating service." });
  }
}

/**
 * DELETE /api/services/:id
 * ADMIN only. Refused (with a clear message, not a raw 500) if the service
 * has ever been used in a session — those sessions/reports depend on it
 * existing. Edit it with PATCH instead, or stop offering it going forward
 * without deleting its history.
 */
async function deleteService(req, res) {
  try {
    const { id } = req.params;
    if (!(await assertServiceInCompany(id, req.user.companyId))) {
      return res.status(404).json({ message: "Service not found." });
    }
    await prisma.service.delete({ where: { id } });
    return res.status(200).json({ message: "Service removed." });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(409).json({
        message: "This service has been used in past sessions and can't be deleted — edit its name/price instead, or leave it as-is and just avoid assigning it to new rooms.",
      });
    }
    console.error("deleteService error:", error);
    return res.status(500).json({ message: "Server error removing service." });
  }
}

module.exports = { getServicesByBranch, createService, updateService, deleteService };
