import { NextRequest, NextResponse } from 'next/server'
import { getToken } from "next-auth/jwt";
 
// 1. Specify public routes (everything else is protected)
const publicRoutes = ['/login']

export default async function proxy(req: NextRequest) {
  // 2. Check if the current route is public
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path);

  // 3. Get token and session information
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = !!token;

  // 4. Redirect to /login if the user is not authenticated and trying to access protected route
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // 5. Redirect to / if the user is authenticated and trying to access public route
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}
 
// Routes Proxy should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}