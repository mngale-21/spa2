// ============================================================================
// Branch Routes
// ============================================================================

const express = require("express");
const router = express.Router();

const {
  getActiveBranches,
  getBranchById,
  getBranchSummary,
  createBranch,
  updateBranch,
  deleteBranch,
  setBranchStatus,
} = require("../controllers/branchController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Any authenticated user (cashiers need this for BranchSelector)
router.get("/", protect, getActiveBranches);
router.get("/:id", protect, getBranchById);

// ADMIN only — cross-branch analytics
router.get("/:id/summary", protect, authorize("ADMIN"), getBranchSummary);

// ADMIN only — add, edit, or remove a branch
router.post("/", protect, authorize("ADMIN"), createBranch);
router.patch("/:id", protect, authorize("ADMIN"), updateBranch);
router.delete("/:id", protect, authorize("ADMIN"), deleteBranch);

// ADMIN only — suspend/reactivate a branch (e.g. for maintenance), without
// the safety checks that come with actually deleting it.
router.patch("/:id/status", protect, authorize("ADMIN"), setBranchStatus);

module.exports = router;
