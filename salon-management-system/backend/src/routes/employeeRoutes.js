// ============================================================================
// Employee Routes — ADMIN-only staff/cashier directory.
// ============================================================================

const express = require("express");
const router = express.Router();

const { listEmployeesByBranch, updateEmployee, resetEmployeePassword, deleteEmployee } = require("../controllers/employeeController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, authorize("ADMIN"), listEmployeesByBranch);
router.patch("/:id", protect, authorize("ADMIN"), updateEmployee);
router.patch("/:id/reset-password", protect, authorize("ADMIN"), resetEmployeePassword);
router.delete("/:id", protect, authorize("ADMIN"), deleteEmployee);

module.exports = router;
