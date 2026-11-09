// ============================================================================
// Session Routes — the timer + payment + hold engine:
// register (with mandatory payment) -> confirm arrival -> service ->
// (on-hold if 10 min late, clear-hold to resume) -> (optional additional
// service, also paid up front) -> end/cancel -> refund if needed.
// ============================================================================

const express = require("express");
const router = express.Router();

const {
  registerCustomer,
  confirmArrival,
  clearHold,
  listSessions,
  requestAdditionalService,
  confirmAdditionalService,
  cancelSession,
  endSession,
} = require("../controllers/sessionController");
const { protect, authorize, restrictToOwnBranch } = require("../middleware/authMiddleware");

router.get("/", protect, restrictToOwnBranch("query"), listSessions);

// CASHIER/ADMIN: record the customer, confirm payment received, and start
// the 10-minute arrival countdown. Either a specific room, or just a
// service (auto-assigns any free room/staff).
router.post("/", protect, authorize("ADMIN", "CASHIER"), restrictToOwnBranch("body"), registerCustomer);

// STAFF/ADMIN: confirm the customer has arrived — stops the countdown,
// starts the service duration timer.
router.post("/:id/confirm-arrival", protect, authorize("ADMIN", "STAFF"), confirmArrival);

// CASHIER/ADMIN only: the customer showed up after going on hold — resume
// service, either back in the original room or reassigned to a different
// one. Staff never sees or clears a hold — once a booking goes on hold the
// room simply reads as empty on their dashboard; only the cashier/admin can
// bring the customer back.
router.post("/:id/clear-hold", protect, authorize("ADMIN", "CASHIER"), clearHold);

// STAFF/ADMIN: request an additional service once the current one finished.
router.post(
  "/:id/additional-service",
  protect,
  authorize("ADMIN", "STAFF"),
  requestAdditionalService
);

// CASHIER/ADMIN: confirm a staff-requested additional service and take
// payment for it before it starts.
router.post(
  "/:id/confirm-additional",
  protect,
  authorize("ADMIN", "CASHIER"),
  confirmAdditionalService
);

// CASHIER/ADMIN only — staff can never cancel, only end a service (see
// below). Requires a reason, and a refund choice if it was already paid.
router.post("/:id/cancel", protect, authorize("ADMIN", "CASHIER"), cancelSession);

// CASHIER/ADMIN/STAFF (assigned only): end a session, early or on schedule.
router.post("/:id/end", protect, authorize("ADMIN", "CASHIER", "STAFF"), endSession);

module.exports = router;
