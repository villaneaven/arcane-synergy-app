import { NextRequest, NextResponse } from 'next/server'
import { getToken } from "next-auth/jwt";
 
// 1. Specify protected and public routes
const protectedRoutes = ['/', '/reports', '/forms']
const publicRoutes = ['/login']
 
export default async function proxy(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.includes(path)
  const isPublicRoute = publicRoutes.includes(path)
 
  // 3. Get token and session information
    const token = await getToken({
    req,
    secret: process.env.AzURE_AD_CLIENT_SECRET,
  });
  const isAuthenticated = !!token;
 
  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
 
  // 5. Redirect to / if the user is authenticated
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}
 
// Routes Proxy should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}