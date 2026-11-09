// ============================================================================
// Platform Routes — used only by the Administration System integration.
// No `protect` (Bearer JWT) middleware here since the caller is a
// not-yet-logged-in browser following an "Enter System" redirect — it
// authenticates itself via the signed token in the body instead.
// ============================================================================

const express = require("express");
const router = express.Router();

const { ssoLogin } = require("../controllers/platformController");

router.post("/sso-login", ssoLogin);

module.exports = router;
