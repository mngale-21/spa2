const { NextResponse } = require("next/server");

// Note: hatutumii jsonwebtoken hapa (Edge runtime constraints) - tunachunguza
// tu uwepo wa cookie; uthibitisho kamili wa token unafanyika kwenye API routes.
function middleware(req) {
  const token = req.cookies.get("salon_admin_session")?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

module.exports = { middleware, config };
