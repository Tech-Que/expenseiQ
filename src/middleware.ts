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
//  - /api/auth/*                  NextAuth endpoints
//  - /_next/static, /_next/image  Next internals
//  - /favicon.ico, /manifest.json specific named roots
//  - /sw.js                       service worker
//  - /icons/*                     grouping for any future icon dir
//  - anything ending in a common static-asset extension
// Without the extension rules, requests for /logo-full.png etc. hit withAuth,
// see no cookie, and get 307-redirected to /login — the image never loads.
// /login stays IN the matcher so already-authed users can be redirected off it.
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.avif|.*\\.svg|.*\\.ico|.*\\.json|.*\\.js).*)",
  ],
};
