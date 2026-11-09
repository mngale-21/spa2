const { NextResponse } = require("next/server");
const { prisma } = require("@/lib/db");
const { comparePassword, signToken, setSessionCookie } = require("@/lib/auth");

async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Weka email na password." }, { status: 400 });
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: "Taarifa za kuingia si sahihi." }, { status: 401 });
  }

  const valid = await comparePassword(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Taarifa za kuingia si sahihi." }, { status: 401 });
  }

  const token = signToken({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role, // "SUPER_ADMIN" | "SUB_ADMIN"
  });

  setSessionCookie(token);

  return NextResponse.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });
}

module.exports = { POST };
