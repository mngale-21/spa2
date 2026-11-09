const { NextResponse } = require("next/server");
const { clearSessionCookie } = require("@/lib/auth");

async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

module.exports = { POST };
