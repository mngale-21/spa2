const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { cookies } = require("next/headers");

const COOKIE_NAME = "salon_admin_session";
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Tunatengeneza token yenye: id, role, name, email
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

// Inaweka session cookie baada ya login kufanikiwa
function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // siku 7
  });
}

function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

// Inasoma mtumiaji aliye-login kutoka kwenye cookie (kwa Server Components / API routes)
function getSessionUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Husaidia ku-"guard" API routes - lazima awe amelogin, na akiwa na role fulani (hiari)
function requireUser(allowedRoles) {
  const user = getSessionUser();
  if (!user) return { error: "Huna ruhusa. Tafadhali login kwanza.", status: 401 };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: "Huna ruhusa ya kufanya kitendo hiki.", status: 403 };
  }
  return { user };
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  requireUser,
};
