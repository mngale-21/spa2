// ============================================================================
// Report Routes — ADMIN (every branch) and CASHIER (their own branch only,
// enforced by restrictToOwnBranch — a Cashier can never pass a different
// branchId and see another branch's numbers): dashboard summary +
// downloadable PDF / CSV / XLSX.
// ============================================================================

const express = require("express");
const router = express.Router();

const { getSummary, getDetailed, downloadPdf, downloadCsv, listScenarios } = require("../controllers/reportController");
const { protect, authorize, restrictToOwnBranch } = require("../middleware/authMiddleware");

const allowed = authorize("ADMIN", "CASHIER");
const ownBranchOnly = restrictToOwnBranch("query");

router.get("/scenarios", protect, allowed, listScenarios);
router.get("/summary", protect, allowed, ownBranchOnly, getSummary);
router.get("/detailed", protect, allowed, ownBranchOnly, getDetailed);
router.get("/pdf", protect, allowed, ownBranchOnly, downloadPdf);
router.get("/csv", protect, allowed, ownBranchOnly, downloadCsv);

module.exports = router;
