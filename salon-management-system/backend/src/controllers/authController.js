// ============================================================================
// Auth Controller
// - register: ADMIN-only. Creates a Cashier or Staff user. Default password
//   is auto-generated as lowercase(lastName) and hashed with bcrypt (salt 10)
//   before it ever touches the database.
// - login: Verifies username/password, issues a 12-hour JWT.
// ============================================================================

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");
const { sendPasswordResetEmail } = require("../utils/mailer");
const { assertBranchInCompany } = require("../utils/companyScope");
const { getPlanFromDb } = require("../config/plans");

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "12h";
const RESET_TOKEN_MINUTES = 30;

/**
 * POST /api/auth/register
 * Protected route — ADMIN only (see authRoutes.js).
 * Body: { username, firstName, lastName, role, branchId, email }
 *
 * The caller (admin) never supplies a password. It is always derived from
 * lastName so front-of-house staff have a predictable first login, then are
 * expected to change it (mustChangePassword flag).
 *
 * email is required for CASHIER/STAFF — it's what lets them reset their
 * own password later via requestPasswordReset/resetPassword below,
 * without needing an Admin to do it for them every time. ADMIN accounts
 * may set one too but it isn't required (an Admin can always reset a
 * Cashier/Staff account directly instead — see employeeController.js —
 * but nobody can reset an Admin's account that way).
 */
async function register(req, res) {
  try {
    const { username, firstName, lastName, role, branchId, email } = req.body;

    if (!username || !firstName || !lastName || !role) {
      return res.status(400).json({
        message: "username, firstName, lastName and role are required.",
      });
    }

    const allowedRoles = ["ADMIN", "CASHIER", "STAFF"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `role must be one of ${allowedRoles.join(", ")}.` });
    }

    // CASHIER and STAFF must be tied to a branch. ADMIN may optionally have one.
    if (role !== "ADMIN" && !branchId) {
      return res.status(400).json({ message: "branchId is required for CASHIER and STAFF roles." });
    }
    if (role !== "ADMIN" && !email) {
      return res.status(400).json({
        message: "email is required for CASHIER and STAFF so they can reset their own password later.",
      });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "That doesn't look like a valid email address." });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ message: "That username is already taken." });
    }
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: "That email is already in use by another account." });
      }
    }

    if (branchId) {
      const branch = await assertBranchInCompany(branchId, req.user.companyId);
      if (!branch) {
        return res.status(404).json({ message: "branchId does not match any known branch." });
      }
    }

    // Kikomo cha wafanyakazi (staff/cashier/admin) kinategemea kifurushi cha
    // kampuni - kinasomwa kutoka database (kinaloweza kuhaririwa na Super Admin).
    const plan = await getPlanFromDb(prisma, req.user.companyPlan);
    const currentStaffCount = await prisma.user.count({ where: { companyId: req.user.companyId, isActive: true } });
    if (currentStaffCount >= plan.maxStaff) {
      return res.status(403).json({
        message: `Umefikia kikomo cha wafanyakazi ${plan.maxStaff} kwa "${plan.label}". Wasiliana na msimamizi wa mfumo ili kupandisha kifurushi.`,
      });
    }

    // --- Auto-generated default password logic -----------------------------
    const defaultPassword = lastName.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    // -------------------------------------------------------------------------

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        branchId: branchId || null,
        email: email || null,
        mustChangePassword: true,
        companyId: req.user.companyId,
        isActivated: true,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        branchId: true,
        email: true,
        createdAt: true,
      },
    });

    // The plaintext default password is only ever returned here, once, so the
    // admin can relay it to the new hire. It is never stored or logged.
    return res.status(201).json({
      message: "User registered successfully.",
      user: newUser,
      defaultPassword,
      notice: `Share this with ${newUser.firstName}: username "${newUser.username}", password "${defaultPassword}". They should change it after first login — or reset it themselves any time using "Forgot password?" on the login page, since their email is on file.`,
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ message: "Server error during registration." });
  }
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user }
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true, company: true },
    });

    // Use a generic error message for both "no such user" and "wrong password"
    // so we don't leak which usernames exist.
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    if (!user.isActivated) {
      return res.status(403).json({
        code: "ACCOUNT_NOT_ACTIVATED",
        message: "Akaunti yako bado haijaamilishwa. Angalia barua pepe yako kwa kiungo cha kuiwezesha (activation link).",
      });
    }

    // Kuzima kiotomatiki subscription iliyoisha muda (mteja hajalipa):
    // kama tarehe ya mwisho ya malipo (subscriptionEnd) imepita na kampuni
    // bado imeandikwa "ACTIVE", tunaisimamisha papo hapo kabla ya kuendelea
    // - badala ya kusubiri mtu abonyeze kitu kwenye Administration System.
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
            ? "Akaunti ya kampuni yenu imefutwa. Wasiliana na msimamizi wa mfumo."
            : "Huduma ya kampuni yenu imesimamishwa kwa sasa (labda muda wa malipo umeisha). Tafadhali wasiliana na msimamizi wenu.",
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      companyId: user.companyId,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch ? user.branch.name : null,
        companyId: user.companyId,
        companyName: user.company ? user.company.name : null,
        mustChangePassword: user.mustChangePassword,
        language: user.language,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
}

/**
 * GET /api/auth/me
 * Protected route. Returns the currently authenticated user's profile.
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        branchId: true,
        branch: { select: { name: true, code: true } },
        mustChangePassword: true,
        language: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ user });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Server error fetching profile." });
  }
}

/**
 * PATCH /api/auth/change-password
 * Protected route. Body: { currentPassword, newPassword }
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters." });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNew, mustChangePassword: false },
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({ message: "Server error updating password." });
  }
}

/**
 * PATCH /api/auth/language
 * Protected route. Body: { language } — "en" | "sw"
 * Persists the user's UI language preference so it follows them to any
 * device they log into.
 */
async function updateLanguage(req, res) {
  try {
    const { language } = req.body;
    if (!["en", "sw"].includes(language)) {
      return res.status(400).json({ message: 'language must be "en" or "sw".' });
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { language } });
    return res.status(200).json({ message: "Language preference saved.", language });
  } catch (error) {
    console.error("updateLanguage error:", error);
    return res.status(500).json({ message: "Server error updating language." });
  }
}

/**
 * POST /api/auth/forgot-password
 * Public route (no auth — the whole point is for someone who can't log
 * in). Body: { identifier } — a username or an email, either works.
 *
 * Always responds with the same generic success message whether or not
 * that identifier matched an account, an account has no email on file, or
 * the email failed to send for an unexpected reason — so this endpoint
 * can never be used to probe which usernames/emails exist. The one
 * exception is when SMTP itself isn't configured on the server at all
 * (an Admin/deployment problem, not a "does this account exist"
 * question) — that's surfaced plainly so it gets fixed rather than
 * silently swallowed.
 */
async function requestPasswordReset(req, res) {
  const genericResponse = {
    message: "If that account exists and has an email on file, a reset link has been sent to it.",
  };

  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "identifier (username or email) is required." });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    if (!user || !user.isActive || !user.email) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hashedToken, resetPasswordExpires: expires },
    });

    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
    const resetUrl = `${clientOrigin}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, firstName: user.firstName, resetUrl });
    } catch (mailError) {
      console.error("requestPasswordReset mail error:", mailError);
      return res.status(500).json({
        message: "Couldn't send the reset email right now — the server's email settings may need attention. Ask an Admin to reset your password directly in the meantime.",
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("requestPasswordReset error:", error);
    return res.status(500).json({ message: "Server error requesting a password reset." });
  }
}

/**
 * POST /api/auth/reset-password
 * Public route. Body: { token, newPassword }
 * The token is looked up by its hash (never stored raw), must not be
 * expired, and is cleared the moment it's used — one link, one use.
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "token and newPassword are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: hashedToken, resetPasswordExpires: { gt: new Date() } },
    });
    if (!user) {
      return res.status(400).json({ message: "That reset link is invalid or has expired — request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return res.status(200).json({ message: "Password reset — you can sign in with your new password now." });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Server error resetting the password." });
  }
}

/**
 * GET /api/auth/activate/:token
 * Public. Lets the frontend verify a token is still valid BEFORE showing
 * the "set your password" form, so an expired/used link gets a clear
 * message instead of a failed form submission.
 */
async function checkActivationToken(req, res) {
  try {
    const { token } = req.params;
    const user = await prisma.user.findFirst({
      where: { activationToken: token, activationExpires: { gt: new Date() }, isActivated: false },
      select: { firstName: true, lastName: true, username: true, company: { select: { name: true } } },
    });
    if (!user) {
      return res.status(400).json({ message: "Kiungo hiki cha kuwezesha akaunti si sahihi au kimeisha muda." });
    }
    return res.status(200).json({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      companyName: user.company?.name,
    });
  } catch (error) {
    console.error("checkActivationToken error:", error);
    return res.status(500).json({ message: "Server error checking activation link." });
  }
}

/**
 * POST /api/auth/activate
 * Public. Body: { token, password }
 * Consumes a brand-new Company Admin's activation link (emailed by the
 * Administration System when the company was created), sets their real
 * password, flips isActivated true, and clears the token — one link, one
 * use, exactly like the password-reset flow below.
 */
async function activateAccount(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token na password ni lazima." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password lazima iwe na herufi/namba angalau 6." });
    }

    const user = await prisma.user.findFirst({
      where: { activationToken: token, activationExpires: { gt: new Date() }, isActivated: false },
    });
    if (!user) {
      return res.status(400).json({ message: "Kiungo hiki cha kuwezesha akaunti si sahihi au kimeisha muda." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        mustChangePassword: false,
        activationToken: null,
        activationExpires: null,
      },
    });

    return res.status(200).json({ message: "Akaunti imewezeshwa. Sasa unaweza kuingia (login)." });
  } catch (error) {
    console.error("activateAccount error:", error);
    return res.status(500).json({ message: "Server error activating account." });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  updateLanguage,
  requestPasswordReset,
  resetPassword,
  checkActivationToken,
  activateAccount,
};
