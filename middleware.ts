import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Signed in but visiting /login — bounce to the dashboard (or their
    // original callbackUrl if one was supplied and is a safe relative path).
    if (pathname === "/login" && token) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      const safeCallback =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : null;
      const url = req.nextUrl.clone();
      url.pathname = safeCallback ?? "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Allow /login through regardless of auth state; require a valid JWT for
      // everything else. Returning false triggers withAuth's built-in redirect
      // to pages.signIn with a callbackUrl query.
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/login") return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Matcher runs the middleware on everything EXCEPT:
//  - /api/auth/*  — NextAuth's own endpoints (sign-in POST, JWKS, callback)
//  - /_next/*     — Next.js internals (chunks, images, HMR)
//  - public static assets served from /public
// /login IS matched so we can redirect already-signed-in users away from it.
export const config = {
  matcher: [
    "/((?!api/auth|_next|favicon.ico|manifest.json|sw.js|icon.svg|icon-maskable.svg).*)",
  ],
};
