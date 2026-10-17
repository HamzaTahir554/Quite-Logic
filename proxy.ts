import { NextResponse, type NextRequest } from "next/server";

// Fast rejection before Next streams a loading shell. The database session is
// still authoritatively verified by each protected page and every admin API.
export function proxy(request: NextRequest) {
  const token = request.cookies.get("ql_admin_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/admin", "/admin/reviews", "/admin/portfolio", "/admin/account"],
};
