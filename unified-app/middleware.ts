import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware for unified login system
// This middleware validates sessions before allowing access to protected routes

const publicPaths = ['/login', '/api/auth/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths without authentication
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for session in localStorage (client-side validation)
  // Note: This is a basic check. For full security, POV apps should
  // validate sessions server-side using the session-manager library

  const sessionId = request.cookies.get('sessionId')?.value
  const userId = request.cookies.get('userId')?.value

  if (!sessionId || !userId) {
    // Redirect to unified login
    return NextResponse.redirect(new URL('http://localhost:3005/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
